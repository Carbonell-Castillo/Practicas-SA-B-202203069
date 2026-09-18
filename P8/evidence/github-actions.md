# Evidencia de GitHub Actions y GitOps

- Pipeline exitoso: https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35293031535
- Bloqueo real por CVE críticas: https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069/actions/runs/35292544355
- Pull Request GitOps creado automáticamente y fusionado: https://github.com/Carbonell-Castillo/Practicas-SA-B-202203069-gitops/pull/1
- Commit resultante en GitOps: `7c1dad4fee05068258e750cbce3686240b8f8809`

El run bloqueado detectó CVE críticas corregibles en `perl-base` de la imagen Python y en Next.js `16.3.0`. La entrega no avanzó a firma ni a Pull Request. Se actualizó el sistema base y Next.js a `16.3.3`; el siguiente run terminó exitosamente para las ocho imágenes.
