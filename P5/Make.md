Partiendo de los microservicios construidos en la Práctica 4, se le solicita llevar la solución a 
un nivel de madurez operativa superior. Ya no basta con que los objetos de Kubernetes 
funcionen: ahora la plataforma completa deberá ser instalable, actualizable y reversible con 
un solo comando, además de incorporar comunicación asíncrona, persistencia durable y 
controles de seguridad. 
El namespace de trabajo será sa-p5 y deberá ser creado por el propio chart, no de forma 
manual. Queda proh  ibido aplicar manifiestos sueltos con kubectl apply -f: el único 
mecanismo de despliegue aceptado será helm install / helm upgrade. 
A. Empaquetado con Helm (obligatorio) 
● Deberá construir un chart padre (por ejemplo, sa-platform) que contenga como 
subcharts cada uno de los microservicios y el simulador de API Gateway. 
● El broker de mensajería y la base de datos deberán declararse como dependencias 
en el archivo Chart.yaml (por ejemplo, desde el repositorio de Bitnami) y resolverse 
con helm dependency update. 
Software Avanzado 
Práctica - Vigente para el Segundo Semestre 2026  
● Deberá existir un values.yaml base más, como mínimo, values-dev.yaml y values
prod.yaml, que modifiquen al menos: número de réplicas, límites de recursos, tag de 
la imagen y nivel de log. 
● Las plantillas deberán demostrar uso real del motor de plantillas: un archivo 
_helpers.tpl con al menos dos named templates, y el uso de range, if / else, required, 
default y quote. No se aceptarán plantillas que sean manifiestos estáticos 
disfrazados. 
● helm lint deberá ejecutarse sin errores ni advertencias. 
● El chart deberá estar versionado (version y appVersion en Chart.yaml). Deberá 
demostrar al menos dos versiones publicadas, una operación de helm upgrade y 
una de helm rollback a la revisión anterior, evidenciadas con helm history. 
B. Configuración y manejo de secretos (obligatorio) 
● Toda variable no sensible deberá provenir de un ConfigMap generado por el chart. 
● Las credenciales de la base de datos y del broker deberán almacenarse en un 
Secret e inyectarse mediante envFrom o volumen montado. Ninguna credencial 
podrá estar escrita en el repositorio; se entregará un values.example.yaml con 
valores ficticios. 
● Un cambio en el ConfigMap deberá provocar el reinicio automático de los pods 
afectados (sugerencia: anotación con checksum/config). 
C. Persistencia de datos (obligatorio) 
● La base de datos deberá desplegarse dentro del clúster como StatefulSet con su 
PersistentVolumeClaim y un headless service asociado. 
● Deberá demostrar, con evidencia, que los datos sobreviven al borrado del pod de 
la base de datos. 
D. Comunicación asíncrona mediante broker (obligatorio) 
● Deberá incorporar un broker de mensajería desplegado en el clúster: RabbitMQ, 
Kafka o NATS. 
● Al menos un flujo de negocio deberá dejar de ser síncrono: un productor publica el 
evento y retorna inmediatamente, y un microservicio consumidor lo procesa de forma 
independiente. 
● La cola o tópico deberá ser durable, y el consumidor deberá confirmar el mensaje 
solo tras procesarlo correctamente. 
● Deberá demostrar el comportamiento del sistema cuando el consumidor está caído: 
los mensajes se acumulan y se procesan al restaurarlo, sin pérdida de información. 
E. Exposición y aislamiento de red (obligatorio) 
● La única puerta de entrada al clúster será el API Gateway, expuesto mediante un 
Ingress con un Ingress Controller (NGINX o Traefik) y enrutamiento por path o por 
host. 
● Los microservicios, la base de datos y el broker no podrán exponerse con NodePort 
ni LoadBalancer. 
Software Avanzado 
Práctica - Vigente para el Segundo Semestre 2026  
● Deberá definir NetworkPolicies que impidan el tráfico lateral: solo el gateway puede 
alcanzar a los microservicios, y solo los microservicios autorizados pueden alcanzar 
a la base de datos y al broker. Deberá entregar evidencia del bloqueo (una petición 
que falle desde un pod no autorizado). 
F. Salud, escalado y resiliencia (obligatorio) 
● Cada deployment deberá definir liveness, readiness y startup probe, con valores 
justificados en la documentación. 
● Deberá configurar HPA con mínimo 2 y máximo 5 réplicas, activándose al 70 % de 
uso de CPU, con metrics-server habilitado. 
● El namespace deberá contar con ResourceQuota y LimitRange que acoten el 
consumo total. 
● Cada microservicio deberá tener un PodDisruptionBudget. 
● La estrategia de actualización deberá ser RollingUpdate con maxUnavailable: 0, y 
deberá demostrar una actualización sin caída de servicio (peticiones continuas 
durante el upgrade, sin respuestas de error). 
G. Seguridad del contenedor y del clúster (obligatorio) 
● Cada cronjob y cada microservicio deberá ejecutarse con un ServiceAccount 
dedicado, con Role y RoleBinding de mínimo privilegio. Queda prohibido el uso del 
ServiceAccount default. 
● Los contenedores deberán declarar securityContext con runAsNonRoot: true, 
readOnlyRootFilesystem: true y allowPrivilegeEscalation: false. 
● Las imágenes deberán construirse con multi-stage build y una base mínima 
(alpine, slim o distroless). Deberá entregar una tabla comparativa del tamaño de 
cada imagen antes y después de la optimización. 
H. Trabajos programados (obligatorio) 
● Cronjob 1: se ejecuta cada 2 minutos e inserta en la base de datos un registro con 
la fecha y hora de ejecución (zona horaria GMT-6) y el número de carné del 
estudiante. 
● Cronjob 2: se ejecuta cada 10 minutos, consulta los registros generados por el 
Cronjob 1, calcula un resumen (cantidad de ejecuciones por hora) y publica ese 
resumen como un mensaje en el broker, donde deberá ser consumido y 
almacenado. 
● Ambos deberán definir concurrencyPolicy: Forbid, backoffLimit, 
successfulJobsHistoryLimit y failedJobsHistoryLimit. 
I. Pruebas de carga (obligatorio) 
● Deberá elaborar un script de carga con k6, Locust o hey que golpee el API 
Gateway con concurrencia creciente. 
● Deberá evidenciar el escalado automático (salida de kubectl get hpa -w y kubectl 
get pods -w) y el posterior descenso de réplicas al cesar la carga. 
● Reporte, como mínimo: peticiones por segundo, latencia p95 y porcentaje de error.

Obligatorio: 
● Chart de Helm único, parametrizado, versionado y con dependencias 
declaradas. 
● Despliegue de los 4 microservicios más el API Gateway en el namespace sa
p5. 
● ConfigMaps, Secrets y persistencia con StatefulSet + PVC. 
● Broker de mensajería con al menos un flujo asíncrono funcional. 
● Ingress como único punto de entrada y NetworkPolicies de aislamiento. 
● Probes, HPA, ResourceQuota, LimitRange y PodDisruptionBudget. 
● RBAC de mínimo privilegio y securityContext restrictivo. 
● Dos cronjobs encadenados y pruebas de carga documentadas.

No requerido (pero recomendado): 
● Uso de Redis como caché de lectura para uno de los microservicios. 
● Publicación del chart en un repositorio de charts propio (GitHub Pages u OCI). 
● Uso de helm test para validar el release tras la instalación. 
● Definición de affinity o topologySpreadConstraints para distribuir réplicas. 

● Despliegue en clúster de nube administrado e infraestructura como código. 
● Observabilidad (métricas, trazas y logs centralizados) y service mesh. 
● Integración y entrega continua.