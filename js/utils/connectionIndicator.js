/**
 * ConnectionIndicator - Componente para mostrar el estado de conexión a internet
 * Detecta cambios en la conectividad y muestra indicadores visuales
 */

class ConnectionIndicator {
  constructor() {
    this.isOnline = navigator.onLine;
    this.indicator = null;
    this.isChecking = false; // Evitar múltiples verificaciones simultáneas
    this.onConnectionRestoredCallbacks = []; // Callbacks para cuando se restaure la conexión
    this.init();
  }

  init() {
    this.createIndicator();
    this.bindEvents();

    // Estado inicial basado en navigator.onLine
    this.isOnline = navigator.onLine;
    this.updateIndicator();

    // Si está offline desde el inicio, mostrar el indicador inmediatamente
    if (!this.isOnline) {
      this.showIndicator();
    }

    // Verificación inicial después de un breve delay
    setTimeout(() => {
      if (navigator.onLine) {
        this.verifyOnlineStatus();
      } else {
        this.verifyOfflineStatus();
      }
    }, 2000);
  }

  createIndicator() {
    // Crear el contenedor del indicador
    this.indicator = document.createElement('div');
    this.indicator.id = 'connection-indicator';
    this.indicator.className = 'connection-indicator';

    // Crear el contenido del indicador
    this.indicator.innerHTML = `
      <div class="connection-status">
        <i class="fas fa-wifi"></i>
        <span class="connection-text">Conectado</span>
      </div>
    `;

    // Agregar al DOM
    document.body.appendChild(this.indicator);

    // Agregar estilos
    this.addStyles();
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .connection-indicator {
        position: fixed;
        top: 80px; /* Debajo del header */
        right: 20px;
        z-index: 9999;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 25px;
        padding: 8px 16px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.3s ease;
        font-size: 14px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateY(-10px);
        pointer-events: none;
      }

      .connection-indicator.visible {
        opacity: 1;
        transform: translateY(0);
        pointer-events: auto;
      }

      .connection-indicator.online {
        background: rgba(34, 197, 94, 0.1);
        border-color: rgba(34, 197, 94, 0.3);
        color: #16a34a;
      }

      .connection-indicator.offline {
        background: rgba(239, 68, 68, 0.1);
        border-color: rgba(239, 68, 68, 0.3);
        color: #dc2626;
        animation: pulse 2s infinite;
      }

      .connection-indicator.reconnecting {
        background: rgba(245, 158, 11, 0.1);
        border-color: rgba(245, 158, 11, 0.3);
        color: #d97706;
      }

      .connection-status {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .connection-status i {
        font-size: 16px;
      }

      .connection-indicator.offline i:before {
        content: "\\f6ab"; /* fa-wifi-slash */
      }

      .connection-indicator.reconnecting i:before {
        content: "\\f1ce"; /* fa-spinner */
        animation: spin 1s linear infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .connection-indicator.just-reconnected {
        animation: bounceIn 0.5s ease-out;
        box-shadow: 0 6px 20px rgba(34, 197, 94, 0.3);
      }

      @keyframes bounceIn {
        0% {
          transform: translateY(-20px) scale(0.8);
          opacity: 0;
        }
        50% {
          transform: translateY(0) scale(1.05);
        }
        100% {
          transform: translateY(0) scale(1);
          opacity: 1;
        }
      }

      /* Responsive */
      @media (max-width: 768px) {
        .connection-indicator {
          top: 70px;
          right: 10px;
          left: 10px;
          font-size: 13px;
          padding: 6px 12px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    // Eventos de conexión del navegador
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());

    // Verificar conexión periódicamente solo si está online según navigator.onLine
    setInterval(() => {
      if (navigator.onLine) {
        this.refresh();
      }
    }, 60000); // Cada 60 segundos (menos frecuente)
  }

  handleOffline() {
    console.log('📴 Evento offline del navegador detectado');

    // Cuando el navegador reporta offline, asumimos desconexión inmediata
    // No necesitamos verificar con fetch ya que el navegador ya lo confirmó
    if (this.isOnline) {
      console.log('📴 Desconexión confirmada por navegador');
      this.isOnline = false;
      this.updateIndicator();
      this.showIndicator();
    }
  }

  handleOnline() {
    console.log('🔗 Evento online del navegador detectado');

    // Verificar inmediatamente si realmente está online
    this.verifyOnlineStatus();
  }

  // Método para registrar callbacks que se ejecuten cuando se restaure la conexión
  onConnectionRestored(callback) {
    if (typeof callback === 'function') {
      this.onConnectionRestoredCallbacks.push(callback);
      console.log('🔗 Callback registrado para restauración de conexión');
    }
  }

  // Método privado para ejecutar callbacks cuando se restaure la conexión
  _triggerConnectionRestored() {
    console.log('🔄 Ejecutando callbacks de restauración de conexión...');
    this.onConnectionRestoredCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('❌ Error ejecutando callback de restauración de conexión:', error);
      }
    });
  }

  verifyOnlineStatus() {
    // Evitar múltiples verificaciones simultáneas
    if (this.isChecking) return;
    this.isChecking = true;

    // Usar una URL del mismo dominio para evitar problemas de CORS
    const checkUrl = window.location.origin + '/index.html';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos timeout

    fetch(checkUrl, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    })
    .then(response => {
      clearTimeout(timeoutId);
      this.isChecking = false;

      if (response.ok) {
        // Confirmado: está online
        if (!this.isOnline) {
          this.isOnline = true;
          this.updateIndicator();
          this.showIndicator();
          this.indicator.classList.add('just-reconnected');

          // Ejecutar callbacks de restauración de conexión
          this._triggerConnectionRestored();

          // Ocultar después de 3 segundos
          setTimeout(() => {
            if (this.indicator) {
              this.indicator.classList.remove('just-reconnected');
              this.hideIndicator();
            }
          }, 3000);
        }
      } else {
        // Respuesta no ok, mantener offline
        if (this.isOnline) {
          this.isOnline = false;
          this.updateIndicator();
          this.showIndicator();
        }
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      this.isChecking = false;

      // Error de conexión, mantener offline
      if (this.isOnline) {
        this.isOnline = false;
        this.updateIndicator();
        this.showIndicator();
      }
    });
  }

  verifyOfflineStatus() {
    // Evitar múltiples verificaciones simultáneas
    if (this.isChecking) return;
    this.isChecking = true;

    // Usar una URL del mismo dominio para evitar problemas de CORS
    const checkUrl = window.location.origin + '/index.html';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 segundos timeout

    fetch(checkUrl, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    })
    .then(response => {
      clearTimeout(timeoutId);
      this.isChecking = false;

      if (response.ok) {
        // En realidad está online, no cambiar estado
        console.log('🔍 Verificación: conexión disponible a pesar del evento offline');
      } else {
        // Confirmado: está offline
        if (this.isOnline) {
          this.isOnline = false;
          this.updateIndicator();
          this.showIndicator();
        }
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      this.isChecking = false;

      // Confirmado: está offline
      if (this.isOnline) {
        console.log('📴 Verificación confirma desconexión');
        this.isOnline = false;
        this.updateIndicator();
        this.showIndicator();
      }
    });
  }

  updateIndicator() {
    if (!this.indicator) return;

    const textElement = this.indicator.querySelector('.connection-text');
    if (!textElement) return;

    // Limpiar todas las clases de estado
    this.indicator.classList.remove('online', 'offline', 'reconnecting');

    if (this.isOnline) {
      this.indicator.classList.add('online');
      textElement.textContent = 'Conectado';
    } else {
      this.indicator.classList.add('offline');
      textElement.textContent = 'Sin conexión';
    }
  }

  showReconnectionMessage() {
    if (!this.indicator) return;

    this.indicator.classList.add('reconnecting');
    const textElement = this.indicator.querySelector('.connection-text');
    if (textElement) {
      textElement.textContent = 'Verificando...';
    }

    // Después de 1 segundo, actualizar al estado actual
    setTimeout(() => {
      this.updateIndicator();
    }, 1000);
  }

  showIndicator() {
    if (this.indicator) {
      this.indicator.classList.add('visible');
    }
  }

  hideIndicator() {
    if (this.indicator && this.isOnline) {
      this.indicator.classList.remove('visible');
    }
  }

  // Método público para verificar estado de conexión
  getStatus() {
    return {
      isOnline: this.isOnline,
      lastChecked: new Date()
    };
  }

  // Método para forzar actualización del indicador
  refresh() {
    console.log('🔄 Refrescando indicador de conexión...');
    if (navigator.onLine) {
      this.verifyOnlineStatus();
    } else {
      this.verifyOfflineStatus();
    }
  }

  // Método para verificación agresiva (ignora navigator.onLine)
  forceCheck() {
    console.log('🔍 Verificación agresiva de conexión...');
    this.isChecking = false; // Reset flag

    // Usar una URL del mismo dominio para evitar problemas de CORS
    const checkUrl = window.location.origin + '/index.html';

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    fetch(checkUrl, {
      method: 'HEAD',
      cache: 'no-cache',
      signal: controller.signal
    })
    .then(response => {
      clearTimeout(timeoutId);
      if (response.ok) {
        // Conexión exitosa
        if (!this.isOnline) {
          console.log('🔗 Conexión verificada exitosamente');
          this.isOnline = true;
          this.updateIndicator();
          this.showIndicator();
          this.indicator.classList.add('just-reconnected');

          // Ejecutar callbacks de restauración de conexión
          this._triggerConnectionRestored();

          // Ocultar después de 3 segundos
          setTimeout(() => {
            if (this.indicator) {
              this.indicator.classList.remove('just-reconnected');
              this.hideIndicator();
            }
          }, 3000);
        }
      } else {
        // Respuesta no ok
        if (this.isOnline) {
          console.log('📴 Conexión perdida - respuesta no ok');
          this.isOnline = false;
          this.updateIndicator();
          this.showIndicator();
        }
      }
    })
    .catch(error => {
      clearTimeout(timeoutId);
      // Error de conexión
      if (this.isOnline) {
        console.log('📴 Conexión perdida durante verificación:', error.message);
        this.isOnline = false;
        this.updateIndicator();
        this.showIndicator();
      }
    });
  }

  // Método estático para inicialización desde HTML
  static init() {
    if (!window.connectionIndicator) {
      window.connectionIndicator = new ConnectionIndicator();
      console.log('🔗 ConnectionIndicator inicializado');
    }
    return window.connectionIndicator;
  }

  // Método estático para obtener la instancia actual
  static getInstance() {
    return window.connectionIndicator;
  }
}

// Inicializar cuando el DOM esté listo - REMOVIDO: ahora se inicializa manualmente desde cada página
// document.addEventListener('DOMContentLoaded', () => {
//   // Solo inicializar si no existe ya
//   if (!window.connectionIndicator) {
//     window.connectionIndicator = new ConnectionIndicator();
//   }
// });

// Exportar para uso en módulos
export { ConnectionIndicator };

// Debug utilities para testing
if (typeof window !== 'undefined') {
  window.debugConnectionIndicator = {
    // Forzar estado online
    forceOnline: () => {
      if (window.connectionIndicator) {
        window.connectionIndicator.isOnline = true;
        window.connectionIndicator.updateIndicator();
        window.connectionIndicator.showIndicator();
        console.log('🔗 Indicador forzado a ONLINE');
      }
    },

    // Forzar estado offline
    forceOffline: () => {
      if (window.connectionIndicator) {
        window.connectionIndicator.isOnline = false;
        window.connectionIndicator.updateIndicator();
        window.connectionIndicator.showIndicator();
        console.log('📴 Indicador forzado a OFFLINE');
      }
    },

    // Verificar conexión manualmente
    checkNow: () => {
      if (window.connectionIndicator) {
        window.connectionIndicator.refresh();
        console.log('🔍 Verificando conexión manualmente...');
      }
    },

    // Verificación agresiva (ignora navigator.onLine)
    forceCheck: () => {
      if (window.connectionIndicator) {
        window.connectionIndicator.forceCheck();
        console.log('🔍 Verificación agresiva iniciada...');
      }
    },

    // Obtener estado actual
    getStatus: () => {
      if (window.connectionIndicator) {
        return window.connectionIndicator.getStatus();
      }
      return { error: 'Indicador no inicializado' };
    },

    // Refrescar indicador
    refresh: () => {
      if (window.connectionIndicator) {
        window.connectionIndicator.refresh();
        console.log('🔄 Refrescando indicador...');
      }
    }
  };

  console.log('🔧 ConnectionIndicator Debug Tools disponibles:');
  console.log('   - debugConnectionIndicator.forceOnline()');
  console.log('   - debugConnectionIndicator.forceOffline()');
  console.log('   - debugConnectionIndicator.checkNow()');
  console.log('   - debugConnectionIndicator.forceCheck()');
  console.log('   - debugConnectionIndicator.getStatus()');
  console.log('   - debugConnectionIndicator.refresh()');
}