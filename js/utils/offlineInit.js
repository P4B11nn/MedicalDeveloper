/**
 * Inicializador mejorado del sistema offline
 * Asegura que todos los servicios offline funcionen correctamente
 */

(function() {
  'use strict';

  let initializationAttempts = 0;
  const maxAttempts = 5;
  const retryDelay = 500;

  function initializeOfflineSystem() {
    initializationAttempts++;
    console.log(`🔄 Intento de inicialización offline ${initializationAttempts}/${maxAttempts}`);

    try {
      // 1. Verificar que OfflineSyncService esté disponible
      if (window.offlineSyncService) {
        if (typeof window.offlineSyncService.init === 'function') {
          window.offlineSyncService.init();
          console.log('✅ OfflineSyncService inicializado correctamente');
        }

        // Verificar si hay datos pendientes al inicializar
        const pendingData = window.offlineSyncService.hasPendingSync();
        if (pendingData) {
          console.log('📋 Datos offline pendientes detectados en inicialización');
          
          // Mostrar indicador de datos pendientes
          if (window.firebaseSyncManager) {
            window.firebaseSyncManager.showSyncMessage(
              'Datos offline pendientes', 
              'info', 
              'Hay datos guardados localmente listos para sincronizar',
              8000
            );
          }
        }
      }

      // 2. Configurar listener global para reconexión automática
      setupGlobalConnectionListener();

      // 3. Configurar debug tools
      setupDebugTools();

      console.log('🎯 Sistema offline inicializado completamente');
      return true;

    } catch (error) {
      console.error(`❌ Error en inicialización offline (intento ${initializationAttempts}):`, error);
      
      // Reintentar si no hemos alcanzado el máximo
      if (initializationAttempts < maxAttempts) {
        setTimeout(initializeOfflineSystem, retryDelay);
        return false;
      } else {
        console.error('❌ Falló la inicialización offline después de múltiples intentos');
        return false;
      }
    }
  }

  function setupGlobalConnectionListener() {
    // Listener más robusto para reconexión
    window.addEventListener('online', async () => {
      console.log('🌐 Conexión restaurada - iniciando proceso de sincronización automática');
      
      // Esperar un momento para que la conexión se estabilice
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // Verificar que realmente tengamos conexión
        const hasRealConnection = await checkRealConnection();
        
        if (hasRealConnection && window.offlineSyncService) {
          const hasPendingData = window.offlineSyncService.hasPendingSync();
          
          if (hasPendingData) {
            console.log('🔄 Iniciando sincronización automática de datos offline...');
            
            // Mostrar notificación de inicio de sincronización
            if (window.firebaseSyncManager) {
              window.firebaseSyncManager.showSyncMessage(
                'Sincronizando datos offline', 
                'sync', 
                'Conectando con el servidor...',
                0
              );
            }
            
            // Ejecutar sincronización
            const result = await window.offlineSyncService.flushAll();
            
            console.log('✅ Sincronización automática completada:', result);
            
            // Mostrar resultado
            if (window.firebaseSyncManager) {
              const totalProcessed = Object.values(result.processed || {}).reduce((a, b) => a + b, 0);
              
              if (result.errors && result.errors.length > 0) {
                window.firebaseSyncManager.showSyncMessage(
                  'Sincronización completada con errores', 
                  'warning', 
                  `${totalProcessed} elementos procesados, ${result.errors.length} errores`,
                  6000
                );
              } else {
                window.firebaseSyncManager.showSyncMessage(
                  'Sincronización completada', 
                  'success', 
                  `${totalProcessed} elementos sincronizados exitosamente`,
                  5000
                );
              }
            }
            
            // Refrescar vista de pacientes si estamos en esa página
            if (window.location.pathname.includes('pacientes') && window.pacienteController) {
              setTimeout(() => {
                console.log('🔄 Refrescando vista de pacientes...');
                if (typeof window.pacienteController.loadPacientes === 'function') {
                  window.pacienteController.loadPacientes();
                }
              }, 1000);
            }
            
          } else {
            console.log('ℹ️ No hay datos offline pendientes para sincronizar');
          }
        } else {
          console.log('⚠️ Conexión no estable o servicios no disponibles');
        }
        
      } catch (error) {
        console.error('❌ Error en sincronización automática:', error);
        
        if (window.firebaseSyncManager) {
          window.firebaseSyncManager.showSyncMessage(
            'Error en sincronización', 
            'error', 
            'No se pudieron sincronizar todos los datos offline',
            5000
          );
        }
      }
    });

    // También escuchar cuando Firebase se conecta
    window.addEventListener('firebase-connected', () => {
      console.log('🔥 Firebase conectado - verificando sincronización pendiente');
      
      setTimeout(() => {
        if (window.offlineSyncService && window.offlineSyncService.hasPendingSync()) {
          console.log('📋 Datos pendientes detectados - iniciando sincronización con Firebase');
          window.offlineSyncService.flushAll().catch(error => {
            console.error('❌ Error sincronizando con Firebase:', error);
          });
        }
      }, 1000);
    });
  }

  async function checkRealConnection() {
    try {
      // Intentar hacer un pequeño request para verificar conectividad real
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('https://www.google.com/favicon.ico', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return true;
    } catch (error) {
      console.log('⚠️ Conexión reportada como online pero sin acceso real a internet');
      return false;
    }
  }

  function setupDebugTools() {
    // Herramientas de debug mejoradas
    window.offlineDebugTools = {
      // Función para probar notificaciones
      testNotifications: () => {
        console.log('🧪 Probando sistema de notificaciones...');
        
        if (window.pacienteModel && typeof window.pacienteModel.showNotification === 'function') {
          window.pacienteModel.showNotification('🧪 Prueba de notificación - Sistema funcionando', 'success', 3000);
          return true;
        }
        
        console.log('⚠️ pacienteModel.showNotification no disponible');
        return false;
      },
      
      // Función para mostrar estado del sistema offline
      showOfflineStatus: () => {
        console.log('📊 Estado del sistema offline:');
        
        if (window.offlineSyncService) {
          const summary = window.offlineSyncService.getPendingSummary();
          console.log('📋 Resumen de colas offline:', summary);
          
          const counts = window.offlineSyncService.getPendingCounts();
          console.log('🔢 Contadores por tipo:', counts);
          
          return { summary, counts };
        }
        
        console.log('⚠️ OfflineSyncService no disponible');
        return null;
      },
      
      // Función para forzar sincronización manual
      forceSyncNow: async () => {
        console.log('🔄 Forzando sincronización manual...');
        
        if (window.offlineSyncService) {
          try {
            const result = await window.offlineSyncService.flushAll({ aggressive: true });
            console.log('✅ Sincronización forzada completada:', result);
            return result;
          } catch (error) {
            console.error('❌ Error en sincronización forzada:', error);
            return { error: error.message };
          }
        }
        
        console.log('⚠️ OfflineSyncService no disponible');
        return null;
      },
      
      // Función para limpiar datos offline
      clearOfflineData: () => {
        console.log('🗑️ Limpiando datos offline...');
        
        const keys = ['offline_patients', 'offline_activities', 'offline_medical_records', 
                     'offline_checklists', 'offline_observaciones', 'pacientes', 'citas'];
        
        let cleared = 0;
        keys.forEach(key => {
          if (localStorage.getItem(key)) {
            localStorage.removeItem(key);
            cleared++;
          }
        });
        
        console.log(`🗑️ ${cleared} claves de datos offline eliminadas`);
        return cleared;
      }
    };

    console.log('🔧 Herramientas de debug offline disponibles:');
    console.log('   - offlineDebugTools.testNotifications()');
    console.log('   - offlineDebugTools.showOfflineStatus()');
    console.log('   - offlineDebugTools.forceSyncNow()');
    console.log('   - offlineDebugTools.clearOfflineData()');
  }

  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOfflineSystem);
  } else {
    // DOM ya está listo, inicializar después de un pequeño delay
    setTimeout(initializeOfflineSystem, 100);
  }

  // También intentar inicializar cuando la página se haya cargado completamente
  window.addEventListener('load', () => {
    setTimeout(initializeOfflineSystem, 200);
  });

  console.log('🚀 Inicializador offline cargado');

})();
