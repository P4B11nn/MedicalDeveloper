# Firebase Indexes Setup - MedicalWebOffline

## Problema Actual
Firebase requiere índices compuestos para consultas que combinan `where` con `orderBy` en campos diferentes.

## Índices Requeridos

### Para la colección `asistencias_usuarios`:

1. **Índice compuesto: (estado, fecha)**
   - Campo 1: `estado` (Ascendente)
   - Campo 2: `fecha` (Ascendente)
   - Usado por: Filtrar asistencias activas ordenadas por fecha

2. **Índice compuesto: (usuarioId, fecha)**
   - Campo 1: `usuarioId` (Ascendente)
   - Campo 2: `fecha` (Descendente)
   - Usado por: Filtrar asistencias de un usuario específico ordenadas por fecha

3. **Índice compuesto: (usuarioId, estado, fecha)**
   - Campo 1: `usuarioId` (Ascendente)
   - Campo 2: `estado` (Ascendente)
   - Campo 3: `fecha` (Descendente)
   - **ESTE ES EL ÍNDICE PRINCIPAL QUE FALTA**
   - Usado por: Filtrar asistencias activas de un usuario específico ordenadas por fecha

## Cómo Crear los Índices

### Paso 1: Acceder a Firebase Console
1. Ve a: https://console.firebase.google.com/
2. Selecciona tu proyecto: `medicalweboffline`
3. Ve a: **Firestore Database** → **Índices**

### Paso 2: Crear el Índice Principal (usuarioId, estado, fecha)

Firebase puede crear automáticamente este índice cuando encuentre la consulta problemática. Si ves un error como:

```
The query requires an index. You can create it here: [ENLACE LARGO]
```

1. **Haz clic en el enlace del error** o crea manualmente:
2. **Colección**: `asistencias_usuarios`
3. **Campos del índice**:
   - Campo 1: `usuarioId` → `Ascendente`
   - Campo 2: `estado` → `Ascendente`
   - Campo 3: `fecha` → `Descendente`
4. Haz clic en **"Crear"**

### Paso 3: Crear Índice Adicional (estado, fecha)
1. Haz clic en **"Crear índice"**
2. **Colección**: `asistencias_usuarios`
3. **Campos del índice**:
   - Campo 1: `estado` → `Ascendente`
   - Campo 2: `fecha` → `Ascendente`
4. Haz clic en **"Crear"**

### Paso 4: Crear Índice (usuarioId, fecha)
1. Haz clic en **"Crear índice"**
2. **Colección**: `asistencias_usuarios`
3. **Campos del índice**:
   - Campo 1: `usuarioId` → `Ascendente`
   - Campo 2: `fecha` → `Descendente`
4. Haz clic en **"Crear"**

## Consultas que se Benefician

```javascript
// Requiere índice (estado, fecha) - ordena ascendente
where('estado', '==', 'activa').orderBy('fecha', 'asc')

// Requiere índice (usuarioId, fecha) - ordena descendente
where('usuarioId', '==', 'user123').orderBy('fecha', 'desc')

// Requiere índice (usuarioId, estado, fecha) - filtra usuario y estado, ordena por fecha
where('usuarioId', '==', 'user123').where('estado', '==', 'activa').orderBy('fecha', 'desc')
```

## Índices Automáticos de Firebase

Firebase crea automáticamente índices cuando encuentra consultas que los requieren. Si ves un error como:

```
The query requires an index. You can create it here: [ENLACE]
```

**IMPORTANTE**: Haz clic en el enlace del error para crear automáticamente el índice correcto. El enlace contiene toda la información necesaria.

## Solución Rápida

1. **Ejecuta la aplicación** y ve al módulo de Operaciones
2. **Espera el error de Firebase** en la consola del navegador (F12)
3. **Busca el error que dice**: "The query requires an index"
4. **Copia el enlace completo** que aparece en el error
5. **Pega el enlace en el navegador** para crear automáticamente el índice
6. **Espera 5-10 minutos** a que se cree el índice
7. **Recarga la página** y prueba nuevamente

## Índices Necesarios (Crear Manualmente si es Necesario)

### Índice Principal: (usuarioId, estado, fecha)
- **Colección**: `asistencias_usuarios`
- **Campos**:
  - `usuarioId` → `Ascendente`
  - `estado` → `Ascendente`
  - `fecha` → `Descendente`
- **Usado por**: `where('usuarioId', '==', userId).where('estado', '==', 'activa').orderBy('fecha', 'desc')`

### Índice Secundario: (estado, fecha)
- **Colección**: `asistencias_usuarios`
- **Campos**:
  - `estado` → `Ascendente`
  - `fecha` → `Ascendente`
- **Usado por**: `where('estado', '==', 'activa').orderBy('fecha', 'asc')`

### Índice Terciario: (usuarioId, fecha)
- **Colección**: `asistencias_usuarios`
- **Campos**:
  - `usuarioId` → `Ascendente`
  - `fecha` → `Descendente`
- **Usado por**: `where('usuarioId', '==', userId).orderBy('fecha', 'desc')`

## Función de Diagnóstico

El código incluye una función `diagnosticarIndicesFirebase()` que puedes usar para verificar el estado de los índices:

```javascript
// En la consola del navegador (F12)
import { diagnosticarIndicesFirebase } from './js/models/operacionesModel.js';
diagnosticarIndicesFirebase().then(resultado => console.log(resultado));
```

Esta función probará automáticamente todas las consultas críticas y te dirá cuáles índices faltan.

## Troubleshooting

Si aún tienes errores:

1. **Usa la función de diagnóstico** para identificar índices faltantes
2. **Revisa la consola** del navegador para nuevos errores
3. **Verifica que los índices estén marcados como "Habilitado"** en Firebase Console
4. **Espera al menos 10 minutos** después de crear un índice
5. **Recarga completamente la página** (Ctrl+F5)

## Resumen de Cambios

### ✅ Correcciones Implementadas

1. **Uso del ID de usuario**: Ahora `usuarioId` se guarda como el ID único del usuario (no la matrícula)
2. **Búsqueda mejorada**: Las funciones buscan primero el usuario completo, luego buscan por su ID
3. **Índices optimizados**: Se crearon índices específicos para cada tipo de consulta
4. **Diagnóstico automático**: Función para verificar el estado de los índices

### 🔧 Índices Críticos

- **(usuarioId, estado, fecha)**: Para verificar asistencias activas de un usuario (consulta principal que fallaba)
- **(estado, fecha)**: Para listar asistencias activas
- **(usuarioId, fecha)**: Para buscar asistencias de un usuario