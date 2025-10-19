// js/models/storageModel.js

// --- Gestión de Usuarios y Actividades ---
const USERS_KEY = 'usuarios';
const CURRENT_USER_KEY = 'usuarioActual';
const ACTIVITY_LOG_KEY = 'registroActividad';

// Datos iniciales para asegurar que siempre haya usuarios de prueba
// NOTA: Estos usuarios tienen IDs temporales y deberían ser reemplazados por usuarios con IDs dinámicos
const usuariosFijos = [
  { id: 'U12345678', nombre: 'Administrador', apellidos: 'Sistema', matricula: 'admin', contrasena: 'admin123', rol: 'admin', estado: 'activo' },
  { id: 'U87654321', nombre: 'Practicante', apellidos: 'Principal', matricula: 'pract', contrasena: 'pract123', rol: 'practicante', estado: 'activo', grupoId: 'grupo-1', activo: true }
];

// Inicializar usuarios si no existen
if (!localStorage.getItem(USERS_KEY)) {
  localStorage.setItem(USERS_KEY, JSON.stringify(usuariosFijos));
}

// Inicializar registro de actividad si no existe
if (!localStorage.getItem(ACTIVITY_LOG_KEY)) {
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify([]));
}

export const authModel = {
  // Helper: ordenar por nombre + apellidos (locale 'es', case-insensitive)
  _sortUsersByName: (arr) => {
    return (arr || []).slice().sort((a, b) => {
      const nameA = ((a.nombre || '') + ' ' + (a.apellidos || '')).trim().toLowerCase();
      const nameB = ((b.nombre || '') + ' ' + (b.apellidos || '')).trim().toLowerCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  },

  getUsers: () => authModel._sortUsersByName(JSON.parse(localStorage.getItem(USERS_KEY)) || []),
  
  getAllUsers: () => authModel._sortUsersByName(JSON.parse(localStorage.getItem(USERS_KEY)) || []),
  
  // Generar ID único automático para usuarios
  generateUserId: () => {
    const usuarios = authModel.getUsers();
    let newId;
    let attempts = 0;
    const maxAttempts = 100;
    
    do {
      // Generar número aleatorio de 8 dígitos
      const randomNumber = Math.floor(10000000 + Math.random() * 90000000);
      newId = `U${randomNumber}`;
      attempts++;
      
      if (attempts >= maxAttempts) {
        // Fallback: usar timestamp + random para asegurar unicidad
        newId = `U${Date.now()}${Math.floor(Math.random() * 1000)}`;
        break;
      }
    } while (usuarios.some(u => u.id === newId));
    
    return newId;
  },
  
  // Función para limpiar usuarios con IDs incorretos (no dinámicos)
  cleanupIncorrectUserIds: () => {
    const usuarios = authModel.getUsers();
    const usuariosValidos = usuarios.filter(u => {
      // Mantener solo usuarios con IDs en formato "U" seguido de números
      return /^U\d+$/.test(u.id);
    });
    
    const usuariosEliminados = usuarios.length - usuariosValidos.length;
    
    if (usuariosEliminados > 0) {
      localStorage.setItem(USERS_KEY, JSON.stringify(usuariosValidos));
      console.log(`🧹 Limpieza completada: ${usuariosEliminados} usuarios con IDs incorretos eliminados`);
      
      // Registrar la limpieza
      authModel.registrarActividad({
        accion: 'cleanup',
        descripcion: `Limpieza automática: ${usuariosEliminados} usuarios con IDs incorretos eliminados`
      });
      
      return usuariosEliminados;
    }
    
    console.log('✅ No se encontraron usuarios con IDs incorretos');
    return 0;
  },
  
  validateUser: (matriculaOId, contrasena) => {
    const usuarios = authModel.getUsers();
    return usuarios.find(u => 
      ((u.rol === 'admin' && (u.id === matriculaOId || u.matricula === matriculaOId)) || 
       (u.rol === 'practicante' && u.matricula === matriculaOId)) && 
      u.contrasena === contrasena
    );
  },

  setCurrentUser: (usuario) => {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(usuario));
  },

  getCurrentUser: () => JSON.parse(localStorage.getItem(CURRENT_USER_KEY)),

  logout: () => {
    // Registrar salida antes de eliminar el usuario actual
    const usuario = authModel.getCurrentUser();
    if (usuario) {
      authModel.registrarActividad({
        accion: 'logout',
        descripcion: 'Cierre de sesión'
      });
    }
    localStorage.removeItem(CURRENT_USER_KEY);
  },
  
  // Funciones para el registro de actividad
  registrarActividad: (datos = {}) => {
    const usuarioActual = authModel.getCurrentUser() || { id: 'sistema', nombre: 'Sistema' };
    
    const registro = {
      fecha: new Date().toISOString(),
      usuario: datos.usuario || usuarioActual.nombre,
      usuarioId: datos.usuarioId || usuarioActual.id,
      accion: datos.accion || 'acción',
      descripcion: datos.descripcion || 'Sin detalles',
      ip: datos.ip || '127.0.0.1'
    };
    
    const registros = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY)) || [];
    registros.push(registro);
    localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(registros));
    
    return registro;
  },
  
  // Método antiguo para compatibilidad
  obtenerRegistros: (filtro = {}) => {
    return authModel.getActividades(filtro);
  },
  
  // Nuevo método para obtener actividades
  getActividades: (filtro = {}) => {
    const registros = JSON.parse(localStorage.getItem(ACTIVITY_LOG_KEY)) || [];
    
    // Si no hay filtros, devolver todos los registros
    if (!filtro || Object.keys(filtro).length === 0) {
      return registros;
    }
    
    // Aplicar filtros
    return registros.filter(reg => {
      let coincide = true;
      
      if (filtro.fechaInicio) {
        const desde = new Date(filtro.fechaInicio);
        const fechaReg = new Date(reg.fecha);
        if (fechaReg < desde) {
          coincide = false;
        }
      }
      
      if (filtro.fechaFin) {
        const hasta = new Date(filtro.fechaFin);
        hasta.setHours(23, 59, 59); // Para incluir todo el día final
        const fechaReg = new Date(reg.fecha);
        if (fechaReg > hasta) {
          coincide = false;
        }
      }
      
      if (filtro.usuario && reg.usuario !== filtro.usuario) {
        coincide = false;
      }
      
      if (filtro.accion && !reg.accion.toLowerCase().includes(filtro.accion.toLowerCase())) {
        coincide = false;
      }
      
      return coincide;
    });
  },

  addUser: (newUser) => {
    const usuarios = authModel.getUsers();
    
    // Generar ID automático si no existe
    if (!newUser.id) {
      newUser.id = authModel.generateUserId();
    }
    
    // Verificar que la matrícula no exista (el ID ya es único por generación)
    if (usuarios.some(u => u.matricula === newUser.matricula)) {
      alert('Error: La matrícula ya existe.');
      return false;
    }
    
    // Asegurar que tenga el campo estado
    if (!newUser.estado) {
      newUser.estado = 'activo';
    }
    
    usuarios.push(newUser);
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    
    // Registrar actividad
    authModel.registrarActividad({
      accion: 'create',
      descripcion: `Creación de usuario: ${newUser.nombre} (${newUser.id})`
    });
    
    return true;
  },

  deleteUser: (userIndex) => {
    let usuarios = authModel.getUsers();
    const userToDelete = usuarios[userIndex];
    const currentUser = authModel.getCurrentUser();
    
    if (userToDelete.id === currentUser.id) {
      alert('No puedes eliminar tu propia cuenta de administrador.');
      return false;
    }
    
    usuarios.splice(userIndex, 1);
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    
    // Registrar actividad
    authModel.registrarActividad({
      accion: 'delete',
      descripcion: `Eliminación de usuario: ${userToDelete.nombre} (${userToDelete.id})`
    });
    
    return true;
  },

  updateUser: (userIndex, updatedUser) => {
    let usuarios = authModel.getUsers();
    const userToUpdate = usuarios[userIndex];
    const currentUser = authModel.getCurrentUser();
    
    // Verificar si está intentando modificar su propia matrícula o ID siendo administrador
    if (userToUpdate.id === currentUser.id && 
        (userToUpdate.matricula !== updatedUser.matricula || userToUpdate.id !== updatedUser.id)) {
        alert('No puedes modificar tu propia matrícula o ID como administrador.');
        return false;
    }
    
    // Verificar que la nueva matrícula o ID no existan ya (excepto el usuario actual)
    const duplicado = usuarios.find((u, i) => 
        i !== parseInt(userIndex) && 
        (u.matricula === updatedUser.matricula || u.id === updatedUser.id)
    );
    
    if (duplicado) {
        alert('Error: La matrícula o el ID ya existen en otro usuario.');
        return false;
    }
    
    // Actualizar el usuario
    const usuarioAnterior = {...usuarios[userIndex]};
    usuarios[userIndex] = {
        ...userToUpdate,
        ...updatedUser
    };
    
    localStorage.setItem(USERS_KEY, JSON.stringify(usuarios));
    
    // Si se modificó el usuario actual, actualizar la sesión
    if (userToUpdate.id === currentUser.id) {
        authModel.setCurrentUser(usuarios[userIndex]);
    }
    
    // Registrar actividad
    authModel.registrarActividad({
      accion: 'update',
      descripcion: `Actualización de usuario: ${updatedUser.nombre} (${updatedUser.id})`
    });
    
    return true;
  },

  getUserByIndex: (userIndex) => {
    const usuarios = authModel.getUsers();
    return usuarios[userIndex] || null;
  }
};