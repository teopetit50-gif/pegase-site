"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega — la fiche d'un membre (02/11/2026)

   Composition de la fiche entreprise de pappers.be (relevée dans Chromium
   le 02/11/2026) : une carte d'en-tête en deux moitiés — à gauche
   l'identité (nom en grand, statut), à droite une liste de faits en
   libellé / valeur — puis des cartes de section sur deux colonnes, chacune
   avec son titre, le nom de l'entreprise en petites capitales dessous, un
   filet, et ses lignes. SANS l'aplat de couleur pleine largeur de la
   référence : la carte d'en-tête se pose sur le fond de page d'Espace 2,
   comme toutes les autres. Habillage : jetons --v2-*, v2-carte, v2-btn,
   v2-modale.

   « Écrire » mène aux Messages du réseau (?a=<slug>) ; « Demander une
   mise en relation » prépare une demande à Omega, qui présente « vous »
   (l'organisation connectée) au membre.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, BadgeCheck, Handshake, MessageSquare, ShieldCheck, X } from "lucide-react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { useSource } from "@/components/espace/source";
import { useToast } from "../Toasts";
import { useOrganisation } from "../organisation";
import { MEMBRES, type Membre } from "./membres";
import { reseauEnExemple } from "./source";
import { LigneBadge, Monogramme, ReseauFerme } from "./membres-ui";
import { RACINE_MEMBRES, badgesLus, lienEcrire, lienMembre, membreDe, moisEnClair } from "./membres-donnees";
import "./membres.css";

export function FicheMembre({ slug }: { slug: string }) {
  const { source } = useSource();
  const m = membreDe(slug);
  return (
    <div className="v2-page rm-page">
      <nav className="rm-fil" aria-label="Fil d'Ariane">
        <Link href={RACINE_MEMBRES}>
          <ArrowLeft width={14} height={14} aria-hidden="true" />
          Membres
        </Link>
        {reseauEnExemple(source) && m ? (
          <>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{m.nom}</span>
          </>
        ) : null}
      </nav>
      {reseauEnExemple(source) && m ? <Fiche m={m} /> : <ReseauFerme retour />}
    </div>
  );
}

function Fiche({ m }: { m: Membre }) {
  const badges = badgesLus(m.badges);
  const voisins = MEMBRES.filter((x) => x.ile === m.ile && x.slug !== m.slug).slice(0, 4);
  return (
    <>
      <section className="v2-carte rm-entete" aria-labelledby="rm-fiche-nom">
        <div className="rm-entete-identite">
          <Monogramme nom={m.nom} taille={48} />
          <div className="rm-entete-noms">
            <h1 className="rm-titre" id="rm-fiche-nom">
              {m.nom}
            </h1>
            <p className="rm-entete-statut">
              <ShieldCheck width={14} height={14} aria-hidden="true" />
              Membre vérifié du Réseau Omega
            </p>
          </div>
          <div className="rm-entete-actions">
            <Link href={lienEcrire(m.slug)} className="v2-btn v2-btn--primaire">
              <MessageSquare width={16} height={16} aria-hidden="true" />
              Écrire
            </Link>
            <MiseEnRelation membre={m} />
          </div>
        </div>
        <dl className="rm-faits">
          <div>
            <dt>Activité</dt>
            <dd>{m.secteur}</dd>
          </div>
          <div>
            <dt>Commune</dt>
            <dd>
              {m.commune}, {m.ile}
            </dd>
          </div>
          <div>
            <dt>Membre depuis</dt>
            <dd>{moisEnClair(m.depuis)}</dd>
          </div>
          <div>
            <dt>Badges</dt>
            <dd>{badges.length ? `${badges.length} vérifié${badges.length > 1 ? "s" : ""} par la donnée` : "Aucun montré"}</dd>
          </div>
        </dl>
      </section>

      <div className="rm-sections">
        <Section titre="Ce qu'il propose" nom={m.nom}>
          <ul className="rm-puces">
            {m.propose.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Section>

        <Section titre="Ce qu'il cherche" nom={m.nom}>
          <ul className="rm-puces">
            {m.cherche.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </Section>

        <Section titre="Badges vérifiés par la donnée" nom={m.nom}>
          {badges.length ? (
            <ul className="rm-lignes-badges">
              {badges.map((b) => (
                <LigneBadge key={b.cle} badge={b} />
              ))}
            </ul>
          ) : (
            <p className="rm-sourdine rm-section-vide">
              <BadgeCheck width={14} height={14} aria-hidden="true" />
              {m.nom} n&apos;a pas choisi de montrer de badge.
            </p>
          )}
          <p className="rm-section-note">Un badge n&apos;apparaît que si le membre l&apos;accepte. Omega le calcule, le membre ne le déclare pas.</p>
        </Section>

        <Section titre="Informations" nom={m.nom}>
          <dl className="rm-tableau-faits">
            <div>
              <dt>Activité</dt>
              <dd>{m.secteur}</dd>
            </div>
            <div>
              <dt>Commune</dt>
              <dd>{m.commune}</dd>
            </div>
            <div>
              <dt>Île</dt>
              <dd>{m.ile}</dd>
            </div>
            <div>
              <dt>Entrée dans le réseau</dt>
              <dd>{moisEnClair(m.depuis)}</dd>
            </div>
          </dl>
        </Section>

        {voisins.length ? (
          <Section titre={`Aussi en ${m.ile}`} nom="Membres du réseau" large>
            <ul className="rm-voisins">
              {voisins.map((v) => (
                <li key={v.slug}>
                  <Link href={lienMembre(v.slug)} className="rm-voisin">
                    <Monogramme nom={v.nom} />
                    <span>
                      <span className="rm-voisin-nom">{v.nom}</span>
                      <small>
                        {v.secteur} · {v.commune}
                      </small>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        ) : null}
      </div>
    </>
  );
}

function Section({ titre, nom, large, children }: { titre: string; nom: string; large?: boolean; children: React.ReactNode }) {
  return (
    <section className="v2-carte rm-section" data-large={large || undefined}>
      <header className="rm-section-tete">
        <h2 className="rm-h2">{titre}</h2>
        <p className="rm-etiquette">{nom}</p>
      </header>
      <div className="rm-section-corps">{children}</div>
    </section>
  );
}

/* ——— « Demander une mise en relation » : Omega présente « vous » au membre ——— */

function MiseEnRelation({ membre: m }: { membre: Membre }) {
  const { nom } = useOrganisation();
  const toast = useToast();
  const [ouvert, setOuvert] = useState(false);
  const [envoyee, setEnvoyee] = useState(false);
  const [motif, setMotif] = useState("");
  if (envoyee)
    return (
      <button type="button" className="v2-btn" disabled>
        <Handshake width={16} height={16} aria-hidden="true" />
        Mise en relation demandée
      </button>
    );
  return (
    <>
      <button type="button" className="v2-btn" onClick={() => setOuvert(true)}>
        <Handshake width={16} height={16} aria-hidden="true" />
        Demander une mise en relation
      </button>
      <ModalOverlay isOpen={ouvert} onOpenChange={setOuvert} isDismissable className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setOuvert(false);
                setEnvoyee(true);
                toast(`Exemple : la demande n'est pas partie. En vrai, Omega présenterait ${nom} à ${m.nom}.`);
              }}
            >
              <div className="v2-modale-corps rm-modale-corps">
                <div className="rm-modale-tete">
                  <Heading slot="title" className="rm-h2">
                    Demander une mise en relation
                  </Heading>
                  <button type="button" className="v2-btn v2-btn--petit v2-btn--fantome v2-btn--icone" aria-label="Fermer" onClick={() => setOuvert(false)}>
                    <X width={16} height={16} />
                  </button>
                </div>
                <p className="rm-modale-texte">
                  Omega présente <strong>{nom}</strong> à <strong>{m.nom}</strong>, et vous met en copie d&apos;un premier message. {m.nom} peut accepter ou décliner.
                </p>
                <label className="v2-libelle">
                  Pourquoi cette mise en relation ?
                  <textarea className="rm-zone" rows={3} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder={`Ex. : nous cherchons « ${m.propose[0].toLowerCase()} » pour un projet à venir.`} required />
                </label>
              </div>
              <div className="v2-modale-pied">
                <button type="button" className="v2-btn" onClick={() => setOuvert(false)}>
                  Annuler
                </button>
                <button type="submit" className="v2-btn v2-btn--primaire" disabled={!motif.trim()}>
                  Envoyer la demande
                </button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
