/**
 * 🔄 MEDICAL DEVELOPER - SISTEMA DE SINCRONIZACIÓN AUTOMÁTICA
 * Gestor inteligente de sincronización con Firebase y operaciones offline
 * Versión: 2.1.0
 */

class AutomaticSyncManager {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isFirebaseConnected = false;
    this.syncInProgress = false;
    this.syncQueue = [];
    this.syncStats = {
      totalSyncs: 0,
      successfulSyncs: 0,
      failedSyncs: 0,
      lastSyncTime: null,
      averageSyncTime: 0
    };
    
    // Configuración de sincronización
    this.config = {
      autoSyncInterval: 30000,        // 30 segundos
      retryInterval: 5000,            // 5 segundos
      maxRetries: 3,
      batchSize: 10,                  // Operaciones por lote
      priorityQueues: {
        CRITICAL: [],   // Datos críticos (usuarios, auth)
        HIGH: [],       // Operaciones médicas
        MEDIUM: [],     // Reportes, imágenes
        LOW: []         // Logs, analytics
      }
    };
    
    this.syncIntervals = new Map();
    this.retryTimeouts = new Map();
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.startAutoSync();
    this.loadPendingOperations();
    this.setupPerformanceMonitoring();
    
    // Registrar globalmente
    window.automaticSyncManager = this;
    
    console.log('🔄 Automatic Sync Manager inicializado');
  }

  bindEvents() {
    // Eventos de conectividad
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
    
    // Eventos del ciclo de vida de la página
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    window.addEventListener('beforeunload', () => this.handleBeforeUnload());
    
    // Integración con Firebase
    this.monitorFirebaseConnection();
  }

  handleOnline() {
    console.log('🌐 Conexión online - Iniciando sincronización automática');
    this.isOnline = true;
    this.startAutoSync();
    this.processPriorityQueues();
  }

  handleOffline() {
    console.log('📴 Conexión offline - Pausando sincronización automática');
    this.isOnline = false;
    this.stopAutoSync();
  }

  handleVisibilityChange() {
    if (document.hidden) {
      // Página oculta - reducir frecuencia de sincronización
      this.setAutoSyncInterval(60000); // 1 minuto
      console.log('👁️ Página oculta - Reduciendo frecuencia de sync');
    } else {
      // Página visible - restaurar frecuencia normal
      this.setAutoSyncInterval(this.config.autoSyncInterval);
      console.log('👁️ Página visible - Restaurando frecuencia de sync');
      
      // Sincronizar inmediatamente al volver
      if (this.isOnline) {
        setTimeout(() => this.triggerSync('visibility-restored'), 1000);
      }
    }
  }

  handleBeforeUnload() {
    // Intentar sincronizar operaciones críticas antes de cerrar
    this.emergencySync();
  }

  monitorFirebaseConnection() {
    if (window.firebase && firebase.database) {
      const connectedRef = firebase.database().ref('.info/connected');
      connectedRef.on('value', (snapshot) => {
        const wasConnected = this.isFirebaseConnected;
        this.isFirebaseConnected = snapshot.val() === true;
        
        if (!wasConnected && this.isFirebaseConnected) {
          console.log('🔥 Firebase reconectado - Procesando cola de sincronización');
          this.processPriorityQueues();
        }
      });
    }
  }

  startAutoSync() {
    if (this.syncIntervals.has('main')) {
      clearInterval(this.syncIntervals.get('main'));
    }

    const interval = setInterval(() => {
      if (this.isOnline && this.isFirebaseConnected && !this.syncInProgress) {
        this.triggerSync('auto');
      }
    }, this.config.autoSyncInterval);

    this.syncIntervals.set('main', interval);
    console.log(`🔄 Auto-sync iniciado (${this.config.autoSyncInterval}ms)`);
  }

  stopAutoSync() {
    if (this.syncIntervals.has('main')) {
      clearInterval(this.syncIntervals.get('main'));
      this.syncIntervals.delete('main');
      console.log('⏹️ Auto-sync detenido');
    }
  }

  setAutoSyncInterval(interval) {
    this.config.autoSyncInterval = interval;
    if (this.isOnline) {
      this.stopAutoSync();
      this.startAutoSync();
    }
  }

  /**
   * Agregar operación a cola de sincronización con prioridad
   */
  addToSyncQueue(operation, priority = 'MEDIUM') {
    const operationWithMeta = {
      id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retries: 0,
      priority: priority,
      ...operation
    };

    // Agregar a la cola de prioridad correspondiente
    if (this.config.priorityQueues[priority]) {
      this.config.priorityQueues[priority].push(operationWithMeta);
    } else {
      this.config.priorityQueues.MEDIUM.push(operationWithMeta);
    }

    // Persistir la operación
    this.persistOperation(operationWithMeta);

    // Intentar sincronizar inmediatamente si es crítica y estamos online
    if (priority === 'CRITICAL' && this.isOnline && this.isFirebaseConnected) {
      setTimeout(() => this.triggerSync('critical-operation'), 100);
    }

    console.log(`📋 Operación agregada a cola ${priority}:`, operation.type);
    
    // Notificar al indicador offline
    this.updateIndicators();
    
    return operationWithMeta.id;
  }

  /**
   * Procesar colas de prioridad en orden
   */
  async processPriorityQueues() {
    if (!this.isOnline || this.syncInProgress) {
      return;
    }

    this.syncInProgress = true;
    
    try {
      // Si Firebase no está conectado, usar offlineSyncService
      if (!this.isFirebaseConnected && window.offlineSyncService) {
        console.log('🔄 Firebase desconectado, usando offlineSyncService para auto-sync');
        const result = await window.offlineSyncService.flushAll();
        
        if (result && result.processed) {
          const total = Object.values(result.processed).reduce((a, b) => a + b, 0);
          console.log(`✅ Auto-sync completado: ${total} elementos sincronizados`);
          this.syncStats.successfulSyncs++;
        } else {
          console.log('ℹ️ Auto-sync: No había datos pendientes');
        }
        
        return;
      }

      // Procesar en orden de prioridad (modo Firebase)
      const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
      
      for (const priority of priorities) {
        const queue = this.config.priorityQueues[priority];
        if (queue.length > 0) {
          await this.processPriorityQueue(priority);
        }
      }

      this.syncStats.successfulSyncs++;
      console.log('✅ Procesamiento de colas de prioridad completado');
      
    } catch (error) {
      console.error('❌ Error procesando colas de prioridad:', error);
      this.syncStats.failedSyncs++;
    } finally {
      this.syncInProgress = false;
      this.updateIndicators();
    }
  }

  async processPriorityQueue(priority) {
    const queue = this.config.priorityQueues[priority];
    const batchSize = priority === 'CRITICAL' ? 5 : this.config.batchSize;
    
    console.log(`🔄 Procesando cola ${priority}: ${queue.length} operaciones`);
    
    // Procesar en lotes
    while (queue.length > 0 && this.isOnline && this.isFirebaseConnected) {
      const batch = queue.splice(0, batchSize);
      
      try {
        await this.processBatch(batch, priority);
        
        // Remover operaciones exitosas de la persistencia
        batch.forEach(op => this.removePersistedOperation(op.id));
        
      } catch (error) {
        console.error(`❌ Error procesando lote de ${priority}:`, error);
        
        // Reencolar operaciones fallidas con reintentos
        batch.forEach(op => {
          if (op.retries < this.config.maxRetries) {
            op.retries++;
            queue.push(op);
            this.scheduleRetry(op, priority);
          } else {
            console.error(`❌ Operación ${op.id} descartada después de ${this.config.maxRetries} reintentos`);
            this.removePersistedOperation(op.id);
            this.handleFailedOperation(op);
          }
        });
      }
    }
  }

  async processBatch(batch, priority) {
    const startTime = Date.now();
    
    console.log(`🔄 Procesando lote de ${batch.length} operaciones (${priority})`);
    
    // Actualizar progreso
    this.updateSyncProgress(0, batch.length);
    
    const promises = batch.map(async (operation, index) => {
      try {
        await this.executeOperation(operation);
        this.updateSyncProgress(index + 1, batch.length);
        return { success: true, operation };
      } catch (error) {
        console.error(`❌ Error ejecutando operación ${operation.id}:`, error);
        return { success: false, operation, error };
      }
    });

    const results = await Promise.allSettled(promises);
    const syncTime = Date.now() - startTime;
    
    // Actualizar estadísticas
    this.updateSyncStats(syncTime, results);
    
    // Verificar si hay errores críticos
    const failures = results.filter(r => r.status === 'rejected' || !r.value.success);
    if (failures.length > 0) {
      throw new Error(`${failures.length} operaciones fallaron en el lote`);
    }
  }

  async executeOperation(operation) {
    if (!window.firebase || !firebase.firestore) {
      throw new Error('Firebase no está disponible');
    }

    const db = firebase.firestore();
    const startTime = Date.now();

    try {
      switch (operation.type) {
        case 'create':
          await this.executeCreate(db, operation);
          break;
        case 'update':
          await this.executeUpdate(db, operation);
          break;
        case 'delete':
          await this.executeDelete(db, operation);
          break;
        case 'batch':
          await this.executeBatch(db, operation);
          break;
        default:
          throw new Error(`Tipo de operación desconocido: ${operation.type}`);
      }

      const executionTime = Date.now() - startTime;
      console.log(`✅ Operación ${operation.type} ejecutada en ${executionTime}ms`);

    } catch (error) {
      console.error(`❌ Error ejecutando operación ${operation.type}:`, error);
      throw error;
    }
  }

  async executeCreate(db, operation) {
    const { collection, data, docId } = operation;
    
    if (docId) {
      await db.collection(collection).doc(docId).set(data, { merge: false });
    } else {
      const docRef = await db.collection(collection).add(data);
      operation.docId = docRef.id; // Guardar el ID generado
    }
  }

  async executeUpdate(db, operation) {
    const { collection, docId, data } = operation;
    await db.collection(collection).doc(docId).update(data);
  }

  async executeDelete(db, operation) {
    const { collection, docId } = operation;
    await db.collection(collection).doc(docId).delete();
  }

  async executeBatch(db, operation) {
    const { operations } = operation;
    const batch = db.batch();

    operations.forEach(op => {
      const docRef = db.collection(op.collection).doc(op.docId);
      
      switch (op.type) {
        case 'set':
          batch.set(docRef, op.data, { merge: op.merge || false });
          break;
        case 'update':
          batch.update(docRef, op.data);
          break;
        case 'delete':
          batch.delete(docRef);
          break;
      }
    });

    await batch.commit();
  }

  scheduleRetry(operation, priority) {
    const retryDelay = this.config.retryInterval * Math.pow(2, operation.retries); // Backoff exponencial
    const timeoutId = setTimeout(() => {
      console.log(`🔄 Reintentando operación ${operation.id} (intento ${operation.retries + 1})`);
      
      // Agregar de vuelta a la cola
      this.config.priorityQueues[priority].unshift(operation);
      
      // Intentar procesar inmediatamente
      if (this.isOnline && this.isFirebaseConnected && !this.syncInProgress) {
        this.triggerSync('retry');
      }
    }, retryDelay);

    this.retryTimeouts.set(operation.id, timeoutId);
  }

  handleFailedOperation(operation) {
    // Mover a cola de operaciones fallidas para análisis posterior
    const failedOps = this.getFailedOperations();
    failedOps.push({
      ...operation,
      failedAt: Date.now(),
      finalError: 'Max retries exceeded'
    });
    localStorage.setItem('medical_dev_failed_operations', JSON.stringify(failedOps));
  }

  getFailedOperations() {
    try {
      const failed = localStorage.getItem('medical_dev_failed_operations');
      return failed ? JSON.parse(failed) : [];
    } catch {
      return [];
    }
  }

  async triggerSync(reason = 'manual') {
    if (this.syncInProgress) {
      console.log('⚠️ Sincronización ya en progreso, omitiendo...');
      return;
    }

    console.log(`🔄 Sincronización iniciada (${reason})`);
    
    this.syncStats.totalSyncs++;
    this.syncStats.lastSyncTime = Date.now();
    
    try {
      await this.processPriorityQueues();
      console.log(`✅ Sincronización completada (${reason})`);
    } catch (error) {
      console.error(`❌ Error en sincronización (${reason}):`, error);
    }
  }

  async emergencySync() {
    console.log('🚨 Sincronización de emergencia iniciada');
    
    // Solo sincronizar operaciones críticas
    const criticalOps = [...this.config.priorityQueues.CRITICAL];
    
    if (criticalOps.length > 0) {
      try {
        await this.processBatch(criticalOps, 'CRITICAL');
        console.log('✅ Sincronización de emergencia completada');
      } catch (error) {
        console.error('❌ Error en sincronización de emergencia:', error);
      }
    }
  }

  updateSyncProgress(current, total) {
    const progress = Math.round((current / total) * 100);
    
    // Notificar al indicador offline avanzado
    if (window.advancedOfflineIndicator) {
      window.advancedOfflineIndicator.setSyncProgress(progress);
      window.advancedOfflineIndicator.setSyncing(current < total);
    }
  }

  updateSyncStats(syncTime, results) {
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - successful;
    
    // Actualizar estadísticas
    this.syncStats.averageSyncTime = (this.syncStats.averageSyncTime + syncTime) / 2;
    
    console.log(`📊 Sync Stats: ${successful} exitosas, ${failed} fallidas, ${syncTime}ms`);
  }

  updateIndicators() {
    const totalPending = Object.values(this.config.priorityQueues)
      .reduce((total, queue) => total + queue.length, 0);
    
    // Notificar al indicador offline avanzado
    if (window.advancedOfflineIndicator) {
      window.advancedOfflineIndicator.setPendingOperations(totalPending);
    }
  }

  /**
   * Métodos de persistencia
   */
  persistOperation(operation) {
    try {
      const pending = this.getPendingOperations();
      pending[operation.id] = operation;
      localStorage.setItem('medical_dev_pending_sync', JSON.stringify(pending));
    } catch (error) {
      console.error('❌ Error persistiendo operación:', error);
    }
  }

  removePersistedOperation(operationId) {
    try {
      const pending = this.getPendingOperations();
      delete pending[operationId];
      localStorage.setItem('medical_dev_pending_sync', JSON.stringify(pending));
    } catch (error) {
      console.error('❌ Error removiendo operación persistida:', error);
    }
  }

  getPendingOperations() {
    try {
      const pending = localStorage.getItem('medical_dev_pending_sync');
      return pending ? JSON.parse(pending) : {};
    } catch {
      return {};
    }
  }

  loadPendingOperations() {
    const pending = this.getPendingOperations();
    
    Object.values(pending).forEach(operation => {
      const priority = operation.priority || 'MEDIUM';
      if (this.config.priorityQueues[priority]) {
        this.config.priorityQueues[priority].push(operation);
      }
    });

    const totalLoaded = Object.keys(pending).length;
    if (totalLoaded > 0) {
      console.log(`📂 Cargadas ${totalLoaded} operaciones pendientes de localStorage`);
      this.updateIndicators();
    }
  }

  setupPerformanceMonitoring() {
    // Monitorear rendimiento de sincronización
    setInterval(() => {
      const stats = this.getPerformanceStats();
      console.log('📊 Sync Performance:', stats);
    }, 300000); // Cada 5 minutos
  }

  getPerformanceStats() {
    return {
      ...this.syncStats,
      queueSizes: Object.keys(this.config.priorityQueues).reduce((sizes, priority) => {
        sizes[priority] = this.config.priorityQueues[priority].length;
        return sizes;
      }, {}),
      isOnline: this.isOnline,
      isFirebaseConnected: this.isFirebaseConnected,
      syncInProgress: this.syncInProgress
    };
  }

  // API pública para otros módulos
  createPatient(patientData) {
    return this.addToSyncQueue({
      type: 'create',
      collection: 'patients',
      data: patientData
    }, 'HIGH');
  }

  updatePatient(patientId, updates) {
    return this.addToSyncQueue({
      type: 'update',
      collection: 'patients',
      docId: patientId,
      data: updates
    }, 'HIGH');
  }

  createOperation(operationData) {
    return this.addToSyncQueue({
      type: 'create',
      collection: 'operations',
      data: operationData
    }, 'CRITICAL');
  }

  createReport(reportData) {
    return this.addToSyncQueue({
      type: 'create',
      collection: 'reports',
      data: reportData
    }, 'MEDIUM');
  }

  logActivity(activityData) {
    return this.addToSyncQueue({
      type: 'create',
      collection: 'activities',
      data: activityData
    }, 'LOW');
  }

  // Método estático para inicialización
  static init() {
    if (!window.automaticSyncManager) {
      window.automaticSyncManager = new AutomaticSyncManager();
    }
    return window.automaticSyncManager;
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  AutomaticSyncManager.init();
});

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AutomaticSyncManager };
}

console.log('🔄 Automatic Sync Manager loaded successfully');
