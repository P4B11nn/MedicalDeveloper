/**
 * Firebase Loader with Error Handling
 * Handles loading Firebase SDKs with graceful fallback to mock services
 */

class FirebaseLoader {
  constructor() {
    this.isLoaded = false;
    this.loadPromise = null;
    this.services = {};
  }

  async loadFirebase() {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._loadFirebaseInternal();
    return this.loadPromise;
  }

  async _loadFirebaseInternal() {
    console.log('🔄 Cargando Firebase SDKs...');

    try {
      // Intentar cargar Firebase App
      const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js");
      
      // Intentar cargar Firebase Auth
      const { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } = 
        await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js");
      
      // Intentar cargar Firebase Firestore
      const { 
        getFirestore, initializeFirestore, CACHE_SIZE_UNLIMITED,
        collection, doc, getDocs, getDoc, addDoc, setDoc, updateDoc, deleteDoc,
        query, where, orderBy, limit, serverTimestamp, Timestamp
      } = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js");
      
      // Intentar cargar Firebase Storage (opcional)
      let getStorage;
      try {
        const storageModule = await import("https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js");
        getStorage = storageModule.getStorage;
      } catch (storageError) {
        console.warn('⚠️ Firebase Storage no disponible:', storageError.message);
        getStorage = () => ({
          ref: () => ({
            put: () => Promise.reject(new Error('Storage not available')),
            getDownloadURL: () => Promise.reject(new Error('Storage not available'))
          })
        });
      }

      // Configuración de Firebase
      const firebaseConfig = {
        apiKey: "AIzaSyA-ZU02eVn2FiwkgpjveymB8VRUUeGSH3Y",
        authDomain: "medicalweboffline.firebaseapp.com",
        projectId: "medicalweboffline",
        storageBucket: "medicalweboffline.firebasestorage.app",
        messagingSenderId: "1038201454133",
        appId: "1:1038201454133:web:f6ee7c6215f6b4d4febb7c"
      };

      // Inicializar Firebase
      const app = initializeApp(firebaseConfig);
      console.log('✅ Firebase App inicializada');

      // Inicializar servicios
      const auth = getAuth(app);
      console.log('✅ Firebase Auth inicializada');

      const db = initializeFirestore(app, {
        cacheSizeBytes: CACHE_SIZE_UNLIMITED
      });
      console.log('✅ Firebase Firestore inicializada');

      const storage = getStorage(app);
      console.log('✅ Firebase Storage inicializada');

      // Almacenar servicios
      this.services = {
        app,
        auth,
        db,
        storage,
        // Funciones de Auth
        signInWithEmailAndPassword,
        signOut,
        onAuthStateChanged,
        // Funciones de Firestore
        collection,
        doc,
        getDocs,
        getDoc,
        addDoc,
        setDoc,
        updateDoc,
        deleteDoc,
        query,
        where,
        orderBy,
        limit,
        serverTimestamp,
        Timestamp
      };

      // Hacer disponible globalmente
      window.firebaseServices = this.services;
      
      this.isLoaded = true;
      console.log('🎉 Firebase completamente cargado y configurado');
      
      return this.services;

    } catch (error) {
      console.error('❌ Error cargando Firebase:', error);
      
      // Crear servicios mock
      this.services = this._createMockServices();
      window.firebaseServices = this.services;
      
      console.log('🔧 Servicios Firebase mock configurados');
      
      // Mostrar notificación al usuario
      this._showOfflineNotification();
      
      return this.services;
    }
  }

  _createMockServices() {
    console.log('🔧 Creando servicios Firebase mock...');
    
    const mockAuth = {
      currentUser: null,
      signInWithEmailAndPassword: async (email, password) => {
        throw new Error('Firebase Auth no disponible - funcionando en modo offline');
      },
      signOut: async () => {
        console.log('Mock: signOut');
        return Promise.resolve();
      }
    };

    const mockDb = {
      collection: () => ({}),
      doc: () => ({})
    };

    const mockStorage = {
      ref: () => ({
        put: () => Promise.reject(new Error('Storage no disponible')),
        getDownloadURL: () => Promise.reject(new Error('Storage no disponible'))
      })
    };

    return {
      app: { options: {} },
      auth: mockAuth,
      db: mockDb,
      storage: mockStorage,
      // Mock functions
      signInWithEmailAndPassword: mockAuth.signInWithEmailAndPassword,
      signOut: mockAuth.signOut,
      onAuthStateChanged: (callback) => {
        console.log('Mock: onAuthStateChanged');
        return () => {}; // unsubscribe function
      },
      collection: mockDb.collection,
      doc: mockDb.doc,
      getDocs: () => Promise.resolve({ docs: [] }),
      getDoc: () => Promise.resolve({ exists: () => false }),
      addDoc: () => Promise.reject(new Error('Firestore no disponible')),
      setDoc: () => Promise.reject(new Error('Firestore no disponible')),
      updateDoc: () => Promise.reject(new Error('Firestore no disponible')),
      deleteDoc: () => Promise.reject(new Error('Firestore no disponible')),
      query: () => ({}),
      where: () => ({}),
      orderBy: () => ({}),
      limit: () => ({}),
      serverTimestamp: () => new Date(),
      Timestamp: { now: () => new Date() }
    };
  }

  _showOfflineNotification() {
    setTimeout(() => {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background: #ff9800; color: white;
        padding: 15px 20px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.3);
        z-index: 10000; max-width: 350px; font-family: Arial, sans-serif; font-size: 14px;
      `;
      notification.innerHTML = `
        <div style="font-weight: bold; margin-bottom: 5px;">🔧 Modo Offline</div>
        <div>La aplicación funcionará con capacidades limitadas. Verifica tu conexión a internet.</div>
      `;
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 6000);
    }, 1000);
  }

  getServices() {
    return this.services;
  }

  isFirebaseLoaded() {
    return this.isLoaded;
  }
}

// Crear instancia global
const firebaseLoader = new FirebaseLoader();

// Hacer disponible globalmente
window.firebaseLoader = firebaseLoader;

export default firebaseLoader;