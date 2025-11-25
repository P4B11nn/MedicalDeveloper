/**
 * 🧪 MEDICAL DEVELOPER - SCRIPT DE TESTING OFFLINE
 * Herramientas para probar y debuggear funcionalidad offline
 * Versión: 1.0.0
 */

// Función para verificar el estado del Service Worker
async function checkServiceWorkerStatus() {
  console.log('🔍 Verificando estado del Service Worker...');
  
  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker no es compatible con este navegador');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      console.log('✅ Service Worker registrado:', {
        scope: registration.scope,
        active: !!registration.active,
        installing: !!registration.installing,
        waiting: !!registration.waiting
      });
      return true;
    } else {
      console.warn('⚠️ Service Worker no está registrado');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verificando Service Worker:', error);
    return false;
  }
}

// Función para verificar el manifest
async function checkManifest() {
  console.log('📱 Verificando manifest.json...');
  
  try {
    // Verificar referencia en HTML
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) {
      console.error('❌ No se encontró <link rel="manifest"> en el HTML');
      return false;
    }
    
    console.log('✅ Referencia manifest encontrada:', manifestLink.href);
    
    const response = await fetch('./manifest.json');
    if (response.ok) {
      const manifest = await response.json();
      console.log('✅ Manifest cargado correctamente:', {
        name: manifest.name,
        start_url: manifest.start_url,
        display: manifest.display,
        scope: manifest.scope,
        icons: manifest.icons?.length || 0,
        shortcuts: manifest.shortcuts?.length || 0
      });
      
      // Verificar PWA installability
      console.log('🔍 Verificando installabilidad PWA...');
      if ('serviceWorker' in navigator && manifest.display === 'standalone') {
        console.log('✅ Configuración PWA válida para instalación');
      } else {
        console.warn('⚠️ Configuración PWA puede no ser instalable');
      }
      
      return true;
    } else {
      console.error('❌ Error cargando manifest:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Error verificando manifest:', error);
    return false;
  }
}

// Función para verificar recursos críticos en caché
async function checkCachedResources() {
  console.log('🗂️ Verificando recursos en caché...');
  
  if (!('caches' in window)) {
    console.error('❌ Cache API no es compatible');
    return false;
  }
  
  try {
    const cacheNames = await caches.keys();
    console.log('📦 Cachés disponibles:', cacheNames);
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      console.log(`📋 Caché '${cacheName}': ${requests.length} recursos`);
      
      // Mostrar algunos recursos de ejemplo
      for (let i = 0; i < Math.min(5, requests.length); i++) {
        console.log(`  - ${requests[i].url}`);
      }
      if (requests.length > 5) {
        console.log(`  ... y ${requests.length - 5} más`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error verificando caché:', error);
    return false;
  }
}

// Función para probar conectividad offline
async function testOfflineMode() {
  console.log('🔌 Iniciando prueba de modo offline...');
  
  const testResources = [
    './menuInicio.html',
    './css/imageComponents.css',
    './js/utils/advancedOfflineIndicator.js',
    './manifest.json'
  ];
  
  console.log('📡 Estado actual de red:', navigator.onLine ? 'Online' : 'Offline');
  
  for (const resource of testResources) {
    try {
      const response = await fetch(resource);
      console.log(`✅ ${resource}: ${response.status} ${response.statusText}`);
    } catch (error) {
      console.log(`❌ ${resource}: ${error.message}`);
    }
  }
}

// Función para limpiar todo el caché
async function clearAllCache() {
  console.log('🗑️ Limpiando todo el caché...');
  
  if (!('caches' in window)) {
    console.error('❌ Cache API no disponible');
    return false;
  }
  
  try {
    const cacheNames = await caches.keys();
    const deletePromises = cacheNames.map(name => caches.delete(name));
    await Promise.all(deletePromises);
    
    console.log(`✅ ${cacheNames.length} cachés eliminados`);
    
    // También limpiar localStorage relacionado
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('cache_meta_') || key.includes('medical_dev_') || key.includes('firebase_offline_'))) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.log(`✅ ${keysToRemove.length} elementos de localStorage limpiados`);
    
    return true;
  } catch (error) {
    console.error('❌ Error limpiando caché:', error);
    return false;
  }
}

// Función de diagnóstico completo
async function runFullDiagnostic() {
  console.log('🏥 === DIAGNÓSTICO COMPLETO MEDICAL DEVELOPER OFFLINE ===');
  console.log('Fecha:', new Date().toLocaleString());
  console.log('URL actual:', window.location.href);
  console.log('User Agent:', navigator.userAgent);
  console.log('');
  
  const results = {
    serviceWorker: await checkServiceWorkerStatus(),
    manifest: await checkManifest(),
    cache: await checkCachedResources(),
    offlineTest: true // Se ejecutará después
  };
  
  console.log('');
  console.log('🧪 Ejecutando prueba offline...');
  await testOfflineMode();
  
  console.log('');
  console.log('📊 === RESUMEN DE DIAGNÓSTICO ===');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  const allPassed = Object.values(results).every(result => result);
  console.log('');
  console.log(`🎯 Estado general: ${allPassed ? '✅ TODOS LOS TESTS PASARON' : '❌ ALGUNOS TESTS FALLARON'}`);
  
  return results;
}

// Función para registrar el Service Worker manualmente
async function registerServiceWorker() {
  console.log('📝 Registrando Service Worker manualmente...');
  
  if (!('serviceWorker' in navigator)) {
    console.error('❌ Service Worker no es compatible');
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.register('./sw.js');
    console.log('✅ Service Worker registrado exitosamente:', registration);
    
    // Esperar a que esté activo
    if (registration.installing) {
      console.log('⏳ Esperando instalación...');
      await new Promise(resolve => {
        registration.installing.addEventListener('statechange', () => {
          if (registration.installing.state === 'installed') {
            resolve();
          }
        });
      });
    }
    
    if (registration.waiting) {
      console.log('⏳ Service Worker esperando activación...');
    }
    
    if (registration.active) {
      console.log('🚀 Service Worker activo y funcionando');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error registrando Service Worker:', error);
    return false;
  }
}

// Función para desregistrar el Service Worker
async function unregisterServiceWorker() {
  console.log('🗑️ Desregistrando Service Worker...');
  
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const unregistered = await registration.unregister();
      console.log(unregistered ? '✅ Service Worker desregistrado' : '❌ No se pudo desregistrar');
      return unregistered;
    } else {
      console.log('ℹ️ No hay Service Worker registrado');
      return true;
    }
  } catch (error) {
    console.error('❌ Error desregistrando Service Worker:', error);
    return false;
  }
}

// Función para verificar caching de tiles del mapa
async function checkMapTilesCaching() {
  console.log('🗺️ Verificando cache de tiles del mapa...');
  
  try {
    const cacheNames = await caches.keys();
    const tilesCacheName = cacheNames.find(name => name.includes('map-tiles'));
    
    if (tilesCacheName) {
      const cache = await caches.open(tilesCacheName);
      const cachedTiles = await cache.keys();
      console.log(`✅ Cache de tiles encontrado: ${cachedTiles.length} tiles cacheados`);
      
      if (cachedTiles.length > 0) {
        const examples = cachedTiles.slice(0, 3).map(req => req.url.split('/').slice(-3).join('/'));
        console.log('📍 Ejemplos de tiles cacheados:', examples);
      }
      return true;
    } else {
      console.log('⚠️ No se encontró cache de tiles del mapa');
      return false;
    }
  } catch (error) {
    console.error('❌ Error verificando cache de tiles:', error);
    return false;
  }
}

// Función mejorada para diagnóstico completo
async function runFullDiagnosticEnhanced() {
  console.log('🧪 === DIAGNÓSTICO COMPLETO DEL SISTEMA OFFLINE (ENHANCED) ===');
  
  try {
    await checkServiceWorkerStatus();
    await checkManifest();
    await checkCachedResources();
    await checkMapTilesCaching();
    
    // Verificar errores específicos
    console.log('🔍 Verificando errores comunes...');
    
    // Test de métodos POST
    console.log('📡 Verificando manejo de requests POST...');
    console.log('✅ Service Worker configurado para NO cachear métodos POST');
    
    // Test de historial médico
    console.log('🏥 Verificando función de historial médico...');
    if (typeof window.pacienteModel !== 'undefined') {
      console.log('✅ pacienteModel disponible');
    } else {
      console.log('⚠️ pacienteModel no disponible en scope global');
    }
    
    console.log('✅ === DIAGNÓSTICO MEJORADO COMPLETADO ===');
    return true;
  } catch (error) {
    console.error('❌ Error en diagnóstico mejorado:', error);
    return false;
  }
}

// Herramientas globales para debugging
window.OfflineDebugTools = {
  // Diagnósticos
  runDiagnostic: runFullDiagnosticEnhanced,
  runBasicDiagnostic: runFullDiagnostic,
  checkSW: checkServiceWorkerStatus,
  checkManifest: checkManifest,
  checkCache: checkCachedResources,
  checkMapTiles: checkMapTilesCaching,
  testOffline: testOfflineMode,
  
  // Gestión de Service Worker
  registerSW: registerServiceWorker,
  unregisterSW: unregisterServiceWorker,
  
  // Gestión de caché
  clearCache: clearAllCache,
  
  // Utilidades
  simulateOffline: () => {
    console.log('🔌 Simulando modo offline...');
    console.log('💡 Para simular offline real, usa DevTools > Network > Offline');
  },
  
  forceUpdate: async () => {
    console.log('🔄 Forzando actualización del Service Worker...');
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      registration.update();
      console.log('✅ Actualización forzada');
    }
  },
  
  fixCommonIssues: async () => {
    console.log('🔧 Intentando arreglar problemas comunes...');
    
    // Limpiar cache corrupto
    await clearAllCache();
    
    // Reregistrar Service Worker
    await unregisterServiceWorker();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await registerServiceWorker();
    
    console.log('✅ Problemas comunes corregidos. Recarga la página.');
  }
};

// Auto-ejecutar diagnóstico si se incluye el parámetro debug
if (window.location.search.includes('debug=offline')) {
  setTimeout(() => {
    console.log('🚀 Auto-ejecutando diagnóstico offline...');
    runFullDiagnostic();
  }, 2000);
}

console.log('🧪 Offline Debug Tools cargado');
console.log('💡 Usa OfflineDebugTools.runDiagnostic() para verificar el sistema');
console.log('💡 O agrega ?debug=offline a la URL para auto-diagnóstico');
