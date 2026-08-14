## 202203069
## Bruce Carbonell Castillo Cifuentes 

## 1. Arquitectura propuesta

La arquitectura se divide en **4 microservicios principales** y reutiliza el servicio de autenticación desarrollado en la Práctica 2. Esta división obedece a los principios de alta cohesión y bajo acoplamiento, permitiendo escalar de forma independiente las partes del sistema que más lo requieran (por ejemplo, el procesamiento de transacciones masivas). 

| Componente                            | Responsabilidad principal y alcance                       |
| ------------------------------------- | --------------------------------------------------------- |
| Servicio de Autenticación             | Gestión de la identidad de los usuarios, login, generación y validación de tokens OAuth/JWT, así como administración de roles y permisos del sistema. |
| Microservicio de Transacciones        | Orquestación de la carga de archivos CSV, creación de lotes (batches), desglose de transacciones individuales, validaciones de formato/negocio e historial de estados. |
| Microservicio de Aprobaciones         | Gestión del flujo de autorización de pagos (Maker → Checker → Authorizer). Controla de forma estricta qué roles pueden aprobar o rechazar cada lote en su etapa correspondiente. |
| Microservicio de Integración Bancaria | Actúa como capa anticorrupción (Anti-Corruption Layer) para la comunicación con el Core Bancario externo, aislando las fallas y gestionando reintentos. |
| Microservicio de Notificaciones       | Encargado del envío de correos electrónicos a clientes o beneficiarios, y cualquier otra comunicación saliente de la plataforma. |
| API Gateway                           | Único punto de entrada público de la aplicación. Centraliza el enrutamiento, validación inicial del JWT, políticas de seguridad (CORS, Rate Limiting) y autorización de rutas. |
| FTP / Object Storage                  | Medio de almacenamiento persistente para los archivos CSV originales, evitando sobrecargar la base de datos relacional. |
| Logging centralizado                  | Plataforma unificada de auditoría y registro de eventos transaccionales y técnicos de todos los microservicios, clave para la trazabilidad y monitoreo. |

El flujo general del sistema inicia cuando el usuario se autentica y posteriormente interactúa con el API Gateway, el cual dirige el tráfico al microservicio adecuado según el proceso. El flujo de interacciones es el siguiente:el siguiente:

```mermaid
flowchart TD
    U([Usuario]) -->|Credenciales| AUTH[OAuth / Servicio de autenticación]
    AUTH -->|JWT| GW[API Gateway]
    GW --> TX[Microservicio de Transacciones]
    TX --> VAL{¿CSV válido?}
    VAL -->|Sí| AP[Microservicio de Aprobaciones]
    VAL -->|No| REJ([Lote rechazado])
    AP --> M[Maker]
    M --> C[Checker]
    C --> A[Authorizer]
    A --> INT[Integración Bancaria]
    INT --> CORE[Core Bancario]
    CORE --> NOT[Microservicio de Notificaciones]
```

---

# 2. Integración del servicio de autenticación de la Práctica 2

Para este proyecto, la autenticación no se vuelve a implementar desde cero, sino que se integra y reutiliza el servicio desarrollado en la Práctica 2. Esta estrategia asegura la compatibilidad con los sistemas heredados de la empresa y reduce significativamente el tiempo de desarrollo.

El flujo de autenticación garantiza que ningún usuario interactúe directamente con los microservicios de negocio sin antes haber sido validado y autenticado correctamente:

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant Auth as Servicio Auth - Práctica 2
    participant OAuth as Proveedor OAuth
    participant GW as API Gateway

    U->>Auth: Ingresar usuario y contraseña
    Auth->>OAuth: Autenticar credenciales
    OAuth-->>Auth: Identidad confirmada
    Auth-->>U: Emitir JWT (vigencia: 12 horas)
    U->>GW: Solicitud con JWT
    GW->>GW: Validar token, rol y permisos
```

El JWT resultante es firmado digitalmente (por ejemplo, utilizando algoritmos como HS256 o RS256) y contiene los "claims" o afirmaciones necesarias para que el API Gateway tome decisiones de autorización de forma autónoma, sin necesidad de consultar repetidamente a la base de datos en cada petición. El contenido (payload) típico es el siguiente:

```json
{
  "userId": 152,
  "username": "usuario1",
  "roles": [
    "MAKER"
  ],
  "exp": "..."
}
```

Para garantizar la seguridad perimetral y el control de acceso, el API Gateway inspecciona cada petición entrante y valida de forma estricta los siguientes aspectos del token:

* **Existencia y formato:** Verifica que el token esté presente en el header `Authorization` (como un `Bearer token`) y que esté bien formado estructuralmente.
* **Vigencia:** Confirma que el token no haya expirado (mediante la validación del claim `exp`).
* **Autenticidad e Integridad:** Comprueba mediante la clave secreta o pública que el token fue firmado por el Servicio de Autenticación y no ha sido alterado.
* **Identidad:** Determina qué usuario específico está realizando la petición.
* **Rol y Permisos:** Analiza los roles del usuario para conceder o denegar el acceso a la ruta solicitada, aplicando el principio de menor privilegio.

La autorización de las rutas y operaciones se distribuye de manera granular y estricta según el rol del usuario:

```mermaid
flowchart LR
    GW[API Gateway]
    GW -->|POST /transactions/batches| MAKER[Rol: MAKER]
    GW -->|"POST /approvals/{batchId}/check"| CHECKER[Rol: CHECKER]
    GW -->|"POST /approvals/{batchId}/authorize"| AUTHORIZER[Rol: AUTHORIZER]
```

---

# 3. Microservicio 1: Transacciones

## Responsabilidad Principal

Este es el microservicio central para la captura de datos. Su propósito principal es aislar la lógica de procesamiento de archivos masivos y las validaciones de negocio iniciales.

Sus responsabilidades específicas incluyen:

* **Gestión de Lotes (Batches):** Permite crear, listar y consultar lotes de pagos. Cada lote agrupa múltiples transacciones que deben procesarse en conjunto.
* **Procesamiento de Archivos CSV:** Recibe el archivo, lo parsea de forma asíncrona para no bloquear el API, y extrae los registros individuales.
* **Validaciones Estructurales y de Negocio:** Verifica que cada transacción cumpla con las reglas (por ejemplo, cuenta de origen válida, monto mayor a cero, moneda soportada). Las transacciones inválidas se marcan con su respectivo error.
* **Almacenamiento de Metadatos:** Guarda referencias al archivo físico (ubicación, nombre, checksum) pero no el archivo en sí.
* **Trazabilidad (Historial):** Mantiene un registro inmutable de todos los cambios de estado por los que pasa un lote (ej. CREATED, VALIDATING, PENDING_CHECKER, etc.).

**Límites del contexto (Bounded Context):**
Es muy importante destacar que este servicio **no toma decisiones de autorización de flujo**. No sabe ni le interesa qué usuario específico debe aprobar el lote, ni qué roles existen. Toda la lógica de "Maker → Checker → Authorizer" corresponde única y exclusivamente al **Microservicio de Aprobaciones**.

---

# 4. Diagrama ER — Microservicio de Transacciones

```mermaid
erDiagram

    BATCH {
        UUID id PK
        string file_name
        string file_path
        string status
        int total_transactions
        decimal total_amount
        UUID created_by
        datetime created_at
        datetime updated_at
    }

    TRANSACTION {
        UUID id PK
        UUID batch_id FK
        string source_account
        string destination_account
        decimal amount
        string currency
        string description
        string status
        datetime created_at
    }

    VALIDATION_RESULT {
        UUID id PK
        UUID transaction_id FK
        boolean valid
        string validation_type
        string message
        datetime validated_at
    }

    BATCH_HISTORY {
        UUID id PK
        UUID batch_id FK
        string previous_status
        string new_status
        UUID changed_by
        datetime changed_at
        string description
    }

    FILE_METADATA {
        UUID id PK
        UUID batch_id FK
        string original_name
        string stored_name
        string storage_path
        string checksum
        long file_size
        datetime uploaded_at
    }

    BATCH ||--o{ TRANSACTION : contains
    BATCH ||--o{ BATCH_HISTORY : has
    BATCH ||--|| FILE_METADATA : stores
    TRANSACTION ||--o{ VALIDATION_RESULT : produces
```

## Almacenamiento del archivo

El archivo CSV físico **no se guarda directamente en la base de datos**. La base de datos conserva únicamente sus metadatos:

```text
batch_id: 10025
file_name: pagos_agosto.csv
file_path: /transactions/2026/08/10025.csv
```

El archivo se almacena en FTP u Object Storage.

```mermaid
erDiagram

    APPROVAL_PROCESS {
        UUID id PK
        UUID batch_id
        string status
        int current_step
        datetime created_at
        datetime completed_at
    }

    APPROVAL_STEP {
        UUID id PK
        UUID approval_process_id FK
        int step_number
        string required_role
        string status
        UUID assigned_user
        datetime completed_at
    }

    APPROVAL_ACTION {
        UUID id PK
        UUID approval_step_id FK
        UUID user_id
        string action
        string comment
        datetime action_date
    }

    APPROVAL_PROCESS ||--|{ APPROVAL_STEP : contains
    APPROVAL_STEP ||--o{ APPROVAL_ACTION : records
```

---

# 8. Diagrama de clases — Microservicio de Aprobaciones

```mermaid
classDiagram

    class ApprovalProcess {
        +UUID id
        +UUID batchId
        +ApprovalStatus status
        +Integer currentStep
        +DateTime createdAt
        +DateTime completedAt

        +start()
        +approveCurrentStep()
        +reject()
        +complete()
    }

    class ApprovalStep {
        +UUID id
        +Integer stepNumber
        +Role requiredRole
        +StepStatus status
        +UUID assignedUser
        +DateTime completedAt

        +approve()
        +reject()
    }

    class ApprovalAction {
        +UUID id
        +UUID userId
        +ActionType action
        +String comment
        +DateTime actionDate
    }

    class Role {
        <<enumeration>>
        MAKER
        CHECKER
        AUTHORIZER
    }

    class ApprovalStatus {
        <<enumeration>>
        PENDING
        IN_PROGRESS
        APPROVED
        REJECTED
    }

    ApprovalProcess "1" --> "3" ApprovalStep
    ApprovalStep "1" --> "*" ApprovalAction
    ApprovalStep --> Role
    ApprovalProcess --> ApprovalStatus
```

---

# 9. Microservicio 3: Integración Bancaria

Este servicio funciona como intermediario entre la aplicación y el Core Bancario. De esta forma, el servicio de transacciones no contiene código específico del banco.

La comunicación se distribuye así:

```mermaid
flowchart LR
    AP[Microservicio de Aprobaciones] -->|Lote autorizado| INT[Integración Bancaria]
    INT -->|Solicitud segura| CORE[Core Bancario externo]
```

Se encarga de:

* preparar solicitud;
* enviar transacciones;
* recibir respuesta;
* manejar errores;
* registrar intento;
* almacenar identificador externo;
* reintentar cuando corresponda.

---

# 10. Diagrama ER — Integración Bancaria

```mermaid
erDiagram

    CORE_SUBMISSION {
        UUID id PK
        UUID batch_id
        string status
        string external_reference
        int retry_count
        datetime sent_at
        datetime completed_at
    }

    CORE_TRANSACTION_RESULT {
        UUID id PK
        UUID submission_id FK
        UUID transaction_id
        string external_transaction_id
        string status
        string response_code
        string response_message
        datetime processed_at
    }

    CORE_ERROR {
        UUID id PK
        UUID submission_id FK
        string error_code
        string error_message
        datetime occurred_at
    }

    CORE_SUBMISSION ||--o{ CORE_TRANSACTION_RESULT : contains
    CORE_SUBMISSION ||--o{ CORE_ERROR : generates
```

---

# 11. Diagrama de clases — Integración Bancaria

```mermaid
classDiagram

    class CoreSubmission {
        +UUID id
        +UUID batchId
        +SubmissionStatus status
        +String externalReference
        +Integer retryCount
        +DateTime sentAt

        +send()
        +retry()
        +complete()
        +fail()
    }

    class CoreTransactionResult {
        +UUID id
        +UUID transactionId
        +String externalTransactionId
        +String status
        +String responseCode
        +String responseMessage
    }

    class CoreError {
        +UUID id
        +String errorCode
        +String errorMessage
        +DateTime occurredAt
    }

    class CoreBankingClient {
        +sendBatch()
        +getStatus()
        +parseResponse()
    }

    CoreSubmission "1" --> "*" CoreTransactionResult
    CoreSubmission "1" --> "*" CoreError
    CoreSubmission --> CoreBankingClient
```

---

# 12. Microservicio 4: Notificaciones

Este servicio recibe los eventos que requieren comunicación con los clientes:

El flujo de notificación es el siguiente:

```mermaid
flowchart LR
    A[Lote autorizado] --> B[Transacciones enviadas al Core]
    B -->|Publica evento| E[(Message Broker)]
    E --> N[Notification Service]
    N -->|Envía| C[Correos a clientes]
```

---

# 13. Diagrama ER — Notificaciones

```mermaid
erDiagram

    NOTIFICATION {
        UUID id PK
        UUID batch_id
        string type
        string subject
        string status
        datetime created_at
        datetime sent_at
    }

    RECIPIENT {
        UUID id PK
        UUID notification_id FK
        string customer_id
        string email
        string status
    }

    DELIVERY_ATTEMPT {
        UUID id PK
        UUID notification_id FK
        int attempt_number
        string status
        string error_message
        datetime attempted_at
    }

    NOTIFICATION ||--o{ RECIPIENT : has
    NOTIFICATION ||--o{ DELIVERY_ATTEMPT : generates
```

---

# 14. Diagrama de clases — Notificaciones

```mermaid
classDiagram

    class Notification {
        +UUID id
        +UUID batchId
        +String type
        +String subject
        +NotificationStatus status
        +DateTime createdAt
        +DateTime sentAt

        +create()
        +send()
        +markSent()
        +markFailed()
    }

    class Recipient {
        +UUID id
        +String customerId
        +String email
        +DeliveryStatus status
    }

    class DeliveryAttempt {
        +UUID id
        +Integer attemptNumber
        +String status
        +String errorMessage
        +DateTime attemptedAt
    }

    class EmailProvider {
        +sendEmail()
    }

    Notification "1" --> "*" Recipient
    Notification "1" --> "*" DeliveryAttempt
    Notification --> EmailProvider
```

---

# 15. Flujo de aprobación Maker → Checker → Authorizer

El proceso inicia cuando el **Maker** crea el lote y carga el archivo CSV:

```mermaid
flowchart LR
    M[Maker] -->|Carga CSV| V{Validación}
    V -->|Válido| C[Checker]
    V -->|Inválido| R1([Lote rechazado])
    C -->|Aprueba| A[Authorizer]
    C -->|Rechaza| R2([Lote rechazado])
    A -->|Autoriza| CORE[Core Bancario]
    A -->|Rechaza| R3([Lote rechazado])
```

El flujo se divide en tres pasos:

### Paso 1 — Maker

Carga el archivo CSV y genera el lote.

```mermaid
stateDiagram-v2
    [*] --> CREATED
    CREATED --> VALIDATING
    VALIDATING --> PENDING_CHECKER: CSV válido
    VALIDATING --> REJECTED: CSV inválido
```

### Paso 2 — Checker

Revisa el lote.

Puede:

```text
APPROVE
REJECT
```

Si aprueba:

```mermaid
stateDiagram-v2
    PENDING_CHECKER --> CHECKER_APPROVED: APPROVE
    PENDING_CHECKER --> REJECTED: REJECT
    CHECKER_APPROVED --> PENDING_AUTHORIZER
```

### Paso 3 — Authorizer

Realiza la autorización final.

```mermaid
stateDiagram-v2
    PENDING_AUTHORIZER --> AUTHORIZED: APPROVE
    PENDING_AUTHORIZER --> REJECTED: REJECT
```

Después de la autorización, el lote queda listo para enviarse al Core Bancario.

---

# 16. UML de estados de aprobación

El ciclo completo de estados se muestra a continuación:

```mermaid
stateDiagram-v2

    [*] --> CREATED

    CREATED --> VALIDATING : Maker carga CSV

    VALIDATING --> VALIDATION_FAILED : CSV inválido
    VALIDATING --> PENDING_CHECKER : CSV válido

    VALIDATION_FAILED --> [*]

    PENDING_CHECKER --> REJECTED : Checker rechaza
    PENDING_CHECKER --> PENDING_AUTHORIZER : Checker aprueba

    PENDING_AUTHORIZER --> REJECTED : Authorizer rechaza
    PENDING_AUTHORIZER --> AUTHORIZED : Authorizer aprueba

    AUTHORIZED --> SENDING_TO_CORE
    SENDING_TO_CORE --> PROCESSING
    PROCESSING --> COMPLETED

    SENDING_TO_CORE --> CORE_ERROR

    CORE_ERROR --> SENDING_TO_CORE : Reintento

    REJECTED --> [*]
    COMPLETED --> [*]
```

---

# 17. Secuencia UML — Aprobación de 3 pasos

```mermaid
sequenceDiagram

    actor Maker
    actor Checker
    actor Authorizer

    participant Gateway as API Gateway
    participant Auth as Servicio Auth
    participant Tx as MS Transacciones
    participant Approval as MS Aprobaciones
    participant DB as Base de Datos

    Maker->>Auth: Iniciar sesión
    Auth-->>Maker: JWT

    Maker->>Gateway: Cargar CSV + JWT
    Gateway->>Auth: Validar token
    Auth-->>Gateway: Token válido / rol MAKER

    Gateway->>Tx: Crear lote y procesar CSV
    Tx->>Tx: Validar archivo

    alt CSV inválido
        Tx-->>Maker: Errores de validación
    else CSV válido
        Tx->>DB: Guardar lote y transacciones
        Tx->>Approval: Crear proceso de aprobación
        Approval-->>Tx: Estado PENDING_CHECKER
        Tx-->>Maker: Lote creado correctamente
    end

    Checker->>Gateway: Consultar lote pendiente
    Gateway->>Approval: Obtener lote
    Approval-->>Checker: Información del lote

    Checker->>Gateway: Aprobar lote
    Gateway->>Approval: Aprobar como CHECKER
    Approval->>Approval: Validar rol y paso actual
    Approval-->>Checker: PENDING_AUTHORIZER

    Authorizer->>Gateway: Consultar lote
    Gateway->>Approval: Obtener lote
    Approval-->>Authorizer: Información del lote

    Authorizer->>Gateway: Autorizar lote
    Gateway->>Approval: Autorizar como AUTHORIZER
    Approval->>Approval: Validar rol y paso actual
    Approval-->>Authorizer: AUTHORIZED
```

---

# 18. Secuencia UML — Envío al Core Bancario

Para este envío se utiliza comunicación asíncrona.

En lugar de:

```mermaid
flowchart LR
    AP[Approval Service] -->|HTTP síncrono| CORE[Core Integration]
```

El flujo implementado es:

```mermaid
flowchart LR
    AP[Approval Service] -->|Publica evento BatchAuthorized| MQ[(Message Broker)]
    MQ -->|Consume evento| CORE[Core Integration]
```

Si el Core no está disponible temporalmente, el mensaje permanece en el broker y puede procesarse después.

```mermaid
sequenceDiagram

    participant Approval as MS Aprobaciones
    participant Broker as Message Broker
    participant CoreIntegration as MS Integración Bancaria
    participant Tx as MS Transacciones
    participant Core as Core Bancario Externo
    participant Logs as Logging Centralizado

    Approval->>Broker: Publicar BatchAuthorized

    Broker-->>CoreIntegration: BatchAuthorized

    CoreIntegration->>Tx: Obtener transacciones del lote
    Tx-->>CoreIntegration: Lista de transacciones

    CoreIntegration->>Logs: Registrar inicio de envío

    CoreIntegration->>Core: Enviar lote de transacciones

    alt Core responde correctamente
        Core-->>CoreIntegration: Transacciones aceptadas
        CoreIntegration->>Tx: Actualizar estado PROCESSING
        CoreIntegration->>Logs: Registrar envío exitoso
    else Error del Core
        Core-->>CoreIntegration: Error
        CoreIntegration->>Logs: Registrar error
        CoreIntegration->>CoreIntegration: Programar reintento
    end
```

---

# 19. Secuencia UML — Notificación a clientes

Según el enunciado, después de la aprobación final se debe avisar a los clientes/beneficiarios que su transacción está en proceso.

```mermaid
sequenceDiagram

    participant CoreIntegration as MS Integración Bancaria
    participant Broker as Message Broker
    participant Notification as MS Notificaciones
    participant Tx as MS Transacciones
    participant Email as Proveedor de Correo
    participant Logs as Logging Centralizado

    CoreIntegration->>Broker: Publicar BatchProcessing

    Broker-->>Notification: BatchProcessing

    Notification->>Tx: Obtener clientes del lote
    Tx-->>Notification: Clientes / beneficiarios

    loop Por cada cliente
        Notification->>Email: Enviar correo

        alt Correo enviado
            Email-->>Notification: OK
            Notification->>Logs: Registrar envío exitoso
        else Error
            Email-->>Notification: Error
            Notification->>Logs: Registrar error
        end
    end
```

---

# 20. Diagrama UML de componentes

El diagrama utiliza `flowchart` y estereotipos `<<component>>` para representar los componentes de la arquitectura.

```mermaid
flowchart LR

    User["Usuario"]

    Auth["<<component>><br/>Servicio de Autenticación<br/>Práctica 2"]

    Gateway["<<component>><br/>API Gateway"]

    subgraph BankingSystem["Sistema de Transacciones Bancarias"]

        Tx["<<microservice>><br/>Transacciones"]

        Approval["<<microservice>><br/>Aprobaciones"]

        CoreIntegration["<<microservice>><br/>Integración Bancaria"]

        Notification["<<microservice>><br/>Notificaciones"]

        Broker["<<infrastructure>><br/>Message Broker"]

        Storage["<<storage>><br/>FTP / Object Storage"]

        TxDB[("BD<br/>Transacciones")]

        ApprovalDB[("BD<br/>Aprobaciones")]

        CoreDB[("BD<br/>Integración")]

        NotificationDB[("BD<br/>Notificaciones")]

        Logs["<<infrastructure>><br/>Logging Centralizado"]
    end

    Core["<<external system>><br/>Core Bancario"]

    Email["<<external system>><br/>Proveedor de Correo"]

    User --> Auth
    Auth -->|JWT| User

    User -->|JWT| Gateway

    Gateway --> Tx
    Gateway --> Approval

    Tx --> TxDB
    Tx --> Storage

    Tx --> Approval

    Approval --> ApprovalDB
    Approval --> Broker

    Broker --> CoreIntegration
    CoreIntegration --> CoreDB
    CoreIntegration --> Tx
    CoreIntegration --> Core

    CoreIntegration --> Broker
    Broker --> Notification

    Notification --> NotificationDB
    Notification --> Tx
    Notification --> Email

    Gateway -. logs .-> Logs
    Tx -. logs .-> Logs
    Approval -. logs .-> Logs
    CoreIntegration -. logs .-> Logs
    Notification -. logs .-> Logs
```

---

# 21. Estrategia para almacenar los CSV

Los archivos CSV se almacenan fuera de PostgreSQL:

```mermaid
flowchart TD
    TX[Microservicio de Transacciones]
    TX -->|Metadatos y estados| DB[(PostgreSQL)]
    TX -->|Archivos CSV| OBJ[(Object Storage<br/>FTP / S3 / MinIO)]
```

La base de datos almacena:

```text
ID del lote
Nombre
Ruta
Checksum
Tamaño
Fecha
Usuario
Estado
```

El almacenamiento conserva:

```text
archivo.csv
```

La estructura de almacenamiento es:

```text
/transactions
    /2026
        /08
            /batch-UUID
                original.csv
                validated.csv
```

Una ruta completa queda de esta forma:

```text
/transactions/2026/08/8f81-abc/original.csv
```

PostgreSQL se usa para consultar información estructurada, mientras que FTP u Object Storage conserva los archivos.

---

# 22. Base de datos por microservicio

Cada microservicio es propietario de su información.

Se evita que todos los servicios utilicen una misma base de datos:

```mermaid
flowchart BT
    TX[Transacciones] --> DB[(Base de datos compartida)]
    AP[Aprobaciones] --> DB
    INT[Integración] --> DB
    NOT[Notificaciones] --> DB
```

Cada servicio mantiene su propia base de datos:

```mermaid
flowchart LR
    TX[Transacciones] --> TXDB[(PostgreSQL<br/>Transactions)]
    AP[Aprobaciones] --> APDB[(PostgreSQL<br/>Approvals)]
    INT[Integración] --> INTDB[(PostgreSQL<br/>Integration)]
    NOT[Notificaciones] --> NOTDB[(PostgreSQL<br/>Notifications)]
```

Esto no requiere cuatro servidores PostgreSQL. En desarrollo se puede usar una sola instancia con bases de datos o esquemas separados, manteniendo la independencia lógica entre servicios.

---

# 23. Comunicación entre microservicios

La comunicación entre microservicios se divide en **REST** y **mensajería**.

## REST

REST se utiliza cuando la operación necesita una respuesta inmediata:

```mermaid
flowchart LR
    GW[API Gateway] -->|REST síncrono| TX[Microservicio de Transacciones]
```

El servicio de integración también consulta las transacciones de un lote mediante REST:

```mermaid
sequenceDiagram
    participant CORE as Core Integration
    participant TX as Transactions
    CORE->>TX: GET /batches/{id}/transactions
    TX-->>CORE: Transacciones del lote
```

Ejemplos:

```http
POST /api/v1/batches
GET  /api/v1/batches/{id}
GET  /api/v1/batches/{id}/transactions

GET  /api/v1/approvals/pending
POST /api/v1/approvals/{batchId}/check
POST /api/v1/approvals/{batchId}/authorize
POST /api/v1/approvals/{batchId}/reject
```

---

## Mensajería

La mensajería se utiliza para las acciones que pueden procesarse de forma asíncrona:

```mermaid
flowchart LR
    AP[Approval Service] -->|BatchAuthorized| MQ[(Message Broker)]
    MQ --> CORE[Core Integration]
```

Cuando el Core comienza a procesar el lote, se publica otro evento:

```mermaid
flowchart LR
    CORE[Core Integration] -->|BatchProcessing| MQ[(Message Broker)]
    MQ --> NOT[Notification Service]
```

Los eventos definidos son:

```text
BatchCreated
BatchValidated
BatchRejected
BatchAuthorized
BatchSentToCore
BatchProcessing
BatchCompleted
BatchFailed
```

Con estos eventos, los servicios no dependen de una respuesta inmediata entre sí.

---

# 24. Flujo completo REST + eventos

```mermaid
flowchart TD

    A[Usuario carga CSV]

    A -->|REST| B[API Gateway]

    B -->|REST| C[MS Transacciones]

    C --> D[Validar CSV]

    D -->|Inválido| X[Rechazar lote]

    D -->|Válido| E[Guardar lote]

    E -->|REST| F[MS Aprobaciones]

    F --> G[Maker]

    G --> H[Checker]

    H --> I[Authorizer]

    I -->|BatchAuthorized| J[Message Broker]

    J --> K[MS Integración Bancaria]

    K -->|REST| L[Core Bancario]

    L --> K

    K -->|BatchProcessing| J

    J --> M[MS Notificaciones]

    M -->|REST / SMTP| N[Servicio de Correo]

    C -.-> LOG[Logging]
    F -.-> LOG
    K -.-> LOG
    M -.-> LOG
```

---

# 25. Estrategia de logging centralizado

El sistema requiere un registro centralizado y auditable.

Los archivos de log no deben quedar separados en cada servidor:

```text
transactions.log
approvals.log
notifications.log
```

Todos los servicios envían sus registros al mismo sistema:

```mermaid
flowchart LR
    GW[API Gateway] -.->|Logs| LOG[(Logging centralizado)]
    AUTH[Auth] -.->|Logs| LOG
    TX[Transactions] -.->|Logs| LOG
    AP[Approvals] -.->|Logs| LOG
    CORE[Core Integration] -.->|Logs| LOG
    NOT[Notifications] -.->|Logs| LOG
```

Cada registro contiene, como mínimo, los siguientes datos:

```json
{
  "timestamp": "2026-08-11T20:30:00",
  "service": "approval-service",
  "level": "INFO",
  "userId": "123",
  "batchId": "ABC-123",
  "action": "BATCH_AUTHORIZED",
  "message": "Lote autorizado correctamente"
}
```

Para relacionar los registros de una misma operación se utiliza un identificador de correlación:

```text
correlationId
```

Ejemplo:

```text
correlationId = TX-893728
```

El mismo identificador se propaga entre los servicios:

```mermaid
flowchart LR
    GW[API Gateway] -->|correlationId| TX[Transactions]
    TX -->|correlationId| AP[Approval]
    AP -->|correlationId| CORE[Core Integration]
    CORE -->|correlationId| NOT[Notification]
```

Al buscar:

```text
TX-893728
```

se obtiene el historial completo de la operación en los logs.

---

# 26. Propuesta de tecnologías para logging

La arquitectura de logging se divide en tres partes:

```mermaid
flowchart LR
    MS[Microservicios] -->|Envían logs| COL[Collector]
    COL -->|Agrega y procesa| CENTRAL[(Sistema central)]
```

La implementación seleccionada puede utilizar Fluent Bit o Logstash como collector, Elasticsearch para almacenar los registros y Kibana para consultarlos:

```mermaid
flowchart LR
    MS[Microservicios] --> COL[Fluent Bit / Logstash]
    COL --> ES[(Elasticsearch)]
    ES --> KB[Kibana]
```

Otra alternativa es:

```text
Grafana + Loki
```

Para el alcance de esta práctica se documenta la arquitectura, aunque sus componentes pueden implementarse posteriormente.

---

# 27. Propuesta de API Gateway

El API Gateway será el único punto público hacia los microservicios.

```mermaid
flowchart TD
    NET((Internet)) -->|HTTPS| GW[API Gateway]
    GW --> AUTH[Authentication Service]
    GW --> TX[Transaction Service]
    GW --> AP[Approval Service]
    GW --> NOT[Notification Service]
```

Las direcciones internas de los servicios no se exponen:

```text
transactions-service:3001
approval-service:3002
notification-service:3003
```

El usuario accede únicamente a la dirección pública:

```text
https://api.banco.com
```

---

# 28. Rutas propuestas

Las rutas se distribuyen de la siguiente manera:

```mermaid
flowchart LR
    GW[API Gateway]
    GW -->|/api/v1/auth/*| AUTH[Authentication Service]
    GW -->|/api/v1/batches/*| TX[Transaction Service]
    GW -->|/api/v1/transactions/*| TX
    GW -->|/api/v1/approvals/*| AP[Approval Service]
```

Los servicios de integración bancaria y notificaciones no se exponen al usuario.

```text
CoreIntegration
Notification
```

Ambos se mantienen dentro de la red interna.

---

# 29. Funciones del API Gateway

El API Gateway ejecuta las siguientes validaciones antes de dirigir la solicitud al microservicio correspondiente:

```mermaid
flowchart LR
    REQ([Solicitud]) --> JWT{¿JWT válido?}
    JWT -->|No| E401([401 Unauthorized])
    JWT -->|Sí| AUTHZ{¿Tiene permisos?}
    AUTHZ -->|No| E403([403 Forbidden])
    AUTHZ -->|Sí| RATE{¿Dentro del límite?}
    RATE -->|No| E429([429 Too Many Requests])
    RATE -->|Sí| ROUTE[Routing]
    ROUTE --> LOG[Registrar solicitud]
    LOG --> MS[Microservicio destino]
```

La distribución de solicitudes queda así:

```mermaid
flowchart LR

    User[Usuario]

    Gateway[API Gateway]

    Auth[Auth Service]

    Transactions[Transaction Service]

    Approvals[Approval Service]

    Logs[Logging]

    User -->|JWT| Gateway

    Gateway -->|Validar JWT| Auth

    Gateway -->|/batches| Transactions

    Gateway -->|/transactions| Transactions

    Gateway -->|/approvals| Approvals

    Gateway -.->|Access Logs| Logs
```

---

# 30. Arquitectura final

La arquitectura completa integra los componentes descritos en las secciones anteriores:

![alt text](diagramaArquitectura.jpg)