// categoria-pacientes.js
// Lógica para la gestión de pacientes

document.addEventListener('DOMContentLoaded', () => {
  // Obtener información del usuario
  const params = new URLSearchParams(window.location.search);
  const usuario = params.has('practicante') ? 'practicante' : 'admin';
  const nombre = params.get('nombre') || (usuario === 'admin' ? 'Administrador' : 'Practicante');

  // Mostrar nombre del usuario
  let usuarioActualNombre = '';
  try {
    const usuarioActualLS = JSON.parse(localStorage.getItem('usuarioActual'));
    if (usuarioActualLS && usuarioActualLS.nombre) {
      usuarioActualNombre = usuarioActualLS.nombre;
    }
  } catch (e) {}
  
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) {
    userNameSpan.textContent = usuarioActualNombre || nombre;
  }

  // Actualizar título para practicantes
  const headerTitle = document.getElementById('headerTitle');
  if (headerTitle && usuario === 'practicante') {
    headerTitle.textContent = 'Medical Developer';
  }

  // Lógica del menú de usuario
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
      window.location.href = 'index.html';
    };
  }

  // Configurar botón de volver
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    if (usuario === 'practicante') {
      // Ocultar el botón para practicantes
      backBtn.style.display = 'none';
    } else {
      // Los admins van al menú principal
      backBtn.onclick = function() {
        window.history.back();
      };
    }
  }

  // Manejo de navegación lateral
  const sidebarButtons = document.querySelectorAll('.sidebar-menu button');
  const sections = document.querySelectorAll('.form-section');
  const defaultSection = document.getElementById('default-section');

  sidebarButtons.forEach(button => {
    button.addEventListener('click', function() {
      const targetSection = this.getAttribute('data-section');
      
      // Remover clase active de todos los botones
      sidebarButtons.forEach(btn => btn.classList.remove('active'));
      // Agregar clase active al botón clickeado
      this.classList.add('active');
      
      // Ocultar sección por defecto
      if (defaultSection) {
        defaultSection.style.display = 'none';
      }
      
      // Ocultar todas las secciones
      sections.forEach(section => {
        section.classList.remove('active');
      });
      
      // Mostrar sección seleccionada
      const activeSection = document.getElementById(`${targetSection}-section`);
      if (activeSection) {
        activeSection.classList.add('active');
        
        // Las secciones de pacientes están en desarrollo
      }
    });
  });

  // Las funcionalidades de pacientes están en desarrollo

  // Función para mostrar confirmaciones
  function mostrarConfirmacion(titulo, mensaje) {
    // Crear modal dinámicamente
    const modal = document.createElement('div');
    modal.style.cssText = `
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: linear-gradient(135deg, rgba(125, 211, 252, 0.9), rgba(254, 243, 199, 0.9));
      z-index: 9999;
      justify-content: center;
      align-items: center;
    `;
    
    modal.innerHTML = `
      <div style="
        background: rgba(255, 255, 255, 0.98);
        padding: 30px;
        border-radius: 20px;
        min-width: 350px;
        max-width: 500px;
        text-align: center;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3);
        border: 2px solid rgba(125, 211, 252, 0.4);
        position: relative;
        margin: 20px;
      ">
        <div style="margin-bottom: 20px; font-size: 3rem;">✅</div>
        <h3 style="
          margin: 0 0 15px 0;
          font-size: 1.5rem;
          font-weight: 700;
          color: transparent;
          background: linear-gradient(135deg, #06b6d4, #10b981);
          -webkit-background-clip: text;
          background-clip: text;
        ">${titulo}</h3>
        <p style="
          margin: 0 0 25px 0;
          font-size: 1.1rem;
          color: #374151;
          line-height: 1.5;
        ">${mensaje}</p>
        <button onclick="this.closest('div[style*=\"position: fixed\"]').remove()" style="
          background: linear-gradient(135deg, #7dd3fc, #fef3c7);
          color: #1f2937;
          border: none;
          border-radius: 25px;
          padding: 12px 30px;
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 6px 20px rgba(125, 211, 252, 0.3);
        ">Aceptar</button>
      </div>
    `;
    
    document.body.appendChild(modal);
  }
});