"use client";

/* Les toasts : un message bref, en bas à droite, qui s'en va seul après
   quatre secondes. Empilés comme sur la référence : les plus anciens
   reculent et rétrécissent derrière le dernier ; au survol, la pile se
   déplie. Annoncés aux lecteurs d'écran (aria-live polite). */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

type Teinte = "neutre" | "vert" | "rouge";
type Toast = { id: number; texte: string; teinte: Teinte; sortie?: boolean };

const Contexte = createContext<(texte: string, teinte?: Teinte) => void>(() => {});

export function useToast() {
  return useContext(Contexte);
}

const DUREE = 4000;
const VISIBLES = 3;

export function FournisseurToasts({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const suivant = useRef(1);
  const enPause = useRef(false);

  const retirer = useCallback((id: number) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, sortie: true } : x)));
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 200);
  }, []);

  const minuter = useCallback(
    (id: number) => {
      const essayer = () => {
        if (enPause.current) window.setTimeout(essayer, 1000);
        else retirer(id);
      };
      window.setTimeout(essayer, DUREE);
    },
    [retirer],
  );

  const pousser = useCallback(
    (texte: string, teinte: Teinte = "neutre") => {
      const id = suivant.current++;
      setToasts((t) => [...t, { id, texte, teinte }].slice(-VISIBLES - 1));
      minuter(id);
    },
    [minuter],
  );

  const valeur = useMemo(() => pousser, [pousser]);
  const visibles = toasts.slice(-VISIBLES);

  return (
    <Contexte.Provider value={valeur}>
      {children}
      <section aria-label="Notifications" aria-live="polite" className="v2-jetons">
        <ol
          className="v2-toasts"
          onMouseEnter={() => (enPause.current = true)}
          onMouseLeave={() => (enPause.current = false)}
          style={{ height: visibles.length ? 52 : 0 }}
        >
          {visibles.map((t, i) => {
            const Icone = t.teinte === "vert" ? CheckCircle2 : t.teinte === "rouge" ? XCircle : Info;
            return (
              <li
                key={t.id}
                className="v2-toast"
                data-teinte={t.teinte}
                data-sortie={t.sortie ? "" : undefined}
                style={{ "--rang": visibles.length - 1 - i, zIndex: i } as React.CSSProperties}
              >
                <Icone width={16} height={16} aria-hidden="true" />
                <span>{t.texte}</span>
              </li>
            );
          })}
        </ol>
      </section>
    </Contexte.Provider>
  );
}
