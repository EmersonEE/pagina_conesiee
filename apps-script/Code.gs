/**
 * Code.gs - Enrutador Principal HTTP (doGet / doPost)
 * CONESIEE 2026 - XXV Congreso Nacional de Estudiantes de Ingeniería Mecánica Eléctrica, Eléctrica y Electrónica
 * Escuela de Ingeniería Mecánica Eléctrica - Universidad de San Carlos de Guatemala
 */

/**
 * Enrutador de solicitudes HTTP GET.
 * Acciones soportadas: listSlots, getSlot, getPublicSchedule, getConfig, ping
 * @param {Object} e Evento de Apps Script
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var action = params.action || 'listSlots';

    switch (action) {
      case 'listSlots':
        var slotsData = apiListSlots();
        return jsonSuccess(slotsData, 'Horarios consultados exitosamente');

      case 'getSlot':
        var slotData = apiGetSlot(params.id);
        return jsonSuccess(slotData, 'Horario consultado exitosamente');

      case 'getPublicSchedule':
        var scheduleData = apiListSlots();
        return jsonSuccess(scheduleData, 'Agenda pública consultada exitosamente');

      case 'getConfig':
        var configData = apiGetConfig();
        return jsonSuccess(configData, 'Configuración obtenida exitosamente');

      case 'ping':
        return jsonSuccess({ status: 'online', server_time: new Date().toISOString() }, 'API activa');

      default:
        return jsonError('Acción GET no reconocida o no soportada.', 'INVALID_ACTION');
    }
  } catch (error) {
    Logger.log('Error en doGet: ' + (error.stack || error.message || JSON.stringify(error)));
    if (error.isCustomError) {
      return jsonError(error.message, error.errorCode);
    }
    return jsonError('Ocurrió un error interno al procesar la solicitud.', 'SERVER_ERROR');
  }
}

/**
 * Enrutador de solicitudes HTTP POST.
 * Recibe payloads JSON (enviados como text/plain para evitar problemas de CORS preflight).
 * Acciones soportadas: reserveSlot
 * @param {Object} e Evento de Apps Script
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function doPost(e) {
  try {
    var payload = {};

    // 1. Decodificar cuerpo de la solicitud (JSON plano o parámetros urlencoded)
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        return jsonError('El formato de datos enviado no es un JSON válido.', 'INVALID_JSON');
      }
    } else if (e && e.parameter) {
      payload = e.parameter;
    } else {
      return jsonError('Cuerpo de solicitud vacío.', 'EMPTY_BODY');
    }

    var action = (e && e.parameter && e.parameter.action) || payload.action || 'reserveSlot';

    switch (action) {
      case 'reserveSlot':
        var result = apiReserveSlot(payload);
        return jsonSuccess(result, '¡Reservación confirmada exitosamente!');

      default:
        return jsonError('Acción POST no reconocida o no soportada.', 'INVALID_ACTION');
    }
  } catch (error) {
    Logger.log('Error en doPost: ' + (error.stack || error.message || JSON.stringify(error)));
    if (error.isCustomError) {
      return jsonError(error.message, error.errorCode);
    }
    return jsonError('Error interno al registrar la reservación. Por favor, reintenta.', 'SERVER_ERROR');
  }
}

/**
 * Genera una respuesta estándar de éxito en JSON.
 * @param {*} data
 * @param {string} message
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function jsonSuccess(data, message) {
  var output = {
    success: true,
    message: message || 'Operación exitosa',
    data: data || {},
    errorCode: null
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Genera una respuesta estándar de error en JSON.
 * @param {string} message
 * @param {string} errorCode
 * @param {*} data
 * @return {GoogleAppsScript.Content.TextOutput}
 */
function jsonError(message, errorCode, data) {
  var output = {
    success: false,
    message: message || 'Ocurrió un error inesperado',
    data: data || null,
    errorCode: errorCode || 'UNKNOWN_ERROR'
  };
  return ContentService.createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
