# Despliegue independiente de demostraciones

Worker: lapaz-demos-publicas. Rama: desarrollo. Directorio raíz: /. Comando: `npx wrangler deploy --config wrangler.demos-publicas.json`.

El 28 de noviembre de 2026 se confirmó en el panel de Cloudflare que los intentos anteriores correspondían a main, donde no existe la configuración independiente. Este commit activa un nuevo evento push en desarrollo para comprobar la integración Git. No modifica código funcional, wrangler.json, main, D1, DNS ni el Worker original. El despliegue y la URL deben verificarse en Cloudflare; la persistencia de servidor permanece deshabilitada en el Worker independiente.
