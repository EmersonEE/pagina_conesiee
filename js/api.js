/**
 * api.js - Cliente HTTP para la API de Google Apps Script
 * CONESIEE 2026 - Universidad de San Carlos de Guatemala
 */

const ApiService = (() => {
  /**
   * Verifica si la URL de Apps Script ha sido configurada o sigue con el marcador.
   * @return {boolean}
   */
  const isConfigured = () => {
    return Boolean(
      APP_CONFIG.API_URL &&
      APP_CONFIG.API_URL !== '[PEGAR_URL_DE_APPS_SCRIPT]' &&
      APP_CONFIG.API_URL.startsWith('https://script.google.com')
    );
  };

  /**
   * Datos de demostración locales cuando aún no se ha desplegado Apps Script.
   * Permite previsualizar la interfaz y probar el diseño inmediatamente.
   */
  const getMockData = () => {
    return {
      evento: {
        nombre_evento: APP_CONFIG.EVENT_FULL_NAME,
        zona_horaria: APP_CONFIG.TIMEZONE,
        correo_comite: APP_CONFIG.COMMITTEE_EMAIL,
        reservaciones_activas: true,
        intervalo_actualizacion_seg: 20
      },
      horarios: [
        { id: 'SLOT-2026-0928-1400', fecha: '2026-09-28', hora_inicio: '14:00', hora_fin: '15:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null },
        { id: 'SLOT-2026-0928-1600', fecha: '2026-09-28', hora_inicio: '16:00', hora_fin: '17:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null },
        { id: 'SLOT-2026-0928-1700', fecha: '2026-09-28', hora_inicio: '17:00', hora_fin: '18:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Reservado', conferencia_publica: { nombre_expositor: 'Ing. Carlos Mendoza', institucion: 'IEEE Guatemala', titulo: 'Transición Energética y Redes Inteligentes en Centroamérica' } },
        { id: 'SLOT-2026-0929-1400', fecha: '2026-09-29', hora_inicio: '14:00', hora_fin: '15:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null },
        { id: 'SLOT-2026-0929-1600', fecha: '2026-09-29', hora_inicio: '16:00', hora_fin: '17:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Bloqueado', conferencia_publica: null },
        { id: 'SLOT-2026-0929-1700', fecha: '2026-09-29', hora_inicio: '17:00', hora_fin: '18:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null },
        { id: 'SLOT-2026-0930-1400', fecha: '2026-09-30', hora_inicio: '14:00', hora_fin: '15:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null },
        { id: 'SLOT-2026-0930-1600', fecha: '2026-09-30', hora_inicio: '16:00', hora_fin: '17:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null },
        { id: 'SLOT-2026-0930-1700', fecha: '2026-09-30', hora_inicio: '17:00', hora_fin: '18:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null },
        { id: 'SLOT-2026-1001-0900', fecha: '2026-10-01', hora_inicio: '09:00', hora_fin: '10:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null },
        { id: 'SLOT-2026-1001-1100', fecha: '2026-10-01', hora_inicio: '11:00', hora_fin: '12:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null },
        { id: 'SLOT-2026-1001-1200', fecha: '2026-10-01', hora_inicio: '12:00', hora_fin: '13:00', sede: 'Auditorio Central EIME / Híbrido', estado: 'Disponible', conferencia_publica: null }
      ],
      total: 12,
      disponibles: 10,
      timestamp: new Date().toISOString(),
      isDemoMode: true
    };
  };

  /**
   * Realiza una petición GET con soporte para timeout y manejo de errores.
   * @param {string} action
   * @param {Object} queryParams
   * @return {Promise<Object>}
   */
  const get = async (action, queryParams = {}) => {
    if (!isConfigured()) {
      console.warn('[CONESIEE 2026] Modo Demostración local: Configure APP_CONFIG.API_URL en js/config.js con su URL de Apps Script.');
      return getMockData();
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const url = new URL(APP_CONFIG.API_URL);
      url.searchParams.set('action', action);
      for (const [key, val] of Object.entries(queryParams)) {
        url.searchParams.set(key, val);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      if (!json.success) {
        const error = new Error(json.message || 'Error en la consulta');
        error.errorCode = json.errorCode;
        throw error;
      }

      return json.data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('Tiempo de espera agotado al conectar con el servidor.');
        timeoutErr.errorCode = 'TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  };

  /**
   * Realiza una petición POST enviando el payload en JSON plano (Content-Type: text/plain)
   * para asegurar compatibilidad absoluta con Apps Script evitando fallos de CORS preflight.
   * @param {string} action
   * @param {Object} payload
   * @return {Promise<Object>}
   */
  const post = async (action, payload = {}) => {
    if (!isConfigured()) {
      // Simulación de reserva en modo demo
      await new Promise((resolve) => setTimeout(resolve, 800));
      return {
        codigo_reservacion: 'CONESIEE-2026-DEMO' + Math.floor(1000 + Math.random() * 9000),
        horario_id: payload.horario_id,
        fecha: '2026-09-28',
        hora_inicio: '14:00',
        hora_fin: '15:00',
        sede: 'Auditorio Central EIME / Híbrido',
        nombre_expositor: payload.nombre,
        titulo_conferencia: payload.titulo,
        modalidad: payload.modalidad,
        fecha_registro: new Date().toISOString(),
        isDemo: true
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    try {
      const url = new URL(APP_CONFIG.API_URL);
      url.searchParams.set('action', action);

      const response = await fetch(url.toString(), {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }

      const json = await response.json();
      if (!json.success) {
        const error = new Error(json.message || 'No fue posible completar la reservación.');
        error.errorCode = json.errorCode;
        throw error;
      }

      return json.data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        const timeoutErr = new Error('El servidor tardó demasiado en procesar la reservación.');
        timeoutErr.errorCode = 'TIMEOUT';
        throw timeoutErr;
      }
      throw err;
    }
  };

  /**
   * Consulta la lista completa de horarios y disponibilidad pública.
   * @return {Promise<Object>}
   */
  const fetchSlots = () => get('listSlots');

  /**
   * Envía la solicitud de reservación.
   * @param {Object} data
   * @return {Promise<Object>}
   */
  const reserveSlot = (data) => post('reserveSlot', data);

  return {
    isConfigured,
    fetchSlots,
    reserveSlot
  };
})();
