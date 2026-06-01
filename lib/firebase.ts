import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDLMMEyJ1c7RKRoI9wLETHIKVH_v9uRY3g",
  authDomain: "score-web-27396.firebaseapp.com",
  projectId: "score-web-27396",
  storageBucket: "score-web-27396.firebasestorage.app",
  messagingSenderId: "1063981728257",
  appId: "1:1063981728257:web:b4740561b0b74a03627600",
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
