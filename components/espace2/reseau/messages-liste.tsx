"use client";

/* Réseau › Messages — la colonne des conversations, sur la barre latérale
   de Slack : un en-tête (« Messages », « Nouveau message »), l'entrée
   « Alertes » en tête, puis des sections qu'on replie (salons des îles,
   salons des secteurs, messages privés). Lignes de 28 px ; une
   conversation non lue passe en 600 et en blanc, ses mentions en
   pastille bleue ; un message privé montre l'avatar et la présence. */

import { useId, useState } from "react";
import { ChevronDown, Hash, Megaphone, SquarePen } from "lucide-react";
import { MEMBRES } from "./membres";
import { membre, presenceDe, type Salon } from "./messages-donnees";
import { Avatar } from "./messages-commun";
import { ItemMenu, MenuDeroulant, SectionMenu } from "../ui";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;

export type EntreeListe = { cle: string; nonLus: number; mentions: number };

export default function ListeConversations({
  salons,
  prives,
  etat,
  active,
  ouvrir,
  nomVous,
}: {
  salons: Salon[];
  prives: string[];
  etat: (cle: string) => EntreeListe;
  active: string | null;
  ouvrir: (cle: string) => void;
  nomVous: string;
}) {
  const alertes = salons.find((s) => s.genre === "alertes");
  const iles = salons.filter((s) => s.genre === "ile");
  const secteurs = salons.filter((s) => s.genre === "secteur");

  const ligneSalon = (s: Salon) => (
    <Ligne key={s.id} cle={`s:${s.id}`} etat={etat(`s:${s.id}`)} active={active} ouvrir={ouvrir} icone={s.genre === "alertes" ? <Megaphone {...I} /> : <Hash {...I} />} nom={s.nom} />
  );

  return (
    <nav className="ms-liste" aria-label="Conversations du réseau">
      <div className="ms-liste-tete">
        <h2>Messages</h2>
        <MenuDeroulant
          etiquette="Nouveau message privé"
          classe="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome"
          placement="bottom end"
          largeur={300}
          declencheur={<SquarePen {...I} />}
        >
          <SectionMenu titre="Écrire à un membre">
            {MEMBRES.map((m) => (
              <ItemMenu key={m.slug} id={m.slug} textValue={m.nom} onAction={() => ouvrir(`p:${m.slug}`)} icone={<Avatar slug={m.slug} nomVous={nomVous} taille={20} presence />}>
                {m.nom} <span className="v2-gris">· {m.secteur}</span>
              </ItemMenu>
            ))}
          </SectionMenu>
        </MenuDeroulant>
      </div>
      <div className="ms-liste-defile">
        {alertes ? <ul className="ms-groupe ms-groupe--seul">{ligneSalon(alertes)}</ul> : null}
        <Section titre="Salons des îles">{iles.map(ligneSalon)}</Section>
        <Section titre="Salons des secteurs">{secteurs.map(ligneSalon)}</Section>
        <Section titre="Messages privés">
          {prives.map((slug) => {
            const m = membre(slug);
            if (!m) return null;
            return (
              <Ligne
                key={slug}
                cle={`p:${slug}`}
                etat={etat(`p:${slug}`)}
                active={active}
                ouvrir={ouvrir}
                icone={<Avatar slug={slug} nomVous={nomVous} taille={20} presence />}
                nom={m.nom}
                presence={presenceDe(slug) === "en-ligne" ? "en ligne" : "absent"}
                prive
              />
            );
          })}
        </Section>
      </div>
    </nav>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [ouverte, setOuverte] = useState(true);
  const id = useId();
  return (
    <div className="ms-section">
      <button type="button" className="ms-section-titre" aria-expanded={ouverte} aria-controls={id} onClick={() => setOuverte((v) => !v)}>
        <ChevronDown width={14} height={14} aria-hidden="true" className="ms-section-chevron" />
        <span>{titre}</span>
      </button>
      <ul className="ms-groupe" id={id} hidden={!ouverte}>
        {children}
      </ul>
    </div>
  );
}

function Ligne({ cle, etat, active, ouvrir, icone, nom, presence, prive }: { cle: string; etat: EntreeListe; active: string | null; ouvrir: (cle: string) => void; icone: React.ReactNode; nom: string; presence?: string; prive?: boolean }) {
  const ici = active === cle;
  /* un message privé non lu se compte comme une mention, comme chez Slack */
  const pastille = prive ? etat.nonLus : etat.mentions;
  const details = [presence, etat.nonLus ? `${etat.nonLus} non lu${etat.nonLus > 1 ? "s" : ""}` : null, !prive && etat.mentions ? `${etat.mentions} mention${etat.mentions > 1 ? "s" : ""}` : null].filter(Boolean).join(", ");
  return (
    <li>
      <a
        href={cle.startsWith("p:") ? `?a=${cle.slice(2)}` : `?salon=${cle.slice(2)}`}
        className="ms-ligne"
        aria-current={ici ? "page" : undefined}
        data-non-lu={etat.nonLus ? "" : undefined}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          ouvrir(cle);
        }}
      >
        <span className="ms-ligne-icone">{icone}</span>
        <span className="ms-ligne-nom">{nom}</span>
        {details ? <span className="v2-sr">, {details}</span> : null}
        {pastille ? (
          <span className="ms-pastille v2-tabulaire" aria-hidden="true">
            {pastille}
          </span>
        ) : null}
      </a>
    </li>
  );
}
