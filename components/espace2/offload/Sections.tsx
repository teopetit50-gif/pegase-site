"use client";

/* ══════════════════════════════════════════════════════════════════════
   OFFLOAD — les pages de fonction (21/10/2026)

   Jusqu'ici, l'écran OFFLOAD empilait sous la liste des comptes cinq
   cartes : garde-fous, échéances, affaires en plan, groupes clients,
   pilotage. Demande de Teo : une page par groupe de fonctions vendues,
   dans le volet du module. Chaque carte devient sa page, sans changer de
   composant (components/espace/offload) ; choisir un compte ouvre sa
   fiche sur la page « Comptes à risque » (EcranOffload lit ?compte=).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSource } from "@/components/espace/source";
import { Ruban } from "@/components/espace/ui";
import Affaires from "@/components/espace/offload/Affaires";
import Echeances from "@/components/espace/offload/Echeances";
import GardeFous from "@/components/espace/offload/GardeFous";
import Groupes from "@/components/espace/offload/Groupes";
import Pilotage from "@/components/espace/offload/Pilotage";
import { chargerTableau } from "@/components/espace/offload/portes";
import Habille, { HabilleSb } from "../Habille";

function Tete({ titre, sous }: { titre: string; sous: string }) {
  const { source } = useSource();
  return (
    <div className="esp-tete" data-arrivee="">
      <div>
        <h1 className="esp-titre">{titre}</h1>
        <p className="esp-sous">{sous}</p>
      </div>
      <div className="esp-item-haut">
        <Ruban source={source} />
      </div>
    </div>
  );
}

function useOuvrirCompte() {
  const router = useRouter();
  return (id: string) => router.push(`/espace2/offload?compte=${encodeURIComponent(id)}`);
}

export function PageEcheances() {
  const { source } = useSource();
  const ouvrir = useOuvrirCompte();
  return (
    <Habille>
      <Tete titre="Échéances et renouvellements" sous="Les entretiens, révisions, contrôles et contrats qui arrivent à échéance dans les soixante jours. Le client est prévenu la semaine qui précède, après votre validation ; une échéance réglementaire est marquée comme telle." />
      <Echeances source={source} onChoisir={ouvrir} />
    </Habille>
  );
}

export function PageAffaires() {
  const { source } = useSource();
  const ouvrir = useOuvrirCompte();
  return (
    <Habille>
      <Tete titre="Affaires restées en plan" sous="Ce qui dort au magasin : les commandes arrivées que personne n'est venu reprendre, les interventions terminées et non retirées, avec la valeur immobilisée. Le message de retrait ne parle jamais de paiement." />
      <Affaires source={source} onChoisir={ouvrir} />
    </Habille>
  );
}

export function PageGroupes() {
  const { source } = useSource();
  const ouvrir = useOuvrirCompte();
  return (
    <Habille>
      <Tete titre="Groupes clients" sous="Les entités d'un même client regroupées sous leur raison sociale mère, avec le chiffre consolidé sur douze mois. Rien n'est rattaché sans votre geste." />
      <Groupes source={source} onChoisir={ouvrir} />
    </Habille>
  );
}

export function PageGardeFous() {
  const { source } = useSource();
  /* les garde-fous de la base réelle ont besoin du client : offload_tableau le donne */
  const [client, setClient] = useState<string | null>(null);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    chargerTableau()
      .then((t) => {
        if (actif) setClient(t?.client ?? null);
      })
      .catch(() => {});
    return () => {
      actif = false;
    };
  }, [source]);
  return (
    <Habille>
      <Tete titre="Garde-fous" sous="Ce que le système ne fait jamais sans vous : il s'arrête de lui-même au premier doute, applique vos règles écrites en français et retient tout message qui en enfreint une." />
      <GardeFous source={source} client={source === "reelle" ? client : null} />
    </Habille>
  );
}

export function PagePilotage() {
  const { source } = useSource();
  return (
    <HabilleSb>
      <Pilotage source={source} gabarit="sb" />
    </HabilleSb>
  );
}
