import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCQr5MAvd1kUZpLKu50YSRpjtqkWde0ePU",
  authDomain: "rpg-messager-app.firebaseapp.com",
  projectId: "rpg-messager-app",
  storageBucket: "rpg-messager-app.firebasestorage.app",
  messagingSenderId: "891679370160",
  appId: "1:891679370160:web:ce473b67b34d9a5a678475"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db, collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc };