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
    notification.innerHTML = `
      <i class="fas fa-${this.getNotificationIcon(type)}"></i>
      <span>${message}</span>
      <button class="close-btn"><i class="fas fa-times"></i></button>
    `;
    
    // Estilos inline para la notificación
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: white;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 300px;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Auto-remove después de 5 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 5000);
    
    // Botón de cerrar
    notification.querySelector('.close-btn').addEventListener('click', () => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    });
  }

  /**
   * Obtiene el icono apropiado para el tipo de notificación
   */
  getNotificationIcon(type) {
    const icons = {
      'info': 'info-circle',
      'success': 'check-circle',
      'warning': 'exclamation-triangle',
      'error': 'times-circle'
    };
    return icons[type] || icons.info;
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

// Agregar estilos CSS para las animaciones via JavaScript
const animationStyles = `
  <style id="dashboard-animations-styles">
    /* Animaciones base */
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeInScale {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes slideInLeft {
      from {
        opacity: 0;
        transform: translateX(-30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes slideInRight {
      from {
        opacity: 0;
        transform: translateX(30px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes bounceIn {
      0% {
        opacity: 0;
        transform: scale(0.3);
      }
      50% {
        opacity: 1;
        transform: scale(1.05);
      }
      70% {
        transform: scale(0.9);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.05);
      }
    }

    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }

    /* Clases de animación */
    .animated {
      animation-duration: 0.6s;
      animation-fill-mode: both;
    }

    .slideInUp {
      animation-name: slideInUp;
    }

    .fadeInScale {
      animation-name: fadeInScale;
    }

    .slideInLeft {
      animation-name: slideInLeft;
    }

    .slideInRight {
      animation-name: slideInRight;
    }

    .bounceIn {
      animation-name: bounceIn;
      animation-duration: 0.8s;
    }

    .pulse {
      animation-name: pulse;
      animation-duration: 1s;
    }

    /* Estados de transición */
    .state-changing {
      transition: all 0.3s ease;
      opacity: 0.7;
      transform: scale(0.98);
    }

    /* Mejoras responsivas */
    @media (max-width: 768px) {
      .animated {
        animation-duration: 0.4s;
      }
    }

    /* Preferencias de movimiento reducido */
    @media (prefers-reduced-motion: reduce) {
      .animated {
        animation-duration: 0.1s;
      }
      
      .dashboard-card:hover {
        transform: none;
      }
    }
  </style>
`;

// Insertar estilos en el head
document.head.insertAdjacentHTML('beforeend', animationStyles);

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