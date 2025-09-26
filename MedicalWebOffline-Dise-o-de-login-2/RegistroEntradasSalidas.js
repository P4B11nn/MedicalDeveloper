// RegistroEntradasSalidas.js
// Lógica para mostrar el historial de servicios en el modal

document.addEventListener('DOMContentLoaded', () => {
  // Botón de registro de entradas/salidas (quinto botón)
  const btnRegistroES = document.querySelector('.menu button:nth-child(5)');
  const modalRegistroES = document.getElementById('modalRegistroES');
  const cerrarRegistroES = document.getElementById('cerrarRegistroES');
  const registroESLista = document.getElementById('registroESLista');

  if (btnRegistroES && modalRegistroES && cerrarRegistroES && registroESLista) {
    btnRegistroES.addEventListener('click', () => {
      // Obtener historial de servicios
      let historial = [];
      try {
        historial = JSON.parse(localStorage.getItem('servicioHistorial')) || [];
      } catch (e) {}
      // Renderizar lista
      if (historial.length === 0) {
        registroESLista.innerHTML = '<p>No hay registros de entradas/salidas.</p>';
      } else {
        registroESLista.innerHTML = '<ul style="list-style:none; padding:0;">' +
          historial.map((s, i) => `
            <li style="margin-bottom:15px; border-bottom:1px solid #eee; padding-bottom:10px;">
              <b>Nombre:</b> ${s.nombre || ''} <br>
              <b>ID:</b> ${s.id || ''} <br>
              <b>Matrícula:</b> ${s.matricula || ''} <br>
              <b>Número de mesa:</b> ${s.mesa || ''} <br>
              <b>Rol:</b> ${s.rol || ''} <br>
              <b>Entrada:</b> ${s.entrada || ''} <br>
              <b>Salida:</b> ${s.salida || ''} <br>
            </li>
          `).join('') + '</ul>';
      }
      modalRegistroES.style.display = 'flex';
    });
    cerrarRegistroES.addEventListener('click', () => {
      modalRegistroES.style.display = 'none';
    });
  }
});
