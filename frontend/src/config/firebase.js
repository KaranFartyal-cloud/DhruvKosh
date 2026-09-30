import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAUgUxrZq8IIR2FHFv-ShoXT67BOwvIOkY",
  authDomain: "dhruvkosh.firebaseapp.com",
  projectId: "dhruvkosh",
  storageBucket: "dhruvkosh.firebasestorage.app",
  messagingSenderId: "169073271522",
  appId: "1:169073271522:web:8ae423003f3c3770c634bb",
  measurementId: "G-0SF1SQJVDR"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

export { app, analytics, auth, googleProvider };
