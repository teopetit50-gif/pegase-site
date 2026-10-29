"use client";

/* ══════════════════════════════════════════════════════════════════════
   Avenants et situations — DALIRO, tous chantiers (29/10/2026)

   La page « Broadcasts » de Plain au 1:1 (relevé :
   docs/refonte-metiers/releves/plain-broadcasts.md, mesures :
   ../lin/plain-broadcasts.css). Deux familles en tête, gardées dans
   l'adresse (?vue=situations) :
     · les avenants (B20) en onglets d'état — Brouillons, À signer (avec
       l'état de leur demande de validation), Signés, Refusés et abandonnés ;
     · les situations de travaux (B22) — Brouillons, Soumises, Validées,
       Refusées et annulées.
   Un clic sur une ligne (ou l'aiguillage : ?avenant=<id>, ?situation=<id>)
   ouvre la page de l'élément, au format d'un brouillon de Plain : le
   contenu à gauche, ses propriétés dans le volet de droite.

   Les gestes ne sont pas réécrits : la colonne de contenu monte la carte de
   l'écran d'avant, habillée (ChantierVue, sections « avenants » ou
   « situations »), sur le tableau du chantier réduit à l'élément ouvert —
   avec ses fenêtres (chiffrer, soumettre, signer, faire signer sur place,
   abandonner, resoumettre ; avancer, soumettre, valider, annuler, noter un
   paiement). En exemple, ce qu'elle renvoie est refondu dans le tableau
   complet du chantier avant d'être gardé (onLocal).

   Données : useDaliro() (./donnees) ; en base réelle, les tableaux de tous
   les chantiers sont lus à l'arrivée (demanderTous).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  FileSignature,
  FileSpreadsheet,
  FileText,
  HardHat,
  Mail,
  MapPin,
  MessageSquare,
  Mic,
  PencilLine,
  Send,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import ChantierVue from "@/components/espace/daliro/ChantierVue";
import { STATUTS_AVENANT, STATUTS_CHANTIER } from "@/components/espace/daliro/etats";
import { encaissement } from "@/components/espace/daliro/situations";
import type { Avenant, Situation, StatutAvenant, StatutSituation, Tableau } from "@/components/espace/daliro/types";
import { dateCourte, montant, pourcent, relatif } from "@/components/espace/format";
import type { Teinte } from "@/components/espace/ui";
import Habille from "@/components/espace2/Habille";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";
import { useAdresse } from "../lin/ListeFils";
import { MenuLigne } from "../lin/ListeRegles";
import { useDaliro } from "./donnees";
import "../lin/lin.css";
import "../lin/plain-broadcasts.css";

const CHEMIN = `${RACINE}/daliro/avenants`;
const fiche = (id: string) => `${RACINE}/daliro/chantiers/${id}`;
const aujourdhui = () => new Date().toISOString().slice(0, 10);

type Vue = "avenants" | "situations";
type Onglet<S> = { cle: string; libelle: string; icone: LucideIcon; statuts: S[]; vide: string };

const ONGLETS_AVENANT: Onglet<StatutAvenant>[] = [
  { cle: "brouillons", libelle: "Brouillons", icone: PencilLine, statuts: ["brouillon"], vide: "Un travail supplémentaire repéré (vocal, photo, visite) s'ouvre en avenant depuis la fiche de son chantier, puis se chiffre sur vos prix." },
  { cle: "a-signer", libelle: "À signer", icone: FileSignature, statuts: ["soumis"], vide: "Un avenant soumis attend ici sa validation, puis la signature du maître d'ouvrage." },
  { cle: "signes", libelle: "Signés", icone: CheckCircle2, statuts: ["signe"], vide: "Les avenants signés entrent dans l'engagé de leur lot." },
  { cle: "refuses", libelle: "Refusés et abandonnés", icone: XCircle, statuts: ["refuse", "abandonne"], vide: "Aucun avenant refusé ni abandonné." },
];
const ONGLETS_SITUATION: Onglet<StatutSituation>[] = [
  { cle: "brouillons", libelle: "Brouillons", icone: PencilLine, statuts: ["brouillon"], vide: "Une situation s'ouvre chaque mois depuis la fiche du chantier, sur son marché vérifié." },
  { cle: "soumises", libelle: "Soumises", icone: Send, statuts: ["soumise"], vide: "Une situation soumise attend ici sa validation dans « À valider »." },
  { cle: "validees", libelle: "Validées", icone: CheckCircle2, statuts: ["validee"], vide: "Les situations validées et leur encaissement s'affichent ici." },
  { cle: "refusees", libelle: "Refusées et annulées", icone: XCircle, statuts: ["refusee", "annulee"], vide: "Aucune situation refusée ni annulée." },
];

/* les libellés des situations : ceux de SituationsCarte (components/espace/daliro) */
const STATUTS_SITUATION: Record<StatutSituation, { libelle: string; teinte: Teinte }> = {
  brouillon: { libelle: "En préparation", teinte: "gris" },
  soumise: { libelle: "À valider", teinte: "bleu" },
  refusee: { libelle: "Refusée", teinte: "rouge" },
  validee: { libelle: "Validée", teinte: "vert" },
  annulee: { libelle: "Annulée", teinte: "gris" },
};

/* l'état de la demande de validation, avec les mots de l'écran d'avant */
const approuvee = (d: string | null | undefined) => d === "approuvee" || d === "executee";
function validationAvenant(a: Avenant): { libelle: string; teinte: Teinte } | null {
  if (a.statut !== "soumis") return null;
  if (approuvee(a.demande_statut)) return { libelle: "Validé : à signer", teinte: "vert" };
  if (a.demande_statut === "rejetee") return { libelle: "Refusé à la validation", teinte: "rouge" };
  return { libelle: "Dans « À valider »", teinte: "bleu" };
}
function validationSituation(s: Situation): { libelle: string; teinte: Teinte } | null {
  if (s.statut !== "soumise") return null;
  if (approuvee(s.demande_statut)) return { libelle: "Approuvée : à valider", teinte: "vert" };
  if (s.demande_statut === "rejetee") return { libelle: "Rejetée à la validation", teinte: "rouge" };
  return { libelle: "Dans « À valider »", teinte: "bleu" };
}

/* l'origine d'un avenant : le canal par lequel le travail supplémentaire est arrivé */
function origineDe(a: Avenant): { libelle: string; icone: LucideIcon } | null {
  const c = a.origine?.canal;
  if (!c) return null;
  if (c === "vocal") return { libelle: "Vocal", icone: Mic };
  if (c === "photo") return { libelle: "Photo", icone: Camera };
  if (c === "visite") return { libelle: "Visite", icone: MapPin };
  if (c === "courriel" || c === "email") return { libelle: "Courriel", icone: Mail };
  if (c === "reception") return { libelle: "Réserve", icone: ClipboardCheck };
  if (c === "message" || c === "whatsapp" || c === "sms" || c === "telegram") return { libelle: "Message", icone: MessageSquare };
  return { libelle: c === "autre" ? "Autre" : c.charAt(0).toUpperCase() + c.slice(1), icone: FileText };
}

/* la dernière date connue d'un élément (pas de date de modification en base) */
const plusRecente = (...isos: (string | null | undefined)[]) =>
  isos.filter((x): x is string => !!x && !Number.isNaN(new Date(x).getTime())).sort((x, y) => new Date(y).getTime() - new Date(x).getTime())[0] ?? null;
const temps = (iso: string | null) => (iso ? new Date(iso).getTime() : 0);
const modifAvenant = (a: Avenant) => plusRecente(a.signe_le, a.soumis_le, a.cree_le);
const modifSituation = (s: Situation) => plusRecente(...(s.paiements ?? []).map((p) => p.recu_le), s.validee_le, s.soumise_le, s.periode_fin);

/* ——— refondre dans le tableau complet ce que la carte renvoie sur le tableau réduit (exemple) ——— */
function fusionAvenant(complet: Tableau, id: string, onLocal: (t: Tableau) => void) {
  return (t: Tableau) => {
    const autres = complet.avenants.filter((x) => x.id !== id);
    const avenants = [...complet.avenants.map((x) => t.avenants.find((y) => y.id === x.id) ?? x), ...t.avenants.filter((y) => !complet.avenants.some((x) => x.id === y.id))];
    /* ChantierVue recalcule le déboursé sur les seuls avenants qu'on lui montre : on y rajoute les signés des autres */
    const debourse =
      t.debourse === complet.debourse
        ? t.debourse
        : t.debourse.map((d) => {
            const plus = autres.filter((x) => x.statut === "signe").flatMap((x) => x.lignes).filter((l) => l.lot_id === d.lot_id).reduce((s, l) => s + (l.montant_ht ?? 0), 0);
            return plus ? { ...d, engage_avenants_ht: (d.engage_avenants_ht ?? 0) + plus, reste_ht: (d.reste_ht ?? 0) + plus } : d;
          });
    onLocal({ ...t, avenants, debourse });
  };
}
function fusionSituation(complet: Tableau, onLocal: (t: Tableau) => void) {
  return (t: Tableau) => {
    const avant = complet.situations ?? [];
    const recues = t.situations ?? [];
    onLocal({ ...t, situations: [...avant.map((x) => recues.find((y) => y.id === x.id) ?? x), ...recues.filter((y) => !avant.some((x) => x.id === y.id))] });
  };
}

function Pastille({ teinte, children }: { teinte?: Teinte; children: React.ReactNode }) {
  return (
    <span className="pbc-pastille" data-teinte={teinte}>
      {children}
    </span>
  );
}

/* ——— le bouton primaire : choisir le chantier où ouvrir l'avenant ou la situation ——— */
function BoutonNouveau({ libelle, aide, chantiers }: { libelle: string; aide: string; chantiers: { id: string; nom: string; commune: string }[] }) {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);
  return (
    <div className="pbc-ancre" ref={ref}>
      <button
        type="button"
        className="pbc-primaire"
        aria-haspopup="menu"
        aria-expanded={ouvert}
        disabled={!chantiers.length}
        title={!chantiers.length ? "Aucun chantier ouvert ne s'y prête" : undefined}
        onClick={() => setOuvert((v) => !v)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1" fill="currentColor" />
        </svg>
        {libelle}
      </button>
      {ouvert ? (
        <div className="pbc-menu" role="menu" aria-label={libelle}>
          <div className="pbc-menu-aide">{aide}</div>
          <div className="pbc-menu-liste">
            {chantiers.map((c) => (
              <Link key={c.id} href={fiche(c.id)} className="pbc-menu-option" role="menuitem" onClick={() => setOuvert(false)}>
                <HardHat aria-hidden="true" />
                <span>{c.nom}</span>
                <small>{c.commune}</small>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function AvenantsSituations() {
  const { source, pret, erreur, liste, tableau, demanderTous, enLecture, onLocal, relireChantier } = useDaliro();
  const params = useSearchParams();
  const adresse = useAdresse(CHEMIN, params);
  const maintenant = useMaintenant();
  const quand = (iso: string | null) => (iso && maintenant !== null ? relatif(iso, new Date(maintenant)) : "–");

  /* en base réelle : les tableaux de tous les chantiers, relus quand la liste change (temps réel) */
  const listeLue = useRef<unknown>(null);
  useEffect(() => {
    if (!pret || listeLue.current === liste) return;
    listeLue.current = liste;
    demanderTous();
  }, [pret, liste, demanderTous]);

  const tableaux = liste.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t);
  const lecture = source === "reelle" && (!pret || liste.some((c) => enLecture(c.id)));
  const voitPrix = tableaux.some((t) => t.voit_prix);
  const avenants = tableaux.flatMap((t) => t.avenants.map((a) => ({ a, t }))).sort((x, y) => temps(modifAvenant(y.a)) - temps(modifAvenant(x.a)));
  const situations = tableaux.flatMap((t) => (t.situations ?? []).map((s) => ({ s, t }))).sort((x, y) => temps(modifSituation(y.s)) - temps(modifSituation(x.s)));

  /* ——— l'adresse : famille, onglet, élément ouvert ——— */
  const idAvenant = params.get("avenant");
  const idSituation = params.get("situation");
  const vue: Vue = idSituation ? "situations" : idAvenant ? "avenants" : params.get("vue") === "situations" ? "situations" : "avenants";
  const onglets: Onglet<string>[] = vue === "avenants" ? ONGLETS_AVENANT : ONGLETS_SITUATION;
  const onglet = onglets.find((o) => o.cle === params.get("onglet")) ?? onglets[0];
  const lienVue = (v: Vue) =>
    adresse((p) => {
      p.delete("onglet");
      p.delete("avenant");
      p.delete("situation");
      if (v === "situations") p.set("vue", "situations");
      else p.delete("vue");
    });
  const lienOnglet = (cle: string) => adresse((p) => (cle === onglets[0].cle ? p.delete("onglet") : p.set("onglet", cle)));
  const lienRetour = (v: Vue, statut: string) => {
    const o = (v === "avenants" ? ONGLETS_AVENANT : ONGLETS_SITUATION) as Onglet<string>[];
    const cle = o.find((x) => x.statuts.includes(statut))?.cle ?? o[0].cle;
    return adresse((p) => {
      p.delete("avenant");
      p.delete("situation");
      if (v === "situations") p.set("vue", "situations");
      else p.delete("vue");
      if (cle === o[0].cle) p.delete("onglet");
      else p.set("onglet", cle);
    });
  };

  const titreCache = <h1 className="v2-sr">Avenants et situations</h1>;

  /* ——— la page d'un élément ——— */
  if (idAvenant || idSituation) {
    const ra = idAvenant ? avenants.find((x) => x.a.id === idAvenant) : null;
    const rs = idSituation ? situations.find((x) => x.s.id === idSituation) : null;
    if (ra)
      return (
        <div className="lin pbc">
          {titreCache}
          <PageAvenant a={ra.a} t={ra.t} retour={lienRetour("avenants", ra.a.statut)} quand={quand} onLocal={onLocal} relire={() => relireChantier(ra.t.chantier.id)} />
        </div>
      );
    if (rs)
      return (
        <div className="lin pbc">
          {titreCache}
          <PageSituation s={rs.s} t={rs.t} retour={lienRetour("situations", rs.s.statut)} quand={quand} onLocal={onLocal} relire={() => relireChantier(rs.t.chantier.id)} />
        </div>
      );
    return (
      <div className="lin pbc">
        {titreCache}
        <div className="pbc-page">
          <header className="pbc-btete">
            <div className="pbc-btete-gauche">
              <Link href={lienVue(vue)} className="pbc-retour" aria-label="Retour à la liste">
                <ArrowLeft aria-hidden="true" />
              </Link>
              <p className="pbc-btitre">{vue === "avenants" ? "Avenant" : "Situation de travaux"}</p>
            </div>
          </header>
          <div className="pbc-vide" style={{ borderTop: 0 }}>
            <p className="pbc-vide-titre">{lecture ? "Lecture des chantiers…" : vue === "avenants" ? "Cet avenant n'est pas visible avec ce compte." : "Cette situation n'est pas visible avec ce compte."}</p>
            {!lecture ? <p className="pbc-vide-texte">{vue === "situations" && !voitPrix ? "Les situations sont réservées à qui a le droit de voir les prix." : "Il a peut-être été retiré, ou son chantier n'est pas dans votre liste."}</p> : null}
          </div>
        </div>
      </div>
    );
  }

  /* ——— la liste ——— */
  const nAvenant = (o: Onglet<StatutAvenant>) => avenants.filter((x) => o.statuts.includes(x.a.statut)).length;
  const nSituation = (o: Onglet<StatutSituation>) => situations.filter((x) => o.statuts.includes(x.s.statut)).length;
  const compte = (o: Onglet<string>) => (vue === "avenants" ? nAvenant(o as Onglet<StatutAvenant>) : nSituation(o as Onglet<StatutSituation>));
  const visiblesAv = avenants.filter((x) => onglet.statuts.includes(x.a.statut));
  const visiblesSit = situations.filter((x) => onglet.statuts.includes(x.s.statut));
  const nVisibles = vue === "avenants" ? visiblesAv.length : visiblesSit.length;
  const avecEtat = vue === "avenants" && (onglet.cle === "a-signer" || onglet.cle === "refuses");
  const avecEtatSit = vue === "situations" && (onglet.cle === "soumises" || onglet.cle === "refusees");

  const ouverts = liste.filter((c) => c.statut === "ouvert" || c.statut === "suspendu");
  const pourSituation = liste.filter((c) => {
    const t = tableau(c.id);
    const verifie = c.marche_verifie || t?.marches.some((m) => m.statut === "verifie");
    return (c.statut === "ouvert" || c.statut === "suspendu" || c.statut === "receptionne") && verifie && (!t || t.voit_prix);
  });

  return (
    <div className="lin pbc">
      {titreCache}
      <header className="pbc-tete">
        <div className="pbc-tete-gauche">
          <p className="pbc-h1" aria-hidden="true">
            Avenants et situations
          </p>
          <nav className="pbc-familles" aria-label="Famille">
            <Link href={lienVue("avenants")} className="pbc-famille" aria-current={vue === "avenants" ? "page" : undefined} replace scroll={false}>
              Avenants
            </Link>
            <Link href={lienVue("situations")} className="pbc-famille" aria-current={vue === "situations" ? "page" : undefined} replace scroll={false}>
              Situations
            </Link>
          </nav>
        </div>
        {vue === "avenants" ? (
          <BoutonNouveau libelle="Ouvrir un avenant" aide="Choisissez le chantier : l'avenant s'ouvre depuis sa fiche (origine, objet), puis se chiffre ici." chantiers={ouverts} />
        ) : (
          <BoutonNouveau libelle="Nouvelle situation" aide="Choisissez le chantier : la situation s'ouvre depuis sa fiche, sur son marché vérifié." chantiers={voitPrix ? pourSituation : []} />
        )}
      </header>

      <div className="pbc-rangee">
        <nav className="pbc-onglets" aria-label={vue === "avenants" ? "États des avenants" : "États des situations"}>
          {onglets.map((o) => {
            const Icone = o.icone;
            return (
              <Link key={o.cle} href={lienOnglet(o.cle)} className="pbc-onglet" aria-current={o.cle === onglet.cle ? "page" : undefined} replace scroll={false}>
                <Icone aria-hidden="true" />
                <span className="pbc-onglet-texte">
                  {o.libelle}
                  <span className="pbc-compte">{compte(o)}</span>
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {erreur ? (
        <p className="pbc-note" data-erreur="" role="alert">
          {erreur}
        </p>
      ) : lecture ? (
        <p className="pbc-note" role="status">
          Lecture des chantiers…
        </p>
      ) : null}

      {vue === "situations" && !voitPrix && !lecture ? (
        <div className="pbc-cadre">
          <div className="pbc-vide">
            <p className="pbc-vide-titre">Situations réservées</p>
            <p className="pbc-vide-texte">Les situations sont réservées à qui a le droit de voir les prix.</p>
          </div>
        </div>
      ) : nVisibles === 0 ? (
        <div className="pbc-cadre">
          <div className="pbc-vide">
            <p className="pbc-vide-titre">{lecture ? "Lecture en cours" : vue === "avenants" ? "Aucun avenant ici" : "Aucune situation ici"}</p>
            {!lecture ? <p className="pbc-vide-texte">{onglet.vide}</p> : null}
          </div>
        </div>
      ) : vue === "avenants" ? (
        <div className="pbc-cadre" tabIndex={0} role="region" aria-label="Avenants (tableau qui défile)">
          <table className="pbc-table">
            <thead>
              <tr>
                <th className="pbc-th pbc-c-nom">Avenant</th>
                <th className="pbc-th pbc-c-chantier">Chantier</th>
                <th className="pbc-th pbc-c-origine">Origine</th>
                {avecEtat ? <th className="pbc-th pbc-c-etat">État</th> : null}
                {voitPrix ? <th className="pbc-th pbc-c-montant pbc-droite">Montant HT</th> : null}
                <th className="pbc-th pbc-c-date">Dernière modification</th>
                <th className="pbc-th pbc-c-actions">
                  <span className="v2-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiblesAv.map(({ a, t }) => {
                const href = adresse((p) => p.set("avenant", a.id));
                const o = origineDe(a);
                const Origine = o?.icone;
                const v = validationAvenant(a);
                const lien = <Link href={href} className="pbc-lien" tabIndex={-1} aria-hidden="true" />;
                return (
                  <tr key={a.id} className="pbc-ligne">
                    <td className="pbc-td pbc-c-nom">
                      <Link href={href} className="pbc-lien" aria-label={`Avenant n° ${a.numero} — ${a.objet}`} />
                      <span className="pbc-nom">
                        Avenant n° {a.numero} — {a.objet}
                      </span>
                    </td>
                    <td className="pbc-td">
                      {lien}
                      <span className="pbc-avec">
                        <span className="pbc-tuile">
                          <HardHat aria-hidden="true" />
                        </span>
                        <span className="pbc-texte">{t.chantier.nom}</span>
                      </span>
                    </td>
                    <td className="pbc-td">
                      {lien}
                      {o && Origine ? (
                        <span className="pbc-avec">
                          <span className="pbc-icone">
                            <Origine aria-hidden="true" />
                          </span>
                          <span>{o.libelle}</span>
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    {avecEtat ? (
                      <td className="pbc-td">
                        {lien}
                        {v ? <Pastille teinte={v.teinte}>{v.libelle}</Pastille> : <Pastille teinte={STATUTS_AVENANT[a.statut].teinte}>{STATUTS_AVENANT[a.statut].libelle}</Pastille>}
                      </td>
                    ) : null}
                    {voitPrix ? (
                      <td className="pbc-td pbc-droite">
                        {lien}
                        <span className="pbc-num">{t.voit_prix ? montant(a.montant_ht) : "–"}</span>
                      </td>
                    ) : null}
                    <td className="pbc-td">
                      {lien}
                      <time dateTime={modifAvenant(a) ?? undefined}>{quand(modifAvenant(a))}</time>
                    </td>
                    <td className="pbc-td pbc-c-actions">
                      <MenuLigne
                        titre={`Actions de l'avenant n° ${a.numero}`}
                        options={[
                          { cle: "ouvrir", libelle: "Ouvrir l'avenant", icone: <FileSignature aria-hidden="true" />, href },
                          { cle: "chantier", libelle: "Fiche du chantier", icone: <HardHat aria-hidden="true" />, href: fiche(t.chantier.id) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="pbc-cadre" tabIndex={0} role="region" aria-label="Situations de travaux (tableau qui défile)">
          <table className="pbc-table">
            <thead>
              <tr>
                <th className="pbc-th pbc-c-nom">Situation</th>
                <th className="pbc-th pbc-c-chantier">Chantier</th>
                <th className="pbc-th pbc-c-date">Période</th>
                {avecEtatSit ? <th className="pbc-th pbc-c-etat">État</th> : null}
                <th className="pbc-th pbc-c-montant pbc-droite">Montant HT</th>
                <th className="pbc-th pbc-c-montant pbc-droite">Payé / reste</th>
                <th className="pbc-th pbc-c-actions">
                  <span className="v2-sr">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {visiblesSit.map(({ s, t }) => {
                const href = adresse((p) => p.set("situation", s.id));
                const e = s.statut === "validee" ? encaissement(s, aujourdhui()) : null;
                const v = validationSituation(s);
                const lien = <Link href={href} className="pbc-lien" tabIndex={-1} aria-hidden="true" />;
                return (
                  <tr key={s.id} className="pbc-ligne">
                    <td className="pbc-td pbc-c-nom">
                      <Link href={href} className="pbc-lien" aria-label={`Situation n° ${s.numero} — ${t.chantier.nom}`} />
                      <span className="pbc-nom">Situation n° {s.numero}</span>
                    </td>
                    <td className="pbc-td">
                      {lien}
                      <span className="pbc-avec">
                        <span className="pbc-tuile">
                          <HardHat aria-hidden="true" />
                        </span>
                        <span className="pbc-texte">{t.chantier.nom}</span>
                      </span>
                    </td>
                    <td className="pbc-td">
                      {lien}
                      au {dateCourte(s.periode_fin)}
                    </td>
                    {avecEtatSit ? (
                      <td className="pbc-td">
                        {lien}
                        {v ? <Pastille teinte={v.teinte}>{v.libelle}</Pastille> : <Pastille teinte={STATUTS_SITUATION[s.statut].teinte}>{STATUTS_SITUATION[s.statut].libelle}</Pastille>}
                      </td>
                    ) : null}
                    <td className="pbc-td pbc-droite">
                      {lien}
                      <span className="pbc-num">{montant(s.periode_ht)}</span>
                    </td>
                    <td className="pbc-td pbc-droite">
                      {lien}
                      {e ? (
                        <span className="pbc-num" data-retard={e.etat === "en_retard" ? "" : undefined} title={e.etat === "en_retard" ? `En retard de ${e.retard} j : indemnité de 40 € due` : undefined}>
                          {montant(e.encaisse)} / {montant(e.reste)}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                    <td className="pbc-td pbc-c-actions">
                      <MenuLigne
                        titre={`Actions de la situation n° ${s.numero}`}
                        options={[
                          { cle: "ouvrir", libelle: "Ouvrir la situation", icone: <FileSpreadsheet aria-hidden="true" />, href },
                          { cle: "chantier", libelle: "Fiche du chantier", icone: <HardHat aria-hidden="true" />, href: fiche(t.chantier.id) },
                        ]}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ——— les morceaux communs à la page d'un avenant et d'une situation ——— */
type PropsPage = { t: Tableau; retour: string; quand: (iso: string | null) => string; onLocal: (t: Tableau) => void; relire: () => Promise<void> };

function Tete({ retour, statut, titre, modif, quand }: { retour: string; statut: { libelle: string; teinte: Teinte }; titre: string; modif: string | null; quand: (iso: string | null) => string }) {
  return (
    <header className="pbc-btete">
      <div className="pbc-btete-gauche">
        <Link href={retour} className="pbc-retour" aria-label="Retour à la liste">
          <ArrowLeft aria-hidden="true" />
        </Link>
        <Pastille teinte={statut.teinte}>{statut.libelle}</Pastille>
        <p className="pbc-btitre" title={titre}>
          {titre}
        </p>
      </div>
      {modif ? (
        <div className="pbc-btete-droite">
          <span>
            Modifié <time dateTime={modif}>{quand(modif)}</time>
          </span>
        </div>
      ) : null}
    </header>
  );
}

function BlocChantier({ t }: { t: Tableau }) {
  const c = t.chantier;
  return (
    <section className="pbc-bloc" aria-label="Chantier">
      <h2 className="pbc-bloc-titre">Chantier</h2>
      <Link href={fiche(c.id)} className="pbc-selecteur">
        <span className="pbc-tuile">
          <HardHat aria-hidden="true" />
        </span>
        <span>
          {c.nom} <small>· {c.commune}</small>
        </span>
        <ChevronRight aria-hidden="true" />
      </Link>
      <dl className="pbc-proprietes">
        <dt>Statut du chantier</dt>
        <dd>{STATUTS_CHANTIER[c.statut].libelle}</dd>
        <dt>Maître d&apos;ouvrage</dt>
        <dd>{c.maitre_ouvrage_nom ?? "Non désigné"}</dd>
      </dl>
    </section>
  );
}

function Pied({ t }: { t: Tableau }) {
  return (
    <div className="pbc-pied">
      <Link href={fiche(t.chantier.id)} className="pbc-primaire pbc-primaire--32">
        <HardHat aria-hidden="true" />
        Fiche du chantier
      </Link>
    </div>
  );
}

/* ——— la page d'un avenant ——— */
function PageAvenant({ a, t, retour, quand, onLocal, relire }: PropsPage & { a: Avenant }) {
  const { source } = useDaliro();
  const st = STATUTS_AVENANT[a.statut];
  const v = validationAvenant(a);
  const o = origineDe(a);
  const signataire = a.signe_libelle ? (a.signe_libelle.startsWith("Signé sur place") ? a.signe_libelle.replace(/^Signé sur place\s*:?\s*/, "Sur place : ") : a.signe_libelle) : null;
  return (
    <div className="pbc-page">
      <Tete retour={retour} statut={st} titre={`Avenant n° ${a.numero} — ${a.objet}`} modif={modifAvenant(a)} quand={quand} />
      <div className="pbc-corps">
        <div className="pbc-contenu">
          <section className="pbc-champ" aria-label="Contenu de l'avenant">
            <h2 className="pbc-libelle">Contenu de l&apos;avenant</h2>
            <p className="pbc-aide">Les lignes chiffrées sur vos prix, l&apos;origine et la signature. Un avenant se signe avant l&apos;exécution des travaux.</p>
            <div className="pbc-gestes">
              <Habille>
                <ChantierVue key={a.id} tableau={{ ...t, avenants: [a] }} source={source} onLocal={fusionAvenant(t, a.id, onLocal)} relire={relire} sections={["avenants"]} />
              </Habille>
            </div>
          </section>
        </div>
        <aside className="pbc-volet" aria-label="Propriétés de l'avenant">
          <BlocChantier t={t} />
          <section className="pbc-bloc" aria-label="Statut">
            <h2 className="pbc-bloc-titre">Statut</h2>
            <div className="pbc-pastilles">
              <Pastille teinte={st.teinte}>{st.libelle}</Pastille>
              {v ? <Pastille teinte={v.teinte}>{v.libelle}</Pastille> : null}
            </div>
            {a.motif ? <p className="pbc-bloc-texte">Motif : {a.motif}</p> : null}
          </section>
          <section className="pbc-bloc" aria-label="Montant et dates">
            <h2 className="pbc-bloc-titre">Montant et dates</h2>
            <dl className="pbc-proprietes">
              {t.voit_prix ? (
                <>
                  <dt>Montant HT</dt>
                  <dd data-fort="">{montant(a.montant_ht)}</dd>
                </>
              ) : null}
              <dt>Lignes chiffrées</dt>
              <dd>{a.lignes.length || a.nb_lignes || 0}</dd>
              <dt>Ouvert le</dt>
              <dd>{dateCourte(a.cree_le)}</dd>
              <dt>Soumis le</dt>
              <dd>{dateCourte(a.soumis_le)}</dd>
              <dt>Signé le</dt>
              <dd>{dateCourte(a.signe_le)}</dd>
            </dl>
            {!t.voit_prix ? <p className="pbc-bloc-texte">Les montants sont réservés à qui a le droit de voir les prix.</p> : null}
          </section>
          <section className="pbc-bloc" aria-label="Signataire">
            <h2 className="pbc-bloc-titre">Signataire</h2>
            <dl className="pbc-proprietes">
              <dt>Signe pour le maître d&apos;ouvrage</dt>
              <dd>{t.chantier.maitre_ouvrage_nom ?? "Non désigné"}</dd>
              <dt>Signé par</dt>
              <dd>{signataire ?? "Pas encore signé"}</dd>
            </dl>
          </section>
          <section className="pbc-bloc" aria-label="Origine">
            <h2 className="pbc-bloc-titre">Origine</h2>
            <dl className="pbc-proprietes">
              <dt>Canal</dt>
              <dd>{o?.libelle ?? "–"}</dd>
              <dt>De qui</dt>
              <dd>{a.origine?.auteur ? String(a.origine.auteur) : "–"}</dd>
              <dt>Le</dt>
              <dd>{a.origine?.date ? dateCourte(String(a.origine.date)) : "–"}</dd>
            </dl>
            {a.origine?.texte ? <p className="pbc-bloc-texte">« {String(a.origine.texte)} »</p> : null}
          </section>
          <Pied t={t} />
        </aside>
      </div>
    </div>
  );
}

/* ——— la page d'une situation ——— */
function PageSituation({ s, t, retour, quand, onLocal, relire }: PropsPage & { s: Situation }) {
  const { source } = useDaliro();
  const st = STATUTS_SITUATION[s.statut];
  const v = validationSituation(s);
  const e = s.statut === "validee" ? encaissement(s, aujourdhui()) : null;
  const lotCode = (id: string | null) => (id ? t.lots.find((l) => l.id === id)?.code ?? "?" : "—");
  /* la carte d'avant montre la situation en cours (gestes) et les validées (paiement) ; une annulée n'a plus de geste */
  const avecGestes = s.statut !== "annulee";
  const lignesSeules = s.statut === "validee" || s.statut === "annulee";
  return (
    <div className="pbc-page">
      <Tete retour={retour} statut={st} titre={`Situation n° ${s.numero} au ${dateCourte(s.periode_fin)} — ${t.chantier.nom}`} modif={modifSituation(s)} quand={quand} />
      <div className="pbc-corps">
        <div className="pbc-contenu">
          {avecGestes ? (
            <section className="pbc-champ" aria-label="Avancement et validation">
              <h2 className="pbc-libelle">{s.statut === "validee" ? "Encaissement" : "Avancement et validation"}</h2>
              <p className="pbc-aide">
                {s.statut === "validee"
                  ? "Montants et mentions figés à la validation. Notez chaque paiement reçu."
                  : "L'avancement cumulé de chaque ligne du marché vérifié et des avenants signés ; soumise à la validation, puis validée."}
              </p>
              <div className="pbc-gestes">
                <Habille>
                  <ChantierVue key={s.id} tableau={{ ...t, situations: [s] }} source={source} onLocal={fusionSituation(t, onLocal)} relire={relire} sections={["situations"]} />
                </Habille>
              </div>
            </section>
          ) : null}
          {lignesSeules ? (
            <section className="pbc-champ" aria-label="Lignes de la situation">
              <h2 className="pbc-libelle">Lignes de la situation</h2>
              <p className="pbc-aide">{s.statut === "annulee" ? "La situation est annulée : ses lignes restent pour mémoire." : "L'avancement retenu à la validation, ligne à ligne."}</p>
              <div className="pbc-cadre" tabIndex={0} role="region" aria-label={`Lignes de la situation n° ${s.numero} (tableau qui défile)`}>
                <table className="pbc-table">
                  <thead>
                    <tr>
                      <th className="pbc-th">Désignation</th>
                      <th className="pbc-th">Lot</th>
                      <th className="pbc-th pbc-droite">Montant HT</th>
                      <th className="pbc-th pbc-droite">Cumul</th>
                      <th className="pbc-th pbc-droite">Période HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.lignes.map((l) => (
                      <tr key={l.id} className="pbc-ligne">
                        <td className="pbc-td">
                          <span className="pbc-texte">{l.designation}</span>
                          {l.origine === "avenant" ? <> · avenant n° {l.avenant_numero}</> : null}
                        </td>
                        <td className="pbc-td">{lotCode(l.lot_id)}</td>
                        <td className="pbc-td pbc-droite">
                          <span className="pbc-num">{montant(l.base_ht)}</span>
                        </td>
                        <td className="pbc-td pbc-droite">{pourcent(l.avancement)}</td>
                        <td className="pbc-td pbc-droite">
                          <span className="pbc-num">{montant(l.cumule_ht - l.precedent_ht)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </div>
        <aside className="pbc-volet" aria-label="Propriétés de la situation">
          <BlocChantier t={t} />
          <section className="pbc-bloc" aria-label="Statut">
            <h2 className="pbc-bloc-titre">Statut</h2>
            <div className="pbc-pastilles">
              <Pastille teinte={st.teinte}>{st.libelle}</Pastille>
              {v ? <Pastille teinte={v.teinte}>{v.libelle}</Pastille> : null}
              {e?.etat === "payee" ? <Pastille teinte="vert">Payée</Pastille> : e?.etat === "en_retard" ? <Pastille teinte="rouge">En retard de {e.retard} j</Pastille> : e?.etat === "partielle" ? <Pastille teinte="ambre">Payée en partie</Pastille> : e ? <Pastille teinte="gris">À échoir</Pastille> : null}
            </div>
            {s.motif ? <p className="pbc-bloc-texte">Motif : « {s.motif} »</p> : null}
            {e?.etat === "en_retard" ? <p className="pbc-bloc-texte">Indemnité de 40 € due{e.penalites ? `, pénalités ${montant(e.penalites)}` : ""}.</p> : null}
          </section>
          <section className="pbc-bloc" aria-label="Montants">
            <h2 className="pbc-bloc-titre">Montants</h2>
            <dl className="pbc-proprietes">
              <dt>Cumul des travaux HT</dt>
              <dd>{montant(s.cumul_ht)}</dd>
              <dt>Travaux de la période HT</dt>
              <dd data-fort="">{montant(s.periode_ht)}</dd>
              <dt>{s.autoliquidation ? "TVA" : s.taux_tva ? `TVA ${pourcent(Math.round(s.taux_tva * 1000) / 10)}` : "TVA"}</dt>
              <dd>{s.autoliquidation ? "autoliquidée par le preneur" : montant(s.tva)}</dd>
              <dt>Retenue de garantie</dt>
              <dd>{s.retenue_caution ? "caution" : `− ${montant(s.retenue)}`}</dd>
              <dt>Net à payer</dt>
              <dd data-fort="">{montant(s.net_a_payer)}</dd>
              {e ? (
                <>
                  <dt>Encaissé</dt>
                  <dd>{montant(e.encaisse)}</dd>
                  <dt>Reste</dt>
                  <dd>{montant(e.reste)}</dd>
                </>
              ) : null}
            </dl>
          </section>
          <section className="pbc-bloc" aria-label="Dates">
            <h2 className="pbc-bloc-titre">Dates</h2>
            <dl className="pbc-proprietes">
              <dt>Période au</dt>
              <dd>{dateCourte(s.periode_fin)}</dd>
              <dt>Soumise le</dt>
              <dd>{dateCourte(s.soumise_le)}</dd>
              <dt>Validée le</dt>
              <dd>
                {dateCourte(s.validee_le)}
                {s.validee_libelle ? ` · ${s.validee_libelle}` : ""}
              </dd>
              <dt>Échéance</dt>
              <dd>{dateCourte(s.echeance)}</dd>
            </dl>
          </section>
          {s.paiements?.length ? (
            <section className="pbc-bloc" aria-label="Paiements reçus">
              <h2 className="pbc-bloc-titre">Paiements reçus</h2>
              <dl className="pbc-proprietes">
                {s.paiements.map((p) => (
                  <PaiementLigne key={p.id} le={p.recu_le} montantRecu={p.montant} reference={p.reference} />
                ))}
              </dl>
            </section>
          ) : null}
          <Pied t={t} />
        </aside>
      </div>
    </div>
  );
}

function PaiementLigne({ le, montantRecu, reference }: { le: string; montantRecu: number; reference: string | null }) {
  return (
    <>
      <dt>{dateCourte(le)}</dt>
      <dd>
        {montant(montantRecu)}
        {reference ? ` · ${reference}` : ""}
      </dd>
    </>
  );
}
