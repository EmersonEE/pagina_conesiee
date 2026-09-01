/**
 * config.js - Configuración Centralizada de la Aplicación Web
 * CONESIEE 2026 - Universidad de San Carlos de Guatemala
 */

const APP_CONFIG = {
  // =========================================================================
  // MARCADOR OBLIGATORIO: Pega aquí la URL de la Web App desplegada en Apps Script
  // Ejemplo: "https://script.google.com/macros/s/AKfycbx.../exec"
  // =========================================================================
  API_URL: 'https://script.google.com/macros/s/AKfycbzVdFj71n5WzMdxHnnsWR7LeZR74LLwJQ9_E1kUhCxshpbyZDYF_WNtKlJ4gNb0SgE/exec',

  // Intervalo de sondeo automático en milisegundos (20 segundos)
  POLLING_INTERVAL_MS: 20000,

  // Datos del Evento
  EVENT_NAME: 'CONESIEE 2026',
  EVENT_FULL_NAME: 'XXV Congreso Nacional de Estudiantes de Ingeniería Mecánica Eléctrica, Eléctrica y Electrónica',
  EVENT_DATES: '28 de septiembre al 2 de octubre de 2026',
  INSTITUTION: 'Escuela de Ingeniería Mecánica Eléctrica (EIME), Universidad de San Carlos de Guatemala (USAC)',
  VENUE_DEFAULT: 'Auditorio Central EIME / Híbrido',
  TIMEZONE: 'America/Guatemala',

  // =========================================================================
  // MARCADOR: Correo de contacto del comité organizador
  // =========================================================================
  COMMITTEE_EMAIL: '[INDICAR_CORREO_DEL_COMITE]',

  // Rutas de Identidad Visual
  LOGO_OFFICIAL: 'assets/logo/conesiee-2026.png',
  LOGO_FALLBACK: 'assets/logo/conesiee-logo.svg',

  // Modalidades de participación
  MODALITIES: {
    individual: {
      id: 'individual',
      name: 'Conferencia individual',
      description: 'Una persona utiliza el espacio completo de 1 hora.'
    },
    panel_2voces: {
      id: 'panel_2voces',
      name: 'Panel a dos voces',
      description: 'Dos conferencistas comparten el espacio de 1 hora con una ponencia conjunta.'
    },
    bloque_dividido: {
      id: 'bloque_dividido',
      name: 'Bloque dividido',
      description: 'Dos conferencistas exponen temas complementarios de 30 minutos cada uno.'
    }
  },

  // Estados permitidos
  STATUSES: {
    Disponible: {
      key: 'Disponible',
      label: 'Disponible',
      badgeClass: 'status-badge--available',
      canBook: true
    },
    Reservado: {
      key: 'Reservado',
      label: 'Reservado',
      badgeClass: 'status-badge--reserved',
      canBook: false
    },
    Bloqueado: {
      key: 'Bloqueado',
      label: 'Bloqueado',
      badgeClass: 'status-badge--blocked',
      canBook: false
    },
    Cancelado: {
      key: 'Cancelado',
      label: 'Cancelado',
      badgeClass: 'status-badge--cancelled',
      canBook: false
    }
  },

  // Códigos de error traducidos para el usuario
  ERROR_MESSAGES: {
    SLOT_NOT_AVAILABLE: 'El horario seleccionado acaba de ser reservado por otro usuario. Por favor, selecciona otro horario.',
    SLOT_NOT_FOUND: 'El horario solicitado no existe o fue retirado del sistema.',
    RESERVATIONS_DISABLED: 'El sistema de reservaciones se encuentra temporalmente cerrado por el comité.',
    RATE_LIMITED: 'Has alcanzado el límite de intentos permitidos. Por favor, espera un minuto antes de reintentar.',
    SERVER_BUSY: 'El servidor está procesando otra solicitud concurrente. Intenta enviar nuevamente.',
    VALIDATION_ERROR: 'Por favor, revisa los datos ingresados en el formulario.',
    NETWORK_ERROR: 'No fue posible comunicarse con el servidor. Verifica tu conexión a internet.',
    SERVER_ERROR: 'Ocurrió un error en el servidor. Por favor, inténtalo de nuevo en unos momentos.'
  }
};

// Congelar configuración para prevenir modificaciones accidentales
if (typeof Object.freeze === 'function') {
  Object.freeze(APP_CONFIG);
  Object.freeze(APP_CONFIG.MODALITIES);
  Object.freeze(APP_CONFIG.STATUSES);
  Object.freeze(APP_CONFIG.ERROR_MESSAGES);
}
