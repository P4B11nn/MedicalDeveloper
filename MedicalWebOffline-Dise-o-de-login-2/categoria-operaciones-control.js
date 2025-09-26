// categoria-operaciones-control.js
// Lógica para operaciones y control

document.addEventListener('DOMContentLoaded', () => {
  // Obtener información del usuario
  const params = new URLSearchParams(window.location.search);
  const usuario = params.has('practicante') ? 'practicante' : 'admin';
  const nombre = params.get('nombre') || (usuario === 'admin' ? 'Administrador' : 'Practicante');

  // Los practicantes no tienen acceso a esta sección
  if (usuario === 'practicante') {
    const nuevoParams = new URLSearchParams();
    if (params.has('practicante')) nuevoParams.set('practicante', 'true');
    if (params.get('nombre')) nuevoParams.set('nombre', params.get('nombre'));
    window.location.href = `categoria-pacientes.html?${nuevoParams.toString()}`;
    return;
  }

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
        
        // Cargar contenido específico según la sección
        if (targetSection === 'registro-entradas-salidas') {
          cargarRegistroEntradasSalidas();
        } else if (targetSection === 'mesas-salud') {
          cargarMesasSalud();
        }
      }
    });
  });

  // Función para cargar registro de entradas y salidas
  function cargarRegistroEntradasSalidas() {
    const registroESLista = document.getElementById('registroESLista');
    if (!registroESLista) return;
    
    let historial = [];
    try {
      historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
    } catch (e) {}
    
    if (historial.length === 0) {
      registroESLista.innerHTML = `
        <div style="text-align: center; color: #6b7280; font-size: 1.1rem; padding: 20px;">
          No hay registros de entradas/salidas.
        </div>
      `;
    } else {
      registroESLista.innerHTML = historial.map(s => `
        <div class="registro-item">
          <h4>${s.nombre || 'Sin nombre'}</h4>
          <p><strong>ID:</strong> ${s.id || 'No especificado'}</p>
          <p><strong>Matrícula:</strong> ${s.matricula || 'No especificada'}</p>
          <p><strong>Número de mesa:</strong> ${s.mesa || 'No especificado'}</p>
          <p><strong>Rol:</strong> ${s.rol || 'No especificado'}</p>
          <p><strong>Entrada:</strong> ${s.entrada || 'No registrada'}</p>
          <p><strong>Salida:</strong> ${s.salida || 'No registrada'}</p>
        </div>
      `).join('');
    }
  }

  // Función para cargar mesas de salud
  function cargarMesasSalud() {
    const mesasGrid = document.getElementById('mesasGrid');
    if (!mesasGrid) return;
    
    // Obtener usuarios para conocer las mesas asignadas
    let usuarios = [];
    try {
      usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    } catch (e) {}
    
    // Obtener historial de servicios para saber quién está activo
    let historial = [];
    try {
      historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
    } catch (e) {}
    
    // Crear un mapa de mesas
    const mesasMap = new Map();
    
    // Inicializar mesas basándose en usuarios registrados
    usuarios.forEach(usuario => {
      if (usuario.mesa) {
        const mesa = parseInt(usuario.mesa);
        if (!mesasMap.has(mesa)) {
          mesasMap.set(mesa, {
            numero: mesa,
            asignado: usuario,
            estado: 'en-servicio',
            ultimaActividad: null
          });
        }
      }
    });
    
    // Verificar estado actual basándose en el historial
    historial.forEach(registro => {
      if (registro.mesa && !registro.salida) {
        // Si hay entrada pero no salida, está ocupada
        const mesa = parseInt(registro.mesa);
        if (mesasMap.has(mesa)) {
          mesasMap.get(mesa).estado = 'ocupada';
          mesasMap.get(mesa).ultimaActividad = registro.entrada;
        }
      }
    });
    
    // Si no hay mesas, mostrar mesas por defecto
    if (mesasMap.size === 0) {
      for (let i = 1; i <= 3; i++) {
        mesasMap.set(i, {
          numero: i,
          asignado: null,
          estado: 'en-servicio',
          ultimaActividad: null
        });
      }
    }
    
    // Renderizar mesas
    const mesasHTML = Array.from(mesasMap.values())
      .sort((a, b) => a.numero - b.numero)
      .map(mesa => {
        let statusClass = mesa.estado;
        let statusText = '';
        
        switch (mesa.estado) {
          case 'en-servicio':
            statusText = 'En Servicio';
            break;
          case 'ocupada':
            statusText = 'Ocupada';
            break;
          case 'fuera-servicio':
            statusText = 'Fuera de servicio';
            break;
          default:
            statusText = 'En Servicio';
            statusClass = 'en-servicio';
        }
        
        return `
          <div class="mesa-item">
            <div class="mesa-numero">Mesa ${mesa.numero}</div>
            <div class="mesa-status ${statusClass}">${statusText}</div>
            <div class="mesa-info">
              ${mesa.asignado ? `
                <p><strong>Asignado a:</strong> ${mesa.asignado.nombre} ${mesa.asignado.apellidos}</p>
                <p><strong>Rol:</strong> ${mesa.asignado.rol === 'admin' ? 'Administrador' : 'Practicante'}</p>
              ` : '<p><strong>Sin asignar</strong></p>'}
              ${mesa.ultimaActividad ? `
                <p><strong>Última actividad:</strong> ${mesa.ultimaActividad}</p>
              ` : ''}
            </div>
          </div>
        `;
      }).join('');
    
    mesasGrid.innerHTML = mesasHTML;
  }
});