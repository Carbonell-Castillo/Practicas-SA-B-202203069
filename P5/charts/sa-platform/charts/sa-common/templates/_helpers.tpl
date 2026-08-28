{{/*
sa-common.name
Nombre corto (kebab-case) del subchart. Deliberadamente NO usa .Chart.Name:
cuando un subchart se declara como dependencia con `alias:` (como hace cada
subchart de sa-platform, para exponer sus values bajo una clave camelCase,
ej. `authService`), Helm resuelve `.Chart.Name` al ALIAS dentro del contexto
de ese subchart, no al nombre real del chart — así que `auth-service` se
convertía en el inválido "authService" en nombres de contenedor (deben
cumplir RFC 1123: minúsculas y guiones). Se usa `.Values.componentLabel` en
su lugar, que cada subchart ya declara en kebab-case (y ya es `required` en
sa-common.selectorLabels).
*/}}
{{- define "sa-common.name" -}}
{{- default .Values.componentLabel .Values.nameOverride | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
sa-common.fullname
Nombre completo del recurso: "<release>-<chart>" salvo que el release ya
incluya el nombre del chart, o que se fuerce con .Values.fullnameOverride.
Es el named template que más se reutiliza (Deployment/Service/ConfigMap/...
de cada subchart lo usan como `metadata.name`).
*/}}
{{- define "sa-common.fullname" -}}
{{- if .Values.fullnameOverride -}}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- $name := default .Values.componentLabel .Values.nameOverride -}}
{{- if contains $name .Release.Name -}}
{{- .Release.Name | trunc 63 | trimSuffix "-" -}}
{{- else -}}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" -}}
{{- end -}}
{{- end -}}
{{- end -}}

{{/*
sa-common.chart
Etiqueta "<chart>-<version>" usada en el label helm.sh/chart.
*/}}
{{- define "sa-common.chart" -}}
{{- printf "%s-%s" (default .Chart.Name .Values.componentLabel) .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" -}}
{{- end -}}

{{/*
sa-common.labels
Labels estándar (recomendadas por la doc de Helm) aplicadas a TODOS los
recursos de TODOS los subcharts: identifican release, chart, versión de la
app y el componente lógico de la plataforma (auth, orders, gateway, etc.),
usado luego por las NetworkPolicies para seleccionar pods por rol.
*/}}
{{- define "sa-common.labels" -}}
helm.sh/chart: {{ include "sa-common.chart" . }}
{{ include "sa-common.selectorLabels" . }}
app.kubernetes.io/version: {{ .Chart.AppVersion | default .Values.image.tag | default "latest" | quote }}
app.kubernetes.io/managed-by: {{ .Release.Service | quote }}
app.kubernetes.io/part-of: sa-platform
{{- end -}}

{{/*
sa-common.selectorLabels
Subconjunto ESTABLE de labels usado como selector (Deployment/Service/
NetworkPolicy/PDB): nunca debe cambiar entre upgrades o rompe el selector
inmutable de Deployment/Service.
*/}}
{{- define "sa-common.selectorLabels" -}}
app.kubernetes.io/name: {{ include "sa-common.name" . }}
app.kubernetes.io/instance: {{ .Release.Name | quote }}
sa-platform/component: {{ required "Values.componentLabel es obligatorio (identifica el rol del subchart, ej. 'orders-service')" .Values.componentLabel | quote }}
{{- end -}}

{{/*
sa-common.serviceAccountName
Nombre del ServiceAccount dedicado del subchart. Nunca "default": si
.Values.serviceAccount.create es true se construye "<fullname>-sa"; si es
false se exige (required) que el subchart indique explícitamente cuál usar.
*/}}
{{- define "sa-common.serviceAccountName" -}}
{{- if .Values.serviceAccount.create -}}
{{- printf "%s-sa" (include "sa-common.fullname" .) -}}
{{- else -}}
{{- required "Values.serviceAccount.name es obligatorio cuando serviceAccount.create=false" .Values.serviceAccount.name -}}
{{- end -}}
{{- end -}}

{{/*
sa-common.checksumConfigAnnotation
Annotation con el checksum del ConfigMap del subchart: al cambiar cualquier
valor del ConfigMap, el hash cambia, la annotation del pod template cambia,
y Kubernetes reinicia los pods automáticamente (patrón estándar de Helm
para "reiniciar al cambiar el ConfigMap", ver sección B de Make.md).
Requiere que el subchart tenga `templates/configmap.yaml`.
Para subcharts que ADEMÁS tengan `templates/secret.yaml`, agregar en su
deployment.yaml una segunda línea análoga:
  checksum/secret: {{ include (print $.Template.BasePath "/secret.yaml") $ | sha256sum }}
(no se generaliza aquí porque `.Files.Glob` no puede ver `templates/`, así
que no hay forma de detectar automáticamente si el subchart tiene Secret).
*/}}
{{- define "sa-common.checksumConfigAnnotation" -}}
checksum/config: {{ include (print .Template.BasePath "/configmap.yaml") . | sha256sum }}
{{- end -}}
