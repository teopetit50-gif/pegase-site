"use client";

/* TAVARO — la page d'un contrat (/espace2/tavaro/contrats/<id>) : la fiche
   (./FicheContrat) en pleine carte, comme la page d'un ticket de Linear.
   Le contrat devient « actif » pour les gestes partagés (./donnees). */

import { useEffect } from "react";
import { useTavaro } from "./donnees";
import { TavCarte } from "./TavCadre";
import FicheContrat from "./FicheContrat";
import { BASE } from "./VueEnsemble";

export default function PageContrat({ id }: { id: string }) {
  const { tous, pret, erreur, setActif, source } = useTavaro();
  useEffect(() => {
    setActif(id);
  }, [id, setActif]);
  const dossier = tous.find((d) => d.contrat.id === id || d.contrat.numero === id) ?? null;
  useEffect(() => {
    if (dossier && dossier.contrat.id !== id) setActif(dossier.contrat.id);
  }, [dossier, id, setActif]);
  return (
    <TavCarte className="tav--plein">
      <h1 className="v2-sr">Contrat {dossier?.contrat.numero ?? ""}</h1>
      {dossier ? (
        <FicheContrat key={dossier.contrat.id} dossier={dossier} retour={{ libelle: "Retours à facturer", href: `${BASE}/retours` }} />
      ) : (
        <div className="tav-vide">
          <p>{!pret ? "Lecture du dossier…" : erreur ? `La base réelle n'a pas répondu. ${erreur}` : source === "reelle" ? "Ce contrat n'est pas visible avec ce compte." : "Ce contrat n'existe pas dans l'exemple."}</p>
        </div>
      )}
    </TavCarte>
  );
}
