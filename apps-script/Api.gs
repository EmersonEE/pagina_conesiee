/**
 * Api.gs - Controladores de Negocio y Endpoints del Backend
 * CONESIEE 2026 - Universidad de San Carlos de Guatemala
 */

/**
 * Lee el mapa de configuración desde la hoja 'Configuracion'.
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss
 * @return {Object}
 */
function getConfigMap(ss) {
  var sheet = ss.getSheetByName('Configuracion');
  var config = {
    NOMBRE_EVENTO: 'CONESIEE 2026',
    ZONA_HORARIA: 'America/Guatemala',
    CORREO_COMITE: 'congresoconesieeusa@ingenieria.usac.edu.gt',
    RESERVACIONES_ACTIVAS: 'true',
    INTERVALO_ACTUALIZACION_SEG: '20',
    TEXTO_PRIVACIDAD: '',
    ENLACE_INSTITUCIONAL: 'https://linktr.ee/congresoconesieeusac'
  };

  if (!sheet || sheet.getLastRow() < 2) {
    return config;
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    var val = String(data[i][1]).trim();
    if (key) {
      config[key] = val;
    }
  }
  return config;
}

/**
 * Devuelve la configuración pública segura para el frontend.
 * @return {Object}
 */
function apiGetConfig() {
  var ss = getSpreadsheet();
  var config = getConfigMap(ss);

  return {
    nombre_evento: config.NOMBRE_EVENTO,
    zona_horaria: config.ZONA_HORARIA,
    correo_comite: config.CORREO_COMITE,
    reservaciones_activas: config.RESERVACIONES_ACTIVAS === 'true' || config.RESERVACIONES_ACTIVAS === true,
    intervalo_actualizacion_seg: parseInt(config.INTERVALO_ACTUALIZACION_SEG, 10) || 20,
    enlace_institucional: config.ENLACE_INSTITUCIONAL
  };
}

/**
 * Consulta la lista de horarios disponibles y ocupados con solo campos públicos.
 * @return {Object}
 */
function apiListSlots() {
  var ss = getSpreadsheet();
  var config = getConfigMap(ss);
  var sheetHorarios = ss.getSheetByName('Horarios');
  var sheetReservaciones = ss.getSheetByName('Reservaciones');

  if (!sheetHorarios || sheetHorarios.getLastRow() < 2) {
    return {
      evento: apiGetConfig(),
      horarios: [],
      total: 0,
      disponibles: 0,
      timestamp: new Date().toISOString()
    };
  }

  // Mapa de reservaciones públicas autorizadas
  var publicReservationsMap = {};
  if (sheetReservaciones && sheetReservaciones.getLastRow() > 1) {
    var resData = sheetReservaciones.getRange(2, 1, sheetReservaciones.getLastRow() - 1, 15).getValues();
    for (var r = 0; r < resData.length; r++) {
      var resId = String(resData[r][0]);
      var nombre = String(resData[r][4]);
      var institucion = String(resData[r][5]);
      var titulo = String(resData[r][8]);
      var aceptaPub = resData[r][13] === true || resData[r][13] === 'true' || resData[r][13] === 'SÍ';
      var resEstado = String(resData[r][14]);

      if (resEstado !== 'Cancelada') {
        publicReservationsMap[resId] = {
          publico: aceptaPub,
          nombre_expositor: aceptaPub ? nombre : null,
          institucion: aceptaPub ? institucion : null,
          titulo_conferencia: aceptaPub ? titulo : null
        };
      }
    }
  }

  var data = sheetHorarios.getRange(2, 1, sheetHorarios.getLastRow() - 1, 8).getValues();
  var slots = [];
  var countDisponibles = 0;

  for (var i = 0; i < data.length; i++) {
    var id = String(data[i][0]);
    var rawFecha = data[i][1];
    var fechaStr = rawFecha instanceof Date 
      ? Utilities.formatDate(rawFecha, config.ZONA_HORARIA || 'America/Guatemala', 'yyyy-MM-dd')
      : String(rawFecha);

    var horaInicio = formatCleanTimeAppScript(data[i][2], config.ZONA_HORARIA);
    var horaFin = formatCleanTimeAppScript(data[i][3], config.ZONA_HORARIA);
    var sede = String(data[i][4] || '').trim() || 'Biblioteca Central USAC';
    var estado = String(data[i][5]);
    var resId = String(data[i][6]);

    if (estado === 'Disponible') {
      countDisponibles++;
    }

    var resInfo = (estado === 'Reservado' && resId && publicReservationsMap[resId]) 
      ? publicReservationsMap[resId] 
      : null;

    // Estricta proyección de atributos públicos (SIN correos, teléfonos ni IDs internos)
    slots.push({
      id: id,
      fecha: fechaStr,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      sede: sede,
      estado: estado,
      conferencia_publica: (resInfo && resInfo.publico) ? {
        nombre_expositor: resInfo.nombre_expositor,
        institucion: resInfo.institucion,
        titulo: resInfo.titulo_conferencia
      } : null
    });
  }

  return {
    evento: apiGetConfig(),
    horarios: slots,
    total: slots.length,
    disponibles: countDisponibles,
    timestamp: new Date().toISOString()
  };
}

/**
 * Consulta el estado y detalle público de un horario específico.
 * @param {string} slotId
 * @return {Object}
 */
function apiGetSlot(slotId) {
  if (!slotId) {
    throw {
      isCustomError: true,
      errorCode: 'INVALID_REQUEST',
      message: 'Debe especificar el parámetro id del horario.'
    };
  }

  var list = apiListSlots();
  for (var i = 0; i < list.horarios.length; i++) {
    if (list.horarios[i].id === slotId) {
      return list.horarios[i];
    }
  }

  throw {
    isCustomError: true,
    errorCode: 'SLOT_NOT_FOUND',
    message: 'El horario solicitado no existe.'
  };
}

/**
 * Evalúa si un horario está en condiciones de ser reservado.
 * Encapsulado para facilitar futuras ampliaciones (v2) a paneles compartidos o bloques divididos.
 * @param {string} estadoActual Estado del horario en la hoja.
 * @param {string} modalidad Modalidad solicitada.
 * @return {boolean}
 */
function isSlotAvailableForBooking(estadoActual, modalidad) {
  // En v1: solo los horarios con estado 'Disponible' pueden ser reservados.
  return estadoActual === 'Disponible';
}

/**
 * Registra una reservación de forma atómica y concurrente segura.
 * @param {Object} payload
 * @return {Object}
 */
function apiReserveSlot(payload) {
  // 1. Validación estricta de datos recibidos
  var validation = validateReservationPayload(payload);
  if (!validation.isValid) {
    throw {
      isCustomError: true,
      errorCode: 'VALIDATION_ERROR',
      message: validation.errors.join(' ')
    };
  }

  var data = validation.sanitized;

  // 2. Ejecución bajo LockService para evitar condiciones de carrera (Race Conditions)
  return withScriptLock(function() {
    var ss = getSpreadsheet();
    var config = getConfigMap(ss);

    // 2.1 Verificar si las reservaciones están activas
    if (config.RESERVACIONES_ACTIVAS !== 'true' && config.RESERVACIONES_ACTIVAS !== true) {
      throw {
        isCustomError: true,
        errorCode: 'RESERVATIONS_DISABLED',
        message: 'El sistema de reservaciones se encuentra temporalmente desactivado por el comité organizador.'
      };
    }

    var sheetHorarios = ss.getSheetByName('Horarios');
    var sheetReservaciones = ss.getSheetByName('Reservaciones');

    if (!sheetHorarios || sheetHorarios.getLastRow() < 2) {
      throw {
        isCustomError: true,
        errorCode: 'SERVER_ERROR',
        message: 'La estructura de horarios no está disponible.'
      };
    }

    // 2.2 Buscar el horario y verificar su estado en caliente
    var horariosData = sheetHorarios.getRange(2, 1, sheetHorarios.getLastRow() - 1, 8).getValues();
    var targetRowIndex = -1;
    var slotRecord = null;

    for (var i = 0; i < horariosData.length; i++) {
      if (String(horariosData[i][0]) === data.horario_id) {
        targetRowIndex = i + 2; // +2 por índice 1-based y fila de encabezados
        slotRecord = {
          id: String(horariosData[i][0]),
          fecha: horariosData[i][1],
          hora_inicio: String(horariosData[i][2]),
          hora_fin: String(horariosData[i][3]),
          sede: String(horariosData[i][4]),
          estado: String(horariosData[i][5])
        };
        break;
      }
    }

    if (targetRowIndex === -1 || !slotRecord) {
      throw {
        isCustomError: true,
        errorCode: 'SLOT_NOT_FOUND',
        message: 'El horario seleccionado no existe en el sistema.'
      };
    }

    // 2.3 Re-verificar disponibilidad en caliente bajo el bloqueo
    if (!isSlotAvailableForBooking(slotRecord.estado, data.modalidad)) {
      throw {
        isCustomError: true,
        errorCode: 'SLOT_NOT_AVAILABLE',
        message: 'El horario seleccionado ya no se encuentra disponible. Por favor, selecciona otro horario.'
      };
    }

    // 2.4 Generar identificadores únicos y seguros
    var reservacionId = 'RES-' + new Date().getTime();
    var codigoReservacion = generateUniqueReservationCode(sheetReservaciones);
    var timestampGuatemala = Utilities.formatDate(new Date(), config.ZONA_HORARIA || 'America/Guatemala', "yyyy-MM-dd'T'HH:mm:ssXXX");

    // 2.5 Guardar registro en la hoja 'Reservaciones' con sanitización anti-fórmulas
    var newReservationRow = [
      reservacionId,
      codigoReservacion,
      data.horario_id,
      timestampGuatemala,
      sanitizeForSheet(data.nombre),
      sanitizeForSheet(data.institucion),
      sanitizeForSheet(data.correo),
      sanitizeForSheet(data.telefono),
      sanitizeForSheet(data.titulo),
      sanitizeForSheet(data.descripcion),
      data.modalidad,
      sanitizeForSheet(data.requerimientos),
      data.acepta_tratamiento ? 'SÍ' : 'NO',
      data.acepta_publicacion ? 'SÍ' : 'NO',
      'Confirmada'
    ];

    sheetReservaciones.appendRow(newReservationRow);

    // 2.6 Actualizar el estado del horario a 'Reservado'
    sheetHorarios.getRange(targetRowIndex, 6).setValue('Reservado'); // Columna 'estado'
    sheetHorarios.getRange(targetRowIndex, 7).setValue(reservacionId); // Columna 'reservacion_id'
    sheetHorarios.getRange(targetRowIndex, 8).setValue(new Date().toISOString()); // Columna 'ultima_actualizacion'

    // 2.7 Forzar la escritura inmediata en la hoja antes de liberar el bloqueo
    SpreadsheetApp.flush();

    var fechaStr = slotRecord.fecha instanceof Date
      ? Utilities.formatDate(slotRecord.fecha, config.ZONA_HORARIA || 'America/Guatemala', 'yyyy-MM-dd')
      : String(slotRecord.fecha);

    return {
      codigo_reservacion: codigoReservacion,
      horario_id: data.horario_id,
      fecha: fechaStr,
      hora_inicio: formatCleanTimeAppScript(slotRecord.hora_inicio, config.ZONA_HORARIA),
      hora_fin: formatCleanTimeAppScript(slotRecord.hora_fin, config.ZONA_HORARIA),
      sede: slotRecord.sede || 'Biblioteca Central USAC',
      nombre_expositor: data.nombre,
      titulo_conferencia: data.titulo,
      modalidad: data.modalidad,
      fecha_registro: timestampGuatemala
    };
  }, 10000); // 10 segundos de espera de lock
}

/**
 * Formatea limpiamente valores de hora a HH:mm en Apps Script
 * independientemente de si provienen como Date o texto.
 */
function formatCleanTimeAppScript(val, timezone) {
  if (!val) return '';
  if (val instanceof Date) {
    return Utilities.formatDate(val, timezone || 'America/Guatemala', 'HH:mm');
  }
  var str = String(val).trim();
  var match = str.match(/(?:T|\b)([01]?\d|2[0-3]):([0-5]\d)/);
  if (match) {
    return (match[1].length === 1 ? '0' + match[1] : match[1]) + ':' + match[2];
  }
  return str;
}

