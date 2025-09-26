// MenuInicio.js
// Lógica principal del menú de inicio

// Detecta el tipo de usuario y nombre por parámetro en la URL
const params = new URLSearchParams(window.location.search);
const usuario = params.has('practicante') ? 'practicante' : 'admin';
const nombre = params.get('nombre') || (usuario === 'admin' ? 'Administrador' : 'Practicante');

// Los practicantes son redirigidos automáticamente a pacientes

document.addEventListener('DOMContentLoaded', () => {
  // Mostrar nombre del usuario junto al icono
  let usuarioActualNombre = '';
  try {
    const usuarioActualLS = JSON.parse(localStorage.getItem('usuarioActual'));
    if (usuarioActualLS && usuarioActualLS.nombre) {
      usuarioActualNombre = usuarioActualLS.nombre;
    }
  } catch (e) {}
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) {
    userNameSpan.textContent = usuarioActualNombre;
  }
  // Cargar modales externos
  // Abrir modal de nuevo usuario solo para admin
  const btnNuevoUsuario = document.getElementById('btnNuevoUsuario');
  const modalUsuario = document.getElementById('modalUsuario');
  const cancelarUsuario = document.getElementById('cancelarUsuario');
  const formUsuario = document.getElementById('formUsuario');
  if (btnNuevoUsuario && modalUsuario && cancelarUsuario && formUsuario && usuario === 'admin') {
    btnNuevoUsuario.onclick = function() {
      modalUsuario.style.display = 'flex';
    };
    cancelarUsuario.onclick = function() {
      modalUsuario.style.display = 'none';
      formUsuario.reset();
    };
    formUsuario.onsubmit = function(e) {
      e.preventDefault();
      // Obtener datos del formulario
      const datos = Object.fromEntries(new FormData(formUsuario).entries());
      // Guardar en localStorage
      let usuarios = [];
      try {
        usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
      } catch (err) {}
      usuarios.push(datos);
      localStorage.setItem('usuarios', JSON.stringify(usuarios));
      modalUsuario.style.display = 'none';
      formUsuario.reset();
      mostrarConfirmacion('¡Usuario Registrado!', 'El usuario ha sido registrado correctamente en el sistema.');
    };
  }
  // Mensaje de bienvenida
  let usuarioActual = null;
  try {
    usuarioActual = JSON.parse(localStorage.getItem('usuarioActual'));
  } catch (e) {}
  let nombreBienvenida = usuarioActual && usuarioActual.nombre ? usuarioActual.nombre : (usuario === 'admin' ? 'Administrador' : 'Practicante');
  document.querySelector('h2').innerText = `Bienvenido ${nombreBienvenida}`;

  // Si es practicante, redirigir directamente a pacientes
  if (usuario === 'practicante') {
    const params = new URLSearchParams(window.location.search);
    const nuevoParams = new URLSearchParams();
    
    // Preservar parámetros de usuario
    if (params.has('practicante')) nuevoParams.set('practicante', 'true');
    if (params.get('nombre')) nuevoParams.set('nombre', params.get('nombre'));
    
    // Redirigir automáticamente a pacientes
    window.location.href = `categoria-pacientes.html?${nuevoParams.toString()}`;
    return; // Evitar que se ejecute el resto del código
  }

  // Mostrar/ocultar botones según el rol (solo para admin)
  document.querySelectorAll('.menu button').forEach(btn => {
    btn.style.display = 'flex';
  });

  // Manejar clics en categorías
  document.querySelectorAll('.menu button[data-category]').forEach(btn => {
    btn.addEventListener('click', function() {
      const categoria = this.getAttribute('data-category');
      const params = new URLSearchParams(window.location.search);
      const nuevoParams = new URLSearchParams();
      
      // Preservar parámetros de usuario
      if (params.has('practicante')) nuevoParams.set('practicante', 'true');
      if (params.get('nombre')) nuevoParams.set('nombre', params.get('nombre'));
      
      // Redirigir a la página de la categoría
      window.location.href = `categoria-${categoria}.html?${nuevoParams.toString()}`;
    });
  });

  // Lógica del icono de usuario y logout
  const userIcon = document.getElementById('userIcon');
  const userDropdown = document.getElementById('userDropdown');
  const logoutBtn = document.getElementById('logoutBtn');
  if (userIcon && userDropdown) {
    userIcon.onclick = function(e) {
      userDropdown.style.display = userDropdown.style.display === 'none' ? 'block' : 'none';
      e.stopPropagation();
    };
    document.body.addEventListener('click', function() {
      userDropdown.style.display = 'none';
    });
  }
  if (logoutBtn) {
    logoutBtn.onclick = function() {
      window.location.href = 'index.html'; // Redirige al login
    };
  }

  // Función para mostrar modal de confirmación personalizado
  window.mostrarConfirmacion = function(titulo, mensaje) {
    const modal = document.getElementById('modalConfirmacion');
    const tituloEl = document.getElementById('tituloConfirmacion');
    const mensajeEl = document.getElementById('mensajeConfirmacion');
    const btnAceptar = document.getElementById('btnAceptarConfirmacion');
    
    tituloEl.textContent = titulo || '¡Éxito!';
    mensajeEl.textContent = mensaje || 'Operación completada correctamente';
    
    modal.style.display = 'flex';
    
    btnAceptar.onclick = function() {
      modal.style.display = 'none';
    };
  };
});
