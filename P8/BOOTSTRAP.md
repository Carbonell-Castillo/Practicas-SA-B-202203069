# Bootstrap y demostración

## 1. Publicar el segundo repositorio

Crear el repositorio público `Practicas-SA-B-202203069-gitops` y publicar en su raíz el contenido de `P8/gitops-repository`. Después eliminar esa copia del repositorio de código o mantenerla únicamente como plantilla; la URL declarada en ArgoCD debe apuntar al repositorio independiente.

Crear el secret de Actions `GITOPS_TOKEN` con permiso mínimo para escribir ramas y Pull Requests únicamente en dicho repositorio.

## 2. Componentes del clúster

Instalar una vez ArgoCD, Argo Rollouts, Kyverno y External Secrets con sus métodos oficiales. Crear el `ClusterSecretStore` llamado `platform-secret-store` y almacenar bajo `sa-p8/prod/runtime` las propiedades `DATABASE_URL`, `JWT_SECRET`, `AES_KEY` y `RABBITMQ_URL`.

Ejecutar Terraform desde la estación administrativa y guardar `plan`/`apply` en `P8/evidence`. Aplicar el bootstrap de `AppProject`, políticas y `Application`. Es la única aplicación manual; los cambios posteriores entran por Git.

## 3. Release normal

Crear y publicar un tag semántico:

```bash
git tag -s v1.0.0 -m 'release 1.0.0'
git push origin v1.0.0
```

El workflow publica ocho imágenes, bloquea vulnerabilidades críticas, adjunta SBOM, firma por digest y abre el PR GitOps. Aprobar el PR y observar la promoción 10 → 25 → 50 → 100.

## 4. Reversión automática

Ejecutar manualmente el workflow con `version=1.0.1` e `induce_failure=true`. La imagen del gateway responderá 503. Tras fusionar el PR GitOps, `gateway-health` fallará en el 10 %, Argo Rollouts abortará y conservará la versión estable. Guardar la salida y reemplazar el tiempo real en `INCIDENTE.md`.

## 5. Rechazo de política

Crear un PR temporal que cambie una etiqueta de imagen por una etiqueta flotante. No fusionarlo a `main`: sincronizar esa rama en una aplicación de demostración o presentar el rechazo en vivo, guardar el evento de Kyverno y cerrar el PR.
