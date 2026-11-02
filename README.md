# Finanzas — Registro de Ingresos y Egresos

## Qué es y cuál es su función

Es una aplicación web minimalista para registrar ingresos y egresos cotidianos desde el celular o la computadora.

* **Funciona con o sin internet:** Si no tienes conexión, guarda los registros en la memoria local de tu dispositivo (`localStorage`).
* **Sincronización automática con Google Sheets:** Cuando tienes internet, envía todos los movimientos pendientes a tu hoja de cálculo de Google Drive.

---

## Qué es la "URL del Webhook (Google Apps Script)" y cómo conseguirla

La **URL del Webhook** es el enlace que conecta esta aplicación con tu hoja de cálculo de **Google Sheets** para que cada registro se guarde automáticamente como una nueva fila.

Solo necesitas configurarla una vez siguiendo estos pasos:

### Paso 1: Crear la hoja y pegar el código
1. Abre [Google Sheets](https://sheets.new) y crea una hoja de cálculo en blanco.
2. En el menú superior, entra en **Extensiones** > **Apps Script**.
3. Borra el código que aparece por defecto en el editor.
4. Copia todo el contenido del archivo [`backend/google_apps_script.js`](./backend/google_apps_script.js) y pégalo en el editor de Apps Script.
5. Presiona **`Ctrl + S`** para guardar.

### Paso 2: Generar la URL del Webhook
1. Arriba a la derecha, haz clic en **Implementar** > **Nueva implementación**.
2. Junto a *"Selecciona el tipo"*, haz clic en el engranaje y elige **Aplicación web**.
3. Configura estas dos opciones:
   * **Ejecutar como:** `Yo`
   * **Quién tiene acceso:** **`Cualquier persona`** *(Requerido para que la aplicación pueda enviar los registros)*.
4. Haz clic en **Implementar**.

### Paso 3: Autorizar permisos de tu cuenta
1. Haz clic en **Autorizar acceso** y selecciona tu cuenta de Google.
2. En la pantalla *"Google hasn't verified this app"* (*Google no ha verificado esta aplicación*):
   * Haz clic abajo a la izquierda en **`Advanced`** (*Configuración avanzada*).
   * Haz clic en **`Go to Proyecto (unsafe)`** (*Ir a Proyecto*).
   * Haz clic en **`Allow`** (*Permitir*).
3. Copia la **URL de la aplicación web** que termina en **`/exec`**.

---

## Cómo hacer que funcione

1. Abre la aplicación y haz clic en el botón **Ajustes** (arriba a la derecha).
2. Pega la URL que termina en `/exec` dentro del campo **URL del Webhook (Google Apps Script)** y pulsa **Guardar URL**.
3. Para registrar un movimiento sigue el orden en pantalla:
   1. Selecciona si es **Egreso** o **Ingreso**.
   2. Selecciona el medio: **Efectivo** o **Banco**.
   3. Escribe la **Cantidad**.
   4. Elige la **Categoría**.
   5. Si necesitas añadir una nota, marca la casilla **Agregar detalle** y escríbela.
   6. Pulsa **Guardar**.

---

## Cómo ejecutarla

* **En tu PC:**
  Ejecuta en la terminal dentro de esta carpeta:
  ```bash
  npx --yes serve -l 8080 .
  ```
  Abre `http://localhost:8080` en tu navegador.

* **En tu celular (GitHub Pages):**
  Sube este repositorio a GitHub, activa **Settings > Pages** sobre la rama `master` (o `main`), abre el enlace en tu teléfono y pega tu URL del Webhook en **Ajustes**.

---

## Licencia y Uso Personal

Este proyecto fue desarrollado con fines de **uso personal y aprendizaje**.

* **Uso personal:** Está diseñado para la gestión privada de finanzas cotidianas de forma individual.
* **Sin garantías:** El código se proporciona *"tal cual"*, sin garantías de ningún tipo.
* **Privacidad:** Ningún dato financiero se almacena en este repositorio; la información viaja directamente desde tu navegador (`localStorage`) hacia tu propia hoja de Google Sheets mediante tu URL personal de Webhook.
* **Derechos de uso:** Puedes clonar, adaptar o usar este proyecto para tu propio control personal o estudio, pero no está destinado para su comercialización ni distribución como servicio a terceros.
