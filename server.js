// server.js - Servidor Express con configuración CORS básica
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ===========================================
// CONFIGURACIÓN CORS BÁSICA
// ===========================================

const corsOptions = {
  origin: function (origin, callback) {
    // En desarrollo, permitir todos los orígenes de localhost
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    // En producción, permitir orígenes específicos
    const allowedOrigins = [
      'https://medicalweboffline.firebaseapp.com',
      'https://medicalweboffline.web.app'
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(new Error('No permitido por política CORS'), false);
  },
  
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH', 'HEAD'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  credentials: true,
  maxAge: 86400
};

// ===========================================
// MIDDLEWARES
// ===========================================

// Logging personalizado con timestamp
app.use(morgan(':date[iso] :status :method :url :res[content-length] :response-time ms'));

// Seguridad con Helmet (configuración relajada para Firebase)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Aplicar CORS
app.use(cors(corsOptions));

// Parse JSON
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Middleware de logging básico
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    console.log(`🔍 [CORS] Preflight request para: ${req.url}`);
  }
  next();
});

// ===========================================
// ARCHIVOS ESTÁTICOS
// ===========================================

// Configuración de archivos estáticos
const staticOptions = {
  index: ['index.html'],
  extensions: ['html'],
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    
    // Cache headers
    if (['.js', '.css'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=3600');
    } else if (['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico'].includes(ext)) {
      res.setHeader('Cache-Control', 'public, max-age=86400');
    } else if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
    }
    
    // Content-Type para módulos JS
    if (ext === '.js') {
      res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
    }
  }
};

app.use(express.static(process.cwd(), staticOptions));

// ===========================================
// RUTAS
// ===========================================

// Ruta principal
app.get('/', (req, res) => {
  console.log('📍 Serving index.html');
  res.sendFile(path.join(process.cwd(), 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// CORS info (solo desarrollo)
if (process.env.NODE_ENV !== 'production') {
  app.get('/cors-info', (req, res) => {
    res.json({
      corsEnabled: true,
      environment: process.env.NODE_ENV || 'development',
      allowedMethods: corsOptions.methods,
      allowedHeaders: corsOptions.allowedHeaders.slice(0, 10), // Solo mostrar algunos
      credentials: corsOptions.credentials
    });
  });
}

// ===========================================
// MANEJO DE ERRORES
// ===========================================

// 404 handler - debe ir después de todas las rutas
app.use((req, res) => {
  console.log(`❌ [404] ${req.method} ${req.originalUrl}`);
  
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({
      error: 'Endpoint no encontrado',
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  } else {
    // Para SPA, servir index.html en rutas no encontradas
    res.sendFile(path.join(process.cwd(), 'index.html'));
  }
});

// Error handler global
app.use((err, req, res, next) => {
  console.error(`💥 [Error] ${err.message}`);
  
  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }
  
  res.status(err.status || 500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Error interno',
    timestamp: new Date().toISOString()
  });
});

// ===========================================
// INICIAR SERVIDOR
// ===========================================

const server = app.listen(PORT, () => {
  console.log('');
  console.log('🎉 ===============================================');
  console.log('🚀 SERVIDOR EXPRESS INICIADO CORRECTAMENTE');
  console.log('🎉 ===============================================');
  console.log('');
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📁 Directorio: ${process.cwd()}`);
  console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS: Configuración básica activa`);
  console.log(`🛡️  Seguridad: Helmet activado`);
  console.log(`📊 Logging: Morgan activado`);
  console.log('');
  console.log('🔗 Endpoints disponibles:');
  console.log(`   🏠 Aplicación: http://localhost:${PORT}/`);
  console.log(`   ❤️  Health: http://localhost:${PORT}/health`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`   🔍 CORS Info: http://localhost:${PORT}/cors-info`);
  }
  console.log('');
  console.log('⏹️  Para detener: Ctrl + C');
  console.log('');
});

// ===========================================
// GRACEFUL SHUTDOWN
// ===========================================

process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recibido...');
  server.close(() => {
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});
