/**
 * Service Worker para Medical Developer
 * Maneja cache de recursos para navegación offline
 */

const CACHE_NAME = 'medical-dev-v4.2.0-azure';
const STATIC_CACHE = 'medical-static-v4.2.0-azure';
const DYNAMIC_CACHE = 'medical-dynamic-v4.2.0-azure';

// Archivos que NUNCA deben ser cacheados (siempre desde red)
const NETWORK_ONLY = [
  '/menuInicio.html',
  './menuInicio.html'
];

// Recursos estáticos críticos para cache
const STATIC_ASSETS = [
  './',
  './index.html',
  // menuInicio.html removido - siempre cargar desde red
  './manifest.json',
  './pages/categoria-pacientes.html',
  './pages/categoria-gestion.html', 
  './pages/categoria-operaciones-control.html',
  './pages/categoria-reportes.html',
  './pages/categoria-usuarios-personal.html',
  './pages/mapa-modulos.html',
  './css/imageComponents.css',
  './css/pacientes.css',
  './js/middleware/authGuard.js',
  './js/controllers/pacienteController.js',
  './js/controllers/authController.js',
  './js/controllers/menuController.js',
  './js/controllers/gestionController.js',
  './js/controllers/operacionesController.js',
  './js/controllers/reporteController.js',
  './js/controllers/usersController.js',
  './js/controllers/instrumentosController.js',
  './js/controllers/adminInstrumentosController.js',
  './js/controllers/globalController.js',
  './js/models/pacienteModel.js',
  './js/models/firebaseConfig.js',
  './js/models/gestionModel.js',
  './js/models/storageModel.js',
  './js/utils/offlineSyncService.js',
  './js/utils/offlineNotificationManager.js',
  './js/utils/connectionIndicator.js',
  './js/utils/userDisplayGlobal.js',
  './js/utils/eventBusManager.js',
  './js/utils/performanceMonitor.js',
  './js/utils/dashboardAnimations.js',
  './js/utils/dashboardHeaderManager.js',
  './js/utils/firebaseSyncManager.js',
  './js/views/pacienteView.js',
  './js/views/menuView.js',
  './js/views/gestionView.js',
  './js/views/operacionesView.js',
  './js/views/reporteView.js',
  './js/views/userView.js',
  './js/views/MenuInicio.js',
  './img/medical-background.png',
  './img/logo-medical-developer.jpg',
  './img/uat-logo-2023.png'
];

// Recursos que se cachean dinámicamente
const DYNAMIC_PATTERNS = [
  /^\.\/js\/.+\.js$/,
  /^\.\/css\/.+\.css$/,
  /^\.\/img\/.+\.(png|jpg|jpeg|svg|ico)$/,
  /^\.\/help\/.+\.html$/,
  /\/js\/.+\.js$/,
  /\/css\/.+\.css$/,
  /\/img\/.+\.(png|jpg|jpeg|svg|ico)$/,
  /\/help\/.+\.html$/
];

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker v4.2.0: Instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker v4.2.0: Cacheando recursos estáticos');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, {
          cache: 'reload'
        })));
      })
      .then(() => {
        console.log('✅ Service Worker v4.2.0: Instalación completa - forzando activación');
        // Forzar que el nuevo SW se active inmediatamente
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Error durante instalación:', error);
        // Intentar activar de todas formas
        return self.skipWaiting();
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker v4.2.0: Activando...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Eliminar TODOS los caches antiguos sin excepción
        console.log(`🗑️ Eliminando ${cacheNames.length} caches antiguos...`);
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Eliminar todo cache que no sea la versión actual
              return cacheName !== STATIC_CACHE && 
                     cacheName !== DYNAMIC_CACHE;
            })
            .map((cacheName) => {
              console.log(`🗑️ Service Worker: Eliminando cache: ${cacheName}`);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('✅ Service Worker v4.2.0: Activación completa');
        // Tomar control de todas las páginas inmediatamente
        return self.clients.claim();
      })
      .then(() => {
        // Notificar a todos los clientes que deben recargar
        return self.clients.matchAll().then(clients => {
          clients.forEach(client => {
            client.postMessage({
              type: 'SW_UPDATED',
              version: '4.2.0'
            });
          });
        });
      })
  );
});

// Interceptar requests
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Solo manejar requests del mismo origen o localhost
  if (url.origin !== location.origin && !url.hostname.includes('localhost')) {
    return;
  }

  // 🚀 NETWORK ONLY para archivos específicos (menuInicio.html siempre desde red)
  const pathname = url.pathname;
  const isNetworkOnly = NETWORK_ONLY.some(path => 
    pathname.includes(path) || pathname.endsWith('menuInicio.html')
  );
  
  if (isNetworkOnly) {
    event.respondWith(
      fetch(request, {
        cache: 'no-store',
        credentials: 'same-origin'
      }).catch(() => {
        // Si falla, intentar desde cache como último recurso
        return caches.match(request);
      })
    );
    return;
  }

  // Estrategia Cache First para recursos estáticos
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request));
  }
});

/**
 * Maneja requests GET con estrategia Cache First
 */
async function handleGetRequest(request) {
  const url = new URL(request.url);
  
  try {
    // 1. Buscar en cache estático primero
    const staticResponse = await caches.match(request, { 
      cacheName: STATIC_CACHE,
      ignoreSearch: true 
    });
    
    if (staticResponse) {
      return staticResponse;
    }

    // 2. Buscar en cache dinámico
    const dynamicResponse = await caches.match(request, {
      cacheName: DYNAMIC_CACHE,
      ignoreSearch: true
    });
    
    if (dynamicResponse) {
      return dynamicResponse;
    }

    // 3. Si no está en cache, intentar fetch si está online
    if (navigator.onLine) {
      try {
        const networkResponse = await fetch(request, {
          cache: 'no-cache',
          credentials: 'same-origin'
        });
        
        // Cachear respuesta si es exitosa y coincide con patrones
        if (networkResponse.ok && shouldCacheDynamically(url.pathname)) {
          const cache = await caches.open(DYNAMIC_CACHE);
          cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
      } catch (fetchError) {
        console.log('⚠️ Service Worker: Fetch falló, intentando cache alternativo');
        // Continuar al manejo offline
      }
    }
    
    // 4. Manejo offline o fetch fallido
    {
      // Offline: manejar diferentes tipos de requests
      if (request.mode === 'navigate') {
        // Para navegación, devolver página principal cacheada
        const offlineResponse = await caches.match('./menuInicio.html') || 
                                await caches.match('/menuInicio.html') ||
                                await caches.match('./index.html') ||
                                await caches.match('/index.html');
        if (offlineResponse) {
          return offlineResponse;
        }
      } else if (request.destination === 'script') {
        // Para scripts JS, devolver script vacío para evitar errores
        return new Response('// Script no disponible offline', {
          status: 200,
          headers: { 'Content-Type': 'application/javascript' }
        });
      } else if (request.destination === 'style') {
        // Para CSS, devolver CSS vacío
        return new Response('/* Estilo no disponible offline */', {
          status: 200,
          headers: { 'Content-Type': 'text/css' }
        });
      } else if (request.destination === 'image') {
        // Para imágenes, devolver imagen placeholder si está disponible
        const placeholder = await caches.match('/img/medical-background.png');
        if (placeholder) {
          return placeholder;
        }
      }
      
      // Para otros recursos, devolver error controlado
      throw new Error('Sin conexión y recurso no disponible en cache');
    }
    
  } catch (error) {
    console.log('⚠️ Service Worker: Request fallido:', error.message);
    
    // Fallback para navegación
    if (request.mode === 'navigate') {
      const fallback = await caches.match('./menuInicio.html') || 
                      await caches.match('/menuInicio.html') ||
                      await caches.match('./index.html') ||
                      await caches.match('/index.html');
      if (fallback) {
        return fallback;
      }
    }
    
    // Fallback genérico
    return new Response(
      JSON.stringify({ 
        error: 'Recurso no disponible offline',
        message: 'Este contenido requiere conexión a internet'
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

/**
 * Determina si un recurso debe cachearse dinámicamente
 */
function shouldCacheDynamically(pathname) {
  return DYNAMIC_PATTERNS.some(pattern => pattern.test(pathname));
}

// Manejar mensajes del cliente
self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {};
  
  switch (type) {
    case 'CACHE_URLS':
      handleCacheUrls(payload);
      break;
      
    case 'CLEAR_CACHE':
      handleClearCache();
      break;
      
    case 'GET_CACHE_STATUS':
      handleGetCacheStatus(event);
      break;
      
    default:
      console.log('📨 Service Worker: Mensaje no reconocido:', type);
  }
});

/**
 * Cachea URLs específicas bajo demanda
 */
async function handleCacheUrls(urls) {
  try {
    const cache = await caches.open(DYNAMIC_CACHE);
    await cache.addAll(urls);
    console.log('✅ Service Worker: URLs cacheadas:', urls.length);
  } catch (error) {
    console.error('❌ Service Worker: Error cacheando URLs:', error);
  }
}

/**
 * Limpia todos los caches
 */
async function handleClearCache() {
  try {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames.map(cacheName => caches.delete(cacheName))
    );
    console.log('🗑️ Service Worker: Todos los caches eliminados');
  } catch (error) {
    console.error('❌ Service Worker: Error limpiando cache:', error);
  }
}

/**
 * Obtiene estado del cache
 */
async function handleGetCacheStatus(event) {
  try {
    const cacheNames = await caches.keys();
    const cacheStatus = {};
    
    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      cacheStatus[cacheName] = keys.length;
    }
    
    event.ports[0].postMessage({
      type: 'CACHE_STATUS_RESPONSE',
      payload: cacheStatus
    });
  } catch (error) {
    console.error('❌ Service Worker: Error obteniendo estado cache:', error);
    event.ports[0].postMessage({
      type: 'CACHE_STATUS_ERROR',
      error: error.message
    });
  }
}