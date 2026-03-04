import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyA3mvePjByjARKvWEmsrAxvu88RtXa7TTY",
    authDomain: "jansetu-625d1.firebaseapp.com",
    projectId: "jansetu-625d1",
    storageBucket: "jansetu-625d1.firebasestorage.app",
    messagingSenderId: "245230145487",
    appId: "1:245230145487:web:bf7ce8c2799d89a7f20cba",
    measurementId: "G-XCF0MGLE0K"
};

// Initialize Firebase only if it hasn't been initialized yet
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export default app;
