/**
 * Security.gs - Módulo de Seguridad, Concurrencia y Sanitización
 * CONESIEE 2026 - Universidad de San Carlos de Guatemala
 */

/**
 * Sanitiza valores contra inyección de fórmulas en Google Sheets (CSV/Formula Injection).
 * Si un texto inicia con '=', '+', '-', '@', '\t' o '\r', antepone una comilla simple.
 * @param {*} value
 * @return {*}
 */
function sanitizeForSheet(value) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean' || typeof value === 'number') {
    return value;
  }
  var str = String(value).trim();
  if (/^[=+\-@\t\r]/.test(str)) {
    return "'" + str;
  }
  return str;
}

/**
 * Limpia y normaliza cadenas de texto para evitar inyecciones y caracteres no imprimibles.
 * @param {*} str
 * @param {number} maxLength
 * @return {string}
 */
function sanitizeString(str, maxLength) {
  if (str === null || str === undefined) return '';
  var cleaned = String(str)
    .replace(/[<>]/g, '') // Elimina caracteres directos de etiquetas HTML
    .trim();
  if (maxLength && cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
  }
  return cleaned;
}

/**
 * Ejecuta una operación crítica bajo bloqueo exclusivo usando LockService.
 * @param {Function} callback Función que se ejecutará de forma atómica.
 * @param {number} timeoutMs Tiempo máximo de espera para obtener el bloqueo (ms).
 * @return {*} Resultado del callback.
 */
function withScriptLock(callback, timeoutMs) {
  var timeout = timeoutMs || 10000;
  var lock = LockService.getScriptLock();
  var hasLock = false;

  try {
    hasLock = lock.tryLock(timeout);
    if (!hasLock) {
      throw {
        isCustomError: true,
        errorCode: 'SERVER_BUSY',
        message: 'El servidor está procesando otra reservación simultánea. Por favor, reintenta en un momento.'
      };
    }
    return callback();
  } finally {
    if (hasLock) {
      try {
        lock.releaseLock();
      } catch (e) {
        Logger.log('Error al liberar lock: ' + e);
      }
    }
  }
}

/**
 * Genera un código de reservación aleatorio, no predecible y único.
 * Formato: CONESIEE-2026-XXXXXXXX (donde X es alfanumérico en mayúsculas).
 * @param {GoogleAppsScript.Spreadsheet.Sheet} reservacionesSheet
 * @return {string}
 */
function generateUniqueReservationCode(reservacionesSheet) {
  var chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Evita caracteres ambiguos (0/O, 1/I)
  var maxAttempts = 10;
  var existingCodes = [];

  if (reservacionesSheet.getLastRow() > 1) {
    var data = reservacionesSheet.getRange(2, 2, reservacionesSheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < data.length; i++) {
      existingCodes.push(String(data[i][0]));
    }
  }

  for (var attempt = 0; attempt < maxAttempts; attempt++) {
    var randomPart = '';
    for (var j = 0; j < 8; j++) {
      var randIndex = Math.floor(Math.random() * chars.length);
      randomPart += chars.charAt(randIndex);
    }
    var candidate = 'CONESIEE-2026-' + randomPart;
    if (existingCodes.indexOf(candidate) === -1) {
      return candidate;
    }
  }

  // Fallback con timestamp de alta resolución
  return 'CONESIEE-2026-' + Utilities.getUuid().substring(0, 8).toUpperCase();
}

/**
 * Verificador básico de límite de tasa (Rate Limiting) por identificador usando CacheService.
 * @param {string} identifier IP o token de sesión anonimizado.
 * @param {number} maxPerMinute Máximo de peticiones por minuto.
 * @return {boolean} true si está permitido, false si excede el límite.
 */
function checkRateLimit(identifier, maxPerMinute) {
  try {
    var cache = CacheService.getScriptCache();
    var key = 'rate_' + (identifier || 'global');
    var current = cache.get(key);
    var count = current ? parseInt(current, 10) : 0;
    
    if (count >= (maxPerMinute || 30)) {
      return false;
    }
    
    cache.put(key, String(count + 1), 60); // Expira en 60 segundos
    return true;
  } catch (e) {
    // Si la caché falla, no bloqueamos el servicio
    return true;
  }
}
