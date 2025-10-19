/**
 * Panel de control JWT para desarrollo y testing
 */

import { authModel } from '../models/storageModel.js';

class JWTControlPanel {
  constructor() {
    this.isVisible = false;
    this.updateInterval = null;
  }

  /**
   * Crear el panel de control
   */
  createPanel() {
    const panel = document.createElement('div');
    panel.id = 'jwt-control-panel';
    panel.innerHTML = `
      <div class="jwt-panel">
        <div class="jwt-header">
          <h3>🔐 Control JWT</h3>
          <button onclick="window.JWTController.toggle()" class="jwt-close">×</button>
        </div>
        <div class="jwt-content">
          <div class="jwt-section">
            <label class="jwt-toggle">
              <input type="checkbox" id="jwt-enabled" onchange="window.JWTController.toggleJWT(this.checked)">
              <span class="jwt-slider"></span>
              Habilitar JWT
            </label>
          </div>
          
          <div class="jwt-section" id="jwt-status">
            <h4>Estado del Sistema:</h4>
            <div id="jwt-info">Cargando...</div>
          </div>
          
          <div class="jwt-section" id="jwt-token-info">
            <h4>Información del Token:</h4>
            <div id="token-details">No hay token activo</div>
          </div>
          
          <div class="jwt-section">
            <h4>Acciones:</h4>
            <div class="jwt-actions">
              <button onclick="window.JWTController.testLogin()" class="jwt-btn jwt-btn-primary">
                🧪 Test Login JWT
              </button>
              <button onclick="window.JWTController.renewToken()" class="jwt-btn jwt-btn-secondary">
                🔄 Renovar Token
              </button>
              <button onclick="window.JWTController.clearTokens()" class="jwt-btn jwt-btn-danger">
                🗑️ Limpiar Tokens
              </button>
            </div>
          </div>
          
          <div class="jwt-section">
            <h4>Debug:</h4>
            <div class="jwt-debug">
              <button onclick="window.JWTController.showTokenDetails()" class="jwt-btn jwt-btn-info">
                📋 Ver Token Completo
              </button>
              <button onclick="window.JWTController.exportConfig()" class="jwt-btn jwt-btn-info">
                💾 Exportar Config
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Agregar estilos
    const styles = `
      <style>
        #jwt-control-panel {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          display: none;
        }
        
        .jwt-panel {
          background: white;
          border: 2px solid #3b82f6;
          border-radius: 12px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.2);
          width: 350px;
          max-height: 80vh;
          overflow-y: auto;
        }
        
        .jwt-header {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          padding: 15px;
          border-radius: 10px 10px 0 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .jwt-header h3 {
          margin: 0;
          font-size: 16px;
        }
        
        .jwt-close {
          background: none;
          border: none;
          color: white;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 25px;
          height: 25px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .jwt-close:hover {
          background: rgba(255,255,255,0.2);
        }
        
        .jwt-content {
          padding: 15px;
        }
        
        .jwt-section {
          margin-bottom: 15px;
          padding-bottom: 10px;
          border-bottom: 1px solid #e5e7eb;
        }
        
        .jwt-section:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .jwt-section h4 {
          margin: 0 0 8px 0;
          color: #374151;
          font-size: 14px;
        }
        
        .jwt-toggle {
          display: flex;
          align-items: center;
          cursor: pointer;
          font-weight: 500;
        }
        
        .jwt-toggle input {
          margin-right: 10px;
        }
        
        .jwt-actions, .jwt-debug {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        
        .jwt-btn {
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 500;
          transition: all 0.2s;
        }
        
        .jwt-btn-primary {
          background: #3b82f6;
          color: white;
        }
        
        .jwt-btn-primary:hover {
          background: #2563eb;
        }
        
        .jwt-btn-secondary {
          background: #6b7280;
          color: white;
        }
        
        .jwt-btn-secondary:hover {
          background: #4b5563;
        }
        
        .jwt-btn-danger {
          background: #dc2626;
          color: white;
        }
        
        .jwt-btn-danger:hover {
          background: #b91c1c;
        }
        
        .jwt-btn-info {
          background: #0891b2;
          color: white;
        }
        
        .jwt-btn-info:hover {
          background: #0e7490;
        }
        
        #jwt-info, #token-details {
          background: #f9fafb;
          padding: 8px;
          border-radius: 6px;
          font-size: 12px;
          font-family: 'Courier New', monospace;
          color: #374151;
          max-height: 100px;
          overflow-y: auto;
        }
        
        .jwt-status-active {
          color: #059669 !important;
          font-weight: bold;
        }
        
        .jwt-status-inactive {
          color: #dc2626 !important;
          font-weight: bold;
        }
        
        .jwt-status-expired {
          color: #d97706 !important;
          font-weight: bold;
        }
      </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.appendChild(panel);
    
    return panel;
  }

  /**
   * Mostrar/ocultar panel
   */
  toggle() {
    const panel = document.getElementById('jwt-control-panel') || this.createPanel();
    
    if (this.isVisible) {
      panel.style.display = 'none';
      this.isVisible = false;
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
    } else {
      panel.style.display = 'block';
      this.isVisible = true;
      this.updateInfo();
      
      // Mostrar información del token en consola cuando se abre el panel
      if (typeof authModel !== 'undefined' && authModel.isJWTEnabled()) {
        const tokenInfo = authModel.getJWTInfo();
        if (tokenInfo && tokenInfo.valid) {
          console.log('🔐 === PANEL JWT ABIERTO - INFO DEL TOKEN ===');
          console.table({
            'Usuario': tokenInfo.payload.nombre,
            'Rol': tokenInfo.payload.rol,
            'Matrícula': tokenInfo.payload.matricula,
            'Tiempo restante': tokenInfo.timeFormatted,
            'Estado': tokenInfo.valid ? 'VÁLIDO ✅' : 'INVÁLIDO ❌'
          });
          console.log('Token completo:', tokenInfo);
        }
      }
      
      // Actualizar cada 5 segundos
      this.updateInterval = setInterval(() => this.updateInfo(), 5000);
    }
  }

  /**
   * Actualizar información del panel
   */
  updateInfo() {
    if (!this.isVisible) return;

    // Verificar que authModel esté disponible
    if (typeof authModel === 'undefined') {
      console.warn('JWTControlPanel: authModel no está disponible aún');
      setTimeout(() => this.updateInfo(), 1000); // Reintentar en 1 segundo
      return;
    }

    const jwtEnabled = authModel.isJWTEnabled();
    const jwtInfo = authModel.getJWTInfo();
    
    // Actualizar checkbox
    const checkbox = document.getElementById('jwt-enabled');
    if (checkbox) {
      checkbox.checked = jwtEnabled;
    }
    
    // Actualizar estado del sistema
    const infoDiv = document.getElementById('jwt-info');
    if (infoDiv) {
      if (jwtEnabled) {
        infoDiv.innerHTML = `
          <div class="jwt-status-active">✅ JWT HABILITADO</div>
          <div>Sistema: Usando tokens JWT</div>
          <div>Estado: Activo</div>
        `;
      } else {
        infoDiv.innerHTML = `
          <div class="jwt-status-inactive">❌ JWT DESHABILITADO</div>
          <div>Sistema: Usando localStorage legacy</div>
          <div>Estado: Modo compatibilidad</div>
        `;
      }
    }
    
    // Actualizar información del token
    const tokenDiv = document.getElementById('token-details');
    if (tokenDiv) {
      if (jwtEnabled && jwtInfo) {
        if (jwtInfo.valid) {
          tokenDiv.innerHTML = `
            <div class="jwt-status-active">🔐 Token válido</div>
            <div>Usuario: ${jwtInfo.payload.nombre}</div>
            <div>Rol: ${jwtInfo.payload.rol}</div>
            <div>Expira en: ${jwtInfo.timeFormatted}</div>
            <div>JTI: ${jwtInfo.payload.jti}</div>
          `;
        } else {
          tokenDiv.innerHTML = `
            <div class="jwt-status-expired">⚠️ Token expirado</div>
            <div>Error: ${jwtInfo.error || 'Token inválido'}</div>
          `;
        }
      } else {
        tokenDiv.innerHTML = '<div class="jwt-status-inactive">No hay token activo</div>';
      }
    }
  }

  /**
   * Habilitar/deshabilitar JWT
   */
  toggleJWT(enabled) {
    if (typeof authModel === 'undefined') {
      alert('❌ Error: authModel no está disponible. Recarga la página e intenta de nuevo.');
      return;
    }
    
    authModel.setJWTEnabled(enabled);
    this.updateInfo();
    
    // Emitir evento personalizado para notificar cambio de estado
    window.dispatchEvent(new CustomEvent('jwtStatusChanged', { 
      detail: { enabled: enabled } 
    }));
    
    // Actualizar indicador en página de login si existe
    if (typeof window.updateAuthModeIndicator === 'function') {
      window.updateAuthModeIndicator();
    }
    
    // Forzar actualización del indicador
    if (typeof window.forceUpdateAuthIndicator === 'function') {
      window.forceUpdateAuthIndicator();
    }
    
    console.log(`🔐 JWT ${enabled ? 'HABILITADO' : 'DESHABILITADO'}`);
    
    if (enabled) {
      alert('🔐 JWT habilitado!\n\nAhora puedes hacer login con JWT.\nEl sistema usará tokens en lugar de localStorage directo.');
    } else {
      alert('🔓 JWT deshabilitado!\n\nEl sistema vuelve a usar localStorage legacy.\nTodos los tokens han sido eliminados.');
    }
  }

  /**
   * Test de login JWT
   */
  testLogin() {
    if (typeof authModel === 'undefined') {
      alert('❌ Error: authModel no está disponible. Recarga la página e intenta de nuevo.');
      return;
    }
    
    const matricula = prompt('Ingresa matrícula para test:', 'admin');
    const password = prompt('Ingresa contraseña:', 'admin123');
    
    if (matricula && password) {
      const result = authModel.loginWithJWT(matricula, password);
      
      if (result.success) {
        alert(`✅ Login JWT exitoso!\n\nUsuario: ${result.usuario.nombre}\nToken generado correctamente.`);
        this.updateInfo();
      } else {
        alert(`❌ Login JWT fallido!\n\nError: ${result.error}`);
      }
    }
  }

  /**
   * Renovar token
   */
  renewToken() {
    if (typeof authModel === 'undefined') {
      alert('❌ Error: authModel no está disponible. Recarga la página e intenta de nuevo.');
      return;
    }
    
    const renewed = authModel.renewJWTIfNeeded();
    if (renewed) {
      alert('🔄 Token renovado exitosamente!');
      this.updateInfo();
    } else {
      alert('ℹ️ No fue necesario renovar el token o no hay sesión JWT activa.');
    }
  }

  /**
   * Limpiar tokens
   */
  clearTokens() {
    if (typeof authModel === 'undefined') {
      alert('❌ Error: authModel no está disponible. Recarga la página e intenta de nuevo.');
      return;
    }
    
    if (confirm('¿Seguro que quieres limpiar todos los tokens?')) {
      authModel.logoutJWT();
      this.updateInfo();
      alert('🗑️ Tokens eliminados correctamente.');
    }
  }

  /**
   * Mostrar detalles completos del token
   */
  showTokenDetails() {
    if (typeof authModel === 'undefined') {
      alert('❌ Error: authModel no está disponible. Recarga la página e intenta de nuevo.');
      return;
    }
    
    const jwtInfo = authModel.getJWTInfo();
    if (jwtInfo && jwtInfo.valid) {
      const details = JSON.stringify(jwtInfo, null, 2);
      console.log('🔐 JWT Token Details:', jwtInfo);
      alert(`📋 Detalles del token (ver consola para más info):\n\n${details.substring(0, 500)}...`);
    } else {
      alert('❌ No hay token válido para mostrar.');
    }
  }

  /**
   * Exportar configuración
   */
  exportConfig() {
    if (typeof authModel === 'undefined') {
      alert('❌ Error: authModel no está disponible. Recarga la página e intenta de nuevo.');
      return;
    }
    
    const config = {
      jwtEnabled: authModel.isJWTEnabled(),
      hasToken: !!localStorage.getItem('jwtToken'),
      timestamp: new Date().toISOString()
    };
    
    console.log('💾 JWT Config:', config);
    alert(`💾 Configuración exportada a consola:\n\n${JSON.stringify(config, null, 2)}`);
  }
}

// Crear instancia global
window.JWTController = new JWTControlPanel();

// Función global para mostrar el panel
window.showJWTPanel = () => window.JWTController.toggle();

// Configurar el panel cuando authModel esté disponible
const initializeJWTPanel = () => {
  console.log('🔐 JWT Control Panel cargado');
  console.log('💡 Usa Ctrl+Shift+J para abrir el panel de control');
  console.log('💡 O ejecuta showJWTPanel() en la consola');
  
  // Tecla de acceso rápido (Ctrl+Shift+J)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
      e.preventDefault();
      window.showJWTPanel();
    }
  });
};

// Escuchar el evento de carga del authModel
if (window.authModelReady) {
  // Si authModel ya está disponible
  initializeJWTPanel();
} else {
  // Esperar a que authModel esté disponible
  window.addEventListener('authModelLoaded', initializeJWTPanel);
  
  // Fallback: verificar periódicamente si authModel está disponible
  const checkAuthModel = () => {
    if (typeof authModel !== 'undefined' && !window.jwtPanelInitialized) {
      window.jwtPanelInitialized = true;
      initializeJWTPanel();
    } else if (typeof authModel === 'undefined') {
      setTimeout(checkAuthModel, 500);
    }
  };
  
  checkAuthModel();
}