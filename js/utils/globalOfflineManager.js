/**
 * Inicializador Global del Sistema de Sincronización Offline
 * 
 * Este script se debe cargar en TODAS las páginas del sistema para asegurar
 * que el servicio de sincronización offline esté siempre activo,
 * independientemente de la sección donde se encuentre el usuario.
 */

class GlobalOfflineManager {
  constructor() {
    this.initialized = false;
    this.syncService = null;
    this.isOnline = navigator.onLine;
    this.pendingInit = false;
    
    console.log('🌐 GlobalOfflineManager creado');
  }

  async init() {
    if (this.initialized || this.pendingInit) {
      console.log('⏩ GlobalOfflineManager ya inicializado o en proceso');
      return this.syncService;
    }

    this.pendingInit = true;
    console.log('🚀 Inicializando GlobalOfflineManager...');

    try {
      // 1. Importar OfflineSyncService con manejo de errores mejorado
      let OfflineSyncService;
      
      try {
        const module = await import('./offlineSyncService.js');
        OfflineSyncService = module.default;
      } catch (importError) {
        console.warn('⚠️ No se pudo cargar OfflineSyncService:', importError.message);
        
        // Intentar con ruta absoluta si la relativa falla
        try {
          const absolutePath = `${window.location.origin}/js/utils/offlineSyncService.js`;
          const module = await import(absolutePath);
          OfflineSyncService = module.default;
          console.log('✅ OfflineSyncService cargado con ruta absoluta');
        } catch (absoluteImportError) {
          console.error('❌ Error cargando OfflineSyncService con ruta absoluta:', absoluteImportError);
          
          // Si no se puede cargar, crear un servicio mock básico
          console.log('🔧 Creando servicio de sincronización mock...');
          this.initMockSyncService();
          return this.syncService;
        }
      }
      
      if (!OfflineSyncService) {
        throw new Error('OfflineSyncService no se pudo importar correctamente');
      }

      // 2. Configurar instancia global
      if (!window.offlineSyncService) {
        this.syncService = OfflineSyncService;
        window.offlineSyncService = this.syncService;
        console.log('✅ OfflineSyncService disponible globalmente');
      } else {
        this.syncService = window.offlineSyncService;
        console.log('♻️ Usando OfflineSyncService existente');
      }

      // 3. Inicializar el servicio
      if (this.syncService && typeof this.syncService.init === 'function') {
        await this.syncService.init();
        console.log('✅ OfflineSyncService inicializado correctamente');
      }

      // 4. Configurar listeners de conexión
      this.setupConnectionListeners();

      // 5. Verificar datos pendientes al inicializar
      this.checkPendingData();

      this.initialized = true;
      this.pendingInit = false;
      
      console.log('🎉 GlobalOfflineManager completamente inicializado');
      
      return this.syncService;

    } catch (error) {
      console.error('❌ Error inicializando GlobalOfflineManager:', error);
      this.pendingInit = false;
      throw error;
    }
  }

  setupConnectionListeners() {
    // Listener para cuando se restaura la conexión
    window.addEventListener('online', () => {
      console.log('🌐 Conexión restaurada - iniciando sincronización automática');
      this.isOnline = true;
      this.handleConnectionRestored();
    });

    // Listener para cuando se pierde la conexión
    window.addEventListener('offline', () => {
      console.log('📱 Conexión perdida - modo offline activado');
      this.isOnline = false;
    });

    // Listener personalizado para restauración de conexión
    window.addEventListener('connectionRestored', () => {
      console.log('🔄 Evento connectionRestored recibido');
      this.handleConnectionRestored();
    });

    // Listener para evento de sincronización pendiente del servicio
    window.addEventListener('offlineSyncPending', (event) => {
      console.log('📋 GlobalOfflineManager: Datos pendientes detectados por OfflineSyncService');
      console.log('📊 Detalle:', event.detail.summary);
      
      // Mostrar modal de sincronización si está disponible
      this.showSyncModalIfAvailable(event.detail.summary);
    });

    console.log('📡 Listeners de conexión configurados');
  }

  async handleConnectionRestored() {
    if (!this.syncService) {
      console.warn('⚠️ SyncService no disponible para sincronización');
      return;
    }

    try {
      // Verificar si hay datos pendientes
      const hasPending = await this.syncService.hasPendingSync();
      
      if (hasPending) {
        console.log('📋 Datos pendientes detectados - iniciando sincronización...');
        
        // Mostrar modal de sincronización si no está ya visible
        if (window.offlineNotificationManager && 
            typeof window.offlineNotificationManager.showSyncModal === 'function') {
          await window.offlineNotificationManager.showSyncModal();
        } else {
          // Fallback: sincronización directa
          console.log('🔄 Modal no disponible - sincronizando directamente...');
          const result = await this.syncService.flushAll();
          console.log('📊 Resultado de sincronización automática:', result);
        }
      } else {
        console.log('✅ No hay datos pendientes de sincronización');
      }
    } catch (error) {
      console.error('❌ Error durante sincronización automática:', error);
    }
  }

  async checkPendingData() {
    if (!this.syncService) return;

    try {
      const summary = await this.syncService.getPendingSummary();
      const totalPending = Object.values(summary).reduce((total, count) => total + count, 0);
      
      if (totalPending > 0) {
        console.log(`📋 Datos pendientes encontrados: ${totalPending} elementos`);
        console.log('📊 Detalle:', summary);
        
        // Si estamos online, intentar sincronizar automáticamente
        if (this.isOnline && navigator.onLine) {
          console.log('🔄 Intentando sincronización automática...');
          setTimeout(() => {
            this.handleConnectionRestored();
          }, 2000); // Delay para asegurar que la conexión esté estable
        }
      } else {
        console.log('✅ No hay datos pendientes de sincronización');
      }
    } catch (error) {
      console.error('❌ Error verificando datos pendientes:', error);
    }
  }

  // Método público para forzar sincronización
  async forcSync() {
    if (!this.syncService) {
      console.error('❌ SyncService no disponible');
      return false;
    }

    try {
      console.log('🔄 Forzando sincronización...');
      const result = await this.syncService.flushAll();
      console.log('✅ Sincronización forzada completada:', result);
      return result;
    } catch (error) {
      console.error('❌ Error en sincronización forzada:', error);
      return false;
    }
  }

  // Método para obtener resumen de datos pendientes
  async getPendingSummary() {
    if (!this.syncService) return {};
    
    try {
      return await this.syncService.getPendingSummary();
    } catch (error) {
      console.error('❌ Error obteniendo resumen:', error);
      return {};
    }
  }

  // Método para verificar si el servicio está listo
  isReady() {
    return this.initialized && this.syncService;
  }

  // Método para mostrar modal de sincronización si está disponible
  async showSyncModalIfAvailable(summary = null) {
    try {
      // Verificar si el gestor de notificaciones offline está disponible
      if (window.offlineNotificationManager && 
          typeof window.offlineNotificationManager.showSyncModal === 'function') {
        
        console.log('📱 Mostrando modal de sincronización...');
        await window.offlineNotificationManager.showSyncModal();
        
      } else {
        console.log('⚠️ Modal de sincronización no disponible - usando notificación alternativa');
        
        // Fallback: mostrar notificación simple
        const totalPending = summary ? Object.values(summary).reduce((total, count) => total + count, 0) : 0;
        
        if (totalPending > 0) {
          // Crear notificación visual simple
          this.showSimpleNotification(
            '🔄 Sincronización Pendiente', 
            `Tienes ${totalPending} elementos pendientes de sincronizar. ¡La sincronización se ejecutará automáticamente!`,
            'info'
          );
        }
      }
    } catch (error) {
      console.error('❌ Error mostrando modal de sincronización:', error);
    }
  }

  // Método para inicializar servicio mock en caso de fallo de carga
  initMockSyncService() {
    console.log('🔧 Inicializando servicio de sincronización mock...');
    
    this.syncService = {
      init: async () => {
        console.log('📱 Mock sync service initialized');
        return true;
      },
      hasPendingSync: async () => {
        console.log('📊 Mock: Checking pending sync');
        return false;
      },
      getPendingSummary: async () => {
        console.log('📋 Mock: Getting pending summary');
        return {};
      },
      flushAll: async () => {
        console.log('🔄 Mock: Flushing all data');
        return { success: true, synced: 0, errors: 0 };
      }
    };
    
    window.offlineSyncService = this.syncService;
    console.log('✅ Mock sync service configurado');
  }

  // Método para mostrar notificación simple
  showSimpleNotification(title, message, type = 'info') {
    // Crear elemento de notificación
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#2196F3'};
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.3);
      z-index: 10000;
      max-width: 350px;
      font-family: 'Segoe UI', sans-serif;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    notification.innerHTML = `
      <div style="font-weight: bold; margin-bottom: 5px;">${title}</div>
      <div>${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
    
    console.log(`📢 Notificación mostrada: ${title} - ${message}`);
  }
}

// Crear instancia global
const globalOfflineManager = new GlobalOfflineManager();

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      globalOfflineManager.init().catch(error => {
        console.error('❌ Error en auto-inicialización:', error);
      });
    }, 1000); // Delay para asegurar que otros scripts estén cargados
  });
} else {
  // DOM ya está listo
  setTimeout(() => {
    globalOfflineManager.init().catch(error => {
      console.error('❌ Error en inicialización inmediata:', error);
    });
  }, 1000);
}

// Hacer disponible globalmente
window.globalOfflineManager = globalOfflineManager;

// También crear alias para compatibilidad
window.initGlobalOfflineSync = () => globalOfflineManager.init();
window.forceOfflineSync = () => globalOfflineManager.forcSync();
window.getOfflinePendingSummary = () => globalOfflineManager.getPendingSummary();

console.log('🌍 GlobalOfflineManager cargado y configurado');

export default globalOfflineManager;