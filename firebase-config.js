// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {

  apiKey: "AIzaSyC_fHGVKz4BW5nR9HBdc13Bc4vDZtxENMk",

  authDomain: "rewards-tracker-cd101.firebaseapp.com",

  projectId: "rewards-tracker-cd101",

  storageBucket: "rewards-tracker-cd101.firebasestorage.app",

  messagingSenderId: "102186181930",

  appId: "1:102186181930:web:b6b5d1af1b247ada0b6a53",

  measurementId: "G-0ZTQVYXRHE"

};



// Initialize Firebase Core Engines
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// HARDCODED GLOBAL GOAL (Set on backend/config level so it can't be modified by client UI)
export const GLOBAL_STORE_GOAL = 68; // 65% - 70% sweet spot