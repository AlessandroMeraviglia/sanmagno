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
const firebaseConfig = {
    apiKey: "LA-TUA-API-KEY",
    authDomain: "il-tuo-progetto.firebaseapp.com",
    projectId: "il-tuo-progetto",
    storageBucket: "il-tuo-progetto.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef123456"
};
// ======================================================

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
