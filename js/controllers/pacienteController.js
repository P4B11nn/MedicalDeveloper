// js/controllers/pacienteController.js
import { authModel } from '../models/storageModel.js';
import { pacienteModel } from '../models/pacienteModel.js';
import { renderPacienteForm, renderHistorialMedico, renderCitas } from '../views/pacienteView.js';

// Función para mostrar confirmaciones
function mostrarConfirmacion(titulo, mensaje, callback = null) {
  const modalConfirmacion = document.createElement('div');
  modalConfirmacion.style.cssText = `
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: linear-gradient(135deg, rgba(125, 211, 252, 0.9), rgba(254, 243, 199, 0.9)), url('img/medical-background.png?v=1') center center / cover no-repeat;
    z-index: 9999;
    justify-content: center;
    align-items: center;
  `;
  
  modalConfirmacion.innerHTML = `
    <div style="background: rgba(255, 255, 255, 0.98); padding: 30px; border-radius: 20px; min-width: 350px; max-width: 500px; text-align: center; box-shadow: 0 25px 60px rgba(0, 0, 0, 0.3); border: 2px solid rgba(125, 211, 252, 0.4); position: relative; margin: 20px;">
      <div style="margin-bottom: 20px; font-size: 3rem;">✅</div>
      <h3 id="tituloConfirmacion" style="margin: 0 0 15px 0; font-size: 1.5rem; font-weight: 700; color: transparent; background: linear-gradient(135deg, #06b6d4, #10b981); -webkit-background-clip: text; background-clip: text;">${titulo}</h3>
      <p id="mensajeConfirmacion" style="margin: 0 0 25px 0; font-size: 1.1rem; color: #374151; line-height: 1.5;">${mensaje}</p>
      <button id="btnAceptarConfirmacion" style="background: linear-gradient(135deg, #7dd3fc, #fef3c7); color: #1f2937; border: none; border-radius: 25px; padding: 12px 30px; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 6px 20px rgba(125, 211, 252, 0.3);">Aceptar</button>
    </div>
  `;
  
  document.body.appendChild(modalConfirmacion);
  
  // Configurar el botón de aceptar
  const btnAceptarConfirmacion = modalConfirmacion.querySelector('#btnAceptarConfirmacion');
  btnAceptarConfirmacion.onclick = () => {
    document.body.removeChild(modalConfirmacion);
    if (callback && typeof callback === 'function') {
      callback();
    }
  };
}

export function initPacienteController() {
  // Obtener información del usuario actual
  const usuarioActual = authModel.getCurrentUser();
  if (!usuarioActual) {
    window.location.href = 'index.html';
    return;
  }

  // Configurar elementos de usuario
  const userNameSpan = document.getElementById('userName');
  if (userNameSpan) {
    const rolIcon = usuarioActual.rol === 'admin' ? '👑 ' : '👤 ';
    userNameSpan.innerHTML = `${rolIcon}${usuarioActual.nombre}`;
  }

  // Configurar dropdown del usuario
  const userIcon = document.getElementById('userIcon');
  const userDropdown = document.getElementById('userDropdown');
  
  if (userIcon && userDropdown) {
    userIcon.addEventListener('click', (e) => {
      userDropdown.style.display = userDropdown.style.display === 'block' ? 'none' : 'block';
      e.stopPropagation();
    });
    
    // Cerrar dropdown al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!userIcon.contains(e.target) && !userDropdown.contains(e.target)) {
        userDropdown.style.display = 'none';
      }
    });
  }
  
  // Configurar botón de cierre de sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      mostrarConfirmacion('Cerrar sesión', '¿Estás seguro de que deseas cerrar sesión?', () => {
        authModel.logout();
        window.location.href = 'index.html';
      });
    };
  }
  
  // Configurar botón de volver al menú
  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.onclick = () => {
      window.location.href = 'menuInicio.html';
    };
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
        
        // Cargar contenido según la sección
        switch (targetSection) {
          case 'historial':
            renderHistorialMedico();
            break;
          case 'nuevo-paciente':
            renderPacienteForm();
            break;
          case 'citas':
            renderCitas();
            break;
        }
      }
    });
  });

  // Iniciar la vista por defecto (Historial)
  const historialBtn = document.querySelector('[data-section="historial"]');
  if (historialBtn) {
    historialBtn.click();
  }
}

// Funciones para manejar formularios de pacientes
export function handlePacienteSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const pacienteData = Object.fromEntries(formData.entries());
  
  // Validar campos obligatorios
  const camposRequeridos = ['nombre', 'apellidos', 'fechaNacimiento', 'genero', 'telefono'];
  const camposFaltantes = camposRequeridos.filter(campo => !pacienteData[campo]);
  
  if (camposFaltantes.length > 0) {
    mostrarConfirmacion('Error', `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`);
    return;
  }
  
  // Guardar paciente
  const resultado = pacienteModel.addPaciente(pacienteData);
  
  if (resultado.success) {
    mostrarConfirmacion('Éxito', resultado.message, () => {
      // Limpiar formulario
      event.target.reset();
      
      // Recargar vista de historial
      renderHistorialMedico();
      
      // Ir a la sección de historial
      const historialBtn = document.querySelector('[data-section="historial"]');
      if (historialBtn) {
        historialBtn.click();
      }
    });
  } else {
    mostrarConfirmacion('Error', resultado.message);
  }
}

// Funciones para manejar citas
export function handleCitaSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const citaData = Object.fromEntries(formData.entries());
  
  // Validar campos obligatorios
  const camposRequeridos = ['pacienteId', 'fecha', 'motivo'];
  const camposFaltantes = camposRequeridos.filter(campo => !citaData[campo]);
  
  if (camposFaltantes.length > 0) {
    mostrarConfirmacion('Error', `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`);
    return;
  }
  
  // Guardar cita
  const resultado = pacienteModel.addCita(citaData);
  
  if (resultado.success) {
    mostrarConfirmacion('Éxito', resultado.message, () => {
      // Limpiar formulario
      event.target.reset();
      
      // Recargar vista de citas
      renderCitas();
    });
  } else {
    mostrarConfirmacion('Error', resultado.message);
  }
}

// Funciones para manejar registros de historial
export function handleHistorialSubmit(event) {
  event.preventDefault();
  
  const formData = new FormData(event.target);
  const historialData = Object.fromEntries(formData.entries());
  
  // Validar campos obligatorios
  const camposRequeridos = ['pacienteId', 'fecha', 'diagnostico', 'tratamiento'];
  const camposFaltantes = camposRequeridos.filter(campo => !historialData[campo]);
  
  if (camposFaltantes.length > 0) {
    mostrarConfirmacion('Error', `Los siguientes campos son obligatorios: ${camposFaltantes.join(', ')}`);
    return;
  }
  
  // Guardar registro de historial
  const resultado = pacienteModel.addHistorial(historialData);
  
  if (resultado.success) {
    mostrarConfirmacion('Éxito', resultado.message, () => {
      // Limpiar formulario
      event.target.reset();
      
      // Recargar vista de historial
      renderHistorialMedico();
    });
  } else {
    mostrarConfirmacion('Error', resultado.message);
  }
}