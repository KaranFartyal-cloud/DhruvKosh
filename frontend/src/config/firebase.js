// Firebase SDK imports
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAUgUxrZq8IIR2FHFv-ShoXT67BOwvIOkY",
  authDomain: "dhruvkosh.firebaseapp.com",
  projectId: "dhruvkosh",
  storageBucket: "dhruvkosh.firebasestorage.app",
  messagingSenderId: "169073271522",
  appId: "1:169073271522:web:8ae423003f3c3770c634bb",
  measurementId: "G-0SF1SQJVDR"
};

// Initialize Firebase app (singleton)
const app = initializeApp(firebaseConfig);

// Firebase Auth + Google provider
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Analytics — only in browser environments (not SSR / ad-blocked environments)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
});

export { app, auth, googleProvider, analytics };
export default app;
