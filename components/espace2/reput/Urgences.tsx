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
import { MessageSquareText, PhoneOff } from "lucide-react";
import { dateHeure } from "@/components/espace/format";
import { useSource } from "@/components/espace/source";
import { mondeExemple } from "@/components/espace/reput/exemples";
import { chargerMonde, monClient } from "@/components/espace/reput/portes";
import type { Demande, Monde } from "@/components/espace/reput/types";
import { Badge, Note, Squelette, Vide } from "../ui";
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

  const stats = lignes
    ? [
        { libelle: "Urgences ouvertes", n: lignes.filter((l) => l.motif?.libelle === "Urgence").length, sous: "passent en tête de liste", teinte: "rouge" as const },
        { libelle: "Délai dépassé", n: lignes.filter((l) => l.depasse).length, sous: "au-delà du délai de leur sujet", teinte: "rouge" as const },
        { libelle: "Réclamations et litiges", n: lignes.filter((l) => l.motif?.libelle === "Réclamation" || l.motif?.libelle === "Client en litige").length, sous: "aucune réponse automatique", teinte: "ambre" as const },
        { libelle: "À traiter vous-même", n: lignes.filter((l) => l.motif?.libelle === "À traiter vous-même" || l.motif?.libelle === "Veut parler à une personne").length, sous: "une personne reprend la main", teinte: "ambre" as const },
      ]
    : null;

  return (
    <div className="v2-page v2-arrivee">
      <h1 className="v2-sr">Urgences et escalade</h1>
      <div className="v2-tete" style={{ marginBottom: 24 }}>
        <div>
          <p>
            Les demandes qui ne passent pas par la file ordinaire : une urgence, une réclamation, un client en litige, quelqu&apos;un qui veut parler à une personne. Chacune porte le délai que vous avez fixé pour son sujet.
          </p>
        </div>
        <div className="v2-actions">
          <Link href="/espace2/reput" className="v2-btn">
            <MessageSquareText width={16} height={16} aria-hidden="true" /> Toutes les demandes
          </Link>
        </div>
      </div>

      {erreur ? (
        <div style={{ marginBottom: 24 }}>
          <Note teinte="rouge" role="alert">
            <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
          </Note>
        </div>
      ) : null}

      <div className="v2-stats" style={{ "--nb": 4 } as React.CSSProperties}>
        {(stats ?? [0, 1, 2, 3].map(() => null)).map((s, i) => (
          <div key={s?.libelle ?? i} className="v2-stat" style={{ cursor: "default" }}>
            <span className="v2-stat-etiquette">
              <span className="v2-point" data-teinte={s && s.n ? s.teinte : "gris"} aria-hidden="true" />
              {s ? s.libelle : <Squelette largeur="60%" hauteur={14} />}
            </span>
            <span className="v2-stat-valeur">{s ? s.n : <Squelette largeur={32} hauteur={28} />}</span>
            <span className="v2-stat-sous">{s ? s.sous : <Squelette largeur="70%" hauteur={14} />}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 24 }}>
        <section className="v2-carte" aria-labelledby="astreinte-titre">
          <div className="v2-carte-tete">
            <h2 className="v2-h2" id="astreinte-titre">
              Hors de vos horaires
            </h2>
            <Badge>Par défaut : jamais hors horaires</Badge>
          </div>
          <div className="v2-carte-corps" style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <PhoneOff width={18} height={18} aria-hidden="true" style={{ flex: "none", marginTop: 2 }} />
            <p style={{ margin: 0 }}>
              Personne n&apos;est réveillé sans l&apos;avoir choisi. Une urgence reçue hors horaires obtient tout de suite une réponse honnête, avec les horaires que vous avez écrits : elle est notée, et vous rappelez en premier. À l&apos;ouverture, elle passe en tête de cette liste. Un conseil d&apos;attente n&apos;est donné que s&apos;il figure dans votre base validée.
            </p>
          </div>
        </section>

        {!lignes ? (
          erreur ? null : (
            <div className="v2-carte" aria-busy="true" style={{ padding: 16, display: "grid", gap: 16 }}>
              {[0, 1, 2].map((i) => (
                <Squelette key={i} hauteur={20} />
              ))}
            </div>
          )
        ) : !lignes.length ? (
          <Vide icone={<MessageSquareText width={20} height={20} />} titre="Rien d'urgent">
            Aucune urgence, réclamation ou demande à reprendre en main pour l&apos;instant.
          </Vide>
        ) : (
          <div className="v2-carte">
            <div className="v2-tableau-cadre">
              <table className="v2-tableau v2-tableau--empile">
                <thead>
                  <tr>
                    <th scope="col">Demande</th>
                    <th scope="col">Motif</th>
                    <th scope="col">Reçue</th>
                    <th scope="col" className="v2-num">
                      Écoulé
                    </th>
                    <th scope="col">Délai</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map(({ d, motif, ecoule, delai, depasse, sujet }) => (
                    <tr key={d.id}>
                      <td data-etiquette="Demande" data-plein="">
                        <Link href={`/espace2/reput?demande=${encodeURIComponent(d.id)}`} style={{ fontWeight: 500 }}>
                          {d.de_nom ?? d.adresse_reponse ?? "Expéditeur inconnu"}
                        </Link>
                        <small>
                          {d.objet ?? sujet}
                          {d.motif ? ` · ${d.motif}` : ""}
                        </small>
                      </td>
                      <td data-etiquette="Motif">{motif ? <Badge teinte={motif.teinte}>{motif.libelle}</Badge> : null}</td>
                      <td data-etiquette="Reçue">{dateHeure(d.recu_le)}</td>
                      <td data-etiquette="Écoulé" className="v2-num">
                        {duree(ecoule)}
                      </td>
                      <td data-etiquette="Délai">
                        {delai === null ? <span className="v2-gris">—</span> : depasse ? <Badge teinte="rouge">Dépassé ({delai} h)</Badge> : <Badge teinte="vert">Dans les {delai} h</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
