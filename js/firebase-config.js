// ============================================
// Firebase Configuration - Contrada San Magno
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getStorage } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-storage.js';

const firebaseConfig = {
    apiKey: "AIzaSyApYDXiRaLHzO4xIDimeDPfl6T8LE2WgFs",
    authDomain: "sanmagno-36c58.firebaseapp.com",
    projectId: "sanmagno-36c58",
    storageBucket: "sanmagno-36c58.firebasestorage.app",
    messagingSenderId: "163775888614",
    appId: "1:163775888614:web:e2c56d800cc0e8c6b84f27",
    measurementId: "G-N12XFFXC70"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);
