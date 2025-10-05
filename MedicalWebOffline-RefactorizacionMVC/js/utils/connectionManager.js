/**
 * Gestor de conexión a internet para el sistema médico
 * Maneja el estado de conexión y proporciona funcionalidad offline/online
 */

class ConnectionManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.pendingOperations = [];
    this.connectionStatusElement = null;
    this.initializeConnectionMonitoring();
    this.createConnectionStatusUI();
  }

  initializeConnectionMonitoring() {
    // Escuchar eventos de conexión
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Verificar conexión periódicamente
    setInterval(() => this.checkConnection(), 30000); // Cada 30 segundos
    
    // Verificar conexión inicial
    this.checkConnection();
  }

  createConnectionStatusUI() {
    // Crear elemento de estado de conexión
    const statusDiv = document.createElement('div');
    statusDiv.id = 'connection-status';
    statusDiv.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 10000;
      padding: 8px 16px;
      text-align: center;
      font-weight: 600;
      font-size: 14px;
      transition: all 0.3s ease;
      transform: translateY(-100%);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(statusDiv);
    this.connectionStatusElement = statusDiv;
    
    // Configurar estado inicial
    this.updateConnectionStatus();
  }

  async checkConnection() {
    try {
      // Intentar hacer una petición a Firebase
      const response = await fetch('https://www.google.com/favicon.ico', {
        mode: 'no-cors',
        cache: 'no-cache'
      });
      
      const wasOnline = this.isOnline;
      this.isOnline = true;
      
      if (!wasOnline && this.isOnline) {
        this.handleOnline();
      }
    } catch (error) {
      const wasOnline = this.isOnline;
      this.isOnline = false;
      
      if (wasOnline && !this.isOnline) {
        this.handleOffline();
      }
    }
  }

  handleOnline() {
    console.log('🌐 Conexión a internet restaurada');
    this.isOnline = true;
    this.updateConnectionStatus();
    
    // Emitir evento global
    if (window.EventBus) {
      window.EventBus.emit('connection:online');
    }
    
    // Procesar operaciones pendientes
    this.processPendingOperations();
    
    // Mostrar notificación temporal
    this.showConnectionMessage('🌐 Conexión restaurada - Sincronizando datos...', 'success');
  }

  handleOffline() {
    console.log('📵 Conexión a internet perdida');
    this.isOnline = false;
    this.updateConnectionStatus();
    
    // Emitir evento global
    if (window.EventBus) {
      window.EventBus.emit('connection:offline');
    }
    
    // Mostrar mensaje persistente
    this.showConnectionMessage('📵 Sin conexión - Trabajando en modo offline', 'warning', true);
  }

  updateConnectionStatus() {
    if (!this.connectionStatusElement) return;
    
    if (this.isOnline) {
      this.connectionStatusElement.style.transform = 'translateY(-100%)';
    } else {
      this.connectionStatusElement.style.transform = 'translateY(0)';
      this.connectionStatusElement.style.background = 'linear-gradient(135deg, #f59e0b, #d97706)';
      this.connectionStatusElement.style.color = 'white';
      this.connectionStatusElement.innerHTML = `
        <i class="fas fa-wifi" style="margin-right: 8px;"></i>
        Sin conexión a internet - Trabajando en modo offline
        <i class="fas fa-exclamation-triangle" style="margin-left: 8px;"></i>
      `;
    }
  }

  showConnectionMessage(message, type = 'info', persistent = false) {
    if (!this.connectionStatusElement) return;
    
    const colors = {
      success: 'linear-gradient(135deg, #10b981, #059669)',
      warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
      error: 'linear-gradient(135deg, #ef4444, #dc2626)',
      info: 'linear-gradient(135deg, #3b82f6, #2563eb)'
    };
    
    this.connectionStatusElement.style.background = colors[type];
    this.connectionStatusElement.style.color = 'white';
    this.connectionStatusElement.style.transform = 'translateY(0)';
    this.connectionStatusElement.innerHTML = message;
    
    if (!persistent) {
      setTimeout(() => {
        this.connectionStatusElement.style.transform = 'translateY(-100%)';
      }, 4000);
    }
  }

  // Agregar operación a la cola offline
  addPendingOperation(operation) {
    console.log('📋 Agregando operación a cola offline:', operation);
    this.pendingOperations.push({
      ...operation,
      timestamp: new Date(),
      id: Date.now() + Math.random()
    });
    
    // Guardar en localStorage para persistencia
    this.savePendingOperations();
    
    return operation.id || this.pendingOperations[this.pendingOperations.length - 1].id;
  }

  // Procesar operaciones pendientes cuando se restaure la conexión
  async processPendingOperations() {
    if (this.pendingOperations.length === 0) return;
    
    console.log(`🔄 Procesando ${this.pendingOperations.length} operaciones pendientes`);
    
    const operations = [...this.pendingOperations];
    this.pendingOperations = [];
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        successCount++;
      } catch (error) {
        console.error('Error procesando operación pendiente:', error);
        errorCount++;
        // Volver a agregar a la cola si falla
        this.pendingOperations.push(operation);
      }
    }
    
    this.savePendingOperations();
    
    if (successCount > 0) {
      this.showConnectionMessage(
        `✅ ${successCount} operaciones sincronizadas correctamente`,
        'success'
      );
    }
    
    if (errorCount > 0) {
      this.showConnectionMessage(
        `⚠️ ${errorCount} operaciones fallaros al sincronizar`,
        'warning'
      );
    }
  }

  async executeOperation(operation) {
    const { type, data, callback } = operation;
    
    switch (type) {
      case 'create_patient':
        if (window.PacienteModel && window.PacienteModel.createPaciente) {
          const result = await window.PacienteModel.createPaciente(data);
          if (callback) callback(null, result);
          return result;
        }
        break;
        
      case 'update_patient':
        if (window.PacienteModel && window.PacienteModel.updatePaciente) {
          const result = await window.PacienteModel.updatePaciente(data.id, data.updates);
          if (callback) callback(null, result);
          return result;
        }
        break;
        
      case 'create_medical_record':
        if (window.PacienteModel && window.PacienteModel.createMedicalRecord) {
          const result = await window.PacienteModel.createMedicalRecord(data);
          if (callback) callback(null, result);
          return result;
        }
        break;
        
      default:
        throw new Error(`Tipo de operación no soportada: ${type}`);
    }
  }

  savePendingOperations() {
    try {
      localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Error guardando operaciones pendientes:', error);
    }
  }

  loadPendingOperations() {
    try {
      const saved = localStorage.getItem('pendingOperations');
      if (saved) {
        this.pendingOperations = JSON.parse(saved);
        console.log(`📋 Cargadas ${this.pendingOperations.length} operaciones pendientes`);
      }
    } catch (error) {
      console.error('Error cargando operaciones pendientes:', error);
      this.pendingOperations = [];
    }
  }

  // Métodos públicos para verificar estado
  get online() {
    return this.isOnline;
  }

  get offline() {
    return !this.isOnline;
  }

  getPendingOperationsCount() {
    return this.pendingOperations.length;
  }
}

// Crear instancia global
window.ConnectionManager = new ConnectionManager();

// Cargar operaciones pendientes al inicializar
window.ConnectionManager.loadPendingOperations();

console.log('🌐 ConnectionManager inicializado');

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ConnectionManager;
}