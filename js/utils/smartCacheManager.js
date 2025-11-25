/**
 * 🧠 MEDICAL DEVELOPER - SISTEMA DE CACHÉ INTELIGENTE
 * Gestión avanzada de caché con estrategias adaptativas
 * Versión: 2.1.0
 */

class IntelligentCacheManager {
  constructor() {
    this.cacheName = 'medical-developer-smart-cache';
    this.cacheVersion = '2.1.0';
    this.maxCacheSize = 50; // MB
    this.cacheExpirationTime = 24 * 60 * 60 * 1000; // 24 horas
    this.priorityLevels = {
      CRITICAL: 1,    // Recursos esenciales
      HIGH: 2,        // Datos frecuentemente usados
      MEDIUM: 3,      // Datos ocasionales
      LOW: 4          // Recursos opcionales
    };
    
    this.init();
  }

  async init() {
    try {
      await this.cleanExpiredCache();
      await this.optimizeCacheSize();
      console.log('🧠 Cache Inteligente: Inicializado correctamente');
    } catch (error) {
      console.error('❌ Cache Inteligente: Error en inicialización:', error);
    }
  }

  /**
   * Estrategia de caché basada en prioridad y uso
   */
  async smartCache(request, priority = this.priorityLevels.MEDIUM) {
    const url = new URL(request.url);
    const cacheKey = this.generateCacheKey(url);
    
    try {
      // Verificar si existe en caché y no ha expirado
      const cachedResponse = await this.getCachedResponse(cacheKey);
      if (cachedResponse && !await this.isExpired(cacheKey)) {
        // Actualizar estadísticas de uso
        await this.updateUsageStats(cacheKey);
        console.log('📦 Cache Hit:', url.pathname);
        return cachedResponse;
      }

      // Intentar obtener de la red
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await this.storeWithPriority(cacheKey, networkResponse.clone(), priority);
        console.log('🌐 Network Success + Cache Store:', url.pathname);
        return networkResponse;
      }

      // Si la red falla, devolver caché expirado si existe
      if (cachedResponse) {
        console.log('⚠️ Using expired cache (network failed):', url.pathname);
        return cachedResponse;
      }

      throw new Error('Network failed and no cache available');
    } catch (error) {
      console.error('❌ Smart Cache Error:', error);
      return this.getFallbackResponse(request);
    }
  }

  /**
   * Almacenar con prioridad y metadatos
   */
  async storeWithPriority(cacheKey, response, priority) {
    const cache = await caches.open(this.cacheName);
    const metadata = {
      timestamp: Date.now(),
      priority: priority,
      accessCount: 1,
      lastAccess: Date.now(),
      size: await this.estimateResponseSize(response),
      contentType: response.headers.get('content-type') || 'unknown',
      version: this.cacheVersion
    };

    // Almacenar metadatos en localStorage
    const metadataKey = `cache_meta_${cacheKey}`;
    localStorage.setItem(metadataKey, JSON.stringify(metadata));

    // Almacenar respuesta en caché
    await cache.put(cacheKey, response);
    
    // Optimizar tamaño de caché si es necesario
    await this.optimizeCacheSize();
  }

  /**
   * Obtener respuesta cacheada con metadatos
   */
  async getCachedResponse(cacheKey) {
    const cache = await caches.open(this.cacheName);
    return await cache.match(cacheKey);
  }

  /**
   * Verificar si el caché ha expirado
   */
  async isExpired(cacheKey) {
    const metadataKey = `cache_meta_${cacheKey}`;
    const metadataStr = localStorage.getItem(metadataKey);
    
    if (!metadataStr) return true;
    
    try {
      const metadata = JSON.parse(metadataStr);
      const age = Date.now() - metadata.timestamp;
      
      // Expiración dinámica basada en prioridad
      const expirationTime = this.getExpirationTime(metadata.priority);
      return age > expirationTime;
    } catch {
      return true;
    }
  }

  /**
   * Obtener tiempo de expiración según prioridad
   */
  getExpirationTime(priority) {
    const baseTimes = {
      [this.priorityLevels.CRITICAL]: 7 * 24 * 60 * 60 * 1000,  // 7 días
      [this.priorityLevels.HIGH]: 3 * 24 * 60 * 60 * 1000,      // 3 días
      [this.priorityLevels.MEDIUM]: 24 * 60 * 60 * 1000,        // 1 día
      [this.priorityLevels.LOW]: 6 * 60 * 60 * 1000             // 6 horas
    };
    return baseTimes[priority] || this.cacheExpirationTime;
  }

  /**
   * Actualizar estadísticas de uso
   */
  async updateUsageStats(cacheKey) {
    const metadataKey = `cache_meta_${cacheKey}`;
    const metadataStr = localStorage.getItem(metadataKey);
    
    if (metadataStr) {
      try {
        const metadata = JSON.parse(metadataStr);
        metadata.accessCount += 1;
        metadata.lastAccess = Date.now();
        localStorage.setItem(metadataKey, JSON.stringify(metadata));
      } catch (error) {
        console.warn('⚠️ Error updating usage stats:', error);
      }
    }
  }

  /**
   * Limpiar caché expirado
   */
  async cleanExpiredCache() {
    const cache = await caches.open(this.cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const cacheKey = this.generateCacheKey(new URL(request.url));
      if (await this.isExpired(cacheKey)) {
        await cache.delete(request);
        localStorage.removeItem(`cache_meta_${cacheKey}`);
        console.log('🗑️ Removed expired cache:', request.url);
      }
    }
  }

  /**
   * Optimizar tamaño de caché
   */
  async optimizeCacheSize() {
    const cacheSize = await this.getCurrentCacheSize();
    if (cacheSize > this.maxCacheSize * 1024 * 1024) { // Convert MB to bytes
      await this.evictLeastUsedItems();
    }
  }

  /**
   * Obtener tamaño actual del caché
   */
  async getCurrentCacheSize() {
    let totalSize = 0;
    const cache = await caches.open(this.cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const cacheKey = this.generateCacheKey(new URL(request.url));
      const metadataKey = `cache_meta_${cacheKey}`;
      const metadataStr = localStorage.getItem(metadataKey);
      
      if (metadataStr) {
        try {
          const metadata = JSON.parse(metadataStr);
          totalSize += metadata.size || 0;
        } catch {}
      }
    }
    
    return totalSize;
  }

  /**
   * Expulsar elementos menos usados (LRU)
   */
  async evictLeastUsedItems() {
    const cache = await caches.open(this.cacheName);
    const requests = await cache.keys();
    const items = [];
    
    // Recopilar metadatos de uso
    for (const request of requests) {
      const cacheKey = this.generateCacheKey(new URL(request.url));
      const metadataKey = `cache_meta_${cacheKey}`;
      const metadataStr = localStorage.getItem(metadataKey);
      
      if (metadataStr) {
        try {
          const metadata = JSON.parse(metadataStr);
          items.push({
            request,
            cacheKey,
            metadata,
            score: this.calculateEvictionScore(metadata)
          });
        } catch {}
      }
    }
    
    // Ordenar por puntuación (menor puntuación = candidato a expulsión)
    items.sort((a, b) => a.score - b.score);
    
    // Eliminar 25% de los elementos menos usados
    const itemsToRemove = Math.floor(items.length * 0.25);
    for (let i = 0; i < itemsToRemove; i++) {
      const item = items[i];
      await cache.delete(item.request);
      localStorage.removeItem(`cache_meta_${item.cacheKey}`);
      console.log('🗑️ Evicted from cache:', item.request.url);
    }
  }

  /**
   * Calcular puntuación para expulsión (menor = más probable de ser eliminado)
   */
  calculateEvictionScore(metadata) {
    const ageFactor = (Date.now() - metadata.lastAccess) / (24 * 60 * 60 * 1000); // días
    const usageFactor = metadata.accessCount;
    const priorityFactor = 5 - metadata.priority; // Prioridad invertida
    const sizeFactor = metadata.size / (1024 * 1024); // MB
    
    return (priorityFactor * 10) + (usageFactor * -2) + (ageFactor * 1) + (sizeFactor * 0.1);
  }

  /**
   * Estimar tamaño de respuesta
   */
  async estimateResponseSize(response) {
    try {
      const clone = response.clone();
      const buffer = await clone.arrayBuffer();
      return buffer.byteLength;
    } catch {
      return 1024; // Estimación por defecto: 1KB
    }
  }

  /**
   * Generar clave de caché consistente
   */
  generateCacheKey(url) {
    const cleanUrl = `${url.protocol}//${url.host}${url.pathname}${url.search}`;
    return cleanUrl;
  }

  /**
   * Respuesta de fallback para errores
   */
  getFallbackResponse(request) {
    const isHTMLRequest = request.headers.get('accept')?.includes('text/html');
    
    if (isHTMLRequest) {
      return new Response(`
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Medical Developer - Sin Conexión</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              background: rgba(255,255,255,0.1);
              backdrop-filter: blur(10px);
              padding: 40px;
              border-radius: 20px;
              border: 1px solid rgba(255,255,255,0.2);
            }
            .icon { font-size: 4rem; margin-bottom: 20px; }
            .title { font-size: 2rem; margin-bottom: 15px; }
            .message { opacity: 0.9; margin-bottom: 30px; }
            .button {
              background: rgba(255,255,255,0.2);
              border: 1px solid rgba(255,255,255,0.3);
              color: white;
              padding: 12px 24px;
              border-radius: 10px;
              cursor: pointer;
              text-decoration: none;
              display: inline-block;
              transition: all 0.3s ease;
            }
            .button:hover {
              background: rgba(255,255,255,0.3);
              transform: translateY(-2px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">🏥</div>
            <h1 class="title">Medical Developer</h1>
            <p class="message">
              No se pudo cargar el recurso solicitado.<br>
              Verifica tu conexión a internet e intenta nuevamente.
            </p>
            <a href="/menuInicio.html" class="button">
              Ir al Dashboard
            </a>
          </div>
        </body>
        </html>
      `, {
        status: 503,
        statusText: 'Service Unavailable',
        headers: {
          'Content-Type': 'text/html; charset=utf-8'
        }
      });
    }
    
    return new Response('', {
      status: 503,
      statusText: 'Service Unavailable - Resource not cached'
    });
  }

  /**
   * Precargar recursos críticos
   */
  async preloadCriticalResources(urls) {
    const promises = urls.map(url => {
      const request = new Request(url);
      return this.smartCache(request, this.priorityLevels.CRITICAL);
    });
    
    try {
      await Promise.allSettled(promises);
      console.log('✅ Critical resources preloaded');
    } catch (error) {
      console.error('❌ Error preloading critical resources:', error);
    }
  }

  /**
   * Obtener estadísticas del caché
   */
  async getCacheStats() {
    const cache = await caches.open(this.cacheName);
    const requests = await cache.keys();
    const stats = {
      totalItems: 0,
      totalSize: 0,
      byPriority: {},
      byContentType: {},
      oldestItem: null,
      newestItem: null
    };
    
    let oldestTime = Date.now();
    let newestTime = 0;
    
    for (const request of requests) {
      const cacheKey = this.generateCacheKey(new URL(request.url));
      const metadataKey = `cache_meta_${cacheKey}`;
      const metadataStr = localStorage.getItem(metadataKey);
      
      if (metadataStr) {
        try {
          const metadata = JSON.parse(metadataStr);
          stats.totalItems++;
          stats.totalSize += metadata.size || 0;
          
          // Por prioridad
          const priorityName = Object.keys(this.priorityLevels).find(
            key => this.priorityLevels[key] === metadata.priority
          ) || 'UNKNOWN';
          stats.byPriority[priorityName] = (stats.byPriority[priorityName] || 0) + 1;
          
          // Por tipo de contenido
          const contentType = metadata.contentType.split('/')[0] || 'unknown';
          stats.byContentType[contentType] = (stats.byContentType[contentType] || 0) + 1;
          
          // Elementos más antiguos y nuevos
          if (metadata.timestamp < oldestTime) {
            oldestTime = metadata.timestamp;
            stats.oldestItem = request.url;
          }
          if (metadata.timestamp > newestTime) {
            newestTime = metadata.timestamp;
            stats.newestItem = request.url;
          }
        } catch {}
      }
    }
    
    return stats;
  }

  /**
   * Limpiar todo el caché
   */
  async clearAllCache() {
    const cache = await caches.open(this.cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const cacheKey = this.generateCacheKey(new URL(request.url));
      localStorage.removeItem(`cache_meta_${cacheKey}`);
    }
    
    await cache.delete();
    console.log('🗑️ All cache cleared');
  }
}

// Instancia global del gestor de caché inteligente
const smartCache = new IntelligentCacheManager();

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IntelligentCacheManager, smartCache };
}

console.log('🧠 Smart Cache Manager loaded successfully');
