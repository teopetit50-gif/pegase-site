"use client";

/* ══════════════════════════════════════════════════════════════════════
   Réseau Omega — la fiche d'un membre (reprise du 02/11/2026)

   LE CONTENU suit la fiche entreprise publique de pappers.be, relevée dans
   Chromium (https://www.pappers.be/fr/company/menuiserie-brahy-0444482209,
   sans compte), dans son ordre :
     · l'en-tête : le nom en grand, le statut (« Active ») et l'identifiant,
       puis les faits (adresse, activité, effectif, création, dirigeants) ;
     · « Informations juridiques » → ici « Informations du membre » ;
     · « Activité » (codes et domaines) → l'activité et ce qu'il propose ;
     · « Finances » (un tableau par indicateur et par année) → les badges
       vérifiés par la donnée : indicateur, valeur, période, source ;
     · « Prospecter dans ce secteur » → les membres du même secteur ou de
       la même île ;
     · « Informations de contact » (« Réservé aux utilisateurs
       connectés ») → les coordonnées ne sont pas partagées : on écrit par
       la messagerie du réseau.
   Les états de pappers sont gardés : un champ que le membre n'a pas
   accepté de montrer s'affiche « Non montré par le membre », comme
   l'« Accès restreint » des bénéficiaires effectifs.

   L'HABILLAGE est celui des pages des moteurs (tableaux de bord de FILED,
   CASHD, REPUT, OFFLOAD) : la page d'un projet de Linear du kit
   components/espace2/lin/ — barre du titre de 44 avec le fil, colonne de
   texte (tuile 36, titre 24/600, résumé 15, ligne « Propriétés » en
   puces, sections au titre gris 13/500), cartes de 388 à droite
   repliables. Jetons --lin-*, sombre et clair.

   « Écrire » mène aux Messages du réseau (?a=<slug>) ; « Demander une
   mise en relation » prépare une demande à Omega, qui présente « vous »
   (l'organisation connectée) au membre.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, Briefcase, CalendarDays, Handshake, Info, Lock, MapPin, MessageSquare, ShieldCheck, Users, X } from "lucide-react";
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { useSource } from "@/components/espace/source";
import { useToast } from "../Toasts";
import { useOrganisation } from "../organisation";
import { CarteDroite } from "../lin/Lin";
import { MEMBRES, type Membre } from "./membres";
import { reseauEnExemple } from "./source";
import { Avatar, ContenuBulle, IconeBadge, Infobulle, ReseauFerme } from "./membres-ui";
import { BADGES_CONNUS, PERIODE_BADGES, RACINE_MEMBRES, badgesLus, lienEcrire, lienMembre, membreDe, moisCourt, moisEnClair } from "./membres-donnees";
import "../lin/lin.css";
import "./membres.css";

export function FicheMembre({ slug }: { slug: string }) {
  const { source } = useSource();
  const m = membreDe(slug);
  const exemple = reseauEnExemple(source) && !!m;
  return (
    <div className="lin rm">
      <header className="lin-tete">
        <nav className="lin-fil" aria-label="Fil d'Ariane">
          <Link href={RACINE_MEMBRES} className="lin-fil-equipe">
            <Users aria-hidden="true" />
            <span className="lin-fil-lien">Membres</span>
          </Link>
          {exemple ? (
            <>
              <span className="lin-fil-sep" aria-hidden="true">
                ›
              </span>
              <span className="lin-fil-ici" aria-current="page">
                {m.nom}
              </span>
            </>
          ) : null}
        </nav>
        {exemple ? (
          <div className="lin-tete-droite rm-tete-actions">
            <Link href={lienEcrire(m.slug)} className="v2-btn v2-btn--petit">
              <MessageSquare width={14} height={14} aria-hidden="true" />
              Écrire
            </Link>
          </div>
        ) : null}
      </header>
      {exemple ? (
        <Fiche m={m} />
      ) : (
        <div className="rm-ferme">
          <ReseauFerme retour />
        </div>
      )}
    </div>
  );
}

function Fiche({ m }: { m: Membre }) {
  const badges = badgesLus(m.badges);
  const memeSecteur = MEMBRES.filter((x) => x.secteur === m.secteur && x.slug !== m.slug);
  const memeIle = MEMBRES.filter((x) => x.ile === m.ile && x.slug !== m.slug && !memeSecteur.includes(x)).slice(0, 4);

  return (
    <div className="lin-projet">
      <div className="lin-projet-texte">
        <span className="lin-tuile rm-tuile">
          <Avatar nom={m.nom} taille={36} />
        </span>
        <h1 className="lin-projet-h1">{m.nom}</h1>
        <p className="lin-projet-resume">
          {m.secteur} à {m.commune}, en {m.ile}. Membre vérifié du Réseau Omega depuis {moisEnClair(m.depuis)}.
        </p>

        <div className="lin-projet-ligne">
          <span className="lin-projet-etiquette">Propriétés</span>
          <span className="lin-puce rm-puce-statut">
            <ShieldCheck width={16} height={16} aria-hidden="true" />
            Membre vérifié
          </span>
          <span className="lin-puce">
            <Briefcase width={16} height={16} aria-hidden="true" />
            {m.secteur}
          </span>
          <span className="lin-puce">
            <MapPin width={16} height={16} aria-hidden="true" />
            {m.commune}
          </span>
          <span className="lin-puce">
            <CalendarDays width={16} height={16} aria-hidden="true" />
            Depuis {moisCourt(m.depuis)}
          </span>
        </div>
        <div className="lin-projet-ligne">
          <span className="lin-projet-etiquette">Réseau</span>
          <MiseEnRelation membre={m} />
        </div>

        <h2 className="lin-projet-h2">Informations du membre</h2>
        <dl className="rm-lignes">
          <div>
            <dt>Nom</dt>
            <dd>{m.nom}</dd>
          </div>
          <div>
            <dt>Situation</dt>
            <dd>
              <span className="rm-statut">Actif</span> · membre vérifié par Omega
            </dd>
          </div>
          <div>
            <dt>Entrée dans le réseau</dt>
            <dd>{moisEnClair(m.depuis)}</dd>
          </div>
          <div>
            <dt>Île</dt>
            <dd>{m.ile}</dd>
          </div>
          <div>
            <dt>Commune</dt>
            <dd>{m.commune}</dd>
          </div>
        </dl>

        <h2 className="lin-projet-h2">Activité</h2>
        <dl className="rm-lignes">
          <div>
            <dt>Secteur</dt>
            <dd>{m.secteur}</dd>
          </div>
          <div>
            <dt>Ce qu&apos;il propose</dt>
            <dd>
              <ul className="rm-liste-points">
                {m.propose.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </dd>
          </div>
          <div>
            <dt>Ce qu&apos;il cherche</dt>
            <dd>
              <ul className="rm-liste-points">
                {m.cherche.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </dd>
          </div>
        </dl>

        <h2 className="lin-projet-h2">Badges vérifiés par la donnée</h2>
        <div className="rm-badges-table" role="table" aria-label="Badges vérifiés par la donnée">
          <div className="rm-badges-tete" role="row">
            <span role="columnheader">Indicateur</span>
            <span role="columnheader">Valeur</span>
            <span role="columnheader">Période</span>
            <span role="columnheader">Source</span>
          </div>
          {BADGES_CONNUS.map((connu) => {
            const b = badges.find((x) => x.cle === connu.cle);
            return (
              <div key={connu.cle} className="rm-badges-ligne" role="row" data-absent={b ? undefined : ""}>
                <span role="cell" className="rm-badges-nom">
                  <IconeBadge cle={connu.cle} />
                  {connu.nom}
                </span>
                {b ? (
                  <>
                    <span role="cell" className="rm-badges-valeur">
                      {b.phrase}
                      <Infobulle etiquette={`D'où vient « ${b.phrase} » ?`} contenu={<ContenuBulle badge={b} />} classe="rm-bulle-i">
                        <Info width={14} height={14} aria-hidden="true" />
                      </Infobulle>
                    </span>
                    <span role="cell">12 mois glissants</span>
                    <span role="cell">{b.origine}</span>
                  </>
                ) : (
                  <span role="cell" className="rm-badges-restreint">
                    <Lock width={14} height={14} aria-hidden="true" />
                    Non montré par le membre
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <p className="rm-note">Omega calcule chaque badge sur {PERIODE_BADGES} ; le membre ne le déclare pas, il choisit seulement de le montrer.</p>

        {memeSecteur.length || memeIle.length ? (
          <>
            <h2 className="lin-projet-h2">{memeSecteur.length ? "Dans le même secteur" : `Aussi en ${m.ile}`}</h2>
            <ul className="lin-projet-liste">
              {(memeSecteur.length ? memeSecteur : memeIle).map((v) => (
                <li key={v.slug}>
                  <Link href={lienMembre(v.slug)} className="lin-projet-lien">
                    <Avatar nom={v.nom} />
                    <span>{v.nom}</span>
                    <span className="lin-meta">
                      {v.secteur} · {v.commune}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {memeSecteur.length ? null : (
              <Link href={`${RACINE_MEMBRES}?ile=${encodeURIComponent(m.ile)}`} className="lin-voir-tout">
                Tous les membres en {m.ile}
                <ArrowRight width={14} height={14} aria-hidden="true" />
              </Link>
            )}
          </>
        ) : null}

        <h2 className="lin-projet-h2">Informations de contact</h2>
        <dl className="rm-lignes">
          <div>
            <dt>Téléphone, e-mail</dt>
            <dd className="rm-restreint">
              <Lock width={14} height={14} aria-hidden="true" />
              Non partagés dans le réseau
            </dd>
          </div>
          <div>
            <dt>Messagerie du réseau</dt>
            <dd>
              <Link href={lienEcrire(m.slug)} className="rm-lien">
                Écrire à {m.nom}
              </Link>
            </dd>
          </div>
          <div>
            <dt>Adresse</dt>
            <dd>
              {m.commune}, {m.ile}
            </dd>
          </div>
        </dl>
      </div>

      <div className="lin-cartes-droite">
        <CarteDroite titre="Propriétés">
          <dl className="lin-props">
            <div>
              <dt>Statut</dt>
              <dd>
                <ShieldCheck width={16} height={16} className="rm-ic-statut" aria-hidden="true" />
                Membre vérifié
              </dd>
            </div>
            <div>
              <dt>Activité</dt>
              <dd>
                <Briefcase width={16} height={16} aria-hidden="true" />
                {m.secteur}
              </dd>
            </div>
            <div>
              <dt>Lieu</dt>
              <dd>
                <MapPin width={16} height={16} aria-hidden="true" />
                {m.commune}, {m.ile}
              </dd>
            </div>
            <div>
              <dt>Membre depuis</dt>
              <dd>
                <CalendarDays width={16} height={16} aria-hidden="true" />
                {moisEnClair(m.depuis)}
              </dd>
            </div>
          </dl>
        </CarteDroite>
        <CarteDroite titre="Badges">
          {badges.length ? (
            <ul className="rm-carte-badges">
              {badges.map((b) => (
                <li key={b.cle}>
                  <IconeBadge cle={b.cle} />
                  <span>{b.phrase}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="lin-activite-vide">Aucun badge montré par {m.nom}.</p>
          )}
        </CarteDroite>
      </div>
    </div>
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
      <span className="lin-puce rm-puce-faite">
        <BadgeCheck width={16} height={16} aria-hidden="true" />
        Mise en relation demandée
      </span>
    );
  return (
    <>
      <button type="button" className="lin-puce" onClick={() => setOuvert(true)}>
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
                  <Heading slot="title" className="rm-modale-titre">
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
