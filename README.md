# CONESIEE 2026 - Sistema de Disponibilidad y Reservación de Conferencias

**XXV Congreso Nacional de Estudiantes de Ingeniería Mecánica Eléctrica, Eléctrica y Electrónica**  
*Escuela de Ingeniería Mecánica Eléctrica (EIME) · Facultad de Ingeniería · Universidad de San Carlos de Guatemala (USAC)*  
*Fechas del evento: 28 de septiembre al 2 de octubre de 2026*  
*Zona horaria oficial: `America/Guatemala` (UTC-6)*

---

## 1. Resumen de la Solución

Aplicación web pública, moderna, accesible y de alto rendimiento diseñada para gestionar en tiempo casi real la disponibilidad y reserva de espacios de ponencias para conferencistas del **CONESIEE 2026**.

### Características Principales:
- **Cero costos de infraestructura**: Frontend estático en GitHub Pages y Backend Serverless en Google Apps Script + Google Sheets.
- **Prevención estricta de concurrencia**: Bloqueo atómico con `LockService` que impide sobre-reservas o traslapes si dos usuarios envían al mismo tiempo.
- **Privacidad estricta por diseño**: La API pública solo expone datos del expositor si autorizó explícitamente su difusión. Nunca se exponen correos, teléfonos ni notas técnicas en el frontend.
- **Diseño Mobile-First**: Optimizado para teléfonos inteligentes desde 360px de ancho con la identidad visual institucional (Azul Marino Oscuro `#0B192C` y Acentos Dorados `#F1C40F`).
- **Sondeo automático sin recarga**: Actualización de disponibilidad cada 20 segundos sin interrumpir la navegación.
- **Seguridad contra abuso**: Sanitización contra inyección de fórmulas en Google Sheets, honeypot anti-bots y validación exhaustiva en cliente y servidor.

---

## 2. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                      GITHUB PAGES                           │
│  Frontend: HTML5 + CSS3 + Vanilla JavaScript Moderno        │
│  - Tarjetas de horarios con estados visuales y badges       │
│  - Filtros interactivos por fecha y estado                  │
│  - Modal accesible para registro de ponencias               │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS Fetch (Content-Type: text/plain)
                               │ Sin fallo de CORS preflight
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   GOOGLE APPS SCRIPT                        │
│  API Web (doGet / doPost)                                   │
│  - LockService (Atomicidad ante alta concurrencia)          │
│  - Validación estricta y sanitización anti-fórmulas         │
│  - Generación de código único CONESIEE-2026-XXXXXXXX        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Lectura / Escritura
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 GOOGLE SHEETS (Privado)                     │
│  Hojas: Horarios | Reservaciones | Configuracion            │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Estructura del Repositorio

```
pagina_conesiee/
├── index.html                     # Interfaz web accesible y semántica
├── css/
│   └── styles.css                 # Hoja de estilos con variables y diseño responsive
├── js/
│   ├── config.js                  # Configuración centralizada de la web
│   ├── api.js                     # Cliente de comunicación con Apps Script
│   ├── validation.js              # Validación de campos y sanitización
│   └── app.js                     # Controlador de la UI, sondeo y modal
├── assets/
│   ├── logo/
│   │   ├── conesiee-2026.png      # [Marcador para el logo oficial autorizado]
│   │   ├── conesiee-logo.svg      # Logotipo vectorial institucional de respaldo
│   │   └── conesiee-2026.png.readme.txt
│   └── icons/
│       └── icons.svg              # Sprite con iconos SVG del sistema
├── apps-script/
│   ├── Code.gs                    # Enrutador principal doGet y doPost
│   ├── Setup.gs                   # Instalador automático idempotente de Google Sheets
│   ├── Api.gs                     # Controladores de listado y reservación atómica
│   ├── Validation.gs              # Validador de esquemas de datos en backend
│   ├── Security.gs                # LockService, honeypot y prevención de inyección
│   └── appsscript.json            # Manifiesto de Apps Script (V8, America/Guatemala)
├── tests/
│   ├── manual-test-plan.md        # Plan de 15 pruebas funcionales y de seguridad
│   └── concurrency-test.md        # Scripts de prueba de colisión concurrente
├── .gitignore
├── LICENSE
└── README.md
```

---

## 4. Estructura de Google Sheets

El backend administra tres hojas de cálculo:

### Hoja: `Horarios`
| Columna | Descripción |
| :--- | :--- |
| `id` | Identificador único del espacio (ej. `SLOT-2026-0928-1400`) |
| `fecha` | Fecha de la conferencia (`YYYY-MM-DD`) |
| `hora_inicio` | Hora de inicio formato 24h (`14:00`) |
| `hora_fin` | Hora de finalización formato 24h (`15:00`) |
| `sede` | Auditorio o modalidad (ej. `Auditorio Central EIME / Híbrido`) |
| `estado` | `Disponible`, `Reservado`, `Bloqueado`, `Cancelado` |
| `reservacion_id` | ID interno de la reservación asociada |
| `ultima_actualizacion` | Timestamp ISO de la última modificación |

### Hoja: `Reservaciones`
Almacena de forma privada todos los datos enviados por el expositor (`reservacion_id`, `codigo_reservacion`, `horario_id`, `fecha_registro`, `nombre`, `institucion`, `correo`, `telefono`, `titulo`, `descripcion`, `modalidad`, `requerimientos`, `acepta_tratamiento`, `acepta_publicacion`, `estado`).

### Hoja: `Configuracion`
Permite al comité modificar parámetros sin tocar código (`NOMBRE_EVENTO`, `ZONA_HORARIA`, `CORREO_COMITE`, `RESERVACIONES_ACTIVAS`, `INTERVALO_ACTUALIZACION_SEG`, `TEXTO_PRIVACIDAD`, `ENLACE_INSTITUCIONAL`).

---

## 5. Guía de Instalación y Despliegue Paso a Paso

### Paso 1: Crear la Hoja de Google Sheets
1. Ingresa a [Google Drive](https://drive.google.com) con la cuenta del comité organizador.
2. Crea una nueva hoja de cálculo llamada: `CONESIEE 2026 - Administracion de Horarios`.
3. Copia el **ID de la hoja** desde la barra de direcciones del navegador:
   `https://docs.google.com/spreadsheets/d/`**`1a2b3c4d5e6f7g8h9...`**`/edit`

### Paso 2: Crear el Proyecto de Google Apps Script
1. Dentro de la hoja de Google Sheets, ve al menú superior: **Extensiones > Apps Script**.
2. En el editor de Apps Script, crea los 5 archivos `.gs` copiando el contenido de la carpeta `apps-script/`:
   - `Code.gs`
   - `Setup.gs`
   - `Api.gs`
   - `Validation.gs`
   - `Security.gs`
3. En la configuración del proyecto (ícono de engranaje ⚙️), activa la opción *"Mostrar archivo de manifiesto 'appsscript.json' en el editor"* y pega el contenido de `apps-script/appsscript.json`.
4. En `Setup.gs`, si el script no estuviera vinculado a la hoja, coloca el ID en la variable `SPREADSHEET_ID`. Al crearlo desde Extensiones, se vincula automáticamente.

### Paso 3: Ejecutar la Inicialización
1. En el menú desplegable de funciones de Apps Script, selecciona **`inicializarSistema`** y haz clic en **Ejecutar**.
2. Google solicitará autorización de permisos para acceder a Google Sheets. Haz clic en *"Revisar permisos"*, selecciona tu cuenta y acepta.
3. El script creará automáticamente las tres hojas (`Horarios`, `Reservaciones`, `Configuracion`), sus encabezados formateados y los 12 horarios oficiales del congreso.

### Paso 4: Desplegar como Aplicación Web (Web App)
1. En la esquina superior derecha de Apps Script, haz clic en **Implementar > Nueva implementación**.
2. Selecciona el tipo: **Aplicación web**.
3. Configura los parámetros:
   - **Descripción**: `CONESIEE 2026 API v1`
   - **Ejecutar como**: **Yo (tu cuenta de correo)**
   - **Quién tiene acceso**: **Cualquier persona (Anyone)** *(Fundamental para que el frontend público pueda consultar la disponibilidad y enviar reservaciones)*.
4. Haz clic en **Implementar**.
5. Copia la **URL de la aplicación web** generada (termina en `/exec`).

### Paso 5: Configurar el Frontend
1. Abre el archivo `js/config.js`.
2. En la propiedad `API_URL`, reemplaza el marcador `[PEGAR_URL_DE_APPS_SCRIPT]` por la URL copiada en el paso anterior.
3. En `COMMITTEE_EMAIL`, coloca el correo oficial del comité.
4. Coloca el archivo PNG del logotipo autorizado en `assets/logo/conesiee-2026.png`.

### Paso 6: Publicar en GitHub Pages
1. Crea un nuevo repositorio en GitHub (ej. `conesiee-agenda`).
2. Sube todos los archivos del proyecto al repositorio.
3. En GitHub, ve a **Settings > Pages**.
4. En la sección **Build and deployment > Branch**, selecciona la rama `main` (o `master`) y la carpeta `/ (root)`.
5. Haz clic en **Save**. En un par de minutos, tu sitio estará disponible en:
   `https://<tu-usuario>.github.io/conesiee-agenda/`

---

## 6. Actualización de Apps Script ante Cambios

Si realizas modificaciones en los archivos `.gs` de Apps Script, debes actualizar la implementación pública para que los cambios tomen efecto:

1. En el editor de Apps Script, haz clic en **Implementar > Administrar implementaciones**.
2. Selecciona la implementación activa y haz clic en el ícono de **Editar** (lápiz ✏️).
3. En la opción **Versión**, selecciona **Nueva versión**.
4. Haz clic en **Implementar**. La URL de la API se mantendrá idéntica y no requerirá cambios en el frontend.

---

## 7. Modalidades de Participación y Escalabilidad Futura

El sistema contempla tres modalidades:
1. **Conferencia individual**: 1 expositor por hora completa.
2. **Panel a dos voces**: 2 expositores en 1 hora con ponencia conjunta.
3. **Bloque dividido**: 2 ponencias de 30 minutos cada una.

**Decisión técnica v1**: En la versión inicial, cualquier reservación aprobada bloquea el espacio completo para asegurar la logística. El modelo de datos ya registra la `modalidad` y la lógica de verificación está desacoplada en la función `isSlotAvailableForBooking(estado, modalidad)` en `Api.gs`, permitiendo en futuras versiones admitir hasta 2 reservaciones por bloque sin alterar la estructura de la base de datos.

---

## 8. Lista de Marcadores Configurables

| Marcador | Archivo | Descripción |
| :--- | :--- | :--- |
| `[PEGAR_URL_DE_APPS_SCRIPT]` | `js/config.js` | URL de la Web App desplegada en Apps Script |
| `[PEGAR_ID_DE_GOOGLE_SHEET]` | `apps-script/Setup.gs` | ID de la hoja privada (opcional si es container-bound) |
| `[INDICAR_CORREO_DEL_COMITE]` | `js/config.js` y `Setup.gs` | Correo de contacto del comité de ponencias |
| `[COLOCAR_LOGOTIPO_AUTORIZADO]` | `assets/logo/conesiee-2026.png` | Archivo PNG del logo del congreso |

---

## 9. Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.
