/**
 * Setup.gs - Instalación e Inicialización Idempotente del Sistema
 * CONESIEE 2026 - Universidad de San Carlos de Guatemala
 */

// Marcador: si el script no está vinculado directamente a la hoja, coloca aquí el ID de la hoja de cálculo.
// Si el script se creó desde Extensiones > Apps Script dentro de la hoja, déjalo vacío o usa el ID.
var SPREADSHEET_ID = '[PEGAR_ID_DE_GOOGLE_SHEET]';

/**
 * Obtiene la instancia de la hoja de cálculo activa o referenciada.
 * @return {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  if (SPREADSHEET_ID && SPREADSHEET_ID !== '[PEGAR_ID_DE_GOOGLE_SHEET]' && SPREADSHEET_ID.trim() !== '') {
    return SpreadsheetApp.openById(SPREADSHEET_ID.trim());
  }
  var active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) {
    return active;
  }
  throw new Error('No se pudo acceder a la hoja de cálculo. Proporciona un SPREADSHEET_ID válido en Setup.gs');
}

/**
 * Función principal de instalación. Crea las hojas, encabezados, configuración
 * y los horarios iniciales del CONESIEE 2026 si aún no existen.
 * Es completamente segura de ejecutar múltiples veces sin duplicar datos.
 */
function inicializarSistema() {
  var ss = getSpreadsheet();
  Logger.log('Iniciando configuración en: ' + ss.getName());

  var sheetHorarios = setupSheetHorarios(ss);
  var sheetReservaciones = setupSheetReservaciones(ss);
  var sheetConfig = setupSheetConfiguracion(ss);

  // Eliminar la "Hoja 1" o "Sheet1" por defecto si está vacía y existen nuestras hojas
  try {
    var defaultSheet = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1');
    if (defaultSheet && ss.getSheets().length > 3 && defaultSheet.getLastRow() === 0) {
      ss.deleteSheet(defaultSheet);
    }
  } catch (e) {
    Logger.log('Nota sobre hoja por defecto: ' + e.message);
  }

  Logger.log('¡Instalación e inicialización del CONESIEE 2026 completada con éxito!');
  return 'Sistema inicializado correctamente para CONESIEE 2026.';
}

/**
 * Configura la hoja 'Horarios' con estructura, estilos y datos iniciales.
 */
function setupSheetHorarios(ss) {
  var sheetName = 'Horarios';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  var headers = [
    'id',
    'fecha',
    'hora_inicio',
    'hora_fin',
    'sede',
    'estado',
    'reservacion_id',
    'ultima_actualizacion'
  ];

  if (sheet.getLastRow() === 0) {
    // Insertar encabezados
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#0B192C');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    // Horarios Oficiales CONESIEE 2026 (Zona Horaria America/Guatemala)
    var initialSlots = [
      // Lunes 28 de septiembre 2026
      ['SLOT-2026-0928-1400', '2026-09-28', '14:00', '15:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],
      ['SLOT-2026-0928-1600', '2026-09-28', '16:00', '17:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],
      ['SLOT-2026-0928-1700', '2026-09-28', '17:00', '18:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],

      // Martes 29 de septiembre 2026
      ['SLOT-2026-0929-1400', '2026-09-29', '14:00', '15:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],
      ['SLOT-2026-0929-1600', '2026-09-29', '16:00', '17:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],
      ['SLOT-2026-0929-1700', '2026-09-29', '17:00', '18:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],

      // Miércoles 30 de septiembre 2026
      ['SLOT-2026-0930-1400', '2026-09-30', '14:00', '15:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],
      ['SLOT-2026-0930-1600', '2026-09-30', '16:00', '17:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],
      ['SLOT-2026-0930-1700', '2026-09-30', '17:00', '18:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],

      // Jueves 1 de octubre 2026
      ['SLOT-2026-1001-0900', '2026-10-01', '09:00', '10:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],
      ['SLOT-2026-1001-1100', '2026-10-01', '11:00', '12:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()],
      ['SLOT-2026-1001-1200', '2026-10-01', '12:00', '13:00', 'Auditorio Central EIME / Híbrido', 'Disponible', '', new Date().toISOString()]
    ];

    sheet.getRange(2, 1, initialSlots.length, headers.length).setValues(initialSlots);
    sheet.autoResizeColumns(1, headers.length);
    Logger.log('Hoja Horarios inicializada con 12 espacios oficiales.');
  }

  return sheet;
}

/**
 * Configura la hoja 'Reservaciones' con encabezados y formato.
 */
function setupSheetReservaciones(ss) {
  var sheetName = 'Reservaciones';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  var headers = [
    'reservacion_id',
    'codigo_reservacion',
    'horario_id',
    'fecha_registro',
    'nombre',
    'institucion',
    'correo',
    'telefono',
    'titulo',
    'descripcion',
    'modalidad',
    'requerimientos',
    'acepta_tratamiento',
    'acepta_publicacion',
    'estado'
  ];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#1E3E62');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
    Logger.log('Hoja Reservaciones inicializada.');
  }

  return sheet;
}

/**
 * Configura la hoja 'Configuracion' con parámetros operativos del evento.
 */
function setupSheetConfiguracion(ss) {
  var sheetName = 'Configuracion';
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  var headers = ['clave', 'valor', 'descripcion'];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#F1C40F');
    headerRange.setFontColor('#0B192C');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);

    var initialConfig = [
      ['NOMBRE_EVENTO', 'XXV Congreso Nacional de Estudiantes de Ingeniería Mecánica Eléctrica, Eléctrica y Electrónica - CONESIEE 2026', 'Nombre oficial del congreso'],
      ['ZONA_HORARIA', 'America/Guatemala', 'Zona horaria para visualización y validaciones'],
      ['CORREO_COMITE', '[INDICAR_CORREO_DEL_COMITE]', 'Correo oficial para dudas de expositores'],
      ['RESERVACIONES_ACTIVAS', 'true', 'Control maestro para aceptar nuevas reservaciones (true/false)'],
      ['INTERVALO_ACTUALIZACION_SEG', '20', 'Intervalo sugerido en segundos para polling del frontend'],
      ['TEXTO_PRIVACIDAD', 'Los datos personales recabados serán utilizados exclusivamente para la gestión logística y académica del CONESIEE 2026 por la Escuela de Ingeniería Mecánica Eléctrica de la USAC.', 'Aviso de protección de datos'],
      ['ENLACE_INSTITUCIONAL', 'https://eime.usac.edu.gt', 'Enlace al portal oficial de la Escuela EIME USAC']
    ];

    sheet.getRange(2, 1, initialConfig.length, headers.length).setValues(initialConfig);
    sheet.autoResizeColumns(1, headers.length);
    Logger.log('Hoja Configuracion inicializada con parámetros predeterminados.');
  }

  return sheet;
}
