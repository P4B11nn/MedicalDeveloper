// Firebase configuration - offline mode only due to CSP restrictions
console.log('🔧 Firebase Config: Usando modo offline por restricciones CSP');

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA-ZU02eVn2FiwkgpjveymB8VRUUeGSH3Y",
    authDomain: "medicalweboffline.firebaseapp.com",
    projectId: "medicalweboffline",
    storageBucket: "medicalweboffline.firebasestorage.app",
    messagingSenderId: "1038201454133",
    appId: "1:1038201454133:web:f6ee7c6215f6b4d4febb7c"
};

// Initialize Firebase services in offline mode
let app, db, auth, storage;

console.log('⚠️ Firebase no disponible debido a restricciones CSP - usando servicios mock');

// Create mock services for offline mode
console.log('🔧 Creando servicios Firebase mock...');
app = { options: firebaseConfig };
db = { 
  collection: (name) => ({
    doc: (id) => ({
      get: () => Promise.resolve({ exists: false, data: () => ({}) }),
      set: () => Promise.resolve(),
      update: () => Promise.resolve(),
      delete: () => Promise.resolve()
    }),
    add: () => Promise.resolve({ id: 'mock-id' }),
    where: () => ({ get: () => Promise.resolve({ docs: [] }) })
  }),
  doc: (path) => ({
    get: () => Promise.resolve({ exists: false, data: () => ({}) }),
    set: () => Promise.resolve(),
    update: () => Promise.resolve(),
    delete: () => Promise.resolve()
  })
};
auth = { 
  currentUser: null,
  signInWithEmailAndPassword: (email, password) => {
    console.log('⚠️ Intento de login en modo offline:', email);
    return Promise.reject(new Error('Autenticación no disponible en modo offline. Verifique la conexión a internet.'));
  },
  signOut: () => Promise.resolve(),
  onAuthStateChanged: (callback) => {
    callback(null);
    return () => {};
  }
};
storage = {
  ref: (path) => ({
    put: () => Promise.resolve({
      ref: { getDownloadURL: () => Promise.resolve('mock-url') }
    }),
    getDownloadURL: () => Promise.resolve('mock-url')
  })
};
console.log('🔧 Servicios Firebase mock configurados');

// Exportar las instancias necesarias
export { db, auth, storage };
export default app;