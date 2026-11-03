"use client";

/* Réseau › Messages — « Conversations récentes », la vue d'arrivée.

   CONTENU : la vue « Recent conversations » de Zulip, relevée sur
   chat.zulip.org (vue publique) et zulip.com/help/recent-conversations :
   une ligne par conversation (un sujet d'un salon, ou un message privé),
   la plus récente en haut ; colonnes Salon · Conversation · Participants
   (les derniers à avoir écrit, le plus récent à gauche) · Heure ; les
   filtres « Non lues », « Où vous avez écrit » (« Participated ») et
   « Privés compris » (« Include DMs ») ; le champ « Filtrer les sujets ».

   HABILLAGE : la tête de 44 et la barre d'outils de 28 des moteurs
   (onglets en pastilles, lin-onglet), le tableau des listes Linear
   (en-tête de 32, lignes de 48, survol en retrait de 8, rayon 8). */

import { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { SALONS, VOUS, membre } from "./messages-donnees";
import { Avatar, IconeSalon, heureLigne, minutes, nomDe } from "./messages-commun";
import type { Messagerie } from "./messages-etat";

type Filtre = "toutes" | "non-lues" | "ecrites";

export default function Recentes({ etat, aller, retour, nomVous, minuit }: { etat: Messagerie; aller: (href: string) => void; retour: () => void; nomVous: string; minuit: number | null }) {
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [prives, setPrives] = useState(true);
  const [q, setQ] = useState("");

  type Ligne = { cle: string; href: string; salon?: (typeof SALONS)[number]; slug?: string; titre: string; nonLus: number; participants: string[]; dernier?: { jour: number; heure: string }; ecrit: boolean };
  const toutes: Ligne[] = [
    ...etat.tousLesSujets.map((t) => ({ cle: t.cle, href: `?salon=${t.salon.id}&sujet=${t.id}`, salon: t.salon, titre: t.titre, nonLus: t.nonLus, participants: t.participants, dernier: t.dernier, ecrit: t.participants.includes(VOUS) })),
    ...(prives
      ? etat.prives
          .filter((p) => p.dernier)
          .map((p) => ({ cle: p.cle, href: `?a=${p.slug}`, slug: p.slug, titre: membre(p.slug)?.nom ?? p.slug, nonLus: p.nonLus, participants: [...new Set([...p.messages].reverse().map((x) => x.auteur))], dernier: p.dernier, ecrit: p.messages.some((x) => x.auteur === VOUS) }))
      : []),
  ];
  const lignes = toutes
    .filter((l) => (filtre === "non-lues" ? l.nonLus > 0 : filtre === "ecrites" ? l.ecrit : true))
    .filter((l) => !q.trim() || l.titre.toLowerCase().includes(q.trim().toLowerCase()) || (l.salon?.nom.toLowerCase().includes(q.trim().toLowerCase()) ?? false))
    .sort((a, b) => (b.dernier ? minutes(b.dernier) : -Infinity) - (a.dernier ? minutes(a.dernier) : -Infinity));

  const ouvrir = (e: React.MouseEvent, href: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    aller(href);
  };

  return (
    <section className="lin-boite-detail ms-detail" aria-label="Conversations récentes">
      <header className="lin-tete">
        <button type="button" className="lin-rond ms-retour" aria-label="Retour à la liste des conversations" onClick={retour}>
          <ArrowLeft aria-hidden="true" />
        </button>
        <h2 className="lin-tete-nom ms-tete-h">Conversations récentes</h2>
        <span className="lin-tete-compte v2-tabulaire">{lignes.length}</span>
      </header>
      <div className="lin-outils ms-outils">
        <div className="lin-onglets" role="group" aria-label="Afficher">
          {(
            [
              ["toutes", "Toutes"],
              ["non-lues", "Non lues"],
              ["ecrites", "Où vous avez écrit"],
            ] as const
          ).map(([v, l]) => (
            <button key={v} type="button" className="lin-onglet" data-actif={filtre === v ? "" : undefined} aria-pressed={filtre === v} onClick={() => setFiltre(v)}>
              {l}
            </button>
          ))}
        </div>
        <div className="lin-outils-droite">
          <button type="button" className="lin-onglet" data-actif={prives ? "" : undefined} aria-pressed={prives} onClick={() => setPrives((v) => !v)}>
            Privés compris
          </button>
        </div>
      </div>
      <label className="ms-cherche">
        <Search width={14} height={14} aria-hidden="true" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer les sujets" aria-label="Filtrer les sujets" />
      </label>
      <div className="ms-recentes" role="table" aria-label="Conversations, la plus récente en haut">
        <div className="ms-recentes-tete" role="row">
          <span role="columnheader">Salon</span>
          <span role="columnheader">Conversation</span>
          <span role="columnheader" className="ms-col-participants">
            Participants
          </span>
          <span role="columnheader" className="ms-col-heure">
            Heure
          </span>
        </div>
        {lignes.length ? (
          lignes.map((l) => (
            <a key={l.cle} href={l.href} onClick={(e) => ouvrir(e, l.href)} className="ms-recentes-ligne" role="row" data-non-lu={l.nonLus ? "" : undefined}>
              <span role="cell" className="ms-col-salon">
                {l.salon ? <IconeSalon salon={l.salon} taille={18} /> : <Avatar slug={l.slug!} nomVous={nomVous} taille={18} />}
                <span>{l.salon ? l.salon.nom : "Message privé"}</span>
              </span>
              <span role="cell" className="ms-col-titre">
                {l.nonLus ? <span className="lin-boite-point" aria-hidden="true" /> : null}
                <span className="ms-col-titre-texte">{l.titre}</span>
                {l.nonLus ? <span className="ms-compte">{l.nonLus}</span> : null}
                {l.nonLus ? <span className="v2-sr">non lu{l.nonLus > 1 ? "s" : ""}</span> : null}
              </span>
              <span role="cell" className="ms-col-participants">
                <span className="ms-pile">
                  {l.participants.slice(0, 4).map((p) => (
                    <Avatar key={p} slug={p} nomVous={nomVous} taille={18} />
                  ))}
                  {l.participants.length > 4 ? <span className="ms-pile-plus">+{l.participants.length - 4}</span> : null}
                </span>
                <span className="v2-sr">{l.participants.map((p) => nomDe(p, nomVous)).join(", ")}</span>
              </span>
              <span role="cell" className="ms-col-heure">
                {l.dernier && minuit !== null ? heureLigne(l.dernier, minuit) : ""}
              </span>
            </a>
          ))
        ) : (
          <p className="lin-vide">{q.trim() ? "Aucune conversation ne correspond." : filtre === "non-lues" ? "Tout est lu." : filtre === "ecrites" ? "Vous n'avez encore écrit dans aucune de ces conversations." : "Aucune conversation ne correspond."}</p>
        )}
      </div>
    </section>
  );
}
