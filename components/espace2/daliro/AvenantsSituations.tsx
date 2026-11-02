"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Avenants et situations — Linear, Board, au 1:1 (02/11/2026)

   Règles de Teo (docs/refonte-metiers/REGLES.md) : la page « All issues »
   de l'équipe en vue Board, recopiée point par point (relevé :
   docs/refonte-metiers/releves/linear-board.md ; mesures prises sur ses
   captures à taille réelle, styles : ./dal-board.css, préfixe dal-bd-).
   Seul le contenu change :
     · onglets « Avenants » et « Situations » (Active · Backlog · All issues
       chez Linear), gardés dans l'adresse (?vue=situations) ;
     · une colonne par état (statut d'un ticket) : à chiffrer, dans
       « À valider », à signer, signés — et pour les situations : en
       préparation, à valider, à encaisser, payées. Refusés, abandonnés et
       annulées sont dans la colonne repliée de droite (Hidden rows) ;
     · une carte par avenant ou situation, aux briques de la carte de
       Linear : identifiant, signataire (avatar), état et titre, puces
       (urgence, échéance, montant, chantier, origine), date d'ouverture.

   Les gestes (chiffrer une ligne, retirer une ligne, soumettre, signer,
   faire signer sur place, voir la preuve, abandonner, resoumettre ;
   avancer, reprendre l'avancement lu sur les photos, soumettre, valider,
   annuler, noter un paiement) vivent dans le détail de l'élément, ouvert
   dans le volet de droite au clic sur sa carte (ou par l'aiguillage :
   ?avenant=<id>, ?situation=<id>). Ce détail est celui de la fiche du
   chantier (../lin/Volet, rendu par ChantierVue quand la page fournit un
   volet) : mêmes portes, mêmes fenêtres, mêmes confirmations. La liste
   que ChantierVue rend avec n'est pas montrée (la page a la sienne).
   Glisser une carte dans une autre colonne (le geste de Linear qui change
   le statut) ouvre ce détail : le statut d'un avenant ne change que par sa
   fenêtre (soumettre, signer, abandonner).

   « Nouvel avenant » et le « + » d'une colonne mènent à la fiche du
   chantier choisi, où l'avenant s'ouvre (origine, objet) ; « Nouvelle
   situation » de même, sur un chantier au marché vérifié.

   Données : useDaliro() (./donnees) ; en base réelle, les tableaux de tous
   les chantiers sont lus à l'arrivée (demanderTous). En exemple, la page
   pose une fois l'exemple rempli (./exemplesAvenants).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ChantierVue from "@/components/espace/daliro/ChantierVue";
import { encaissement } from "@/components/espace/daliro/situations";
import type { Avenant, Situation, Tableau } from "@/components/espace/daliro/types";
import { dateCourte, montant } from "@/components/espace/format";
import Habille from "@/components/espace2/Habille";
import { VoletContexte, type Volet } from "../lin/Volet";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { DalCarte } from "./DalCadre";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import { useDaliro } from "./donnees";
import { AVENANTS_PLUS, SITUATIONS_PLUS } from "./exemplesAvenants";
import "./dal-board.css";

const BASE = `${RACINE}/daliro`;
const CHEMIN = `${BASE}/avenants`;
const fiche = (id: string) => `${BASE}/chantiers/${encodeURIComponent(id)}`;
const aujourdhui = () => new Date().toISOString().slice(0, 10);

type Vue = "avenants" | "situations";
type Etat = "triage" | "backlog" | "todo" | "started" | "done" | "canceled";
type Colonne<T> = { cle: string; nom: string; etat: Etat; garde: (x: T) => boolean; masquee?: boolean };
type Item = { cle: string; id: string; t: Tableau; ident: string; titre: string; etat: Etat; quand: string | null };

const ICONE_ETAT: Record<Etat, NomDalIcone> = {
  triage: "IssueStatusTriage",
  backlog: "IssueStatusBacklog",
  todo: "IssueStatusTodo",
  started: "IssueStatusStarted",
  done: "IssueStatusDone",
  canceled: "StatusCanceled",
};

const valide = (d: string | null | undefined) => d === "approuvee" || d === "executee";
const reste = (s: Situation) => encaissement(s, aujourdhui()).reste;

const COLONNES_AVENANT: Colonne<Avenant>[] = [
  { cle: "a-chiffrer", nom: "À chiffrer", etat: "backlog", garde: (a) => a.statut === "brouillon" },
  { cle: "a-valider", nom: "Dans « À valider »", etat: "todo", garde: (a) => a.statut === "soumis" && !valide(a.demande_statut) },
  { cle: "a-signer", nom: "À signer", etat: "started", garde: (a) => a.statut === "soumis" && valide(a.demande_statut) },
  { cle: "signes", nom: "Signés", etat: "done", garde: (a) => a.statut === "signe" },
  { cle: "refuses", nom: "Refusés et abandonnés", etat: "canceled", garde: (a) => a.statut === "refuse" || a.statut === "abandonne", masquee: true },
];
const COLONNES_SITUATION: Colonne<Situation>[] = [
  { cle: "en-preparation", nom: "En préparation", etat: "backlog", garde: (s) => s.statut === "brouillon" || s.statut === "refusee" },
  { cle: "a-valider", nom: "À valider", etat: "todo", garde: (s) => s.statut === "soumise" },
  { cle: "a-encaisser", nom: "À encaisser", etat: "started", garde: (s) => s.statut === "validee" && reste(s) > 0.005 },
  { cle: "payees", nom: "Payées", etat: "done", garde: (s) => s.statut === "validee" && reste(s) <= 0.005 },
  { cle: "annulees", nom: "Annulées", etat: "canceled", garde: (s) => s.statut === "annulee", masquee: true },
];

/* l'origine d'un avenant, en étiquette (pastille de la palette des étiquettes de Linear) */
const ORIGINES: Record<string, { libelle: string; couleur: string }> = {
  vocal: { libelle: "Vocal", couleur: "#5e6ad2" },
  photo: { libelle: "Photo", couleur: "#26b5ce" },
  visite: { libelle: "Visite", couleur: "#4cb782" },
  courriel: { libelle: "Courriel", couleur: "#f2c94c" },
  email: { libelle: "Courriel", couleur: "#f2c94c" },
  message: { libelle: "Message", couleur: "#f2994a" },
  whatsapp: { libelle: "Message", couleur: "#f2994a" },
  sms: { libelle: "Message", couleur: "#f2994a" },
  telegram: { libelle: "Message", couleur: "#f2994a" },
  reception: { libelle: "Réserve", couleur: "#eb5757" },
};

/* « OME-52 » chez Linear : le préfixe du chantier, A pour un avenant, S pour une situation */
const prefixe = (t: Tableau) => (t.chantier.reference || t.chantier.nom).split(/[-\s]/)[0].toUpperCase().slice(0, 4);
const initiales = (nom: string | null | undefined) =>
  (nom ?? "")
    .replace(/^(Signé sur place\s*:?\s*|M\.\s*et\s*Mme\s*|M\.\s*|Mme\s*|Dr\s*)/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0])
    .join("")
    .toUpperCase();
const jours = (iso: string | null | undefined) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : 0);
const moisJour = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "") : "");

/* l'urgence d'un élément, sur les seuils du point du matin (b6_23) : la priorité de la carte */
function urgenceAvenant(a: Avenant): 0 | 1 | 2 | 3 {
  if (a.statut === "soumis" && valide(a.demande_statut)) return jours(a.soumis_le) >= 14 ? 1 : 3;
  if (a.statut === "soumis") return jours(a.soumis_le) >= 7 ? 2 : 3;
  if (a.statut === "brouillon") return 3;
  return 0;
}
const PRIORITE: Record<0 | 1 | 2 | 3, { icone: NomDalIcone; libelle: string }> = {
  0: { icone: "Priority0", libelle: "Rien à faire" },
  1: { icone: "Priority1", libelle: "Urgent" },
  2: { icone: "Priority3", libelle: "À relancer" },
  3: { icone: "Priority4", libelle: "À suivre" },
};

export default function AvenantsSituations() {
  const { source, pret, erreur, liste, tableau, demanderTous, enLecture, onLocal, relireChantier } = useDaliro();
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();

  /* en base réelle : les tableaux de tous les chantiers, relus quand la liste change (temps réel) */
  const listeLue = useRef<unknown>(null);
  useEffect(() => {
    if (!pret || listeLue.current === liste) return;
    listeLue.current = liste;
    demanderTous();
  }, [pret, liste, demanderTous]);

  /* en exemple : l'exemple rempli, posé une fois dans les tableaux */
  const poses = useRef(new Set<string>());
  useEffect(() => {
    if (source !== "exemple") return;
    for (const c of liste) {
      const t = tableau(c.id);
      if (!t || poses.current.has(c.id)) continue;
      poses.current.add(c.id);
      const avs = AVENANTS_PLUS.filter((a) => a.chantier_id === c.id);
      const sits = SITUATIONS_PLUS.filter((s) => s.chantier_id === c.id);
      const deja = (x: { id: string }) => t.avenants.some((a) => a.id === x.id) || (t.situations ?? []).some((s) => s.id === x.id);
      if ((!avs.length && !sits.length) || [...avs, ...sits].some(deja)) continue;
      onLocal({ ...t, avenants: [...t.avenants, ...avs], situations: [...(t.situations ?? []), ...sits] });
    }
  }, [source, liste, tableau, onLocal]);

  const tableaux = liste.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t);
  const lecture = source === "reelle" && (!pret || liste.some((c) => enLecture(c.id)));
  const voitPrix = tableaux.some((t) => t.voit_prix);

  /* ——— l'adresse : la vue, l'élément ouvert ——— */
  const idAvenant = params.get("avenant");
  const idSituation = params.get("situation");
  const vue: Vue = idSituation ? "situations" : idAvenant ? "avenants" : params.get("vue") === "situations" ? "situations" : "avenants";
  const choisieAdresse = idAvenant ? `avenant:${idAvenant}` : idSituation ? `situation:${idSituation}` : null;
  const [choisie, setChoisie] = useState<string | null>(choisieAdresse);
  const [adresseVue, setAdresseVue] = useState(choisieAdresse);
  if (adresseVue !== choisieAdresse) {
    setAdresseVue(choisieAdresse);
    setChoisie(choisieAdresse);
  }
  const lienVue = (v: Vue) => (v === "situations" ? `${CHEMIN}?vue=situations` : CHEMIN);
  const choisir = useCallback(
    (cle: string | null) => {
      setChoisie(cle);
      const [type, id] = cle ? cle.split(":") : [null, null];
      const p = new URLSearchParams();
      if (type === "avenant" && id) p.set("avenant", id);
      else if (type === "situation" && id) p.set("situation", id);
      else if (vue === "situations") p.set("vue", "situations");
      const qs = p.toString();
      setAdresseVue(type ? cle : null);
      router.replace(qs ? `${CHEMIN}?${qs}` : CHEMIN, { scroll: false });
    },
    [router, vue],
  );
  useEffect(() => {
    if (choisie === null) return;
    const touche = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || document.querySelector("[role='dialog']")) return;
      choisir(null);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [choisie, choisir]);

  /* ——— le filtre (chantier), l'affichage (colonnes masquées) ——— */
  const [menu, setMenu] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [cachees, setCachees] = useState<string[]>([]);
  const [masqueesVisibles, setMasqueesVisibles] = useState(true);
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-dal-bd-pop]")) setMenu(null);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [menu]);

  const chantiersVus = tableaux.filter((t) => (!filtre || t.chantier.id === filtre) && (!q.trim() || `${t.chantier.nom} ${t.chantier.commune} ${t.chantier.reference ?? ""}`.toLowerCase().includes(q.trim().toLowerCase())));

  /* ——— les cartes ——— */
  const avenants = chantiersVus.flatMap((t) => t.avenants.map((a) => ({ a, t }))).sort((x, y) => new Date(y.a.cree_le).getTime() - new Date(x.a.cree_le).getTime());
  const situations = chantiersVus.flatMap((t) => (t.voit_prix ? (t.situations ?? []) : []).map((s) => ({ s, t }))).sort((x, y) => y.s.periode_fin.localeCompare(x.s.periode_fin));

  /* le détail ouvert : le tableau de son chantier, la partie qui le porte */
  const elu = (() => {
    if (!choisie) return null;
    const [type, id] = choisie.split(":");
    for (const t of tableaux) {
      if (type === "avenant" && t.avenants.some((a) => a.id === id)) return { t, section: "avenants" as const, annulee: false };
      const s = (t.situations ?? []).find((x) => x.id === id);
      if (type === "situation" && s) return { t, section: "situations" as const, annulee: s.statut === "annulee" };
    }
    return null;
  })();

  const [cible, setCible] = useState<HTMLElement | null>(null);
  const contexte = useMemo<Volet>(() => ({ cible, choisie, choisir }), [cible, choisie, choisir]);
  const voletOuvert = choisie !== null;

  /* glisser une carte dans une autre colonne : son détail s'ouvre, avec le geste qui change son état */
  const [glisse, setGlisse] = useState<string | null>(null);
  const [survolee, setSurvolee] = useState<string | null>(null);

  const ouverts = liste.filter((c) => c.statut === "ouvert" || c.statut === "suspendu");
  const pourSituation = liste.filter((c) => {
    const t = tableau(c.id);
    const verifie = c.marche_verifie || t?.marches.some((m) => m.statut === "verifie");
    return (c.statut === "ouvert" || c.statut === "suspendu" || c.statut === "receptionne") && verifie && (!t || t.voit_prix);
  });
  const pourNouveau = vue === "avenants" ? ouverts : voitPrix ? pourSituation : [];
  const lienNouveau = (id: string) => `${fiche(id)}?onglet=argent&partie=${vue === "avenants" ? "avenants" : "situations"}#${vue}`;

  const copier = (chemin: string) => {
    void navigator.clipboard?.writeText(`${window.location.origin}${chemin}`).then(
      () => toast("Lien copié"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };

  const [contextuel, setContextuel] = useState<{ x: number; y: number; item: Item } | null>(null);
  useEffect(() => {
    if (!contextuel) return;
    const fermer = () => setContextuel(null);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && fermer();
    document.addEventListener("mousedown", fermer);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", fermer);
      document.removeEventListener("keydown", echap);
    };
  }, [contextuel]);

  const ctx: CtxCarte = { choisie, glisse, setGlisse, setSurvolee, choisir, setContextuel };

  const carteAvenant = (a: Avenant, t: Tableau, etat: Etat) => {
    const o = ORIGINES[a.origine?.canal ?? ""] ?? (a.origine?.canal ? { libelle: a.origine.canal, couleur: "#bec2c8" } : null);
    const u = urgenceAvenant(a);
    const signataire = a.statut === "signe" ? (a.signe_libelle ?? t.chantier.maitre_ouvrage_nom ?? null) : null;
    const item: Item = { cle: `avenant:${a.id}`, id: a.id, t, ident: `${prefixe(t)}-A${a.numero}`, titre: a.objet, etat, quand: a.cree_le };
    return (
      <Carte key={a.id} ctx={ctx} item={item} avatar={signataire} avatarTitre={signataire ? `Signé : ${signataire.replace(/^Signé sur place\s*:\s*/, "sur place, ")}` : `Signe pour le maître d'ouvrage : ${t.chantier.maitre_ouvrage_nom ?? "non désigné"}`} pied={`Ouvert le ${moisJour(a.cree_le)}`} piedTitre={a.cree_le ? dateCourte(a.cree_le) : undefined}>
        <Puce carre titre={`Urgence : ${PRIORITE[u].libelle.toLowerCase()}`} icone={PRIORITE[u].icone} data-urgence={u === 1 ? "" : undefined} />
        {t.voit_prix && a.lignes.length ? <Puce icone="Euro" titre="Montant HT">{montant(a.montant_ht)}</Puce> : null}
        <Puce icone="Crane" titre={`Chantier : ${t.chantier.nom}`} data-chantier="">
          {t.chantier.nom}
        </Puce>
        {o ? <Puce pastille={o.couleur} titre={`Origine : ${o.libelle}${a.origine?.auteur ? `, ${a.origine.auteur}` : ""}`}>{o.libelle}</Puce> : null}
        {a.statut === "soumis" && a.demande_statut === "rejetee" ? <Puce pastille="#eb5757">Refusé à la validation</Puce> : null}
        {a.statut === "refuse" ? <Puce pastille="#eb5757">Refusé</Puce> : a.statut === "abandonne" ? <Puce pastille="#95a2b3">Abandonné</Puce> : null}
      </Carte>
    );
  };

  const carteSituation = (s: Situation, t: Tableau, etat: Etat) => {
    const e = s.statut === "validee" ? encaissement(s, aujourdhui()) : null;
    const retard = e?.etat === "en_retard";
    const urg: 0 | 1 | 2 | 3 = retard ? 1 : s.statut === "soumise" && valide(s.demande_statut) ? 2 : s.statut === "validee" && e?.etat !== "payee" ? 3 : s.statut === "brouillon" || s.statut === "refusee" ? 3 : 0;
    const item: Item = { cle: `situation:${s.id}`, id: s.id, t, ident: `${prefixe(t)}-S${s.numero}`, titre: `Situation n° ${s.numero} au ${dateCourte(s.periode_fin)}`, etat, quand: s.periode_fin };
    return (
      <Carte key={s.id} ctx={ctx} item={item} avatar={s.validee_libelle} avatarTitre={s.validee_libelle ? `Validée par ${s.validee_libelle}` : "Pas encore validée"} pied={`Période au ${moisJour(s.periode_fin)}`} piedTitre={dateCourte(s.periode_fin)}>
        <Puce carre titre={`Urgence : ${PRIORITE[urg].libelle.toLowerCase()}`} icone={PRIORITE[urg].icone} data-urgence={urg === 1 ? "" : undefined} />
        {e?.echeance && e.etat !== "payee" ? (
          <Puce icone={retard ? "CrossedOutCalendar" : "Calendar"} titre={retard ? `Échéance dépassée de ${e.retard} j : indemnité de 40 € due` : `Échéance : ${dateCourte(e.echeance)}`} data-retard={retard ? "" : undefined}>
            {moisJour(e.echeance)}
          </Puce>
        ) : null}
        <Puce icone="Euro" titre={e ? `Net à payer ${montant(s.net_a_payer)}, encaissé ${montant(e.encaisse)}` : "Travaux de la période HT"}>
          {e ? (e.etat === "payee" ? montant(s.net_a_payer) : `${montant(e.reste)} à recevoir`) : montant(s.periode_ht)}
        </Puce>
        <Puce icone="Crane" titre={`Chantier : ${t.chantier.nom}`} data-chantier="">
          {t.chantier.nom}
        </Puce>
        {s.statut === "soumise" ? <Puce pastille={valide(s.demande_statut) ? "#4cb782" : s.demande_statut === "rejetee" ? "#eb5757" : "#26b5ce"}>{valide(s.demande_statut) ? "Approuvée : à valider" : s.demande_statut === "rejetee" ? "Rejetée à la validation" : "Dans « À valider »"}</Puce> : null}
        {s.statut === "refusee" ? <Puce pastille="#eb5757">Refusée</Puce> : null}
        {e?.etat === "partielle" ? <Puce pastille="#f2c94c">Payée en partie</Puce> : null}
      </Carte>
    );
  };

  /* les colonnes de la vue */
  const colonnes =
    vue === "avenants"
      ? COLONNES_AVENANT.map((c) => {
          const items = avenants.filter((x) => c.garde(x.a));
          return { c: c as Colonne<unknown>, n: items.length, cartes: items.map(({ a, t }) => carteAvenant(a, t, c.etat)) };
        })
      : COLONNES_SITUATION.map((c) => {
          const items = situations.filter((x) => c.garde(x.s));
          return { c: c as Colonne<unknown>, n: items.length, cartes: items.map(({ s, t }) => carteSituation(s, t, c.etat)) };
        });
  const visibles = colonnes.filter(({ c }) => !cachees.includes(`${vue}:${c.cle}`) && (!c.masquee || masqueesVisibles));
  const nbCachees = colonnes.length - visibles.length;
  const affichageModifie = nbCachees > 0;

  const titreVide =
    vue === "situations" && !voitPrix && !lecture
      ? "Les situations sont réservées à qui a le droit de voir les prix."
      : lecture
        ? "Lecture des chantiers…"
        : null;

  return (
    <VoletContexte.Provider value={contexte}>
      <DalCarte className="dal-bd-page">
        <h1 className="v2-sr">Avenants et situations</h1>
        <header className="dal-tete">
          <div className="dal-ligne1">
            <nav className="dal-bd-fil" aria-label="Fil d'Ariane">
              <Link href={`${BASE}/chantiers`} className="dal-bd-fil-equipe">
                <DalIcone nom="Crane" className="dal-bd-fil-icone" />
                <span>Chantiers</span>
              </Link>
              <DalIcone nom="Chevron" taille={14} className="dal-bd-fil-sep" />
              <span className="dal-bd-fil-ici" aria-current="page">
                Avenants et situations
              </span>
            </nav>
            <span className="dal-pousse" />
            <Link href={`${BASE}/a-faire`} className="dal-rond" aria-label="À faire : avenants à faire signer, situations à soumettre" title="À faire : avenants à faire signer, situations à soumettre">
              <DalIcone nom="Subscribe" />
            </Link>
            <div className="dal-bd-pop" data-dal-bd-pop="">
              <button type="button" className="dal-bd-nouveau" aria-haspopup="menu" aria-expanded={menu === "nouveau"} onClick={() => setMenu(menu === "nouveau" ? null : "nouveau")}>
                <DalIcone nom="Plus" taille={14} />
                <span>{vue === "avenants" ? "Nouvel avenant" : "Nouvelle situation"}</span>
              </button>
              {menu === "nouveau" ? <MenuChantiers vue={vue} chantiers={pourNouveau} lien={lienNouveau} fermer={() => setMenu(null)} /> : null}
            </div>
          </div>
          <div className="dal-ligne2 dal-bd-ligne2">
            <Link href={lienVue("avenants")} scroll={false} className="dal-onglet" aria-current={vue === "avenants" ? "page" : undefined}>
              Avenants
            </Link>
            <Link href={lienVue("situations")} scroll={false} className="dal-onglet" aria-current={vue === "situations" ? "page" : undefined}>
              Situations
            </Link>
            <Link href={BASE} className="dal-rond dal-bd-vues" aria-label="Vue d'ensemble des chantiers" title="Vue d'ensemble des chantiers">
              <DalIcone nom="CustomView" />
            </Link>
            <span className="dal-pousse" />
            <div className="dal-bd-outils">
              <div className="dal-bd-pop" data-dal-bd-pop="">
                <button type="button" className="dal-rond dal-rond--plein" aria-label="Filtrer" title="Filtrer" aria-expanded={menu === "filtre"} onClick={() => setMenu(menu === "filtre" ? null : "filtre")}>
                  <DalIcone nom="Filtre" />
                  {filtre || q.trim() ? <span className="dal-bd-point" /> : null}
                </button>
                {menu === "filtre" ? (
                  <div className="dal-menu dal-bd-menu" role="menu" aria-label="Filtrer">
                    <input className="dal-bd-champ" autoFocus placeholder="Filtrer : chantier, commune…" aria-label="Rechercher un chantier" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && setMenu(null)} />
                    <div className="dal-menu-sep" role="separator" />
                    <button type="button" role="menuitemradio" aria-checked={!filtre} className="dal-menu-option" onClick={() => (setFiltre(null), setMenu(null))}>
                      <DalIcone nom="Project" />
                      <span className="dal-pousse">Tous les chantiers</span>
                      {!filtre ? <DalIcone nom="IssueStatusDone" /> : null}
                    </button>
                    {tableaux.map((t) => (
                      <button key={t.chantier.id} type="button" role="menuitemradio" aria-checked={filtre === t.chantier.id} className="dal-menu-option" onClick={() => (setFiltre(filtre === t.chantier.id ? null : t.chantier.id), setMenu(null))}>
                        <DalIcone nom="Crane" />
                        <span className="dal-pousse">{t.chantier.nom}</span>
                        {filtre === t.chantier.id ? <DalIcone nom="IssueStatusDone" /> : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="dal-bd-pop" data-dal-bd-pop="">
                <button type="button" className="dal-rond dal-rond--plein" data-modifie={affichageModifie ? "" : undefined} aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={menu === "affichage"} onClick={() => setMenu(menu === "affichage" ? null : "affichage")}>
                  <DalIcone nom="Affichage" />
                  {affichageModifie ? <span className="dal-bd-point" /> : null}
                </button>
                {menu === "affichage" ? (
                  <div className="dal-menu dal-bd-menu" role="menu" aria-label="Options d'affichage">
                    <p className="dal-bd-menu-titre">Colonnes</p>
                    {colonnes.map(({ c, n }) => {
                      const vu = visibles.some((x) => x.c.cle === c.cle);
                      return (
                        <button
                          key={c.cle}
                          type="button"
                          role="menuitemcheckbox"
                          aria-checked={vu}
                          className="dal-menu-option"
                          onClick={() => {
                            if (c.masquee) setMasqueesVisibles(!vu);
                            setCachees((l) => (vu ? [...l, `${vue}:${c.cle}`] : l.filter((x) => x !== `${vue}:${c.cle}`)));
                          }}
                        >
                          <DalIcone nom={ICONE_ETAT[c.etat]} className="dal-bd-etat" data-etat={c.etat} />
                          <span className="dal-pousse">{c.nom}</span>
                          <span className="dal-bd-menu-compte">{n}</span>
                          {vu ? <DalIcone nom="IssueStatusDone" /> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                className="dal-rond dal-rond--plein"
                aria-label={voletOuvert ? "Fermer le détail" : "Ouvrir le détail"}
                title={voletOuvert ? "Fermer le détail (Échap)" : "Ouvrir le détail"}
                aria-pressed={voletOuvert}
                onClick={() => {
                  if (voletOuvert) return choisir(null);
                  const premier = vue === "avenants" ? avenants[0] && `avenant:${avenants[0].a.id}` : situations[0] && `situation:${situations[0].s.id}`;
                  if (premier) choisir(premier);
                }}
              >
                <DalIcone nom="Volet" />
              </button>
            </div>
          </div>
        </header>

        {erreur && source === "reelle" ? (
          <p className="dal-bd-note" role="alert">
            La base réelle n&apos;a pas répondu. {erreur}
          </p>
        ) : null}

        <div className="dal-bd-corps" data-volet={voletOuvert ? "" : undefined}>
          {titreVide ? (
            <p className="dal-bd-vide" role="status">
              {titreVide}
            </p>
          ) : (
            <div className="dal-bd-tableau" role="list" aria-label={vue === "avenants" ? "Avenants par état" : "Situations par état"}>
              {visibles.map(({ c, n, cartes }) => (
                <section
                  key={c.cle}
                  role="listitem"
                  className="dal-bd-colonne"
                  data-masquee={c.masquee ? "" : undefined}
                  data-survol={survolee === c.cle ? "" : undefined}
                  aria-label={`${c.nom} : ${n}`}
                  onDragOver={(e) => {
                    if (!glisse) return;
                    e.preventDefault();
                    if (survolee !== c.cle) setSurvolee(c.cle);
                  }}
                  onDragLeave={(e) => {
                    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setSurvolee(null);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const cle = e.dataTransfer.getData("text/plain") || glisse;
                    setSurvolee(null);
                    setGlisse(null);
                    if (!cle) return;
                    choisir(cle);
                    toast(vue === "avenants" ? "L'état d'un avenant change par son geste, dans le détail : soumettre, signer, abandonner." : "L'état d'une situation change par son geste, dans le détail : soumettre, valider, noter un paiement.");
                  }}
                >
                  <div className="dal-bd-colonne-tete">
                    <DalIcone nom={ICONE_ETAT[c.etat]} taille={14} className="dal-bd-etat" data-etat={c.etat} />
                    <h2 className="dal-bd-colonne-nom">{c.nom}</h2>
                    <span className="dal-bd-colonne-compte">{n}</span>
                    <span className="dal-pousse" />
                    <MenuColonne
                      nom={c.nom}
                      masquer={() => {
                        if (c.masquee) setMasqueesVisibles(false);
                        setCachees((l) => [...l, `${vue}:${c.cle}`]);
                      }}
                    />
                    <div className="dal-bd-pop" data-dal-bd-pop="">
                      <button type="button" className="dal-rond dal-bd-plus" aria-label={vue === "avenants" ? "Nouvel avenant" : "Nouvelle situation"} title={vue === "avenants" ? "Nouvel avenant" : "Nouvelle situation"} aria-expanded={menu === `plus:${c.cle}`} onClick={() => setMenu(menu === `plus:${c.cle}` ? null : `plus:${c.cle}`)}>
                        <DalIcone nom="Plus" />
                      </button>
                      {menu === `plus:${c.cle}` ? <MenuChantiers vue={vue} chantiers={pourNouveau} lien={lienNouveau} fermer={() => setMenu(null)} /> : null}
                    </div>
                  </div>
                  <div className="dal-bd-cartes">
                    {cartes}
                    {!n && !c.masquee ? <p className="dal-bd-colonne-vide">{vue === "avenants" ? "Aucun avenant dans cet état." : "Aucune situation dans cet état."}</p> : null}
                  </div>
                </section>
              ))}
            </div>
          )}

          {voletOuvert ? (
            <aside className="lin dal-bd-volet" aria-label="Détail">
              <div ref={setCible} className="lvp-cible" />
              {elu?.annulee ? (
                <section className="lit-carte lvp-detail" aria-label="Situation annulée">
                  <p className="lvp-detail-sous">Cette situation est annulée : elle ne se modifie plus. Ses lignes restent sur la fiche du chantier.</p>
                </section>
              ) : null}
              {!elu ? (
                <section className="lit-carte lvp-detail" aria-label="Détail">
                  <p className="lvp-detail-sous">{lecture ? "Lecture des chantiers…" : "Cet élément n'est pas visible avec ce compte. Il a peut-être été retiré, ou son chantier n'est pas dans votre liste."}</p>
                </section>
              ) : null}
            </aside>
          ) : null}
        </div>

        {/* le détail et les fenêtres de l'élément ouvert : ceux de la fiche du chantier ; sa liste n'est pas montrée */}
        {elu && !elu.annulee ? (
          <div className="dal-bd-hote" hidden>
            <Habille>
              <ChantierVue key={`${elu.section}-${source}-${elu.t.chantier.id}`} tableau={elu.t} source={source} onLocal={onLocal} relire={() => relireChantier(elu.t.chantier.id)} sections={[elu.section]} />
            </Habille>
          </div>
        ) : null}

        {contextuel ? (
          <div className="dal-menu dal-bd-contextuel" role="menu" aria-label={contextuel.item.ident} style={{ left: contextuel.x, top: contextuel.y }} onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" role="menuitem" className="dal-menu-option" onClick={() => (setContextuel(null), choisir(contextuel.item.cle))}>
              <DalIcone nom="Volet" />
              <span>Ouvrir le détail</span>
            </button>
            <Link href={fiche(contextuel.item.t.chantier.id)} role="menuitem" className="dal-menu-option" onClick={() => setContextuel(null)}>
              <DalIcone nom="Crane" />
              <span>Fiche du chantier</span>
            </Link>
            <div className="dal-menu-sep" role="separator" />
            <button
              type="button"
              role="menuitem"
              className="dal-menu-option"
              onClick={() => {
                setContextuel(null);
                copier(`${CHEMIN}?${contextuel.item.cle.startsWith("avenant") ? "avenant" : "situation"}=${encodeURIComponent(contextuel.item.id)}`);
              }}
            >
              <DalIcone nom="LienUrl" />
              <span>Copier le lien</span>
            </button>
          </div>
        ) : null}
      </DalCarte>
    </VoletContexte.Provider>
  );
}

type CtxCarte = {
  choisie: string | null;
  glisse: string | null;
  setGlisse: (c: string | null) => void;
  setSurvolee: (c: string | null) => void;
  choisir: (c: string | null) => void;
  setContextuel: (c: { x: number; y: number; item: Item } | null) => void;
};

/* ——— une carte : 322 de large, r 8, p 8 ; identifiant et avatar, état et titre, puces, pied ——— */
function Carte({ ctx, item, avatar, avatarTitre, pied, piedTitre, children }: { ctx: CtxCarte; item: Item; avatar: string | null; avatarTitre: string; pied: string; piedTitre?: string; children: React.ReactNode }) {
const { choisie, glisse, setGlisse, setSurvolee, choisir, setContextuel } = ctx;
  const href = `${CHEMIN}?${item.cle.startsWith("avenant") ? "avenant" : "situation"}=${encodeURIComponent(item.id)}`;
  return (
    <a
      href={href}
      className="dal-bd-carte"
      aria-current={choisie === item.cle ? "true" : undefined}
      draggable
      data-glisse={glisse === item.cle ? "" : undefined}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", item.cle);
        setGlisse(item.cle);
      }}
      onDragEnd={() => {
        setGlisse(null);
        setSurvolee(null);
      }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey) return;
        e.preventDefault();
        choisir(choisie === item.cle ? null : item.cle);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        setContextuel({ x: e.clientX, y: e.clientY, item });
      }}
    >
      <span className="dal-bd-carte-l1">
        <span className="dal-bd-ident">{item.ident}</span>
        <span className="dal-bd-avatar" title={avatarTitre}>
          {avatar ? <span className="dal-bd-initiales">{initiales(avatar)}</span> : <DalIcone nom="UnassignedCircle" />}
        </span>
      </span>
      <span className="dal-bd-carte-titre">
        <DalIcone nom={ICONE_ETAT[item.etat]} taille={14} className="dal-bd-etat" data-etat={item.etat} />
        <span className="dal-bd-carte-texte">{item.titre}</span>
      </span>
      <span className="dal-bd-puces">{children}</span>
      <span className="dal-bd-pied" title={piedTitre}>
        {pied}
      </span>
    </a>
  );
}

/* ——— une puce de la carte : 24 de haut, r 48, bord 0.5 ; carrée pour l'urgence (priorité de Linear) ——— */
function Puce({ icone, pastille, carre, titre, children, ...data }: { icone?: NomDalIcone; pastille?: string; carre?: boolean; titre?: string; children?: React.ReactNode } & Record<`data-${string}`, string | undefined>) {
  return (
    <span className="dal-bd-puce" data-carre={carre ? "" : undefined} title={titre} {...data}>
      {icone ? <DalIcone nom={icone} taille={14} /> : null}
      {pastille ? (
        <span className="dal-bd-pastille-boite" aria-hidden="true">
          <span className="dal-bd-pastille" style={{ background: pastille }} />
        </span>
      ) : null}
      {children !== undefined && children !== null ? <span className="dal-bd-puce-texte">{children}</span> : null}
    </span>
  );
}

/* ——— « Nouvel avenant » : le chantier où l'ouvrir ——— */
function MenuChantiers({ vue, chantiers, lien, fermer }: { vue: Vue; chantiers: { id: string; nom: string; commune: string }[]; lien: (id: string) => string; fermer: () => void }) {
  return (
    <div className="dal-menu dal-bd-menu" role="menu" aria-label={vue === "avenants" ? "Ouvrir un avenant sur" : "Nouvelle situation sur"}>
      <p className="dal-bd-menu-titre">{vue === "avenants" ? "Ouvrir un avenant sur…" : "Nouvelle situation sur…"}</p>
      {chantiers.length ? (
        chantiers.map((c) => (
          <Link key={c.id} href={lien(c.id)} role="menuitem" className="dal-menu-option" onClick={fermer}>
            <DalIcone nom="Crane" />
            <span className="dal-pousse">{c.nom}</span>
            <span className="dal-bd-menu-compte">{c.commune}</span>
          </Link>
        ))
      ) : (
        <p className="dal-bd-menu-aide">{vue === "avenants" ? "Un avenant se prépare sur un chantier ouvert." : "Une situation se calcule sur un chantier au marché vérifié, pour qui voit les prix."}</p>
      )}
    </div>
  );
}

/* ——— le « … » d'une colonne ——— */
function MenuColonne({ nom, masquer }: { nom: string; masquer: () => void }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => !boite.current?.contains(e.target as Node) && setOuvert(false);
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return (
    <div ref={boite} className="dal-bd-pop">
      <button type="button" className="dal-rond dal-bd-plus" aria-label={`Actions de la colonne ${nom}`} title={`Actions de la colonne ${nom}`} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <DalIcone nom="Points" />
      </button>
      {ouvert ? (
        <div className="dal-menu dal-bd-menu" role="menu" aria-label={`Actions de la colonne ${nom}`}>
          <button type="button" role="menuitem" className="dal-menu-option" onClick={() => (setOuvert(false), masquer())}>
            <DalIcone nom="Archive" />
            <span>Masquer la colonne</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
