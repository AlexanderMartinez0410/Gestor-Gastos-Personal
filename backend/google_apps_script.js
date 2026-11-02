/**
 * ============================================================================
 * BACKEND SIN SERVIDOR: GOOGLE APPS SCRIPT PARA FINANZAS OFFLINE PWA
 * ============================================================================
 * Ubicación recomendada en Google Drive: SEGUNDO CEREBRO / 80_FINANZAS
 *
 * INSTRUCCIONES DE DESPLIEGUE:
 * 1. Abre tu hoja de cálculo en Google Sheets.
 * 2. Ve a Extensiones > Apps Script.
 * 3. Borra cualquier código existente y pega este archivo completo.
 * 4. Haz clic en "Implementar" (Deploy) > "Nueva implementación" (New deployment).
 * 5. Selecciona el tipo "Aplicación web" (Web app):
 *    - Ejecutar como: "Yo" (Me)
 *    - Quién tiene acceso: "Cualquier persona" (Anyone)
 * 6. Copia la URL generada (termina en /exec) y pégala en Ajustes (⚙️) de tu PWA.
 * ============================================================================
 */

const HEADERS = ['Marca temporal', 'Tipo', 'Monto ($)', 'Categoría', 'Detalle'];
const PROCESSED_IDS_KEY = 'PROCESSED_TX_IDS';
const MAX_STORED_IDS = 300; // Ventana deslizante para idempotencia anti-duplicados

/**
 * Endpoint GET para comprobar en el navegador que el Webhook está activo.
 */
function doGet() {
  return createJsonResponse({
    status: 'ok',
    service: 'Finanzas Offline PWA Webhook',
    message: 'El endpoint está activo. Usa peticiones POST desde la PWA para sincronizar transacciones.'
  });
}

/**
 * Endpoint POST principal que recibe transacciones individuales o por lote (batch).
 * @param {GoogleAppsScript.Events.DoPost} e
 */
function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    // Espera hasta 10 segundos para evitar condiciones de carrera en sincronizaciones simultáneas
    lock.waitLock(10000);

    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        status: 'error',
        message: 'No se recibió ningún payload en la petición POST.'
      });
    }

    const rawPayload = JSON.parse(e.postData.contents);

    // Soporta:
    // 1. Un array directo de transacciones: [{...}, {...}]
    // 2. Un objeto envoltorio con propiedad transactions/data: { transactions: [{...}] }
    // 3. Un objeto de transacción individual: { id, timestamp, tipo, monto, categoria, detalle }
    let transactions = [];
    if (Array.isArray(rawPayload)) {
      transactions = rawPayload;
    } else if (rawPayload && Array.isArray(rawPayload.transactions)) {
      transactions = rawPayload.transactions;
    } else if (rawPayload && typeof rawPayload === 'object') {
      transactions = [rawPayload];
    }

    if (transactions.length === 0) {
      return createJsonResponse({
        status: 'ok',
        inserted: 0,
        skippedDuplicates: 0,
        message: 'Lote vacío, no se requirió insertar filas.'
      });
    }

    const sheet = getOrInitializeSheet();
    const scriptProps = PropertiesService.getScriptProperties();
    const processedIdsRaw = scriptProps.getProperty(PROCESSED_IDS_KEY);
    let processedIds = processedIdsRaw ? JSON.parse(processedIdsRaw) : [];
    const processedSet = new Set(processedIds);

    const rowsToInsert = [];
    const newlyProcessedIds = [];
    let skippedDuplicates = 0;

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      if (!tx) continue;

      const txId = tx.id ? String(tx.id) : null;

      // Control de idempotencia para evitar duplicados si hubo reintentos de red
      if (txId && processedSet.has(txId)) {
        skippedDuplicates++;
        continue;
      }

      const timestamp = formatTimestamp(tx.timestamp);
      const tipo = tx.tipo ? String(tx.tipo).trim() : 'Egreso';
      const monto = typeof tx.monto === 'number' ? tx.monto : parseFloat(tx.monto) || 0;
      const categoria = tx.categoria ? String(tx.categoria).trim() : 'Varios';
      const detalle = tx.detalle ? String(tx.detalle).trim() : '';

      rowsToInsert.push([timestamp, tipo, monto, categoria, detalle]);

      if (txId) {
        processedSet.add(txId);
        newlyProcessedIds.push(txId);
      }
    }

    // Inserción en bloque (batch write) para máximo rendimiento en Google Sheets
    if (rowsToInsert.length > 0) {
      const startRow = sheet.getLastRow() + 1;
      sheet
        .getRange(startRow, 1, rowsToInsert.length, HEADERS.length)
        .setValues(rowsToInsert);

      // Formato numérico de moneda para la columna Monto ($)
      sheet
        .getRange(startRow, 3, rowsToInsert.length, 1)
        .setNumberFormat('#,##0.00');
    }

    // Actualiza el registro de IDs procesados manteniendo una ventana acotada
    if (newlyProcessedIds.length > 0) {
      processedIds = processedIds.concat(newlyProcessedIds);
      if (processedIds.length > MAX_STORED_IDS) {
        processedIds = processedIds.slice(processedIds.length - MAX_STORED_IDS);
      }
      scriptProps.setProperty(PROCESSED_IDS_KEY, JSON.stringify(processedIds));
    }

    return createJsonResponse({
      status: 'ok',
      inserted: rowsToInsert.length,
      skippedDuplicates: skippedDuplicates,
      processedIds: newlyProcessedIds,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: error && error.message ? error.message : String(error)
    });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Obtiene la hoja activa y, si está vacía, crea y da formato a los encabezados.
 * @return {GoogleAppsScript.Spreadsheet.Sheet}
 */
function getOrInitializeSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#18181b');
    headerRange.setFontColor('#fafafa');
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Normaliza el timestamp ISO a un objeto Date o cadena legible en la zona horaria del script.
 * @param {string} isoString
 * @return {Date|string}
 */
function formatTimestamp(isoString) {
  if (!isoString) return new Date();
  const parsed = new Date(isoString);
  return isNaN(parsed.getTime()) ? String(isoString) : parsed;
}

/**
 * Construye una respuesta JSON compatible con CORS en Google Apps Script.
 * @param {Object} data
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
