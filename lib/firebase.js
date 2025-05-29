// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCtBpeCdrCjsEbkq8Cw1imwNqbqzmjqsmM",
  authDomain: "guardian-d0c0b.firebaseapp.com",
  projectId: "guardian-d0c0b",
  storageBucket: "guardian-d0c0b.firebasestorage.app",
  messagingSenderId: "535851634125",
  appId: "1:535851634125:web:4931f970bd937d92f68884"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

const storage = getStorage(app);

export { auth, db, storage };