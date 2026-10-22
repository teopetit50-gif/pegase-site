"use client";

/* ══════════════════════════════════════════════════════════════════════
   REPUT — « Urgences et escalade », page de fonction (21/10/2026)

   La famille « Escalade et astreinte » du catalogue de la page produit
   (lib/produits/capacites/accueil.ts), sur une page : les demandes qui ne
   doivent pas attendre la file ordinaire — une urgence, une réclamation,
   un client en litige, quelqu'un qui demande à parler à une personne, une
   demande que le système n'a pas pu traiter seul. Chacune porte le délai
   que son sujet impose (reput_sujets.delai_heures) et le temps déjà
   écoulé.

   La règle d'astreinte affichée est celle validée par Teo le 19/10/2026
   pour un artisan seul : par défaut, « jamais hors horaires ». Personne
   n'est appelé la nuit ; le client reçoit tout de suite une réponse
   honnête avec les horaires écrits, et l'urgence passe en tête à
   l'ouverture. Rien ici ne prétend qu'un appel part : il ne part pas.

   Données : l'exemple (mondeExemple) ou la base réelle (chargerMonde),
   comme l'écran REPUT. Pour répondre, on ouvre la demande dans l'écran.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { MessageSquareText } from "lucide-react";
import { dateHeure } from "@/components/espace/format";
import { useSource } from "@/components/espace/source";
import { mondeExemple } from "@/components/espace/reput/exemples";
import { chargerMonde, monClient } from "@/components/espace/reput/portes";
import type { Demande, Monde } from "@/components/espace/reput/types";
import { Badge, Note } from "../ui";
import { SbConseiller, type SbProbleme } from "../sb/Conseiller";
import { useMaintenant } from "../horloge";

const HEURE = 3_600_000;
const FERMEES = new Set(["envoyee", "refusee", "ignoree"]);
const SUJETS_ESCALADE = new Set(["urgence", "reclamation", "humain"]);

type Motif = { libelle: string; teinte: "rouge" | "ambre" | "bleu" };

function motifDe(d: Demande): Motif | null {
  if (d.urgence || d.sujet === "urgence") return { libelle: "Urgence", teinte: "rouge" };
  if (d.litige) return { libelle: "Client en litige", teinte: "rouge" };
  if (d.sujet === "reclamation") return { libelle: "Réclamation", teinte: "ambre" };
  if (d.sujet === "humain") return { libelle: "Veut parler à une personne", teinte: "ambre" };
  if (d.statut === "a_traiter" || d.statut === "bloquee") return { libelle: "À traiter vous-même", teinte: "bleu" };
  return null;
}

const duree = (ms: number) => {
  const h = Math.floor(ms / HEURE);
  if (h < 1) return `${Math.max(1, Math.round(ms / 60_000))} min`;
  if (h < 48) return `${h} h`;
  return `${Math.floor(h / 24)} j`;
};

export default function Urgences() {
  const { source } = useSource();
  const [exemple] = useState<Monde>(() => mondeExemple());
  const [reel, setReel] = useState<Monde | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const maintenant = useMaintenant();

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const client = await monClient();
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        const m = await chargerMonde(client);
        if (actif) setReel(m);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  const monde = source === "exemple" ? exemple : reel;

  const lignes = useMemo(() => {
    if (!monde || maintenant === null) return null;
    const delai = (code: string | null) => monde.sujets.find((s) => s.code === code)?.delai_heures ?? null;
    return monde.demandes
      .filter((d) => !FERMEES.has(d.statut) && (d.urgence || d.litige || SUJETS_ESCALADE.has(d.sujet ?? "") || d.statut === "a_traiter" || d.statut === "bloquee"))
      .map((d) => {
        const ecoule = maintenant - new Date(d.recu_le).getTime();
        const h = delai(d.urgence ? "urgence" : d.sujet);
        return { d, motif: motifDe(d), ecoule, delai: h, depasse: h !== null && ecoule > h * HEURE, sujet: monde.sujets.find((s) => s.code === d.sujet)?.libelle ?? "Sans sujet" };
      })
      .sort((a, b) => Number(b.motif?.teinte === "rouge") - Number(a.motif?.teinte === "rouge") || Number(b.depasse) - Number(a.depasse) || b.ecoule - a.ecoule);
  }, [monde, maintenant]);

  /* 22/10 — le gabarit « Advisors » de Supabase (../sb/Conseiller) : les
     urgences en « erreurs », réclamations et litiges en « avertissements »,
     ce qui revient à une personne en « information ». */
  const problemes = useMemo<SbProbleme[] | null>(
    () =>
      lignes?.map(({ d, motif, ecoule, delai, depasse, sujet }) => ({
        cle: d.id,
        gravite: motif?.teinte === "rouge" ? "urgent" : motif?.teinte === "ambre" ? "attention" : "reprendre",
        type: motif?.libelle ?? "Demande",
        element: <span className="sb-mono">{d.de_nom ?? d.adresse_reponse ?? "Expéditeur inconnu"}</span>,
        description: `${d.objet ?? sujet} · reçue il y a ${duree(ecoule)}${delai !== null ? (depasse ? ` · délai de ${delai} h dépassé` : ` · dans les ${delai} h`) : ""}`,
        detail: (
          <>
            <h3>Demande</h3>
            <p className="sb-texte--fort">{d.de_nom ?? d.adresse_reponse ?? "Expéditeur inconnu"}</p>
            <p>
              {d.objet ?? sujet}
              {d.motif ? ` · ${d.motif}` : ""}
            </p>
            <h3>Reçue</h3>
            <p>
              {dateHeure(d.recu_le)} · il y a {duree(ecoule)}
            </p>
            <h3>Délai du sujet</h3>
            <p>{delai === null ? "Aucun délai fixé pour ce sujet." : depasse ? `Dépassé : le sujet demande une réponse sous ${delai} h.` : `Dans le délai : réponse attendue sous ${delai} h.`}</p>
            <Badge teinte={depasse ? "rouge" : "vert"}>{depasse ? "Délai dépassé" : "Dans le délai"}</Badge>
            <Link href={`/espace2/reput?demande=${encodeURIComponent(d.id)}`} className="v2-btn" style={{ width: "fit-content" }}>
              Ouvrir la demande
            </Link>
          </>
        ),
      })) ?? null,
    [lignes],
  );

  return (
    <>
      {erreur ? (
        <div style={{ padding: "16px 24px 0" }}>
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        </div>
      ) : null}
      <SbConseiller
        titre="Urgences et escalade"
        gravites={[
          { cle: "urgent", libelle: "Urgences", teinte: "rouge", unite: ["urgence", "urgences"] },
          { cle: "attention", libelle: "Réclamations", teinte: "ambre", unite: ["réclamation", "réclamations"] },
          { cle: "reprendre", libelle: "À reprendre", teinte: "bleu", unite: ["demande", "demandes"] },
        ]}
        problemes={problemes}
        colonnes={["Motif", "De", "Demande"]}
        vide={(g) =>
          g.cle === "urgent"
            ? { titre: "Aucune urgence", texte: "Aucune urgence ni client en litige n'attend de réponse." }
            : g.cle === "attention"
              ? { titre: "Aucune réclamation", texte: "Aucune réclamation ni demande de parler à une personne." }
              : { titre: "Rien à reprendre", texte: "Le système a traité seul toutes les autres demandes." }
        }
        actions={
          <Link href="/espace2/reput" className="v2-btn">
            <MessageSquareText width={14} height={14} aria-hidden="true" /> Toutes les demandes
          </Link>
        }
        pied={[
          {
            titre: "Hors de vos horaires",
            texte: "Par défaut, jamais hors horaires : personne n'est réveillé sans l'avoir choisi. Le client reçoit tout de suite une réponse honnête avec vos horaires, et son urgence passe en tête à l'ouverture.",
          },
          { titre: "Le délai de chaque sujet", texte: "Chaque sujet porte le délai que vous avez fixé : une heure pour une urgence, quatre pour une réclamation." },
          { titre: "Un client en litige", texte: "Il ne reçoit aucune réponse automatique : la demande revient toujours à une personne." },
        ]}
      />
    </>
  );
}
