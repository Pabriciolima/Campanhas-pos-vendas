import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "campanhasposvendas.firebaseapp.com",
  projectId: "campanhasposvendas",
  storageBucket: "campanhasposvendas.firebasestorage.app",
  messagingSenderId: "441200841775",
  appId: "1:441200841775:web:8aba610f5d48efb06ba2da"
};

const app = initializeApp(firebaseConfig);

export const firestore = getFirestore(app);

console.log("Firebase conectado com sucesso.");