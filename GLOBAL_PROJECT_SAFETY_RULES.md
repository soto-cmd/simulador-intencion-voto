# Politica global de seguridad y cambios — 11/10/2026

Aplica a todo proyecto administrado. Se suma a las reglas especificas existentes y NO las elimina.

## Autorizacion y despliegues
- Solo el comando explicito `d` autoriza un deploy para el proyecto concreto en el que se trabaja.
- `h` prepara/corrige, `c` corrige, `get` valida y prepara, `rc` revisa produccion y corrige codigo sin desplegar, `rep` resume. Ninguno autoriza deploy.
- No hacer deploys automaticos, ni merge a ramas productivas, ni migraciones no autorizadas; verificar los disparadores automaticos existentes antes de actualizar una rama.
- Si se solicita `d`, comprobar previamente la rama y commit exactos, dependencias, alcance, compilacion y riesgos; intentar un solo despliegue y confirmar su resultado.

## Conservacion de funcionalidades
- Prohibido reconstruir por suposicion un modulo que ya funcionaba: localizar la version comprobada en el historial y conservar su diseno y comportamiento.
- Comparar los cambios contra el commit que esta realmente desplegado (puede no ser `main`).
- Aislar cada correccion; no cambiar modulos, estilos compartidos, datos ni rutas ajenas.
- Proteger especialmente formatos de publicacion, portadas, archivos multimedia, carruseles, dashboards, exportaciones y permisos.
- Mantener una referencia de recuperacion y no hacer rollback automatico sin autorizacion.

## Bloqueos de seguridad, datos y costos
- No borrar ni sobrescribir registros, archivos, historiales o configuraciones productivas sin autorizacion especifica y respaldo verificado.
- Respetar permisos y RLS; no exponer datos privados ni secretos en codigo, registros o archivos.
- Minimizar consumos de Vercel, Neon, Supabase, Cloudinary, R2 y cualquier proveedor.
- Bloquear operaciones que impliquen pagos, tarjetas, contrataciones, cambios de plan o consumo facturable sin aprobacion expresa.
- Evitar builds repetidos, ramas de base de datos innecesarias, consultas de sondeo frecuentes y escrituras duplicadas.

## Puerta de calidad
- No declarar una correccion «validada» por una mera inspeccion estatica ni porque el deploy figure READY.
- Antes de recomendar el despliegue: revisar diferencias, compilar/probar cuando sea posible, verificar rutas afectadas, mobile y escritorio, datos, autorizaciones y regresiones en lo ya aprobado.
- Si no es posible ejecutar una prueba, informar que queda pendiente; no inventar resultados.
- Tras desplegar, revisar produccion y errores; corregir en rama sin lanzar nuevos deploys automaticamente.

## Relacion con reglas existentes
- Esta politica es transversal; se conservan todas las reglas particulares del repositorio, la identidad visual aprobada y los procedimientos de su dominio.
- Ningun archivo de politica por si solo activa una proteccion automatica: agregar verificaciones CI y reglas de rama en cambios posteriores separados, sin alterar produccion.
