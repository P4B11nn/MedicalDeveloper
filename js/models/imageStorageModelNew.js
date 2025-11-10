// js/models/imageStorageModelNew.js - Nuevo servicio de imágenes usando IndexedDB + WebP
// Reemplaza imageStorageModel.js con sistema sin dependencia de Firebase Storage

import { imageStorage } from './imageStorageAlternative.js';

/**
 * Nuevo servicio para manejo de imágenes médicas
 * Utiliza IndexedDB + WebP en lugar de Firebase Storage
 */
export const imageStorageModel = {
    
    /**
     * Subir foto de perfil de paciente
     * @param {File} file - Archivo de imagen
     * @param {string} pacienteId - ID del paciente  
     * @param {Object} metadata - Metadata adicional
     * @returns {Promise<Object>} Resultado de la subida
     */
    async subirFotoPerfil(file, pacienteId, metadata) {
        try {
            if (!file) {
                throw new Error('No se proporcionó archivo de imagen');
            }
            
            // Usar el nuevo sistema de almacenamiento
            const resultado = await imageStorage.uploadImage(pacienteId, file, {
                tipo: 'perfil',
                descripcion: metadata.descripcion || 'Foto de perfil',
                categoria: 'paciente'
            });
            
            if (!resultado || !resultado.id) {
                throw new Error('Error en el proceso de subida de imagen');
            }
            
            // Actualizar referencia en Firestore
            await this.actualizarReferenciaEnPaciente(pacienteId, resultado.id, 'perfil');
            
            return {
                success: true,
                imageId: resultado.id,
                url: resultado.url,
                metadata: resultado.metadata,
                message: 'Foto de perfil actualizada correctamente'
            };
            
        } catch (error) {
            console.error('Error subiendo foto de perfil:', error);
            throw error;
        }
    },
    
    /**
     * Subir imagen médica (rayos X, laboratorios, etc.)
     * @param {File} file - Archivo de imagen
     * @param {string} pacienteId - ID del paciente
     * @param {string} tipoImagen - Tipo de imagen
     * @param {Object} metadata - Metadata adicional
     * @returns {Promise<Object>} Información de la imagen subida
     */
    async subirImagenMedica(file, pacienteId, tipoImagen = 'historial', metadata = {}) {
        try {
            console.log(`📸 Subiendo imagen médica para paciente ${pacienteId}...`);
            
            // Validar archivo
            this.validarArchivo(file);
            
            // Usar el nuevo sistema de almacenamiento
            const resultado = await imageStorage.uploadImage(pacienteId, file, {
                tipo: tipoImagen,
                descripcion: metadata.descripcion || `Imagen ${tipoImagen}`,
                categoria: metadata.categoria || 'medica',
                fechaEstudio: metadata.fechaEstudio,
                observaciones: metadata.observaciones
            });
            
            console.log(`✅ Imagen médica subida: ${resultado.id}`);
            
            return {
                success: true,
                imageId: resultado.id,
                url: resultado.url,
                downloadURL: resultado.url, // Compatibilidad con código anterior
                metadata: {
                    ...resultado.metadata,
                    fullPath: `local_storage/${resultado.id}`,
                    name: file.name,
                    timeCreated: new Date().toISOString(),
                    size: resultado.metadata.compressedSize
                }
            };
            
        } catch (error) {
            console.error('❌ Error subiendo imagen médica:', error);
            throw error;
        }
    },
    
    /**
     * Obtener todas las imágenes de un paciente
     * @param {string} pacienteId - ID del paciente
     * @returns {Promise<Array>} Lista de imágenes
     */
    async obtenerImagenesPaciente(pacienteId) {
        try {
            console.log(`📋 Obteniendo imágenes del paciente ${pacienteId}...`);
            
            const imagenes = await imageStorage.getPatientImages(pacienteId);
            
            console.log(`✅ ${imagenes.length} imágenes encontradas`);
            
            return imagenes.map(img => ({
                id: img.id,
                url: img.url,
                downloadURL: img.url, // Compatibilidad
                tipo: img.tipo,
                filename: img.filename,
                fechaSubida: img.fechaSubida,
                descripcion: img.descripcion,
                size: img.size
            }));
            
        } catch (error) {
            console.error('❌ Error obteniendo imágenes del paciente:', error);
            return [];
        }
    },

    /**
     * Obtener una imagen específica por su ID
     * @param {string} imageId - ID de la imagen
     * @returns {Promise<Object|null>} Datos de la imagen o null si no existe
     */
    async obtenerImagenPorId(imageId) {
        try {
            console.log(`🔍 Obteniendo imagen por ID: ${imageId}...`);
            
            const imagen = await imageStorage.getImageById(imageId);
            
            if (imagen) {
                console.log(`✅ Imagen encontrada: ${imageId}`);
                return {
                    id: imagen.id,
                    url: imagen.url,
                    downloadURL: imagen.url, // Compatibilidad
                    tipo: imagen.tipo,
                    filename: imagen.filename,
                    fechaSubida: imagen.fechaSubida,
                    descripcion: imagen.descripcion,
                    size: imagen.size
                };
            } else {
                console.log(`⚠️ Imagen no encontrada: ${imageId}`);
                return null;
            }
            
        } catch (error) {
            console.error('❌ Error obteniendo imagen por ID:', error);
            return null;
        }
    },
    
    /**
     * Eliminar imagen
     * @param {string} imageId - ID de la imagen
     * @returns {Promise<boolean>} Resultado de la eliminación
     */
    async eliminarImagen(imageId) {
        try {
            console.log(`🗑️ Eliminando imagen ${imageId}...`);
            
            const resultado = await imageStorage.deleteImage(imageId);
            
            console.log(`✅ Imagen eliminada: ${imageId}`);
            return resultado;
            
        } catch (error) {
            console.error('❌ Error eliminando imagen:', error);
            throw error;
        }
    },

    /**
     * Subir múltiples imágenes médicas
     */
    async subirMultiplesImagenes(files, pacienteId, tipoImagen = 'historial', metadata = {}) {
        try {
            console.log(`📸 Subiendo ${files.length} imágenes para paciente ${pacienteId}...`);
            
            const resultados = [];
            const errores = [];
            
            // Subir imágenes en paralelo con límite de concurrencia
            const BATCH_SIZE = 3;
            const filesArray = Array.from(files);
            
            for (let i = 0; i < filesArray.length; i += BATCH_SIZE) {
                const batch = filesArray.slice(i, i + BATCH_SIZE);
                
                const batchPromises = batch.map(async (file, index) => {
                    try {
                        const resultado = await this.subirImagenMedica(file, pacienteId, tipoImagen, {
                            ...metadata,
                            orden: i + index + 1
                        });
                        return { success: true, resultado };
                    } catch (error) {
                        return { 
                            success: false, 
                            error: error.message, 
                            fileName: file.name 
                        };
                    }
                });
                
                const batchResults = await Promise.all(batchPromises);
                
                batchResults.forEach(result => {
                    if (result.success) {
                        resultados.push(result.resultado);
                    } else {
                        errores.push(result);
                    }
                });
            }
            
            console.log(`✅ ${resultados.length} imágenes subidas exitosamente`);
            if (errores.length > 0) {
                console.warn(`⚠️ ${errores.length} imágenes tuvieron errores:`, errores);
            }
            
            return {
                exitosas: resultados,
                errores: errores,
                totalExitosas: resultados.length,
                totalErrores: errores.length,
                message: `${resultados.length} de ${files.length} imágenes subidas correctamente`
            };
            
        } catch (error) {
            console.error('❌ Error subiendo múltiples imágenes:', error);
            throw error;
        }
    },
    
    /**
     * Validar archivo de imagen
     * @param {File} file - Archivo a validar
     */
    validarArchivo(file) {
        if (!file) {
            throw new Error('No se proporcionó ningún archivo');
        }
        
        // Verificar que sea una imagen
        if (!file.type.startsWith('image/')) {
            throw new Error('El archivo debe ser una imagen');
        }
        
        // Verificar tamaño (5MB máximo)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error(`El archivo es muy grande. Tamaño máximo: ${maxSize / 1024 / 1024}MB`);
        }
        
        // Verificar tipos permitidos
        const tiposPermitidos = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!tiposPermitidos.includes(file.type)) {
            throw new Error('Tipo de imagen no soportado. Use JPG, PNG, GIF o WebP');
        }
    },
    
    /**
     * Actualizar referencia de imagen en documento del paciente
     * @param {string} pacienteId - ID del paciente
     * @param {string} imageId - ID de la imagen
     * @param {string} tipo - Tipo de imagen
     */
    async actualizarReferenciaEnPaciente(pacienteId, imageId, tipo) {
        try {
            const { db } = await import('./firebaseConfig.js');
            const { doc, updateDoc } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js');
            
            const updates = {};
            
            if (tipo === 'perfil') {
                updates.fotoPerfilId = imageId;
                // Limpiar base64 anterior si existe
                updates.fotoPerfil = null;
            }
            
            await updateDoc(doc(db, 'pacientes', pacienteId), updates);
            
        } catch (error) {
            console.error('Error actualizando referencia en Firestore:', error);
            throw error;
        }
    },
    
    /**
     * Obtener estadísticas de almacenamiento
     * @returns {Promise<Object>} Estadísticas de uso
     */
    async obtenerEstadisticas() {
        try {
            const stats = await imageStorage.getStorageStats();
            
            return {
                totalImages: stats.totalImages,
                totalSizeFormatted: this.formatFileSize(stats.totalSize),
                originalSizeFormatted: this.formatFileSize(stats.originalTotalSize),
                compressionSavings: this.formatFileSize(stats.compressionSavings),
                compressionPercent: stats.compressionPercent,
                byType: stats.byType,
                storageType: 'IndexedDB + WebP',
                quota: 'Limitado por espacio en disco disponible'
            };
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return null;
        }
    },
    
    /**
     * Formatear tamaño de archivo
     * @param {number} bytes - Tamaño en bytes
     * @returns {string} Tamaño formateado
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    /**
     * Verificar compatibilidad del navegador
     * @returns {Object} Estado de compatibilidad
     */
    verificarCompatibilidad() {
        const compat = {
            indexedDB: !!window.indexedDB,
            webp: true, // Asumimos soporte WebP moderno
            canvas: !!document.createElement('canvas').getContext,
            fileAPI: !!(window.File && window.FileReader && window.FileList && window.Blob),
            overall: true
        };
        
        compat.overall = compat.indexedDB && compat.canvas && compat.fileAPI;
        
        if (!compat.overall) {
            console.warn('⚠️ Navegador con compatibilidad limitada para el nuevo sistema de imágenes');
        }
        
        return compat;
    }
};

// Verificar compatibilidad al cargar
const compatibilidad = imageStorageModel.verificarCompatibilidad();
console.log('🔧 Nuevo sistema de imágenes cargado:', compatibilidad.overall ? '✅ Compatible' : '❌ Incompatible');

// Funciones de utilidad para debugging
window.imageDebug = {
    stats: () => imageStorageModel.obtenerEstadisticas(),
    compatibility: () => imageStorageModel.verificarCompatibilidad(),
    patientImages: (id) => imageStorageModel.obtenerImagenesPaciente(id)
};

// Exponer imageStorageModel globalmente para compatibilidad
window.imageStorageModel = imageStorageModel;

export default imageStorageModel;