"use client";

/* ══════════════════════════════════════════════════════════════════════
   La SOURCE des écrans client — « exemple » ou « base réelle » (05/10/2026)

   Les tables du socle Omega sont vides aujourd'hui : demandes_validation,
   filed_documents, points_du_jour n'ont pas une ligne de client. Les trois
   écrans de /espace sont donc construits sur des JEUX D'EXEMPLE locaux
   (components/espace/exemples/*), marqués comme tels à l'écran, et un
   interrupteur bascule sur la base réelle (Supabase, RLS, portes RPC) dès
   qu'une personne connectée veut voir SES données.

   Le choix vit dans localStorage (clé `espace.source`) : il survit à la
   navigation entre les trois écrans et au rechargement. Sans session
   ouverte, la base réelle n'a rien à montrer (RLS : mes_clients() est
   vide) — l'interrupteur le dit et reste sur l'exemple.

   Première peinture : TOUJOURS « exemple » côté serveur, pour que le
   rendu serveur et l'hydratation disent la même chose ; le navigateur
   relit la valeur mémorisée par useSyncExternalStore (son instantané
   serveur vaut « exemple »).
   ══════════════════════════════════════════════════════════════════════ */

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore } from "react";
import { Switch } from "@/components/ui/switch";

export type Source = "exemple" | "reelle";

const CLE = "espace.source";

type Contexte = {
  source: Source;
  changer: (s: Source) => void;
  /* une session est ouverte : la base réelle a quelque chose à montrer */
  connecte: boolean;
};

const SourceContexte = createContext<Contexte>({
  source: "exemple",
  changer: () => {},
  connecte: false,
});

/* Un petit magasin autour de localStorage, lu par useSyncExternalStore :
   le rendu serveur dit « exemple », le navigateur relit la valeur mémorisée
   dès l'hydratation, sans effet ni second rendu forcé. */
const ecouteurs = new Set<() => void>();
function lire(): Source {
  try {
    return window.localStorage.getItem(CLE) === "reelle" ? "reelle" : "exemple";
  } catch {
    return "exemple";
  }
}
function ecrire(s: Source) {
  try {
    window.localStorage.setItem(CLE, s);
  } catch {
    /* sans mémoire, le choix vaut pour la page */
  }
  ecouteurs.forEach((f) => f());
}
function abonner(f: () => void) {
  ecouteurs.add(f);
  window.addEventListener("storage", f);
  return () => {
    ecouteurs.delete(f);
    window.removeEventListener("storage", f);
  };
}

export function SourceFournisseur({
  connecte,
  children,
}: {
  connecte: boolean;
  children: React.ReactNode;
}) {
  const memo = useSyncExternalStore(abonner, lire, () => "exemple" as Source);
  const source: Source = memo === "reelle" && connecte ? "reelle" : "exemple";

  const changer = useCallback(
    (s: Source) => {
      ecrire(s === "reelle" && !connecte ? "exemple" : s);
    },
    [connecte],
  );

  const valeur = useMemo(() => ({ source, changer, connecte }), [source, changer, connecte]);
  return <SourceContexte.Provider value={valeur}>{children}</SourceContexte.Provider>;
}

export function useSource() {
  return useContext(SourceContexte);
}

/* L'interrupteur lui-même, posé dans la barre de l'espace. */
export function BasculeSource() {
  const { source, changer, connecte } = useSource();
  return (
    <div className="esp-bascule" data-source={source}>
      <Switch
        checked={source === "reelle"}
        disabled={!connecte}
        onCheckedChange={(v) => changer(v ? "reelle" : "exemple")}
        className="esp-bascule-switch"
      >
        <span className="esp-bascule-texte">
          {source === "reelle" ? "Base réelle" : "Données d'exemple"}
        </span>
      </Switch>
      {!connecte ? (
        <span className="esp-bascule-note">Connectez-vous depuis le cockpit pour voir vos données.</span>
      ) : null}
    </div>
  );
}
