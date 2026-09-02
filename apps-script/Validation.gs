/**
 * Validation.gs - Validación y Normalización de Entradas en Backend
 * CONESIEE 2026 - Universidad de San Carlos de Guatemala
 */

/**
 * Valida y normaliza el payload recibido para una reservación.
 * @param {Object} payload Datos enviados desde el formulario web.
 * @return {Object} { isValid: boolean, errors: string[], sanitized: Object }
 */
function validateReservationPayload(payload) {
  var errors = [];
  var sanitized = {};

  if (!payload || typeof payload !== 'object') {
    return {
      isValid: false,
      errors: ['El cuerpo de la solicitud es inválido o está vacío.'],
      sanitized: null
    };
  }

  // 1. Verificación de Honeypot (Anti-bots)
  if (payload.website_hp && String(payload.website_hp).trim().length > 0) {
    return {
      isValid: false,
      errors: ['Solicitud rechazada por detección de actividad automatizada.'],
      sanitized: null
    };
  }

  // 2. Horario ID
  var horarioId = sanitizeString(payload.horario_id, 50);
  if (!horarioId || !/^SLOT-2026-\d{4}-\d{4}$/.test(horarioId)) {
    errors.push('El identificador del horario es inválido o no fue seleccionado.');
  } else {
    sanitized.horario_id = horarioId;
  }

  // 3. Nombre completo (3 a 120 caracteres)
  var nombre = sanitizeString(payload.nombre, 120);
  if (!nombre || nombre.length < 3) {
    errors.push('El nombre completo es obligatorio y debe tener al menos 3 caracteres.');
  } else {
    sanitized.nombre = nombre;
  }

  // 4. Empresa / Institución (2 a 150 caracteres)
  var institucion = sanitizeString(payload.institucion, 150);
  if (!institucion || institucion.length < 2) {
    errors.push('La institución, empresa o universidad es obligatoria.');
  } else {
    sanitized.institucion = institucion;
  }

  // 5. Correo electrónico
  var correo = sanitizeString(payload.correo, 100).toLowerCase();
  var emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!correo || !emailRegex.test(correo)) {
    errors.push('El correo electrónico no tiene un formato válido.');
  } else {
    sanitized.correo = correo;
  }

  // 6. Teléfono (7 a 25 caracteres, permite dígitos, espacios, guiones, signo +)
  var telefono = sanitizeString(payload.telefono, 25);
  var phoneRegex = /^[+]?[\d\s\-().]{7,25}$/;
  if (!telefono || !phoneRegex.test(telefono)) {
    errors.push('El número de teléfono es obligatorio y debe contener un número válido (mínimo 7 dígitos).');
  } else {
    sanitized.telefono = telefono;
  }

  // 7. Título de la conferencia (5 a 200 caracteres)
  var titulo = sanitizeString(payload.titulo, 200);
  if (!titulo || titulo.length < 5) {
    errors.push('El título de la conferencia es obligatorio (mínimo 5 caracteres).');
  } else {
    sanitized.titulo = titulo;
  }

  // 8. Descripción / Resumen (10 a 1500 caracteres)
  var descripcion = sanitizeString(payload.descripcion, 1500);
  if (!descripcion || descripcion.length < 10) {
    errors.push('La descripción o resumen de la ponencia es obligatoria (mínimo 10 caracteres).');
  } else {
    sanitized.descripcion = descripcion;
  }

  // 9. Modalidad de participación
  var modalidadesPermitidas = ['individual', 'panel_2voces', 'bloque_dividido'];
  var modalidad = sanitizeString(payload.modalidad, 30);
  if (!modalidad || modalidadesPermitidas.indexOf(modalidad) === -1) {
    errors.push('La modalidad seleccionada no es válida.');
  } else {
    sanitized.modalidad = modalidad;
  }

  // 9.1 Formato de exposición (Presencial o Virtual)
  var formato = sanitizeString(payload.formato, 20).toLowerCase();
  if (formato === 'virtual') {
    sanitized.formato = 'Virtual';
  } else {
    sanitized.formato = 'Presencial';
  }

  // 10. Requerimientos técnicos (opcional, máximo 500 caracteres)
  var requerimientos = sanitizeString(payload.requerimientos || '', 500);
  sanitized.requerimientos = requerimientos;

  // 11. Consentimiento de tratamiento de datos (Obligatorio)
  var aceptaTratamiento = payload.acepta_tratamiento === true || payload.acepta_tratamiento === 'true' || payload.acepta_tratamiento === 'SÍ';
  if (!aceptaTratamiento) {
    errors.push('Debe aceptar los términos de tratamiento de datos para continuar.');
  } else {
    sanitized.acepta_tratamiento = true;
  }

  // 12. Consentimiento de publicación pública (Opcional pero booleano explícito)
  var aceptaPublicacion = payload.acepta_publicacion === true || payload.acepta_publicacion === 'true' || payload.acepta_publicacion === 'SÍ';
  sanitized.acepta_publicacion = aceptaPublicacion;

  return {
    isValid: errors.length === 0,
    errors: errors,
    sanitized: errors.length === 0 ? sanitized : null
  };
}
