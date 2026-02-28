// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, updateDoc, arrayUnion, serverTimestamp } from "firebase/firestore"; // Import Firestore functions

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDTMWZu-MFofavZQVQ4Iu7-GDIKiyBQ0yE",
  authDomain: "expensetracker-bf1ef.firebaseapp.com",
  projectId: "expensetracker-bf1ef",
  storageBucket: "expensetracker-bf1ef.firebasestorage.app",
  messagingSenderId: "368545974345",
  appId: "1:368545974345:web:01975d7b314c31b76d9798",
  measurementId: "G-2VCNB4XTE3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// Initialize Auth
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
setPersistence(auth, browserLocalPersistence);

// Initialize Firestore
const db = getFirestore(app);

// Export the functions and services
export {
  auth,
  provider,
  signInWithPopup,
  signOut,
  db,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp
};