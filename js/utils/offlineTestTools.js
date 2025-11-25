/**
 * Script de prueba rápida para el sistema offline de pacientes
 * Ejecuta: testOfflineSystem() en la consola para probar todo
 */

window.testOfflineSystem = async function() {
  console.log('🧪 === PRUEBA COMPLETA DEL SISTEMA OFFLINE ===');
  
  const results = {
    notifications: false,
    offlineService: false,
    patientRegistration: false,
    syncProcess: false
  };
  
  try {
    // 1. Probar notificaciones
    console.log('\n1️⃣ Probando sistema de notificaciones...');
    if (window.pacienteModel && typeof window.pacienteModel.showNotification === 'function') {
      window.pacienteModel.showNotification('🧪 Sistema de notificaciones funcionando', 'success', 3000);
      results.notifications = true;
      console.log('✅ Notificaciones: OK');
    } else {
      console.log('❌ Notificaciones: NO DISPONIBLE');
    }
    
    // 2. Probar OfflineSyncService
    console.log('\n2️⃣ Probando OfflineSyncService...');
    if (window.offlineSyncService) {
      const pendingData = window.offlineSyncService.getPendingSummary();
      console.log('📋 Datos pendientes actuales:', pendingData);
      results.offlineService = true;
      console.log('✅ OfflineSyncService: OK');
    } else {
      console.log('❌ OfflineSyncService: NO DISPONIBLE');
    }
    
    // 3. Simular registro offline de paciente
    console.log('\n3️⃣ Simulando registro offline de paciente...');
    if (window.pacienteModel && typeof window.pacienteModel.addPacienteOffline === 'function') {
      try {
        const pacientePrueba = {
          nombre: 'Paciente',
          apellidos: 'De Prueba Offline',
          matricula: 'TEST' + Date.now(),
          carrera: 'Ingeniería en Sistemas',
          facultad: 'Ingeniería',
          semestre: '5to',
          telefono: '1234567890',
          email: 'test@offline.com',
          fechaNacimiento: '2000-01-01',
          genero: 'Masculino',
          grado: '5to',
          grupo: 'A',
          usuarioRegistro: 'Usuario de Prueba'
        };
        
        const resultado = await window.pacienteModel.addPacienteOffline(pacientePrueba);
        console.log('✅ Registro offline simulado exitosamente:', resultado);
        results.patientRegistration = true;
      } catch (error) {
        console.log('❌ Error en registro offline:', error);
      }
    } else {
      console.log('❌ addPacienteOffline: NO DISPONIBLE');
    }
    
    // 4. Verificar estado post-registro
    console.log('\n4️⃣ Verificando estado después del registro...');
    if (window.offlineSyncService) {
      const pendingAfter = window.offlineSyncService.getPendingSummary();
      console.log('📋 Datos pendientes después del registro:', pendingAfter);
      
      if (pendingAfter.total > 0) {
        console.log('✅ Datos guardados en cola offline correctamente');
        results.syncProcess = true;
        
        // Mostrar información de la cola
        console.log('\n📊 Resumen de colas offline:');
        console.log(`   • Pacientes: ${pendingAfter.patients}`);
        console.log(`   • Actividades: ${pendingAfter.activities}`);
        console.log(`   • Registros médicos: ${pendingAfter.medicalRecords}`);
        console.log(`   • Total pendiente: ${pendingAfter.total}`);
      } else {
        console.log('⚠️ No se detectaron datos en la cola offline');
      }
    }
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  }
  
  // Mostrar resumen final
  console.log('\n🎯 === RESUMEN DE LA PRUEBA ===');
  console.log('✅ Notificaciones:', results.notifications ? 'FUNCIONANDO' : 'FALLO');
  console.log('✅ Servicio offline:', results.offlineService ? 'FUNCIONANDO' : 'FALLO');
  console.log('✅ Registro offline:', results.patientRegistration ? 'FUNCIONANDO' : 'FALLO');
  console.log('✅ Cola de sincronización:', results.syncProcess ? 'FUNCIONANDO' : 'FALLO');
  
  const allWorking = Object.values(results).every(r => r);
  
  if (allWorking) {
    console.log('🎉 ¡SISTEMA OFFLINE FUNCIONANDO COMPLETAMENTE!');
    
    if (window.firebaseSyncManager) {
      window.firebaseSyncManager.showSyncMessage(
        '🎉 Sistema offline funcionando', 
        'success', 
        'Todas las pruebas pasaron exitosamente',
        5000
      );
    }
  } else {
    console.log('⚠️ SISTEMA OFFLINE CON PROBLEMAS - Revisar los fallos arriba');
    
    if (window.firebaseSyncManager) {
      window.firebaseSyncManager.showSyncMessage(
        '⚠️ Sistema offline con problemas', 
        'warning', 
        'Algunas funcionalidades no están disponibles',
        5000
      );
    }
  }
  
  return results;
};

// Función para probar sincronización si hay conexión
window.testSyncNow = async function() {
  console.log('🔄 Probando sincronización manual...');
  
  if (!navigator.onLine) {
    console.log('❌ Sin conexión a internet - no se puede probar sincronización');
    return false;
  }
  
  if (!window.offlineSyncService) {
    console.log('❌ OfflineSyncService no disponible');
    return false;
  }
  
  const hasPending = window.offlineSyncService.hasPendingSync();
  console.log('📋 ¿Hay datos pendientes?', hasPending);
  
  if (!hasPending) {
    console.log('ℹ️ No hay datos pendientes para sincronizar');
    return false;
  }
  
  try {
    console.log('🔄 Iniciando sincronización...');
    const result = await window.offlineSyncService.flushAll();
    console.log('✅ Sincronización completada:', result);
    return result;
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
    return false;
  }
};

// Función para limpiar datos de prueba
window.clearTestData = function() {
  console.log('🗑️ Limpiando datos de prueba...');
  
  const testKeys = ['offline_patients', 'offline_activities'];
  let cleared = 0;
  
  testKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        
        if (Array.isArray(parsed)) {
          // Filtrar elementos de prueba
          const filtered = parsed.filter(item => 
            !item.matricula || !item.matricula.startsWith('TEST')
          );
          localStorage.setItem(key, JSON.stringify(filtered));
        } else if (typeof parsed === 'object') {
          // Filtrar objetos de prueba
          const filtered = {};
          Object.keys(parsed).forEach(k => {
            const item = parsed[k];
            if (!item.matricula || !item.matricula.startsWith('TEST')) {
              filtered[k] = item;
            }
          });
          localStorage.setItem(key, JSON.stringify(filtered));
        }
        
        cleared++;
      } catch (error) {
        console.error(`Error procesando ${key}:`, error);
      }
    }
  });
  
  console.log(`🗑️ ${cleared} claves procesadas para eliminar datos de prueba`);
};

console.log('🧪 Funciones de prueba disponibles:');
console.log('   - testOfflineSystem() - Prueba completa del sistema');
console.log('   - testSyncNow() - Probar sincronización manual');  
console.log('   - clearTestData() - Limpiar datos de prueba');
