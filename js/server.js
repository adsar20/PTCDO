// FIREBASE

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";

import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";

import {
    getFirestore,
    doc,
    setDoc,
    serverTimestamp,
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc
}
    from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

import {
    getAuth,
    signInAnonymously
}
    from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";

// =========================
// FIREBASE CONFIG
// =========================

const firebaseConfig = {

    apiKey: "AIzaSyA_5yrfn2aZpgj7IonuELDhUN9b_dpYRDE",

    authDomain: "ptcdo-enrollment.firebaseapp.com",

    projectId: "ptcdo-enrollment",

    storageBucket: "ptcdo-enrollment.firebasestorage.app",

    messagingSenderId: "516336813813",

    appId: "1:516336813813:web:d049e02d81bd0a62ad67bc",

    measurementId: "G-E02YC9SGTS"
};

// =========================
// INITIALIZE FIREBASE
// =========================

const app = initializeApp(firebaseConfig);

const analytics = getAnalytics(app);

const db = getFirestore(app);

const auth = getAuth(app);

console.log("Firebase Initialized");

// =========================
// AUTH
// =========================

let firebaseReady = false;

console.log("Starting Firebase authentication...");

signInAnonymously(auth)
    .then(() => {
        firebaseReady = true;
        console.log("✅ Anonymous Auth Success - firebaseReady set to true");
        document.dispatchEvent(new Event("firebaseReady"));
    })
    .catch((error) => {
        console.error("❌ Firebase auth error:", error.code, error.message);
        document.dispatchEvent(new Event("firebaseError"));
    });

// Expose status getter for reactive checking
export const getFirebaseReady = () => firebaseReady;
export { firebaseReady, db, doc, setDoc, serverTimestamp, collection, getDocs, getDoc, addDoc, updateDoc, deleteDoc, getAuth, signInAnonymously };