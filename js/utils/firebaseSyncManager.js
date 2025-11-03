/**
 * FirebaseSyncManager - Sistema global de mensajes de sincronización de Firebase
 * Maneja la sincronización de datos con Firebase y muestra mensajes informativos
 * Se integra con ConnectionIndicator para refrescar contenido cuando se recupera la conexión
 */

class FirebaseSyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.syncInProgress = false;
    this.lastSyncTime = null;
    this.pendingSyncs = [];
    this.onSyncCompleteCallbacks = [];
    this.onContentRefreshCallbacks = []; // Callbacks para refrescar contenido
    this.messageContainer = null;
    this.init();
  }

  init() {
    this.createMessageContainer();
    this.bindEvents();
    this.addStyles();

    // Verificar estado inicial
    if (this.isOnline) {
      this.showSyncMessage('Sistema inicializado', 'info');
    }
  }

  createMessageContainer() {
    // Crear contenedor de mensajes si no existe
    if (!document.getElementById('firebase-sync-messages')) {
      this.messageContainer = document.createElement('div');
      this.messageContainer.id = 'firebase-sync-messages';
      this.messageContainer.className = 'firebase-sync-messages';
      document.body.appendChild(this.messageContainer);
    } else {
      this.messageContainer = document.getElementById('firebase-sync-messages');
    }
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .firebase-sync-messages {
        position: fixed;
        top: 120px; /* Debajo del connection indicator */
        right: 20px;
        z-index: 9998;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 350px;
        pointer-events: none;
      }

      .sync-message {
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        display: flex;
        align-items: flex-start;
        gap: 10px;
        animation: slideInRight 0.3s ease-out;
        pointer-events: auto;
        position: relative;
        overflow: hidden;
      }

      .sync-message::before {
        content: '';
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        background: currentColor;
      }

      .sync-message.success {
        background: linear-gradient(135deg, #d1fae5, #a7f3d0);
        border-color: rgba(16, 185, 129, 0.3);
        color: #065f46;
      }

      .sync-message.error {
        background: linear-gradient(135deg, #fee2e2, #fecaca);
        border-color: rgba(239, 68, 68, 0.3);
        color: #991b1b;
      }

      .sync-message.warning {
        background: linear-gradient(135deg, #fef3c7, #fed7aa);
        border-color: rgba(245, 158, 11, 0.3);
        color: #92400e;
      }

      .sync-message.info {
        background: linear-gradient(135deg, #e0f2fe, #b3e5fc);
        border-color: rgba(14, 165, 233, 0.3);
        color: #0c4a6e;
      }

      .sync-message.sync {
        background: linear-gradient(135deg, #ddd6fe, #c4b5fd);
        border-color: rgba(139, 92, 246, 0.3);
        color: #5b21b6;
      }

      .sync-message-icon {
        font-size: 1.2em;
        margin-top: 2px;
        flex-shrink: 0;
      }

      .sync-message-content {
        flex: 1;
        min-width: 0;
      }

      .sync-message-title {
        font-weight: 600;
        margin-bottom: 4px;
        font-size: 0.9em;
      }

      .sync-message-text {
        font-size: 0.85em;
        line-height: 1.4;
        opacity: 0.9;
      }

      .sync-message-close {
        background: none;
        border: none;
        color: currentColor;
        font-size: 1.2em;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s;
        padding: 0;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .sync-message-close:hover {
        opacity: 1;
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }

      @keyframes slideOutRight {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }

      .sync-message.fade-out {
        animation: slideOutRight 0.3s ease-in forwards;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .firebase-sync-messages {
          top: 100px;
          right: 10px;
          left: 10px;
          max-width: none;
        }

        .sync-message {
          padding: 10px 14px;
        }
      }

      /* Loading animation for sync messages */
      .sync-loading {
        display: inline-block;
        width: 12px;
        height: 12px;
        border: 2px solid currentColor;
        border-radius: 50%;
        border-top-color: transparent;
        animation: spin 1s linear infinite;
        margin-right: 6px;
      }

      @keyframes spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    // Integración con ConnectionIndicator
    if (window.connectionIndicator) {
      window.connectionIndicator.onConnectionRestored(() => {
        this.handleConnectionRestored();
      });
    }

    // Eventos de conexión del navegador
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showSyncMessage('Conexión recuperada', 'success');
      this.attemptPendingSyncs();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showSyncMessage('Conexión perdida - Modo offline activado', 'warning');
    });
  }

  // Método para mostrar mensajes de sincronización
  showSyncMessage(title, type = 'info', text = '', duration = 4000) {
    if (!this.messageContainer) return null;

    const messageId = Date.now();
    const message = document.createElement('div');
    message.className = `sync-message ${type}`;
    message.dataset.id = messageId;

    const icon = this.getIconForType(type);
    const displayText = text || this.getDefaultTextForType(type);

    message.innerHTML = `
      <div class="sync-message-icon">${icon}</div>
      <div class="sync-message-content">
        <div class="sync-message-title">${title}</div>
        <div class="sync-message-text">${displayText}</div>
      </div>
      <button class="sync-message-close" onclick="this.closest('.sync-message').remove()">&times;</button>
    `;

    this.messageContainer.appendChild(message);

    // Auto-remover después de la duración especificada
    if (duration > 0) {
      setTimeout(() => {
        this.removeMessage(messageId);
      }, duration);
    }

    // Limitar a máximo 5 mensajes visibles
    this.limitMessages();

    return messageId; // Devolver el ID para poder eliminar el mensaje posteriormente
  }

  getIconForType(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
      sync: '<div class="sync-loading"></div>'
    };
    return icons[type] || icons.info;
  }

  getDefaultTextForType(type) {
    const texts = {
      success: 'Operación completada exitosamente',
      error: 'Ha ocurrido un error',
      warning: 'Atención requerida',
      info: 'Información importante',
      sync: 'Sincronizando datos...'
    };
    return texts[type] || '';
  }

  removeMessage(messageId) {
    const message = this.messageContainer?.querySelector(`[data-id="${messageId}"]`);
    if (message) {
      message.classList.add('fade-out');
      setTimeout(() => {
        message.remove();
      }, 300);
    }
  }

  limitMessages() {
    const messages = this.messageContainer?.querySelectorAll('.sync-message');
    if (messages && messages.length > 5) {
      // Remover los mensajes más antiguos
      for (let i = 0; i < messages.length - 5; i++) {
        messages[i].remove();
      }
    }
  }

  // Método para limpiar mensajes de sincronización (tipo 'sync')
  clearSyncMessages() {
    const syncMessages = this.messageContainer?.querySelectorAll('.sync-message.sync');
    if (syncMessages) {
      syncMessages.forEach(message => {
        message.classList.add('fade-out');
        setTimeout(() => {
          message.remove();
        }, 300);
      });
    }
  }

  // Método para manejar la restauración de conexión
  handleConnectionRestored() {
    console.log('🔄 Conexión restaurada - Iniciando sincronización automática');

    // Mostrar mensaje de sincronización
    const syncMessageId = this.showSyncMessage('Sincronizando datos', 'sync', 'Recuperando conexión con Firebase...', 0);

    // Intentar sincronizar datos pendientes
    setTimeout(async () => {
      await this.attemptPendingSyncs();

      // Después de sincronizar, refrescar contenido
      if (this.onContentRefreshCallbacks.length > 0) {
        setTimeout(() => {
          this.refreshContent().finally(() => {
            // Eliminar mensaje de sincronización después de completar
            this.removeMessage(syncMessageId);
          });
        }, 500);
      } else {
        // Si no hay callbacks, eliminar el mensaje después de un delay
        setTimeout(() => {
          this.removeMessage(syncMessageId);
        }, 2000);
      }
    }, 1000);
  }

  // Método para registrar callbacks de refresco de contenido
  onContentRefresh(callback) {
    if (typeof callback === 'function') {
      this.onContentRefreshCallbacks.push(callback);
    }
  }

  // Método para refrescar contenido después de sincronización
  async refreshContent() {
    console.log('🔄 Refrescando contenido después de sincronización...');

    const updateMessageId = this.showSyncMessage('Actualizando contenido', 'sync', 'Refrescando datos desde Firebase...', 0);

    try {
      // Ejecutar todos los callbacks de refresco de contenido
      const refreshPromises = this.onContentRefreshCallbacks.map(async (callback) => {
        try {
          await callback();
        } catch (error) {
          console.error('Error ejecutando callback de refresco de contenido:', error);
        }
      });

      await Promise.all(refreshPromises);

      // Eliminar mensaje de "Actualizando contenido"
      this.removeMessage(updateMessageId);
      
      // Mostrar mensaje de éxito por poco tiempo
      this.showSyncMessage('Contenido actualizado', 'success', 'Los datos han sido refrescados exitosamente', 3000);

    } catch (error) {
      console.error('Error general en refresco de contenido:', error);
      // Eliminar mensaje de "Actualizando contenido" en caso de error
      this.removeMessage(updateMessageId);
      this.showSyncMessage('Error al actualizar', 'error', 'No se pudo refrescar el contenido');
    }
  }

  // Método para agregar una sincronización pendiente
  addPendingSync(syncFunction, description) {
    this.pendingSyncs.push({
      id: Date.now(),
      function: syncFunction,
      description: description,
      timestamp: new Date()
    });

    console.log(`📋 Sincronización pendiente agregada: ${description}`);
  }

  // Método para intentar sincronizar datos pendientes
  async attemptPendingSyncs() {
    if (!this.isOnline || this.syncInProgress || this.pendingSyncs.length === 0) {
      return;
    }

    this.syncInProgress = true;
    console.log(`🔄 Iniciando sincronización de ${this.pendingSyncs.length} elementos pendientes`);

    try {
      for (const sync of this.pendingSyncs) {
        try {
          await sync.function();
          console.log(`✅ Sincronización completada: ${sync.description}`);

          // Remover de la lista de pendientes
          this.pendingSyncs = this.pendingSyncs.filter(s => s.id !== sync.id);

        } catch (error) {
          console.error(`❌ Error en sincronización: ${sync.description}`, error);
          this.showSyncMessage('Error de sincronización', 'error', `No se pudo sincronizar: ${sync.description}`);
        }
      }

      if (this.pendingSyncs.length === 0) {
        this.showSyncMessage('Sincronización completada', 'success', 'Todos los datos han sido sincronizados con Firebase');
        this.lastSyncTime = new Date();

        // Ejecutar callbacks de sincronización completa
        this.onSyncCompleteCallbacks.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Error ejecutando callback de sincronización:', error);
          }
        });
      }

    } catch (error) {
      console.error('Error general en sincronización:', error);
      this.showSyncMessage('Error de sincronización', 'error', 'Ha ocurrido un error durante la sincronización');
    } finally {
      this.syncInProgress = false;
    }
  }

  // Método para forzar una sincronización inmediata
  async forceSync(description = 'Sincronización manual') {
    if (!this.isOnline) {
      this.showSyncMessage('Sin conexión', 'warning', 'No se puede sincronizar sin conexión a internet');
      return false;
    }

    this.showSyncMessage(description, 'sync', 'Sincronizando...', 0);

    try {
      // Aquí iría la lógica específica de sincronización
      await this.performSync();

      this.showSyncMessage('Sincronización exitosa', 'success', 'Los datos han sido actualizados');
      this.lastSyncTime = new Date();
      return true;

    } catch (error) {
      console.error('Error en sincronización forzada:', error);
      this.showSyncMessage('Error de sincronización', 'error', 'No se pudieron sincronizar los datos');
      return false;
    }
  }

  // Método placeholder para la lógica de sincronización específica
  async performSync() {
    // Placeholder - será implementado por cada módulo específico
    return new Promise(resolve => {
      setTimeout(() => {
        console.log('🔄 Sincronización genérica completada');
        resolve();
      }, 2000);
    });
  }

  // Método para obtener el estado actual
  getStatus() {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress,
      pendingSyncs: this.pendingSyncs.length,
      lastSyncTime: this.lastSyncTime
    };
  }

  // Método estático para inicialización
  static init() {
    if (!window.firebaseSyncManager) {
      window.firebaseSyncManager = new FirebaseSyncManager();
      console.log('🔄 FirebaseSyncManager inicializado');
    }
    return window.firebaseSyncManager;
  }

  // Método estático para obtener la instancia
  static getInstance() {
    return window.firebaseSyncManager;
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  FirebaseSyncManager.init();
});

// Exportar para uso en módulos
export { FirebaseSyncManager };

// Debug utilities
if (typeof window !== 'undefined') {
  window.debugFirebaseSync = {
    // Mostrar mensaje de prueba
    showTestMessage: (type = 'info') => {
      if (window.firebaseSyncManager) {
        window.firebaseSyncManager.showSyncMessage('Mensaje de prueba', type, 'Este es un mensaje de prueba del sistema de sincronización');
      }
    },

    // Forzar sincronización
    forceSync: () => {
      if (window.firebaseSyncManager) {
        window.firebaseSyncManager.forceSync('Sincronización de prueba');
      }
    },

    // Obtener estado
    getStatus: () => {
      if (window.firebaseSyncManager) {
        return window.firebaseSyncManager.getStatus();
      }
      return { error: 'FirebaseSyncManager no inicializado' };
    },

    // Limpiar mensajes
    clearMessages: () => {
      const container = document.getElementById('firebase-sync-messages');
      if (container) {
        container.innerHTML = '';
      }
    }
  };

  console.log('🔧 FirebaseSyncManager Debug Tools disponibles:');
  console.log('   - debugFirebaseSync.showTestMessage("success")');
  console.log('   - debugFirebaseSync.forceSync()');
  console.log('   - debugFirebaseSync.getStatus()');
  console.log('   - debugFirebaseSync.clearMessages()');
}