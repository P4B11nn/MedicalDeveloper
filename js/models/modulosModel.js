// js/models/modulosModel.js - Modelo para manejar módulos con ubicaciones GeoPoint

import { collection,getDocs} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js';
import { db } from './firebaseConfig.js';

const modulosCollection = collection(db, 'modulos');

export const modulosModel = {

    /**
     * Obtiene todos los módulos
     * @returns {Promise<Array>} Lista de módulos
     */
    async getAllModulos() {
        try {
            const querySnapshot = await getDocs(modulosCollection);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error obteniendo módulos:', error);
            throw error;
        }
    }
};
