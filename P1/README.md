202203069
Bruce Carbonell Castillo Cifuentes

# Sistema de Solicitudes Operativas

Proyecto académico de práctica que implementa una API REST para registrar y dar seguimiento a solicitudes operativas dentro de una organización, construida con NestJS, Prisma y PostgreSQL.

## 1. Descripción del problema

En muchas organizaciones, distintas áreas (Infraestructura, Mantenimiento, Tecnología, etc.) necesitan **solicitar operaciones** — por ejemplo comprar un equipo, contratar un servicio o autorizar un gasto — y ese proceso suele hacerse por correo o en hojas de cálculo, sin un lugar único donde ver qué se pidió, con qué prioridad, cuánto cuesta y en qué estado va (registrada, en proceso o finalizada).

Este proyecto resuelve ese problema construyendo una API que centraliza esas solicitudes: permite crearlas, listarlas, actualizarlas por completo o solo cambiarles el estado, y eliminarlas, siempre validando los datos de entrada y protegiendo la información sensible.

## Inicio rápido

Para quien ya tiene Node y Docker instalados y solo quiere levantar todo y probarlo:

```bash
docker compose up -d postgres        # 1. Levanta PostgreSQL en Docker
npm run prisma:migrate:deploy        # 2. Crea la tabla solicitudes_operativas
npm run prisma:seed                  # 3. (Opcional) Carga 3 solicitudes de ejemplo
npm run start:dev                    # 4. Levanta la API en http://localhost:3000
```

Si es la primera vez que corres el proyecto, antes de esto falta `npm install` y crear el `.env` (ver secciones 5 y 6, "Instalación paso a paso" y "Configuración del archivo `.env`").

### Cómo levanto la base de datos

```bash
docker compose up -d postgres
```

Es el único comando necesario: levanta el contenedor `solicitudes-postgres` (PostgreSQL 16, puerto `5432`, con los datos guardados en un volumen de Docker que sobrevive aunque apagues el contenedor). Comandos relacionados:

```bash
docker ps                         # ver si el contenedor ya está corriendo
docker compose stop postgres      # apagarlo
docker compose up -d postgres     # volver a encenderlo
```

### Cómo inserto datos (o algo parecido)

Hay tres formas, de la más recomendada a la menos recomendada:

**1. A través de la API** — es la forma correcta, porque pasa por todas las validaciones (`prioridad` entre 1 y 5, `costoEstimado` ≥ 0, campos obligatorios, etc.):

```bash
curl -X POST http://localhost:3000/solicitudes \
  -H "Content-Type: application/json" \
  -d '{
    "titulo": "Compra de licencias antivirus",
    "areaSolicitante": "Seguridad de la Información",
    "prioridad": 3,
    "costoEstimado": 1500.00
  }'
```

También puedes usar la colección de Postman incluida en `postman/solicitudes-operativas.postman_collection.json` (instrucciones en `postman/README.md`), o la documentación interactiva de Swagger en `http://localhost:3000/docs`.

**2. Con Prisma Studio** — una interfaz visual para ver y editar filas, sin escribir SQL:

```bash
npx prisma studio
```

Se abre en `http://localhost:5555`; entras a la tabla `solicitudes_operativas` y usas **Add record**.

**3. Con SQL directo**, entrando a la base dentro del contenedor:

```bash
docker exec -it solicitudes-postgres psql -U solicitudes_user -d solicitudes_db
```

Y ya adentro de `psql`:

```sql
INSERT INTO solicitudes_operativas (id, titulo, area_solicitante, prioridad, costo_estimado, estado, created_at, updated_at)
VALUES (gen_random_uuid(), 'Prueba manual', 'Infraestructura TI', 2, 800.00, 'REGISTRADA', now(), now());
```

> Con esta última vía te saltas las validaciones de `class-validator` de la API (aunque los `CHECK` de `prioridad` y `costo_estimado` de PostgreSQL igual se siguen aplicando). Para casi cualquier prueba conviene más la opción 1 o 2.

## 2. Objetivo general

Implementar una API REST completa para el manejo de solicitudes operativas, aplicando buenas prácticas de arquitectura en NestJS (controlador, servicio y repositorio separados), validación estricta de datos, manejo centralizado de errores y un modelo de datos correcto en PostgreSQL mediante Prisma ORM.

## 3. Tecnologías utilizadas

| Tecnología | Uso en el proyecto |
|---|---|
| [NestJS](https://nestjs.com/) 11 | Framework backend (controladores, servicios, módulos, pipes, filtros) |
| TypeScript | Lenguaje del proyecto, en modo estricto |
| [Prisma ORM](https://www.prisma.io/) 6 | Acceso a la base de datos y migraciones |
| PostgreSQL 16 | Motor de base de datos |
| Docker / Docker Compose | Levantar PostgreSQL de forma local, sin instalarlo a mano |
| class-validator / class-transformer | Validación y transformación de los datos que llegan por HTTP |
| @nestjs/swagger | Documentación interactiva de la API (`/docs`) |
| Jest + Supertest | Pruebas unitarias y end-to-end (e2e) |
| ESLint + Prettier | Estilo y calidad de código |

## 4. Requisitos previos

- Node.js 20 LTS o superior
- npm (incluido con Node.js)
- Docker Desktop (para levantar PostgreSQL sin instalarlo directamente en el equipo)
- Git

## 5. Instalación paso a paso

```bash
# 1. Clonar el repositorio y entrar a la carpeta del proyecto
git clone <url-del-repositorio>
cd P1

# 2. Instalar las dependencias
npm install

# 3. Crear los archivos de entorno a partir de los ejemplos
cp .env.example .env
cp .env.test.example .env.test
```

Los pasos siguientes (levantar la base de datos, migrar, sembrar datos y arrancar la app) se explican en las secciones 7 a 11.

## 6. Configuración del archivo `.env`

El archivo `.env` (nunca se sube al repositorio) contiene las credenciales de la base de datos de **desarrollo**. Este es su contenido de ejemplo, tomado de `.env.example`:

```bash
# Puerto en el que corre la aplicación NestJS
PORT=3000

# Credenciales de la base de datos de desarrollo (usadas por docker-compose.yml y por Prisma)
POSTGRES_USER=solicitudes_user
POSTGRES_PASSWORD=changeme
POSTGRES_DB=solicitudes_db
POSTGRES_HOST=localhost
POSTGRES_PORT=5432

# Cadena de conexión que Prisma utiliza para conectarse a PostgreSQL.
DATABASE_URL="postgresql://solicitudes_user:changeme@localhost:5432/solicitudes_db?schema=public"
```

Existe además un `.env.test`, con las mismas variables pero apuntando a **otra base de datos completamente distinta** (puerto 5433), usada solo por las pruebas e2e, para nunca arriesgar los datos de desarrollo. Su plantilla está en `.env.test.example`.

> Regla simple: `DATABASE_URL` siempre se arma a partir de las demás variables:
> `postgresql://<USER>:<PASSWORD>@<HOST>:<PORT>/<DB>?schema=public`

## 7. Cómo levantar PostgreSQL con Docker

El archivo `docker-compose.yml` define dos bases de datos independientes:

| Servicio | Uso | Puerto en el host |
|---|---|---|
| `postgres` | Desarrollo | 5432 |
| `postgres-test` | Pruebas e2e | 5433 |

Para levantar solo la base de desarrollo:

```bash
docker compose up -d postgres
```

Para levantar también la de pruebas (necesaria para correr `npm run test:e2e`):

```bash
docker compose up -d postgres-test
```

Ambos puertos quedan publicados solo en `127.0.0.1` (no en toda la red), como medida de seguridad básica para un entorno local.

## 8. Cómo ejecutar las migraciones

Con la base de desarrollo ya corriendo:

```bash
npm run prisma:migrate:deploy
```

Esto aplica la migración ya incluida en `prisma/migrations/`, que crea la tabla `solicitudes_operativas` y el tipo `estado_solicitud`. Si en el futuro se modifica `prisma/schema.prisma`, la migración de desarrollo se genera con:

```bash
npm run prisma:migrate:dev
```

## 9. Cómo ejecutar el seed

El seed (`prisma/seed.ts`) inserta tres solicitudes de ejemplo. Es **idempotente**: usa un `id` fijo para cada una, así que ejecutarlo varias veces nunca duplica datos.

```bash
npm run prisma:seed
```

## 10. Cómo iniciar la aplicación

```bash
# modo desarrollo, con recarga automática
npm run start:dev

# modo normal
npm run start
```

La API queda disponible en `http://localhost:3000` y la documentación interactiva (Swagger) en `http://localhost:3000/docs` (solo fuera de `NODE_ENV=production`).

## 11. Cómo ejecutar las pruebas

```bash
# pruebas unitarias (no necesitan base de datos)
npm run test:unit

# cobertura de las pruebas unitarias
npm run test:cov

# pruebas end-to-end (necesitan la base de datos de pruebas)
npm run test:e2e:db:up
npm run test:e2e
```

`test:e2e` aplica automáticamente las migraciones sobre la base de pruebas antes de correr (script `pretest:e2e`) y ejecuta los archivos de prueba en orden, uno a la vez, para evitar interferencias entre ellos.

## 12. Documentación de los endpoints

Todos los endpoints están bajo el prefijo `/solicitudes`.

| Método | Ruta | Descripción | Body | Éxito |
|---|---|---|---|---|
| GET | `/solicitudes` | Lista todas las solicitudes, de la más reciente a la más antigua | — | 200 |
| POST | `/solicitudes` | Registra una nueva solicitud | `CreateSolicitudDto` | 201 |
| PUT | `/solicitudes/:id` | Reemplaza **todos** los campos de una solicitud existente | `UpdateSolicitudDto` (todos los campos obligatorios) | 200 |
| PATCH | `/solicitudes/:id/estado` | Cambia **únicamente** el estado | `UpdateEstadoSolicitudDto` | 200 |
| DELETE | `/solicitudes/:id` | Elimina una solicitud | — | 204 |

Reglas de validación aplicadas en cada campo:

| Campo | Regla |
|---|---|
| `titulo` | Texto obligatorio, sin espacios sobrantes, máximo 150 caracteres |
| `areaSolicitante` | Texto obligatorio, sin espacios sobrantes, máximo 100 caracteres |
| `prioridad` | Número entero entre 1 y 5 |
| `costoEstimado` | Número mayor o igual a 0, máximo dos decimales, hasta 9,999,999,999.99 |
| `estado` | Uno de: `REGISTRADA`, `EN_PROCESO`, `FINALIZADA` (en `POST` es opcional y por defecto es `REGISTRADA`) |

Cualquier campo que no esté en la lista anterior es **rechazado** automáticamente (no se ignora en silencio).

## 13. Ejemplos de JSON

### Crear una solicitud

`POST /solicitudes`

```json
{
  "titulo": "Adquisición de nuevo servidor",
  "areaSolicitante": "Infraestructura TI",
  "prioridad": 3,
  "costoEstimado": 2500.00,
  "estado": "REGISTRADA"
}
```

Respuesta `201 Created`:

```json
{
  "id": "11111111-1111-4111-8111-111111111111",
  "titulo": "Adquisición de nuevo servidor",
  "areaSolicitante": "Infraestructura TI",
  "prioridad": 3,
  "costoEstimado": 2500,
  "estado": "REGISTRADA",
  "createdAt": "2026-07-30T12:00:00.000Z",
  "updatedAt": "2026-07-30T12:00:00.000Z"
}
```

### Reemplazar una solicitud completa

`PUT /solicitudes/11111111-1111-4111-8111-111111111111`

```json
{
  "titulo": "Adquisición de nuevo servidor (ampliada)",
  "areaSolicitante": "Infraestructura TI",
  "prioridad": 5,
  "costoEstimado": 3200.00,
  "estado": "EN_PROCESO"
}
```

### Actualizar solo el estado

`PATCH /solicitudes/11111111-1111-4111-8111-111111111111/estado`

```json
{
  "estado": "EN_PROCESO"
}
```

### Ejemplo de error de validación

`POST /solicitudes` con `"prioridad": 8`, respuesta `400 Bad Request`:

```json
{
  "statusCode": 400,
  "message": ["prioridad must not be greater than 5"],
  "error": "Bad Request",
  "timestamp": "2026-07-30T12:00:00.000Z",
  "path": "/solicitudes"
}
```

### Ejemplo de recurso inexistente

`DELETE /solicitudes/99999999-9999-4999-8999-999999999999`, respuesta `404 Not Found`:

```json
{
  "statusCode": 404,
  "message": "No existe una solicitud operativa con id \"99999999-9999-4999-8999-999999999999\".",
  "error": "Not Found",
  "timestamp": "2026-07-30T12:00:00.000Z",
  "path": "/solicitudes/99999999-9999-4999-8999-999999999999"
}
```

## 14. Códigos HTTP utilizados

| Código | Cuándo se usa |
|---|---|
| 200 OK | `GET`, `PUT` y `PATCH` exitosos |
| 201 Created | `POST` exitoso (solicitud creada) |
| 204 No Content | `DELETE` exitoso (sin cuerpo de respuesta) |
| 400 Bad Request | Datos inválidos, campos no permitidos, o `id` con formato de UUID inválido |
| 404 Not Found | El `id` es un UUID válido, pero no existe ninguna solicitud con ese id |
| 500 Internal Server Error | Error interno inesperado; nunca incluye detalles técnicos de la base de datos |

## 15. Estructura de carpetas

```
P1/
├── prisma/
│   ├── schema.prisma            # Modelo de datos (SolicitudOperativa, enum EstadoSolicitud)
│   ├── seed.ts                  # Datos de ejemplo, idempotente
│   └── migrations/               # Historial de migraciones SQL
├── src/
│   ├── common/
│   │   ├── filters/
│   │   │   └── all-exceptions.filter.ts   # Filtro global de errores
│   │   └── transformers/
│   │       └── trim.transformer.ts        # Recorta espacios en textos
│   ├── prisma/
│   │   ├── prisma.service.ts     # Conexión a la base de datos
│   │   └── prisma.module.ts
│   ├── solicitudes/
│   │   ├── dto/                  # Qué datos se aceptan en cada endpoint
│   │   ├── errors/               # Error de dominio: SolicitudNotFoundError
│   │   ├── mappers/              # Convierte lo que devuelve Prisma al formato de respuesta
│   │   ├── repositories/         # Acceso a datos (interfaz + implementación con Prisma)
│   │   ├── solicitudes.controller.ts
│   │   ├── solicitudes.service.ts
│   │   └── solicitudes.module.ts
│   ├── app.module.ts
│   └── main.ts                   # Punto de entrada: valida, filtra errores, arma Swagger
├── test/                         # Pruebas end-to-end (e2e)
├── docker-compose.yml            # Postgres de desarrollo + Postgres de pruebas
├── .env.example
└── .env.test.example
```

## 16. Decisiones de seguridad

- **Nunca se usa SQL escrito a mano**: todo el acceso a datos pasa por el *query builder* de Prisma, que arma consultas parametrizadas. Esto elimina el riesgo de inyección SQL.
- **Validación estricta de entrada** (`ValidationPipe` global en `src/main.ts`, con `whitelist: true` y `forbidNonWhitelisted: true`): cualquier campo que no esté declarado en el DTO correspondiente se rechaza con un `400`, en vez de guardarse silenciosamente.
- **Los errores nunca exponen detalles internos**: el filtro global (`AllExceptionsFilter`) intercepta cualquier error inesperado (por ejemplo, uno que venga de Prisma o de la base de datos) y siempre responde con un mensaje genérico y un `500`, mientras el detalle real solo queda en el log del servidor.
- **Validación en dos capas**: las mismas reglas de negocio (prioridad entre 1 y 5, costo mayor o igual a cero) están tanto en los DTO de NestJS como en restricciones `CHECK` de la base de datos, para que ningún dato inválido llegue a guardarse aunque alguien evite la API.
- **Variables de entorno fuera del repositorio**: `.env` y `.env.test` están en `.gitignore`; solo se versionan `.env.example` y `.env.test.example`, sin credenciales reales.
- **Base de datos de pruebas separada**: las pruebas e2e usan un contenedor de PostgreSQL distinto (puerto 5433), para que nunca puedan borrar o modificar datos de desarrollo.
- **Puertos de PostgreSQL solo en localhost**: `docker-compose.yml` publica los puertos como `127.0.0.1:<puerto>`, para que la base de datos no quede accesible desde otros equipos de la misma red.
- **Documentación Swagger solo fuera de producción**: `src/main.ts` monta `/docs` únicamente si `NODE_ENV` no es `production`.

## 17. Principios SOLID aplicados en el proyecto

A continuación se explica cada principio con palabras sencillas y se muestra, con código real del proyecto, dónde se aplica.

### S — Principio de responsabilidad única (Single Responsibility Principle)

**Explicación en palabras propias:** una clase debería tener un solo motivo para cambiar. Si mezcla varias tareas distintas (por ejemplo, recibir una petición HTTP *y* hablar con la base de datos), un cambio en cualquiera de esas tareas obliga a tocar la misma clase, con más riesgo de romper algo que no tenía nada que ver.

**Dónde se aplica:** `src/solicitudes/solicitudes.controller.ts` — `SolicitudesController`.

```ts
/** Solo recibe peticiones HTTP y devuelve respuestas; toda la lógica vive en el service. */
@ApiTags('solicitudes')
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateSolicitudDto): Promise<SolicitudResponseDto> {
    return this.solicitudesService.create(dto);
  }
```

**Por qué representa el principio:** el método `create` no valida reglas de negocio, no arma la respuesta ni toca Prisma; solo recibe el `dto` ya validado por el `ValidationPipe` y se lo pasa al servicio. Su única responsabilidad es la conexión HTTP.

**Qué problema evitaría:** si el controlador también contuviera lógica de negocio o acceso a datos, cualquier cambio en cómo se guardan las solicitudes (por ejemplo, agregar una validación nueva) obligaría a modificar el mismo archivo que maneja las rutas, aumentando la probabilidad de romper algo relacionado con HTTP al arreglar algo de negocio, y viceversa.

### O — Principio abierto/cerrado (Open/Closed Principle)

**Explicación en palabras propias:** el código debería poder extenderse (agregarle comportamiento nuevo) sin tener que modificar el código que ya funciona y ya fue probado.

**Dónde se aplica:** `src/solicitudes/solicitudes.module.ts`.

```ts
@Module({
  controllers: [SolicitudesController],
  providers: [
    SolicitudesService,
    {
      provide: SOLICITUD_OPERATIVA_REPOSITORY,
      useClass: SolicitudOperativaRepository,
    },
  ],
})
export class SolicitudesModule {}
```

**Por qué representa el principio:** `SolicitudesService` nunca menciona la clase `SolicitudOperativaRepository`; solo conoce el "contrato" `ISolicitudOperativaRepository` a través del token `SOLICITUD_OPERATIVA_REPOSITORY`. Para cambiar la forma de guardar los datos (por ejemplo, usar una implementación distinta) alcanza con cambiar el `useClass` de este módulo — no hace falta tocar el servicio.

**Qué problema evitaría:** sin esta separación, cualquier cambio en la forma de acceder a los datos obligaría a editar directamente la lógica de negocio del servicio, con el riesgo de introducir errores en código que ya estaba funcionando y probado.

### L — Principio de sustitución de Liskov (Liskov Substitution Principle)

**Explicación en palabras propias:** si una clase promete cumplir un contrato (una interfaz), cualquier código que use ese contrato debe poder trabajar con cualquier clase que lo implemente, sin sorpresas ni comportamientos raros.

**Dónde se aplica:** `src/solicitudes/repositories/solicitud-operativa.repository.ts`.

```ts
/** Única clase que conoce Prisma; consultas siempre parametrizadas vía el query builder. */
@Injectable()
export class SolicitudOperativaRepository implements ISolicitudOperativaRepository {
  constructor(private readonly prisma: PrismaService) {}
```

**Por qué representa el principio:** `SolicitudOperativaRepository` cumple exactamente el contrato de `ISolicitudOperativaRepository` (mismos métodos, mismo comportamiento esperado: lanzar `SolicitudNotFoundError` cuando el id no existe). Por eso, en las pruebas unitarias del servicio (`src/solicitudes/solicitudes.service.spec.ts`) se sustituye esta clase por un objeto simulado que también respeta el mismo contrato, y `SolicitudesService` funciona igual sin darse cuenta del cambio.

**Qué problema evitaría:** si una implementación alternativa rompiera el contrato (por ejemplo, devolviendo `null` en vez de lanzar el error de "no encontrado"), el servicio dejaría de funcionar correctamente de forma silenciosa, y el error solo aparecería en producción, no durante el desarrollo.

### I — Principio de segregación de interfaces (Interface Segregation Principle)

**Explicación en palabras propias:** es mejor tener varias interfaces pequeñas y específicas que una sola interfaz enorme con métodos que casi nadie usa. Nadie debería verse obligado a implementar (o simular) algo que no necesita.

**Dónde se aplica:** `src/solicitudes/repositories/solicitud-operativa.repository.interface.ts`.

```ts
/** Contrato del repositorio: el resto de la app depende de esto, nunca de Prisma directamente. */
export interface ISolicitudOperativaRepository {
  findAllOrderedByRecent(): Promise<SolicitudOperativa[]>;
  create(data: CreateSolicitudData): Promise<SolicitudOperativa>;
  update(id: string, data: UpdateSolicitudData): Promise<SolicitudOperativa>;
  updateEstado(id: string, estado: EstadoSolicitud): Promise<SolicitudOperativa>;
  delete(id: string): Promise<void>;
}
```

**Por qué representa el principio:** la interfaz solo tiene los cinco métodos que `SolicitudesService` realmente usa (uno por caso de uso: listar, crear, reemplazar, cambiar estado y eliminar). No incluye, por ejemplo, un método de búsqueda por id que nadie necesita, aunque técnicamente se podría agregar.

**Qué problema evitaría:** una interfaz más grande de lo necesario obligaría a implementar métodos sin uso real en cualquier clase o simulación (mock) que la implemente, agregando trabajo y código muerto que hay que mantener sin ningún beneficio.

### D — Principio de inversión de dependencias (Dependency Inversion Principle)

**Explicación en palabras propias:** el código de negocio no debería depender directamente de detalles técnicos concretos (como una base de datos específica); debería depender de una abstracción, y que los detalles técnicos se ajusten a esa abstracción.

**Dónde se aplica:** `src/solicitudes/solicitudes.service.ts`.

```ts
@Injectable()
export class SolicitudesService {
  constructor(
    @Inject(SOLICITUD_OPERATIVA_REPOSITORY)
    private readonly repository: ISolicitudOperativaRepository,
  ) {}
```

**Por qué representa el principio:** `SolicitudesService` (la lógica de negocio, la capa "de alto nivel") depende únicamente del tipo `ISolicitudOperativaRepository` (la abstracción) y de un token de inyección, nunca de la clase concreta `SolicitudOperativaRepository` ni de `PrismaService` directamente. Es NestJS quien decide, en `solicitudes.module.ts`, qué implementación concreta conectar a esa abstracción.

**Qué problema evitaría:** si el servicio dependiera directamente de Prisma, sería imposible probarlo con pruebas unitarias rápidas y aisladas — habría que levantar una base de datos real para cada prueba. Gracias a este principio, `solicitudes.service.spec.ts` prueba toda la lógica de negocio con un repositorio simulado, sin ninguna base de datos.

