# Índice de evidencia P9

Evidencia final verificada:

- [`full-reconstruction-20261002.txt`](full-reconstruction-20261002.txt): destrucción, operaciones GKE, RTO y restore cruzado desde el backup anterior.
- [`bootstrap-idempotent-20261002.txt`](bootstrap-idempotent-20261002.txt): transcripción UTF-8 del bootstrap idempotente, `BOOTSTRAP_OK` y 259 segundos.
- [`data-restore-20261002T195435Z.txt`](data-restore-20261002T195435Z.txt): backup/restore, contenido exacto recuperado, RPO de 10 segundos y `PASS`.
- [`node-loss-20261002T200215Z.txt`](node-loss-20261002T200215Z.txt): drenaje, HTTP 200 durante la pérdida de nodo, recuperación de ambos datastores y `PASS`.

Los scripts generan nuevos archivos con fecha UTC. Solo se conserva como evidencia de entrega una ejecución que termine en `PASS`, `BOOTSTRAP_OK` o `DESTROY_OK`; un archivo incompleto no se considera prueba.
