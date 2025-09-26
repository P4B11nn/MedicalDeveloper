// Personal.js
// Lógica para mostrar el modal de personal y los datos de localStorage

document.addEventListener('DOMContentLoaded', () => {
  const btnPersonal = document.querySelector('.menu button:nth-child(3)'); // Tercer botón: Personal
  const modalPersonal = document.getElementById('modalPersonal');
  const cerrarPersonal = document.getElementById('cerrarPersonal');
  const personalLista = document.getElementById('personalLista');

  if (btnPersonal && modalPersonal && cerrarPersonal && personalLista) {
    btnPersonal.addEventListener('click', () => {
      // Obtener usuarios de localStorage
      let usuarios = [];
      try {
        usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
      } catch (e) {}
      // Renderizar lista
      if (usuarios.length === 0) {
        personalLista.innerHTML = '<div style="text-align: center; color: #6b7280; font-size: 1.1rem; padding: 20px;">No hay usuarios registrados en el sistema.</div>';
      } else {
        personalLista.innerHTML = usuarios.map((u, i) => `
          <div class="personal-item">
            <h4>${u.nombre || 'Sin nombre'} ${u.apellidos || ''}</h4>
            <p><strong>ID:</strong> ${u.id || 'No especificado'}</p>
            <p><strong>Matrícula:</strong> ${u.matricula || 'No especificada'}</p>
            <p><strong>Rol:</strong> ${u.rol === 'admin' ? 'Administrador' : 'Practicante'}</p>
            <p><strong>Edad:</strong> ${u.edad || 'No especificada'} años</p>
            <p><strong>Sexo:</strong> ${u.sexo === 'M' ? 'Masculino' : u.sexo === 'F' ? 'Femenino' : 'No especificado'}</p>
            ${u.mesa ? `<p><strong>Mesa de salud:</strong> ${u.mesa}</p>` : ''}
            <div class="personal-buttons">
              <button data-index="${i}" class="modificarUsuario">Modificar</button>
              <button data-index="${i}" class="eliminarUsuario">Eliminar</button>
            </div>
          </div>
        `).join('');
      }
      modalPersonal.style.display = 'flex';
    });
    cerrarPersonal.addEventListener('click', () => {
      modalPersonal.style.display = 'none';
    });
  }
});
