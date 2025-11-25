/**
 * 🏥 DASHBOARD HEADER MANAGER
 * Sistema de gestión de encabezados de dashboard con funcionalidad dinámica
 *
 */

class DashboardHeaderManager {
  constructor() {
    this.currentUser = null;
    this.updateInterval = null;
    this.practicantesList = [];
    this.consultasData = {};
    this.turnoData = {};
    this.init();
  }

  /**
   * Inicializa el sistema de encabezados
   */
  init() {
    this.loadUserData();
    this.updateDateTime();
    this.loadDashboardData();
    this.setupEventListeners();
    this.setupUserDataObserver();
    this.startRealTimeUpdates();
    
    console.log('🏥 Dashboard Header Manager inicializado');
  }

  /**
   * Carga los datos del usuario actual
   */
  async loadUserData() {
    try {
      // Obtener datos del usuario desde el sistema de autenticación
      const userData = this.getCurrentUserData();
      this.currentUser = userData;

      // Limpiar y actualizar datos en storage si es necesario
      this.cleanStoredUserData();

      // Actualizar nombres en los encabezados
      this.updateUserNames();
    } catch (error) {
      console.error('Error cargando datos del usuario:', error);
      this.setDefaultUserData();
    }
  }

  /**
   * Limpia los datos del usuario almacenados si contienen caracteres problemáticos
   */
  cleanStoredUserData() {
    try {
      // Limpiar currentUser en localStorage
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.nombre && parsedUser.nombre !== this.cleanUserName(parsedUser.nombre)) {
          parsedUser.nombre = this.cleanUserName(parsedUser.nombre);
          localStorage.setItem('currentUser', JSON.stringify(parsedUser));
          console.log('🧹 Nombre de usuario limpiado en localStorage');
        }
      }

      // Limpiar sessionStorage si existe
      const sessionUser = sessionStorage.getItem('currentUser');
      if (sessionUser) {
        const parsedUser = JSON.parse(sessionUser);
        if (parsedUser.nombre && parsedUser.nombre !== this.cleanUserName(parsedUser.nombre)) {
          parsedUser.nombre = this.cleanUserName(parsedUser.nombre);
          sessionStorage.setItem('currentUser', JSON.stringify(parsedUser));
          console.log('🧹 Nombre de usuario limpiado en sessionStorage');
        }
      }
    } catch (error) {
      console.warn('Error limpiando datos almacenados:', error);
    }
  }

  /**
   * Limpia caracteres especiales y emojis del nombre de usuario
   */
  cleanUserName(name) {
    if (!name) return 'Usuario';
    
    // Remover emojis y caracteres especiales problemáticos
    const cleaned = name
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emojis de caras
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Símbolos y pictogramas
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transporte y símbolos
      .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Símbolos alquímicos
      .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Símbolos geométricos extendidos
      .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Flechas suplementarias
      .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Símbolos misceláneos
      .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Selectores de variación
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Símbolos suplementarios
      .replace(/[👤👑🩺]/g, '')                // Iconos específicos de rol
      .trim();
    
    return cleaned || 'Usuario';
  }

  /**
   * Obtiene los datos del usuario actual
   */
  getCurrentUserData() {
    // Obtener datos del usuario desde el sistema de auth existente
    let userData = {
      nombre: 'Usuario',
      rol: 'administrador',
      turno: 'matutino',
      horaInicio: '08:00',
      horaFin: '16:00'
    };

    // Intentar obtener desde localStorage (sistema existente)
    try {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        userData = { ...userData, ...parsedUser };
      }
    } catch (error) {
      console.warn('Error parsing stored user data:', error);
    }

    // Obtener nombre del elemento global si existe (sistema userDisplayGlobal.js)
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
      const displayText = userNameElement.textContent.trim();
      // Limpiar nombre de caracteres especiales y emojis
      const cleanName = this.cleanUserName(displayText);
      if (cleanName && cleanName !== 'Usuario') {
        userData.nombre = cleanName;
      }
    }

    // Obtener rol del dropdown si existe
    const userRoleElement = document.getElementById('dropdownUserRole');
    if (userRoleElement) {
      const roleText = userRoleElement.textContent.trim().toLowerCase();
      if (roleText && roleText !== 'rol no definido') {
        userData.rol = roleText;
      }
    }

    // Detectar rol basado en el dashboard visible
    const adminDashboard = document.getElementById('admin-dashboard');
    const practitionerDashboard = document.getElementById('practitioner-dashboard');
    
    if (adminDashboard && adminDashboard.style.display !== 'none') {
      userData.rol = 'administrador';
    } else if (practitionerDashboard && practitionerDashboard.style.display !== 'none') {
      userData.rol = 'practicante';
    }

    return userData;
  }

  /**
   * Establece datos de usuario por defecto
   */
  setDefaultUserData() {
    this.currentUser = {
      nombre: 'Usuario',
      rol: 'administrador',
      turno: 'matutino',
      horaInicio: '08:00',
      horaFin: '16:00'
    };
  }

  /**
   * Actualiza los nombres de usuario en los encabezados
   */
  updateUserNames() {
    const adminNameEl = document.getElementById('admin-user-name');
    const practitionerNameEl = document.getElementById('practitioner-user-name');

    if (adminNameEl) {
      const nombreLimpio = this.cleanUserName(this.currentUser.nombre);
      adminNameEl.textContent = this.currentUser.rol === 'administrador' 
        ? nombreLimpio
        : 'Administrador';
    }

    if (practitionerNameEl) {
      // Limpiar nombre de caracteres especiales y emojis
      let nombreLimpio = this.cleanUserName(this.currentUser.nombre);
      
      // Remover prefijos Dr. o Dra. del nombre limpio
      if (nombreLimpio.startsWith('Dr. ') || nombreLimpio.startsWith('Dra. ')) {
        nombreLimpio = nombreLimpio.replace(/^(Dr\.|Dra\.)\s*/, '');
      }
      
      practitionerNameEl.textContent = this.currentUser.rol === 'practicante' 
        ? nombreLimpio 
        : 'Practicante';
    }
  }

  /**
   * Actualiza la fecha y hora actual
   */
  updateDateTime() {
    const now = new Date();
    const options = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    
    const dateStr = now.toLocaleDateString('es-ES', options);
    
    // Actualizar fecha en ambos dashboards
    const adminDateEl = document.getElementById('current-date-admin');
    const practitionerDateEl = document.getElementById('current-date-practitioner');
    
    if (adminDateEl) adminDateEl.textContent = dateStr;
    if (practitionerDateEl) practitionerDateEl.textContent = dateStr;
  }

  /**
   * Carga los datos iniciales del dashboard
   */
  async loadDashboardData() {
    try {
      await Promise.all([
        this.loadPracticantesData(),
        this.loadConsultasData(),
        this.loadTurnoData(),
        this.updateHorarioClinica()
      ]);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
    }
  }

  /**
   * Carga datos de practicantes
   */
  async loadPracticantesData() {
    try {
      // Simular datos de practicantes (integrar con Firebase)
      const practicantesActivos = await this.getPracticantesActivos();
      
      const totalPracticantesEl = document.getElementById('total-practicantes');
      if (totalPracticantesEl) {
        totalPracticantesEl.textContent = practicantesActivos.length;
        totalPracticantesEl.setAttribute('data-stat-value', practicantesActivos.length);
        
        // Animar el contador si existe el sistema de animaciones
        if (window.dashboardAnimations) {
          window.dashboardAnimations.animateCounter(totalPracticantesEl, practicantesActivos.length);
        }
      }

      this.practicantesList = practicantesActivos;
    } catch (error) {
      console.error('Error cargando practicantes:', error);
    }
  }

  /**
   * Obtiene practicantes activos (mock data)
   */
  async getPracticantesActivos() {
    // En el futuro, esto se conectará con Firebase
    const now = new Date();
    const currentHour = now.getHours();
    
    const allPracticantes = [
      { id: 1, nombre: 'Dr. Ana García', turno: 'matutino', activo: false },
      { id: 2, nombre: 'Dr. Luis López', turno: 'vespertino', activo: false },
      { id: 3, nombre: 'Dr. María Rodríguez', turno: 'matutino', activo: false },
      { id: 4, nombre: 'Dr. Carlos Martín', turno: 'nocturno', activo: false },
      { id: 5, nombre: 'Dr. Elena Torres', turno: 'matutino', activo: false },
      { id: 6, nombre: 'Dr. Roberto Silva', turno: 'vespertino', activo: false }
    ];

    // Activar practicantes según el turno actual
    allPracticantes.forEach(practicante => {
      if (currentHour >= 6 && currentHour < 14 && practicante.turno === 'matutino') {
        practicante.activo = true;
      } else if (currentHour >= 14 && currentHour < 22 && practicante.turno === 'vespertino') {
        practicante.activo = true;
      } else if ((currentHour >= 22 || currentHour < 6) && practicante.turno === 'nocturno') {
        practicante.activo = true;
      }
    });

    return allPracticantes.filter(p => p.activo);
  }

  /**
   * Carga datos de consultas
   */
  async loadConsultasData() {
    try {
      const consultasHoy = await this.getConsultasHoy();
      
      const consultasEl = document.getElementById('consultas-hoy');
      if (consultasEl) {
        consultasEl.textContent = consultasHoy.length;
        consultasEl.setAttribute('data-stat-value', consultasHoy.length);
        
        if (window.dashboardAnimations) {
          window.dashboardAnimations.animateCounter(consultasEl, consultasHoy.length);
        }
      }

      this.consultasData = consultasHoy;
    } catch (error) {
      console.error('Error cargando consultas:', error);
    }
  }

  /**
   * Obtiene consultas de hoy (mock data)
   */
  async getConsultasHoy() {
    return [
      { id: 1, paciente: 'Juan Pérez', hora: '09:00', estado: 'completada' },
      { id: 2, paciente: 'Ana López', hora: '10:30', estado: 'en_proceso' },
      { id: 3, paciente: 'Carlos Ruiz', hora: '11:00', estado: 'pendiente' }
    ];
  }

  /**
   * Carga datos del turno actual
   */
  async loadTurnoData() {
    const now = new Date();
    const currentHour = now.getHours();
    
    let turno = 'Matutino';
    let tiempoRestante = '0h 0m';
    let pacientesAsignados = 0;

    // Determinar turno basado en la hora
    if (currentHour >= 6 && currentHour < 14) {
      turno = 'Turno Matutino';
      const finTurno = new Date();
      finTurno.setHours(14, 0, 0, 0);
      tiempoRestante = this.calculateTimeRemaining(now, finTurno);
    } else if (currentHour >= 14 && currentHour < 22) {
      turno = 'Turno Vespertino';
      const finTurno = new Date();
      finTurno.setHours(22, 0, 0, 0);
      tiempoRestante = this.calculateTimeRemaining(now, finTurno);
    } else {
      turno = 'Turno Nocturno';
      const finTurno = new Date();
      finTurno.setDate(finTurno.getDate() + 1);
      finTurno.setHours(6, 0, 0, 0);
      tiempoRestante = this.calculateTimeRemaining(now, finTurno);
    }

    // Simular pacientes asignados
    pacientesAsignados = Math.floor(Math.random() * 8) + 2;

    // Actualizar elementos
    const turnoEl = document.getElementById('turno-actual');
    const tiempoEl = document.getElementById('tiempo-restante');
    const pacientesEl = document.getElementById('pacientes-asignados');

    if (turnoEl) turnoEl.textContent = turno;
    if (tiempoEl) tiempoEl.textContent = tiempoRestante;
    if (pacientesEl) {
      pacientesEl.textContent = pacientesAsignados;
      pacientesEl.setAttribute('data-stat-value', pacientesAsignados);
    }

    this.turnoData = { turno, tiempoRestante, pacientesAsignados };
  }

  /**
   * Calcula el tiempo restante entre dos fechas
   */
  calculateTimeRemaining(start, end) {
    const diff = end - start;
    if (diff <= 0) return '0h 0m restantes';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m restantes`;
  }

  /**
   * Actualiza el horario de la clínica
   */
  updateHorarioClinica() {
    const horarioEl = document.getElementById('horario-actual');
    if (horarioEl) {
      const horario = this.currentUser?.horaInicio && this.currentUser?.horaFin 
        ? `${this.currentUser.horaInicio} - ${this.currentUser.horaFin}`
        : '08:00 - 18:00';
      
      horarioEl.textContent = horario;
    }
  }

  /**
   * Configura observer para cambios en datos de usuario
   */
  setupUserDataObserver() {
    // Observar cambios en localStorage
    window.addEventListener('storage', (e) => {
      if (e.key === 'currentUser') {
        this.loadUserData();
      }
    });

    // Observar cambios en el elemento userName
    const userNameElement = document.getElementById('userName');
    if (userNameElement) {
      const observer = new MutationObserver(() => {
        this.loadUserData();
      });
      
      observer.observe(userNameElement, { 
        childList: true, 
        subtree: true, 
        characterData: true 
      });
    }

    // Observar cambios en dashboards (cuando se cambia de rol)
    const dashboards = document.querySelectorAll('.role-dashboard');
    dashboards.forEach(dashboard => {
      const observer = new MutationObserver(() => {
        if (dashboard.style.display !== 'none') {
          this.loadUserData();
        }
      });
      
      observer.observe(dashboard, { 
        attributes: true, 
        attributeFilter: ['style'] 
      });
    });
  }

  /**
   * Configura los event listeners para elementos interactivos
   */
  setupEventListeners() {
    // Estadística de practicantes
    const practicantesStatEl = document.getElementById('practicantes-stat');
    if (practicantesStatEl) {
      practicantesStatEl.addEventListener('click', () => {
        this.showPracticantesList();
      });
    }

    // Estadística de consultas
    const consultasStatEl = document.getElementById('consultas-stat');
    if (consultasStatEl) {
      consultasStatEl.addEventListener('click', () => {
        this.showConsultasList();
      });
    }

    // Estadística de horario
    const horarioStatEl = document.getElementById('horario-stat');
    if (horarioStatEl) {
      horarioStatEl.addEventListener('click', () => {
        this.showHorarioConfig();
      });
    }

    // Estadística de turno
    const turnoStatEl = document.getElementById('turno-stat');
    if (turnoStatEl) {
      turnoStatEl.addEventListener('click', () => {
        this.showTurnoConfig();
      });
    }

    // Estadística de tiempo
    const tiempoStatEl = document.getElementById('tiempo-stat');
    if (tiempoStatEl) {
      tiempoStatEl.addEventListener('click', () => {
        this.showHorarioCompleto();
      });
    }

    // Estadística de pacientes asignados
    const pacientesAsignadosEl = document.getElementById('pacientes-asignados-stat');
    if (pacientesAsignadosEl) {
      pacientesAsignadosEl.addEventListener('click', () => {
        this.showPacientesAsignados();
      });
    }
  }

  /**
   * Muestra la lista de practicantes
   */
  showPracticantesList() {
    const modalContent = `
      <div class="modal-header">
        <h3><i class="fas fa-users"></i> Practicantes Activos</h3>
        <button class="close-btn" onclick="this.closest('.info-modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="practicantes-list">
          ${this.practicantesList.map(p => `
            <div class="practicante-item ${p.activo ? 'active' : 'inactive'}">
              <div class="practicante-info">
                <strong>${p.nombre}</strong>
                <span class="turno-badge">${p.turno}</span>
              </div>
              <div class="status-indicator ${p.activo ? 'active' : 'inactive'}">
                ${p.activo ? 'Activo' : 'Inactivo'}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.showInfoModal(modalContent);
  }

  /**
   * Muestra la lista de consultas
   */
  showConsultasList() {
    const modalContent = `
      <div class="modal-header">
        <h3><i class="fas fa-heartbeat"></i> Consultas de Hoy</h3>
        <button class="close-btn" onclick="this.closest('.info-modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="consultas-list">
          ${this.consultasData.map(c => `
            <div class="consulta-item ${c.estado}">
              <div class="consulta-info">
                <strong>${c.paciente}</strong>
                <span class="hora">${c.hora}</span>
              </div>
              <div class="estado-badge ${c.estado}">
                ${this.getEstadoLabel(c.estado)}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.showInfoModal(modalContent);
  }

  /**
   * Obtiene la etiqueta del estado de consulta
   */
  getEstadoLabel(estado) {
    const labels = {
      'completada': 'Completada',
      'en_proceso': 'En Proceso',
      'pendiente': 'Pendiente'
    };
    return labels[estado] || estado;
  }

  /**
   * Muestra configuración de horario
   */
  showHorarioConfig() {
    if (window.showAnimatedNotification) {
      window.showAnimatedNotification('Función de configuración de horario próximamente', 'info');
    }
  }

  /**
   * Muestra configuración de turno
   */
  showTurnoConfig() {
    if (window.showAnimatedNotification) {
      window.showAnimatedNotification('Configuración de turno disponible próximamente', 'info');
    }
  }

  /**
   * Muestra horario completo
   */
  showHorarioCompleto() {
    const modalContent = `
      <div class="modal-header">
        <h3><i class="fas fa-clock"></i> Horario Completo</h3>
        <button class="close-btn" onclick="this.closest('.info-modal').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="modal-body">
        <div class="horario-completo">
          <div class="turno-info">
            <strong>Turno Actual:</strong> ${this.turnoData.turno}
          </div>
          <div class="tiempo-info">
            <strong>Tiempo Restante:</strong> ${this.turnoData.tiempoRestante}
          </div>
          <div class="horarios-turnos">
            <h4>Horarios de Turnos:</h4>
            <div class="turno-item">
              <span>🌅 Matutino:</span> 06:00 - 14:00
            </div>
            <div class="turno-item">
              <span>🌇 Vespertino:</span> 14:00 - 22:00
            </div>
            <div class="turno-item">
              <span>🌙 Nocturno:</span> 22:00 - 06:00
            </div>
          </div>
        </div>
      </div>
    `;

    this.showInfoModal(modalContent);
  }

  /**
   * Muestra pacientes asignados
   */
  showPacientesAsignados() {
    if (window.showAnimatedNotification) {
      window.showAnimatedNotification(`Tienes ${this.turnoData.pacientesAsignados} pacientes asignados`, 'info');
    }
  }

  /**
   * Muestra un modal de información
   */
  showInfoModal(content) {
    const modal = document.createElement('div');
    modal.className = 'info-modal';
    modal.innerHTML = content;

    // Estilos del modal
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
      z-index: 10000;
      max-width: 500px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      animation: modalSlideIn 0.3s ease;
    `;

    // Overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      animation: fadeIn 0.3s ease;
    `;

    overlay.addEventListener('click', () => {
      overlay.remove();
      modal.remove();
    });

    document.body.appendChild(overlay);
    document.body.appendChild(modal);
  }

  /**
   * Inicia actualizaciones en tiempo real
   */
  startRealTimeUpdates() {
    // Actualizar cada minuto
    this.updateInterval = setInterval(() => {
      this.updateDateTime();
      this.loadTurnoData();
      
      // Actualizar datos cada 5 minutos
      if (Date.now() % (5 * 60 * 1000) < 60000) {
        this.loadDashboardData();
      }
    }, 60000);
  }

  /**
   * Limpia los recursos
   */
  cleanup() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}

// Estilos CSS para los modales
const headerStyles = `
<style id="dashboard-header-styles">
  @keyframes modalSlideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -60%);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%);
    }
  }

  .info-modal .modal-header {
    padding: 20px;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .info-modal .modal-header h3 {
    margin: 0;
    color: #374151;
    font-size: 1.2rem;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .info-modal .close-btn {
    background: none;
    border: none;
    font-size: 1.2rem;
    color: #6b7280;
    cursor: pointer;
    padding: 5px;
    border-radius: 4px;
    transition: all 0.2s ease;
  }

  .info-modal .close-btn:hover {
    background: #f3f4f6;
    color: #374151;
  }

  .info-modal .modal-body {
    padding: 20px;
  }

  .practicante-item, .consulta-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    margin-bottom: 8px;
    background: #f9fafb;
    border-radius: 8px;
    border-left: 4px solid #e5e7eb;
  }

  .practicante-item.active {
    border-left-color: #10b981;
  }

  .consulta-item.completada {
    border-left-color: #10b981;
  }

  .consulta-item.en_proceso {
    border-left-color: #f59e0b;
  }

  .consulta-item.pendiente {
    border-left-color: #6b7280;
  }

  .turno-badge, .estado-badge {
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .turno-badge {
    background: #dbeafe;
    color: #1e40af;
  }

  .estado-badge.completada {
    background: #d1fae5;
    color: #065f46;
  }

  .estado-badge.en_proceso {
    background: #fef3c7;
    color: #92400e;
  }

  .estado-badge.pendiente {
    background: #f3f4f6;
    color: #374151;
  }

  .status-indicator.active {
    color: #10b981;
    font-weight: 500;
  }

  .status-indicator.inactive {
    color: #6b7280;
  }

  .horario-completo {
    text-align: center;
  }

  .turno-info, .tiempo-info {
    margin-bottom: 15px;
    padding: 10px;
    background: #f8fafc;
    border-radius: 6px;
  }

  .horarios-turnos {
    margin-top: 20px;
  }

  .turno-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 12px;
    margin-bottom: 4px;
    background: white;
    border-radius: 4px;
    border: 1px solid #e5e7eb;
  }
</style>
`;

// Insertar estilos
document.head.insertAdjacentHTML('beforeend', headerStyles);

// Auto-inicialización
window.DashboardHeaderManager = DashboardHeaderManager;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.dashboardHeaderManager = new DashboardHeaderManager();
  });
} else {
  window.dashboardHeaderManager = new DashboardHeaderManager();
}

console.log('🏥 Dashboard Header Manager cargado');
