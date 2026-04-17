// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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