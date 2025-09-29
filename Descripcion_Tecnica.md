# Medical Developer Web - Documentación Técnica Completa

## 📋 Descripción General
Sistema web offline de gestión médica implementado con **arquitectura MVC estricta**, **Event Bus pattern** y **middleware de autenticación robusto**. Incluye mejoras visuales significativas y optimizaciones en la experiencia de usuario.

## 🚀 Guía de Instalación y Ejecución

### Requisitos Previos
- [Node.js](https://nodejs.org/) (versión 12.0.0 o superior)
- Navegador moderno (Chrome, Firefox, Edge o Safari)

### Pasos para Instalar y Ejecutar
1. **Descargar el código fuente**
   - Descargar el proyecto como ZIP y descomprimirlo
   - O clonar el repositorio si se encuentra en un sistema de control de versiones

2. **Iniciar el servidor**
   - Abrir una terminal en la carpeta raíz del proyecto
   - Ejecutar el comando:
     ```
     node server.js
     ```
   - El servidor se iniciará en http://localhost:3001

3. **Acceder a la aplicación**
   - Abrir tu navegador y navegar a:
     ```
     http://localhost:3001
     ```
   - Ingresar con las credenciales por defecto:
     - **Administrador**: usuario `admin` / contraseña `admin123`
     - **Practicante**: usuario `pract` / contraseña `pract123`

### Solución de Problemas Comunes

| Problema | Solución |
|----------|----------|
| "Puerto en uso" | Modificar la constante `PORT` en `server.js` |
| Archivos no encontrados | Verificar la estructura de archivos y que todos los archivos estén presentes |
| Error de CORS | La aplicación debe ejecutarse desde el servidor, no abrir directamente los HTML |
| Módulos no cargados | Verificar que se esté accediendo a través del servidor y no con archivo local |

### Notas Importantes
- La aplicación utiliza `localStorage` para almacenar datos, por lo que no requiere base de datos externa
- Los datos persisten en el navegador donde se utilizó la aplicación
- Para un entorno de desarrollo completo, pueden utilizarse herramientas como Chrome DevTools para inspeccionar los datos almacenados

## 🏗️ Arquitectura MVC Implementada

### **Modelos (Models)** - `js/models/`
- **`storageModel.js`** - Gestión de usuarios, autenticación y actividades
- **`operacionesModel.js`** - Registro de entradas/salidas y mesas de salud
- **`pacienteModel.js`** - Gestión de datos de pacientes
- **`reporteModel.js`** - Generación de reportes y estadísticas
- **`gestionModel.js`** - Gestión de módulos y grupos

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
- **`gestionView.js`** - Vista de gestión de módulos
- **`menuView.js`** - Vista del menú

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
- **`gestionController.js`** - Control de módulos y grupos
- **`menuController.js`** - Control de navegación del menú

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

### **Sistema de Capas de Interfaz (Z-Index)** - `js/utils/modalUtil.js`
```javascript
// Z-Index en modales para garantizar visualización correcta
modal.style.cssText = `
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(125, 211, 252, 0.8), rgba(254, 243, 199, 0.8));
  z-index: 9999;
  overflow-y: auto;
`;
```

**Jerarquía de Capas:**
- ✅ Modales: z-index 9999 (siempre visibles por encima)
- ✅ Diálogo modal interno: z-index 10000 (contenido del modal)
- ✅ Header de gestión: z-index 999 (para dropdown sin superponerse a modales)
- ✅ Headers normales: z-index 100 (visibles por encima del contenido regular)
- ✅ Contenido regular: z-index 1 o no especificado

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

## 📁 Estructura de Archivos Completa

```
MedicalWebOffline/
├── js/
│   ├── controllers/      # Controladores para la lógica de negocio
│   │   ├── authController.js         # Login y autenticación
│   │   ├── globalController.js       # Lógica común todas las páginas
│   │   ├── gestionController.js      # Control de módulos y grupos
│   │   ├── menuController.js         # Control de navegación del menú
│   │   ├── operacionesController.js  # Control operaciones + Event Bus
│   │   ├── pacienteController.js     # Gestión de pacientes
│   │   ├── reporteController.js      # Generación de reportes
│   │   └── usersController.js        # Administración de usuarios
│   ├── middleware/       # Middleware como authGuard
│   │   └── authGuard.js              # Protección rutas + Event Bus + roles
│   ├── models/           # Modelos para manejar datos
│   │   ├── gestionModel.js           # Gestión de módulos y grupos
│   │   ├── operacionesModel.js       # Entradas/salidas, mesas
│   │   ├── pacienteModel.js          # Datos de pacientes
│   │   ├── reporteModel.js           # Lógica de reportes
│   │   └── storageModel.js           # Users, auth, actividad
│   ├── utils/            # Utilidades y herramientas
│   │   ├── architectureValidator.js  # Validación MVC
│   │   ├── eventBus.js               # Event Bus core
│   │   ├── eventBusManager.js        # Monitoring de eventos
│   │   ├── eventLogger.js            # Registro de eventos
│   │   ├── fixUserModal.js           # Utilidad para modales de usuario
│   │   ├── modalUtil.js              # Utilidades para modales
│   │   ├── performanceMonitor.js     # Monitoreo de rendimiento
│   │   ├── testSuite.js              # Testing automatizado
│   │   ├── testUserFunctionality.js  # Tests para funcionalidad de usuario
│   │   └── userDisplayGlobal.js      # Visualización global de usuarios
│   └── views/            # Vistas para la presentación
│       ├── gestionView.js            # Vista de gestión de módulos
│       ├── MenuInicio.js             # Navegación principal con permisos
│       ├── menuView.js               # Vista del menú
│       ├── operacionesView.js        # Vista de operaciones
│       ├── pacienteView.js           # Vista de pacientes
│       ├── reporteView.js            # Vista de reportes
│       ├── userView.js               # Vista de usuarios
│       └── templates/                # Plantillas HTML
│           ├── ModalPersonal.html    # Modal para personal
│           └── ModalUsuario.html     # Modal para usuarios
├── img/                  # Recursos gráficos
│   ├── logo-medical-developer.jpg    # Logo de Medical Developer
│   ├── medical-background.png        # Fondo médico para la aplicación
│   └── uat-logo-2023.png             # Logo de UAT
├── pages/                # Páginas por categoría
│   ├── categoria-gestion.html        # Gestión de módulos y grupos
│   ├── categoria-operaciones-control.html # Operaciones y control
│   ├── categoria-pacientes.html      # Gestión de pacientes
│   ├── categoria-reportes.html       # Reportes y estadísticas
│   └── categoria-usuarios-personal.html # Gestión de usuarios y personal
├── index.html            # Página de inicio de sesión
├── menuInicio.html       # Menú principal
└── server.js             # Servidor básico para desarrollo
```

## 🚀 Flujo de Funcionamiento

1. **Login** (`index.html`) → `authController.js`
2. **Verificación** → `AuthGuard` middleware automático
3. **Navegación** → `MenuInicio.js` con validación de roles
4. **Páginas protegidas** → Controladores específicos + `globalController.js`
5. **Event Bus** → Comunicación entre todos los componentes
6. **Monitoreo** → Performance y Architecture validators

## ✅ Características Implementadas por Fases

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

## 📱 Sistema de Modales y Mejoras en UI

### **Actualización de Z-Index (Septiembre 2025)**

Se ha implementado una jerarquía clara de capas en la aplicación:

```javascript
// En modalUtil.js - Capa principal del modal
modal.style.cssText = `
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, rgba(125, 211, 252, 0.8), rgba(254, 243, 199, 0.8)), url('img/medical-background.png?v=1') center center / cover no-repeat;
  z-index: 9999;
  overflow-y: auto;
`;

// Diálogo interno del modal
modalDialog.style.cssText = `
  background: white;
  max-width: 800px;
  margin: 40px auto;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  position: relative;
  z-index: 10000;
`;
```

### **Jerarquía de Capas**

La aplicación ahora sigue esta jerarquía estricta de capas:

| Elemento | Z-Index | Descripción |
|----------|---------|-------------|
| Contenido modal | 10000 | Contenido dentro de los modales (mayor prioridad) |
| Modal backdrop | 9999 | Fondo oscurecido y contenedor principal de modales |
| Header gestión | 999 | Header con dropdown (requiere mayor prioridad) |
| Headers estándar | 100 | Headers normales de páginas |
| Contenido normal | 1 o no definido | Contenido regular de la aplicación |

### **Beneficios de la Actualización**

- **Eliminación de superposiciones**: Los modales ahora siempre aparecen por encima del header y cualquier otro elemento de la interfaz.
- **Consistencia visual**: Experiencia uniforme en todas las páginas y componentes.
- **Mejor experiencia de usuario**: Los diálogos de confirmación son más visibles y accesibles.
- **Mayor profundidad visual**: Se ha mejorado la sombra de los modales para dar mayor sensación de profundidad.

## 💡 Uso y Pruebas

### Cómo Usar

#### Iniciar Sesión
- Usuario administrador: admin / admin123
- Usuario practicante: pract / pract123

#### Navegación Principal
1. Inicia sesión en el sistema
2. Selecciona una de las categorías disponibles según tus permisos:
   - Usuarios y Personal (solo admin)
   - Pacientes
   - Operaciones y Control
   - Reportes
   - Gestión de Módulos

#### Registro de Actividad
1. Inicia sesión en el sistema
2. Haz clic en "Registro de Entradas/Salidas" en el menú principal
3. Visualiza el historial de actividad de usuarios
4. Opcionalmente, exporta los datos a CSV

#### Cerrar Sesión
1. Haz clic en el icono de usuario en la esquina superior derecha
2. Selecciona "Cerrar sesión" del menú desplegable
3. Confirma la acción cuando se te solicite

### Pruebas Realizadas

Se han realizado pruebas exhaustivas para asegurar que:
- Los modales aparecen correctamente sobre todos los elementos de la página
- Los headers no se superponen con los modales en ninguna circunstancia
- Los diálogos de confirmación son claramente visibles
- La jerarquía de capas se mantiene consistente en todas las páginas
- Los controladores responden correctamente a los eventos
- El sistema de roles y permisos funciona según lo esperado
- La comunicación a través del Event Bus es fiable y eficiente

## 📈 Cambios Recientes y Próximas Actualizaciones

### Cambios Recientes - Septiembre 2025
- Mejora en el sistema de modales para evitar superposiciones con el encabezado
- Optimización del z-index en toda la aplicación
- Mejora visual en los diálogos de confirmación
- Mayor consistencia en el diseño de interfaces

### Próximas Actualizaciones
- Implementación de gráficos en el módulo de reportes
- Mejoras en la responsividad para dispositivos móviles
- Sistema de notificaciones en tiempo real
- Mejoras de accesibilidad
- Implementación de un sistema de notificaciones tipo toast
- Mejoras adicionales en los efectos visuales de los modales
- Animaciones de transición para mejorar la experiencia de usuario

## 📝 Notas Técnicas Adicionales

- Los datos se almacenan en localStorage del navegador
- Se utiliza JavaScript modular con import/export
- La aplicación debe ejecutarse en un servidor web para funcionar correctamente (debido a los módulos ES6)
- El sistema incluye validación automática de arquitectura en modo desarrollo
- Las herramientas de debug están disponibles solo en localhost
- Se recomienda usar Chrome DevTools para aprovechar al máximo las herramientas de debugging

## 📚 Guía de Mejores Prácticas

Al crear nuevos elementos UI en la aplicación, se recomienda seguir esta guía de z-index:

- **Modales y diálogos**: 9000-10000
- **Notificaciones flotantes**: 8000-8999
- **Headers con dropdowns**: 900-999
- **Headers estándar**: 100-899
- **Navegación fija**: 50-99
- **Contenido elevado**: 10-49
- **Contenido estándar**: 1-9 o no definido

---

*Documentación técnica completa sobre la arquitectura MVC implementada, el sistema de Event Bus, la gestión de UI y todas las herramientas de desarrollo disponibles.*