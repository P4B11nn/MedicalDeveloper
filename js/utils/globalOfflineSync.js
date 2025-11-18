/**
 * GlobalOfflineSync - Servicio global de sincronización offline
 * Maneja la sincronización de datos de todas las secciones de la aplicación
 * cuando se restablece la conexión
 */

import eventBus, { EVENT_NAMES } from './eventBus.js';
import { db } from '../models/firebaseConfig.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';

class GlobalOfflineSync {
  constructor() {
    this.isInitialized = false;
    this.isSyncing = false;
    this.syncModal = null;
    this.syncProgress = null;
    this.syncStatus = null;
    this.syncLog = null;
    
    // Configuraciones por tipo de dato
    this.syncConfigs = {
      pacientes: {
        collection: 'pacientes',
        storageKey: 'pacientes',
        queueKey: 'offlineQueue_pacientes',
        displayName: 'Pacientes',
        icon: '👥'
      },
      operaciones: {
        collection: 'operaciones_medicas',
        storageKey: 'operaciones',
        queueKey: 'offlineQueue_operaciones',
        displayName: 'Operaciones Médicas',
        icon: '🏥'
      },
      reportes: {
        collection: 'reportes',
        storageKey: 'reportes',
        queueKey: 'offlineQueue_reportes',
        displayName: 'Reportes',
        icon: '📋'
      },
      usuarios: {
        collection: 'usuarios',
        storageKey: 'usuarios',
        queueKey: 'offlineQueue_usuarios',
        displayName: 'Usuarios',
        icon: '👤'
      },
      gestion: {
        collection: 'gestion_datos',
        storageKey: 'gestion',
        queueKey: 'offlineQueue_gestion',
        displayName: 'Gestión',
        icon: '📊'
      }
    };
  }

  /**
   * Inicializa el servicio global de sincronización
   */
  async init() {
    if (this.isInitialized) {
      console.log('🌐 GlobalOfflineSync ya está inicializado');
      return;
    }

    try {
      console.log('🚀 Inicializando GlobalOfflineSync...');
      
      // Crear modal de sincronización
      this.createSyncModal();
      
      // Configurar eventos de conexión
      this.setupConnectionListeners();
      
      // Configurar monitoreo de eventos del sistema
      this.setupEventListeners();
      
      // Hacer disponible globalmente
      window.globalOfflineSync = this;
      
      this.isInitialized = true;
      console.log('✅ GlobalOfflineSync inicializado correctamente');
      
      // Verificar si hay datos pendientes para mostrar indicador
      this.updatePendingDataIndicator();
      
    } catch (error) {
      console.error('❌ Error inicializando GlobalOfflineSync:', error);
      throw error;
    }
  }

  /**
   * Crea el modal de sincronización global
   */
  createSyncModal() {
    // Verificar si ya existe
    if (document.getElementById('globalSyncModal')) {
      console.log('Modal de sincronización ya existe');
      return;
    }

    const modalHTML = `
      <div id="globalSyncModal" class="sync-modal" style="display: none;">
        <div class="sync-modal-content">
          <div class="sync-header">
            <h3>🔄 Sincronizando con Firebase</h3>
            <div class="sync-subtitle">Subiendo datos guardados offline...</div>
          </div>
          
          <div class="sync-progress-container">
            <div class="sync-progress-bar">
              <div id="globalSyncProgressFill" class="sync-progress-fill" style="width: 0%;"></div>
            </div>
            <div id="globalSyncProgressText" class="sync-progress-text">0%</div>
          </div>
          
          <div id="globalSyncStatus" class="sync-status">Iniciando sincronización...</div>
          
          <div class="sync-details">
            <div id="globalSyncLog" class="sync-log"></div>
          </div>
          
          <div class="sync-actions" style="display: none;">
            <button id="closeSyncModal" class="btn-sync-close">Cerrar</button>
          </div>
        </div>
      </div>
    `;

    // Agregar CSS si no existe
    if (!document.getElementById('globalSyncCSS')) {
      const syncCSS = `
        <style id="globalSyncCSS">
          .sync-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.8);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            backdrop-filter: blur(5px);
          }
          
          .sync-modal-content {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            min-width: 400px;
            max-width: 500px;
            text-align: center;
            animation: syncModalFadeIn 0.3s ease-out;
          }
          
          @keyframes syncModalFadeIn {
            from { opacity: 0; transform: scale(0.9) translateY(-20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          
          .sync-header h3 {
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: bold;
          }
          
          .sync-subtitle {
            opacity: 0.9;
            font-size: 14px;
            margin-bottom: 25px;
          }
          
          .sync-progress-container {
            margin: 20px 0;
          }
          
          .sync-progress-bar {
            width: 100%;
            height: 8px;
            background-color: rgba(255, 255, 255, 0.3);
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 10px;
          }
          
          .sync-progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #4CAF50, #8BC34A);
            border-radius: 4px;
            transition: width 0.3s ease;
            animation: syncProgress 2s ease-in-out infinite alternate;
          }
          
          @keyframes syncProgress {
            0% { box-shadow: 0 0 5px rgba(76, 175, 80, 0.5); }
            100% { box-shadow: 0 0 20px rgba(76, 175, 80, 0.8); }
          }
          
          .sync-progress-text {
            font-size: 18px;
            font-weight: bold;
            color: #4CAF50;
          }
          
          .sync-status {
            font-size: 16px;
            margin: 15px 0;
            min-height: 24px;
          }
          
          .sync-details {
            margin-top: 20px;
            text-align: left;
          }
          
          .sync-log {
            background-color: rgba(0, 0, 0, 0.3);
            border-radius: 8px;
            padding: 15px;
            max-height: 150px;
            overflow-y: auto;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
          }
          
          .sync-log div {
            margin: 3px 0;
            opacity: 0;
            animation: syncLogEntry 0.3s ease-out forwards;
          }
          
          @keyframes syncLogEntry {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
          }
          
          .sync-actions {
            margin-top: 20px;
          }
          
          .btn-sync-close {
            background: rgba(255, 255, 255, 0.2);
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.3);
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s ease;
          }
          
          .btn-sync-close:hover {
            background: rgba(255, 255, 255, 0.3);
            border-color: rgba(255, 255, 255, 0.5);
          }
          
          /* Indicador de datos pendientes */
          .pending-data-indicator {
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #FF6B6B, #FF8E53);
            color: white;
            padding: 10px 15px;
            border-radius: 25px;
            box-shadow: 0 5px 15px rgba(255, 107, 107, 0.4);
            cursor: pointer;
            z-index: 1000;
            font-size: 14px;
            font-weight: bold;
            animation: pendingPulse 2s ease-in-out infinite;
            display: none;
          }
          
          @keyframes pendingPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
          }
          
          .pending-data-indicator:hover {
            transform: scale(1.1) !important;
            animation: none;
          }
        </style>
      `;
      document.head.insertAdjacentHTML('beforeend', syncCSS);
    }

    // Agregar modal al DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Configurar referencias
    this.syncModal = document.getElementById('globalSyncModal');
    this.syncProgress = document.getElementById('globalSyncProgressFill');
    this.syncStatus = document.getElementById('globalSyncStatus');
    this.syncLog = document.getElementById('globalSyncLog');
    
    // Configurar evento de cierre
    document.getElementById('closeSyncModal').addEventListener('click', () => {
      this.hideSyncModal();
    });

    // Crear indicador de datos pendientes
    const pendingIndicator = `
      <div id="pendingDataIndicator" class="pending-data-indicator">
        📱 Datos offline pendientes - Clic para sincronizar
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', pendingIndicator);
    
    document.getElementById('pendingDataIndicator').addEventListener('click', () => {
      this.syncAll();
    });
  }

  /**
   * Configura listeners para eventos de conexión
   */
  setupConnectionListeners() {
    window.addEventListener('online', async () => {
      console.log('🌐 Conexión restablecida - Iniciando sincronización automática');
      
      // Esperar un momento para que se estabilice la conexión
      setTimeout(() => {
        this.syncAll();
      }, 2000);
    });

    window.addEventListener('offline', () => {
      console.log('📱 Conexión perdida - Modo offline activado');
      this.updatePendingDataIndicator();
    });
  }

  /**
   * Configura listeners para eventos del sistema
   */
  setupEventListeners() {
    // Escuchar eventos de datos guardados offline
    eventBus.on(EVENT_NAMES.OFFLINE_DATA_SAVED, (data) => {
      console.log('📱 Datos guardados offline:', data);
      this.updatePendingDataIndicator();
    });

    // Escuchar eventos de sincronización completada
    eventBus.on(EVENT_NAMES.SYNC_COMPLETED, (data) => {
      console.log('✅ Sincronización completada:', data);
      this.updatePendingDataIndicator();
    });
  }

  /**
   * Muestra el modal de sincronización
   */
  showSyncModal() {
    if (this.syncModal) {
      this.syncModal.style.display = 'flex';
      document.querySelector('.sync-actions').style.display = 'none';
      this.resetSyncModal();
    }
  }

  /**
   * Oculta el modal de sincronización
   */
  hideSyncModal() {
    if (this.syncModal) {
      this.syncModal.style.display = 'none';
    }
  }

  /**
   * Resetea el estado del modal de sincronización
   */
  resetSyncModal() {
    if (this.syncProgress) {
      this.syncProgress.style.width = '0%';
    }
    if (this.syncStatus) {
      this.syncStatus.textContent = 'Iniciando sincronización...';
    }
    if (this.syncLog) {
      this.syncLog.innerHTML = '';
    }
    document.getElementById('globalSyncProgressText').textContent = '0%';
  }

  /**
   * Actualiza el progreso de sincronización
   */
  updateSyncProgress(percentage, status, logEntry) {
    if (this.syncProgress) {
      this.syncProgress.style.width = percentage + '%';
      document.getElementById('globalSyncProgressText').textContent = Math.round(percentage) + '%';
    }
    
    if (this.syncStatus && status) {
      this.syncStatus.textContent = status;
    }
    
    if (this.syncLog && logEntry) {
      const logDiv = document.createElement('div');
      logDiv.textContent = `[${new Date().toLocaleTimeString()}] ${logEntry}`;
      this.syncLog.appendChild(logDiv);
      this.syncLog.scrollTop = this.syncLog.scrollHeight;
    }
  }

  /**
   * Actualiza el indicador de datos pendientes
   */
  updatePendingDataIndicator() {
    const indicator = document.getElementById('pendingDataIndicator');
    if (!indicator) return;

    let hasPendingData = false;
    let totalPending = 0;

    // Verificar datos pendientes en cada configuración
    Object.keys(this.syncConfigs).forEach(type => {
      const config = this.syncConfigs[type];
      const queue = JSON.parse(localStorage.getItem(config.queueKey) || '[]');
      const offlineData = JSON.parse(localStorage.getItem(config.storageKey) || '[]')
        .filter(item => item._isOffline);
      
      const pending = queue.length + offlineData.length;
      if (pending > 0) {
        hasPendingData = true;
        totalPending += pending;
      }
    });

    if (hasPendingData && navigator.onLine) {
      indicator.style.display = 'block';
      indicator.textContent = `📱 ${totalPending} datos offline pendientes - Clic para sincronizar`;
    } else {
      indicator.style.display = 'none';
    }
  }

  /**
   * Sincroniza todos los tipos de datos offline
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log('⚠️ Sincronización ya en progreso');
      return;
    }

    if (!navigator.onLine) {
      console.log('❌ Sin conexión - No se puede sincronizar');
      return;
    }

    this.isSyncing = true;
    this.showSyncModal();

    try {
      console.log('🔄 Iniciando sincronización global...');
      this.updateSyncProgress(0, 'Verificando datos pendientes...', 'Iniciando sincronización global');

      const syncResults = {};
      const configKeys = Object.keys(this.syncConfigs);
      let totalProcessed = 0;

      for (let i = 0; i < configKeys.length; i++) {
        const type = configKeys[i];
        const config = this.syncConfigs[type];
        const progress = (i / configKeys.length) * 100;

        this.updateSyncProgress(
          progress,
          `Sincronizando ${config.displayName}...`,
          `${config.icon} Procesando ${config.displayName}`
        );

        try {
          const result = await this.syncDataType(type, config);
          syncResults[type] = result;
          totalProcessed += result.synced;

          this.updateSyncProgress(
            ((i + 1) / configKeys.length) * 100,
            `${config.displayName} completado`,
            `✅ ${config.displayName}: ${result.synced} sincronizados, ${result.failed} errores`
          );

        } catch (error) {
          console.error(`❌ Error sincronizando ${type}:`, error);
          syncResults[type] = { synced: 0, failed: 1, error: error.message };
          this.updateSyncProgress(
            ((i + 1) / configKeys.length) * 100,
            `Error en ${config.displayName}`,
            `❌ ${config.displayName}: Error - ${error.message}`
          );
        }
      }

      // Finalizar sincronización
      this.updateSyncProgress(
        100,
        `Sincronización completada - ${totalProcessed} elementos`,
        `🎉 Sincronización global completada: ${totalProcessed} elementos procesados`
      );

      // Mostrar botón de cerrar
      document.querySelector('.sync-actions').style.display = 'block';

      // Actualizar indicador
      this.updatePendingDataIndicator();

      // Emitir evento de sincronización completada
      eventBus.emit(EVENT_NAMES.SYNC_COMPLETED, syncResults);

      console.log('✅ Sincronización global completada:', syncResults);
      return syncResults;

    } catch (error) {
      console.error('❌ Error en sincronización global:', error);
      this.updateSyncProgress(
        100,
        'Error en sincronización',
        `❌ Error global: ${error.message}`
      );
      document.querySelector('.sync-actions').style.display = 'block';
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sincroniza un tipo específico de datos
   */
  async syncDataType(type, config) {
    try {
      // Para pacientes, usar el método específico del modelo si está disponible
      if (type === 'pacientes' && window.pacienteModel && window.pacienteModel.syncOfflinePatients) {
        console.log('🔄 Usando método específico de sincronización de pacientes');
        return await window.pacienteModel.syncOfflinePatients();
      }

      // Obtener datos offline de este tipo
      const offlineData = JSON.parse(localStorage.getItem(config.storageKey) || '[]')
        .filter(item => item._isOffline && !item._synced); // Evitar resinronizar elementos ya procesados
      
      const queue = JSON.parse(localStorage.getItem(config.queueKey) || '[]');
      
      const allPendingData = [...offlineData, ...queue];
      
      if (allPendingData.length === 0) {
        return { synced: 0, failed: 0, message: 'No hay datos pendientes' };
      }

      console.log(`🔄 Sincronizando ${allPendingData.length} elementos de ${type}`);
      
      let synced = 0;
      let failed = 0;
      const processedItems = [];

      for (const item of allPendingData) {
        try {
          await this.syncSingleItem(item, config);
          synced++;
          processedItems.push(item._tempId || item.id);
        } catch (error) {
          console.error(`❌ Error sincronizando item de ${type}:`, error);
          failed++;
        }
      }

      // Limpiar datos sincronizados exitosamente
      if (synced > 0) {
        // Actualizar localStorage marcando elementos como sincronizados
        const allData = JSON.parse(localStorage.getItem(config.storageKey) || '[]');
        const updatedData = allData.map(item => {
          if (processedItems.includes(item._tempId || item.id)) {
            return { ...item, _synced: true, _syncedAt: new Date().toISOString() };
          }
          return item;
        });
        localStorage.setItem(config.storageKey, JSON.stringify(updatedData));
        
        // Limpiar cola
        localStorage.removeItem(config.queueKey);
      }

      return { synced, failed, message: `${synced} sincronizados, ${failed} fallos` };

    } catch (error) {
      console.error(`❌ Error sincronizando tipo ${type}:`, error);
      throw error;
    }
  }

  /**
   * Sincroniza un elemento individual
   */
  async syncSingleItem(item, config) {
    try {
      // Preparar datos para Firebase (remover campos temporales)
      const cleanData = { ...item };
      delete cleanData._isOffline;
      delete cleanData._tempId;
      delete cleanData._createdOffline;
      delete cleanData.id; // Dejar que Firebase asigne nuevo ID
      delete cleanData._synced; // Remover flag de sincronización
      delete cleanData._firebaseId; // Remover ID de Firebase anterior
      delete cleanData._syncedAt; // Remover timestamp de sincronización

      // Convertir fechas de string a Timestamp si es necesario
      if (cleanData.fechaRegistro) {
        cleanData.fechaRegistro = serverTimestamp();
      }
      if (cleanData.createdAt && typeof cleanData.createdAt === 'string') {
        cleanData.createdAt = serverTimestamp();
      }
      if (cleanData.updatedAt && typeof cleanData.updatedAt === 'string') {
        cleanData.updatedAt = serverTimestamp();
      }

      // Validar campos requeridos según el tipo
      if (config.collection === 'pacientes') {
        // Validaciones específicas para pacientes
        if (!cleanData.matricula || !cleanData.nombre) {
          throw new Error('Paciente requiere matrícula y nombre');
        }
        
        // Corregir campos undefined o vacíos
        if (!cleanData.grado || cleanData.grado === 'undefined' || cleanData.grado === '') {
          cleanData.grado = '1er Semestre';
          console.warn(`⚠️ Corrigiendo grado undefined para paciente ${cleanData.matricula}`);
        }
        if (!cleanData.grupo || cleanData.grupo === 'undefined' || cleanData.grupo === '') {
          cleanData.grupo = 'A';
          console.warn(`⚠️ Corrigiendo grupo undefined para paciente ${cleanData.matricula}`);
        }
        if (!cleanData.email) {
          cleanData.email = '';
        }
        if (!cleanData.genero) {
          cleanData.genero = 'No especificado';
        }
        if (!cleanData.antecedentes) {
          cleanData.antecedentes = '';
        }
        
        // Asegurar estructura de datos médicos
        if (!cleanData.datosMedicos) {
          cleanData.datosMedicos = {
            temperatura: null,
            presion: null,
            peso: null,
            talla: null,
            frecuenciaRespiratoria: null,
            examenVista: null,
            examenOido: null,
            fechaRegistroMedico: null
          };
        }
        // Asegurar status por defecto
        if (!cleanData.status) {
          cleanData.status = 'sin_datos_medicos';
        }
      }

      // Agregar a Firebase
      const docRef = await addDoc(collection(db, config.collection), cleanData);
      console.log(`✅ Item sincronizado con ID: ${docRef.id}`);

      return docRef.id;

    } catch (error) {
      console.error('❌ Error sincronizando item individual:', error);
      throw error;
    }
  }

  /**
   * Guarda datos en modo offline para cualquier tipo
   */
  async saveOfflineData(type, data) {
    try {
      const config = this.syncConfigs[type];
      if (!config) {
        throw new Error(`Tipo de datos no configurado: ${type}`);
      }

      // Generar ID temporal único
      const tempId = `TEMP_${type.toUpperCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Preparar datos para almacenamiento offline
      const offlineData = {
        ...data,
        id: tempId,
        _isOffline: true,
        _tempId: tempId,
        _createdOffline: new Date().toISOString(),
        _dataType: type
      };

      // Guardar en localStorage
      const existingData = JSON.parse(localStorage.getItem(config.storageKey) || '[]');
      existingData.push(offlineData);
      localStorage.setItem(config.storageKey, JSON.stringify(existingData));

      // Agregar a cola de sincronización
      const queue = JSON.parse(localStorage.getItem(config.queueKey) || '[]');
      queue.push(offlineData);
      localStorage.setItem(config.queueKey, JSON.stringify(queue));

      console.log(`📱 ${config.displayName} guardado offline:`, tempId);

      // Emitir evento
      eventBus.emit(EVENT_NAMES.OFFLINE_DATA_SAVED, { type, data: offlineData });

      // Actualizar indicador
      this.updatePendingDataIndicator();

      // Mostrar notificación
      this.showOfflineNotification(`${config.icon} ${config.displayName} guardado offline - Se sincronizará al reconectar`);

      return offlineData;

    } catch (error) {
      console.error(`❌ Error guardando ${type} offline:`, error);
      throw error;
    }
  }

  /**
   * Muestra notificación de guardado offline
   */
  showOfflineNotification(message, duration = 5000) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #4CAF50, #45a049);
      color: white;
      padding: 15px 20px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(76, 175, 80, 0.4);
      z-index: 10001;
      font-size: 14px;
      font-weight: bold;
      max-width: 300px;
      animation: slideInRight 0.3s ease-out;
    `;

    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: white; cursor: pointer; font-size: 16px;">×</button>
      </div>
    `;

    document.body.appendChild(notification);

    // Auto-remover después de la duración especificada
    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 300);
      }
    }, duration);

    // Agregar animaciones CSS si no existen
    if (!document.getElementById('notificationAnimations')) {
      const animations = `
        <style id="notificationAnimations">
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
        </style>
      `;
      document.head.insertAdjacentHTML('beforeend', animations);
    }
  }

  /**
   * Obtiene estadísticas de datos offline pendientes
   */
  getPendingDataStats() {
    const stats = {};
    let totalPending = 0;

    Object.keys(this.syncConfigs).forEach(type => {
      const config = this.syncConfigs[type];
      const queue = JSON.parse(localStorage.getItem(config.queueKey) || '[]');
      const offlineData = JSON.parse(localStorage.getItem(config.storageKey) || '[]')
        .filter(item => item._isOffline);
      
      const pending = queue.length + offlineData.length;
      stats[type] = {
        pending,
        displayName: config.displayName,
        icon: config.icon
      };
      totalPending += pending;
    });

    return { stats, totalPending };
  }
}

// Crear instancia global
const globalOfflineSync = new GlobalOfflineSync();

export default globalOfflineSync;