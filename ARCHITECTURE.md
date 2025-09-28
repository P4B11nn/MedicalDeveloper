# MedicalWeb - Arquitectura MVC Completa

## 📋 Resumen del Proyecto
Sistema web offline de gestión médica implementado con **arquitectura MVC estricta**, **Event Bus pattern** y **middleware de autenticación robusto**.

## 🏗️ Arquitectura MVC Implementada

### **Modelos (Models)** - `js/models/`
- **`storageModel.js`** - Gestión de usuarios, autenticación y actividades
- **`operacionesModel.js`** - Registro de entradas/salidas y mesas de salud
- **`pacienteModel.js`** - Gestión de datos de pacientes
- **`reporteModel.js`** - Generación de reportes y estadísticas

**Responsabilidades:**
- Gestión de datos en localStorage
- Validación de datos
- Funciones de exportación (CSV)
- Lógica de negocio

### **Vistas (Views)** - `js/views/`
- **`MenuInicio.js`** - Navegación principal con validación de permisos
- **`operacionesView.js`** - Renderizado de tablas y tarjetas
- **`pacienteView.js`** - Interfaz de gestión de pacientes
- **`reporteView.js`** - Visualización de reportes
- **`userView.js`** - Gestión de usuarios y personal

**Responsabilidades:**
- Renderizado de elementos DOM
- Actualización de interfaces
- Manejo de templates HTML

### **Controladores (Controllers)** - `js/controllers/`
- **`authController.js`** - Autenticación y login
- **`globalController.js`** - Lógica común (logout, navegación)
- **`operacionesController.js`** - Control de operaciones y filtros
- **`pacienteController.js`** - Control de gestión de pacientes
- **`reporteController.js`** - Control de reportes
- **`usersController.js`** - Control de usuarios y personal

**Responsabilidades:**
- Coordinación entre modelos y vistas
- Manejo de eventos de usuario
- Lógica de aplicación
- Validación de permisos

## 🔐 Sistema de Autenticación y Middleware

### **AuthGuard Middleware** - `js/middleware/authGuard.js`
```javascript
// Protección por rutas y roles
PROTECTED_ROUTES = {
    'categoria-usuarios-personal.html': ['admin'],
    'categoria-reportes.html': ['admin', 'practicante'],
    'categoria-operaciones-control.html': ['admin', 'practicante'],
    'categoria-pacientes.html': ['admin', 'practicante']
}
```

**Características:**
- ✅ Verificación automática de sesiones
- ✅ Protección por roles (admin/practicante)
- ✅ Redirección inteligente post-login
- ✅ Detección de logout en otras pestañas
- ✅ Validación periódica (cada 30 segundos)

## 🚌 Event Bus Pattern

### **Event Bus Core** - `js/utils/eventBus.js`
Sistema centralizado de comunicación entre componentes:

```javascript
// Eventos estándar definidos
EVENT_NAMES = {
    USER_LOGIN: 'user:login',
    USER_LOGOUT: 'user:logout',
    SESSION_EXPIRED: 'session:expired',
    PERMISSION_DENIED: 'permission:denied',
    PAGE_LOAD: 'page:load',
    NAVIGATE_TO: 'navigate:to',
    DATA_LOADED: 'data:loaded',
    FILTER_CHANGED: 'ui:filter:changed',
    EXPORT_REQUESTED: 'ui:export:requested'
}
```

**Beneficios:**
- ✅ Desacoplamiento total entre módulos
- ✅ Comunicación bidireccional sin dependencias
- ✅ Event history y debugging
- ✅ Error handling sin afectar otros listeners

### **Event Bus Manager** - `js/utils/eventBusManager.js`
Monitoreo y debugging avanzado:
- Event history (últimos 100 eventos)
- Performance monitoring
- Comandos de consola `EventBusDebug.*`
- Estadísticas de uso por evento

## ⚡ Optimización y Monitoreo

### **Performance Monitor** - `js/utils/performanceMonitor.js`
```javascript
// Thresholds de rendimiento
thresholds = {
    pageLoad: 3000,      // 3 segundos
    domReady: 1000,      // 1 segundo  
    eventEmit: 100,      // 100ms
    dataLoad: 500,       // 500ms
    render: 200          // 200ms
}
```

**Características:**
- ✅ Monitoreo de carga de página
- ✅ Tracking de memoria (detección de leaks)
- ✅ Medición de funciones críticas
- ✅ Alertas automáticas de rendimiento lento
- ✅ Comandos debug `PerformanceDebug.*`

### **Architecture Validator** - `js/utils/architectureValidator.js`
Validador de integridad MVC:
- ✅ Validación de Event Bus
- ✅ Verificación de performance
- ✅ Check de dependencias circulares
- ✅ Validación de naming conventions
- ✅ Verificación de separación de responsabilidades

## 📊 Comandos de Debug Disponibles

### En la consola del navegador (localhost):

**Event Bus:**
```javascript
EventBusDebug.history()      // Últimos 20 eventos
EventBusDebug.stats()        // Estadísticas de uso
EventBusDebug.events()       // Eventos registrados
EventBusDebug.emit(event)    // Emitir eventos manualmente
```

**Performance:**
```javascript
PerformanceDebug.getMetrics()     // Métricas de rendimiento
PerformanceDebug.generateReport() // Reporte completo
PerformanceDebug.measure(fn)      // Medir función
```

**Architecture:**
```javascript
ArchitectureDebug.validate()        // Validación completa
ArchitectureDebug.checkEventBus()   // Validar Event Bus
ArchitectureDebug.checkPerformance() // Validar rendimiento
```

## 🔒 Sistema de Roles y Permisos

### **Roles Definidos:**
- **`admin`** - Acceso completo a todas las secciones
- **`practicante`** - Acceso a pacientes, operaciones y reportes

### **Usuarios por Defecto:**
```javascript
// Credenciales de prueba
{ id: 'admin', matricula: 'admin', contrasena: 'admin123', rol: 'admin' }
{ id: 'pract', matricula: 'pract', contrasena: 'pract123', rol: 'practicante' }
```

## 📁 Estructura de Archivos

```
MedicalWebOffline-main/
├── js/
│   ├── controllers/      # Controladores MVC
│   ├── models/          # Modelos de datos
│   ├── views/           # Vistas y renderizado
│   ├── middleware/      # AuthGuard y middleware
│   └── utils/           # Utilidades (EventBus, Performance, etc.)
├── pages/               # Páginas HTML protegidas
├── img/                 # Assets e imágenes
└── index.html           # Página de login
```

## 🚀 Flujo de Funcionamiento

1. **Login** (`index.html`) → `authController.js`
2. **Verificación** → `AuthGuard` middleware automático
3. **Navegación** → `MenuInicio.js` con validación de roles
4. **Páginas protegidas** → Controladores específicos + `globalController.js`
5. **Event Bus** → Comunicación entre todos los componentes
6. **Monitoreo** → Performance y Architecture validators

## ✅ Características Implementadas

### **Phase 1 - Limpieza y Reorganización**
- ✅ Eliminación de archivos duplicados
- ✅ Corrección de rutas de imágenes y navegación
- ✅ Estructura MVC limpia

### **Phase 2 - Correcciones de Controladores**
- ✅ Logging detallado y debugging
- ✅ Manejo robusto de errores
- ✅ Validación de elementos DOM
- ✅ Datos de muestra para desarrollo

### **Phase 3 - Reactivación de Middleware**
- ✅ AuthGuard completamente funcional
- ✅ Sistema de roles y permisos
- ✅ Protección por rutas
- ✅ Integración en todas las páginas

### **Phase 4 - Event Bus Implementation**
- ✅ Patrón Event Bus completo
- ✅ Desacoplamiento total de módulos
- ✅ Event history y monitoring
- ✅ Debug console commands

### **Phase 5 - Testing y Optimización Final**
- ✅ Performance monitoring
- ✅ Architecture validation
- ✅ Debug tools avanzadas
- ✅ Documentación completa

## 🎯 Puntuación de Calidad de Código

El sistema incluye un **Architecture Validator** que evalúa:
- Event Bus integrity
- Performance benchmarks  
- Dependency management
- Naming conventions
- Separation of concerns

**Puntuación target: 85-100%** (calculada automáticamente)

---

## 💡 Uso en Desarrollo

1. **Abrir en localhost** para habilitar herramientas de debug
2. **Usar consola del navegador** para comandos de debug
3. **Monitoring automático** de performance y arquitectura
4. **Validación continua** de integridad MVC

---

*Arquitectura MVC implementada completamente con Event Bus pattern, middleware robusto, y herramientas de debugging avanzadas.*