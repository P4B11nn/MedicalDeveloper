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

// Inicialización de Firebase
const app = initializeApp(firebaseConfig);

// Nueva inicializacion de Firestore
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

// Inicialización de Firebase Auth
const auth = getAuth(app);

// Inicialización de Firebase Storage
const storage = getStorage(app);

// Exportar las instancias necesarias
export { db, auth, storage };
export default app;
