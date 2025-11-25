/**
 * 🔄 MEDICAL DEVELOPER - SERVICE WORKER
 * Sistema avanzado de caché y funcionalidad offline
 * Versión: 2.1.0
 */

const CACHE_NAME = 'medical-developer-v2.1.0';
const DATA_CACHE_NAME = 'medical-dev-data-v1.0.0';
const TILES_CACHE_NAME = 'medical-dev-map-tiles-v1.0.0';

// Recursos críticos que siempre deben estar en caché
const CRITICAL_RESOURCES = [
  './',
  './menuInicio.html',
  './index.html',
  
  // CSS Crítico
  './css/imageComponents.css',
  './css/pacientes.css',
  
  // JavaScript Crítico
  './js/controllers/authController.js',
  './js/controllers/globalController.js',
  './js/controllers/menuController.js',
  './js/controllers/pacienteController.js',
  './js/utils/advancedOfflineIndicator.js',
  './js/utils/firebaseSyncManager.js',
  './js/utils/dashboardHeaderManager.js',
  './js/utils/smartCacheManager.js',
  './js/utils/advancedOfflineIndicator.js',
  './js/utils/automaticSyncManager.js',
  './js/utils/offlineInitializer.js',
  './js/models/firebaseConfig.js',
  './js/models/gestionModel.js',
  './js/models/storageModel.js',
  './js/middleware/authGuard.js',
  './js/views/MenuInicio.js',
  './js/utils/eventBusManager.js',
  './js/utils/performanceMonitor.js',
  './js/utils/dashboardAnimations.js',
  './js/utils/userDisplayGlobal.js',
  
  // Recursos de UI
  './img/medical-background.png',
  './img/logo-medical-developer.jpg',
  
  // Archivos de ayuda
  './help/Manual de usuario Administrador & Practicante.pdf',
  
  // Manifest
  './manifest.json',
  
  // Páginas principales
  './pages/categoria-pacientes.html',
  './pages/categoria-gestion.html',
  './pages/categoria-operaciones-control.html',
  './pages/categoria-reportes.html',
  './pages/categoria-usuarios-personal.html',
  './pages/mapa-modulos.html'
];

// Recursos que se cachean bajo demanda
const DYNAMIC_CACHE_PATTERNS = [
  /^https:\/\/cdnjs\.cloudflare\.com/,
  /^https:\/\/fonts\.googleapis\.com/,
  /^https:\/\/fonts\.gstatic\.com/,
  /^https:\/\/kit\.fontawesome\.com/
];

// Firebase URLs que requieren manejo especial
const FIREBASE_PATTERNS = [
  /firebaseapp\.com/,
  /firestore\.googleapis\.com/,
  /firebase\.googleapis\.com/
];

/**
 * Estrategia de caché: Cache First con Network Fallback
 */
class CacheStrategy {
  
  static async cacheFirst(request) {
    try {
      const cache = await caches.open(CACHE_NAME);
      
      // Intentar múltiples variaciones de la URL
      const urls = [
        request.url,
        request.url.replace(/^\/pages\//, './'),
        request.url.replace(/^.*\/pages\//, './pages/'),
        new URL(request.url, self.location.origin).href
      ];
      
      // Buscar en caché con diferentes variaciones
      for (const url of urls) {
        const cachedResponse = await cache.match(url);
        if (cachedResponse) {
          console.log('✅ Cache hit for:', url);
          // Actualizar en segundo plano si es necesario
          CacheStrategy.updateInBackground(request);
          return cachedResponse;
        }
      }
      
      // No está en caché, intentar red
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
        console.log('📥 Cached from network:', request.url);
        return networkResponse;
      } else {
        throw new Error(`Network response not ok: ${networkResponse.status}`);
      }
      
    } catch (error) {
      console.warn('🚫 Network failed for:', request.url, error.message);
      
      // Intentar fallback específico para recursos conocidos
      if (request.url.includes('.js')) {
        return new Response('console.log("Offline fallback for JS file");', {
          headers: { 'Content-Type': 'application/javascript' }
        });
      }
      
      if (request.url.includes('.css')) {
        return new Response('/* Offline fallback for CSS file */', {
          headers: { 'Content-Type': 'text/css' }
        });
      }
      
      if (request.url.includes('.png') || request.url.includes('.jpg')) {
        return new Response('', {
          status: 200,
          headers: { 'Content-Type': 'image/svg+xml' }
        });
      }
      
      return CacheStrategy.getOfflineFallback(request);
    }
  }
  
  static async networkFirst(request) {
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok && request.method === 'GET') {
        // Solo cachear requests GET, no POST/PUT/DELETE
        try {
          const cache = await caches.open(DATA_CACHE_NAME);
          await cache.put(request, networkResponse.clone());
        } catch (cacheError) {
          console.warn('⚠️ Error cacheando request:', cacheError.message);
        }
      }
      return networkResponse;
    } catch (error) {
      // Solo buscar en caché para requests GET
      if (request.method === 'GET') {
        const cache = await caches.open(DATA_CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
          console.log('📱 Sirviendo desde caché (networkFirst):', request.url);
          return cachedResponse;
        }
      }
      throw error;
    }
  }
  
  static async staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    const networkPromise = fetch(request).then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    }).catch(() => null);
    
    return cachedResponse || await networkPromise;
  }
  
  static async cacheFirstWithGracefulFallback(request) {
    try {
      const cache = await caches.open(TILES_CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('🗺️ Tile desde caché:', request.url.split('/').slice(-3).join('/'));
        return cachedResponse;
      }
      
      // Intentar obtener desde red
      try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
          await cache.put(request, networkResponse.clone());
          console.log('🗺️ Tile cacheado:', request.url.split('/').slice(-3).join('/'));
          return networkResponse;
        }
      } catch (networkError) {
        console.log('🚫 Tile no disponible offline:', request.url.split('/').slice(-3).join('/'));
      }
      
      // Fallback: devolver una imagen de tile vacío/placeholder
      return new Response(
        '<svg width="256" height="256" xmlns="http://www.w3.org/2000/svg"><rect width="256" height="256" fill="#f0f0f0"/><text x="128" y="128" text-anchor="middle" fill="#999" font-size="14">Sin conexión</text></svg>',
        {
          status: 200,
          headers: {
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'no-cache'
          }
        }
      );
    } catch (error) {
      console.warn('⚠️ Error en cacheFirstWithGracefulFallback:', error);
      // Fallback básico
      return new Response('', { status: 503 });
    }
  }
  
  static async updateInBackground(request) {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response);
      }
    } catch (error) {
      // Silently fail background updates
    }
  }
  
  static async getOfflineFallback(request) {
    const cache = await caches.open(CACHE_NAME);
    
    // Para páginas HTML, devolver página principal
    if (request.headers.get('accept').includes('text/html')) {
      return await cache.match('/menuInicio.html') || 
             await cache.match('/index.html') ||
             new Response(CacheStrategy.getOfflineHTML(), {
               headers: { 'Content-Type': 'text/html' }
             });
    }
    
    // Para otros recursos, devolver respuesta vacía
    return new Response('', { 
      status: 408, 
      statusText: 'Offline - Resource not available' 
    });
  }
  
  static getOfflineHTML() {
    return `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Medical Developer - Offline</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #7dd3fc, #fef3c7);
            color: #1f2937;
          }
          .offline-container {
            text-align: center;
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.1);
            max-width: 400px;
          }
          .offline-icon { font-size: 4rem; margin-bottom: 20px; }
          .offline-title { font-size: 1.5rem; margin-bottom: 15px; color: #0f5671; }
          .offline-message { color: #6b7280; margin-bottom: 25px; }
          .retry-btn {
            background: #0f5671;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="offline-container">
          <div class="offline-icon">📱</div>
          <h1 class="offline-title">Medical Developer</h1>
          <p class="offline-message">
            La aplicación está funcionando sin conexión.<br>
            Algunas funciones pueden estar limitadas.
          </p>
          <button class="retry-btn" onclick="window.location.reload()">
            Reintentar Conexión
          </button>
        </div>
      </body>
      </html>
    `;
  }
}

/**
 * Manejador de eventos del Service Worker
 */

// Instalación del Service Worker
self.addEventListener('install', event => {
  console.log('🔧 Medical Developer SW: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        console.log('📦 SW: Cacheando recursos críticos...');
        
        // Cache recursos uno por uno para mejor manejo de errores
        const successfulCache = [];
        const failedCache = [];
        
        for (const resource of CRITICAL_RESOURCES) {
          try {
            await cache.add(resource);
            successfulCache.push(resource);
            console.log(`✅ Cached: ${resource}`);
          } catch (error) {
            failedCache.push({ resource, error: error.message });
            console.warn(`⚠️ Failed to cache: ${resource} - ${error.message}`);
          }
        }
        
        console.log(`✅ SW: ${successfulCache.length} recursos cacheados exitosamente`);
        if (failedCache.length > 0) {
          console.warn(`⚠️ SW: ${failedCache.length} recursos no pudieron ser cacheados`);
        }
        
        return self.skipWaiting(); // Activar inmediatamente
      })
      .catch(error => {
        console.error('❌ SW: Error durante instalación:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', event => {
  console.log('🚀 Medical Developer SW: Activando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Eliminar cachés antiguos
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log('🗑️ SW: Eliminando caché antiguo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ SW: Activado correctamente');
      return self.clients.claim(); // Tomar control inmediatamente
    })
  );
});

// Interceptación de requests
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Ignorar requests no HTTP/HTTPS
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Manejo especial para Firebase
  if (FIREBASE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(CacheStrategy.networkFirst(request));
    return;
  }
  
  // Manejo especial para tiles del mapa de OpenStreetMap
  if (request.url.includes('tile.openstreetmap.org')) {
    event.respondWith(CacheStrategy.cacheFirstWithGracefulFallback(request));
    return;
  }
  
  // Manejo de recursos dinámicos (CDNs, fonts, etc.)
  if (DYNAMIC_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(CacheStrategy.staleWhileRevalidate(request));
    return;
  }
  
  // Manejo de APIs y datos dinámicos
  if (url.pathname.includes('/api/') || url.search.includes('api')) {
    event.respondWith(CacheStrategy.networkFirst(request));
    return;
  }
  
  // Manejo de recursos estáticos
  if (request.method === 'GET') {
    event.respondWith(CacheStrategy.cacheFirst(request));
  }
});

// Sincronización en segundo plano
self.addEventListener('sync', event => {
  console.log('🔄 SW: Sync event:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

// Manejo de mensajes desde la aplicación
self.addEventListener('message', event => {
  console.log('📨 SW: Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => {
        return cache.addAll(event.data.urls);
      })
    );
  }
});

// Funciones auxiliares
async function doBackgroundSync() {
  try {
    // Aquí se implementaría la lógica de sincronización
    console.log('🔄 SW: Realizando sincronización en segundo plano...');
    
    // Ejemplo: sincronizar datos pendientes
    const pendingData = await getStoredPendingData();
    if (pendingData.length > 0) {
      await syncPendingData(pendingData);
    }
    
    console.log('✅ SW: Sincronización completada');
  } catch (error) {
    console.error('❌ SW: Error en sincronización:', error);
    throw error;
  }
}

async function getStoredPendingData() {
  // Implementar lógica para obtener datos pendientes de IndexedDB
  return [];
}

async function syncPendingData(data) {
  // Implementar lógica para sincronizar datos con el servidor
  console.log('Sincronizando datos:', data.length, 'elementos');
}

// Notificaciones Push (preparado para futuras implementaciones)
self.addEventListener('push', event => {
  if (event.data) {
    const options = {
      body: event.data.text(),
      icon: '/img/logo-medical-developer.jpg',
      badge: '/img/logo-medical-developer.jpg',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: 1
      },
      actions: [
        {
          action: 'explore',
          title: 'Abrir aplicación',
          icon: '/img/logo-medical-developer.jpg'
        },
        {
          action: 'close',
          title: 'Cerrar',
          icon: '/img/logo-medical-developer.jpg'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification('Medical Developer', options)
    );
  }
});

// Manejo de clics en notificaciones
self.addEventListener('notificationclick', event => {
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

console.log('🏥 Medical Developer Service Worker cargado - Versión:', CACHE_NAME);
