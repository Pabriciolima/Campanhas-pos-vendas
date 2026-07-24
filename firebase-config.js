import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";

import {
  initializeFirestore
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5o_UhyKxxyZdLvCSCJHoOJKMbuvGygQ8",
  authDomain: "campanhasposvendas.firebaseapp.com",
  projectId: "campanhasposvendas",
  storageBucket: "campanhasposvendas.firebasestorage.app",
  messagingSenderId: "441200841775",
  appId: "1:441200841775:web:8aba610f5d48efb06ba2da"
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

/*
Evita falhas do canal Listen/channel em servidores locais,
Vercel, proxies corporativos e redes que bloqueiam streaming.
*/
export const firestore =
  initializeFirestore(
    app,
    {
      experimentalAutoDetectLongPolling:
        true,
      useFetchStreams:
        false
    }
  );

export { app };

console.info("[FIREBASE] Projeto campanhasposvendas conectado com long polling automático.");