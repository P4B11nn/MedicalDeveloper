// Datos fijos para login
// Usuarios fijos para pruebas
const usuariosFijos = [
  { id: 'admin', nombre: 'Administrador', apellidos: '', matricula: 'admin', contrasena: 'admin123', rol: 'admin' },
  { id: 'pract', nombre: 'Practicante', apellidos: '', matricula: 'pract', contrasena: 'pract123', rol: 'practicante' }
  
];

// Al cargar, asegurar que existan los usuarios fijos en localStorage
let usuariosRegistrados = [];
try {
  usuariosRegistrados = JSON.parse(localStorage.getItem('usuarios')) || [];
} catch (e) {}
let actualizados = false;
usuariosFijos.forEach(fijo => {
  // Si no existe por id ni por matrícula, agregar
  if (!usuariosRegistrados.some(u => u.id === fijo.id || u.matricula === fijo.matricula)) {
    usuariosRegistrados.push(fijo);
    actualizados = true;
  }
});
if (actualizados) {
  localStorage.setItem('usuarios', JSON.stringify(usuariosRegistrados));
}

const loginForm = document.getElementById('loginForm');
const matriculaInput = document.getElementById('matriculaInput');
const matriculaLabel = document.getElementById('matriculaLabel');

matriculaInput.addEventListener('input', function() {
  if (matriculaInput.value.trim().toLowerCase() === 'admin') {
    matriculaLabel.textContent = 'ID:';
    matriculaInput.placeholder = 'ID';
  } else {
    matriculaLabel.textContent = 'Matrícula:';
    matriculaInput.placeholder = 'Matrícula';
  }
});

loginForm.addEventListener('submit', function(e) {
  e.preventDefault();
  const matriculaOId = this.matricula.value.trim();
  const contrasena = this.contrasena.value.trim();
  let usuariosRegistrados = [];
  try {
    usuariosRegistrados = JSON.parse(localStorage.getItem('usuarios')) || [];
  } catch (e) {}
  // Buscar usuario válido: admin por id, practicante por matrícula
  const usuarioValido = usuariosRegistrados.find(u => {
    if (u.rol === 'admin') {
      return (u.id === matriculaOId || u.matricula === matriculaOId) && (u.contrasena === contrasena);
    } else if (u.rol === 'practicante') {
      return (u.matricula === matriculaOId) && (u.contrasena === contrasena);
    }
    return false;
  });
  if (usuarioValido) {
    localStorage.setItem('usuarioActual', JSON.stringify({
      nombre: usuarioValido.nombre || '',
      apellidos: usuarioValido.apellidos || '',
      rol: usuarioValido.rol || '',
      id: usuarioValido.id || '',
      matricula: usuarioValido.matricula || ''
    }));
    if (usuarioValido.rol === 'admin') {
      window.location.href = 'menuInicio.html';
    } else if (usuarioValido.rol === 'practicante') {
      window.location.href = 'menuInicio.html?practicante=true';
    }
  } else {
    alert('ID o contraseña incorrecta');
  }
});