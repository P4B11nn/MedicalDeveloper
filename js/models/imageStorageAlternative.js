// js/models/imageStorageAlternative.js - Sistema alternativo de almacenamiento de imágenes sin Firebase Storage
// Utiliza IndexedDB para almacenamiento local + Firestore para metadata y respaldo

class ImageStorageAlternative {
    constructor() {
        this.dbName = 'MedicalWebImages';
        this.dbVersion = 1;
        this.db = null;
        this.maxImageSize = 5 * 1024 * 1024; // 5MB máximo
        this.compressionQuality = 0.8; // 80% calidad WebP
        this.init();
    }

    /**
     * Inicializar IndexedDB
     */
    async init() {
        try {
            this.db = await this.openDatabase();
            console.log('🗄️ IndexedDB inicializado correctamente');
        } catch (error) {
            console.error('❌ Error inicializando IndexedDB:', error);
            throw error;
        }
    }

    /**
     * Abrir conexión a IndexedDB
     */
    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Store para imágenes
                if (!db.objectStoreNames.contains('images')) {
                    const imageStore = db.createObjectStore('images', { keyPath: 'id' });
                    imageStore.createIndex('pacienteId', 'pacienteId', { unique: false });
                    imageStore.createIndex('tipo', 'tipo', { unique: false });
                    imageStore.createIndex('fecha', 'fecha', { unique: false });
                }
                
                // Store para metadata
                if (!db.objectStoreNames.contains('metadata')) {
                    const metaStore = db.createObjectStore('metadata', { keyPath: 'id' });
                    metaStore.createIndex('lastSync', 'lastSync', { unique: false });
                }
                
                console.log('🔧 IndexedDB schema actualizado');
            };
        });
    }

    /**
     * Comprimir imagen a formato WebP
     */
    async compressToWebP(file, quality = this.compressionQuality) {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();

            img.onload = () => {
                // Calcular dimensiones manteniendo aspect ratio
                const maxWidth = 1920;
                const maxHeight = 1080;
                let { width, height } = img;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                canvas.width = width;
                canvas.height = height;
                
                // Dibujar imagen redimensionada
                ctx.drawImage(img, 0, 0, width, height);
                
                // Convertir a WebP
                canvas.toBlob((blob) => {
                    if (blob) {
                        console.log(`📦 Imagen comprimida: ${file.size} → ${blob.size} bytes (${Math.round(100 - (blob.size / file.size) * 100)}% reducción)`);
                        resolve(blob);
                    } else {
                        reject(new Error('Error comprimiendo imagen'));
                    }
                }, 'image/webp', quality);
            };

            img.onerror = () => reject(new Error('Error cargando imagen'));
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Generar ID único para imagen
     */
    generateImageId(pacienteId, tipo) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const random = Math.random().toString(36).substring(2, 8);
        return `${pacienteId}_${tipo}_${timestamp}_${random}`;
    }

    /**
     * Subir imagen al almacenamiento local
     */
    async uploadImage(pacienteId, file, metadata = {}) {
        try {
            console.log(`📤 Procesando imagen para paciente ${pacienteId}...`);
            
            // Validaciones
            if (!file || !pacienteId) {
                throw new Error('Archivo y ID de paciente son requeridos');
            }
            
            if (file.size > this.maxImageSize) {
                throw new Error(`Imagen muy grande. Máximo permitido: ${this.maxImageSize / 1024 / 1024}MB`);
            }

            // Comprimir imagen
            const compressedBlob = await this.compressToWebP(file);
            
            // Generar ID y metadata
            const imageId = this.generateImageId(pacienteId, metadata.tipo || 'general');
            const imageData = {
                id: imageId,
                pacienteId: pacienteId,
                tipo: metadata.tipo || 'perfil',
                filename: file.name,
                originalSize: file.size,
                compressedSize: compressedBlob.size,
                mimeType: 'image/webp',
                fechaSubida: new Date().toISOString(),
                descripcion: metadata.descripcion || '',
                blob: compressedBlob,
                ...metadata
            };

            // Guardar en IndexedDB
            await this.saveToIndexedDB(imageData);
            
            // Guardar metadata en Firestore (sin el blob)
            await this.saveMetadataToFirestore(imageData);
            
            console.log(`✅ Imagen guardada: ${imageId}`);
            
            return {
                id: imageId,
                url: await this.getImageUrl(imageId),
                metadata: {
                    originalSize: file.size,
                    compressedSize: compressedBlob.size,
                    compression: Math.round(100 - (compressedBlob.size / file.size) * 100),
                    tipo: imageData.tipo
                }
            };
            
        } catch (error) {
            console.error('❌ Error subiendo imagen:', error);
            throw error;
        }
    }

    /**
     * Guardar imagen en IndexedDB
     */
    async saveToIndexedDB(imageData) {
        const transaction = this.db.transaction(['images'], 'readwrite');
        const store = transaction.objectStore('images');
        
        return new Promise((resolve, reject) => {
            const request = store.put(imageData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Guardar metadata en Firestore (como respaldo y para búsquedas)
     */
    async saveMetadataToFirestore(imageData) {
        try {
            const { db } = await import('./firebaseConfig.js');
            const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js');
            
            const metadata = {
                id: imageData.id,
                pacienteId: imageData.pacienteId,
                tipo: imageData.tipo,
                filename: imageData.filename,
                originalSize: imageData.originalSize,
                compressedSize: imageData.compressedSize,
                mimeType: imageData.mimeType,
                fechaSubida: imageData.fechaSubida,
                descripcion: imageData.descripcion,
                storedLocally: true,
                syncStatus: 'local'
            };
            
            await setDoc(doc(db, 'imagenes_metadata', imageData.id), metadata);
            console.log('🔄 Metadata sincronizada con Firestore');
            
        } catch (error) {
            console.warn('⚠️ No se pudo sincronizar metadata con Firestore:', error);
            // No es crítico, la imagen sigue disponible localmente
        }
    }

    /**
     * Obtener URL de imagen desde IndexedDB
     */
    async getImageUrl(imageId) {
        try {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            
            return new Promise((resolve, reject) => {
                const request = store.get(imageId);
                
                request.onsuccess = () => {
                    if (request.result && request.result.blob) {
                        const url = URL.createObjectURL(request.result.blob);
                        resolve(url);
                    } else {
                        reject(new Error('Imagen no encontrada'));
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo imagen:', error);
            throw error;
        }
    }

    /**
     * Obtener todas las imágenes de un paciente
     */
    async getPatientImages(pacienteId) {
        try {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const index = store.index('pacienteId');
            
            return new Promise((resolve, reject) => {
                const request = index.getAll(pacienteId);
                
                request.onsuccess = async () => {
                    const images = request.result || [];
                    const imagesWithUrls = [];
                    
                    for (const image of images) {
                        try {
                            const url = URL.createObjectURL(image.blob);
                            imagesWithUrls.push({
                                id: image.id,
                                url: url,
                                tipo: image.tipo,
                                filename: image.filename,
                                fechaSubida: image.fechaSubida,
                                descripcion: image.descripcion,
                                size: image.compressedSize
                            });
                        } catch (urlError) {
                            console.warn('⚠️ Error creando URL para imagen:', image.id);
                        }
                    }
                    
                    resolve(imagesWithUrls);
                };
                
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo imágenes del paciente:', error);
            return [];
        }
    }

    /**
     * Obtener imagen específica por ID
     */
    async getImageById(imageId) {
        try {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            
            return new Promise((resolve, reject) => {
                const request = store.get(imageId);
                
                request.onsuccess = () => {
                    const image = request.result;
                    if (image) {
                        try {
                            const url = URL.createObjectURL(image.blob);
                            resolve({
                                id: image.id,
                                url: url,
                                tipo: image.tipo,
                                filename: image.filename,
                                fechaSubida: image.fechaSubida,
                                descripcion: image.descripcion,
                                size: image.size,
                                blob: image.blob
                            });
                        } catch (error) {
                            console.error('Error creando URL del blob:', error);
                            resolve(null);
                        }
                    } else {
                        resolve(null);
                    }
                };
                
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo imagen por ID:', error);
            return null;
        }
    }

    /**
     * Eliminar imagen
     */
    async deleteImage(imageId) {
        try {
            // Eliminar de IndexedDB
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            
            await new Promise((resolve, reject) => {
                const request = store.delete(imageId);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
            
            // Eliminar metadata de Firestore
            try {
                const { db } = await import('./firebaseConfig.js');
                const { doc, deleteDoc } = await import('https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js');
                await deleteDoc(doc(db, 'imagenes_metadata', imageId));
            } catch (firestoreError) {
                console.warn('⚠️ No se pudo eliminar metadata de Firestore:', firestoreError);
            }
            
            console.log(`🗑️ Imagen eliminada: ${imageId}`);
            return true;
            
        } catch (error) {
            console.error('❌ Error eliminando imagen:', error);
            throw error;
        }
    }

    /**
     * Obtener estadísticas de almacenamiento
     */
    async getStorageStats() {
        try {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            
            return new Promise((resolve, reject) => {
                const request = store.getAll();
                
                request.onsuccess = () => {
                    const images = request.result || [];
                    const stats = {
                        totalImages: images.length,
                        totalSize: images.reduce((sum, img) => sum + (img.compressedSize || 0), 0),
                        originalTotalSize: images.reduce((sum, img) => sum + (img.originalSize || 0), 0),
                        byType: {}
                    };
                    
                    // Agrupar por tipo
                    images.forEach(img => {
                        if (!stats.byType[img.tipo]) {
                            stats.byType[img.tipo] = { count: 0, size: 0 };
                        }
                        stats.byType[img.tipo].count++;
                        stats.byType[img.tipo].size += img.compressedSize || 0;
                    });
                    
                    stats.compressionSavings = stats.originalTotalSize - stats.totalSize;
                    stats.compressionPercent = stats.originalTotalSize > 0 
                        ? Math.round((stats.compressionSavings / stats.originalTotalSize) * 100) 
                        : 0;
                    
                    resolve(stats);
                };
                
                request.onerror = () => reject(request.error);
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo estadísticas:', error);
            return {
                totalImages: 0,
                totalSize: 0,
                originalTotalSize: 0,
                byType: {},
                compressionSavings: 0,
                compressionPercent: 0
            };
        }
    }
}

// Crear instancia global
const imageStorage = new ImageStorageAlternative();

// Exportar para uso en otros módulos
export { imageStorage, ImageStorageAlternative };
