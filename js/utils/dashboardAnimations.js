/**
 * 🎨 DASHBOARD ANIMATIONS MANAGER
 * Sistema avanzado de animaciones para los dashboards
 * 
 */

class DashboardAnimations {
  constructor() {
    this.animationQueues = new Map();
    this.intersectionObserver = null;
    this.initializeAnimations();
  }

  /**
   * Inicializa el sistema de animaciones
   */
  initializeAnimations() {
    // Configurar el observer para animaciones lazy
    this.setupIntersectionObserver();
    
    // Aplicar animaciones iniciales
    this.applyInitialAnimations();
    
    // Configurar animaciones dinámicas
    this.setupDynamicAnimations();
    
    console.log('🎨 Sistema de animaciones inicializado');
  }

  /**
   * Configura el Intersection Observer para animaciones lazy
   */
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.intersectionObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.animateElement(entry.target);
              this.intersectionObserver.unobserve(entry.target);
            }
          });
        },
        {
          threshold: 0.1,
          rootMargin: '50px'
        }
      );
    }
  }

  /**
   * Aplica animaciones iniciales a los elementos existentes
   */
  applyInitialAnimations() {
    // Animar header del dashboard
    const dashboardHeaders = document.querySelectorAll('.dashboard-header');
    dashboardHeaders.forEach((header, index) => {
      this.scheduleAnimation(header, 'slideInUp', index * 100);
    });

    // Animar cards del admin
    const adminCards = document.querySelectorAll('.admin-grid .dashboard-card');
    this.animateCardsStaggered(adminCards, 'slideInUp');

    // Animar cards del practitioner
    const practitionerCards = document.querySelectorAll('.practitioner-grid .dashboard-card');
    this.animateCardsStaggered(practitionerCards, 'fadeInScale');

    // Animar elementos de actividad
    const activityItems = document.querySelectorAll('.activity-item');
    this.animateCardsStaggered(activityItems, 'slideInLeft', 150);

    // Animar estadísticas
    const statItems = document.querySelectorAll('.stat-item');
    this.animateCardsStaggered(statItems, 'bounceIn', 200);
  }

  /**
   * Anima una serie de tarjetas con efecto escalonado
   */
  animateCardsStaggered(cards, animationType, baseDelay = 100) {
    cards.forEach((card, index) => {
      const delay = index * baseDelay;
      this.scheduleAnimation(card, animationType, delay);
    });
  }

  /**
   * Programa una animación para ejecutarse después de un delay
   */
  scheduleAnimation(element, animationType, delay = 0) {
    setTimeout(() => {
      this.animateElement(element, animationType);
    }, delay);
  }

  /**
   * Aplica una animación específica a un elemento
   */
  animateElement(element, animationType = 'fadeInScale') {
    if (!element) return;

    // Remover animaciones previas
    element.classList.remove('animated', 'slideInUp', 'fadeInScale', 'slideInLeft', 'slideInRight', 'bounceIn');
    
    // Aplicar nueva animación
    element.classList.add('animated', animationType);
    
    // Cleanup después de la animación
    const animationEnd = () => {
      element.removeEventListener('animationend', animationEnd);
      element.classList.add('animation-complete');
    };
    
    element.addEventListener('animationend', animationEnd);
  }

  /**
   * Configura animaciones dinámicas para elementos que se cargan después
   */
  setupDynamicAnimations() {
    // Observer para nuevos elementos
    if (this.intersectionObserver) {
      document.querySelectorAll('.dashboard-card, .activity-item, .module-item').forEach(el => {
        this.intersectionObserver.observe(el);
      });
    }

    // Animaciones para hover
    this.setupHoverAnimations();
    
    // Animaciones para clicks
    this.setupClickAnimations();
  }

  /**
   * Configura animaciones de hover
   */
  setupHoverAnimations() {
    const cards = document.querySelectorAll('.dashboard-card');
    
    cards.forEach(card => {
      card.addEventListener('mouseenter', () => {
        this.addHoverEffect(card);
      });
      
      card.addEventListener('mouseleave', () => {
        this.removeHoverEffect(card);
      });
    });
  }

  /**
   * Agrega efecto de hover
   */
  addHoverEffect(element) {
    element.style.transform = 'translateY(-5px) scale(1.02)';
    element.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.15)';
    element.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    
    // Efecto en el header
    const header = element.querySelector('.card-header h3');
    if (header) {
      header.style.color = '#3b82f6';
      header.style.transform = 'scale(1.05)';
    }

    // Efecto en iconos
    const icon = element.querySelector('.card-header i');
    if (icon) {
      icon.style.transform = 'rotate(5deg) scale(1.1)';
      icon.style.color = '#3b82f6';
    }
  }

  /**
   * Remueve efecto de hover
   */
  removeHoverEffect(element) {
    element.style.transform = '';
    element.style.boxShadow = '';
    
    const header = element.querySelector('.card-header h3');
    if (header) {
      header.style.color = '';
      header.style.transform = '';
    }

    const icon = element.querySelector('.card-header i');
    if (icon) {
      icon.style.transform = '';
      icon.style.color = '';
    }
  }

  /**
   * Configura animaciones de click
   */
  setupClickAnimations() {
    const clickableElements = document.querySelectorAll('.dashboard-card, .module-item, button');
    
    clickableElements.forEach(element => {
      element.addEventListener('click', (e) => {
        this.addClickEffect(element, e);
      });
    });
  }

  /**
   * Agrega efecto de click (ripple effect)
   */
  addClickEffect(element, event) {
    const ripple = document.createElement('div');
    ripple.classList.add('ripple');
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.cssText = `
      position: absolute;
      width: ${size}px;
      height: ${size}px;
      left: ${x}px;
      top: ${y}px;
      background: radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
      z-index: 1000;
    `;
    
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    element.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 600);
  }

  /**
   * Anima la carga de nuevos datos
   */
  animateDataLoad(container, newContent) {
    if (!container) return;
    
    // Fade out del contenido actual
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      container.innerHTML = newContent;
      
      // Fade in del nuevo contenido
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
      
      // Animar nuevos elementos
      const newElements = container.querySelectorAll('.dashboard-card, .activity-item');
      this.animateCardsStaggered(newElements, 'slideInUp', 50);
    }, 200);
  }

  /**
   * Anima el cambio de estado de un elemento
   */
  animateStateChange(element, newState) {
    if (!element) return;
    
    element.classList.add('state-changing');
    
    setTimeout(() => {
      element.classList.remove('state-changing');
      element.classList.add(`state-${newState}`);
      this.animateElement(element, 'pulse');
    }, 150);
  }

  /**
   * Anima números contadores
   */
  animateCounter(element, endValue, duration = 1000) {
    if (!element) return;
    
    const startValue = 0;
    const startTime = performance.now();
    
    const updateCounter = (currentTime) => {
      const elapsedTime = currentTime - startTime;
      const progress = Math.min(elapsedTime / duration, 1);
      
      // Usar easing para un efecto más suave
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentValue = Math.floor(startValue + (endValue - startValue) * easedProgress);
      
      element.textContent = currentValue.toLocaleString();
      
      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      }
    };
    
    requestAnimationFrame(updateCounter);
  }

  /**
   * Funciones específicas para el dashboard médico
   */
  
  /**
   * Anima la actualización de datos médicos en tiempo real
   */
  animateRealtimeUpdate(element, data) {
    if (!element) return;
    
    // Efecto de actualización de datos
    element.classList.add('real-time-update');
    
    // Si es una actividad de consulta, agregar efectos especiales
    if (element.classList.contains('activity-item')) {
      this.animateConsultationActivity(element, data);
    }
    
    setTimeout(() => {
      element.classList.remove('real-time-update');
    }, 2000);
  }

  /**
   * Anima elementos de actividad de consulta
   */
  animateConsultationActivity(element, activityData) {
    const statusIndicator = element.querySelector('.status-indicator');
    if (statusIndicator && activityData) {
      // Cambiar estado visual basado en el tipo de consulta
      if (activityData.status === 'active') {
        statusIndicator.classList.add('active');
        statusIndicator.classList.remove('inactive');
      } else {
        statusIndicator.classList.add('inactive');
        statusIndicator.classList.remove('active');
      }
    }
    
    // Efecto de entrada para nueva actividad
    element.style.borderLeft = '3px solid #10b981';
    setTimeout(() => {
      element.style.borderLeft = '';
    }, 3000);
  }

  /**
   * Anima estadísticas médicas (contadores)
   */
  animateMedicalStats(statsContainer) {
    const statElements = statsContainer.querySelectorAll('[data-stat-value]');
    
    statElements.forEach((element, index) => {
      const targetValue = parseInt(element.dataset.statValue) || 0;
      
      setTimeout(() => {
        this.animateCounter(element, targetValue, 1500);
      }, index * 200);
    });
  }

  /**
   * Anima la carga de grupos de trabajo
   */
  animateWorkGroupsLoad(container, groups) {
    if (!container) return;
    
    // Fade out del loading
    const loading = container.querySelector('.fa-spinner');
    if (loading) {
      loading.parentElement.style.opacity = '0';
      
      setTimeout(() => {
        // Limpiar contenido de loading
        container.innerHTML = '';
        
        // Agregar grupos con animación
        groups.forEach((group, index) => {
          setTimeout(() => {
            const groupElement = this.createGroupElement(group);
            container.appendChild(groupElement);
            this.animateElement(groupElement, 'slideInUp');
          }, index * 100);
        });
      }, 300);
    }
  }

  /**
   * Crea elemento de grupo de trabajo
   */
  createGroupElement(group) {
    const div = document.createElement('div');
    div.className = 'work-group-item';
    div.innerHTML = `
      <div class="group-info">
        <span class="group-name">${group.nombre}</span>
        <span class="group-members">${group.miembros?.length || 0} miembros</span>
      </div>
      <div class="group-status ${group.activo ? 'active' : 'inactive'}">
        <i class="fas fa-circle"></i>
        ${group.activo ? 'Activo' : 'Inactivo'}
      </div>
    `;
    return div;
  }

  /**
   * Anima cambios en el registro de instrumentos
   */
  animateInstrumentUpdate(container, instruments) {
    if (!container) return;
    
    const existingItems = container.querySelectorAll('.instrument-item');
    
    // Fade out elementos existentes
    existingItems.forEach(item => {
      item.style.opacity = '0.5';
      item.style.transform = 'translateX(-10px)';
    });
    
    setTimeout(() => {
      container.innerHTML = '';
      
      instruments.forEach((instrument, index) => {
        setTimeout(() => {
          const instrumentElement = this.createInstrumentElement(instrument);
          container.appendChild(instrumentElement);
          this.animateElement(instrumentElement, 'slideInRight');
        }, index * 75);
      });
    }, 200);
  }

  /**
   * Crea elemento de instrumento
   */
  createInstrumentElement(instrument) {
    const div = document.createElement('div');
    div.className = 'instrument-item';
    div.innerHTML = `
      <div class="instrument-info">
        <span class="instrument-name">${instrument.nombre}</span>
        <span class="instrument-type">${instrument.tipo}</span>
      </div>
      <div class="instrument-status ${instrument.disponible ? 'available' : 'unavailable'}">
        ${instrument.disponible ? 'Disponible' : 'En uso'}
      </div>
    `;
    return div;
  }

  /**
   * Anima notificaciones o alertas
   */
  animateNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // Estilos especiales para estadísticas actualizadas
    const isStatsUpdate = message.includes('Estadísticas actualizadas');
    
    notification.innerHTML = `
      <div class="notification-icon ${isStatsUpdate ? 'stats-icon' : type + '-icon'}">
        <i class="fas fa-${this.getNotificationIcon(type, message)}"></i>
        ${isStatsUpdate ? '<div class="icon-pulse"></div>' : '<div class="icon-glow"></div>'}
      </div>
      <div class="notification-content">
        <span class="notification-text">${message}</span>
        ${isStatsUpdate ? '<small class="notification-subtitle">📊 Datos actualizados en tiempo real</small>' : ''}
      </div>
      <button class="close-btn"><i class="fas fa-times"></i></button>
    `;
    
    // Estilos premium para la notificación
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${isStatsUpdate 
        ? 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)' 
        : 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)'};
      color: ${isStatsUpdate ? 'white' : '#374151'};
      border: ${isStatsUpdate 
        ? '2px solid rgba(255, 255, 255, 0.3)' 
        : '1px solid #e2e8f0'};
      border-radius: 16px;
      padding: 20px 24px;
      box-shadow: ${isStatsUpdate 
        ? '0 25px 50px rgba(16, 185, 129, 0.4), 0 8px 16px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)' 
        : '0 20px 40px rgba(0, 0, 0, 0.1)'};
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 16px;
      min-width: 360px;
      max-width: 420px;
      transform: translateX(100%);
      transition: all 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
      backdrop-filter: blur(20px);
      position: relative;
      overflow: hidden;
    `;
    
    // Agregar efectos visuales premium para todos los tipos
    const style = document.createElement('style');
    
    // Estilos base para todas las notificaciones
    style.textContent = `
      .notification {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        position: relative;
      }
      .notification.info {
        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 50%, #1e40af 100%) !important;
        color: white !important;
        border: 2px solid rgba(59, 130, 246, 0.3) !important;
      }
      .notification.warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%) !important;
        color: white !important;
        border: 2px solid rgba(245, 158, 11, 0.3) !important;
      }
      .notification.error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 50%, #b91c1c 100%) !important;
        color: white !important;
        border: 2px solid rgba(239, 68, 68, 0.3) !important;
      }
    `;
    
    // Agregar estilos específicos para success/stats
    if (isStatsUpdate || type === 'success') {
      style.textContent += `
        .notification .stats-icon,
        .notification .success-icon,
        .notification .info-icon,
        .notification .warning-icon,
        .notification .error-icon {
          position: relative;
          overflow: hidden;
          background: linear-gradient(45deg, rgba(255,255,255,0.2), rgba(255,255,255,0.1));
          border-radius: 12px;
          padding: 12px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.3);
          min-width: 40px;
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .notification .stats-icon i,
        .notification .success-icon i,
        .notification .info-icon i,
        .notification .warning-icon i,
        .notification .error-icon i {
          font-size: 18px;
          z-index: 2;
          position: relative;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(notification);
    
    // Animar entrada con efectos dramáticos
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
      if (isStatsUpdate) {
        notification.style.boxShadow = '0 30px 60px rgba(16, 185, 129, 0.3), 0 12px 24px rgba(0, 0, 0, 0.15)';
        
        // Efecto de aparición con destello
        setTimeout(() => {
          const flash = document.createElement('div');
          flash.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent, rgba(255,255,255,0.6), transparent);
            pointer-events: none;
            animation: flash-appear 0.6s ease-out;
          `;
          
          const flashStyle = document.createElement('style');
          flashStyle.textContent = `
            @keyframes flash-appear {
              0% { opacity: 0; transform: scale(0.8) rotate(-10deg); }
              50% { opacity: 1; transform: scale(1.05) rotate(0deg); }
              100% { opacity: 0; transform: scale(1) rotate(10deg); }
            }
          `;
          document.head.appendChild(flashStyle);
          
          notification.appendChild(flash);
          setTimeout(() => flash.remove(), 600);
        }, 100);
      }
    }, 10);
    
    // Auto-remove después de 6 segundos con efectos de salida
    setTimeout(() => {
      // Efecto de desvanecimiento progresivo
      notification.style.transform = 'translateX(100%) scale(0.95)';
      notification.style.opacity = '0';
      
      if (isStatsUpdate) {
        // Efecto de partículas para estadísticas
        const particles = document.createElement('div');
        particles.style.cssText = `
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          background: radial-gradient(circle, #10b981, transparent);
          border-radius: 50%;
          animation: particle-explode 0.8s ease-out;
          pointer-events: none;
        `;
        
        const particleStyle = document.createElement('style');
        particleStyle.textContent = `
          @keyframes particle-explode {
            0% { transform: translate(-50%, -50%) scale(0); }
            50% { transform: translate(-50%, -50%) scale(3); opacity: 0.7; }
            100% { transform: translate(-50%, -50%) scale(6); opacity: 0; }
          }
        `;
        document.head.appendChild(particleStyle);
        
        notification.appendChild(particles);
      }
      
      setTimeout(() => notification.remove(), 400);
    }, 6000);
    
    // Botón de cerrar con efectos mejorados
    notification.querySelector('.close-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      
      // Efecto de click
      notification.style.transform = 'translateX(100%) scale(0.9) rotateY(15deg)';
      notification.style.opacity = '0';
      
      // Efecto de ondas al cerrar
      const ripple = document.createElement('div');
      ripple.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        width: 10px;
        height: 10px;
        background: rgba(255,255,255,0.5);
        border-radius: 50%;
        transform: translate(-50%, -50%) scale(0);
        animation: ripple-close 0.5s ease-out;
        pointer-events: none;
      `;
      
      const rippleStyle = document.createElement('style');
      rippleStyle.textContent = `
        @keyframes ripple-close {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(20); opacity: 0; }
        }
      `;
      document.head.appendChild(rippleStyle);
      
      notification.appendChild(ripple);
      setTimeout(() => notification.remove(), 400);
    });
  }

  /**
   * Obtiene el icono apropiado para el tipo de notificación con iconos premium
   */
  getNotificationIcon(type, message = '') {
    // Iconos especiales para mensajes específicos
    if (message.includes('Estadísticas actualizadas')) {
      return 'chart-line';
    }
    if (message.includes('Paciente guardado') || message.includes('sincronizará')) {
      return 'user-plus';
    }
    if (message.includes('Conexión') || message.includes('online') || message.includes('offline')) {
      return 'wifi';
    }
    if (message.includes('Datos cargados') || message.includes('actualizado')) {
      return 'sync-alt';
    }
    if (message.includes('minimizada') || message.includes('expandida')) {
      return 'expand-arrows-alt';
    }
    
    // Iconos por tipo con mejores opciones
    const icons = {
      'info': 'info-circle',
      'success': 'check-circle',
      'warning': 'exclamation-triangle',
      'error': 'times-circle'
    };
    return icons[type] || 'bell';
  }

  /**
   * Limpia todas las animaciones
   */
  cleanup() {
    if (this.intersectionObserver) {
      this.intersectionObserver.disconnect();
    }
    
    this.animationQueues.clear();
  }
}
// Exportar la clase
window.DashboardAnimations = DashboardAnimations;

/**
 * Funciones de utilidad para integración con el sistema médico
 */

// Funciones globales para usar desde otros módulos
window.animateDataUpdate = function(containerId, newData) {
  const container = document.getElementById(containerId);
  if (container && window.dashboardAnimations) {
    window.dashboardAnimations.animateDataLoad(container, newData);
  }
};

window.animateRealtimeActivity = function(activityData) {
  const activityContainer = document.querySelector('.consultation-activity');
  if (activityContainer && window.dashboardAnimations) {
    window.dashboardAnimations.animateRealtimeUpdate(activityContainer, activityData);
  }
};

window.animateStatsCounter = function(statsContainer) {
  if (statsContainer && window.dashboardAnimations) {
    window.dashboardAnimations.animateMedicalStats(statsContainer);
  }
};

window.showAnimatedNotification = function(message, type = 'info') {
  if (window.dashboardAnimations) {
    window.dashboardAnimations.animateNotification(message, type);
  }
};

window.animateGroupsLoad = function(groups) {
  const container = document.getElementById('dashboard-grupos-list');
  if (container && window.dashboardAnimations) {
    window.dashboardAnimations.animateWorkGroupsLoad(container, groups);
  }
};

// Auto-inicialización cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.dashboardAnimations = new DashboardAnimations();
    
    // Configurar eventos específicos del dashboard médico
    setupMedicalDashboardEvents();
  });
} else {
  window.dashboardAnimations = new DashboardAnimations();
  setupMedicalDashboardEvents();
}

/**
 * Configura eventos específicos del dashboard médico
 */
function setupMedicalDashboardEvents() {
  // Animar cuando se cargan nuevos datos de grupos
  const gruposObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.target.id === 'dashboard-grupos-list') {
        const newGroups = mutation.target.querySelectorAll('.work-group-item:not(.animation-complete)');
        newGroups.forEach((group, index) => {
          setTimeout(() => {
            window.dashboardAnimations.animateElement(group, 'slideInUp');
          }, index * 100);
        });
      }
    });
  });

  const gruposContainer = document.getElementById('dashboard-grupos-list');
  if (gruposContainer) {
    gruposObserver.observe(gruposContainer, { childList: true, subtree: true });
  }

  // Animar actualizaciones de actividad de consulta
  const activityObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.target.classList.contains('consultation-activity')) {
        const newActivities = mutation.target.querySelectorAll('.activity-item:not(.animation-complete)');
        newActivities.forEach((activity, index) => {
          setTimeout(() => {
            window.dashboardAnimations.animateElement(activity, 'slideInLeft');
          }, index * 150);
        });
      }
    });
  });

  const activityContainer = document.querySelector('.consultation-activity');
  if (activityContainer) {
    activityObserver.observe(activityContainer, { childList: true, subtree: true });
  }

  // Eventos para botones del dashboard
  document.addEventListener('click', (e) => {
    if (e.target.closest('.dashboard-card')) {
      const card = e.target.closest('.dashboard-card');
      
      // Efecto especial para navegación a categorías
      if (card.dataset.category) {
        window.dashboardAnimations.animateStateChange(card, 'navigating');
        window.showAnimatedNotification(`Navegando a ${card.dataset.category.replace('-', ' ')}`, 'info');
      }
    }
    
    // Efectos para botones de gestión
    if (e.target.closest('.manage-btn, .refresh-btn, .filter-btn')) {
      const button = e.target.closest('button');
      window.dashboardAnimations.addClickEffect(button, e);
    }
  });

  // Simular datos en tiempo real (para demostración)
  if (typeof window !== 'undefined' && window.location.pathname.includes('menuInicio')) {
    setTimeout(() => {
      // Simular actualización de estadísticas
      const statsElements = document.querySelectorAll('[data-stat-value]');
      statsElements.forEach(el => {
        const currentValue = parseInt(el.textContent) || 0;
        const newValue = currentValue + Math.floor(Math.random() * 5);
        el.dataset.statValue = newValue;
        window.dashboardAnimations.animateCounter(el, newValue);
      });
      
      // Mostrar notificación de actualización
      window.showAnimatedNotification('Estadísticas actualizadas', 'success');
    }, 3000);
  }
}

console.log('🎨 Dashboard Animations Manager cargado con integración médica');