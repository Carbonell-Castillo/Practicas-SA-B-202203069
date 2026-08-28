# Evidencia: RBAC de mínimo privilegio + securityContext restrictivo (sección G)

## ServiceAccounts dedicados (ninguno usa 'default')
```
POD                                      SERVICEACCOUNT
postgres-0                               postgres
rabbitmq-0                               rabbitmq
gateway-cbd577fc-f5qlt                   gateway-sa
frontend-5c7fdb8f85-7n4s8                frontend-sa
auth-service-58494bcbbd-g9p5j            auth-service-sa
orders-service-64b4c85f76-rmpcj          orders-service-sa
cron-jobs-summary-29796940-6cp2j         cron-jobs-sa
products-service-69c9d998dc-82hw5        products-service-sa
cron-jobs-heartbeat-29796944-x94c2       cron-jobs-sa
authorization-service-6df85bc9c8-gm2ts   authorization-service-sa
notifications-service-8695556589-gph7x   notifications-service-sa
```

## Role + RoleBinding de orders-service (mínimo privilegio: get sobre su propio ConfigMap/Secret únicamente)
```
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  annotations:
    meta.helm.sh/release-name: sa-platform
    meta.helm.sh/release-namespace: sa-p5
  labels:
    app.kubernetes.io/instance: sa-platform
    app.kubernetes.io/managed-by: Helm
    app.kubernetes.io/name: orders-service
    app.kubernetes.io/part-of: sa-platform
    app.kubernetes.io/version: 1.0.0
    helm.sh/chart: orders-service-0.1.0
    sa-platform/component: orders-service
  name: orders-service
  namespace: sa-p5
rules:
- apiGroups:
  - ""
  resourceNames:
  - orders-service
  resources:
  - configmaps
  - secrets
  verbs:
  - get
```

## kubectl auth can-i, con la identidad del ServiceAccount de orders-service: NO puede listar pods (fuera de su Role)
```
no
kubectl -n sa-p5 auth can-i get secret/orders-service --as=system:serviceaccount:sa-p5:orders-service-sa
yes
```

## securityContext real aplicado (pod orders-service) — runAsNonRoot, readOnlyRootFilesystem, allowPrivilegeEscalation:false, capabilities drop ALL
```
{"fsGroup":1000,"runAsGroup":1000,"runAsNonRoot":true,"runAsUser":1000,"seccompProfile":{"type":"RuntimeDefault"}}
{"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]},"readOnlyRootFilesystem":true}
```

## Verificación en vivo dentro del contenedor: UID no-root y filesystem raíz de solo lectura
```
id:
uid=1000(node) gid=1000(node) groups=1000(node)
intento de escribir en / (debe fallar, Read-only file system):
touch: /root-write-test: Read-only file system
escritura en /tmp (SÍ debe funcionar, es el emptyDir montado):
OK
```
