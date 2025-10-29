// js/views/mapView.js - Vista para el mapa de módulos con Leaflet

import { modulosModel } from '../models/modulosModel.js';

// Inicializar el mapa centrado en la universidad (reemplaza con coordenadas reales de tu universidad)
const map = L.map('map').setView([22.27546821201615, -97.86079278482266], 16); // Ejemplo: Ciudad de México - ajusta latitud, longitud y zoom

// Agregar capa de mapa (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Función para cargar módulos y agregar marcadores
async function loadModulosOnMap() {
    try {
        const modulos = await modulosModel.getAllModulos();
        modulos.forEach(modulo => {
            const { latitude, longitude } = modulo.ubicacion;
            const marker = L.marker([latitude, longitude]).addTo(map);
            marker.bindPopup(`
                <b>Nombre:</b> ${modulo.nombre}<br>
                <b>Lugar:</b> ${modulo.nombreLugar}<br>
                <b>Latitud:</b> ${latitude}<br>
                <b>Longitud:</b> ${longitude}
            `);
        });
    } catch (error) {
        console.error('Error cargando módulos:', error);
        alert('Error al cargar el mapa.');
    }
}

// Cargar al iniciar
loadModulosOnMap();