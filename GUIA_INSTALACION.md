# 🚀 Guía de Instalación del Bot "KLEY OFICIAL VIP"

¡Hola! He creado tu sistema completo. Se compone de dos partes:
1. **Bot de WhatsApp:** Responde automáticamente, muestra catálogos y pide comprobantes.
2. **Panel de Administración:** Una página web privada donde puedes modificar precios, días, productos, poner en mantenimiento y ver pedidos.

Como quieres que el panel web esté accesible y que no dependa de tu iPhone encendido, la mejor forma de alojarlo es usar **Railway**, un hosting gratuito en la nube.

A continuación te explico cómo subirlo en 5 minutos.

---

## 🌟 Opción Recomendada: Hosting en la nube (Railway)

Con esta opción, tu bot estará activo 24/7 y tendrás un enlace público para tu Panel Admin.

### Paso 1: Sube el código a GitHub
1. Entra a [GitHub.com](https://github.com) y crea una cuenta si no tienes.
2. Crea un nuevo repositorio (New Repository), llámalo `kley-bot`.
3. Descarga el archivo `kley-bot.zip` que te envié.
4. Descomprímelo en tu computadora o iPhone.
5. Sube todos los archivos (incluyendo `server.js`, `package.json`, carpetas `bot`, `admin`, etc.) a ese repositorio de GitHub.

### Paso 2: Conecta GitHub con Railway
1. Entra a [Railway.app](https://railway.app) e inicia sesión con tu cuenta de GitHub.
2. Haz clic en **"New Project"** (Nuevo Proyecto).
3. Selecciona **"Deploy from GitHub repo"** (Desplegar desde repositorio de GitHub).
4. Elige el repositorio `kley-bot` que acabas de crear.
5. Haz clic en **"Deploy Now"**.

### Paso 3: Configurar el Dominio Público
1. En Railway, haz clic en tu proyecto y luego en el bloque que se acaba de crear.
2. Ve a la pestaña **"Settings"** (Configuración).
3. Baja hasta la sección **"Networking"** y haz clic en **"Generate Domain"**.
4. ¡Listo! Esa URL (ejemplo: `kley-bot-production.up.railway.app`) será tu Panel de Administración.

### Paso 4: Conectar WhatsApp
1. En Railway, ve a la pestaña **"Deployments"** y haz clic en **"View Logs"** (Ver registros).
2. Espera unos segundos. Verás que en la consola (logs) aparece un **Código QR gigante**.
3. Abre WhatsApp en tu teléfono, ve a "Dispositivos vinculados" -> "Vincular dispositivo".
4. **Escanea el código QR** que aparece en la pantalla de Railway.
5. ¡Tu bot ya está conectado y funcionando!

---

## 💻 Uso del Panel de Administración

1. Entra a la URL pública que te dio Railway (ejemplo: `https://tu-app.up.railway.app`).
2. Ingresa la contraseña por defecto: **`kley2024admin`**
3. Una vez dentro, ve a la pestaña **"⚙️ Configuración"** y:
   - Cambia la contraseña por una tuya.
   - Pon tu número de teléfono (con código de país, sin el `+` ni espacios, ej: `584141234567`) para que el bot te avise por WhatsApp cuando alguien envíe un comprobante.

---

## 📱 Opción Alternativa: Usar iSH en iPhone (No recomendado)

Si aún quieres correrlo en tu iPhone con iSH (recuerda que si cierras la app o se apaga la pantalla, el bot se apaga), sigue estos pasos:

1. Abre iSH y actualiza los paquetes:
   ```bash
   apk update && apk upgrade
   ```
2. Instala Node.js, Git y Chromium (necesario para el bot):
   ```bash
   apk add nodejs npm git chromium
   ```
3. Descarga el código:
   ```bash
   # (Tendrás que subir el .zip a alguna parte y descargarlo con wget, o usar git clone)
   git clone https://github.com/TU_USUARIO/kley-bot.git
   cd kley-bot
   ```
4. Instala las dependencias:
   ```bash
   npm install
   ```
5. Ejecuta el sistema:
   ```bash
   npm start
   ```
6. Te aparecerá el código QR en la pantalla de iSH. Tómale captura, envíala a otro dispositivo y escanéala rápido con tu WhatsApp.
7. El Panel Admin estará en `http://localhost:3001` en el navegador de tu iPhone.

> **Nota:** En iSH es muy lento y puede fallar porque la app de WhatsApp Web requiere mucha memoria. **Usa Railway.**
