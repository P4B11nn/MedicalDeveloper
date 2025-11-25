// js/views/mapView.js - Vista mejorada para el mapa de módulos con Leaflet

import { modulosModel } from '../models/modulosModel.js';

// Variables globales
let map;
let markersLayer;
let mapStats = {
    totalModulos: 0,
    modulosActivos: 0,
    modulosInactivos: 0,
    modulosMantenimiento: 0
};

// Configuración de estados de módulos
const estadosModulos = {
    activo: {
        color: '#10b981',
        label: 'Activo',
        icon: 'fas fa-check-circle'
    },
    inactivo: {
        color: '#f97316',
        label: 'Inactivo',
        icon: 'fas fa-times-circle'
    },
    mantenimiento: {
        color: '#eab308',
        label: 'En Mantenimiento',
        icon: 'fas fa-tools'
    }
};

// Función para crear iconos personalizados con borde de estado
function createModuleIconWithStatus(estado = 'activo') {
    // Normalizar el estado a minúsculas y mapear estados especiales
    let estadoNormalizado = estado.toLowerCase().trim();
    if (estadoNormalizado === 'en mantenimiento') {
        estadoNormalizado = 'mantenimiento';
    }
    
    const estadoConfig = estadosModulos[estadoNormalizado] || estadosModulos.activo;
    
    return L.divIcon({
        className: 'custom-marker',
        html: `
            <div style="
                position: relative;
                width: 36px;
                height: 36px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <!-- Borde de estado -->
                <div style="
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    border: 4px solid ${estadoConfig.color};
                    background: rgba(${hexToRgb(estadoConfig.color)}, 0.2);
                    box-shadow: 0 0 10px rgba(${hexToRgb(estadoConfig.color)}, 0.4);
                "></div>
                
                <!-- Icono principal del módulo -->
                <div style="
                    background: #ef4444;
                    width: 26px;
                    height: 26px;
                    border-radius: 50%;
                    border: 2px solid white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 12px;
                    z-index: 2;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                ">
                    <i class="fas fa-hospital-user"></i>
                </div>
                
                <!-- Indicador pequeño de estado -->
                <div style="
                    position: absolute;
                    bottom: -2px;
                    right: -2px;
                    width: 12px;
                    height: 12px;
                    background: ${estadoConfig.color};
                    border: 2px solid white;
                    border-radius: 50%;
                    z-index: 3;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.3);
                ">
                    <i class="${estadoConfig.icon}" style="
                        font-size: 6px;
                        color: white;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        width: 100%;
                        height: 100%;
                    "></i>
                </div>
            </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
    });
}

// Función auxiliar para convertir hex a RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `${r}, ${g}, ${b}`;
    }
    return '0, 0, 0';
}

// Función para crear popup personalizado
function createCustomPopup(modulo) {
    const estado = modulo.estado || 'activo';
    
    // Normalizar el estado igual que en createModuleIconWithStatus
    let estadoNormalizado = estado.toLowerCase().trim();
    if (estadoNormalizado === 'en mantenimiento') {
        estadoNormalizado = 'mantenimiento';
    }
    
    const estadoConfig = estadosModulos[estadoNormalizado] || estadosModulos.activo;
    
    return `
        <div class="custom-popup">
            <h4><i class="fas fa-hospital"></i> ${modulo.nombre}</h4>
            <p><strong>Lugar:</strong> ${modulo.nombreLugar || 'No especificado'}</p>
            <p><strong>Tipo:</strong> ${modulo.tipo || 'Módulo médico'}</p>
            <p><strong>Estado:</strong> 
                <span style="
                    color: ${estadoConfig.color}; 
                    font-weight: 600;
                    display: inline-flex;
                    align-items: center;
                    gap: 4px;
                ">
                    <i class="${estadoConfig.icon}"></i>
                    ${estadoConfig.label}
                </span>
            </p>
            ${modulo.ultimaActualizacion ? `
                <p><strong>Última actualización:</strong> ${new Date(modulo.ultimaActualizacion).toLocaleDateString('es-MX')}</p>
            ` : ''}
            <div class="popup-coords">
                <i class="fas fa-map-pin"></i> 
                ${modulo.ubicacion.latitude.toFixed(6)}, ${modulo.ubicacion.longitude.toFixed(6)}
            </div>
        </div>
    `;
}

// Función para inicializar el mapa
function initializeMap() {
    // Mostrar loader
    const loader = document.getElementById('mapLoader');
    if (loader) loader.style.display = 'flex';

    // Inicializar el mapa centrado en la universidad
    map = L.map('map', {
        center: [22.27546821201615, -97.86079278482266],
        zoom: 16,
        zoomControl: false, // Desactivamos los controles por defecto
        scrollWheelZoom: true,
        doubleClickZoom: true,
        touchZoom: true
    });

    // Agregar capa de mapa con mejor estilo
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        tileSize: 256,
        zoomOffset: 0,
    }).addTo(map);

    // Crear capa para los marcadores
    markersLayer = L.layerGroup().addTo(map);

    // Configurar eventos del mapa
    setupMapEvents();

    // Configurar controles personalizados
    setupCustomControls();

    // Ocultar loader después de un momento
    setTimeout(() => {
        if (loader) loader.style.display = 'none';
    }, 1000);
}

// Función para configurar eventos del mapa
function setupMapEvents() {
    map.on('load', () => {
        console.log('🗺️ Mapa cargado correctamente');
    });

    map.on('click', (e) => {
        console.log(`🎯 Clic en: ${e.latlng.lat}, ${e.latlng.lng}`);
    });

    map.on('zoomend', () => {
        console.log(`🔍 Zoom actual: ${map.getZoom()}`);
    });
}

// Función para configurar controles personalizados
function setupCustomControls() {
    // Botón zoom in
    document.getElementById('zoomInBtn')?.addEventListener('click', () => {
        map.zoomIn();
    });

    // Botón zoom out
    document.getElementById('zoomOutBtn')?.addEventListener('click', () => {
        map.zoomOut();
    });

    // Botón centrar mapa
    document.getElementById('centerMapBtn')?.addEventListener('click', () => {
        map.setView([22.27546821201615, -97.86079278482266], 16);
    });

    // Botón pantalla completa
    document.getElementById('fullscreenBtn')?.addEventListener('click', () => {
        const mapContainer = document.querySelector('.map-container');
        if (mapContainer) {
            if (!document.fullscreenElement) {
                mapContainer.requestFullscreen().then(() => {
                    setTimeout(() => map.invalidateSize(), 100);
                });
            } else {
                document.exitFullscreen().then(() => {
                    setTimeout(() => map.invalidateSize(), 100);
                });
            }
        }
    });
}

// Función para actualizar estadísticas
function updateMapStats() {
    document.getElementById('totalModulos').textContent = mapStats.totalModulos;
    document.getElementById('modulosActivos').textContent = mapStats.modulosActivos;
    document.getElementById('modulosInactivos').textContent = mapStats.modulosInactivos;
    document.getElementById('modulosMantenimiento').textContent = mapStats.modulosMantenimiento;
}

// Función para cargar módulos y agregar marcadores
async function loadModulosOnMap() {
    try {
        console.log('🏥 Cargando módulos en el mapa...');
        
        // Limpiar marcadores existentes
        markersLayer.clearLayers();
        
        // Resetear estadísticas
        mapStats = { 
            totalModulos: 0, 
            modulosActivos: 0, 
            modulosInactivos: 0, 
            modulosMantenimiento: 0 
        };

        const modulos = await modulosModel.getAllModulos();
        
        if (!modulos || modulos.length === 0) {
            console.warn('⚠️ No se encontraron módulos para mostrar');
            // Agregar marcadores de ejemplo si no hay datos
            addSampleMarkers();
            return;
        }

        modulos.forEach(modulo => {
            const { latitude, longitude } = modulo.ubicacion;
            const estado = modulo.estado || 'activo'; // Por defecto activo
            
            // Normalizar el estado para estadísticas (igual que en createModuleIconWithStatus)
            let estadoNormalizado = estado.toLowerCase().trim();
            if (estadoNormalizado === 'en mantenimiento') {
                estadoNormalizado = 'mantenimiento';
            }
            
            // Actualizar estadísticas con estado normalizado
            mapStats.totalModulos++;
            switch(estadoNormalizado) {
                case 'activo':
                    mapStats.modulosActivos++;
                    break;
                case 'inactivo':
                    mapStats.modulosInactivos++;
                    break;
                case 'mantenimiento':
                    mapStats.modulosMantenimiento++;
                    break;
                default:
                    mapStats.modulosActivos++; // Por defecto consideramos activo
            }
            
            // Crear marcador con icono personalizado y borde de estado
            const marker = L.marker([latitude, longitude], {
                icon: createModuleIconWithStatus(estado)
            });
            
            // Configurar popup
            marker.bindPopup(createCustomPopup(modulo));
            
            // Agregar a la capa de marcadores
            markersLayer.addLayer(marker);
        });

        console.log(`✅ Se cargaron ${modulos.length} módulos en el mapa`);
        
    } catch (error) {
        console.error('❌ Error cargando módulos:', error);
        // Mostrar marcadores de ejemplo en caso de error
        addSampleMarkers();
    } finally {
        // Actualizar estadísticas en la UI
        updateMapStats();
    }
}

// Función para agregar marcadores de ejemplo
function addSampleMarkers() {
    console.log('📍 Agregando marcadores de ejemplo...');
    
    const ejemplos = [
        {
            nombre: "Módulo de Medicina General",
            nombreLugar: "Edificio Principal",
            tipo: "modulo",
            estado: "activo",
            ultimaActualizacion: new Date().toISOString(),
            ubicacion: { latitude: 22.27546821201615, longitude: -97.86079278482266 }
        },
        {
            nombre: "Módulo de Cardiología",
            nombreLugar: "Torre Médica Norte",
            tipo: "modulo",
            estado: "activo",
            ultimaActualizacion: new Date(Date.now() - 86400000).toISOString(), // Ayer
            ubicacion: { latitude: 22.27600000000000, longitude: -97.86100000000000 }
        },
        {
            nombre: "Módulo de Radiología",
            nombreLugar: "Edificio de Diagnóstico",
            tipo: "modulo",
            estado: "mantenimiento",
            ultimaActualizacion: new Date(Date.now() - 172800000).toISOString(), // Hace 2 días
            ubicacion: { latitude: 22.27500000000000, longitude: -97.86050000000000 }
        },
        {
            nombre: "Módulo de Urgencias",
            nombreLugar: "Hospital Universitario",
            tipo: "modulo",
            estado: "inactivo",
            ultimaActualizacion: new Date(Date.now() - 604800000).toISOString(), // Hace una semana
            ubicacion: { latitude: 22.27580000000000, longitude: -97.86120000000000 }
        },
        {
            nombre: "Módulo de Pediatría",
            nombreLugar: "Área Especializada",
            tipo: "modulo",
            estado: "activo",
            ultimaActualizacion: new Date().toISOString(),
            ubicacion: { latitude: 22.27520000000000, longitude: -97.86090000000000 }
        }
    ];

    ejemplos.forEach(modulo => {
        console.log(`🎯 Creando marcador para: ${modulo.nombre} - Estado: "${modulo.estado}"`);
        
        const marker = L.marker([modulo.ubicacion.latitude, modulo.ubicacion.longitude], {
            icon: createModuleIconWithStatus(modulo.estado)
        });
        
        marker.bindPopup(createCustomPopup(modulo));
        markersLayer.addLayer(marker);
        
        // Normalizar el estado para estadísticas (igual que en createModuleIconWithStatus)
        let estadoNormalizado = (modulo.estado || 'activo').toLowerCase().trim();
        if (estadoNormalizado === 'en mantenimiento') {
            estadoNormalizado = 'mantenimiento';
        }
        
        // Actualizar estadísticas con estado normalizado
        mapStats.totalModulos++;
        switch(estadoNormalizado) {
            case 'activo':
                mapStats.modulosActivos++;
                break;
            case 'inactivo':
                mapStats.modulosInactivos++;
                break;
            case 'mantenimiento':
                mapStats.modulosMantenimiento++;
                break;
            default:
                mapStats.modulosActivos++; // Por defecto consideramos activo
        }
        
        console.log(`📊 Estadísticas actualizadas - Total: ${mapStats.totalModulos}, Activos: ${mapStats.modulosActivos}, Inactivos: ${mapStats.modulosInactivos}, Mantenimiento: ${mapStats.modulosMantenimiento}`);
    });
    
    updateMapStats();
}

// Función principal para inicializar todo
function initMapView() {
    console.log('🚀 Inicializando vista del mapa...');
    
    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeMap();
            loadModulosOnMap();
        });
    } else {
        initializeMap();
        loadModulosOnMap();
    }
}

// Inicializar cuando se carga el módulo
initMapView();
