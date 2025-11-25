/**
 * 🚀 MEDICAL DEVELOPER - INICIALIZADOR OFFLINE UNIVERSAL
 * Script de inicialización para funcionalidad offline en todas las páginas
 * Versión: 2.1.0
 */

(function() {
  'use strict';
  
  console.log('🌐 Medical Developer Offline Initializer loading...');
  
  // Configuración global
  window.MedicalDeveloperOffline = {
    version: '2.1.0',
    initialized: false,
    components: {
      serviceWorker: false,
      smartCache: false,
      firebaseSync: false,
      offlineIndicator: false,
      automaticSync: false
    },
    config: {
      enableDebug: localStorage.getItem('meddev_debug') === 'true',
      cacheSize: 50, // MB
      syncInterval: 30000, // ms
      retryAttempts: 3
    }
  };
  
  /**
   * Logger con prefijos y colores
   */
  const Logger = {
    info: (msg) => console.log(`%c🌐 MedDev Offline: ${msg}`, 'color: #059669'),
    success: (msg) => console.log(`%c✅ MedDev Offline: ${msg}`, 'color: #10b981'),
    warning: (msg) => console.warn(`%c⚠️ MedDev Offline: ${msg}`, 'color: #f59e0b'),
    error: (msg) => console.error(`%c❌ MedDev Offline: ${msg}`, 'color: #ef4444'),
    debug: (msg) => {
      if (window.MedicalDeveloperOffline.config.enableDebug) {
        console.log(`%c🔧 MedDev Debug: ${msg}`, 'color: #8b5cf6');
      }
    }
  };

  /**
   * Detector de características del navegador
   */
  function detectCapabilities() {
    const capabilities = {
      serviceWorker: 'serviceWorker' in navigator,
      indexedDB: 'indexedDB' in window,
      localStorage: 'localStorage' in window,
      caches: 'caches' in window,
      connection: 'connection' in navigator,
      notification: 'Notification' in window,
      backgroundSync: false,
      pushManager: false
    };
    
    // Verificar características avanzadas
    if (capabilities.serviceWorker) {
      navigator.serviceWorker.ready.then(registration => {
        capabilities.backgroundSync = 'sync' in registration;
        capabilities.pushManager = 'pushManager' in registration;
      });
    }
    
    Logger.debug(`Capacidades detectadas: ${JSON.stringify(capabilities, null, 2)}`);
    return capabilities;
  }

  /**
   * Registro del Service Worker
   */
  async function registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      Logger.warning('Service Worker no soportado en este navegador');
      return false;
    }

    try {
      Logger.info('Registrando Service Worker...');
      
      const registration = await navigator.serviceWorker.register('./sw.js');
      Logger.success(`Service Worker registrado: ${registration.scope}`);
      
      // Manejar actualizaciones
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        Logger.info('Nueva versión del Service Worker disponible');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            Logger.info('Service Worker actualizado - Nueva versión lista');
            
            // Notificar al usuario
            if (window.firebaseSyncManager) {
              window.firebaseSyncManager.showSyncMessage(
                'Actualización disponible',
                'info',
                'Nueva versión lista. Recarga la página para aplicar.',
                0
              );
            }
          }
        });
      });
      
      // Escuchar mensajes del SW
      navigator.serviceWorker.addEventListener('message', (event) => {
        Logger.debug(`Mensaje del SW: ${JSON.stringify(event.data)}`);
        
        if (event.data && event.data.type === 'CACHE_UPDATED') {
          Logger.info('Caché actualizado por Service Worker');
        }
      });
      
      window.MedicalDeveloperOffline.components.serviceWorker = true;
      return true;
      
    } catch (error) {
      Logger.error(`Error registrando Service Worker: ${error.message}`);
      return false;
    }
  }

  /**
   * Cargar componentes offline de forma asíncrona
   */
  async function loadOfflineComponents() {
    const componentsToLoad = [
      {
        name: 'smartCache',
        script: './js/utils/smartCacheManager.js',
        init: () => window.smartCache || null
      },
      {
        name: 'firebaseSync', 
        script: './js/utils/firebaseSyncManager.js',
        init: () => window.firebaseSyncManager || window.FirebaseSyncManager?.getInstance()
      },
      {
        name: 'offlineIndicator',
        script: './js/utils/advancedOfflineIndicator.js', 
        init: () => window.advancedOfflineIndicator || window.AdvancedOfflineIndicator?.init()
      },
      {
        name: 'automaticSync',
        script: './js/utils/automaticSyncManager.js',
        init: () => window.automaticSyncManager || window.AutomaticSyncManager?.init()
      }
    ];

    for (const component of componentsToLoad) {
      try {
        Logger.info(`Cargando ${component.name}...`);
        
        // Verificar si ya está cargado
        const existing = component.init();
        if (existing) {
          Logger.success(`${component.name} ya está disponible`);
          window.MedicalDeveloperOffline.components[component.name] = true;
          continue;
        }
        
        // Cargar script dinámicamente
        await loadScript(component.script);
        
        // Esperar un poco para la inicialización
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar inicialización
        const initialized = component.init();
        if (initialized) {
          Logger.success(`${component.name} cargado correctamente`);
          window.MedicalDeveloperOffline.components[component.name] = true;
        } else {
          Logger.warning(`${component.name} cargado pero no inicializado`);
        }
        
      } catch (error) {
        Logger.error(`Error cargando ${component.name}: ${error.message}`);
      }
    }
  }

  /**
   * Cargar script dinámicamente
   */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Verificar si ya está cargado
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      
      script.onload = () => {
        Logger.debug(`Script cargado: ${src}`);
        resolve();
      };
      
      script.onerror = () => {
        Logger.error(`Error cargando script: ${src}`);
        reject(new Error(`Failed to load ${src}`));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Configurar integración entre componentes
   */
  function setupComponentIntegration() {
    Logger.info('Configurando integración entre componentes...');
    
    try {
      // Integración Firebase Sync <-> Advanced Indicator
      if (window.firebaseSyncManager && window.advancedOfflineIndicator) {
        window.firebaseSyncManager.onContentRefresh(async () => {
          Logger.debug('Callback de refresco de contenido ejecutado');
          
          // Actualizar indicadores
          if (window.advancedOfflineIndicator) {
            window.advancedOfflineIndicator.setSyncing(false);
          }
          
          // Disparar evento personalizado
          window.dispatchEvent(new CustomEvent('meddev:contentRefreshed', {
            detail: { timestamp: Date.now() }
          }));
        });
        
        Logger.success('Integración Firebase Sync ↔ Advanced Indicator configurada');
      }
      
      // Integración Automatic Sync <-> Firebase Sync
      if (window.automaticSyncManager && window.firebaseSyncManager) {
        // Los componentes ya se integran automáticamente
        Logger.success('Integración Automatic Sync ↔ Firebase Sync activa');
      }
      
      // Configurar eventos globales
      window.addEventListener('online', () => {
        Logger.info('Conexión restaurada globalmente');
        window.dispatchEvent(new CustomEvent('meddev:connectionRestored'));
      });
      
      window.addEventListener('offline', () => {
        Logger.warning('Conexión perdida globalmente');
        window.dispatchEvent(new CustomEvent('meddev:connectionLost'));
      });
      
    } catch (error) {
      Logger.error(`Error en integración de componentes: ${error.message}`);
    }
  }

  /**
   * Configurar PWA
   */
  function setupPWA() {
    Logger.info('Configurando PWA...');
    
    // Manejar prompt de instalación
    window.addEventListener('beforeinstallprompt', (event) => {
      event.preventDefault();
      window.deferredPrompt = event;
      
      Logger.info('PWA instalable detectada');
      
      // Mostrar sugerencia después de uso significativo
      setTimeout(() => {
        if (window.deferredPrompt && !localStorage.getItem('pwa_install_dismissed')) {
          showPWAInstallPrompt();
        }
      }, 60000); // 1 minuto
    });
    
    // Manejar instalación exitosa
    window.addEventListener('appinstalled', () => {
      Logger.success('PWA instalada exitosamente');
      window.deferredPrompt = null;
      
      if (window.firebaseSyncManager) {
        window.firebaseSyncManager.showSyncMessage(
          'Aplicación instalada',
          'success',
          'Medical Developer está ahora disponible como aplicación'
        );
      }
    });
  }

  /**
   * Mostrar prompt de instalación PWA
   */
  function showPWAInstallPrompt() {
    if (!window.deferredPrompt) return;
    
    const shouldInstall = confirm(
      '¿Deseas instalar Medical Developer como aplicación en tu dispositivo?\n\n' +
      'Ventajas:\n' +
      '• Acceso rápido desde el escritorio\n' +
      '• Funciona completamente offline\n' +
      '• Recibe notificaciones importantes\n' +
      '• Mejor rendimiento'
    );
    
    if (shouldInstall) {
      window.deferredPrompt.prompt();
      
      window.deferredPrompt.userChoice.then((choiceResult) => {
        Logger.info(`PWA Install choice: ${choiceResult.outcome}`);
        
        if (choiceResult.outcome === 'dismissed') {
          localStorage.setItem('pwa_install_dismissed', 'true');
        }
        
        window.deferredPrompt = null;
      });
    } else {
      localStorage.setItem('pwa_install_dismissed', 'true');
    }
  }

  /**
   * Configurar monitoreo de rendimiento
   */
  function setupPerformanceMonitoring() {
    if (!window.MedicalDeveloperOffline.config.enableDebug) return;
    
    Logger.debug('Configurando monitoreo de rendimiento...');
    
    // Monitorear uso de almacenamiento
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      setInterval(async () => {
        try {
          const estimate = await navigator.storage.estimate();
          const usedMB = Math.round(estimate.usage / (1024 * 1024));
          const quotaMB = Math.round(estimate.quota / (1024 * 1024));
          const percentage = Math.round((estimate.usage / estimate.quota) * 100);
          
          Logger.debug(`Almacenamiento: ${usedMB}MB/${quotaMB}MB (${percentage}%)`);
          
          if (percentage > 80) {
            Logger.warning('Almacenamiento local casi lleno');
          }
        } catch (error) {
          Logger.error(`Error monitoreando almacenamiento: ${error.message}`);
        }
      }, 60000); // Cada minuto
    }
    
    // Monitorear rendimiento de red
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const logConnection = () => {
        Logger.debug(`Red: ${connection.effectiveType}, ${connection.downlink}Mbps`);
      };
      
      connection.addEventListener('change', logConnection);
      logConnection(); // Log inicial
    }
  }

  /**
   * Inicialización principal
   */
  async function initialize() {
    if (window.MedicalDeveloperOffline.initialized) {
      Logger.warning('Sistema offline ya inicializado');
      return;
    }
    
    Logger.info('Inicializando sistema offline...');
    
    try {
      // 1. Detectar capacidades
      const capabilities = detectCapabilities();
      
      // 2. Registrar Service Worker
      await registerServiceWorker();
      
      // 3. Cargar componentes offline
      await loadOfflineComponents();
      
      // 4. Configurar integración
      setupComponentIntegration();
      
      // 5. Configurar PWA
      setupPWA();
      
      // 6. Configurar monitoreo
      setupPerformanceMonitoring();
      
      // 7. Marcar como inicializado
      window.MedicalDeveloperOffline.initialized = true;
      
      Logger.success('Sistema offline inicializado correctamente');
      
      // 8. Disparar evento de inicialización completa
      window.dispatchEvent(new CustomEvent('meddev:offlineReady', {
        detail: {
          version: window.MedicalDeveloperOffline.version,
          components: window.MedicalDeveloperOffline.components,
          capabilities
        }
      }));
      
      // 9. Mostrar notificación de éxito
      setTimeout(() => {
        if (window.firebaseSyncManager) {
          window.firebaseSyncManager.showSyncMessage(
            'Sistema offline listo',
            'success',
            'La aplicación funcionará sin conexión a internet',
            4000
          );
        }
      }, 1500);
      
    } catch (error) {
      Logger.error(`Error durante inicialización: ${error.message}`);
      
      // Disparar evento de error
      window.dispatchEvent(new CustomEvent('meddev:offlineError', {
        detail: { error: error.message }
      }));
    }
  }

  /**
   * API pública para debugging
   */
  window.MedicalDeveloperOffline.debug = {
    reinitialize: initialize,
    
    getStatus: () => ({
      initialized: window.MedicalDeveloperOffline.initialized,
      components: window.MedicalDeveloperOffline.components,
      version: window.MedicalDeveloperOffline.version
    }),
    
    enableDebug: () => {
      localStorage.setItem('meddev_debug', 'true');
      window.MedicalDeveloperOffline.config.enableDebug = true;
      Logger.success('Debug mode habilitado');
    },
    
    disableDebug: () => {
      localStorage.removeItem('meddev_debug');
      window.MedicalDeveloperOffline.config.enableDebug = false;
      Logger.info('Debug mode deshabilitado');
    }
  };

  // Auto-inicialización cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    // DOM ya está listo
    setTimeout(initialize, 100);
  }
  
  Logger.info('Inicializador offline cargado y listo');

})();

console.log('🌐 Medical Developer Offline Initializer loaded successfully');
