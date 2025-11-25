/**
 * 🔧 HERRAMIENTAS DE DEBUG PARA REGISTRO OFFLINE DE PACIENTES
 * Utiliza esta herramienta para diagnosticar problemas con el guardado offline
 */

window.OfflinePacientesDebug = {
  
  /**
   * Ejecutar diagnóstico completo del sistema de guardado offline
   */
  async runDiagnostic() {
    console.log('🧪 === DIAGNÓSTICO COMPLETO: REGISTRO OFFLINE DE PACIENTES ===');
    
    try {
      // 1. Verificar estado de conexión
      console.log('🔍 1. Verificando estado de conexión...');
      const isOnline = navigator.onLine;
      console.log(`   • navigator.onLine: ${isOnline}`);
      console.log(`   • window.advancedOfflineIndicator: ${!!window.advancedOfflineIndicator}`);
      if (window.advancedOfflineIndicator) {
        console.log(`   • advancedOfflineIndicator.isOnline: ${window.advancedOfflineIndicator.isOnline}`);
      }
      
      // 2. Verificar disponibilidad de pacienteModel
      console.log('🔍 2. Verificando pacienteModel...');
      const hasModel = window.pacienteModel || (await import('../models/pacienteModel.js'));
      console.log(`   • pacienteModel disponible: ${!!hasModel}`);
      
      // 3. Verificar localStorage
      console.log('🔍 3. Verificando localStorage...');
      try {
        const testKey = 'offline_test_' + Date.now();
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        console.log('   • localStorage: ✅ Funcional');
      } catch (e) {
        console.error('   • localStorage: ❌ Error -', e.message);
      }
      
      // 4. Verificar pacientes offline existentes
      console.log('🔍 4. Verificando pacientes offline existentes...');
      const pacientesOffline = JSON.parse(localStorage.getItem('pacientes') || '[]');
      console.log(`   • Pacientes offline guardados: ${pacientesOffline.length}`);
      
      if (pacientesOffline.length > 0) {
        console.log('   • Últimos 3 pacientes offline:');
        pacientesOffline.slice(-3).forEach((p, i) => {
          console.log(`     ${i+1}. ${p.nombre} (${p.matricula}) - ${p._isOffline ? 'OFFLINE' : 'ONLINE'}`);
        });
      }
      
      // 5. Verificar sistemas de notificación
      console.log('🔍 5. Verificando sistemas de notificación...');
      console.log(`   • firebaseSyncManager: ${!!window.firebaseSyncManager}`);
      console.log(`   • offlineNotificationManager: ${!!window.offlineNotificationManager}`);
      console.log(`   • advancedOfflineIndicator: ${!!window.advancedOfflineIndicator}`);
      
      // 6. Verificar cola de sincronización
      console.log('🔍 6. Verificando cola de sincronización...');
      console.log(`   • offlineSyncService: ${!!window.offlineSyncService}`);
      if (window.offlineSyncService) {
        console.log(`   • Métodos disponibles:`, Object.getOwnPropertyNames(window.offlineSyncService));
      }
      
      console.log('✅ === DIAGNÓSTICO COMPLETADO ===');
      return true;
      
    } catch (error) {
      console.error('❌ Error en diagnóstico:', error);
      return false;
    }
  },
  
  /**
   * Probar registro offline con datos de ejemplo
   */
  async testOfflineRegistration() {
    console.log('🧪 Probando registro offline con datos de ejemplo...');
    
    try {
      // Importar pacienteModel
      const { pacienteModel } = await import('../models/pacienteModel.js');
      
      // Datos de ejemplo
      const pacientePrueba = {
        matricula: 'TEST' + Date.now(),
        nombre: 'Paciente',
        apellidos: 'De Prueba Offline',
        grado: '1',
        grupo: 'A',
        semestre: '1',
        telefono: '1234567890',
        facultad: 'Ingeniería',
        email: 'test@offline.com'
      };
      
      console.log('📝 Datos de prueba:', pacientePrueba);
      
      // Forzar modo offline temporalmente
      const originalOnline = navigator.onLine;
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });
      
      // Intentar guardar
      console.log('💾 Intentando guardar en modo offline...');
      const resultado = await pacienteModel.addPaciente(pacientePrueba);
      
      console.log('✅ Resultado:', resultado);
      
      // Restaurar estado online original
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: originalOnline
      });
      
      // Verificar que se guardó
      const pacientesOffline = JSON.parse(localStorage.getItem('pacientes') || '[]');
      const pacienteGuardado = pacientesOffline.find(p => p.matricula === pacientePrueba.matricula);
      
      if (pacienteGuardado) {
        console.log('✅ Paciente encontrado en localStorage:', pacienteGuardado);
        return true;
      } else {
        console.error('❌ Paciente NO encontrado en localStorage');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error en test offline:', error);
      return false;
    }
  },
  
  /**
   * Verificar notificaciones
   */
  testNotifications() {
    console.log('🧪 Probando sistemas de notificación...');
    
    const message = '🧪 Prueba de notificación offline';
    
    // Probar firebaseSyncManager
    if (window.firebaseSyncManager && typeof window.firebaseSyncManager.showSyncMessage === 'function') {
      console.log('📱 Probando firebaseSyncManager...');
      window.firebaseSyncManager.showSyncMessage(message, 'info', 'test', 3000);
    }
    
    // Probar offlineNotificationManager
    if (window.offlineNotificationManager && typeof window.offlineNotificationManager.showNotification === 'function') {
      console.log('📱 Probando offlineNotificationManager...');
      window.offlineNotificationManager.showNotification(message, 'info');
    }
    
    // Probar advancedOfflineIndicator
    if (window.advancedOfflineIndicator && typeof window.advancedOfflineIndicator.showMessage === 'function') {
      console.log('📱 Probando advancedOfflineIndicator...');
      window.advancedOfflineIndicator.showMessage(message, 'info');
    }
    
    // Fallback a console
    console.log('📱 Mensaje de prueba:', message);
  },
  
  /**
   * Limpiar datos de prueba
   */
  clearTestData() {
    console.log('🧹 Limpiando datos de prueba...');
    
    try {
      const pacientes = JSON.parse(localStorage.getItem('pacientes') || '[]');
      const pacientesFiltrados = pacientes.filter(p => !p.matricula.startsWith('TEST'));
      localStorage.setItem('pacientes', JSON.stringify(pacientesFiltrados));
      
      const eliminados = pacientes.length - pacientesFiltrados.length;
      console.log(`✅ ${eliminados} pacientes de prueba eliminados`);
      
    } catch (error) {
      console.error('❌ Error limpiando datos:', error);
    }
  },
  
  /**
   * Ver todos los pacientes offline
   */
  showOfflinePatients() {
    console.log('👥 Pacientes guardados offline:');
    
    try {
      const pacientes = JSON.parse(localStorage.getItem('pacientes') || '[]');
      
      if (pacientes.length === 0) {
        console.log('   ℹ️ No hay pacientes offline guardados');
        return;
      }
      
      console.table(pacientes.map(p => ({
        ID: p.id,
        Matrícula: p.matricula,
        Nombre: `${p.nombre} ${p.apellidos}`,
        Grado: p.grado,
        Grupo: p.grupo,
        'Offline': p._isOffline ? '📱' : '🌐',
        'Fecha': p._createdOffline || p.fechaRegistro
      })));
      
    } catch (error) {
      console.error('❌ Error mostrando pacientes:', error);
    }
  }
};

console.log('🔧 OfflinePacientesDebug cargado');
console.log('💡 Comandos disponibles:');
console.log('   • OfflinePacientesDebug.runDiagnostic() - Diagnóstico completo');
console.log('   • OfflinePacientesDebug.testOfflineRegistration() - Probar registro offline');
console.log('   • OfflinePacientesDebug.testNotifications() - Probar notificaciones');
console.log('   • OfflinePacientesDebug.showOfflinePatients() - Ver pacientes offline');
console.log('   • OfflinePacientesDebug.clearTestData() - Limpiar datos de prueba');
