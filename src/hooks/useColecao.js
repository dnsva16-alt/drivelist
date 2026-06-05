import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../services/firebase";

export function useColecao(nomeColecao, empresaId = null) {
  const [dados, setDados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    // Aguarda empresaId ser resolvido (undefined = ainda carregando contexto)
    if (empresaId === undefined) return;

    const caminho = empresaId
      ? `empresas/${empresaId}/${nomeColecao}`
      : nomeColecao;

    setCarregando(true);
    const q = query(collection(db, caminho), orderBy("criadoEm", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setDados(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setCarregando(false);
    });
    return () => unsub();
  }, [nomeColecao, empresaId]);

  const caminho = empresaId
    ? `empresas/${empresaId}/${nomeColecao}`
    : nomeColecao;

  async function adicionar(item) {
    await addDoc(collection(db, caminho), { ...item, criadoEm: serverTimestamp() });
  }

  async function remover(id) {
    await deleteDoc(doc(db, caminho, id));
  }

  async function atualizar(id, campos) {
    await updateDoc(doc(db, caminho, id), campos);
  }

  return { dados, carregando, adicionar, remover, atualizar };
}
