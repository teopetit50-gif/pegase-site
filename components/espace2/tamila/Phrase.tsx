"use client";

/* TAMILA — « La phrase du cabinet » (B15, L1, L2) : mémorisée pour l'onglet, ou oubliée. Même règle que l'écran
   d'avant (huit caractères au moins, sessionStorage) ; le trousseau partagé se vide à chaque changement. */

import { useState } from "react";
import { Champ, TamFenetre } from "./TamFenetre";
import { useTamila } from "./donnees";

export default function Phrase({ ouverte, fermer }: { ouverte: boolean; fermer: () => void }) {
  const t = useTamila();
  const [p, setP] = useState("");
  const clore = () => {
    setP("");
    fermer();
  };
  return (
    <TamFenetre
      titre="La phrase du cabinet"
      sous="Elle déballe la clé de chaque dossier dans votre navigateur. Elle reste dans cet onglet, n'est jamais envoyée, et le serveur ne peut rien lire sans elle."
      ouverte={ouverte}
      fermer={clore}
      pied={
        <>
          {t.phrase ? (
            <button
              type="button"
              className="tam-bouton"
              onClick={() => {
                t.oublierPhrase();
                clore();
              }}
            >
              Oublier la phrase
            </button>
          ) : null}
          <button
            type="button"
            className="tam-bouton tam-bouton--principal"
            disabled={p.trim().length < 8}
            onClick={() => {
              t.poserPhrase(p.trim());
              clore();
            }}
          >
            Mémoriser pour cet onglet
          </button>
        </>
      }
    >
      <Champ libelle="Phrase (huit caractères au moins)" aide={t.phrase ? "Une phrase est mémorisée pour cet onglet. Vous pouvez la remplacer ou l'oublier." : undefined}>
        <input type="password" autoComplete="off" value={p} onChange={(e) => setP(e.target.value)} />
      </Champ>
    </TamFenetre>
  );
}
