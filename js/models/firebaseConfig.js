// Firebase imports - wrapped in try-catch to handle CSP issues
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { initializeFirestore, CACHE_SIZE_UNLIMITED, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-storage.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA-ZU02eVn2FiwkgpjveymB8VRUUeGSH3Y",
    authDomain: "medicalweboffline.firebaseapp.com",
    projectId: "medicalweboffline",
    storageBucket: "medicalweboffline.firebasestorage.app",
    messagingSenderId: "1038201454133",
    appId: "1:1038201454133:web:f6ee7c6215f6b4d4febb7c"
};

// Initialize Firebase services
let app, db, auth, storage;

try {
  // Inicialización de Firebase
  app = initializeApp(firebaseConfig);
  console.log('✅ Firebase app initialized');

  // Nueva inicializacion de Firestore
  db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  });
  console.log('✅ Firestore initialized');

  // Inicialización de Firebase Auth
  auth = getAuth(app);
  console.log('✅ Firebase Auth initialized');

  // Inicialización de Firebase Storage
  storage = getStorage(app);
  console.log('✅ Firebase Storage initialized');

} catch (error) {
  console.error('❌ Error initializing Firebase services:', error);
  
  // Create mock services
  app = { options: firebaseConfig };
  db = { 
    collection: () => ({}),
    doc: () => ({})
  };
  auth = { 
    currentUser: null,
    signInWithEmailAndPassword: () => Promise.reject(new Error('Auth not available')),
    signOut: () => Promise.resolve()
  };
  storage = {
    ref: () => ({})
  };
}

// Exportar las instancias necesarias
export { db, auth, storage };
export default app;