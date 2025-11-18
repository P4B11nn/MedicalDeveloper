/**
 * Medical Developer v4.2.0 - Express Server
 * Servidor de desarrollo local con capacidades de producción
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de seguridad
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      workerSrc: ["'self'", "blob:"]
    }
  }
}));

// CORS configurado para desarrollo y producción
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? 
    ['https://tu-dominio.azurestaticapps.net'] : 
    ['http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true
}));

// Logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Parsing de JSON y URL encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0'
}));

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '4.2.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Rutas específicas para SPA
const spaRoutes = [
  '/',
  '/index.html',
  '/menuInicio.html',
  '/pages/'
];

// Manejar rutas SPA - devolver index.html para navegación client-side
app.get(spaRoutes, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Middleware de manejo de errores
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production' ? 
      'Internal Server Error' : 
      err.message
  });
});

// Middleware 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
const server = app.listen(PORT, () => {
  console.log(`🚀 Medical Developer Server v4.2.0`);
  console.log(`📡 Running on: http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Process terminated');
  });
});

module.exports = app;