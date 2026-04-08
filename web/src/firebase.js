import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAFrBHCQ-Rthqz9dn4onsfmuVheDEzlSq8",
  authDomain: "sh-backend-a0f3c.firebaseapp.com",
  databaseURL: "https://sh-backend-a0f3c-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sh-backend-a0f3c",
  storageBucket: "sh-backend-a0f3c.firebasestorage.app",
  messagingSenderId: "639110150410",
  appId: "1:639110150410:web:60197ad90af783406522f3"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
