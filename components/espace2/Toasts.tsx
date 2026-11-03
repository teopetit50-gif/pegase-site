"use client";

/* Les toasts : un message bref, en bas à droite, qui s'en va seul après
   quatre secondes. Empilés comme sur la référence : les plus anciens
   reculent et rétrécissent derrière le dernier ; au survol, la pile se
   déplie. Annoncés aux lecteurs d'écran (aria-live polite). */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

type Teinte = "neutre" | "vert" | "rouge";
type Toast = { id: number; texte: string; teinte: Teinte; sortie?: boolean };

const Contexte = createContext<(texte: string, teinte?: Teinte) => void>(() => {});

export function useToast() {
  return useContext(Contexte);
}

/* 03/11/2026 — une copie qui le dit (plusieurs « Copier » remplissaient le
   presse-papier en silence : on croyait le bouton mort) */
export function copierEtDire(texte: string, quoi = "Copié dans le presse-papier.") {
  const p = navigator.clipboard?.writeText(texte) ?? Promise.reject(new Error("presse-papier absent"));
  p.then(
    () => annoncer(quoi, "vert"),
    () => annoncer("Le presse-papier a refusé la copie.", "rouge"),
  );
}

/* 03/11/2026 — pour un geste rendu hors d'un composant (une copie lancée
   depuis une fonction utilitaire) : le fournisseur écoute cet événement */
export function annoncer(texte: string, teinte: Teinte = "neutre") {
  window.dispatchEvent(new CustomEvent("v2-toast", { detail: { texte, teinte } }));
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

  useEffect(() => {
    const ecoute = (e: Event) => {
      const d = (e as CustomEvent<{ texte: string; teinte?: Teinte }>).detail;
      if (d?.texte) pousser(d.texte, d.teinte);
    };
    window.addEventListener("v2-toast", ecoute);
    return () => window.removeEventListener("v2-toast", ecoute);
  }, [pousser]);
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
