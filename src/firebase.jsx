// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {getFirestore} from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyB3c8ogxGPCfAwsFoh0_ghM84tVC_8MxnM",
  authDomain: "expensetrackerapp-8bcbf.firebaseapp.com",
  projectId: "expensetrackerapp-8bcbf",
  storageBucket: "expensetrackerapp-8bcbf.firebasestorage.app",
  messagingSenderId: "115803315917",
  appId: "1:115803315917:web:d2ce1dc6133f792e5f1384"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database=getFirestore(app);
 const auth = getAuth(app);
export{database,auth};