import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCTlhlSK3OANEacPOT8Rx4uRL8zkGazIps",
  authDomain: "drivelist-efcb5.firebaseapp.com",
  projectId: "drivelist-efcb5",
  storageBucket: "drivelist-efcb5.firebasestorage.app",
  messagingSenderId: "937367305928",
  appId: "1:937367305928:web:305911de704ceb51bdaffd",
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);

const ADMIN_UID          = "ofs6tciR5oMsm7I45DAuz9jeYJm1";
const MOTORISTA_UID_CERTO = "MRjH7nVhG9QORmQy3xAY56jjwoZ2";
const MOTORISTA_UID_ERRADO = "MRjH7nVhG9QORmQy3xAY56jj";

async function run() {
  // Remove documento com UID errado
  await deleteDoc(doc(db, "usuarios", MOTORISTA_UID_ERRADO));
  console.log("🗑️  documento UID errado removido");

  // Cria documento com UID correto
  await setDoc(doc(db, "usuarios", MOTORISTA_UID_CERTO), {
    tipo:      "motorista",
    empresaId: ADMIN_UID,
    nome:      "Juliana",
    email:     "dnsva16@gmail.com",
  });
  console.log("✅ usuarios/motorista (UID correto) criado");

  // Garante admin
  await setDoc(doc(db, "usuarios", ADMIN_UID), {
    tipo:        "admin",
    empresaId:   ADMIN_UID,
    nome:        "Diego Nonato",
    nomeEmpresa: "Lacus Express",
    email:       "diego.nonato@lacusexpress.com.br",
  }, { merge: true });
  console.log("✅ usuarios/admin confirmado");

  // Verificação
  const s1 = await getDoc(doc(db, "usuarios", ADMIN_UID));
  console.log("\n📋 admin:", JSON.stringify(s1.data()));

  const s2 = await getDoc(doc(db, "usuarios", MOTORISTA_UID_CERTO));
  console.log("📋 motorista:", JSON.stringify(s2.data()));

  process.exit(0);
}

run().catch((err) => {
  console.error("❌ Erro:", err.code, err.message);
  process.exit(1);
});
