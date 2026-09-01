# Prueba de Concurrencia y Bloqueo Atómico (LockService)

Este documento detalla el procedimiento técnico para ejecutar una **prueba de estrés por colisión concurrente**, demostrando que el sistema impide reservas duplicadas cuando múltiples usuarios intentan reservar el mismo espacio en el mismo instante.

---

## 1. Fundamento de la Solución Concurrente

Google Apps Script ejecuta cada solicitud web en una instancia aislada. Sin control de sincronización, dos peticiones simultáneas podrían leer el estado `Disponible` antes de que la otra escriba, provocando una **doble reserva**.

Para evitar esto, `Api.gs` y `Security.gs` implementan:

```javascript
return withScriptLock(function() {
  // 1. Re-verificación en caliente del estado en la hoja
  // 2. Comprobación: si no está 'Disponible' -> rechazar con SLOT_NOT_AVAILABLE
  // 3. Inserción de la reservación
  // 4. Actualización del estado a 'Reservado'
  // 5. SpreadsheetApp.flush() forzado
  // 6. Retorno de éxito
}, 10000); // 10 segundos de espera de bloqueo exclusivo
```

---

## 2. Método 1: Prueba de Concurrencia con Script Bash (`curl`)

Guarde el siguiente script como `test-concurrency.sh` y ejecútelo desde su terminal Linux/macOS:

```bash
#!/usr/bin/env bash

# ============================================================================
# Script de Prueba de Concurrencia para CONESIEE 2026
# ============================================================================

# Reemplace por la URL de su Web App desplegada
API_URL="https://script.google.com/macros/s/[TU_DEPLOY_ID]/exec?action=reserveSlot"
TARGET_SLOT="SLOT-2026-0928-1400"

echo "=========================================================="
echo " Lanzando 2 solicitudes simultáneas para el horario: $TARGET_SLOT"
echo "=========================================================="

PAYLOAD_A=$(cat <<EOF
{
  "horario_id": "$TARGET_SLOT",
  "nombre": "Usuario Concurrente A",
  "institucion": "Universidad USAC",
  "correo": "usuarioA@usac.edu.gt",
  "telefono": "+502 5555 1111",
  "titulo": "Ponencia Candidata A",
  "descripcion": "Descripción detallada de la propuesta A para el congreso.",
  "modalidad": "individual",
  "requerimientos": "Ninguno",
  "acepta_tratamiento": true,
  "acepta_publicacion": true,
  "website_hp": ""
}
EOF
)

PAYLOAD_B=$(cat <<EOF
{
  "horario_id": "$TARGET_SLOT",
  "nombre": "Usuario Concurrente B",
  "institucion": "Empresa Tecnológica B",
  "correo": "usuarioB@empresa.com",
  "telefono": "+502 5555 2222",
  "titulo": "Ponencia Candidata B",
  "descripcion": "Descripción detallada de la propuesta B para el congreso.",
  "modalidad": "individual",
  "requerimientos": "Proyector",
  "acepta_tratamiento": true,
  "acepta_publicacion": true,
  "website_hp": ""
}
EOF
)

# Lanzar peticiones en paralelo en segundo plano
curl -s -L -X POST "$API_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d "$PAYLOAD_A" > response_A.json &
PID_A=$!

curl -s -L -X POST "$API_URL" \
  -H "Content-Type: text/plain;charset=utf-8" \
  -d "$PAYLOAD_B" > response_B.json &
PID_B=$!

# Esperar a que ambas terminen
wait $PID_A
wait $PID_B

echo ""
echo "--- Respuesta Solicitud A ---"
cat response_A.json
echo ""
echo ""
echo "--- Respuesta Solicitud B ---"
cat response_B.json
echo ""
echo "=========================================================="
```

---

## 3. Método 2: Prueba con Node.js (`concurrency-test.js`)

Si dispone de Node.js (v18 o superior con `fetch` nativo):

```javascript
// concurrency-test.js
const API_URL = 'https://script.google.com/macros/s/[TU_DEPLOY_ID]/exec?action=reserveSlot';
const TARGET_SLOT = 'SLOT-2026-0928-1600';

async function sendReservation(userLabel, email) {
  const payload = {
    horario_id: TARGET_SLOT,
    nombre: `Expositor Concurrente ${userLabel}`,
    institucion: `Institución ${userLabel}`,
    correo: email,
    telefono: '+502 5000 0000',
    titulo: `Conferencia de Prueba ${userLabel}`,
    descripcion: `Resumen de prueba para evaluar condiciones de carrera en ${userLabel}.`,
    modalidad: 'individual',
    requerimientos: '',
    acepta_tratamiento: true,
    acepta_publicacion: true,
    website_hp: ''
  };

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload)
  });

  return res.json();
}

async function runTest() {
  console.log(`Disparando 2 peticiones concurrentes para ${TARGET_SLOT}...`);
  
  const [resA, resB] = await Promise.all([
    sendReservation('Alfa', 'alfa@test.com'),
    sendReservation('Beta', 'beta@test.com')
  ]);

  console.log('\n--- Resultado Usuario Alfa ---');
  console.log(JSON.stringify(resA, null, 2));

  console.log('\n--- Resultado Usuario Beta ---');
  console.log(JSON.stringify(resB, null, 2));

  const successCount = [resA, resB].filter(r => r.success === true).length;
  const failureCount = [resA, resB].filter(r => r.success === false && r.errorCode === 'SLOT_NOT_AVAILABLE').length;

  console.log('\n========================================');
  console.log(`Reservaciones Aceptadas: ${successCount} (Esperado: 1)`);
  console.log(`Rechazos por No Disponibilidad: ${failureCount} (Esperado: 1)`);
  if (successCount === 1 && failureCount === 1) {
    console.log('✅ PRUEBA EXITOSA: El bloqueo atómico funcionó correctamente.');
  } else {
    console.log('❌ FALLO: Hubo anomalía de concurrencia.');
  }
}

runTest();
```

---

## 4. Criterios de Éxito de la Prueba

1. **Una y solo una petición** debe recibir:
   ```json
   {
     "success": true,
     "message": "¡Reservación confirmada exitosamente!",
     "data": {
       "codigo_reservacion": "CONESIEE-2026-XXXXXXXX",
       "horario_id": "SLOT-..."
     },
     "errorCode": null
   }
   ```
2. **La otra petición** debe recibir:
   ```json
   {
     "success": false,
     "message": "El horario seleccionado ya no se encuentra disponible. Por favor, selecciona otro horario.",
     "data": null,
     "errorCode": "SLOT_NOT_AVAILABLE"
   }
   ```
3. En la hoja **`Reservaciones`** se comprueba que existe exactamente **1 fila** creada para ese horario.
4. En la hoja **`Horarios`** el horario pasa a estado `Reservado` sin corrupciones ni traslapes.
