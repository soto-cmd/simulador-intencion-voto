# Simulador de intención de voto

Sitio estático para GitHub Pages + Supabase.

## Funciones
- Registro de participación con cédula, sexo, rango de edad y residencia.
- La cédula no se guarda en texto legible: Supabase genera un HMAC interno con un secreto privado para impedir duplicados.
- La intención de voto se registra usando un token aleatorio que no contiene ni conserva un vínculo con la cédula o los datos demográficos.
- Una participación válida por cédula.
- Panel privado por candidato con intención de voto general y evolución de 7 días.
- Perfil demográfico agregado del conjunto de participantes: sexo, rango de edad y lugar de residencia. No se cruza con una candidatura específica.
- Panel administrador para agregar, activar o desactivar candidaturas e invitar candidatos por correo.

## Primer acceso administrador
1. Publicar el sitio en GitHub Pages.
2. Entrar en **Acceso candidatos**.
3. Crear la cuenta administrativa con el correo autorizado en Supabase.
4. Confirmar el correo si Supabase lo solicita y luego iniciar sesión.
5. El sistema asigna el primer administrador autorizado.

## Candidatos
1. El administrador crea la candidatura e indica el correo del candidato.
2. El candidato pulsa **Crear cuenta** usando exactamente ese correo.
3. Tras confirmar su cuenta, el sistema vincula su usuario con la candidatura correspondiente.

## Aviso
Este simulador es independiente y no oficial. Sus resultados no equivalen a una encuesta científica ni a resultados electorales del TSJE.
