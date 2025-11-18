/**
 * OfflineNotificationManager - Gestor de notificaciones para acciones offline
 * Muestra notificaciones cuando se realizan acciones sin conexión
 * y gestiona la sincronización con barra de progreso
 */

class OfflineNotificationManager {
  constructor() {
    this.container = null;
    this.progressModal = null;
    this.isOnline = navigator.onLine;
    this.offlineActionsCount = 0;
    this.init();
  }

  init() {
    this.createContainer();
    this.createProgressModal();
    this.addStyles();
    this.bindEvents();
  }

  createContainer() {
    // Crear contenedor para notificaciones toast
    this.container = document.createElement('div');
    this.container.id = 'offline-notifications';
    this.container.className = 'offline-notifications';
    document.body.appendChild(this.container);
  }

  createProgressModal() {
    // Crear modal para barra de progreso de sincronización
    this.progressModal = document.createElement('div');
    this.progressModal.id = 'sync-progress-modal';
    this.progressModal.className = 'sync-progress-modal';
    this.progressModal.innerHTML = `
      <div class="sync-progress-backdrop"></div>
      <div class="sync-progress-content">
        <div class="sync-progress-header">
          <h3>Sincronizando datos</h3>
          <div class="sync-progress-status">Iniciando...</div>
        </div>
        <div class="sync-progress-bar-container">
          <div class="sync-progress-bar">
            <div class="sync-progress-bar-fill"></div>
          </div>
          <div class="sync-progress-text">0%</div>
        </div>
        <div class="sync-progress-details">
          <div class="sync-progress-current">Procesando...</div>
          <div class="sync-progress-count">0 de 0 acciones</div>
        </div>
        <div class="sync-progress-summary" style="display: none;">
          <h4>Resumen de sincronización</h4>
          <div class="sync-summary-content"></div>
          <button class="sync-summary-close">Cerrar</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.progressModal);

    // Evento para cerrar el modal
    const closeBtn = this.progressModal.querySelector('.sync-summary-close');
    closeBtn.addEventListener('click', () => {
      this.hideProgressModal();
    });
  }

  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Contenedor de notificaciones toast */
      .offline-notifications {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column-reverse; /* Las nuevas aparecen abajo y empujan hacia arriba */
        gap: 12px;
        max-width: 400px;
        pointer-events: none;
        max-height: calc(100vh - 40px); /* Evitar salir de la pantalla */
        overflow: visible;
      }

      /* Notificación individual */
      .offline-notification {
        background: rgba(255, 255, 255, 0.98);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 16px;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
        border-left: 4px solid;
        display: flex;
        align-items: flex-start;
        gap: 12px;
        animation: slideInFromRight 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        pointer-events: auto;
        max-width: 400px;
        word-wrap: break-word;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: bottom right;
      }

      .offline-notification.success {
        border-left-color: #10b981;
        background: linear-gradient(135deg, rgba(209, 250, 229, 0.95), rgba(167, 243, 208, 0.95));
      }

      .offline-notification.warning {
        border-left-color: #f59e0b;
        background: linear-gradient(135deg, rgba(254, 243, 199, 0.95), rgba(253, 230, 138, 0.95));
      }

      .offline-notification.error {
        border-left-color: #ef4444;
        background: linear-gradient(135deg, rgba(254, 226, 226, 0.95), rgba(252, 165, 165, 0.95));
      }

      .offline-notification.info {
        border-left-color: #3b82f6;
        background: linear-gradient(135deg, rgba(219, 234, 254, 0.95), rgba(191, 219, 254, 0.95));
      }

      .offline-notification.offline-action {
        border-left-color: #8b5cf6;
        background: linear-gradient(135deg, rgba(237, 233, 254, 0.95), rgba(221, 214, 254, 0.95));
      }

      .notification-icon {
        font-size: 24px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .notification-content {
        flex: 1;
        min-width: 0;
      }

      .notification-title {
        font-weight: 700;
        margin-bottom: 4px;
        font-size: 15px;
        color: #1f2937;
      }

      .notification-message {
        font-size: 13px;
        line-height: 1.5;
        color: #4b5563;
        margin-bottom: 6px;
      }

      .notification-detail {
        font-size: 12px;
        color: #6b7280;
        font-style: italic;
      }

      .notification-close {
        background: none;
        border: none;
        color: #6b7280;
        font-size: 20px;
        cursor: pointer;
        opacity: 0.6;
        transition: opacity 0.2s;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }

      .notification-close:hover {
        opacity: 1;
        transform: scale(1.1);
      }

      /* Gestión de z-index para apilamiento correcto */
      .offline-notification:nth-child(1) { z-index: 10005; }
      .offline-notification:nth-child(2) { z-index: 10004; }
      .offline-notification:nth-child(3) { z-index: 10003; }
      .offline-notification:nth-child(4) { z-index: 10002; }
      .offline-notification:nth-child(5) { z-index: 10001; }

      /* Efecto hover en notificaciones */
      .offline-notification:hover {
        transform: translateX(-4px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      }

      .offline-notification.fade-out:hover {
        transform: translateX(120%) scale(0.95);
      }

      /* Modal de progreso de sincronización */
      .sync-progress-modal {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10001;
        align-items: center;
        justify-content: center;
      }

      .sync-progress-modal.visible {
        display: flex;
      }

      .sync-progress-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        animation: fadeIn 0.3s ease-out;
      }

      .sync-progress-content {
        position: relative;
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 500px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: scaleIn 0.3s ease-out;
      }

      .sync-progress-header {
        margin-bottom: 24px;
      }

      .sync-progress-header h3 {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 700;
        color: #1f2937;
      }

      .sync-progress-status {
        font-size: 14px;
        color: #6b7280;
      }

      .sync-progress-bar-container {
        margin-bottom: 20px;
        position: relative;
      }

      .sync-progress-bar {
        width: 100%;
        height: 12px;
        background: #e5e7eb;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 8px;
      }

      .sync-progress-bar-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #8b5cf6);
        border-radius: 6px;
        transition: width 0.3s ease-out;
        width: 0%;
        position: relative;
        overflow: hidden;
      }

      .sync-progress-bar-fill::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        background: linear-gradient(
          90deg,
          transparent,
          rgba(255, 255, 255, 0.3),
          transparent
        );
        animation: shimmer 1.5s infinite;
      }

      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      .sync-progress-text {
        text-align: center;
        font-size: 18px;
        font-weight: 700;
        color: #3b82f6;
      }

      .sync-progress-details {
        padding: 16px;
        background: #f9fafb;
        border-radius: 8px;
        margin-bottom: 20px;
      }

      .sync-progress-current {
        font-size: 14px;
        color: #1f2937;
        margin-bottom: 8px;
        font-weight: 500;
      }

      .sync-progress-count {
        font-size: 13px;
        color: #6b7280;
      }

      .sync-progress-summary {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 2px solid #e5e7eb;
      }

      .sync-progress-summary h4 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 700;
        color: #1f2937;
      }

      .sync-summary-content {
        max-height: 300px;
        overflow-y: auto;
        margin-bottom: 16px;
      }

      .sync-summary-item {
        padding: 12px;
        background: #f9fafb;
        border-radius: 8px;
        margin-bottom: 8px;
        display: flex;
        align-items: flex-start;
        gap: 12px;
      }

      .sync-summary-item-icon {
        font-size: 20px;
        flex-shrink: 0;
        margin-top: 2px;
      }

      .sync-summary-item.success {
        background: #d1fae5;
      }

      .sync-summary-item.success .sync-summary-item-icon {
        color: #10b981;
      }

      .sync-summary-item.error {
        background: #fee2e2;
      }

      .sync-summary-item.error .sync-summary-item-icon {
        color: #ef4444;
      }

      .sync-summary-item-content {
        flex: 1;
      }

      .sync-summary-item-title {
        font-weight: 600;
        margin-bottom: 4px;
        color: #1f2937;
        font-size: 14px;
      }

      .sync-summary-item-time {
        font-size: 12px;
        color: #6b7280;
      }

      .sync-summary-close {
        width: 100%;
        padding: 12px;
        background: linear-gradient(135deg, #3b82f6, #8b5cf6);
        color: white;
        border: none;
        border-radius: 8px;
        font-size: 16px;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .sync-summary-close:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.4);
      }

      /* Animaciones */
      @keyframes slideInFromRight {
        from {
          transform: translateX(120%) scale(0.9);
          opacity: 0;
        }
        to {
          transform: translateX(0) scale(1);
          opacity: 1;
        }
      }

      @keyframes slideOutToRight {
        from {
          transform: translateX(0) scale(1);
          opacity: 1;
          max-height: 200px;
          margin-bottom: 12px;
        }
        to {
          transform: translateX(120%) scale(0.95);
          opacity: 0;
          max-height: 0;
          margin-bottom: 0;
          padding-top: 0;
          padding-bottom: 0;
        }
      }

      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      @keyframes scaleIn {
        from {
          transform: scale(0.9);
          opacity: 0;
        }
        to {
          transform: scale(1);
          opacity: 1;
        }
      }

      .offline-notification.fade-out {
        animation: slideOutToRight 0.4s cubic-bezier(0.4, 0, 1, 1) forwards;
      }

      /* Responsive */
      @media (max-width: 768px) {
        .offline-notifications {
          bottom: 16px;
          right: 12px;
          left: 12px;
          max-width: none;
          gap: 10px;
        }

        .offline-notification {
          max-width: none;
          padding: 14px;
          font-size: 13px;
        }

        .notification-icon {
          font-size: 20px;
        }

        .notification-title {
          font-size: 14px;
        }

        .notification-message {
          font-size: 12px;
        }
      }

      /* Para pantallas muy pequeñas */
      @media (max-width: 480px) {
        .offline-notifications {
          bottom: 12px;
          right: 8px;
          left: 8px;
          gap: 8px;
        }

        .offline-notification {
          padding: 12px;
          border-radius: 10px;
        }

        .sync-progress-content {
          padding: 24px;
          width: 95%;
        }

        .sync-progress-header h3 {
          font-size: 20px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  bindEvents() {
    // Detectar pérdida de conexión
    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.showConnectionLostNotification();
    });

    // Detectar reconexión
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.showConnectionRestoredNotification();
    });

    // Integración con ConnectionIndicator (con reintentos si no está disponible)
    this.setupConnectionIndicatorIntegration();
  }

  /**
   * Configura la integración con ConnectionIndicator con reintentos
   */
  setupConnectionIndicatorIntegration() {
    const trySetup = () => {
      if (window.connectionIndicator) {
        console.log('✅ Registrando callback de reconexión en ConnectionIndicator...');
        window.connectionIndicator.onConnectionRestored(() => {
          console.log('🔄 Callback de reconexión activado!');
          this.handleReconnection();
        });
      } else {
        // Reintentar en 1 segundo si ConnectionIndicator no está disponible
        console.log('⚠️ ConnectionIndicator no disponible, reintentando en 1s...');
        setTimeout(trySetup, 1000);
      }
    };
    
    // Intentar inmediatamente y luego con delay
    trySetup();
  }

  /**
   * Muestra notificación de pérdida de conexión
   */
  showConnectionLostNotification() {
    this.showNotification({
      type: 'warning',
      icon: '📡',
      title: 'Conexión perdida',
      message: 'Se ha perdido la conexión a internet.',
      detail: 'Las acciones que realices se guardarán localmente y se sincronizarán al reconectar.',
      duration: 6000
    });
  }

  /**
   * Muestra notificación de reconexión
   */
  showConnectionRestoredNotification() {
    this.showNotification({
      type: 'success',
      icon: '🌐',
      title: 'Conexión restablecida',
      message: 'La conexión a internet se ha restablecido.',
      detail: 'Iniciando sincronización de acciones pendientes...',
      duration: 4000
    });
  }

  /**
   * Muestra notificación de acción offline
   * @param {Object} action - Datos de la acción
   */
  showOfflineActionNotification(action) {
    const { type, title, description } = action;

    this.offlineActionsCount++;

    this.showNotification({
      type: 'offline-action',
      icon: '💾',
      title: title || 'Acción guardada localmente',
      message: description || 'La acción se ha guardado correctamente.',
      detail: 'Se sincronizará automáticamente al reconectar.',
      duration: 4000
    });
  }

  /**
   * Muestra una notificación genérica
   * @param {Object} options - Opciones de la notificación
   */
  showNotification(options) {
    const {
      type = 'info',
      icon = 'ℹ️',
      title,
      message,
      detail,
      duration = 5000
    } = options;

    const notification = document.createElement('div');
    notification.className = `offline-notification ${type}`;

    notification.innerHTML = `
      <div class="notification-icon">${icon}</div>
      <div class="notification-content">
        <div class="notification-title">${title}</div>
        <div class="notification-message">${message}</div>
        ${detail ? `<div class="notification-detail">${detail}</div>` : ''}
      </div>
      <button class="notification-close">&times;</button>
    `;

    // Limitar notificaciones antes de agregar la nueva
    this.limitNotifications();

    // Agregar al inicio (con column-reverse aparecerá abajo y empujará hacia arriba)
    this.container.insertBefore(notification, this.container.firstChild);

    // Pequeño delay para activar la animación
    requestAnimationFrame(() => {
      notification.style.opacity = '1';
    });

    // Evento para cerrar
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
      this.removeNotification(notification);
    });

    // Auto-remover después de la duración
    if (duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, duration);
    }


    return notification;
  }

  /**
   * Remueve una notificación
   * @param {HTMLElement} notification - Elemento de notificación
   */
  removeNotification(notification) {
    if (!notification || !notification.parentNode) return;

    // Agregar clase para animación de salida
    notification.classList.add('fade-out');

    // Esperar a que termine la animación antes de remover del DOM
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 400); // Coincide con la duración de slideOutToRight
  }

  /**
   * Limita el número de notificaciones visibles
   * Remueve las más antiguas (las últimas en el DOM con column-reverse)
   */
  limitNotifications() {
    const notifications = this.container.querySelectorAll('.offline-notification:not(.fade-out)');
    const maxNotifications = 5;

    if (notifications.length >= maxNotifications) {
      // Con column-reverse, las más antiguas están al final del NodeList
      const toRemove = notifications.length - maxNotifications + 1;
      for (let i = notifications.length - 1; i >= notifications.length - toRemove; i--) {
        if (notifications[i]) {
          this.removeNotification(notifications[i]);
        }
      }
    }
  }

  /**
   * Maneja la reconexión e inicia la sincronización
   */
  async handleReconnection() {
    console.log('✅ Manejando reconexión - verificando acciones pendientes y recargando datos...');
    
    // 1. Obtener resumen de acciones pendientes
    let pendingCount = 0;
    if (window.offlineSyncService) {
      const summary = window.offlineSyncService.getPendingSummary();
      pendingCount = summary.total || 0;
      console.log(`📊 Acciones pendientes encontradas: ${pendingCount}`);
    }

    // 2. Sincronizar acciones pendientes si las hay
    if (pendingCount > 0) {
      console.log('🔄 Iniciando sincronización de acciones pendientes...');
      this.showProgressModal(pendingCount);
      
      if (window.offlineSyncService) {
        await this.syncWithProgress();
      }
    }
    
    // 3. Recargar datos frescos desde Firebase (siempre)
    console.log('🔄 Recargando datos frescos desde Firebase...');
    await this.reloadFreshData();
  }
  
  /**
   * Recarga datos frescos desde Firebase después de la reconexión
   */
  async reloadFreshData() {
    try {
      console.log('📊 Iniciando recarga de datos frescos...');
      
      // Mostrar notificación de recarga
      this.showNotification({
        type: 'info',
        icon: '🔄',
        title: 'Recargando datos',
        message: 'Actualizando información desde el servidor...',
        duration: 3000
      });
      
      // Recargar datos de pacientes
      if (window.pacienteModel && typeof window.pacienteModel.getPacientes === 'function') {
        console.log('👨‍⚕️ Recargando pacientes...');
        await window.pacienteModel.getPacientes(true); // Force refresh
      }
      
      // Recargar datos de usuarios si está disponible
      if (window.usersController && typeof window.usersController.loadUsers === 'function') {
        console.log('👥 Recargando usuarios...');
        await window.usersController.loadUsers();
      }
      
      // Recargar datos de dashboard si está disponible
      if (typeof loadDashboardData === 'function') {
        console.log('📊 Recargando datos de dashboard...');
        await loadDashboardData();
      }
      
      // Mostrar notificación de éxito
      this.showNotification({
        type: 'success',
        icon: '✅',
        title: 'Datos actualizados',
        message: 'Toda la información está actualizada',
        duration: 4000
      });
      
      console.log('✅ Recarga de datos completada exitosamente');
      
    } catch (error) {
      console.error('❌ Error recargando datos frescos:', error);
      
      this.showNotification({
        type: 'warning', 
        icon: '⚠️',
        title: 'Error actualizando',
        message: 'Algunos datos pueden no estar actualizados',
        duration: 5000
      });
    }
  }

  /**
   * Muestra el modal de progreso de sincronización
   * @param {number} totalActions - Total de acciones a sincronizar
   */
  showProgressModal(totalActions) {
    this.progressModal.classList.add('visible');

    const statusEl = this.progressModal.querySelector('.sync-progress-status');
    const countEl = this.progressModal.querySelector('.sync-progress-count');

    statusEl.textContent = 'Preparando sincronización...';
    countEl.textContent = `0 de ${totalActions} acciones`;

    // Resetear barra de progreso
    const progressBar = this.progressModal.querySelector('.sync-progress-bar-fill');
    const progressText = this.progressModal.querySelector('.sync-progress-text');
    progressBar.style.width = '0%';
    progressText.textContent = '0%';

    // Ocultar resumen
    const summaryEl = this.progressModal.querySelector('.sync-progress-summary');
    summaryEl.style.display = 'none';
  }

  /**
   * Oculta el modal de progreso
   */
  hideProgressModal() {
    this.progressModal.classList.remove('visible');
    this.offlineActionsCount = 0;
  }

  /**
   * Actualiza el progreso de sincronización
   * @param {number} current - Acciones sincronizadas
   * @param {number} total - Total de acciones
   * @param {string} currentAction - Descripción de la acción actual
   */
  updateProgress(current, total, currentAction) {
    const percentage = Math.round((current / total) * 100);

    const progressBar = this.progressModal.querySelector('.sync-progress-bar-fill');
    const progressText = this.progressModal.querySelector('.sync-progress-text');
    const statusEl = this.progressModal.querySelector('.sync-progress-status');
    const countEl = this.progressModal.querySelector('.sync-progress-count');
    const currentEl = this.progressModal.querySelector('.sync-progress-current');

    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `${percentage}%`;
    statusEl.textContent = 'Sincronizando...';
    countEl.textContent = `${current} de ${total} acciones`;
    currentEl.textContent = currentAction || 'Procesando...';
  }

  /**
   * Muestra el resumen final de sincronización
   * @param {Object} summary - Resumen de la sincronización
   */
  showSyncSummary(summary) {
    const { successful, failed, items } = summary;

    const summaryEl = this.progressModal.querySelector('.sync-progress-summary');
    const summaryContent = this.progressModal.querySelector('.sync-summary-content');
    const statusEl = this.progressModal.querySelector('.sync-progress-status');

    // Actualizar estado
    if (failed === 0) {
      statusEl.innerHTML = '✅ <span style="color: #10b981;">Sincronización completada exitosamente</span>';
    } else {
      statusEl.innerHTML = `⚠️ <span style="color: #f59e0b;">Sincronización completada con ${failed} errores</span>`;
    }

    // Construir lista de items
    let summaryHTML = '';
    items.forEach(item => {
      const iconClass = item.success ? 'success' : 'error';
      const icon = item.success ? '✓' : '✕';

      summaryHTML += `
        <div class="sync-summary-item ${iconClass}">
          <div class="sync-summary-item-icon">${icon}</div>
          <div class="sync-summary-item-content">
            <div class="sync-summary-item-title">${item.title}</div>
            <div class="sync-summary-item-time">${item.time}</div>
          </div>
        </div>
      `;
    });

    summaryContent.innerHTML = summaryHTML;
    summaryEl.style.display = 'block';
  }

  /**
   * Sincroniza con progreso visual
   */
  async syncWithProgress() {
    if (!window.offlineSyncService) {
      console.error('❌ OfflineSyncService no está disponible');
      return;
    }

    try {
      const summary = window.offlineSyncService.getPendingSummary();
      const totalActions = summary.total;

      if (totalActions === 0) {
        this.hideProgressModal();
        return;
      }

      let currentAction = 0;
      const syncedItems = [];

      // Suscribirse a eventos de sincronización
      const handleSyncItem = (data) => {
        currentAction++;
        const actionDescription = this.getActionDescription(data);
        this.updateProgress(currentAction, totalActions, actionDescription);

        syncedItems.push({
          success: true,
          title: actionDescription,
          time: new Date().toLocaleTimeString()
        });
      };

      const handleSyncError = (data) => {
        currentAction++;
        const actionDescription = this.getActionDescription(data);
        this.updateProgress(currentAction, totalActions, `Error: ${actionDescription}`);

        syncedItems.push({
          success: false,
          title: actionDescription,
          time: new Date().toLocaleTimeString()
        });
      };

      // Registrar listeners si eventBus está disponible
      if (window.eventBus) {
        window.eventBus.on('sync:item:success', handleSyncItem);
        window.eventBus.on('sync:item:error', handleSyncError);
      }

      // Ejecutar sincronización
      const result = await window.offlineSyncService.flushAll();

      // Remover listeners
      if (window.eventBus) {
        window.eventBus.off('sync:item:success', handleSyncItem);
        window.eventBus.off('sync:item:error', handleSyncError);
      }

      // Mostrar resumen
      const successful = syncedItems.filter(item => item.success).length;
      const failed = syncedItems.filter(item => !item.success).length;

      this.showSyncSummary({
        successful,
        failed,
        items: syncedItems
      });

    } catch (error) {
      console.error('❌ Error durante sincronización con progreso:', error);

      const statusEl = this.progressModal.querySelector('.sync-progress-status');
      statusEl.innerHTML = '❌ <span style="color: #ef4444;">Error durante la sincronización</span>';
    }
  }

  /**
   * Obtiene descripción legible de una acción
   * @param {Object} data - Datos de la acción
   * @returns {string} Descripción
   */
  getActionDescription(data) {
    const { queue, accion, descripcion } = data;

    if (accion) return accion;

    const queueNames = {
      activities: 'Actividad',
      patients: 'Paciente',
      medicalRecords: 'Registro médico',
      checklists: 'Checklist',
      observaciones: 'Observación'
    };

    return `${queueNames[queue] || 'Acción'}: ${descripcion || 'Sin descripción'}`;
  }

  /**
   * API pública para notificar acciones offline desde controllers
   * @param {Object} actionData - Datos de la acción
   */
  notifyOfflineAction(actionData) {
    if (!this.isOnline) {
      this.showOfflineActionNotification(actionData);
    }
  }

  // ==========================================
  // MÉTODOS PÚBLICOS PARA CONTROLLERS
  // ==========================================

  /**
   * Muestra notificación de paciente guardado offline
   * @param {string} nombrePaciente - Nombre del paciente
   */
  showPacienteGuardadoOffline(nombrePaciente) {
    this.showOfflineActionNotification({
      type: 'paciente',
      action: 'crear',
      title: 'Paciente guardado localmente',
      description: `${nombrePaciente} se sincronizará automáticamente al reconectar`,
      icon: 'fa-user-plus',
      duration: 5000
    });
  }

  /**
   * Muestra notificación de paciente actualizado offline
   * @param {string} nombrePaciente - Nombre del paciente
   */
  showPacienteActualizadoOffline(nombrePaciente) {
    this.showOfflineActionNotification({
      type: 'paciente',
      action: 'actualizar',
      title: 'Paciente actualizado localmente',
      description: `Los cambios de ${nombrePaciente} se sincronizarán al reconectar`,
      icon: 'fa-user-edit',
      duration: 5000
    });
  }

  /**
   * Muestra notificación de registro médico guardado offline
   * @param {string} nombrePaciente - Nombre del paciente
   */
  showRegistroMedicoGuardadoOffline(nombrePaciente) {
    this.showOfflineActionNotification({
      type: 'registro_medico',
      action: 'crear',
      title: 'Registro médico guardado localmente',
      description: `El registro de ${nombrePaciente} se sincronizará al reconectar`,
      icon: 'fa-notes-medical',
      duration: 5000
    });
  }

  /**
   * Muestra notificación de checklist guardado offline
   * @param {string} moduloNombre - Nombre del módulo
   */
  showChecklistGuardadoOffline(moduloNombre) {
    this.showOfflineActionNotification({
      type: 'checklist',
      action: 'crear',
      title: 'Checklist guardado localmente',
      description: `El checklist de ${moduloNombre} se sincronizará al reconectar`,
      icon: 'fa-check-circle',
      duration: 5000
    });
  }

  /**
   * Muestra notificación de observación guardada offline
   * @param {string} moduloNombre - Nombre del módulo
   */
  showObservacionGuardadaOffline(moduloNombre) {
    this.showOfflineActionNotification({
      type: 'observacion',
      action: 'crear',
      title: 'Observación guardada localmente',
      description: `La observación de ${moduloNombre} se sincronizará al reconectar`,
      icon: 'fa-exclamation-triangle',
      duration: 5000
    });
  }

  /**
   * Muestra notificación genérica de acción offline
   * @param {Object} options - Opciones de la notificación
   */
  showOfflineAction(options) {
    const defaults = {
      title: 'Acción guardada localmente',
      description: 'Los datos se sincronizarán automáticamente al reconectar',
      icon: 'fa-cloud-upload-alt',
      duration: 5000
    };

    const config = { ...defaults, ...options };
    this.showOfflineActionNotification(config);
  }

  /**
   * Muestra notificación de conexión perdida
   */
  showConnectionLost() {
    this.showNotification({
      type: 'warning',
      title: 'Conexión perdida',
      message: 'Trabajando en modo offline. Las acciones se sincronizarán al reconectar.',
      icon: '📡',
      duration: 7000
    });
  }

  /**
   * Muestra notificación de conexión restaurada
   * @param {number} pendingCount - Número de acciones pendientes
   */
  showConnectionRestored(pendingCount = 0) {
    if (pendingCount > 0) {
      this.showNotification({
        type: 'success',
        title: 'Conexión restaurada',
        message: `Sincronizando ${pendingCount} acción(es) pendiente(s)...`,
        icon: '🌐',
        duration: 5000
      });
    } else {
      this.showNotification({
        type: 'success',
        title: 'Conexión restaurada',
        message: 'Todas las acciones están sincronizadas',
        icon: '🌐',
        duration: 4000
      });
    }
  }
}

// Crear instancia global
const offlineNotificationManager = new OfflineNotificationManager();
window.offlineNotificationManager = offlineNotificationManager;

export default offlineNotificationManager;

