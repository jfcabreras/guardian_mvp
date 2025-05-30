// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAyceS6BSAAAWv1zBubp6vwxSwL4HlvKVY",
  authDomain: "guardian-mvp-f5b6e.firebaseapp.com",
  projectId: "guardian-mvp-f5b6e",
  storageBucket: "guardian-mvp-f5b6e.firebasestorage.app",
  messagingSenderId: "782109131483",
  appId: "1:782109131483:web:71791e0a7384c88d0d42fe"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

const storage = getStorage(app);

export { auth, db, storage };