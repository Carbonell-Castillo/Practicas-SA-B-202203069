# Evidencia: versionado del chart (helm upgrade + helm rollback + helm history)

## Estado antes: helm history (revision 1, chart 0.1.0)
```
REVISION	UPDATED                 	STATUS  	CHART            	APP VERSION	DESCRIPTION     
1       	Thu Aug 27 01:26:13 2026	deployed	sa-platform-0.1.0	1.0.0      	Install complete
```

## helm upgrade a chart version 0.2.0 (cpu limit dev 300m -> 400m)
```
Saving 11 charts
Downloading postgresql from repo https://charts.bitnami.com/bitnami
Pulled: registry-1.docker.io/bitnamicharts/postgresql:16.7.0
Digest: sha256:1d999e79438ca47f4987c6470126cb34c5147edf80bf3c9e83b46e6d67eeace5
Deleting outdated charts
Release "sa-platform" has been upgraded. Happy Helming!
NAME: sa-platform
LAST DEPLOYED: Thu Aug 27 01:42:46 2026
NAMESPACE: sa-p5
STATUS: deployed
REVISION: 2
TEST SUITE: None
```

## helm rollback a la revisión anterior (1)
```
Rollback was a success! Happy Helming!
```

## helm history final
```
REVISION	UPDATED                 	STATUS    	CHART            	APP VERSION	DESCRIPTION     
1       	Thu Aug 27 01:26:13 2026	superseded	sa-platform-0.1.0	1.0.0      	Install complete
2       	Thu Aug 27 01:42:46 2026	superseded	sa-platform-0.2.0	1.0.0      	Upgrade complete
3       	Thu Aug 27 01:43:37 2026	superseded	sa-platform-0.1.0	1.0.0      	Rollback to 1   
4       	Thu Aug 27 01:43:40 2026	deployed  	sa-platform-0.1.0	1.0.0      	Rollback to 1   
```
