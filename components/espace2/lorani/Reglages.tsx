"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI — les réglages d'un projet (29/10/2026, refonte des pages métiers)

   Settings › Team de Linear, au 1:1 : relevé docs/refonte-metiers/releves/
   linear-team-settings.md (29/10 et 01/11, sombre et clair), mesures dans
   ./lor-reglages.css (préfixe lor-rg-, jetons de Linear de ./lor.css,
   02/11), icônes du sprite de Linear.

   Ce qui se règle une fois par projet, ou rarement (inventaire lorani.md,
   § 8.2 « Réglage », et DECOUPAGES.md) : l'équipe, les lots, les
   intervenants (B20-B22) ; le régime de chaque permis (F12) ; le réglage
   des contrôles et le décideur (F17, F18) ; les éléments de mission
   (F22) ; les marchés et leur délai d'exécution (F24, F35) ; l'ouverture
   du chantier et les activités requises par lot (F42, F41).

   Comme Linear range ses réglages par équipe, ceux-ci sont rangés par
   projet : sans « ?projet= », la page liste les projets (Settings › Teams) ;
   avec, elle montre une rangée par réglage, sa valeur actuelle, et mène
   au geste. Chaque fenêtre vit dans la carte qui la porte (PermisVue,
   Controle, Honoraires, Chantier, OrdresService, Assurances, et la carte
   du projet) : la rangée mène à la page qui montre cette carte, à la bonne
   partie — le permis (/permis/<id>), le projet (/projets/<id>?partie=
   equipe | controle | chantier | assurances), les honoraires
   (/honoraires?projet=<id>). Rien n'est écrit depuis cette page : mêmes
   portes, mêmes droits, là où elles sont.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { dateCourte, montant } from "@/components/espace/format";
import { PHASES, ROLES_PROJET, libelleActivite, titrePermis } from "@/components/espace/lorani/etats";
import type { Permis, Projet } from "@/components/espace/lorani/types";
import { RACINE } from "../modules";
import { useLorani } from "./donnees";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { dossierDate } from "@/components/espace/lorani/dossier-date";
import { oublier } from "./lor-local";
import { useToast } from "../Toasts";
import { IconeLin, IconeSprite } from "./lor-icones";
import type { NomIcone } from "./lor-sprite";
import "./lor.css";
import "./lor-reglages.css";

const Icone = ({ nom }: { nom: NomIcone }) => <IconeSprite nom={nom} />;

const BASE = `${RACINE}/lorani`;

const pluriel = (n: number, un: string, plusieurs = `${un}s`) => `${n} ${n > 1 ? plusieurs : un}`;
const date = (iso: string) => dateCourte(`${iso}T12:00:00`);
const versProjet = (id: string, partie: string) => `${BASE}/projets/${encodeURIComponent(id)}?partie=${partie}`;

/* les cases du régime (F12), dans l'ordre de la fenêtre */
const CASES: { cle: "secteur_protege" | "immeuble_inscrit_mh" | "erp_autorisation" | "igh" | "evaluation_environnementale"; court: string }[] = [
  { cle: "secteur_protege", court: "Secteur protégé" },
  { cle: "immeuble_inscrit_mh", court: "Monument historique" },
  { cle: "erp_autorisation", court: "ERP" },
  { cle: "igh", court: "IGH" },
  { cle: "evaluation_environnementale", court: "Évaluation environnementale" },
];
const regimeDe = (p: Permis) => {
  const l = CASES.filter((c) => p[c.cle]).map((c) => c.court);
  if (p.cas_rejet.length) l.push(pluriel(p.cas_rejet.length, "cas de rejet", "cas de rejet"));
  return l.length ? l.join(", ") : "Droit commun";
};

type RangeeP = { href?: string; icone?: React.ReactNode; nom: string; desc?: string; valeur?: string; teinte?: string };

/* une rangée de 65 : case icône, titre et description, valeur, chevron ; sans lien, ni chevron ni survol */
function Rangee({ href, icone, nom, desc, valeur, teinte }: RangeeP) {
  const corps = (
    <>
      {icone ? <figure className="lor-rg-case" aria-hidden="true">{icone}</figure> : null}
      <span className="lor-rg-textes">
        <span className="lor-rg-nom">{nom}</span>
        {desc ? <span className="lor-rg-desc">{desc}</span> : null}
      </span>
      <span className="lor-rg-droite">
        {valeur ? (
          <span className="lor-rg-valeur" data-teinte={teinte}>
            {valeur}
          </span>
        ) : null}
        {href ? <IconeLin nom="chevronBas" className="lor-rg-chevron" /> : null}
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="lor-rg-rangee">
          {corps}
        </Link>
      ) : (
        <div className="lor-rg-rangee">{corps}</div>
      )}
    </li>
  );
}

function Section({ titre, children }: { titre?: string; children: React.ReactNode }) {
  return (
    <section className="lor-rg-section" aria-label={titre}>
      {titre ? <h3 className="lor-rg-h3">{titre}</h3> : null}
      <ul className="lor-rg-carte">{children}</ul>
    </section>
  );
}

export default function Reglages() {
  const { source, pret, erreur, dossier, nommer } = useLorani();
  const params = useSearchParams();
  const chemin = usePathname();
  const id = params.get("projet");

  const projets = useMemo(() => [...dossier.projets].sort((a, b) => a.nom.localeCompare(b.nom, "fr")), [dossier.projets]);
  /* pendant la lecture de la base réelle, le dossier est encore celui de l'exemple : on attend */
  const projet = id && pret ? (dossier.projets.find((p) => p.id === id) ?? null) : null;

  const barre = (
    <div className="lor-rg-barre">
      <Link href={projet ? `${BASE}/reglages` : BASE} className="lor-rg-retour">
        <IconeLin nom="chevronBas" />
        {projet ? "Projets" : "Permis"}
      </Link>
    </div>
  );
  const note =
    erreur && source === "reelle" ? (
      <p className="lor-rg-note" role="alert">
        La base réelle n&apos;a pas répondu. {erreur}
      </p>
    ) : null;

  /* ——— sans projet choisi : la liste des projets ——— */
  if (!projet) {
    return (
      <div className="lor lor-rg">
        <h1 className="v2-sr">Réglages des projets</h1>
        {barre}
        <div className="lor-rg-zone">
          <div className="lor-rg-colonne">
            <div className="lor-rg-tete">
              <h2 className="lor-rg-titre">Réglages</h2>
              <div className="lor-rg-sous">
                <p className="lor-rg-aide">{id && pret ? "Ce projet n'existe pas ou vous n'y avez pas accès. Choisissez-en un." : "Choisissez un projet : régime des permis, contrôles, honoraires, marchés et assurances."}</p>
              </div>
            </div>
            {note}
            <div className="lor-rg-sections">
              {!pret ? (
                <p className="lor-rg-vide" role="status">
                  Lecture de vos projets…
                </p>
              ) : projets.length === 0 ? (
                <p className="lor-rg-vide">Aucun projet. Ouvrez-en un depuis la liste des permis : ses réglages s&apos;afficheront ici.</p>
              ) : (
                <Section>
                  {projets.map((p) => {
                    const n = dossier.permis.filter((x) => x.projet_id === p.id).length;
                    return (
                      <Rangee
                        key={p.id}
                        href={`${chemin}?projet=${encodeURIComponent(p.id)}`}
                        icone={<Icone nom="Project" />}
                        nom={p.nom}
                        desc={[p.reference, p.commune, PHASES[p.phase]].filter(Boolean).join(" · ")}
                        valeur={n ? pluriel(n, "permis", "permis") : "Sans permis"}
                      />
                    );
                  })}
                </Section>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <ReglagesProjet projet={projet} barre={barre} note={note} nommer={nommer} />;
}

function ReglagesProjet({ projet, barre, note, nommer }: { projet: Projet; barre: React.ReactNode; note: React.ReactNode; nommer: (id: string | null | undefined) => string }) {
  const { dossier } = useLorani();
  const toast = useToast();
  const [oubli, setOubli] = useState(false);
  const pid = projet.id;

  const membres = dossier.membres.filter((m) => m.projet_id === pid);
  const chef = membres.find((m) => m.role_projet === "chef_projet");
  const lots = dossier.lots.filter((l) => l.projet_id === pid).sort((a, b) => a.numero.localeCompare(b.numero, "fr", { numeric: true }));
  const intervenants = dossier.intervenants.filter((i) => i.projet_id === pid && i.actif);
  const permis = dossier.permis.filter((p) => p.projet_id === pid).sort((a, b) => a.cree_le.localeCompare(b.cree_le));
  const dernier = dossier.controles.filter((c) => c.projet_id === pid).sort((a, b) => b.cree_le.localeCompare(a.cree_le))[0] ?? null;
  const tolerances = Object.keys(projet.controle_tolerances ?? {}).length;
  const coupees = (projet.controle_familles_coupees ?? []).length;
  const honoraires = dossier.honoraires.filter((h) => h.projet_id === pid);
  const totalHonoraires = honoraires.reduce((s, h) => s + h.montant_ht, 0);
  const marches = dossier.marches.filter((m) => m.projet_id === pid && m.actif);
  const lotDe = (lotId: string) => lots.find((l) => l.id === lotId);

  const sous = [projet.reference, projet.adresse, [projet.code_postal, projet.commune].filter(Boolean).join(" ")].filter(Boolean).join(" · ");

  return (
    <div className="lor lor-rg">
      <h1 className="v2-sr">Réglages du projet {projet.nom}</h1>
      {barre}
      <div className="lor-rg-zone">
        <div className="lor-rg-colonne">
          <div className="lor-rg-tete">
            <h2 className="lor-rg-titre">{projet.nom}</h2>
            <div className="lor-rg-sous">
              <p className="lor-rg-aide">{sous || "Réglages du projet"}</p>
              <Link href={`${BASE}/projets/${encodeURIComponent(pid)}`} className="lor-rg-bouton">
                Ouvrir le projet
                <IconeLin nom="chevronBas" />
              </Link>
            </div>
          </div>
          {note}

          <div className="lor-rg-sections">
            {/* B20-B22 : l'équipe, les lots, les intervenants (F6, F4, F5) */}
            <Section>
              <Rangee
                href={versProjet(pid, "equipe")}
                icone={<Icone nom="Members" />}
                nom="Équipe"
                desc="Le chef de projet reçoit les rappels et la ligne du point du matin."
                valeur={chef ? `${ROLES_PROJET.chef_projet} : ${nommer(chef.user_id)}` : membres.length ? pluriel(membres.length, "membre") : "Personne"}
                teinte={chef ? undefined : "jaune"}
              />
              <Rangee href={versProjet(pid, "equipe")} icone={<Icone nom="Brick" />} nom="Lots" desc="Ils servent aux consultations, aux marchés, aux réserves, au DOE et aux assurances." valeur={lots.length ? pluriel(lots.length, "lot") : "Aucun"} />
              <Rangee href={versProjet(pid, "equipe")} icone={<Icone nom="Users" />} nom="Intervenants" desc="Maître d'ouvrage, bureaux d'études, contrôleur, entreprises, et leur lot." valeur={intervenants.length ? pluriel(intervenants.length, "intervenant") : "Aucun"} />
            </Section>

            {/* F12 : le régime de chaque permis, sur la page du permis */}
            <Section titre="Permis">
              {permis.length ? (
                permis.map((p) => (
                  <Rangee
                    key={p.id}
                    href={`${BASE}/permis/${encodeURIComponent(p.id)}`}
                    icone={<Icone nom="Page" />}
                    nom={`Régime · ${titrePermis(p, projet.nom)}`}
                    desc={p.calcul?.regime ? `Règle ${p.calcul.regime.regle_instruction} · sans réponse de la mairie : ${p.calcul.regime.effet_silence}` : "Secteur protégé, monument historique, ERP, IGH, évaluation environnementale, cas de rejet."}
                    valeur={p.actif ? regimeDe(p) : "Permis inactif"}
                  />
                ))
              ) : (
                <Rangee icone={<Icone nom="Page" />} nom="Aucun permis saisi" desc="Le régime se règle sur chaque permis, une fois saisi depuis le projet." />
              )}
            </Section>

            {/* F17, F18 : la carte « Contrôle du dossier » du projet */}
            <Section titre="Contrôle du dossier">
              <Rangee
                href={versProjet(pid, "controle")}
                icone={<Icone nom="Gears" />}
                nom="Régler les contrôles"
                desc="L'écart toléré par grandeur, et les familles de contrôle qui ne tournent pas."
                valeur={[tolerances ? `${pluriel(tolerances, "tolérance propre", "tolérances propres")}` : "Tolérances du code", coupees ? pluriel(coupees, "famille coupée", "familles coupées") : null].filter(Boolean).join(" · ")}
              />
              <Rangee
                href={versProjet(pid, "controle")}
                icone={<Icone nom="Judge" />}
                nom="Qui décide des constats"
                desc={dernier ? `Sur le dernier contrôle, « ${dernier.intitule} » (indice ${dernier.indice}). Le gérant et les admins gardent la main.` : "Se choisit sur un contrôle, une fois celui-ci préparé."}
                valeur={!dernier ? "Aucun contrôle" : dernier.decideur ? nommer(dernier.decideur) : "Toute l'équipe"}
              />
            </Section>

            {/* F22 : les éléments de mission, sur la page des honoraires */}
            <Section titre="Honoraires">
              <Rangee
                href={`${BASE}/honoraires?projet=${encodeURIComponent(pid)}`}
                icone={<Icone nom="Euro" />}
                nom="Éléments de mission"
                desc="Les honoraires et les heures prévues par élément ; le temps passé s'y compare."
                valeur={honoraires.length ? `${pluriel(honoraires.length, "élément")} · ${montant(totalHonoraires)} HT` : "Aucun"}
              />
            </Section>

            {/* F24, F35 : les marchés de travaux et leur délai d'exécution */}
            <Section titre="Chantier">
              <Rangee
                href={versProjet(pid, "chantier")}
                icone={<Icone nom="Signature" />}
                nom="Marchés de travaux"
                desc="Un marché par lot : titulaire, montant, avenants, retenue, avance, pénalité de retard."
                valeur={marches.length ? pluriel(marches.length, "marché") : "Aucun"}
              />
              {marches.map((m) => {
                const l = lotDe(m.lot_id);
                return (
                  <Rangee
                    key={m.id}
                    href={versProjet(pid, "chantier")}
                    icone={<Icone nom="Stopwatch" />}
                    nom={`Délai d'exécution · ${l ? `lot ${l.numero}, ${l.intitule}` : "lot"}`}
                    desc={`${m.titulaire} · ${montant(m.montant_ht)} HT. Avec l'ordre de service de démarrage, il fixe la fin contractuelle.`}
                    valeur={m.delai_execution_jours ? pluriel(m.delai_execution_jours, "jour") : "Non saisi"}
                  />
                );
              })}
            </Section>

            {/* F42, F41 : l'ouverture du chantier et les activités requises par lot */}
            <Section titre="Assurances">
              <Rangee
                href={versProjet(pid, "assurances")}
                icone={<Icone nom="Calendar" />}
                nom="Ouverture du chantier"
                desc="La date que les décennales des entreprises doivent couvrir."
                valeur={projet.ouverture_chantier ? date(projet.ouverture_chantier) : "Non saisie"}
              />
              {lots.map((l) => (
                <Rangee
                  key={l.id}
                  href={versProjet(pid, "assurances")}
                  icone={<Icone nom="Shield" />}
                  nom={`Activités du lot ${l.numero} · ${l.intitule}`}
                  desc={l.activites_requises.length ? l.activites_requises.map(libelleActivite).join(", ") : "Aucune activité requise : la décennale n'est pas comparée au lot."}
                  valeur={l.activites_requises.length ? pluriel(l.activites_requises.length, "activité") : "Aucune"}
                />
              ))}
            </Section>

            {/* la « Danger zone » de Linear : ce qu'on fait rarement, d'un geste ; rien n'y efface la base */}
            <section className="lor-rg-section" aria-label="Zone sensible">
              <h3 className="lor-rg-h3">Zone sensible</h3>
              <ul className="lor-rg-carte">
                <li>
                  <div className="lor-rg-rangee">
                    <span className="lor-rg-textes">
                      <span className="lor-rg-nom">Exporter le dossier daté</span>
                      <span className="lor-rg-desc">Registre PDF et Excel (une feuille par lot), dans une archive : la preuve datée de ce qui a été reçu, visé et décidé.</span>
                    </span>
                    <button
                      type="button"
                      className="lor-rg-danger"
                      onClick={() => {
                        try {
                          const r = dossierDate(projet, dossier, nommer);
                          const url = URL.createObjectURL(new Blob([r.octets as BlobPart], { type: "application/zip" }));
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = r.nom;
                          a.click();
                          window.setTimeout(() => URL.revokeObjectURL(url), 1000);
                        } catch (e) {
                          toast(e instanceof Error ? e.message : "Le dossier daté n'a pas pu être fabriqué.", "rouge");
                        }
                      }}
                    >
                      Exporter…
                    </button>
                  </div>
                </li>
                <li>
                  <div className="lor-rg-rangee">
                    <span className="lor-rg-textes">
                      <span className="lor-rg-nom">Oublier les épingles, suivis et reports</span>
                      <span className="lor-rg-desc">Ce que ce navigateur garde pour ce projet et ses permis (étoile, cloche, Reporter). La base n&apos;est pas touchée.</span>
                    </span>
                    <button type="button" className="lor-rg-danger" onClick={() => setOubli(true)}>
                      Oublier…
                    </button>
                  </div>
                </li>
                <li>
                  <div className="lor-rg-rangee">
                    <span className="lor-rg-textes">
                      <span className="lor-rg-nom">Ouvrir l&apos;écran d&apos;avant</span>
                      <span className="lor-rg-desc">Le dossier du projet tel qu&apos;il était avant la refonte, le temps de la recette.</span>
                    </span>
                    <Link href={`${BASE}?ancien=1&projet=${encodeURIComponent(pid)}`} className="lor-rg-danger">
                      Ouvrir…
                    </Link>
                  </div>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>
      <Dialog open={oubli} onOpenChange={setOubli}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Oublier les épingles, suivis et reports de « {projet.nom} » ?</DialogTitle>
            <DialogDescription>Le projet et ses {pluriel(permis.length, "permis", "permis")} quittent la section « Épinglés », ne sont plus suivis dans le Courrier et reviennent dans leurs listes. Rien n&apos;est effacé en base.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="r-btn r-btn--noir"
              onClick={() => {
                oublier([`projet:${pid}`, ...permis.map((x) => `permis:${x.id}`)]);
                setOubli(false);
                toast("Épingles, suivis et reports de ce projet oubliés dans ce navigateur.");
              }}
            >
              Oublier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
