/**
 * app.js - Controlador Principal de la Aplicación Web CONESIEE 2026
 * Universidad de San Carlos de Guatemala - Escuela de Ingeniería Mecánica Eléctrica
 */

document.addEventListener('DOMContentLoaded', () => {
  // =========================================================================
  // 1. ESTADO GLOBAL DE LA APLICACIÓN
  // =========================================================================
  const state = {
    slots: [],
    eventInfo: null,
    activeDayFilter: 'all',
    activeStatusFilter: 'all',
    selectedSlot: null,
    isSubmitting: false,
    pollTimer: null,
    lastUpdateDate: null,
    lastFocusedElement: null
  };

  // =========================================================================
  // 2. ELEMENTOS DEL DOM
  // =========================================================================
  const DOM = {
    svgSpriteContainer: document.getElementById('svg-sprite-container'),
    lastUpdateText: document.getElementById('last-update-text'),
    btnManualRefresh: document.getElementById('btn-manual-refresh'),
    scheduleContainer: document.getElementById('schedule-container'),
    footerCommitteeEmail: document.getElementById('footer-committee-email'),

    // Estadísticas
    statTotal: document.getElementById('stat-total'),
    statAvailable: document.getElementById('stat-available'),
    statReserved: document.getElementById('stat-reserved'),
    statBlocked: document.getElementById('stat-blocked'),

    // Filtros
    dayFilterBtns: document.querySelectorAll('.day-filter-btn'),
    statusFilterSelect: document.getElementById('filter-status'),

    // Modal
    modalBackdrop: document.getElementById('booking-modal'),
    modalTitle: document.getElementById('modal-title'),
    btnCloseModal: document.getElementById('btn-close-modal'),
    btnCancelModal: document.getElementById('btn-cancel-modal'),
    btnSubmitBooking: document.getElementById('btn-submit-booking'),
    btnFinishSuccess: document.getElementById('btn-finish-success'),
    btnCopyCode: document.getElementById('btn-copy-code'),

    // Vistas del Modal
    modalViewForm: document.getElementById('modal-view-form'),
    modalViewSuccess: document.getElementById('modal-view-success'),
    modalFooterActions: document.getElementById('modal-footer-actions'),
    modalFooterSuccess: document.getElementById('modal-footer-success'),

    // Formulario
    bookingForm: document.getElementById('booking-form'),
    formHorarioId: document.getElementById('form-horario-id'),
    formNombre: document.getElementById('form-nombre'),
    formInstitucion: document.getElementById('form-institucion'),
    formCorreo: document.getElementById('form-correo'),
    formTelefono: document.getElementById('form-telefono'),
    formTitulo: document.getElementById('form-titulo'),
    formModalidad: document.getElementById('form-modalidad'),
    formFormato: document.getElementById('form-formato'),
    modalidadHint: document.getElementById('modalidad-hint'),
    formDescripcion: document.getElementById('form-descripcion'),
    formRequerimientos: document.getElementById('form-requerimientos'),
    formAceptaTratamiento: document.getElementById('form-acepta-tratamiento'),
    formAceptaPublicacion: document.getElementById('form-acepta-publicacion'),

    // Resumen del Horario en Modal
    summarySlotDate: document.getElementById('summary-slot-date'),
    summarySlotTime: document.getElementById('summary-slot-time'),
    summarySlotVenue: document.getElementById('summary-slot-venue'),

    // Elementos de Vista de Éxito
    successResCode: document.getElementById('success-res-code'),
    successSpeakerName: document.getElementById('success-speaker-name'),
    successSlotDateTime: document.getElementById('success-slot-datetime'),
    successTalkTitle: document.getElementById('success-talk-title'),

    // Notificaciones
    toastContainer: document.getElementById('toast-container')
  };

  // =========================================================================
  // 3. INICIALIZACIÓN DE ICONOS SVG
  // =========================================================================
  const loadSvgSprites = async () => {
    try {
      const response = await fetch('assets/icons/icons.svg');
      if (response.ok) {
        const svgText = await response.text();
        DOM.svgSpriteContainer.innerHTML = svgText;
      }
    } catch (e) {
      console.warn('No se pudo cargar el sprite externo de iconos, se usarán iconos de respaldo.', e);
    }
  };

  // =========================================================================
  // 4. NOTIFICACIONES TOAST (ACCESIBLES Y NO DESTRUCTIVAS)
  // =========================================================================
  const showToast = (message, type = 'info', duration = 4500) => {
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast--error' : type === 'success' ? 'toast--success' : ''}`;
    toast.setAttribute('role', 'status');

    let iconId = '#icon-alert-circle';
    if (type === 'success') iconId = '#icon-check-circle';

    toast.innerHTML = `
      <svg class="icon" aria-hidden="true"><use href="${iconId}"></use></svg>
      <span>${FormValidator.escapeHTML(message)}</span>
    `;

    DOM.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };

  // =========================================================================
  // 5. FORMATEADORES DE FECHA Y TEXTO
  // =========================================================================
  const formatFriendlyDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day);

    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    return `${dias[d.getDay()]} ${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return `${dias[d.getDay()]} ${d.getDate()} ${meses[d.getMonth()]}`;
  };

  /**
   * Formatea cadenas u objetos de hora a formato limpio HH:mm (ej. "14:00")
   * eliminando fechas no deseadas de Google Sheets (ej. "Sat Dec 30 1899 14:00:00...").
   */
  const formatCleanTime = (timeVal) => {
    if (!timeVal) return '';
    const str = String(timeVal).trim();
    const match = str.match(/(?:T|\b)([01]?\d|2[0-3]):([0-5]\d)/);
    if (match) {
      return `${match[1].padStart(2, '0')}:${match[2]}`;
    }
    return str;
  };

  // =========================================================================
  // 6. ACTUALIZACIÓN Y CONSULTA DE DISPONIBILIDAD (POLLING)
  // =========================================================================
  const updateStats = (slots) => {
    let total = slots.length;
    let avail = 0;
    let res = 0;
    let block = 0;

    slots.forEach(s => {
      if (s.estado === 'Disponible') avail++;
      else if (s.estado === 'Reservado') res++;
      else if (s.estado === 'Bloqueado' || s.estado === 'Cancelado') block++;
    });

    DOM.statTotal.textContent = total;
    DOM.statAvailable.textContent = avail;
    DOM.statReserved.textContent = res;
    DOM.statBlocked.textContent = block;
  };

  const loadSlots = async ({ silent = false } = {}) => {
    if (!silent) {
      DOM.btnManualRefresh.classList.add('is-spinning');
    }

    try {
      const data = await ApiService.fetchSlots();
      state.slots = data.horarios || [];
      state.eventInfo = data.evento || null;
      state.lastUpdateDate = new Date();

      // Actualizar hora en encabezado
      const hours = String(state.lastUpdateDate.getHours()).padStart(2, '0');
      const mins = String(state.lastUpdateDate.getMinutes()).padStart(2, '0');
      const secs = String(state.lastUpdateDate.getSeconds()).padStart(2, '0');
      DOM.lastUpdateText.textContent = `Actualizado ${hours}:${mins}:${secs}`;

      // Actualizar correo institucional si viene configurado
      if (state.eventInfo && state.eventInfo.correo_comite && state.eventInfo.correo_comite !== '[INDICAR_CORREO_DEL_COMITE]') {
        DOM.footerCommitteeEmail.innerHTML = `<a href="mailto:${state.eventInfo.correo_comite}">${state.eventInfo.correo_comite}</a>`;
      }

      updateStats(state.slots);
      renderSchedule();

      if (data.isDemoMode && !silent) {
        showToast('Modo de demostración local activo. Despliegue Apps Script para guardar datos en Google Sheets.', 'info', 6000);
      }
    } catch (err) {
      console.error('Error al consultar horarios:', err);
      if (!silent) {
        showToast('No se pudo actualizar la disponibilidad en este momento. Reintentando...', 'error');
      }
    } finally {
      DOM.btnManualRefresh.classList.remove('is-spinning');
    }
  };

  const startPolling = () => {
    if (state.pollTimer) clearInterval(state.pollTimer);
    state.pollTimer = setInterval(() => {
      // Solo hacer polling si el usuario no está completando el modal de reserva activamente
      if (!state.isSubmitting && !DOM.modalBackdrop.classList.contains('is-open')) {
        loadSlots({ silent: true });
      }
    }, APP_CONFIG.POLLING_INTERVAL_MS);
  };

  // =========================================================================
  // 7. RENDERIZADO DE HORARIOS EN TARJETAS
  // =========================================================================
  const renderSchedule = () => {
    const { slots, activeDayFilter, activeStatusFilter } = state;

    // Aplicar filtros
    let filtered = slots.filter(slot => {
      const matchDay = (activeDayFilter === 'all' || slot.fecha === activeDayFilter);
      const matchStatus = (activeStatusFilter === 'all' || slot.estado === activeStatusFilter);
      return matchDay && matchStatus;
    });

    if (filtered.length === 0) {
      DOM.scheduleContainer.innerHTML = `
        <div class="empty-state">
          <svg class="icon" style="width:48px; height:48px; margin-bottom:1rem; color:var(--color-accent-gold);" aria-hidden="true">
            <use href="#icon-calendar"></use>
          </svg>
          <h3>No hay horarios disponibles con los filtros seleccionados</h3>
          <p style="color:var(--color-text-light-muted); margin-top:0.5rem;">
            Intenta seleccionar "Todos los días" o cambiar el estado en el menú superior.
          </p>
        </div>
      `;
      return;
    }

    // Agrupar por fecha
    const groupedByDay = {};
    filtered.forEach(slot => {
      if (!groupedByDay[slot.fecha]) {
        groupedByDay[slot.fecha] = [];
      }
      groupedByDay[slot.fecha].push(slot);
    });

    let html = '';

    // Ordenar fechas cronológicamente
    const sortedDates = Object.keys(groupedByDay).sort();

    sortedDates.forEach(dateStr => {
      const daySlots = groupedByDay[dateStr];
      const friendlyDate = formatFriendlyDate(dateStr);

      html += `
        <article class="day-group" aria-labelledby="day-heading-${dateStr}">
          <header class="day-group__header">
            <svg class="icon" style="color:var(--color-accent-gold);" aria-hidden="true"><use href="#icon-calendar"></use></svg>
            <h2 id="day-heading-${dateStr}" class="day-group__title">${friendlyDate}</h2>
            <span class="day-group__count">${daySlots.length} ${daySlots.length === 1 ? 'espacio' : 'espacios'}</span>
          </header>

          <div class="slots-grid">
      `;

      daySlots.forEach(slot => {
        const isAvailable = slot.estado === 'Disponible';
        const isReserved = slot.estado === 'Reservado';
        const isBlocked = slot.estado === 'Bloqueado';

        let badgeClass = 'status-badge--available';
        let badgeLabel = 'Disponible';

        if (isReserved) {
          badgeClass = 'status-badge--reserved';
          badgeLabel = 'Reservado';
        } else if (isBlocked) {
          badgeClass = 'status-badge--blocked';
          badgeLabel = 'Bloqueado';
        } else if (slot.estado === 'Cancelado') {
          badgeClass = 'status-badge--cancelled';
          badgeLabel = 'Cancelado';
        }

        // Información pública si fue autorizada o resumen de reservado
        let publicTalkHtml = '';
        if (slot.conferencia_publica && slot.conferencia_publica.titulo) {
          publicTalkHtml = `
            <div class="slot-card__public-talk">
              <div class="slot-card__talk-title">${FormValidator.escapeHTML(slot.conferencia_publica.titulo)}</div>
              <div class="slot-card__speaker">
                <svg class="icon" aria-hidden="true"><use href="#icon-user"></use></svg>
                <span><strong>${FormValidator.escapeHTML(slot.conferencia_publica.nombre_expositor || 'Conferencista')}</strong> ${slot.conferencia_publica.institucion ? `· ${FormValidator.escapeHTML(slot.conferencia_publica.institucion)}` : ''}</span>
              </div>
            </div>
          `;
        } else if (isReserved) {
          publicTalkHtml = `
            <div class="slot-card__public-talk" style="background: #F8FAFC; border-left-color: #64748B;">
              <div class="slot-card__talk-title" style="color: #475569; font-weight: 700;">Espacio Asignado</div>
              <div class="slot-card__speaker" style="color: #64748B;">
                <svg class="icon" aria-hidden="true"><use href="#icon-lock"></use></svg>
                <span>Conferencia confirmada</span>
              </div>
            </div>
          `;
        }

        html += `
          <div class="slot-card" data-slot-id="${slot.id}">
            <div>
              <div class="slot-card__top">
                <div class="slot-card__time">
                  <svg class="icon" aria-hidden="true"><use href="#icon-clock"></use></svg>
                  <span>${formatCleanTime(slot.hora_inicio)} – ${formatCleanTime(slot.hora_fin)}</span>
                </div>
                <span class="status-badge ${badgeClass}">
                  <span class="status-badge__dot" aria-hidden="true"></span>
                  <span>${badgeLabel}</span>
                </span>
              </div>

              <div class="slot-card__venue">
                <svg class="icon" aria-hidden="true"><use href="#icon-map-pin"></use></svg>
                <span>${FormValidator.escapeHTML((slot.sede && !slot.sede.includes('Auditorio Central EIME')) ? slot.sede : APP_CONFIG.VENUE_DEFAULT)}</span>
              </div>

              ${publicTalkHtml}
            </div>

            <div class="slot-card__actions" style="margin-top: 1rem;">
              ${isAvailable ? `
                <button 
                  type="button" 
                  class="btn-book" 
                  data-action="book" 
                  data-slot-id="${slot.id}"
                  aria-label="Reservar horario de ${formatCleanTime(slot.hora_inicio)} a ${formatCleanTime(slot.hora_fin)} el ${formatShortDate(slot.fecha)}"
                >
                  <svg class="icon" aria-hidden="true"><use href="#icon-lock"></use></svg>
                  <span>Reservar Horario</span>
                </button>
              ` : `
                <button type="button" class="btn-book" disabled aria-disabled="true">
                  <span>${isReserved ? 'Horario Asignado' : 'No Disponible'}</span>
                </button>
              `}
            </div>
          </div>
        `;
      });

      html += `
          </div>
        </article>
      `;
    });

    DOM.scheduleContainer.innerHTML = html;

    // Conectar eventos a los botones de reserva
    DOM.scheduleContainer.querySelectorAll('button[data-action="book"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const slotId = e.currentTarget.getAttribute('data-slot-id');
        openBookingModal(slotId);
      });
    });
  };

  // =========================================================================
  // 8. CONTROL DEL MODAL ACCESIBLE Y FORMULARIO
  // =========================================================================
  const openBookingModal = (slotId) => {
    const slot = state.slots.find(s => s.id === slotId);
    if (!slot) {
      showToast('No se encontró el horario seleccionado.', 'error');
      return;
    }

    if (slot.estado !== 'Disponible') {
      showToast('Este horario ya no se encuentra disponible para reserva.', 'error');
      loadSlots({ silent: true });
      return;
    }

    state.selectedSlot = slot;
    state.lastFocusedElement = document.activeElement;

    // Resetear vistas del modal
    DOM.modalViewForm.style.display = 'block';
    DOM.modalViewSuccess.style.display = 'none';
    DOM.modalFooterActions.style.display = 'flex';
    DOM.modalFooterSuccess.style.display = 'none';

    // Resetear formulario y errores previos
    DOM.bookingForm.reset();
    clearAllFormErrors();

    // Poblar resumen
    DOM.formHorarioId.value = slot.id;
    DOM.summarySlotDate.textContent = formatFriendlyDate(slot.fecha);
    DOM.summarySlotTime.textContent = `${formatCleanTime(slot.hora_inicio)} – ${formatCleanTime(slot.hora_fin)} (Hora Guatemala)`;
    DOM.summarySlotVenue.textContent = (slot.sede && !slot.sede.includes('Auditorio Central EIME')) ? slot.sede : APP_CONFIG.VENUE_DEFAULT;

    // Modalidad y Formato por defecto
    DOM.formModalidad.value = 'individual';
    if (DOM.formFormato) DOM.formFormato.value = 'presencial';
    updateModalityHint('individual');

    // Mostrar modal con accesibilidad
    DOM.modalBackdrop.classList.add('is-open');
    DOM.modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Foco en el primer campo
    setTimeout(() => {
      DOM.formNombre.focus();
    }, 100);
  };

  const closeBookingModal = () => {
    DOM.modalBackdrop.classList.remove('is-open');
    DOM.modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    state.selectedSlot = null;

    if (state.lastFocusedElement) {
      state.lastFocusedElement.focus();
    }
  };

  const updateModalityHint = (modalityKey) => {
    const mod = APP_CONFIG.MODALITIES[modalityKey];
    if (mod) {
      DOM.modalidadHint.textContent = mod.description;
    }
  };

  const clearAllFormErrors = () => {
    DOM.bookingForm.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
      el.classList.remove('is-invalid');
    });
    DOM.bookingForm.querySelectorAll('.form-error-msg').forEach(el => {
      el.textContent = '';
      el.classList.remove('is-visible');
    });
  };

  const showFieldError = (fieldName, message) => {
    const input = document.getElementById(`form-${fieldName.replace('_', '-')}`) || DOM.bookingForm.querySelector(`[name="${fieldName}"]`);
    const errorContainer = document.getElementById(`error-${fieldName}`);

    if (input) {
      input.classList.add('is-invalid');
    }
    if (errorContainer) {
      errorContainer.textContent = message;
      errorContainer.classList.add('is-visible');
    }
  };

  const clearFieldError = (fieldName) => {
    const input = document.getElementById(`form-${fieldName.replace('_', '-')}`) || DOM.bookingForm.querySelector(`[name="${fieldName}"]`);
    const errorContainer = document.getElementById(`error-${fieldName}`);

    if (input) {
      input.classList.remove('is-invalid');
    }
    if (errorContainer) {
      errorContainer.textContent = '';
      errorContainer.classList.remove('is-visible');
    }
  };

  // =========================================================================
  // 9. PROCESAMIENTO Y ENVÍO DE LA RESERVACIÓN
  // =========================================================================
  const handleBookingSubmit = async () => {
    if (state.isSubmitting) return;

    clearAllFormErrors();
    const formData = new FormData(DOM.bookingForm);
    const validation = FormValidator.validateForm(formData);

    if (!validation.isValid) {
      let firstInvalidInput = null;
      for (const [field, errorMsg] of Object.entries(validation.errors)) {
        showFieldError(field, errorMsg);
        if (!firstInvalidInput) {
          firstInvalidInput = document.getElementById(`form-${field.replace('_', '-')}`) || DOM.bookingForm.querySelector(`[name="${field}"]`);
        }
      }
      if (firstInvalidInput) {
        firstInvalidInput.focus();
      }
      showToast('Por favor, completa correctamente todos los campos obligatorios.', 'error');
      return;
    }

    // Bloquear UI y activar spinner
    state.isSubmitting = true;
    DOM.btnSubmitBooking.disabled = true;
    const originalBtnHtml = DOM.btnSubmitBooking.innerHTML;
    DOM.btnSubmitBooking.innerHTML = `
      <div class="spinner" style="width:18px; height:18px; border-width:2px; margin:0;" role="status"></div>
      <span>Verificando y Reservando...</span>
    `;

    try {
      const response = await ApiService.reserveSlot(validation.values);

      // Mostrar vista de éxito
      DOM.modalViewForm.style.display = 'none';
      DOM.modalFooterActions.style.display = 'none';

      DOM.successResCode.textContent = response.codigo_reservacion;
      DOM.successSpeakerName.textContent = response.nombre_expositor;
      DOM.successSlotDateTime.textContent = `${formatShortDate(response.fecha)} | ${formatCleanTime(response.hora_inicio)} – ${formatCleanTime(response.hora_fin)}`;
      DOM.successTalkTitle.textContent = response.titulo_conferencia;

      DOM.modalViewSuccess.style.display = 'block';
      DOM.modalFooterSuccess.style.display = 'flex';
      DOM.btnFinishSuccess.focus();

      showToast('¡Reservación completada exitosamente!', 'success');

      // Actualizar inmediatamente la lista en el fondo
      loadSlots({ silent: true });

    } catch (err) {
      console.error('Error al registrar reservación:', err);
      const friendlyMessage = APP_CONFIG.ERROR_MESSAGES[err.errorCode] || err.message || 'No fue posible registrar la reservación. Por favor, reintenta.';

      showToast(friendlyMessage, 'error', 6000);

      // Si el error fue por horario ya ocupado, actualizar catálogo inmediatamente
      if (err.errorCode === 'SLOT_NOT_AVAILABLE') {
        loadSlots({ silent: true });
        closeBookingModal();
      }
    } finally {
      state.isSubmitting = false;
      DOM.btnSubmitBooking.disabled = false;
      DOM.btnSubmitBooking.innerHTML = originalBtnHtml;
    }
  };

  // =========================================================================
  // 10. CONFIGURACIÓN DE ESCUCHADORES DE EVENTOS
  // =========================================================================
  const setupEventListeners = () => {
    // Carga de iconos SVG
    loadSvgSprites();

    // Sondeo y carga inicial
    loadSlots();
    startPolling();

    // Botón manual de refresco
    DOM.btnManualRefresh.addEventListener('click', () => {
      loadSlots();
    });

    // Filtros de fecha por botón
    DOM.dayFilterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        DOM.dayFilterBtns.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        state.activeDayFilter = btn.getAttribute('data-day');
        renderSchedule();
      });
    });

    // Filtro de estado por select
    DOM.statusFilterSelect.addEventListener('change', (e) => {
      state.activeStatusFilter = e.target.value;
      renderSchedule();
    });

    // Modal: Cerrar
    DOM.btnCloseModal.addEventListener('click', closeBookingModal);
    DOM.btnCancelModal.addEventListener('click', closeBookingModal);
    DOM.btnFinishSuccess.addEventListener('click', closeBookingModal);

    // Modal: Cerrar con tecla Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && DOM.modalBackdrop.classList.contains('is-open')) {
        closeBookingModal();
      }
    });

    // Modal: Cerrar al dar clic en el backdrop exterior
    DOM.modalBackdrop.addEventListener('click', (e) => {
      if (e.target === DOM.modalBackdrop) {
        closeBookingModal();
      }
    });

    // Modalidad: actualización de descripción
    DOM.formModalidad.addEventListener('change', (e) => {
      updateModalityHint(e.target.value);
    });

    // Validación interactiva en tiempo real al escribir
    const inputsToValidate = [
       'nombre', 'institucion', 'correo', 'telefono', 'titulo', 'descripcion', 'formato', 'requerimientos'
    ];
    inputsToValidate.forEach(fieldName => {
      const input = document.getElementById(`form-${fieldName}`);
      if (input) {
        input.addEventListener('input', () => {
          clearFieldError(fieldName);
        });
        input.addEventListener('blur', () => {
          const errorMsg = FormValidator.validateField(fieldName, input.value);
          if (errorMsg) {
            showFieldError(fieldName, errorMsg);
          } else {
            clearFieldError(fieldName);
          }
        });
      }
    });

    DOM.formAceptaTratamiento.addEventListener('change', () => {
      if (DOM.formAceptaTratamiento.checked) {
        clearFieldError('acepta_tratamiento');
      }
    });

    // Envío del formulario
    DOM.btnSubmitBooking.addEventListener('click', handleBookingSubmit);
    DOM.bookingForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleBookingSubmit();
    });

    // Copiar código de reservación al portapapeles
    DOM.btnCopyCode.addEventListener('click', async () => {
      const code = DOM.successResCode.textContent.trim();
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(code);
        } else {
          // Fallback clásico
          const tempInput = document.createElement('textarea');
          tempInput.value = code;
          document.body.appendChild(tempInput);
          tempInput.select();
          document.execCommand('copy');
          document.body.removeChild(tempInput);
        }
        DOM.btnCopyCode.innerHTML = `
          <svg class="icon" aria-hidden="true"><use href="#icon-check-circle"></use></svg>
          <span>¡Copiado!</span>
        `;
        setTimeout(() => {
          DOM.btnCopyCode.innerHTML = `
            <svg class="icon" aria-hidden="true"><use href="#icon-copy"></use></svg>
            <span>Copiar Código</span>
          `;
        }, 2000);
      } catch (err) {
        showToast('No se pudo copiar automáticamente. Por favor, selecciona y copia el código manualmente.', 'error');
      }
    });
  };

  // Iniciar aplicación
  setupEventListeners();
});
