"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Chantiers (29/10/2026) : la page Projects de Linear en
   affichage « Timeline », au 1:1 (relevé : docs/refonte-metiers/releves/
   linear-timeline.md ; la frise : ./Frise.tsx, ../lin/linear-timeline.css).

   Une ligne par chantier (useDaliro().liste, la même liste que l'écran de
   /espace, btp_liste_chantiers) : à gauche l'icône du statut, le nom, la
   santé (sa famille : bloqué, avenant à signer, passage à confirmer, en
   cours), l'avancement de l'étape, le maître d'ouvrage ; à droite la barre
   du début à la fin prévue, le lot en cours et le prochain passage (un
   losange de la teinte de sa confirmation). Sans dates, la ligne reste,
   sans barre, comme chez Linear.

   Ce que l'écran d'avant faisait, et où c'est ici (inventaire daliro.md) :
     B01  le titre, « Nouveau chantier » (F01, la même fenêtre que la Vue
          d'ensemble, G01 par useDaliro().creer, puis la fiche du nouveau
          chantier), la bascule exemple / réel (menu du cadre)
     B03  les compteurs → pastilles de la barre d'outils, une par famille,
          comptées comme le filtre (exclusives) ; le quota « x / quota »
          dans la barre du titre ; ?famille= garde le filtre (la Vue
          d'ensemble y renvoie)
     B07  l'erreur de la base réelle, sous la barre d'outils
     B08  la liste : triée par famille puis par nom ; la recherche par nom
          ou commune (le bouton Filtre) ; un clic ouvre la fiche
   Zoom de la frise : ?zoom=mois|trimestre|annee (Année par défaut, comme
   le relevé).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { HardHat, ListFilter, Plus, UserRound } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { RACINE } from "@/components/espace2/modules";
import { dateCourte } from "@/components/espace/format";
import { Avis } from "@/components/espace/ui";
import { CONFIRMATIONS, FAMILLES, STATUTS_CHANTIER, type Famille } from "@/components/espace/daliro/etats";
import { famille } from "@/components/espace/daliro/liste";
import type { Chantier, StatutChantier } from "@/components/espace/daliro/types";
import { Menu } from "../lin/Lin";
import { IconeSante, IconeStatutProjet, type EtatProjet, type Sante } from "../lin/icones";
import { useToast } from "../Toasts";
import { useDaliro, type NouveauChantier } from "./donnees";
import Frise, { estZoom, type LigneFrise, type TeinteFrise, type Zoom } from "./Frise";
import "@/components/espace/espace.css";

const MO_TYPES = [
  { cle: "professionnel", libelle: "Professionnel (promoteur, SCI, entreprise)" },
  { cle: "particulier", libelle: "Particulier" },
  { cle: "acheteur_public", libelle: "Acheteur public (commune, bailleur, État)" },
];
const PLACES = [
  { cle: "titulaire", libelle: "Titulaire du marché" },
  { cle: "cotraitant", libelle: "Cotraitant (groupement)" },
  { cle: "sous_traitant", libelle: "Sous-traitant d'une entreprise principale" },
];
const VIDE: NouveauChantier = { nom: "", reference: "", adresse: "", code_postal: "", commune: "", maitre_ouvrage_type: "professionnel", place_client: "titulaire", maitre_ouvrage_id: "" };

const ORDRE: Record<Famille, number> = { bloque: 0, a_signer: 1, a_confirmer: 2, ouvert: 3 };
const UNE: Record<Famille, string> = { bloque: "Bloqué", a_signer: "Avenant à signer", a_confirmer: "Passage à confirmer", ouvert: "En cours" };
const SANTE: Record<Famille, Sante> = { bloque: "hors", a_signer: "risque", a_confirmer: "risque", ouvert: "bien" };
const ETAT: Record<StatutChantier, EtatProjet> = { preparation: "planifie", ouvert: "en-cours", suspendu: "en-cours", receptionne: "fait", clos: "fait", annule: "annule" };
const teinteDe = (t: string): TeinteFrise => (t === "rouge" || t === "ambre" || t === "bleu" || t === "vert" ? t : "gris");
const estFamille = (v: string | null): v is Famille => v === "bloque" || v === "a_signer" || v === "a_confirmer" || v === "ouvert";
const jjmm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const initiales = (nom: string) =>
  nom
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/)
    .filter((m) => m.length > 1 || /\p{Lu}/u.test(m))
    .slice(0, 2)
    .map((m) => m[0]?.toUpperCase() ?? "")
    .join("");
const jourLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
};

/* l'avancement de l'étape : un anneau de 16, rempli à proportion */
function Avancement({ pct }: { pct: number | null }) {
  const r = 6;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeOpacity="0.3" strokeWidth="2" />
      {pct ? <circle cx="8" cy="8" r={r} fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={`${(c * Math.min(100, pct)) / 100} ${c}`} transform="rotate(-90 8 8)" strokeLinecap="round" /> : null}
    </svg>
  );
}

export default function Chantiers() {
  const { source, pret, erreur, liste, quota, maitresOuvrage, creer } = useDaliro();
  const toast = useToast();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const [q, setQ] = useState("");
  const aujourdhui = useMemo(() => jourLocal(), []);

  const filtre = estFamille(params.get("famille")) ? (params.get("famille") as Famille) : null;
  const zParam = params.get("zoom");
  const zoom: Zoom = estZoom(zParam) ? zParam : "annee";
  const lien = (modif: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(modif)) {
      if (v === null) p.delete(k);
      else p.set(k, v);
    }
    const s = p.toString();
    return `${chemin}${s ? `?${s}` : ""}`;
  };

  const tries = useMemo(
    () =>
      [...liste].sort((a, b) => {
        const fa = famille(a);
        const fb = famille(b);
        return (fa ? ORDRE[fa] : 9) - (fb ? ORDRE[fb] : 9) || a.nom.localeCompare(b.nom, "fr");
      }),
    [liste],
  );
  const comptes = useMemo(() => {
    const c: Record<Famille, number> = { bloque: 0, a_signer: 0, a_confirmer: 0, ouvert: 0 };
    for (const ch of liste) {
      const f = famille(ch);
      if (f) c[f]++;
    }
    return c;
  }, [liste]);
  /* F01 : nouveau chantier, la fenêtre de la Vue d'ensemble (G01) */
  const [nouveau, setNouveau] = useState(params.get("nouveau") === "1");
  const [envoi, setEnvoi] = useState(false);
  const [erreurNouveau, setErreurNouveau] = useState<string | null>(null);
  const [f, setF] = useState<NouveauChantier>(VIDE);
  const ouvrirNouveau = () => {
    setErreurNouveau(null);
    setF(VIDE);
    setNouveau(true);
  };
  const complet = f.nom.trim().length > 0 && /^[0-9]{5}$/.test(f.code_postal) && f.commune.trim().length > 0;
  const lancerCreation = async () => {
    setEnvoi(true);
    setErreurNouveau(null);
    try {
      const id = await creer(f);
      toast(`C'est fait. ${f.nom.trim()} est créé, en préparation : posez ses lots, son marché, puis ouvrez-le.`, "vert");
      setNouveau(false);
      routeur.push(`${RACINE}/daliro/chantiers/${encodeURIComponent(id)}`);
    } catch (e) {
      setErreurNouveau(e instanceof Error ? e.message : "La création a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  const ouverts = liste.filter((c) => c.statut === "ouvert" || c.statut === "suspendu").length;

  const recherche = q.trim().toLocaleLowerCase("fr");
  const visibles = tries.filter((c) => (!filtre || famille(c) === filtre) && (!recherche || `${c.nom} ${c.commune} ${c.code_postal} ${c.reference ?? ""}`.toLocaleLowerCase("fr").includes(recherche)));

  const ligne = (c: Chantier): LigneFrise => {
    const f = famille(c);
    const statut = STATUTS_CHANTIER[c.statut];
    const sante = f ? UNE[f] : statut.libelle;
    const pct = c.etape && c.etape.etapes ? c.etape.avancement_pct : null;
    const p = c.prochain_passage;
    const conf = p ? CONFIRMATIONS[p.confirmation] : null;
    const lot = c.etape?.lot_libelle ?? null;
    const passage = p ? `Prochain passage le ${dateCourte(p.debut)}${p.intervenant_nom ? `, ${p.intervenant_nom}` : ""}${p.tache ? ` (${p.tache})` : ""} · ${conf?.libelle.toLowerCase()}` : "Aucun passage prévu";
    const meta = [lot, p ? `passage le ${jjmm(p.debut)}` : null].filter(Boolean).join(" · ");
    return {
      cle: c.id,
      icone: <IconeStatutProjet etat={ETAT[c.statut]} />,
      teinteIcone: teinteDe(statut.teinte),
      nom: c.nom,
      href: `${RACINE}/daliro/chantiers/${encodeURIComponent(c.id)}`,
      pilule: lot ?? (p ? `Passage le ${jjmm(p.debut)}` : undefined),
      ronds: (
        <>
          <span className="ltl-rond" data-teinte={f ? FAMILLES.find((x) => x.cle === f)?.teinte : "gris"} title={`Santé : ${sante}`} aria-label={`Santé : ${sante}`} role="img">
            <IconeSante etat={f ? SANTE[f] : "neutre"} />
          </span>
          <span className="ltl-rond" data-teinte={pct === null ? "gris" : pct === 100 ? "vert" : "ambre"} title={pct === null ? "Avancement : aucun lot posé" : `Avancement : ${pct} %${lot ? `, ${lot}` : ""}`} aria-label={pct === null ? "Avancement : aucun lot posé" : `Avancement : ${pct} %`} role="img">
            <Avancement pct={pct} />
          </span>
          <span className="ltl-rond" data-liste="non" title={c.maitre_ouvrage_nom ? `Maître d'ouvrage : ${c.maitre_ouvrage_nom}` : "Maître d'ouvrage à désigner"} aria-label={c.maitre_ouvrage_nom ? `Maître d'ouvrage : ${c.maitre_ouvrage_nom}` : "Maître d'ouvrage à désigner"} role="img">
            {c.maitre_ouvrage_nom ? <span className="ltl-avatar">{initiales(c.maitre_ouvrage_nom) || "?"}</span> : <UserRound aria-hidden="true" />}
          </span>
        </>
      ),
      barres:
        c.date_debut || c.date_fin_prevue
          ? [
              {
                cle: c.id,
                debut: c.date_debut,
                fin: c.date_fin_prevue,
                libelle: c.nom,
                meta: meta || undefined,
                titre: `${c.nom}, ${c.date_debut ? `du ${dateCourte(c.date_debut)}` : "sans date de début"} ${c.date_fin_prevue ? `au ${dateCourte(c.date_fin_prevue)}` : "sans fin prévue"}${lot ? ` · lot en cours : ${lot}` : ""} · ${passage}`,
                href: `${RACINE}/daliro/chantiers/${encodeURIComponent(c.id)}`,
                jalon: p && conf ? { jour: p.debut, teinte: teinteDe(conf.teinte), titre: passage } : null,
              },
            ]
          : [],
    };
  };

  const vide = !pret ? (
    <p className="lin-vide">Lecture des chantiers…</p>
  ) : liste.length === 0 ? (
    <p className="lin-vide">
      Aucun chantier.{" "}
      <button type="button" className="lin-voir-tout" style={{ marginTop: 0 }} onClick={ouvrirNouveau}>
        Créez votre premier chantier
      </button>{" "}
      : son nom, son adresse, son maître d&apos;ouvrage.
    </p>
  ) : (
    <p className="lin-vide">{recherche ? "Aucun chantier ne correspond à la recherche." : "Rien dans cette famille."}</p>
  );

  return (
    <div className="lin">
      <h1 className="v2-sr">Chantiers</h1>
      <header className="lin-tete">
        <span className="lin-tete-titre">Chantiers</span>
        <div className="lin-tete-droite">
          {quota ? (
            <span className="lin-position" title="Chantiers ouverts ou suspendus, sur le quota de la formule">
              {ouverts} / {quota} ouverts
            </span>
          ) : null}
          <button type="button" className="v2-btn v2-btn--petit" onClick={ouvrirNouveau}>
            <Plus width={14} height={14} aria-hidden="true" />
            <span>Nouveau chantier</span>
          </button>
        </div>
      </header>

      <div className="lin-outils">
        <nav className="lin-onglets" aria-label="Familles de chantiers">
          <Link href={lien({ famille: null })} className="v2-btn v2-btn--petit" data-actif={!filtre ? "" : undefined} aria-current={!filtre ? "page" : undefined} scroll={false}>
            Tous les chantiers <span className="ltl-compte">{liste.length}</span>
          </Link>
          {FAMILLES.map((fa) => (
            <Link
              key={fa.cle}
              href={lien({ famille: filtre === fa.cle ? null : fa.cle })}
              className="v2-btn v2-btn--petit"
              data-actif={filtre === fa.cle ? "" : undefined}
              aria-current={filtre === fa.cle ? "page" : undefined}
              title={fa.sous}
              scroll={false}
            >
              {fa.libelle} <span className="ltl-compte">{comptes[fa.cle]}</span>
            </Link>
          ))}
        </nav>
        <div className="lin-outils-droite">
          <Menu
            largeur={280}
            bouton={(ouvert, basculer) => (
              <button type="button" className="v2-btn v2-btn--petit v2-btn--icone" aria-label="Rechercher un chantier" title="Rechercher un chantier" aria-expanded={ouvert} aria-pressed={!!recherche} onClick={basculer}>
                <ListFilter width={14} height={14} aria-hidden="true" />
              </button>
            )}
          >
            {(fermer) => (
              <input
                className="lin-menu-champ"
                autoFocus
                placeholder="Nom, commune ou code postal…"
                aria-label="Rechercher un chantier par nom ou commune"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape") && fermer()}
              />
            )}
          </Menu>
        </div>
      </div>

      {erreur && source === "reelle" ? (
        <p className="ltl-note" data-teinte="rouge" role="alert">
          La base réelle n&apos;a pas répondu. {erreur}
        </p>
      ) : null}
      {recherche ? (
        <p className="ltl-note" role="status">
          {visibles.length} chantier{visibles.length > 1 ? "s" : ""} pour « {q.trim()} ».{" "}
          <button type="button" className="lin-voir-tout" style={{ marginTop: 0 }} onClick={() => setQ("")}>
            Effacer
          </button>
        </p>
      ) : null}

      <Frise libelle="Frise des chantiers" lignes={pret ? visibles.map(ligne) : []} zoom={zoom} onZoom={(z) => routeur.replace(lien({ zoom: z === "annee" ? null : z }), { scroll: false })} aujourdhui={aujourdhui} vide={vide} />

      <Dialog open={nouveau} onOpenChange={(o) => !o && setNouveau(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <HardHat width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Nouveau chantier</DialogTitle>
            <DialogDescription>Le chantier naît en préparation. Le département, le territoire et le régime de TVA se déduisent du code postal ; une entité « site » lui est ouverte.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Nom <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} placeholder="Résidence Les Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Référence interne
                  <input className="rv-champ" value={f.reference} onChange={(e) => setF({ ...f, reference: e.target.value })} placeholder="TIL-2026" />
                </label>
                <label className="rv-libelle">
                  Code postal <span className="esp-obligatoire">(obligatoire)</span>
                  <input className="rv-champ" inputMode="numeric" value={f.code_postal} onChange={(e) => setF({ ...f, code_postal: e.target.value.replace(/\D/g, "").slice(0, 5) })} placeholder="69100" />
                </label>
              </div>
              <label className="rv-libelle">
                Commune <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={f.commune} onChange={(e) => setF({ ...f, commune: e.target.value })} placeholder="Villeurbanne" />
              </label>
              <label className="rv-libelle">
                Adresse
                <input className="rv-champ" value={f.adresse} onChange={(e) => setF({ ...f, adresse: e.target.value })} placeholder="14 rue des Tilleuls" />
              </label>
              <div className="esp-form-ligne">
                <label className="rv-libelle">
                  Maître d&apos;ouvrage
                  <select className="rv-champ" value={f.maitre_ouvrage_type} onChange={(e) => setF({ ...f, maitre_ouvrage_type: e.target.value })}>
                    {MO_TYPES.map((o) => (
                      <option key={o.cle} value={o.cle}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="rv-libelle">
                  Notre place
                  <select className="rv-champ" value={f.place_client} onChange={(e) => setF({ ...f, place_client: e.target.value })}>
                    {PLACES.map((o) => (
                      <option key={o.cle} value={o.cle}>
                        {o.libelle}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="rv-libelle">
                Qui signe (annuaire, rôle maître d&apos;ouvrage)
                <select className="rv-champ" value={f.maitre_ouvrage_id} onChange={(e) => setF({ ...f, maitre_ouvrage_id: e.target.value })}>
                  <option value="">À désigner plus tard (le chantier ne pourra pas s&apos;ouvrir sans lui)</option>
                  {maitresOuvrage.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nom}
                    </option>
                  ))}
                </select>
              </label>
              {erreurNouveau ? (
                <Avis teinte="rouge" role="alert">
                  {erreurNouveau}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!complet || envoi} onClick={lancerCreation}>
              {envoi ? <Loader variant="spin" /> : null} Créer le chantier
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
