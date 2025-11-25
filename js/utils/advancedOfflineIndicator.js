/**
 * 🌐 MEDICAL DEVELOPER - INDICADOR DE ESTADO OFFLINE/ONLINE AVANZADO
 * Sistema completo de monitoreo de conectividad y sincronización
 * Versión: 2.1.0
 */

class AdvancedOfflineIndicator {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isFirebaseConnected = false;
    this.isSyncing = false;
    this.pendingOperations = 0;
    this.lastSyncTime = null;
    this.indicator = null;
    this.syncProgress = 0;
    this.connectionQuality = 'unknown'; // poor, fair, good, excellent
    this.dataUsage = 0;
    
    this.checkingConnection = false;
    this.offlineStartTime = null;
    
    this.init();
  }

  init() {
    this.createAdvancedIndicator();
    this.bindEvents();
    this.startConnectionMonitoring();
    this.startPerformanceMonitoring();
    this.startOfflineDataMonitoring();
    
    // Registrar globalmente
    window.advancedOfflineIndicator = this;
    
    console.log('🌐 Advanced Offline Indicator inicializado');
  }

  createAdvancedIndicator() {
    // Contenedor principal
    this.indicator = document.createElement('div');
    this.indicator.id = 'advanced-offline-indicator';
    this.indicator.className = 'advanced-offline-indicator';
    
    // Estructura del indicador
    this.indicator.innerHTML = `
      <div class="indicator-main" onclick="window.advancedOfflineIndicator.toggleDetails()">
        <div class="status-icon">
          <i class="fas fa-wifi"></i>
          <div class="signal-bars">
            <span class="bar bar1"></span>
            <span class="bar bar2"></span>
            <span class="bar bar3"></span>
            <span class="bar bar4"></span>
          </div>
        </div>
        <div class="status-info">
          <div class="status-text">Conectado</div>
          <div class="status-details">Excelente</div>
        </div>
        <div class="sync-indicator">
          <div class="sync-progress" style="width: 0%"></div>
        </div>
      </div>
      
      <div class="indicator-details" style="display: none;">
        <div class="detail-section">
          <div class="detail-title">📶 Conexión</div>
          <div class="detail-info">
            <span class="connection-status">Online</span>
            <span class="connection-quality">Excelente</span>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-title">🔥 Firebase</div>
          <div class="detail-info">
            <span class="firebase-status">Conectado</span>
            <span class="firebase-latency">~50ms</span>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-title">🔄 Sincronización</div>
          <div class="detail-info">
            <span class="sync-status">Actualizado</span>
            <span class="last-sync">Hace 2 min</span>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-title">📋 Cola Offline</div>
          <div class="detail-info">
            <span class="pending-count">0 pendientes</span>
            <span class="data-usage">2.3 MB</span>
          </div>
        </div>
        
        <div class="detail-actions">
          <button class="action-btn sync-btn" onclick="window.advancedOfflineIndicator.forceSync()">
            <i class="fas fa-sync"></i> Sincronizar
          </button>
          <button class="action-btn cache-btn" onclick="window.advancedOfflineIndicator.clearCache()">
            <i class="fas fa-trash"></i> Limpiar Caché
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.indicator);
    this.addAdvancedStyles();
  }

  addAdvancedStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .advanced-offline-indicator {
        position: fixed;
        top: 20px;
        right: 270px;
        z-index: 9999;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(15px);
        border-radius: 16px;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .indicator-main {
        display: flex;
        align-items: center;
        padding: 12px 16px;
        gap: 12px;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .indicator-main:hover {
        background: rgba(255, 255, 255, 0.5);
      }

      .status-icon {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        font-size: 18px;
      }

      .signal-bars {
        position: absolute;
        bottom: 2px;
        right: -2px;
        display: flex;
        gap: 1px;
        align-items: end;
      }

      .bar {
        width: 2px;
        background: currentColor;
        border-radius: 1px;
        transition: height 0.3s, opacity 0.3s;
      }

      .bar1 { height: 4px; }
      .bar2 { height: 6px; }
      .bar3 { height: 8px; }
      .bar4 { height: 10px; }

      .status-info {
        flex: 1;
        min-width: 0;
      }

      .status-text {
        font-weight: 600;
        font-size: 14px;
        line-height: 1.2;
        margin-bottom: 2px;
      }

      .status-details {
        font-size: 12px;
        opacity: 0.7;
        line-height: 1;
      }

      .sync-indicator {
        position: relative;
        width: 40px;
        height: 4px;
        background: rgba(0, 0, 0, 0.1);
        border-radius: 2px;
        overflow: hidden;
      }

      .sync-progress {
        height: 100%;
        background: linear-gradient(90deg, #10b981, #059669);
        border-radius: 2px;
        transition: width 0.3s ease;
        position: relative;
      }

      .sync-progress::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shimmer 2s infinite;
      }

      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      /* Estados */
      .advanced-offline-indicator.online {
        background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1));
        border-color: rgba(16, 185, 129, 0.3);
        color: #065f46;
      }

      .advanced-offline-indicator.offline {
        background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.1));
        border-color: rgba(239, 68, 68, 0.3);
        color: #991b1b;
        animation: pulse 2s infinite;
      }

      .advanced-offline-indicator.syncing {
        background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.1));
        border-color: rgba(59, 130, 246, 0.3);
        color: #1e40af;
      }

      .advanced-offline-indicator.syncing .status-icon i {
        animation: spin 2s linear infinite;
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      /* Detalles expandidos */
      .indicator-details {
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        padding: 16px;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(10px);
      }

      .detail-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
      }

      .detail-section:last-child {
        margin-bottom: 16px;
      }

      .detail-title {
        font-size: 12px;
        font-weight: 600;
        opacity: 0.8;
      }

      .detail-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 2px;
      }

      .detail-info span {
        font-size: 12px;
        line-height: 1;
      }

      .detail-info span:first-child {
        font-weight: 600;
      }

      .detail-info span:last-child {
        opacity: 0.6;
      }

      .detail-actions {
        display: flex;
        gap: 8px;
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
      }

      .action-btn {
        flex: 1;
        background: rgba(59, 130, 246, 0.1);
        border: 1px solid rgba(59, 130, 246, 0.3);
        color: #1e40af;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }

      .action-btn:hover {
        background: rgba(59, 130, 246, 0.2);
        transform: translateY(-1px);
      }

      .action-btn i {
        font-size: 10px;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .advanced-offline-indicator {
          top: 15px;
          right: 60px;
          left: auto;
          max-width: none;
        }
      }
      
      @media (max-width: 480px) {
        .advanced-offline-indicator {
          right: 15px;
          left: 15px;
        }

        .indicator-main {
          padding: 10px 14px;
        }

        .indicator-details {
          padding: 12px;
        }

        .detail-actions {
          flex-direction: column;
        }
      }

      /* Calidad de conexión */
      .advanced-offline-indicator.poor .bar2,
      .advanced-offline-indicator.poor .bar3,
      .advanced-offline-indicator.poor .bar4 {
        opacity: 0.3;
      }

      .advanced-offline-indicator.fair .bar3,
      .advanced-offline-indicator.fair .bar4 {
        opacity: 0.3;
      }

      .advanced-offline-indicator.good .bar4 {
        opacity: 0.3;
      }

      /* Animaciones de estado */
      .advanced-offline-indicator.just-connected {
        animation: bounceIn 0.6s ease-out;
      }

      @keyframes bounceIn {
        0% {
          transform: translateX(100%) scale(0.8);
          opacity: 0;
        }
        50% {
          transform: translateX(-10px) scale(1.1);
        }
        100% {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    // Eventos básicos de conexión
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Integración con Firebase
    this.monitorFirebase();
    
    // Integración con Smart Cache Manager
    this.monitorCacheStatus();
  }

  handleOnline() {
    console.log('🌐 Conexión online detectada');
    this.offlineStartTime = null;
    this.checkConnectionQuality();
  }

  handleOffline() {
    console.log('📴 Conexión offline detectada');
    this.isOnline = false;
    this.isFirebaseConnected = false;
    this.connectionQuality = 'none';
    this.offlineStartTime = Date.now();
    this.updateDisplay();
  }

  async checkConnectionQuality() {
    if (!navigator.onLine) {
      this.connectionQuality = 'none';
      this.isOnline = false;
      this.updateDisplay();
      return;
    }

    this.checkingConnection = true;
    const startTime = Date.now();

    try {
      const response = await fetch(window.location.origin + '/index.html', {
        method: 'HEAD',
        cache: 'no-cache'
      });

      const latency = Date.now() - startTime;
      
      if (response.ok) {
        this.isOnline = true;
        this.connectionQuality = this.calculateQuality(latency);
        
        if (!this.wasOnlineBefore) {
          this.indicator?.classList.add('just-connected');
          setTimeout(() => {
            this.indicator?.classList.remove('just-connected');
          }, 600);
          this.wasOnlineBefore = true;
        }
      } else {
        this.isOnline = false;
        this.connectionQuality = 'none';
      }
    } catch (error) {
      this.isOnline = false;
      this.connectionQuality = 'none';
    }

    this.checkingConnection = false;
    this.updateDisplay();
  }

  calculateQuality(latency) {
    if (latency < 100) return 'excellent';
    if (latency < 300) return 'good';
    if (latency < 600) return 'fair';
    return 'poor';
  }

  monitorFirebase() {
    // Monitorear conexión Firebase si está disponible
    if (window.firebase && firebase.database) {
      const connectedRef = firebase.database().ref('.info/connected');
      connectedRef.on('value', (snapshot) => {
        this.isFirebaseConnected = snapshot.val() === true;
        this.updateDisplay();
        console.log('🔥 Firebase:', this.isFirebaseConnected ? 'Conectado' : 'Desconectado');
      });
    }
  }

  monitorCacheStatus() {
    // Monitorear estado del caché inteligente
    if (window.smartCache) {
      setInterval(async () => {
        try {
          const stats = await window.smartCache.getCacheStats();
          this.dataUsage = Math.round(stats.totalSize / (1024 * 1024) * 10) / 10; // MB
          this.updateDisplay();
        } catch (error) {
          console.warn('⚠️ Error obteniendo stats de caché:', error);
        }
      }, 30000); // Cada 30 segundos
    }
  }

  startConnectionMonitoring() {
    // Verificar calidad de conexión periódicamente
    setInterval(() => {
      if (navigator.onLine && !this.checkingConnection) {
        this.checkConnectionQuality();
      }
    }, 15000); // Cada 15 segundos
  }

  startPerformanceMonitoring() {
    // Monitorear rendimiento de la red
    if ('connection' in navigator) {
      const connection = navigator.connection;
      
      const updateConnection = () => {
        const effectiveType = connection.effectiveType;
        const downlink = connection.downlink;
        
        if (effectiveType === 'slow-2g' || downlink < 0.5) {
          this.connectionQuality = 'poor';
        } else if (effectiveType === '2g' || downlink < 1.5) {
          this.connectionQuality = 'fair';
        } else if (effectiveType === '3g' || downlink < 10) {
          this.connectionQuality = 'good';
        } else {
          this.connectionQuality = 'excellent';
        }
        
        this.updateDisplay();
      };

      connection.addEventListener('change', updateConnection);
      updateConnection(); // Llamada inicial
    }
  }

  updateDisplay() {
    if (!this.indicator) return;

    // Actualizar clases de estado
    this.indicator.className = 'advanced-offline-indicator';
    
    if (this.isSyncing) {
      this.indicator.classList.add('syncing');
    } else if (this.isOnline) {
      this.indicator.classList.add('online');
    } else {
      this.indicator.classList.add('offline');
    }

    // Actualizar calidad de señal
    this.indicator.classList.add(this.connectionQuality);

    // Actualizar contenido principal
    const statusText = this.indicator.querySelector('.status-text');
    const statusDetails = this.indicator.querySelector('.status-details');
    const syncProgress = this.indicator.querySelector('.sync-progress');

    if (statusText && statusDetails && syncProgress) {
      if (this.isSyncing) {
        statusText.textContent = 'Sincronizando';
        statusDetails.textContent = `${this.syncProgress}%`;
        syncProgress.style.width = `${this.syncProgress}%`;
      } else if (this.isOnline) {
        statusText.textContent = 'Conectado';
        statusDetails.textContent = this.getQualityText(this.connectionQuality);
        syncProgress.style.width = '100%';
      } else {
        statusText.textContent = 'Sin conexión';
        statusDetails.textContent = this.getOfflineTime();
        syncProgress.style.width = '0%';
      }
    }

    // Actualizar detalles expandidos
    this.updateDetailedInfo();
  }

  getQualityText(quality) {
    const texts = {
      excellent: 'Excelente',
      good: 'Buena',
      fair: 'Regular',
      poor: 'Lenta',
      none: 'Sin conexión'
    };
    return texts[quality] || 'Desconocida';
  }

  getOfflineTime() {
    if (!this.offlineStartTime) return 'Offline';
    
    const elapsed = Date.now() - this.offlineStartTime;
    const minutes = Math.floor(elapsed / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes} min`;
    return 'Ahora';
  }

  updateDetailedInfo() {
    // Actualizar información detallada
    const connectionStatus = this.indicator.querySelector('.connection-status');
    const connectionQuality = this.indicator.querySelector('.connection-quality');
    const firebaseStatus = this.indicator.querySelector('.firebase-status');
    const syncStatus = this.indicator.querySelector('.sync-status');
    const lastSync = this.indicator.querySelector('.last-sync');
    const pendingCount = this.indicator.querySelector('.pending-count');
    const dataUsage = this.indicator.querySelector('.data-usage');

    if (connectionStatus) {
      connectionStatus.textContent = this.isOnline ? 'Online' : 'Offline';
    }

    if (connectionQuality) {
      connectionQuality.textContent = this.getQualityText(this.connectionQuality);
    }

    if (firebaseStatus) {
      firebaseStatus.textContent = this.isFirebaseConnected ? 'Conectado' : 'Desconectado';
    }

    if (syncStatus) {
      if (this.isSyncing) {
        syncStatus.textContent = 'Sincronizando';
      } else {
        const pendingCount = this.getRealPendingCount();
        if (pendingCount > 0) {
          syncStatus.textContent = 'Pendiente';
        } else {
          syncStatus.textContent = 'Actualizado';
        }
      }
    }

    if (lastSync && this.lastSyncTime) {
      const elapsed = Date.now() - this.lastSyncTime;
      const minutes = Math.floor(elapsed / 60000);
      lastSync.textContent = minutes > 0 ? `Hace ${minutes} min` : 'Ahora';
    }

    if (pendingCount) {
      // Obtener conteo real de datos pendientes
      const realPendingCount = this.getRealPendingCount();
      if (realPendingCount > 0) {
        pendingCount.textContent = `${realPendingCount} pendientes`;
        pendingCount.style.color = '#f59e0b'; // Color amarillo para indicar datos pendientes
        pendingCount.style.fontWeight = 'bold';
      } else {
        pendingCount.textContent = '0 pendientes';
        pendingCount.style.color = '';
        pendingCount.style.fontWeight = '';
      }
    }

    if (dataUsage) {
      dataUsage.textContent = `${this.dataUsage} MB`;
    }
  }

  toggleDetails() {
    const details = this.indicator.querySelector('.indicator-details');
    if (details) {
      const isVisible = details.style.display !== 'none';
      details.style.display = isVisible ? 'none' : 'block';
    }
  }

  async forceSync() {
    if (!this.isOnline) {
      console.log('⚠️ No se puede sincronizar sin conexión');
      return;
    }

    this.isSyncing = true;
    this.syncProgress = 0;
    this.updateDisplay();

    try {
      // Debug: verificar servicios disponibles
      console.log('🔍 Servicios disponibles:', {
        offlineSyncService: !!window.offlineSyncService,
        firebaseSyncManager: !!window.firebaseSyncManager,
        offlineSyncServiceType: typeof window.offlineSyncService,
        firebaseSyncManagerType: typeof window.firebaseSyncManager
      });

      // Simular progreso de sincronización
      const progressInterval = setInterval(() => {
        this.syncProgress += 10;
        this.updateDisplay();
        
        if (this.syncProgress >= 100) {
          clearInterval(progressInterval);
        }
      }, 200);

      // Ejecutar sincronización real con offlineSyncService
      if (window.offlineSyncService && typeof window.offlineSyncService.flushAll === 'function') {
        console.log('🔄 Iniciando sincronización de datos offline...');
        const result = await window.offlineSyncService.flushAll();
        console.log('📊 Resultado de sincronización:', result);
        
        if (result.processed) {
          const totalProcessed = Object.values(result.processed).reduce((a, b) => a + b, 0);
          console.log(`✅ ${totalProcessed} elementos sincronizados exitosamente`);
          
          // Mostrar mensaje de éxito detallado
          if (window.firebaseSyncManager && typeof window.firebaseSyncManager.showSyncMessage === 'function') {
            const details = [];
            if (result.processed.patients > 0) details.push(`${result.processed.patients} pacientes`);
            if (result.processed.activities > 0) details.push(`${result.processed.activities} actividades`);
            if (result.processed.medicalRecords > 0) details.push(`${result.processed.medicalRecords} registros médicos`);
            
            const message = totalProcessed > 0 
              ? `Sincronizados: ${details.join(', ')}`
              : 'No había datos pendientes';
              
            window.firebaseSyncManager.showSyncMessage(
              'Sincronización manual completada', 
              totalProcessed > 0 ? 'success' : 'info', 
              message, 
              4000
            );
          }
        } else {
          console.log('ℹ️ No había datos pendientes para sincronizar');
        }
      } else if (window.firebaseSyncManager) {
        await window.firebaseSyncManager.forceSync('Sincronización manual');
      } else {
        console.warn('⚠️ No hay servicios de sincronización disponibles');
      }

      this.lastSyncTime = Date.now();
      console.log('✅ Sincronización forzada completada');

    } catch (error) {
      console.error('❌ Error en sincronización forzada:', error);
    } finally {
      this.isSyncing = false;
      this.syncProgress = 0;
      this.updateDisplay();
    }
  }

  async clearCache() {
    try {
      if (window.smartCache) {
        await window.smartCache.clearAllCache();
      }
      
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(name => caches.delete(name))
        );
      }

      this.dataUsage = 0;
      this.updateDisplay();
      console.log('✅ Caché limpiado completamente');

    } catch (error) {
      console.error('❌ Error limpiando caché:', error);
    }
  }

  // Métodos de integración
  setSyncProgress(progress) {
    this.syncProgress = Math.max(0, Math.min(100, progress));
    this.updateDisplay();
  }

  setSyncing(syncing) {
    this.isSyncing = syncing;
    this.updateDisplay();
  }

  setPendingOperations(count) {
    this.pendingOperations = count;
    this.updateDisplay();
  }

  getRealPendingCount() {
    try {
      if (window.offlineSyncService && typeof window.offlineSyncService.getPendingSummary === 'function') {
        const summary = window.offlineSyncService.getPendingSummary();
        return summary.total || 0;
      }
      return this.pendingOperations;
    } catch (error) {
      console.error('Error obteniendo conteo pendiente:', error);
      return this.pendingOperations;
    }
  }

  startOfflineDataMonitoring() {
    // Actualizar datos cada 5 segundos
    setInterval(() => {
      this.updateDisplay();
    }, 5000);

    // Escuchar eventos de cambio en la cola offline
    if (window.addEventListener) {
      window.addEventListener('offlineSyncPending', (event) => {
        console.log('🔄 Datos pendientes de sincronización detectados:', event.detail);
        this.updateDisplay();
      });

      // Escuchar eventos del eventBus si está disponible
      if (window.eventBus && typeof window.eventBus.on === 'function') {
        window.eventBus.on('OFFLINE_QUEUE_CHANGED', (summary) => {
          console.log('📋 Cola offline actualizada:', summary);
          this.updateDisplay();
        });
      }
    }
  }

  // Método estático para inicialización
  static init() {
    if (!window.advancedOfflineIndicator) {
      window.advancedOfflineIndicator = new AdvancedOfflineIndicator();
    }
    return window.advancedOfflineIndicator;
  }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AdvancedOfflineIndicator };
}

console.log('🌐 Advanced Offline Indicator loaded successfully');
