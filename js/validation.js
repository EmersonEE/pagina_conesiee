/**
 * validation.js - Validación en Cliente y Sanitización
 * CONESIEE 2026 - Universidad de San Carlos de Guatemala
 */

const FormValidator = (() => {
  /**
   * Escapa caracteres especiales de HTML para evitar XSS en el renderizado de la UI.
   * @param {string} str
   * @return {string}
   */
  const escapeHTML = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  /**
   * Expresión regular para validación de formato de correo electrónico.
   */
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

  /**
   * Expresión regular para número de teléfono (nacional e internacional).
   */
  const PHONE_REGEX = /^[+]?[\d\s\-().]{7,25}$/;

  /**
   * Reglas de validación individuales por campo.
   */
  const rules = {
    horario_id: (val) => {
      if (!val || !val.trim()) return 'Debe seleccionar un horario disponible.';
      if (!/^SLOT-2026-\d{4}-\d{4}$/.test(val.trim())) return 'Identificador de horario no válido.';
      return null;
    },
    nombre: (val) => {
      const v = (val || '').trim();
      if (!v) return 'El nombre completo es obligatorio.';
      if (v.length < 3) return 'El nombre debe tener al menos 3 caracteres.';
      if (v.length > 120) return 'El nombre no puede exceder los 120 caracteres.';
      return null;
    },
    institucion: (val) => {
      const v = (val || '').trim();
      if (!v) return 'La institución, empresa o universidad es obligatoria.';
      if (v.length < 2) return 'Debe tener al menos 2 caracteres.';
      if (v.length > 150) return 'No puede exceder los 150 caracteres.';
      return null;
    },
    correo: (val) => {
      const v = (val || '').trim();
      if (!v) return 'El correo electrónico es obligatorio.';
      if (!EMAIL_REGEX.test(v)) return 'Ingrese un correo electrónico válido (ej. usuario@dominio.com).';
      if (v.length > 100) return 'El correo no puede exceder 100 caracteres.';
      return null;
    },
    telefono: (val) => {
      const v = (val || '').trim();
      if (!v) return 'El número de teléfono es obligatorio.';
      if (!PHONE_REGEX.test(v)) return 'Ingrese un número telefónico válido (ej. +502 5555-5555).';
      return null;
    },
    titulo: (val) => {
      const v = (val || '').trim();
      if (!v) return 'El título de la conferencia es obligatorio.';
      if (v.length < 5) return 'El título debe tener al minímo 5 caracteres.';
      if (v.length > 200) return 'El título no puede exceder los 200 caracteres.';
      return null;
    },
    descripcion: (val) => {
      const v = (val || '').trim();
      if (!v) return 'El resumen de la ponencia es obligatorio.';
      if (v.length < 10) return 'El resumen debe tener al menos 10 caracteres.';
      if (v.length > 1500) return 'El resumen no puede exceder los 1500 caracteres.';
      return null;
    },
    modalidad: (val) => {
      const valid = ['individual', 'panel_2voces', 'bloque_dividido'];
      if (!val || valid.indexOf(val) === -1) return 'Seleccione una modalidad de participación válida.';
      return null;
    },
    requerimientos: (val) => {
      const v = (val || '').trim();
      if (v.length > 500) return 'Los requerimientos técnicos no pueden exceder 500 caracteres.';
      return null;
    },
    acepta_tratamiento: (checked) => {
      if (!checked) return 'Debe aceptar los términos de tratamiento de datos para poder reservar.';
      return null;
    },
    website_hp: (val) => {
      if (val && val.trim().length > 0) return 'Actividad sospechosa detectada.';
      return null;
    }
  };

  /**
   * Valida un único campo y retorna el mensaje de error o null.
   * @param {string} fieldName
   * @param {*} value
   * @return {string|null}
   */
  const validateField = (fieldName, value) => {
    if (rules[fieldName]) {
      return rules[fieldName](value);
    }
    return null;
  };

  /**
   * Valida un objeto completo de datos de formulario.
   * @param {FormData|Object} formData
   * @return {{isValid: boolean, errors: Object, values: Object}}
   */
  const validateForm = (formData) => {
    const raw = (formData instanceof FormData) 
      ? Object.fromEntries(formData.entries())
      : formData;

    const errors = {};
    const values = {
      horario_id: (raw.horario_id || '').trim(),
      nombre: (raw.nombre || '').trim(),
      institucion: (raw.institucion || '').trim(),
      correo: (raw.correo || '').trim().toLowerCase(),
      telefono: (raw.telefono || '').trim(),
      titulo: (raw.titulo || '').trim(),
      descripcion: (raw.descripcion || '').trim(),
      modalidad: raw.modalidad || 'individual',
      requerimientos: (raw.requerimientos || '').trim(),
      acepta_tratamiento: raw.acepta_tratamiento === 'on' || raw.acepta_tratamiento === true || raw.acepta_tratamiento === 'true',
      acepta_publicacion: raw.acepta_publicacion === 'on' || raw.acepta_publicacion === true || raw.acepta_publicacion === 'true',
      website_hp: raw.website_hp || ''
    };

    // Validar cada campo
    for (const [field, ruleFn] of Object.entries(rules)) {
      let valToTest;
      if (field === 'acepta_tratamiento') {
        valToTest = values.acepta_tratamiento;
      } else {
        valToTest = values[field];
      }

      const errorMsg = ruleFn(valToTest);
      if (errorMsg) {
        errors[field] = errorMsg;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors: errors,
      values: values
    };
  };

  return {
    escapeHTML,
    validateField,
    validateForm
  };
})();
