// js/utils/imageUploadComponent.js - Componente para carga de imágenes médicas

/**
 * Componente para manejo de carga de imágenes médicas
 */
export class ImageUploadComponent {
    constructor(containerId, options = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        this.options = {
            allowMultiple: options.allowMultiple || true,
            maxFiles: options.maxFiles || 10,
            acceptedTypes: options.acceptedTypes || ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
            maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
            showPreview: options.showPreview !== false,
            showProgress: options.showProgress !== false,
            tipoImagen: options.tipoImagen || 'historial',
            ...options
        };
        
        this.files = [];
        this.previews = [];
        this.callbacks = {
            onFilesSelected: options.onFilesSelected || (() => {}),
            onUploadStart: options.onUploadStart || (() => {}),
            onUploadProgress: options.onUploadProgress || (() => {}),
            onUploadComplete: options.onUploadComplete || (() => {}),
            onUploadError: options.onUploadError || (() => {}),
            onFileRemoved: options.onFileRemoved || (() => {})
        };
        
        this.init();
    }
    
    init() {
        this.render();
        this.setupEventListeners();
    }
    
    render() {
        const html = `
            <div class="image-upload-component">
                <div class="upload-header">
                    <h4 class="upload-title">
                        <i class="fas fa-camera"></i>
                        ${this.getTitleByType()}
                    </h4>
                    <div class="upload-info">
                        <small class="text-muted">
                            Formatos: JPG, PNG, WebP, GIF • Máximo: ${this.formatFileSize(this.options.maxFileSize)} por archivo
                        </small>
                    </div>
                </div>
                
                <div class="upload-area" id="${this.containerId}-upload-area">
                    <div class="upload-dropzone" id="${this.containerId}-dropzone">
                        <div class="dropzone-content">
                            <i class="fas fa-cloud-upload-alt dropzone-icon"></i>
                            <h5 class="dropzone-title">Arrastra imágenes aquí o haz clic para seleccionar</h5>
                            <p class="dropzone-subtitle">
                                ${this.options.allowMultiple ? `Puedes subir hasta ${this.options.maxFiles} imágenes` : 'Selecciona una imagen'}
                            </p>
                            <button type="button" class="btn btn-primary btn-select-files">
                                <i class="fas fa-folder-open"></i>
                                Seleccionar ${this.options.allowMultiple ? 'Imágenes' : 'Imagen'}
                            </button>
                        </div>
                    </div>
                    
                    <input type="file" 
                           id="${this.containerId}-file-input" 
                           class="file-input-hidden"
                           accept="${this.options.acceptedTypes.join(',')}"
                           ${this.options.allowMultiple ? 'multiple' : ''}
                           style="display: none;">
                </div>
                
                <div class="metadata-section" id="${this.containerId}-metadata" style="display: none;">
                    <div class="form-group">
                        <label for="${this.containerId}-categoria">Categoría de la imagen:</label>
                        <select id="${this.containerId}-categoria" class="form-control">
                            <option value="general">General</option>
                            <option value="sintomas">Síntomas</option>
                            <option value="lesiones">Lesiones</option>
                            <option value="medicamentos">Medicamentos</option>
                            <option value="rayos_x">Rayos X</option>
                            <option value="laboratorio">Laboratorio</option>
                            <option value="tratamiento">Tratamiento</option>
                            <option value="seguimiento">Seguimiento</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="${this.containerId}-descripcion">Descripción de las imágenes:</label>
                        <textarea id="${this.containerId}-descripcion" 
                                  class="form-control" 
                                  rows="3" 
                                  placeholder="Describe brevemente el contenido de las imágenes (síntomas, procedimientos, etc.)"></textarea>
                    </div>
                </div>
                
                <div class="preview-section" id="${this.containerId}-preview" style="display: none;">
                    <h5 class="preview-title">
                        <i class="fas fa-images"></i>
                        Previsualización
                        <span class="file-count badge badge-info">0 archivos</span>
                    </h5>
                    <div class="preview-grid" id="${this.containerId}-preview-grid"></div>
                </div>
                
                <div class="upload-progress" id="${this.containerId}-progress" style="display: none;">
                    <div class="progress-info">
                        <span class="progress-text">Subiendo imágenes...</span>
                        <span class="progress-percentage">0%</span>
                    </div>
                    <div class="progress">
                        <div class="progress-bar" role="progressbar" style="width: 0%"></div>
                    </div>
                </div>
                
                <div class="upload-actions" id="${this.containerId}-actions" style="display: none;">
                    <button type="button" class="btn btn-success btn-upload-images">
                        <i class="fas fa-upload"></i>
                        Subir Imágenes
                    </button>
                    <button type="button" class="btn btn-secondary btn-clear-all">
                        <i class="fas fa-times"></i>
                        Cancelar
                    </button>
                </div>
            </div>
        `;
        
        this.container.innerHTML = html;
    }
    
    setupEventListeners() {
        const dropzone = document.getElementById(`${this.containerId}-dropzone`);
        const fileInput = document.getElementById(`${this.containerId}-file-input`);
        const selectBtn = this.container.querySelector('.btn-select-files');
        const uploadBtn = this.container.querySelector('.btn-upload-images');
        const clearBtn = this.container.querySelector('.btn-clear-all');
        
        // Eventos de drag & drop
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('dragover');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('dragover');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('dragover');
            this.handleFiles(e.dataTransfer.files);
        });
        
        // Evento de clic en dropzone
        dropzone.addEventListener('click', () => {
            fileInput.click();
        });
        
        // Evento de selección de archivos
        selectBtn.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });
        
        // Botones de acción
        uploadBtn.addEventListener('click', () => {
            this.uploadImages();
        });
        
        clearBtn.addEventListener('click', () => {
            this.clearAll();
        });
    }
    
    handleFiles(fileList) {
        const files = Array.from(fileList);
        
        // Validar archivos
        const validFiles = [];
        const errors = [];
        
        files.forEach(file => {
            try {
                this.validateFile(file);
                
                // Verificar límite de archivos
                if (this.files.length + validFiles.length >= this.options.maxFiles) {
                    errors.push(`Se alcanzó el límite máximo de ${this.options.maxFiles} archivos`);
                    return;
                }
                
                validFiles.push(file);
            } catch (error) {
                errors.push(`${file.name}: ${error.message}`);
            }
        });
        
        // Mostrar errores si los hay
        if (errors.length > 0) {
            this.showErrors(errors);
        }
        
        // Agregar archivos válidos
        if (validFiles.length > 0) {
            this.addFiles(validFiles);
        }
    }
    
    validateFile(file) {
        // Validar tipo
        if (!this.options.acceptedTypes.includes(file.type)) {
            throw new Error('Tipo de archivo no válido');
        }
        
        // Validar tamaño
        if (file.size > this.options.maxFileSize) {
            throw new Error(`Archivo demasiado grande (máximo ${this.formatFileSize(this.options.maxFileSize)})`);
        }
        
        // Validar si ya existe
        if (this.files.some(f => f.name === file.name && f.size === file.size)) {
            throw new Error('Archivo ya seleccionado');
        }
    }
    
    addFiles(files) {
        this.files.push(...files);
        
        // Generar previsualizaciones
        files.forEach(file => {
            this.createPreview(file);
        });
        
        this.updateUI();
        this.callbacks.onFilesSelected(this.files);
    }
    
    createPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const preview = {
                file: file,
                url: e.target.result,
                id: `preview-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            };
            
            this.previews.push(preview);
            this.renderPreview(preview);
        };
        reader.readAsDataURL(file);
    }
    
    renderPreview(preview) {
        const previewGrid = document.getElementById(`${this.containerId}-preview-grid`);
        
        const previewElement = document.createElement('div');
        previewElement.className = 'preview-item';
        previewElement.id = preview.id;
        
        previewElement.innerHTML = `
            <div class="preview-image-container">
                <img src="${preview.url}" alt="${preview.file.name}" class="preview-image">
                <button type="button" class="btn btn-sm btn-danger remove-preview" data-preview-id="${preview.id}">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="preview-info">
                <div class="preview-name" title="${preview.file.name}">${this.truncateText(preview.file.name, 20)}</div>
                <div class="preview-size">${this.formatFileSize(preview.file.size)}</div>
            </div>
        `;
        
        // Agregar evento para eliminar
        const removeBtn = previewElement.querySelector('.remove-preview');
        removeBtn.addEventListener('click', () => {
            this.removeFile(preview.id);
        });
        
        previewGrid.appendChild(previewElement);
    }
    
    removeFile(previewId) {
        // Remover de arrays
        const previewIndex = this.previews.findIndex(p => p.id === previewId);
        if (previewIndex !== -1) {
            const preview = this.previews[previewIndex];
            const fileIndex = this.files.findIndex(f => f === preview.file);
            
            if (fileIndex !== -1) {
                this.files.splice(fileIndex, 1);
            }
            this.previews.splice(previewIndex, 1);
        }
        
        // Remover elemento del DOM
        const previewElement = document.getElementById(previewId);
        if (previewElement) {
            previewElement.remove();
        }
        
        this.updateUI();
        this.callbacks.onFileRemoved(this.files);
    }
    
    updateUI() {
        const hasFiles = this.files.length > 0;
        
        // Mostrar/ocultar secciones
        document.getElementById(`${this.containerId}-metadata`).style.display = hasFiles ? 'block' : 'none';
        document.getElementById(`${this.containerId}-preview`).style.display = hasFiles ? 'block' : 'none';
        document.getElementById(`${this.containerId}-actions`).style.display = hasFiles ? 'block' : 'none';
        
        // Actualizar contador
        const fileCount = this.container.querySelector('.file-count');
        if (fileCount) {
            fileCount.textContent = `${this.files.length} archivo${this.files.length !== 1 ? 's' : ''}`;
        }
        
        // Habilitar/deshabilitar botón de subida
        const uploadBtn = this.container.querySelector('.btn-upload-images');
        if (uploadBtn) {
            uploadBtn.disabled = this.files.length === 0;
        }
    }
    
    async uploadImages() {
        if (this.files.length === 0) return;
        
        try {
            // Obtener metadata
            const categoria = document.getElementById(`${this.containerId}-categoria`).value;
            const descripcion = document.getElementById(`${this.containerId}-descripcion`).value;
            
            const metadata = {
                tipoImagen: this.options.tipoImagen,
                categoria: categoria,
                descripcion: descripcion,
                usuarioId: this.getCurrentUserId(),
                usuarioNombre: this.getCurrentUserName()
            };
            
            // Mostrar progreso
            this.showProgress(true);
            
            // Notificar inicio
            this.callbacks.onUploadStart(this.files, metadata);
            
            // Simular progreso mientras se suben archivos
            this.simulateProgress();
            
            // Devolver archivos y metadata para que el controlador los maneje
            return {
                files: this.files,
                metadata: metadata
            };
            
        } catch (error) {
            console.error('Error preparando subida de imágenes:', error);
            this.showProgress(false);
            throw error;
        }
    }
    
    simulateProgress() {
        let progress = 0;
        const progressBar = this.container.querySelector('.progress-bar');
        const progressText = this.container.querySelector('.progress-percentage');
        
        const interval = setInterval(() => {
            progress += Math.random() * 20;
            if (progress > 90) progress = 90;
            
            progressBar.style.width = `${progress}%`;
            progressText.textContent = `${Math.round(progress)}%`;
            
            if (progress >= 90) {
                clearInterval(interval);
            }
        }, 200);
        
        return interval;
    }
    
    completeProgress() {
        const progressBar = this.container.querySelector('.progress-bar');
        const progressText = this.container.querySelector('.progress-percentage');
        
        progressBar.style.width = '100%';
        progressText.textContent = '100%';
        
        setTimeout(() => {
            this.showProgress(false);
        }, 1000);
    }
    
    showProgress(show) {
        const progressDiv = document.getElementById(`${this.containerId}-progress`);
        const actionsDiv = document.getElementById(`${this.containerId}-actions`);
        
        progressDiv.style.display = show ? 'block' : 'none';
        actionsDiv.style.display = show ? 'none' : (this.files.length > 0 ? 'block' : 'none');
    }
    
    showErrors(errors) {
        const errorHtml = `
            <div class="alert alert-danger alert-dismissible">
                <button type="button" class="close" data-dismiss="alert">&times;</button>
                <strong>Errores en archivos:</strong>
                <ul class="mb-0 mt-2">
                    ${errors.map(error => `<li>${error}</li>`).join('')}
                </ul>
            </div>
        `;
        
        // Insertar errores al inicio del componente
        this.container.insertAdjacentHTML('afterbegin', errorHtml);
        
        // Auto-remover después de 8 segundos
        setTimeout(() => {
            const alertDiv = this.container.querySelector('.alert-danger');
            if (alertDiv) {
                alertDiv.remove();
            }
        }, 8000);
    }
    
    clearAll() {
        this.files = [];
        this.previews = [];
        
        // Limpiar preview grid
        const previewGrid = document.getElementById(`${this.containerId}-preview-grid`);
        previewGrid.innerHTML = '';
        
        // Limpiar input de archivo
        const fileInput = document.getElementById(`${this.containerId}-file-input`);
        fileInput.value = '';
        
        // Limpiar formulario de metadata
        document.getElementById(`${this.containerId}-categoria`).value = 'general';
        document.getElementById(`${this.containerId}-descripcion`).value = '';
        
        this.updateUI();
    }
    
    // Métodos de utilidad
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    
    getTitleByType() {
        const titles = {
            'historial': 'Agregar Fotos al Historial Médico',
            'rayos_x': 'Subir Radiografías',
            'laboratorio': 'Resultados de Laboratorio',
            'general': 'Imágenes Médicas'
        };
        return titles[this.options.tipoImagen] || 'Subir Imágenes';
    }
    
    getCurrentUserId() {
        try {
            const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            return user.uid || user.id || 'unknown';
        } catch {
            return 'unknown';
        }
    }
    
    getCurrentUserName() {
        try {
            const user = JSON.parse(sessionStorage.getItem('currentUser') || '{}');
            return user.nombre || user.name || 'Usuario';
        } catch {
            return 'Usuario';
        }
    }
    
    // Método público para obtener archivos seleccionados
    getSelectedFiles() {
        return this.files;
    }
    
    // Método público para establecer callback de subida completa
    setUploadCompleteCallback(callback) {
        this.callbacks.onUploadComplete = callback;
    }
}

// CSS adicional necesario (agregar al archivo CSS principal)
export const imageUploadCSS = `
.image-upload-component {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    padding: 20px;
    background: #fafafa;
}

.upload-header {
    margin-bottom: 20px;
}

.upload-title {
    color: #333;
    margin-bottom: 5px;
}

.upload-dropzone {
    border: 2px dashed #ccc;
    border-radius: 8px;
    padding: 40px 20px;
    text-align: center;
    background: white;
    transition: all 0.3s ease;
    cursor: pointer;
}

.upload-dropzone:hover,
.upload-dropzone.dragover {
    border-color: #007bff;
    background: #f8f9ff;
}

.dropzone-icon {
    font-size: 3rem;
    color: #007bff;
    margin-bottom: 15px;
}

.dropzone-title {
    color: #333;
    margin-bottom: 10px;
}

.dropzone-subtitle {
    color: #666;
    margin-bottom: 20px;
}

.preview-section {
    margin-top: 20px;
}

.preview-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 15px;
}

.preview-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 15px;
}

.preview-item {
    border: 1px solid #ddd;
    border-radius: 6px;
    overflow: hidden;
    background: white;
}

.preview-image-container {
    position: relative;
    width: 100%;
    height: 100px;
}

.preview-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.remove-preview {
    position: absolute;
    top: 5px;
    right: 5px;
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-info {
    padding: 8px;
    font-size: 0.8rem;
}

.preview-name {
    font-weight: bold;
    margin-bottom: 2px;
}

.preview-size {
    color: #666;
}

.upload-progress {
    margin-top: 20px;
    padding: 15px;
    background: white;
    border-radius: 6px;
}

.progress-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
}

.upload-actions {
    margin-top: 20px;
    display: flex;
    gap: 10px;
}

.metadata-section {
    margin-top: 20px;
    padding: 15px;
    background: white;
    border-radius: 6px;
}

.file-input-hidden {
    display: none !important;
}

@media (max-width: 768px) {
    .preview-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
        gap: 10px;
    }
    
    .upload-actions {
        flex-direction: column;
    }
}
`;
