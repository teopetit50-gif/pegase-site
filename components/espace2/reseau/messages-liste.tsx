"use client";

/* Réseau › Messages — la colonne des conversations.

   CONTENU : la barre de gauche de Zulip (chat.zulip.org, vue publique) :
   « Vues » en tête (ici « Conversations récentes »), les salons rangés
   par dossiers repliables (Zulip : « GENERAL INTEREST », « FEEDBACK &
   SUPPORT »… ; ici : tout le réseau, par île, par secteur), les sujets du
   salon ouvert sous lui avec leur nombre de non-lus, puis « Messages
   privés » ; le champ « Filtrer » en haut (Zulip : « Filter left
   sidebar »).

   HABILLAGE : la liste des boîtes des moteurs (lin-boite-liste, REPUT ›
   Base de connaissances, CASHD › Débiteurs, FILED › Boîte de réception) :
   tête de 44, lignes de 55 (rond de 32, deux lignes 13/500 et 12/450,
   l'heure à droite), point bleu des non-lus, survol en retrait de 8. */

import { useId, useState } from "react";
import { ChevronDown, Clock3, ListFilter, SquarePen, X } from "lucide-react";
import { Menu } from "../lin/Lin";
import { MEMBRES } from "./membres";
import { DOSSIERS, SALONS, VOUS, membre, type Salon } from "./messages-donnees";
import { Avatar, IconeSalon, apercu, heureLigne, libellePresence, nomDe } from "./messages-commun";
import { etatSalon, type Messagerie } from "./messages-etat";

const sansAccent = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export type Ici = { vue: "recentes" | "salon" | "sujet" | "prive" | null; salon?: string; sujet?: string; slug?: string };

export default function ListeConversations({ etat, ici, aller, nomVous, minuit, totalNonLus }: { etat: Messagerie; ici: Ici; aller: (href: string) => void; nomVous: string; minuit: number | null; totalNonLus: number }) {
  const [filtre, setFiltre] = useState<string | null>(null);
  const q = sansAccent(filtre ?? "").trim();

  /* un lien de la colonne : l'adresse dans href (nouvel onglet, copie), la navigation en place au clic */
  const lien = (href: string) => ({
    href,
    onClick: (e: React.MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      aller(href);
    },
  });

  const heure = (x?: Parameters<typeof heureLigne>[0]) => (x && minuit !== null ? heureLigne(x, minuit) : "");

  const ligneSalon = (salon: Salon) => {
    const sujets = etat.sujets(salon);
    const visibles = q ? sujets.filter((t) => sansAccent(t.titre).includes(q)) : sujets;
    const nomTrouve = !q || sansAccent(salon.nom).includes(q);
    if (!nomTrouve && !visibles.length) return null;
    const e = etatSalon(sujets);
    const ouvert = ici.salon === salon.id || (q && visibles.length > 0);
    const actif = ici.salon === salon.id && ici.vue === "salon";
    return (
      <li key={salon.id}>
        <a {...lien(`?salon=${salon.id}`)} className="lin-boite-ligne ms-ligne" data-actif={actif ? "" : undefined} data-non-lu={e.nonLus ? "" : undefined} aria-current={actif ? "page" : undefined}>
          <IconeSalon salon={salon} />
          <span className="lin-boite-texte">
            <span className="lin-boite-l1">
              {e.nonLus ? <span className="lin-boite-point" aria-hidden="true" /> : null}
              <span>{salon.nom}</span>
            </span>
            <span className="lin-boite-l2">{e.dernier ? `${nomDe(e.dernier.auteur, nomVous)} : ${apercu(e.dernier.texte, nomVous)}` : salon.description}</span>
          </span>
          <span className="lin-boite-droite">
            <span className="lin-boite-heure">{heure(e.dernier)}</span>
            <Compte n={e.nonLus} mentions={e.mentions} />
          </span>
          <span className="v2-sr">{[e.nonLus ? `${e.nonLus} non lu${e.nonLus > 1 ? "s" : ""}` : null, e.mentions ? `${e.mentions} mention${e.mentions > 1 ? "s" : ""} de vous` : null].filter(Boolean).join(", ")}</span>
        </a>
        {ouvert && visibles.length ? (
          <ul className="ms-sujets" aria-label={`Sujets de ${salon.nom}`}>
            {visibles.map((t) => {
              const ici2 = ici.vue === "sujet" && ici.salon === salon.id && ici.sujet === t.id;
              return (
                <li key={t.id}>
                  <a {...lien(`?salon=${salon.id}&sujet=${t.id}`)} className="ms-sujet" aria-current={ici2 ? "page" : undefined} data-non-lu={t.nonLus ? "" : undefined}>
                    <span className="ms-sujet-titre">{t.titre}</span>
                    <Compte n={t.nonLus} mentions={t.mentions} />
                    {t.nonLus ? <span className="v2-sr">, {t.nonLus} non lu{t.nonLus > 1 ? "s" : ""}</span> : null}
                  </a>
                </li>
              );
            })}
          </ul>
        ) : null}
      </li>
    );
  };

  const prives = etat.prives.filter((p) => !q || sansAccent(membre(p.slug)?.nom ?? "").includes(q));

  return (
    <section className="lin-boite-liste ms-liste" aria-label="Conversations du réseau">
      <header className="lin-tete">
        <h1 className="lin-tete-titre">Messages</h1>
        <div className="lin-tete-ronds">
          <button type="button" className="lin-rond" aria-label="Filtrer les conversations" title="Filtrer les conversations" aria-pressed={filtre !== null} onClick={() => setFiltre((f) => (f === null ? "" : null))}>
            <ListFilter aria-hidden="true" />
          </button>
          <Menu
            largeur={300}
            bouton={(ouvert, basculer) => (
              <button type="button" className="lin-rond" aria-label="Nouveau message privé" title="Nouveau message privé" aria-expanded={ouvert} onClick={basculer}>
                <SquarePen aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <div className="ms-menu-membres">
                <div className="lin-menu-section">
                  <span className="lin-reglage">Écrire à un membre</span>
                </div>
                {MEMBRES.map((m) => (
                  <a
                    key={m.slug}
                    {...lien(`?a=${m.slug}`)}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      fermer();
                      aller(`?a=${m.slug}`);
                    }}
                    className="lin-menu-option"
                  >
                    <Avatar slug={m.slug} nomVous={nomVous} taille={18} presence />
                    <span className="ms-menu-nom">{m.nom}</span>
                    <span className="lin-meta">{m.commune}</span>
                  </a>
                ))}
              </div>
            )}
          </Menu>
        </div>
      </header>
      {filtre !== null ? (
        <div className="ms-filtre">
          <ListFilter width={14} height={14} aria-hidden="true" />
          <input autoFocus value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Filtrer les salons, sujets et membres" aria-label="Filtrer les salons, sujets et membres" onKeyDown={(e) => e.key === "Escape" && setFiltre(null)} />
          <button type="button" className="lin-rond" aria-label="Fermer le filtre" onClick={() => setFiltre(null)}>
            <X aria-hidden="true" />
          </button>
        </div>
      ) : null}
      <nav className="ms-liste-defile" aria-label="Conversations">
        <ul className="lin-boite-lignes ms-groupe">
          <li>
            <a {...lien("?vue=recentes")} className="lin-boite-ligne ms-ligne" data-actif={ici.vue === "recentes" ? "" : undefined} aria-current={ici.vue === "recentes" ? "page" : undefined} data-non-lu={totalNonLus ? "" : undefined}>
              <span className="ms-avatar ms-avatar--vue" data-taille={32} aria-hidden="true">
                <Clock3 strokeWidth={1.8} />
              </span>
              <span className="lin-boite-texte">
                <span className="lin-boite-l1">
                  <span>Conversations récentes</span>
                </span>
                <span className="lin-boite-l2">{totalNonLus ? `${totalNonLus} message${totalNonLus > 1 ? "s" : ""} non lu${totalNonLus > 1 ? "s" : ""}` : "Tout est lu"}</span>
              </span>
              <span className="lin-boite-droite" />
            </a>
          </li>
        </ul>
        {DOSSIERS.map((d) => {
          const lignes = SALONS.filter((s) => s.genre === d.genre).map(ligneSalon).filter(Boolean);
          return lignes.length ? (
            <Section key={d.genre} titre={d.titre}>
              {lignes}
            </Section>
          ) : null;
        })}
        {prives.length ? (
          <Section titre="Messages privés">
            {prives.map((p) => {
              const m = membre(p.slug)!;
              const actif = ici.vue === "prive" && ici.slug === p.slug;
              return (
                <li key={p.slug}>
                  <a {...lien(`?a=${p.slug}`)} className="lin-boite-ligne ms-ligne" data-actif={actif ? "" : undefined} aria-current={actif ? "page" : undefined} data-non-lu={p.nonLus ? "" : undefined}>
                    <Avatar slug={p.slug} nomVous={nomVous} presence />
                    <span className="lin-boite-texte">
                      <span className="lin-boite-l1">
                        {p.nonLus ? <span className="lin-boite-point" aria-hidden="true" /> : null}
                        <span>{m.nom}</span>
                      </span>
                      <span className="lin-boite-l2">{p.dernier ? `${p.dernier.auteur === VOUS ? "Vous" : m.nom} : ${apercu(p.dernier.texte, nomVous)}` : `${m.secteur} · ${m.commune}`}</span>
                    </span>
                    <span className="lin-boite-droite">
                      <span className="lin-boite-heure">{heure(p.dernier)}</span>
                      <Compte n={p.nonLus} mentions={p.nonLus} />
                    </span>
                    <span className="v2-sr">, {libellePresence(p.slug)}{p.nonLus ? `, ${p.nonLus} non lu${p.nonLus > 1 ? "s" : ""}` : ""}</span>
                  </a>
                </li>
              );
            })}
          </Section>
        ) : null}
        {q && !prives.length && !SALONS.some((s) => sansAccent(s.nom).includes(q) || etat.sujets(s).some((t) => sansAccent(t.titre).includes(q))) ? <p className="lin-vide">Aucune conversation ne correspond.</p> : null}
      </nav>
    </section>
  );
}

/* le nombre de non-lus d'une ligne ; en bleu plein quand il y a une mention de vous (ou un message privé) */
function Compte({ n, mentions }: { n: number; mentions: number }) {
  if (!n) return null;
  return (
    <span className="ms-compte" data-mention={mentions ? "" : undefined} aria-hidden="true">
      {n}
    </span>
  );
}

function Section({ titre, children }: { titre: string; children: React.ReactNode }) {
  const [ouverte, setOuverte] = useState(true);
  const id = useId();
  return (
    <div className="ms-section">
      <button type="button" className="ms-section-titre" aria-expanded={ouverte} aria-controls={id} onClick={() => setOuverte((v) => !v)}>
        <ChevronDown width={12} height={12} aria-hidden="true" className="ms-section-chevron" />
        <span>{titre}</span>
      </button>
      <ul className="lin-boite-lignes ms-groupe" id={id} hidden={!ouverte}>
        {children}
      </ul>
    </div>
  );
}
