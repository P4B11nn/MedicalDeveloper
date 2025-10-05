📋 **URGENTE: Configurar Reglas de Firestore**

El error "Missing or insufficient permissions" indica que necesitas configurar las reglas de seguridad de Firestore.

## 🔧 **Pasos para solucionar:**

### 1. Ve a Firebase Console
- Accede a: https://console.firebase.google.com
- Selecciona tu proyecto "medicalweboffline"

### 2. Configurar Reglas de Firestore
- Ve a **Firestore Database > Rules**
- Reemplaza las reglas actuales con estas reglas temporales para desarrollo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Permitir lectura y escritura para usuarios autenticados
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Publicar las reglas
- Haz clic en **"Publish"**
- Confirma los cambios

### 4. Configurar Authentication
- Ve a **Authentication > Sign-in method**
- Asegúrate de que **Email/Password** esté habilitado

## ⚠️ **IMPORTANTE:**
Estas reglas son para desarrollo. En producción debes usar reglas más específicas:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios pueden leer/escribir sus propios datos
    match /usuarios/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Solo admins pueden crear usuarios
    match /usuarios/{userId} {
      allow create: if request.auth != null && 
        get(/databases/$(database)/documents/usuarios/$(request.auth.uid)).data.rol == 'admin';
    }
    
    // Actividades solo lectura para autenticados
    match /actividades/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Otras colecciones para usuarios autenticados
    match /{collection}/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## 🚀 **Una vez configurado:**
1. Recarga la página de la aplicación
2. Los errores de permisos desaparecerán
3. El sistema funcionará correctamente

¿Ya configuraste las reglas? ¡Confirma cuando esté listo!