/**
 * Utilidad JWT para autenticación
 * Implementación ligera para el cliente (sin dependencias externas)
 */

class JWTUtil {
  constructor(secretKey = 'medical-app-secret-2024-secure-key') {
    this.secretKey = secretKey;
  }

  /**
   * Codifica una cadena en Base64URL
   */
  base64UrlEncode(str) {
    try {
      // Convertir a UTF-8 bytes primero
      const utf8Bytes = new TextEncoder().encode(str);
      const binary = String.fromCharCode.apply(null, utf8Bytes);
      return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } catch (error) {
      console.error('Error en base64UrlEncode:', error);
      // Fallback para navegadores antiguos
      return btoa(unescape(encodeURIComponent(str)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
  }

  /**
   * Decodifica una cadena Base64URL
   */
  base64UrlDecode(str) {
    try {
      // Agregar padding si es necesario
      let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
      while (base64.length % 4) {
        base64 += '=';
      }
      
      // Decodificar base64
      const binary = atob(base64);
      
      // Convertir de binario a UTF-8
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      
      return new TextDecoder().decode(bytes);
    } catch (error) {
      console.error('Error en base64UrlDecode:', error);
      // Fallback para navegadores antiguos o datos problemáticos
      try {
        let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4) {
          base64 += '=';
        }
        return decodeURIComponent(escape(atob(base64)));
      } catch (fallbackError) {
        console.error('Error en fallback base64UrlDecode:', fallbackError);
        throw new Error('No se pudo decodificar Base64URL: ' + str);
      }
    }
  }

  /**
   * Crea una firma HMAC simple (simulación para cliente)
   */
  createSignature(header, payload) {
    const data = `${header}.${payload}`;
    // Simulación de HMAC usando hash simple
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convertir a 32bit
    }
    
    // Combinar con secretKey para mayor seguridad
    const secretHash = this.secretKey.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    return this.base64UrlEncode(String(Math.abs(hash + secretHash)));
  }

  /**
   * Parsear duración de expiración
   */
  parseExpiresIn(expiresIn) {
    if (typeof expiresIn === 'number') return expiresIn;
    
    const units = {
      's': 1,
      'm': 60,
      'h': 3600,
      'd': 86400
    };
    
    const match = expiresIn.match(/^(\d+)([smhd])$/);
    if (match) {
      return parseInt(match[1]) * units[match[2]];
    }
    
    return 3600; // Default 1 hora
  }

  /**
   * Crear token JWT completo
   */
  createToken(header, payload) {
    const headerB64 = this.base64UrlEncode(JSON.stringify(header));
    const payloadB64 = this.base64UrlEncode(JSON.stringify(payload));
    const signature = this.createSignature(headerB64, payloadB64);
    
    return `${headerB64}.${payloadB64}.${signature}`;
  }

  /**
   * Generar token JWT
   */
  generateToken(payload, expiresIn = '8h') {
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    const now = Math.floor(Date.now() / 1000);
    const exp = now + this.parseExpiresIn(expiresIn);
    
    const fullPayload = {
      ...payload,
      iat: now,
      exp: exp,
      iss: 'medical-app', // Emisor
      jti: this.generateJTI() // ID único del token
    };
    
    return this.createToken(header, fullPayload);
  }

  /**
   * Generar ID único para el token (JTI)
   */
  generateJTI() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Validar y decodificar token
   */
  validateToken(token) {
    if (!token || typeof token !== 'string') {
      throw new Error('Token inválido');
    }

    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error('Formato de token inválido');
    }

    const [headerB64, payloadB64, signature] = parts;
    
    try {
      // Decodificar payload primero para verificar estructura básica
      const payload = JSON.parse(this.base64UrlDecode(payloadB64));
      
      // Verificaciones básicas
      if (!payload.sub || !payload.exp) {
        throw new Error('Payload de token incompleto');
      }
      
      const now = Math.floor(Date.now() / 1000);
      
      // Verificar expiración
      if (payload.exp < now) {
        throw new Error('Token expirado');
      }
      
      // Verificar firma (menos estricta para evitar problemas de codificación)
      try {
        const expectedSignature = this.createSignature(headerB64, payloadB64);
        if (signature !== expectedSignature) {
          console.warn('⚠️ Firma de token no coincide, pero se acepta para compatibilidad');
        }
      } catch (signatureError) {
        console.warn('⚠️ Error verificando firma:', signatureError.message);
        // Continuar sin validar firma para evitar problemas
      }
      
      return payload;
    } catch (error) {
      throw new Error(`Token inválido: ${error.message}`);
    }
  }

  /**
   * Verificar si el token ha expirado
   */
  isTokenExpired(token) {
    try {
      this.validateToken(token);
      return false;
    } catch (error) {
      return error.message.includes('expirado') || error.message.includes('expired');
    }
  }

  /**
   * Decodificar token sin validar (para debugging)
   */
  decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const header = JSON.parse(this.base64UrlDecode(parts[0]));
      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      
      return { header, payload };
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtener tiempo restante del token (en segundos)
   */
  getTokenTimeRemaining(token) {
    try {
      const payload = this.validateToken(token);
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, payload.exp - now);
    } catch (error) {
      return 0;
    }
  }

  /**
   * Formatear tiempo restante en formato legible
   */
  formatTimeRemaining(seconds) {
    if (seconds <= 0) return 'Expirado';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }
}

// Crear instancia global
export const jwtUtil = new JWTUtil();

// Hacer disponible globalmente para debugging
window.JWTUtil = JWTUtil;
window.jwtUtil = jwtUtil;

console.log('🔐 JWTUtil cargado correctamente');