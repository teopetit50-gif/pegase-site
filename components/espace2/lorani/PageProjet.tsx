"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI › la page d'un projet (29/10/2026, refonte des pages métiers)

   La page « Customer Agent » de Plain, au 1:1 : relevé docs/refonte-metiers/
   releves/plain-customer-agent.md, mesures dans ../lin/plain-customer-agent.css
   (préfixe pca-). Un sous-menu à gauche (titre, groupes titrés, entrée
   active), la page dans une carte blanche, une colonne de 856 faite de
   cartes titrées. À moins de 900 px de large, le sous-menu devient une
   rangée d'onglets qui défile, au-dessus de la page.

   Les parties du projet, gardées dans l'adresse (?partie=, « projet » par
   défaut : les liens d'aiguillage arrivent sans partie), et ce qu'elles
   reprennent de l'écran d'avant (inventaire lorani.md) :
     Projet                 B18-B22, F3-F6 — ProjetCarte habillé ; F1 (Nouveau projet) en tête
     Permis                 la liste des permis du projet, chacun vers sa page
                            (/espace2/lorani/permis/<id>), et « Ouvrir un permis » (F2) — dessiné ici
     Urbanisme et pièces    B23, B24 — ProjetCarte habillé
     Contrôle               B25, F14-F19
     Consultation           B26, F20-F21
     Chantier               B28-B30, F24-F35 (« Diffuser » un CR passe par une confirmation)
     Réception, GPA, DOE    B31, B32 (« Demander les pièces manquantes » aussi)
     Assurances             B33
   Les honoraires (B27) ont leur page : le sous-menu y mène
   (/espace2/lorani/honoraires?projet=<id>).

   Aucun geste n'est réécrit : chaque partie monte ProjetCarte avec ses
   seules cartes (`parties`), les fenêtres du projet sont celles de
   l'écran d'avant (Formulaires). Après une création, la page du projet
   ou du permis créé s'ouvre, une fois le dossier relu.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, ClipboardCheck, FileText, FolderOpen, FolderPlus, HardHat, ListChecks, MapIcon, Plus, Receipt, Scale, ShieldCheck, type LucideIcon } from "lucide-react";
import ProjetCarte, { type PartieProjet } from "@/components/espace/lorani/ProjetCarte";
import Formulaires, { type Form } from "@/components/espace/lorani/Formulaires";
import { ETATS, NATURES_PROJET, PHASES, TYPES, prochaineDate, titrePermis } from "@/components/espace/lorani/etats";
import type { Permis } from "@/components/espace/lorani/types";
import { dateCourte } from "@/components/espace/format";
import Habille from "@/components/espace2/Habille";
import { RACINE } from "@/components/espace2/modules";
import { VoletContexte, useVoletPage } from "../lin/Volet";
import { useLorani } from "./donnees";
import "../lin/lin.css";
import "../lin/plain-customer-agent.css";

const BASE = `${RACINE}/lorani`;

type ClePartie = "projet" | "permis" | "urbanisme" | "controle" | "consultation" | "chantier" | "reception" | "assurances";
type Entree = { cle: ClePartie; libelle: string; icone: LucideIcon; parties?: PartieProjet[] };

/* le sous-menu : un groupe sans titre, puis les phases de la mission */
const GROUPES: { titre: string | null; entrees: Entree[] }[] = [
  {
    titre: null,
    entrees: [
      { cle: "projet", libelle: "Projet", icone: FolderOpen, parties: ["identite", "equipe", "intervenants"] },
      { cle: "permis", libelle: "Permis", icone: FileText },
    ],
  },
  {
    titre: "Études",
    entrees: [
      { cle: "urbanisme", libelle: "Urbanisme et pièces", icone: MapIcon, parties: ["plu", "pieces"] },
      { cle: "controle", libelle: "Contrôle", icone: ListChecks, parties: ["controle"] },
      { cle: "consultation", libelle: "Consultation", icone: Scale, parties: ["offres"] },
    ],
  },
  {
    titre: "Chantier",
    entrees: [
      { cle: "chantier", libelle: "Chantier", icone: HardHat, parties: ["chantier", "comptesRendus", "ordresService"] },
      { cle: "reception", libelle: "Réception, GPA, DOE", icone: ClipboardCheck, parties: ["reserves", "doe"] },
      { cle: "assurances", libelle: "Assurances", icone: ShieldCheck, parties: ["assurances"] },
    ],
  },
];
const ENTREES = GROUPES.flatMap((g) => g.entrees);
const estPartie = (v: string | null): v is ClePartie => ENTREES.some((e) => e.cle === v);

/* les teintes des états (etats.ts) dans celles du gabarit */
const teinteLin = (t: string) => (t === "ambre" ? "jaune" : t === "vert" || t === "rouge" || t === "bleu" ? t : "gris");
const jour = (d: string) => dateCourte(`${d}T12:00:00`);

export default function PageProjet({ id }: { id: string }) {
  const { pret, erreur, dossier, peutEcrire, agir, nommer, personnes, proposeesPar } = useLorani();
  const params = useSearchParams();
  const chemin = usePathname();
  const router = useRouter();
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);

  const p = params.get("partie");
  const partie: ClePartie = estPartie(p) ? p : "projet";
  const entree = ENTREES.find((e) => e.cle === partie) ?? ENTREES[0];
  const projet = dossier.projets.find((x) => x.id === id) ?? null;
  const lien = (cle: ClePartie) => (cle === "projet" ? chemin : `${chemin}?partie=${cle}`);
  /* 30/10/2026 : l'élément choisi dans une partie (un constat, un compte rendu…) s'ouvre dans un volet à droite */
  const { contexte, ouvert, setCible } = useVoletPage(`${id}/${partie}`);

  /* après une création : la page du projet ou du permis créé, dès que le dossier relu le contient */
  const aOuvrir = useRef<{ id: string; type: "projet" | "permis" } | null>(null);
  useEffect(() => {
    const c = aOuvrir.current;
    if (!c) return;
    const la = c.type === "projet" ? dossier.projets.some((x) => x.id === c.id) : dossier.permis.some((x) => x.id === c.id);
    if (!la) return;
    aOuvrir.current = null;
    router.push(c.type === "projet" ? `${BASE}/projets/${c.id}` : `${BASE}/permis/${c.id}`);
  }, [dossier, router]);

  /* les onglets (écran étroit) : l'entrée active ramenée dans la rangée */
  const menu = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = menu.current;
    const actif = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!nav || !actif || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollLeft = actif.offsetLeft - (nav.clientWidth - actif.offsetWidth) / 2;
  }, [partie]);

  const nom = projet?.nom ?? "Projet";
  const resume = projet ? [projet.reference, projet.commune, NATURES_PROJET[projet.nature], PHASES[projet.phase]].filter(Boolean).join(" · ") : null;

  return (
    <VoletContexte.Provider value={contexte}>
    <div className="lin pca">
      <h1 className="v2-sr">{nom}</h1>

      <div className="pca-cadre">
        <nav ref={menu} className="pca-menu" aria-label="Parties du projet">
          <div className="pca-menu-titre">Dossier du projet</div>
          {GROUPES.map((g, i) => (
            <div key={g.titre ?? i} className="pca-groupe">
              {g.titre ? <div className="pca-groupe-titre">{g.titre}</div> : null}
              <ul className="pca-entrees">
                {g.entrees.map((e) => (
                  <li key={e.cle}>
                    <Link href={lien(e.cle)} className="pca-entree" aria-current={partie === e.cle ? "page" : undefined}>
                      <span className="pca-entree-icone" aria-hidden="true">
                        <e.icone />
                      </span>
                      {e.libelle}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="pca-groupe">
            <div className="pca-groupe-titre">Agence</div>
            <ul className="pca-entrees">
              <li>
                <Link href={`${BASE}/honoraires?projet=${encodeURIComponent(id)}`} className="pca-entree">
                  <span className="pca-entree-icone" aria-hidden="true">
                    <Receipt />
                  </span>
                  Honoraires et temps
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <div className="pca-carte-page" data-volet={ouvert ? "" : undefined}>
          <div className="pca-colonne">
            <header className="pca-tete">
              <Link href={BASE} className="pca-retour">
                <ArrowLeft aria-hidden="true" />
                Permis et projets
              </Link>
              <div className="pca-tete-ligne">
                <div className="pca-tete-texte">
                  <h2 className="pca-h1">{nom}</h2>
                  {resume ? <p className="pca-sous">{resume}</p> : null}
                </div>
                <button type="button" className="pca-bouton" disabled={!peutEcrire || envoi} onClick={() => setForm({ type: "projet" })}>
                  <FolderPlus aria-hidden="true" />
                  Nouveau projet
                </button>
              </div>
            </header>

            {erreur ? (
              <p className="pca-alerte" role="alert">
                <strong>La base réelle n&apos;a pas répondu.</strong> {erreur}
              </p>
            ) : null}

            {!projet ? (
              <div className="pca-vide" role={pret ? "alert" : "status"}>
                <span className="pca-vide-icone" aria-hidden="true">
                  <FolderOpen />
                </span>
                <div className="pca-vide-texte">
                  <p className="pca-vide-titre">{pret ? "Ce projet n'est pas visible avec ce compte" : "Lecture du projet…"}</p>
                  {pret ? <p>Il a pu être retiré, ou votre compte n&apos;a pas accès à ce dossier.</p> : null}
                </div>
                {pret ? (
                  <Link href={BASE} className="pca-bouton">
                    Revenir aux permis et projets
                  </Link>
                ) : null}
              </div>
            ) : partie === "permis" ? (
              <ListePermis
                permis={dossier.permis.filter((x) => x.projet_id === projet.id)}
                nomProjet={projet.nom}
                proposeesPar={proposeesPar}
                peutOuvrir={peutEcrire && !envoi}
                ouvrir={() => setForm({ type: "permis", projet: projet.id })}
              />
            ) : (
              <div className="pca-habille">
                <Habille>
                  <ProjetCarte
                    key={`${partie}-${projet.id}`}
                    projet={projet}
                    dossier={dossier}
                    nommer={nommer}
                    peutEcrire={peutEcrire}
                    envoi={envoi}
                    ouvrirForm={setForm}
                    agir={agir}
                    parties={entree.parties}
                    confirmerEnvois
                  />
                </Habille>
              </div>
            )}
          </div>
          {ouvert ? (
            <aside className="lit-volet lvp-volet-page" aria-label="Détail">
              <div ref={setCible} className="lvp-cible" />
            </aside>
          ) : null}
        </div>
      </div>

      <Formulaires
        form={form}
        fermer={() => setForm(null)}
        dossier={dossier}
        personnes={personnes}
        agir={agir}
        apres={(cree, type) => {
          aOuvrir.current = { id: cree, type };
        }}
        onEnvoi={setEnvoi}
      />
    </div>
    </VoletContexte.Provider>
  );
}

/* ——— la partie « Permis » : une carte titrée, une rangée par permis, puis « Ouvrir un permis » ——— */
function ListePermis({ permis, nomProjet, proposeesPar, peutOuvrir, ouvrir }: { permis: Permis[]; nomProjet: string; proposeesPar: Record<string, number>; peutOuvrir: boolean; ouvrir: () => void }) {
  const tries = [...permis].sort((a, b) => b.cree_le.localeCompare(a.cree_le));
  return (
    <section className="pca-carte" aria-labelledby="pca-permis-titre">
      <div className="pca-carte-tete">
        <h3 id="pca-permis-titre">Permis du projet</h3>
        <p>Chaque permis a sa page : le délai d&apos;instruction, les courriers de la mairie, la décision et les recours, jusqu&apos;à la purge.</p>
      </div>
      {tries.length ? (
        <ul className="pca-rangees">
          {tries.map((p) => {
            const e = ETATS[p.etat] ?? ETATS.a_deposer;
            const n = proposeesPar[p.id] ?? 0;
            const prochaine = prochaineDate(p);
            const sous = [p.numero, prochaine ? `prochaine étape le ${jour(prochaine)}` : p.date_depot ? `déposé le ${jour(p.date_depot)}` : "pas encore déposé"].filter(Boolean).join(" · ");
            return (
              <li key={p.id}>
                <Link href={`${BASE}/permis/${p.id}`} className="pca-rangee">
                  <FileText className="pca-rangee-icone" aria-hidden="true" />
                  <span className="pca-rangee-texte">
                    <span className="pca-rangee-titre">{titrePermis(p, nomProjet)}</span>
                    <span className="pca-rangee-sous">{sous}</span>
                  </span>
                  <span className="pca-pastilles">
                    {n ? (
                      <span className="pca-pastille" data-teinte="jaune">
                        {n} date{n > 1 ? "s" : ""} à confirmer
                      </span>
                    ) : null}
                    <span className="pca-pastille">{TYPES[p.type_autorisation].court}</span>
                    <span className="pca-pastille" data-teinte={teinteLin(e.teinte)} title={e.libelle}>
                      {e.court}
                    </span>
                  </span>
                  <ChevronRight className="pca-chevron" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="pca-vide pca-vide--carte">
          <span className="pca-vide-icone" aria-hidden="true">
            <FileText />
          </span>
          <div className="pca-vide-texte">
            <p className="pca-vide-titre">Aucun permis pour ce projet</p>
            <p>Saisissez le permis, ou déposez le récépissé de la mairie depuis la partie Projet : le calendrier se calcule.</p>
          </div>
        </div>
      )}
      <button type="button" className="pca-rangee pca-rangee--action" disabled={!peutOuvrir} onClick={ouvrir}>
        <Plus className="pca-rangee-icone" aria-hidden="true" />
        <span className="pca-rangee-texte">
          <span className="pca-rangee-titre">Ouvrir un permis</span>
        </span>
        <ChevronRight className="pca-chevron" aria-hidden="true" />
      </button>
    </section>
  );
}
