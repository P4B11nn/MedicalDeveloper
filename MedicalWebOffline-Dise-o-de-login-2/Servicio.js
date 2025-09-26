// Servicio.js
// Lógica para iniciar y cerrar servicio

document.addEventListener('DOMContentLoaded', () => {
  const startServiceBtn = document.getElementById('startServiceBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  let usuarioActual = null;
  try {
    usuarioActual = JSON.parse(localStorage.getItem('usuarioActual'));
  } catch (e) {}

  // Estado del servicio
  let servicioActivo = false;
  let servicioData = null;
  // Verificar si hay servicio activo
  try {
    servicioData = JSON.parse(localStorage.getItem('servicioActual'));
    if (servicioData && servicioData.salida === '') {
      servicioActivo = true;
    }
  } catch (e) {}

  function getFechaHora() {
    const now = new Date();
    return now.toLocaleString();
  }

  function iniciarServicio() {
    if (!usuarioActual) return;
    const nuevoServicio = {
      id: usuarioActual.id || '',
      nombre: usuarioActual.nombre || '',
      matricula: usuarioActual.matricula || '',
      mesa: usuarioActual.mesa || '',
      entrada: getFechaHora(),
      salida: '',
      rol: usuarioActual.rol || ''
    };
    localStorage.setItem('servicioActual', JSON.stringify(nuevoServicio));
    servicioActivo = true;
    actualizarBoton();
  }

  function cerrarServicio() {
    if (!servicioActivo) return;
    let servicio = null;
    try {
      servicio = JSON.parse(localStorage.getItem('servicioActual'));
    } catch (e) {}
    if (servicio) {
      servicio.salida = getFechaHora();
      localStorage.setItem('servicioActual', JSON.stringify(servicio));
      // Guardar en historial
      let historial = [];
      try {
        historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
      } catch (e) {}
      historial.push(servicio);
      localStorage.setItem('servicioHistorial', JSON.stringify(historial));
      localStorage.removeItem('servicioActual');
    }
    servicioActivo = false;
    actualizarBoton();
  }

  function actualizarBoton() {
    if (startServiceBtn) {
      startServiceBtn.textContent = servicioActivo ? 'Cerrar servicio' : 'Iniciar servicio';
    }
  }

  if (startServiceBtn) {
    actualizarBoton();
    startServiceBtn.onclick = function() {
      if (!servicioActivo) {
        iniciarServicio();
      } else {
        cerrarServicio();
      }
    };
  }

  if (logoutBtn) {
    const originalLogout = logoutBtn.onclick;
    logoutBtn.onclick = function() {
      if (servicioActivo) {
        cerrarServicio();
      }
      if (typeof originalLogout === 'function') {
        originalLogout();
      } else {
        window.location.href = 'index.html';
      }
    };
  }
});
