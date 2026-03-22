import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyByH0vsmLpXJt2Fg4v-u6T16b1SYWLG30E",
  authDomain: "connetx-aeb2a.firebaseapp.com",
  projectId: "connetx-aeb2a",
  storageBucket: "connetx-aeb2a.firebasestorage.app",
  messagingSenderId: "381175091544",
  appId: "1:381175091544:web:7bf71cf116cabe8496552d",
  measurementId: "G-EEZ5F0ETEN"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

