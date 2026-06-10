import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey:            "AIzaSyCTlhlSK3OANEacPOT8Rx4uRL8zkGazIps",
  authDomain:        "drivelist-efcb5.firebaseapp.com",
  projectId:         "drivelist-efcb5",
  storageBucket:     "drivelist-efcb5.firebasestorage.app",
  messagingSenderId: "937367305928",
  appId:             "1:937367305928:web:305911de704ceb51bdaffd",
  measurementId:     "G-EN6X4NF98T",
};
const app = initializeApp(firebaseConfig);
const appSecundario = initializeApp(firebaseConfig, "secundario");

export const db = getFirestore(app);
export const auth = getAuth(app);
export const authSecundario = getAuth(appSecundario);
export const storage = getStorage(app);
