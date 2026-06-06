import { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../services/firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(undefined); // undefined = ainda carregando
  const [perfil, setPerfil] = useState(undefined);   // undefined = carregando, null = não existe
  const unsubPerfilRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubPerfilRef.current) unsubPerfilRef.current();

      setUsuario(user ?? null);

      if (user) {
        setPerfil(undefined); // sinaliza que está carregando o perfil
        unsubPerfilRef.current = onSnapshot(doc(db, "usuarios", user.uid), (snap) => {
          setPerfil(snap.exists() ? snap.data() : null);
        });
      } else {
        setPerfil(null);
      }
    });

    return () => {
      unsubAuth();
      if (unsubPerfilRef.current) unsubPerfilRef.current();
    };
  }, []);

  async function sair() {
    await signOut(auth);
  }

  const carregando = usuario === undefined;

  return (
    <AuthContext.Provider value={{ usuario, perfil, carregando, sair }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
