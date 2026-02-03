// ============================================
// Firebase Configuration - Contrada San Magno
// ============================================
// ISTRUZIONI:
// 1. Vai su https://console.firebase.google.com
// 2. Crea un nuovo progetto (es. "contrada-san-magno")
// 3. Aggiungi un'app Web al progetto
// 4. Copia la configurazione Firebase qui sotto
// 5. Abilita Firestore Database (modalità test per iniziare)
// 6. Abilita Authentication > Email/Password
// 7. Crea un utente admin in Authentication > Users
// ============================================

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';

// === SOSTITUISCI CON LA TUA CONFIGURAZIONE FIREBASE ===
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyApYDXiRaLHzO4xIDimeDPfl6T8LE2WgFs",
  authDomain: "sanmagno-36c58.firebaseapp.com",
  projectId: "sanmagno-36c58",
  storageBucket: "sanmagno-36c58.firebasestorage.app",
  messagingSenderId: "163775888614",
  appId: "1:163775888614:web:e2c56d800cc0e8c6b84f27",
  measurementId: "G-N12XFFXC70"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
// ======================================================

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
