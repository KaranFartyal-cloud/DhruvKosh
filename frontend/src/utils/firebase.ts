import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAUgUxrZq8IIR2FHFv-ShoXT67BOwvIOkY",
  authDomain: "dhruvkosh.firebaseapp.com",
  projectId: "dhruvkosh",
  storageBucket: "dhruvkosh.firebasestorage.app",
  messagingSenderId: "169073271522",
  appId: "1:169073271522:web:8ae423003f3c3770c634bb",
  measurementId: "G-0SF1SQJVDR"
};

// Singleton Logic
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const database = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;

