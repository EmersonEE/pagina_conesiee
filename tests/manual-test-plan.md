# Plan de Pruebas Manuales y de Seguridad: CONESIEE 2026

Este documento detalla los 15 escenarios de prueba obligatorios para verificar la robustez, seguridad, accesibilidad y consistencia del sistema de disponibilidad y reservaciones del **CONESIEE 2026**.

---

## Matriz de Casos de Prueba

| ID | Caso de Prueba | Procedimiento | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **CP-01** | **Consulta inicial de horarios** | Abrir `index.html` en el navegador con conexión activa. | La página carga los 12 espacios iniciales organizados por día (28 Sep al 01 Oct 2026), con la hora de última actualización y badges de estado correctos. |
| **CP-02** | **Reservación correcta** | 1. Clic en "Reservar Horario" en un espacio `Disponible`.<br>2. Completar todos los campos obligatorios válidos.<br>3. Marcar consentimiento de datos.<br>4. Clic en "Confirmar Reservación". | El modal cambia a la vista de éxito mostrando el código generado `CONESIEE-2026-XXXXXXXX`. En la hoja de Sheets aparece la fila y el horario pasa a estado `Reservado`. |
| **CP-03** | **Campos obligatorios vacíos** | Intentar enviar el formulario dejando campos en blanco (ej. Nombre, Teléfono o Título vacíos). | El formulario no se envía, se resaltan los campos en rojo, se despliega el mensaje de error y el foco se posiciona en el primer campo inválido. |
| **CP-04** | **Correo electrónico inválido** | Ingresar correos con sintaxis inválida (ej. `usuario@`, `usuario@dominio`, `sin-arroba.com`). | El validador en cliente y backend rechaza la solicitud con el mensaje *"Ingrese un correo electrónico válido"*. |
| **CP-05** | **Horario inexistente** | Alterar el valor oculto `form-horario-id` mediante herramientas de desarrollador a `SLOT-INEXISTENTE` y enviar. | Apps Script captura la solicitud, responde con error `SLOT_NOT_FOUND` y no se inserta ninguna reservación. |
| **CP-06** | **Horario bloqueado o reservado** | Intentar reservar un espacio con estado `Bloqueado` o `Reservado` directamente vía API POST. | Apps Script verifica bajo `LockService` que el estado no es `Disponible` y rechaza con `SLOT_NOT_AVAILABLE`. |
| **CP-07** | **Reservaciones desactivadas** | En la hoja `Configuracion`, cambiar `RESERVACIONES_ACTIVAS` a `false`. Intentar reservar desde la web. | El backend rechaza la transacción con código `RESERVATIONS_DISABLED` y se muestra un mensaje informativo. |
| **CP-08** | **Pérdida de conexión a internet** | Desactivar la red o poner el navegador en modo Offline e interactuar con la página. | La interfaz mantiene los horarios previamente cargados sin borrar la pantalla y muestra una notificación toast amigable indicando el fallo de red. |
| **CP-09** | **Doble clic en botón Reservar** | Hacer múltiples clics rápidos en "Confirmar Reservación". | Al primer clic el botón se deshabilita, cambia su texto a *"Verificando y Reservando..."* con spinner y evita peticiones duplicadas. |
| **CP-10** | **Concurrencia simultánea** | Dos usuarios envían solicitud al mismo milisegundo para el mismo horario. | Solo uno obtiene confirmación con código. El segundo recibe `SLOT_NOT_AVAILABLE` gracias a `LockService`. |
| **CP-11** | **Caracteres especiales y acentos** | Llenar el formulario con tildes, eñes, comillas y caracteres: `Ángel Nuñez "Investigador" & <Tecnología>`. | Los textos se guardan íntegros en Sheets sin corromperse y se escapan en el HTML evitando ataques XSS. |
| **CP-12** | **Inyección de fórmulas en Google Sheets** | Ingresar en Nombre o Título un valor malicioso: `=SUM(A1:A10)`, `+cmd|' /C calc'!A0`, `@IMPORTXML(...)`, `-2+5`. | En la hoja `Reservaciones`, el backend en `Security.gs` antepone una comilla simple (`'=SUM(A1:A10)`), impidiendo que Sheets ejecute la fórmula. |
| **CP-13** | **Visualización responsive en teléfono (360px)** | Probar en emulador o dispositivo real con ancho de 360px a 400px. | Las tarjetas se adaptan a 1 sola columna, los botones tienen área táctil accesible y el modal se ajusta con scroll interno. |
| **CP-14** | **Navegación completa por teclado** | Navegar usando `Tab`, `Shift+Tab`, `Enter`, `Espacio` y `Escape`. | Todos los elementos interactivos tienen indicador visual de foco (`focus-visible`). El modal atrapa el foco y se cierra con `Escape`. |
| **CP-15** | **Privacidad de datos en la API pública** | Ejecutar `curl "https://script.google.com/.../exec?action=listSlots"` en terminal. | La respuesta JSON **solo** incluye fechas, horas, sede, estado y título/nombre si fue autorizado. **Nunca** expone correos, teléfonos ni notas internas. |

---

## Verificación de Registros en Google Sheets

Tras ejecutar las pruebas, el administrador debe verificar en su hoja privada:

1. **Hoja `Horarios`**:
   - La columna `estado` cambia de `Disponible` a `Reservado`.
   - La columna `reservacion_id` contiene el ID correspondiente (ej. `RES-1756789...`).
   - La columna `ultima_actualizacion` tiene un timestamp ISO válido.

2. **Hoja `Reservaciones`**:
   - Contiene la fila con todos los campos sanitizados.
   - El `codigo_reservacion` coincide con el mostrado al usuario en el modal de éxito.
   - Si el usuario no autorizó la publicación (`acepta_publicacion === false`), en `Horarios` el endpoint público no divulgará sus datos.
