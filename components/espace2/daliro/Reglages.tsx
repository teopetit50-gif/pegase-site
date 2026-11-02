"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Réglages — Linear, Settings › Issue labels et Issue templates,
   au 1:1 (02/11/2026, règles de Teo : docs/refonte-metiers/REGLES.md).
   Relevé : docs/refonte-metiers/releves/linear-labels-templates.md ;
   styles : ./dal-reglages.css (préfixe dal-rg-).

   Ce qui vaut pour toute l'entreprise, sorti du dossier d'un chantier :
     · la bibliothèque de prix (B26, partie prix ; F34 « Poser un prix »,
       G60 « Valider ») sur « Issue labels » : un prix par ligne, la
       pastille dit son statut (validé, proposé), le nom se modifie en
       posant un nouveau prix, le « … » de la ligne valide ; tri par
       colonne, filtre par désignation et par statut (dans l'adresse :
       ?q, ?statut, ?tri, ?sens) ; « Regrouper par corps d'état » (Display
       options) range les prix en groupes, comme les groupes d'étiquettes ;
     · l'organisation sur « Issue templates », posée à la suite (les deux
       pages de réglages de Linear, l'une sous l'autre) : l'accord
       permanent des confirmations J-2 (B04 ; G02 donner ou renouveler, G03
       activer seul, G04 et F02 révoquer — chaque geste passe par une
       fenêtre de confirmation), un canal par ligne, et les contrôles de
       l'organisation (B12, partie organisation), qui mènent à l'annuaire.

   Mêmes portes que l'écran d'avant (poserPrix, validerPrix ; chargerAccordJ2,
   donnerAccordJ2, activerAccordJ2Seul, revoquerAccordJ2). En exemple, la
   bibliothèque est recopiée dans chaque tableau : un prix posé ou validé
   l'est dans tous, pour que chaque fiche de chantier le voie.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { dateCourte, montant, relatif } from "@/components/espace/format";
import { GRAVITES, UNITES, familleControle, libelleUnite } from "@/components/espace/daliro/etats";
import { activerAccordJ2Seul, chargerAccordJ2, donnerAccordJ2, poserPrix, revoquerAccordJ2, validerPrix } from "@/components/espace/daliro/portes";
import type { AccordJ2, CanalAccordJ2, Gravite, Prix, Tableau } from "@/components/espace/daliro/types";
import { dans } from "@/components/espace/exemples/socle";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { DalCarte } from "./DalCadre";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import { useDaliro } from "./donnees";
import { PRIX_PLUS, accordExemple, canalAccord } from "./exemplesReglages";
import { exporterCsv } from "./navigateur";
import "./dal-reglages.css";

const BASE = `${RACINE}/daliro`;

type Tri = "designation" | "origine" | "unite" | "prix" | "statut" | "date";
type Filtre = "tous" | "valide" | "propose";
type Form =
  | { type: "poser"; designation?: string; unite?: string; corps?: string; groupe?: boolean }
  | { type: "valider-tous"; prix: Prix[] }
  | { type: "valider"; prix: Prix }
  | { type: "donner" }
  | { type: "activer" }
  | { type: "revoquer" }
  | null;

/* la pastille d'un prix : vert validé, jaune proposé (couleurs des étiquettes de Linear) */
const COULEUR_STATUT: Record<"valide" | "propose", string> = { valide: "#4cb782", propose: "#f2c94c" };
const COULEUR_GRAVITE: Record<Gravite, string> = { bloquant: "#eb5757", attention: "#f2994a", info: "#4ea7fc" };
const LIBELLE_CANAL: Record<CanalAccordJ2["canal"], string> = { email: "courriel", whatsapp: "WhatsApp", sms: "SMS" };
const ICONE_CANAL: Record<CanalAccordJ2["canal"], NomDalIcone> = { email: "Email", whatsapp: "Chat", sms: "Phone" };
const ORDRE_CANAL: CanalAccordJ2["canal"][] = ["email", "sms", "whatsapp"];
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const nid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
const nombre = (v: string) => Number(v.replace(/\s/g, "").replace(",", "."));
const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const uniteCourte = (u: string) => (u === "m2" ? "m²" : u === "m3" ? "m³" : u);
const moisJour = (iso: string | null | undefined) => (iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }).replace(".", "") : "");

/* le prix validé de même désignation et même unité est retiré (règle de la porte, rejouée en exemple) */
const memePrix = (x: Prix, designation: string, unite: string) => x.designation.toLowerCase() === designation.toLowerCase() && x.unite === unite;

export default function Reglages() {
  const { source, pret, erreur: erreurBase, client, liste, tableau, premier, demander, onLocal, relireChantier } = useDaliro();
  const params = useSearchParams();
  const routeur = useRouter();
  const chemin = usePathname();
  const toast = useToast();

  /* en base réelle, la bibliothèque et les contrôles se lisent dans un tableau de chantier */
  useEffect(() => {
    if (source === "reelle" && pret && !premier && liste[0]) demander(liste[0].id);
  }, [source, pret, premier, liste, demander]);

  /* en exemple : la bibliothèque remplie, posée une fois dans chaque tableau */
  const poses = useRef(new Set<string>());
  useEffect(() => {
    if (source !== "exemple") return;
    for (const c of liste) {
      const t = tableau(c.id);
      if (!t || poses.current.has(c.id)) continue;
      poses.current.add(c.id);
      if (t.bibliotheque.some((p) => PRIX_PLUS.some((x) => x.id === p.id))) continue;
      onLocal({ ...t, bibliotheque: [...t.bibliotheque, ...PRIX_PLUS] });
    }
  }, [source, liste, tableau, onLocal]);

  /* ——— l'adresse porte le filtre et le tri ——— */
  const q = params.get("q") ?? "";
  const filtre: Filtre = params.get("statut") === "valide" || params.get("statut") === "propose" ? (params.get("statut") as Filtre) : "tous";
  const tri: Tri = (["designation", "origine", "unite", "prix", "statut", "date"] as Tri[]).find((t) => t === params.get("tri")) ?? "designation";
  const sens = params.get("sens") === "desc" ? "desc" : "asc";
  const groupes = params.get("groupes") === "corps";
  /* les deux pages de réglages (Labels, Templates chez Linear) : ?page=organisation */
  const page: "bibliotheque" | "organisation" = params.get("page") === "organisation" ? "organisation" : "bibliotheque";
  /* les colonnes masquées (Display options) : ?masquees=desc,unite,prix,statut,date */
  const masquees = (params.get("masquees") ?? "").split(",").filter(Boolean);
  const vue = (c: string) => !masquees.includes(c);
  const adresse = (changes: Record<string, string | null>) => {
    const p = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    const s = p.toString().replace(/%2C/gi, ",");
    return s ? `${chemin}?${s}` : chemin;
  };
  const [saisie, setSaisie] = useState(q);
  const filtrer = (v: string) => {
    setSaisie(v);
    routeur.replace(adresse({ q: v.trim() || null }), { scroll: false });
  };
  /* un clic trie la colonne ; un second clic sur la même inverse le sens */
  const trier = (t: Tri) => {
    const inverse = tri === t && sens === "asc";
    routeur.replace(adresse({ tri: t === "designation" ? null : t, sens: inverse ? "desc" : null }), { scroll: false });
  };

  const voitPrix = premier?.voit_prix ?? true;
  const bibliotheque = useMemo(() => (premier?.bibliotheque ?? []).filter((p) => p.statut !== "retire"), [premier]);
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    const l = bibliotheque.filter((p) => (filtre === "tous" || p.statut === filtre) && (!t || p.designation.toLowerCase().includes(t)));
    const cle = (p: Prix): string | number =>
      tri === "prix" ? (p.prix_unitaire_ht ?? -1) : tri === "origine" ? `${p.corps_etat ?? ""} ${p.origine}` : tri === "unite" ? libelleUnite(p.unite) : tri === "statut" ? p.statut : tri === "date" ? p.date_prix : p.designation;
    return [...l].sort((a, b) => {
      const ka = cle(a);
      const kb = cle(b);
      const r = typeof ka === "number" && typeof kb === "number" ? ka - kb : String(ka).localeCompare(String(kb), "fr");
      return (sens === "desc" ? -r : r) || a.designation.localeCompare(b.designation, "fr");
    });
  }, [bibliotheque, q, filtre, tri, sens]);
  const nbValides = bibliotheque.filter((p) => p.statut === "valide").length;
  const nbProposes = bibliotheque.length - nbValides;

  /* regroupés par corps d'état : les groupes rangés parmi les prix, par leur nom (comme les groupes d'étiquettes) */
  const rangees = useMemo(() => {
    if (!groupes) return visibles.map((p) => ({ p, groupe: null as string | null, enfant: false, dernier: false }));
    const parCorps = new Map<string, Prix[]>();
    for (const p of visibles) {
      const c = p.corps_etat ?? "";
      parCorps.set(c, [...(parCorps.get(c) ?? []), p]);
    }
    const out: { p: Prix | null; groupe: string | null; enfant: boolean; dernier: boolean }[] = [];
    for (const [c, l] of [...parCorps.entries()].sort(([a], [b]) => a.localeCompare(b, "fr"))) {
      if (!c) {
        for (const p of l) out.push({ p, groupe: null, enfant: false, dernier: false });
        continue;
      }
      out.push({ p: null, groupe: c, enfant: false, dernier: false });
      l.forEach((p, i) => out.push({ p, groupe: c, enfant: true, dernier: i === l.length - 1 }));
    }
    return out;
  }, [visibles, groupes]);
  const [replies, setReplies] = useState<string[]>([]);

  const controlesOrga = useMemo(
    () => [...(premier?.controles_organisation ?? [])].sort((a, b) => ["bloquant", "attention", "info"].indexOf(a.gravite) - ["bloquant", "attention", "info"].indexOf(b.gravite)),
    [premier],
  );

  /* ——— l'accord J-2 ——— */
  const dirige = source === "exemple" || client?.role === "gerant" || client?.role === "admin";
  const [accord, setAccord] = useState<AccordJ2 | null>(null);
  const [accordLu, setAccordLu] = useState<string | null>(null);
  const cleAccord = `${source}:${client?.client_id ?? ""}`;
  if (accordLu !== cleAccord) {
    setAccordLu(cleAccord);
    setAccord(source === "exemple" ? accordExemple() : null);
  }
  const [erreurAccord, setErreurAccord] = useState<string | null>(null);
  const lireAccord = useCallback(async () => {
    if (source !== "reelle" || !client || !dirige) return;
    try {
      setAccord(await chargerAccordJ2(client.client_id));
      setErreurAccord(null);
    } catch (e) {
      setErreurAccord(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, [source, client, dirige]);
  useEffect(() => {
    if (source === "exemple") return;
    const t = window.setTimeout(() => void lireAccord(), 0);
    return () => window.clearTimeout(t);
  }, [source, lireAccord]);
  const [maintenant] = useState(() => Date.now());
  const etatAccord = accord?.etat ?? "aucun";
  const finProche = accord?.fin ? new Date(accord.fin).getTime() - maintenant < 30 * 86400000 : false;
  const peutDonner = etatAccord === "aucun" || etatAccord === "revoque" || ((etatAccord === "actif" || etatAccord === "partiel") && finProche);
  const peutActiver = etatAccord === "a_valider" && !!accord?.seul_decideur;
  const peutRevoquer = etatAccord === "actif" || etatAccord === "partiel" || etatAccord === "a_valider";

  /* ——— les gestes ——— */
  const [form, setForm] = useState<Form>(null);
  const [champs, setChamps] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const ch = (k: string) => champs[k] ?? "";
  const poseChamp = (k: string, v: string) => setChamps((p) => ({ ...p, [k]: v }));
  const ouvrir = (f: Form) => {
    setErreur(null);
    setChamps(f?.type === "poser" ? { designation: f.designation ?? "", unite: f.unite ?? "u", pu: "", corps: f.corps ?? "" } : {});
    setForm(f);
  };

  /* en base réelle : la porte puis la relecture ; en exemple : chaque tableau modifié en mémoire */
  const agir = async (reelle: () => Promise<unknown>, locale: (t: Tableau) => Tableau, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await reelle();
        if (premier) await relireChantier(premier.chantier.id);
      } else {
        await new Promise((r) => setTimeout(r, 250));
        for (const c of liste) {
          const t = tableau(c.id);
          if (t) onLocal(locale(t));
        }
      }
      toast(message, "vert");
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };
  const faireValider = (p: Prix) =>
    agir(
      () => validerPrix(p.id, null),
      (t) => ({ ...t, bibliotheque: t.bibliotheque.map((x) => (x.id === p.id ? { ...x, statut: "valide" as const } : memePrix(x, p.designation, p.unite) && x.statut === "valide" ? { ...x, statut: "retire" as const } : x)) }),
      `« ${p.designation} » vaut ${montant(p.prix_unitaire_ht)} / ${libelleUnite(p.unite)} : les avenants peuvent s'en servir.`,
    );
  /* valider plusieurs prix proposés d'un coup (la sélection) : la même porte, prix après prix */
  const faireValiderTous = (l: Prix[]) =>
    agir(
      async () => {
        for (const p of l) await validerPrix(p.id, null);
      },
      (t) => ({
        ...t,
        bibliotheque: t.bibliotheque.map((x) => (l.some((p) => p.id === x.id) ? { ...x, statut: "valide" as const } : l.some((p) => memePrix(x, p.designation, p.unite) && p.id !== x.id) && x.statut === "valide" ? { ...x, statut: "retire" as const } : x)),
      }),
      `${l.length} prix validé${l.length > 1 ? "s" : ""} : les avenants peuvent s'en servir.`,
    ).then(() => setSelection([]));
  const fairePoser = () => {
    const designation = ch("designation").trim();
    const unite = ch("unite") || "u";
    const pu = nombre(ch("pu"));
    const corps = ch("corps").trim().toLowerCase() || null;
    const id = nid();
    const clientId = premier?.chantier.client_id ?? client?.client_id ?? "";
    return agir(
      () => poserPrix(clientId, designation, unite, pu, corps),
      (t) => ({
        ...t,
        bibliotheque: [
          ...t.bibliotheque.map((x) => (memePrix(x, designation, unite) && x.statut === "valide" ? { ...x, statut: "retire" as const } : x)),
          { id, designation, unite, corps_etat: corps, origine: "saisie" as const, ligne_marche_id: null, date_prix: aujourdhui(), statut: "valide" as const, prix_unitaire_ht: pu },
        ],
      }),
      "Le prix est posé et validé dans la bibliothèque.",
    );
  };
  const agirAccord = async (reelle: () => Promise<AccordJ2>, locale: () => AccordJ2, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      setAccord(source === "reelle" && client ? await reelle() : locale());
      toast(message, "vert");
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      if (source === "reelle") void lireAccord();
    } finally {
      setEnvoi(false);
    }
  };
  const faireDonner = () =>
    agirAccord(
      () => donnerAccordJ2(client!.client_id),
      () => ({ etat: "a_valider", fin: null, seul_decideur: false, canaux: ORDRE_CANAL.map((c) => canalAccord(c, "a_valider", { debut: dans(0), fin: dans(365), cree_le: dans(0), donne_par_libelle: "Vous", demande_statut: "en_attente" })) }),
      "L'accord est proposé : un autre décideur l'active dans « À valider ».",
    );
  const faireActiver = () =>
    agirAccord(
      () => activerAccordJ2Seul(client!.client_id),
      () => accord ?? accordExemple(),
      "L'accord est actif : les demandes de confirmation à J-2 partent seules.",
    );
  const faireRevoquer = () =>
    agirAccord(
      () => revoquerAccordJ2(client!.client_id, ch("motif").trim() || null),
      () => ({ etat: "revoque", fin: null, canaux: (accord?.canaux ?? []).map((c) => ({ ...c, statut: c.statut === "active" || c.statut === "a_valider" ? "revoquee" : c.statut, revoquee_le: dans(0), revoquee_par_libelle: "Vous", motif_revocation: ch("motif").trim() || null })) }),
      "L'accord est révoqué : chaque demande J-2 attend de nouveau sa validation.",
    );

  const enLecture = source === "reelle" && (!pret || (!premier && liste.length > 0));
  const sansChantier = source === "reelle" && pret && liste.length === 0;

  /* ——— les menus des boutons Filtre et Affichage ——— */
  const [menu, setMenu] = useState<string | null>(null);
  useEffect(() => {
    if (!menu) return;
    const dehors = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-dal-rg-pop]")) setMenu(null);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [menu]);

  const enTete = (t: Tri, libelle: string, classe?: string) => (
    <span className={`dal-rg-th${classe ? ` ${classe}` : ""}`} role="columnheader" aria-sort={tri === t ? (sens === "asc" ? "ascending" : "descending") : undefined}>
      <button type="button" className="dal-rg-tri" onClick={() => trier(t)}>
        <span>{libelle}</span>
        {tri === t ? <FlecheTri bas={sens === "asc"} /> : null}
      </button>
    </span>
  );

  /* les lignes de l'organisation : un canal de l'accord par ligne, puis les contrôles */
  const canaux = ORDRE_CANAL.map((c) => accord?.canaux.find((x) => x.canal === c) ?? canalAccord(c, "aucun"));
  const metaCanal = (c: CanalAccordJ2) =>
    c.statut === "active"
      ? `Actif jusqu'au ${dateCourte(c.fin)} · donné par ${c.donne_par_libelle ?? "—"} ${c.cree_le ? relatif(c.cree_le, new Date(maintenant)) : ""} · ${c.utilises_mois ?? 0} demande${(c.utilises_mois ?? 0) > 1 ? "s" : ""} ce mois-ci`
      : c.statut === "a_valider"
        ? `À valider dans « À valider » · proposé par ${c.donne_par_libelle ?? "—"} ${c.cree_le ? relatif(c.cree_le, new Date(maintenant)) : ""}`
        : c.statut === "revoquee"
          ? `Révoqué le ${dateCourte(c.revoquee_le)}${c.revoquee_par_libelle ? ` par ${c.revoquee_par_libelle}` : ""}${c.motif_revocation ? ` · « ${c.motif_revocation} »` : ""}`
          : c.statut === "refusee"
            ? "Refusé à la validation"
            : "Aucun accord : chaque demande J-2 attend sa validation";
  const gestesAccord: { libelle: string; icone: NomDalIcone; action: () => void }[] = [
    ...(peutDonner ? [{ libelle: etatAccord === "actif" || etatAccord === "partiel" ? "Renouveler l'accord…" : "Donner l'accord permanent…", icone: "Shield" as NomDalIcone, action: () => ouvrir({ type: "donner" }) }] : []),
    ...(peutActiver ? [{ libelle: "Activer moi-même…", icone: "Shield" as NomDalIcone, action: () => ouvrir({ type: "activer" }) }] : []),
    ...(peutRevoquer ? [{ libelle: "Révoquer l'accord…", icone: "StatusCanceled" as NomDalIcone, action: () => ouvrir({ type: "revoquer" }) }] : []),
  ];
  const nbLignesOrga = (dirige ? canaux.length : 1) + 1 + controlesOrga.length;

  /* ——— la sélection (cases à cocher de Linear) et ses gestes groupés ——— */
  const [selection, setSelection] = useState<string[]>([]);
  const choisis = visibles.filter((p) => selection.includes(p.id));
  const aValider = choisis.filter((p) => p.statut === "propose");
  const cocher = (id: string) => setSelection((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  const toutCoche = visibles.length > 0 && visibles.every((p) => selection.includes(p.id));
  const exporter = (l: Prix[]) =>
    exporterCsv(
      "bibliotheque-de-prix",
      ["Désignation", "Corps d'état", "Origine", "Unité", "PU HT", "Statut", "Date"],
      l.map((p) => [p.designation, p.corps_etat ?? "", p.origine === "marche" ? "Marché vérifié" : "Saisi", libelleUnite(p.unite), voitPrix ? (p.prix_unitaire_ht ?? "") : "", p.statut === "valide" ? "Validé" : "Proposé", p.date_prix]),
    );
  const corpsConnus = [...new Set(bibliotheque.map((p) => p.corps_etat).filter((c): c is string => !!c))].sort((a, b) => a.localeCompare(b, "fr"));
  const COLONNES_AFFICHABLES: { cle: string; libelle: string }[] = [
    { cle: "desc", libelle: "Description" },
    { cle: "unite", libelle: "Unité" },
    { cle: "prix", libelle: "PU HT" },
    { cle: "statut", libelle: "Statut" },
    { cle: "date", libelle: "Date" },
  ];
  const grille = `60px minmax(0, 2fr) ${vue("desc") ? "minmax(0, 3fr) " : ""}${vue("unite") ? "75px " : ""}${vue("prix") ? "75px " : ""}${vue("statut") ? "102px " : ""}${vue("date") ? "82px " : ""}28px 32px`;
  const affichageModifie = groupes || masquees.length > 0 || tri !== "designation" || sens !== "asc";

  useEffect(() => {
    if (!selection.length) return;
    const echap = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector("[role='dialog']") && setSelection([]);
    window.addEventListener("keydown", echap);
    return () => window.removeEventListener("keydown", echap);
  }, [selection.length]);

  /* l'interrupteur des deux pages de réglages (la barre latérale des réglages de Linear) */
  const interrupteur = (
    <nav className="dal-rg-pages" aria-label="Réglages">
      <Link href={adresse({ page: null })} scroll={false} className="dal-rg-page-lien" aria-current={page === "bibliotheque" ? "page" : undefined}>
        <DalIcone nom="Label" taille={14} />
        <span>Bibliothèque de prix</span>
      </Link>
      <Link href={adresse({ page: "organisation" })} scroll={false} className="dal-rg-page-lien" aria-current={page === "organisation" ? "page" : undefined}>
        <DalIcone nom="NotePad" taille={14} />
        <span>Organisation</span>
      </Link>
    </nav>
  );

  return (
    <DalCarte className="dal-rg-page">
      <h1 className="v2-sr">Réglages</h1>
      <div className="dal-defile dal-rg-defile">
        {/* ——— la bibliothèque de prix : Settings › Issue labels ——— */}
        <div className="dal-rg-bande">{interrupteur}</div>
        {page === "bibliotheque" ? (
        <>
        <div className="dal-rg-titre">
          <h2 className="dal-rg-h2">Bibliothèque de prix</h2>
          <div className="dal-rg-boutons">
            <button type="button" className="dal-rg-btn" onClick={() => ouvrir({ type: "poser", groupe: true })} disabled={enLecture || sansChantier} title="Un corps d'état est un groupe de prix : nommez-le et posez son premier prix">
              Nouveau corps d&apos;état
            </button>
            <button type="button" className="dal-rg-btn dal-rg-btn--plein" onClick={() => ouvrir({ type: "poser" })} disabled={enLecture || sansChantier}>
              Poser un prix
            </button>
          </div>
        </div>

        <div className="dal-rg-filtre">
          <label className="dal-rg-recherche">
            <DalIcone nom="Search" />
            <input className="dal-rg-champ" type="search" placeholder="Filtrer par désignation…" aria-label="Filtrer par désignation" value={saisie} onChange={(e) => filtrer(e.target.value)} />
          </label>
          <div className="dal-rg-outils">
            <div className="dal-rg-pop" data-dal-rg-pop="">
              <button type="button" className="dal-rond dal-rond--plein" aria-label="Filtrer par statut" title="Filtrer par statut" aria-expanded={menu === "filtre"} onClick={() => setMenu(menu === "filtre" ? null : "filtre")}>
                <DalIcone nom="Filtre" />
                {filtre !== "tous" ? <span className="dal-rg-point" /> : null}
              </button>
              {menu === "filtre" ? (
                <div className="dal-menu dal-rg-menu" role="menu" aria-label="Filtrer par statut">
                  {(
                    [
                      ["tous", "Tous les prix", bibliotheque.length, null],
                      ["valide", "Validés", nbValides, COULEUR_STATUT.valide],
                      ["propose", "Proposés", nbProposes, COULEUR_STATUT.propose],
                    ] as const
                  ).map(([cle, libelle, n, couleur]) => (
                    <Link key={cle} href={adresse({ statut: cle === "tous" ? null : cle })} scroll={false} replace role="menuitemradio" aria-checked={filtre === cle} className="dal-menu-option" onClick={() => setMenu(null)}>
                      {couleur ? (
                        <span className="dal-rg-pastille-boite">
                          <span className="dal-rg-pastille" style={{ background: couleur }} />
                        </span>
                      ) : (
                        <DalIcone nom="Label" />
                      )}
                      <span className="dal-pousse">{libelle}</span>
                      <span className="dal-rg-menu-compte">{n}</span>
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="dal-rg-pop" data-dal-rg-pop="">
              <button type="button" className="dal-rond dal-rond--plein" aria-label="Options d'affichage" title="Options d'affichage" aria-expanded={menu === "affichage"} onClick={() => setMenu(menu === "affichage" ? null : "affichage")}>
                <DalIcone nom="Affichage" />
                {affichageModifie ? <span className="dal-rg-point" /> : null}
              </button>
              {menu === "affichage" ? (
                <div className="dal-menu dal-rg-menu" role="menu" aria-label="Options d'affichage">
                  <Link href={adresse({ groupes: groupes ? null : "corps" })} scroll={false} replace role="menuitemcheckbox" aria-checked={groupes} className="dal-menu-option" onClick={() => setMenu(null)}>
                    <DalIcone nom="Folder" />
                    <span className="dal-pousse">Regrouper par corps d&apos;état</span>
                    {groupes ? <DalIcone nom="IssueStatusDone" /> : null}
                  </Link>
                  <div className="dal-menu-sep" role="separator" />
                  <p className="dal-rg-menu-titre">Trier par</p>
                  {(
                    [
                      ["designation", "Désignation"],
                      ["prix", "PU HT"],
                      ["date", "Date"],
                      ["statut", "Statut"],
                    ] as const
                  ).map(([cle, libelle]) => (
                    <Link key={cle} href={adresse({ tri: cle === "designation" ? null : cle, sens: null })} scroll={false} replace role="menuitemradio" aria-checked={tri === cle} className="dal-menu-option">
                      <DalIcone nom={cle === "prix" ? "Euro" : cle === "date" ? "Calendar" : cle === "statut" ? "IssueStatusDone" : "Label"} />
                      <span className="dal-pousse">{libelle}</span>
                      {tri === cle ? <FlecheTri bas={sens === "asc"} /> : null}
                    </Link>
                  ))}
                  <div className="dal-menu-sep" role="separator" />
                  <p className="dal-rg-menu-titre">Colonnes affichées</p>
                  {COLONNES_AFFICHABLES.map((c) => (
                    <Link
                      key={c.cle}
                      href={adresse({ masquees: (vue(c.cle) ? [...masquees, c.cle] : masquees.filter((x) => x !== c.cle)).join(",") || null })}
                      scroll={false}
                      replace
                      role="menuitemcheckbox"
                      aria-checked={vue(c.cle)}
                      className="dal-menu-option"
                    >
                      <span className="dal-pousse">{c.libelle}</span>
                      {vue(c.cle) ? <DalIcone nom="IssueStatusDone" /> : null}
                    </Link>
                  ))}
                  <div className="dal-menu-sep" role="separator" />
                  <button type="button" role="menuitem" className="dal-menu-option" onClick={() => (setMenu(null), exporter(visibles))} disabled={!visibles.length}>
                    <DalIcone nom="Spreadsheet" />
                    <span className="dal-pousse">Exporter la liste (CSV)</span>
                    <span className="dal-rg-menu-compte">{visibles.length}</span>
                  </button>
                  {affichageModifie ? (
                    <Link href={adresse({ groupes: null, masquees: null, tri: null, sens: null })} scroll={false} replace role="menuitem" className="dal-menu-option" onClick={() => setMenu(null)}>
                      <DalIcone nom="Refresh" />
                      <span>Revenir à l&apos;affichage par défaut</span>
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="dal-rg-tableau" role="table" aria-label="Bibliothèque de prix" data-selection={selection.length ? "" : undefined} style={{ "--dal-rg-grille-voulue": grille } as React.CSSProperties}>
          <div className="dal-rg-entete" role="row">
            <span className="dal-rg-c-indent" role="columnheader">
              <Case coche={toutCoche} partiel={!toutCoche && choisis.length > 0} libelle={toutCoche ? "Tout désélectionner" : "Tout sélectionner"} onChange={() => setSelection(toutCoche ? [] : visibles.map((p) => p.id))} />
            </span>
            {enTete("designation", "Désignation")}
            {vue("desc") ? enTete("origine", "Description", "dal-rg-c-desc") : null}
            {vue("unite") ? enTete("unite", "Unité", "dal-rg-c-unite") : null}
            {vue("prix") ? enTete("prix", "PU HT", "dal-rg-c-prix") : null}
            {vue("statut") ? enTete("statut", "Statut", "dal-rg-c-statut") : null}
            {vue("date") ? enTete("date", "Date", "dal-rg-c-date") : null}
            <span aria-hidden="true" />
            <span aria-hidden="true" />
          </div>
          {erreurBase ? (
            <p className="dal-rg-vide" role="alert">
              La base réelle n&apos;a pas répondu. {erreurBase}
            </p>
          ) : enLecture ? (
            <p className="dal-rg-vide">Lecture de la bibliothèque…</p>
          ) : sansChantier ? (
            <p className="dal-rg-vide">La bibliothèque se lit avec vos chantiers : créez d&apos;abord un chantier.</p>
          ) : !bibliotheque.length ? (
            <p className="dal-rg-vide">La bibliothèque se remplit des prix des marchés vérifiés ; un prix ne vaut qu&apos;une fois validé.</p>
          ) : !visibles.length ? (
            <p className="dal-rg-vide">Aucun prix ne correspond.</p>
          ) : (
            <div role="rowgroup">
              {rangees.map(({ p, groupe, enfant, dernier }) => {
                if (!p && groupe) {
                  const replie = replies.includes(groupe);
                  const enfants = visibles.filter((x) => x.corps_etat === groupe).map((x) => x.id);
                  const n = enfants.length;
                  return (
                    <div key={`g:${groupe}`} className="dal-rg-ligne dal-rg-groupe" role="row">
                      <span className="dal-rg-c-indent" role="cell">
                        <Case
                          coche={enfants.length > 0 && enfants.every((x) => selection.includes(x))}
                          partiel={enfants.some((x) => selection.includes(x)) && !enfants.every((x) => selection.includes(x))}
                          libelle={`Sélectionner les prix de ${groupe}`}
                          onChange={() => setSelection((l) => (enfants.every((x) => l.includes(x)) ? l.filter((x) => !enfants.includes(x)) : [...new Set([...l, ...enfants])]))}
                        />
                        <button type="button" className="dal-rg-chevron" aria-expanded={!replie} aria-label={replie ? `Déplier ${groupe}` : `Replier ${groupe}`} onClick={() => setReplies((l) => (replie ? l.filter((x) => x !== groupe) : [...l, groupe]))}>
                          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M4.5 6h7L8 10.5z" fill="currentColor" />
                          </svg>
                        </button>
                      </span>
                      <span className="dal-rg-c-nom" role="cell">
                        <IconeGroupe />
                        <span className="dal-rg-nom">{majuscule(groupe)}</span>
                      </span>
                      {vue("desc") ? (
                        <span className="dal-rg-c-desc dal-rg-desc" role="cell">
                          {n} prix
                        </span>
                      ) : null}
                      {vue("unite") ? <span className="dal-rg-c-unite" role="cell" /> : null}
                      {vue("prix") ? <span className="dal-rg-c-prix" role="cell" /> : null}
                      {vue("statut") ? <span className="dal-rg-c-statut" role="cell" /> : null}
                      {vue("date") ? <span className="dal-rg-c-date" role="cell" /> : null}
                      <span role="cell" />
                      <span role="cell" />
                    </div>
                  );
                }
                if (!p || (enfant && groupe && replies.includes(groupe))) return null;
                const statut = p.statut === "valide" ? "valide" : "propose";
                const libelleStatut = statut === "valide" ? "Validé" : "Proposé";
                const description = `${p.corps_etat && !enfant ? `${majuscule(p.corps_etat)} · ` : ""}${p.origine === "marche" ? "prix d'un marché vérifié" : "prix saisi"}`;
                return (
                  <div key={p.id} className="dal-rg-ligne" data-enfant={enfant ? "" : undefined} data-dernier={dernier ? "" : undefined} data-coche={selection.includes(p.id) ? "" : undefined} role="row">
                    <span className="dal-rg-c-indent" role="cell">
                      <Case coche={selection.includes(p.id)} libelle={`Sélectionner « ${p.designation} »`} onChange={() => cocher(p.id)} />
                      {enfant ? <span className="dal-rg-lien" aria-hidden="true" /> : null}
                    </span>
                    <span className="dal-rg-c-nom" role="cell">
                      <span className="dal-rg-pastille-boite" title={libelleStatut}>
                        <span className="dal-rg-pastille" style={{ background: COULEUR_STATUT[statut] }} />
                      </span>
                      <button type="button" className="dal-rg-edit" title="Modifier : poser un nouveau prix pour cette désignation" onClick={() => ouvrir({ type: "poser", designation: p.designation, unite: p.unite, corps: p.corps_etat ?? "" })}>
                        <span className="dal-rg-nom">{p.designation}</span>
                      </button>
                    </span>
                    {vue("desc") ? (
                      <span className="dal-rg-c-desc" role="cell">
                        <span className="dal-rg-desc">{majuscule(description)}</span>
                      </span>
                    ) : null}
                    {vue("unite") ? (
                      <span className="dal-rg-c-unite dal-rg-meta" role="cell" title={libelleUnite(p.unite)}>
                        {uniteCourte(p.unite)}
                      </span>
                    ) : null}
                    {vue("prix") ? (
                      <span className="dal-rg-c-prix dal-rg-meta" role="cell">
                        {voitPrix ? montant(p.prix_unitaire_ht) : "—"}
                      </span>
                    ) : null}
                    {vue("statut") ? (
                      <span className="dal-rg-c-statut dal-rg-meta" role="cell">
                        {libelleStatut}
                      </span>
                    ) : null}
                    {vue("date") ? (
                      <span className="dal-rg-c-date dal-rg-meta" role="cell" title={dateCourte(p.date_prix)}>
                        {moisJour(p.date_prix)}
                      </span>
                    ) : null}
                    <span className="dal-rg-c-menu" role="cell">
                      <MenuLigne
                        titre={`Actions sur « ${p.designation} »`}
                        options={[
                          ...(statut === "propose" ? [{ libelle: "Valider ce prix…", icone: "IssueStatusDone" as NomDalIcone, action: () => ouvrir({ type: "valider", prix: p }) }] : []),
                          { libelle: "Poser un nouveau prix…", icone: "Euro" as NomDalIcone, action: () => ouvrir({ type: "poser", designation: p.designation, unite: p.unite, corps: p.corps_etat ?? "" }) },
                          { libelle: selection.includes(p.id) ? "Retirer de la sélection" : "Sélectionner", icone: "Checklist" as NomDalIcone, action: () => cocher(p.id) },
                        ]}
                      />
                    </span>
                    <span role="cell" />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selection.length ? (
          <div className="dal-rg-barre" role="toolbar" aria-label="Prix sélectionnés">
            <span className="dal-rg-barre-compte">
              {choisis.length} sélectionné{choisis.length > 1 ? "s" : ""}
              <button type="button" className="dal-rond dal-rg-barre-x" aria-label="Tout désélectionner" title="Tout désélectionner (Échap)" onClick={() => setSelection([])}>
                <DalIcone nom="StatusCanceled" />
              </button>
            </span>
            <span className="dal-rg-barre-sep" aria-hidden="true" />
            <button type="button" className="dal-rg-barre-btn" disabled={!aValider.length || envoi} onClick={() => ouvrir({ type: "valider-tous", prix: aValider })}>
              <DalIcone nom="IssueStatusDone" taille={14} />
              Valider{aValider.length ? ` (${aValider.length})` : ""}
            </button>
            <button type="button" className="dal-rg-barre-btn" disabled={!choisis.length} onClick={() => exporter(choisis)}>
              <DalIcone nom="Spreadsheet" taille={14} />
              Exporter en CSV
            </button>
          </div>
        ) : null}
        </>
        ) : (
        /* ——— l'organisation : Settings › Issue templates ——— */
        <section className="dal-rg-colonne" aria-labelledby="dal-rg-orga">
          <div className="dal-rg-colonne-tete">
            <h2 id="dal-rg-orga" className="dal-rg-h2">
              Organisation
            </h2>
            <p className="dal-rg-aide">
              Ce qui vaut pour toute l&apos;entreprise, pas pour un chantier : l&apos;accord qui laisse partir seules les demandes de confirmation à J-2, et les contrôles de l&apos;annuaire.{" "}
              <Link href={`${BASE}/annuaire`} className="dal-rg-docs">
                Annuaire
                <DalIcone nom="Fleche" taille={12} />
              </Link>
            </p>
          </div>

          <div className="dal-rg-carte">
            <div className="dal-rg-carte-tete">
              <h3 className="dal-rg-carte-titre">{enLecture ? "Réglages de l'organisation" : `${nbLignesOrga} réglage${nbLignesOrga > 1 ? "s" : ""} de l'organisation`}</h3>
              {dirige && gestesAccord.length ? <MenuLigne plus titre="Accord permanent des confirmations J-2" options={gestesAccord} /> : null}
            </div>
            <ul className="dal-rg-modeles">
              {dirige ? (
                canaux.map((c) => (
                  <li key={c.canal} className="dal-rg-modele">
                    <span className="dal-rg-vignette" aria-hidden="true">
                      <DalIcone nom={ICONE_CANAL[c.canal]} />
                    </span>
                    <span className="dal-rg-modele-texte">
                      <span className="dal-rg-modele-nom">Accord J-2 par {LIBELLE_CANAL[c.canal]}</span>
                      <span className="dal-rg-modele-meta">{metaCanal(c)}</span>
                    </span>
                    {gestesAccord.length ? <MenuLigne titre={`Accord J-2 par ${LIBELLE_CANAL[c.canal]}`} options={gestesAccord} /> : null}
                  </li>
                ))
              ) : (
                <li className="dal-rg-modele">
                  <span className="dal-rg-vignette" aria-hidden="true">
                    <DalIcone nom="Shield" />
                  </span>
                  <span className="dal-rg-modele-texte">
                    <span className="dal-rg-modele-nom">Accord permanent des confirmations J-2</span>
                    <span className="dal-rg-modele-meta">Réservé au gérant et aux administrateurs de l&apos;organisation.</span>
                  </span>
                </li>
              )}
              {/* 02/11/2026 (PAGES-MANQUANTES.md) : le journal des validations de Daliro — avenants, situations,
                  prix — sur la page Activité de l'espace, filtrée sur le module */}
              <li className="dal-rg-modele">
                <Link href={`${RACINE}/activite?modules=daliro`} className="dal-rg-modele-lien" aria-label="Journal des validations — ouvrir l'activité de Daliro" />
                <span className="dal-rg-vignette" aria-hidden="true">
                  <DalIcone nom="Checklist" />
                </span>
                <span className="dal-rg-modele-texte">
                  <span className="dal-rg-modele-nom">Journal des validations</span>
                  <span className="dal-rg-modele-meta">Qui a demandé, validé ou refusé : avenants, situations et prix de Daliro, dans l&apos;activité de l&apos;espace</span>
                </span>
              </li>
              {controlesOrga.map((k) => (
                <li key={`${k.code}-${k.objet_id}`} className="dal-rg-modele">
                  <Link href={`${BASE}/annuaire`} className="dal-rg-modele-lien" aria-label={`${k.message} — ouvrir l'annuaire`} />
                  <span className="dal-rg-vignette" aria-hidden="true" style={{ color: COULEUR_GRAVITE[k.gravite] }}>
                    <DalIcone nom="Users" />
                  </span>
                  <span className="dal-rg-modele-texte">
                    <span className="dal-rg-modele-nom">{k.message}</span>
                    <span className="dal-rg-modele-meta">
                      {GRAVITES[k.gravite].libelle} · {familleControle(k.code)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          {erreurAccord ? (
            <p className="dal-rg-vide" role="alert">
              L&apos;accord J-2 n&apos;a pas pu être lu. {erreurAccord}
            </p>
          ) : null}
        </section>
        )}
      </div>

      {/* ——— les fenêtres ——— */}
      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          {form?.type === "poser" ? (
            <>
              <DialogHeader>
                <DialogIcone>
                  <DalIcone nom="Euro" taille={18} />
                </DialogIcone>
                <DialogTitle>{form.groupe ? "Nouveau corps d'état" : "Poser un prix dans la bibliothèque"}</DialogTitle>
                <DialogDescription>
                  {form.groupe
                    ? "Un corps d'état range les prix en groupe (Regrouper par corps d'état). Nommez-le et posez son premier prix : réservé à qui a le droit de valider les prix."
                    : "Réservé à qui a le droit de valider les prix. Un nouveau prix validé pour la même désignation retire l'ancien."}
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="esp-form">
                  <label className="rv-libelle">
                    Corps d&apos;état {form.groupe ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                    <input className="rv-champ" list="dal-rg-corps" value={ch("corps")} placeholder="menuiserie, plâtrerie, électricité…" onChange={(e) => poseChamp("corps", e.target.value)} />
                    <datalist id="dal-rg-corps">
                      {corpsConnus.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </label>
                  <label className="rv-libelle">
                    Désignation <span className="esp-obligatoire">(obligatoire)</span>
                    <input className="rv-champ" value={ch("designation")} onChange={(e) => poseChamp("designation", e.target.value)} />
                  </label>
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">
                      Unité
                      <select className="rv-champ" value={ch("unite") || "u"} onChange={(e) => poseChamp("unite", e.target.value)}>
                        {UNITES.map((u) => (
                          <option key={u.cle} value={u.cle}>
                            {u.libelle}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="rv-libelle">
                      PU HT <span className="esp-obligatoire">(obligatoire)</span>
                      <input className="rv-champ" inputMode="decimal" value={ch("pu")} onChange={(e) => poseChamp("pu", e.target.value)} />
                    </label>
                  </div>
                  {erreur ? (
                    <Avis teinte="rouge" role="alert">
                      {erreur}
                    </Avis>
                  ) : null}
                </div>
              </DialogBody>
              <DialogFooter>
                <button type="button" className="r-btn r-btn--noir" disabled={!ch("designation").trim() || !nombre(ch("pu")) || (!!form.groupe && !ch("corps").trim()) || envoi} onClick={() => void fairePoser()}>
                  {envoi ? <Loader variant="spin" /> : null} Poser et valider
                </button>
              </DialogFooter>
            </>
          ) : null}
          {form?.type === "valider" ? (
            <>
              <DialogHeader>
                <DialogIcone>
                  <DalIcone nom="IssueStatusDone" taille={18} />
                </DialogIcone>
                <DialogTitle>Valider ce prix</DialogTitle>
                <DialogDescription>
                  « {form.prix.designation} »{voitPrix ? ` à ${montant(form.prix.prix_unitaire_ht)}` : ""} / {libelleUnite(form.prix.unite)}. Une fois validé, les avenants peuvent s&apos;en servir ; un prix déjà validé pour la même désignation et la même unité est retiré.
                </DialogDescription>
              </DialogHeader>
              {erreur ? (
                <DialogBody>
                  <Avis teinte="rouge" role="alert">
                    {erreur}
                  </Avis>
                </DialogBody>
              ) : null}
              <DialogFooter>
                <button type="button" className="r-btn r-btn--fil" onClick={() => setForm(null)} disabled={envoi}>
                  Annuler
                </button>
                <button type="button" className="r-btn r-btn--noir" onClick={() => void faireValider(form.prix)} disabled={envoi}>
                  {envoi ? <Loader variant="spin" /> : null} Valider le prix
                </button>
              </DialogFooter>
            </>
          ) : null}
          {form?.type === "valider-tous" ? (
            <>
              <DialogHeader>
                <DialogIcone>
                  <DalIcone nom="IssueStatusDone" taille={18} />
                </DialogIcone>
                <DialogTitle>
                  Valider {form.prix.length} prix proposé{form.prix.length > 1 ? "s" : ""}
                </DialogTitle>
                <DialogDescription>Une fois validés, les avenants peuvent s&apos;en servir ; un prix déjà validé pour la même désignation et la même unité est retiré.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <ul className="dal-rg-liste-valider">
                  {form.prix.map((p) => (
                    <li key={p.id}>
                      {p.designation}
                      {voitPrix ? ` — ${montant(p.prix_unitaire_ht)} / ${libelleUnite(p.unite)}` : ""}
                    </li>
                  ))}
                </ul>
                {erreur ? (
                  <Avis teinte="rouge" role="alert">
                    {erreur}
                  </Avis>
                ) : null}
              </DialogBody>
              <DialogFooter>
                <button type="button" className="r-btn r-btn--fil" onClick={() => setForm(null)} disabled={envoi}>
                  Annuler
                </button>
                <button type="button" className="r-btn r-btn--noir" onClick={() => void faireValiderTous(form.prix)} disabled={envoi}>
                  {envoi ? <Loader variant="spin" /> : null} Valider les {form.prix.length} prix
                </button>
              </DialogFooter>
            </>
          ) : null}
          {form?.type === "donner" || form?.type === "activer" ? (
            <>
              <DialogHeader>
                <DialogIcone>
                  <DalIcone nom="Shield" taille={18} />
                </DialogIcone>
                <DialogTitle>{form.type === "activer" ? "Activer l'accord vous-même" : etatAccord === "actif" || etatAccord === "partiel" ? "Renouveler l'accord permanent" : "Donner l'accord permanent"}</DialogTitle>
                <DialogDescription>
                  {form.type === "activer"
                    ? "Vous activerez seul un accord que vous avez proposé : c'est permis parce que personne d'autre ne décide dans l'organisation. Le journal gardera « activé par le seul décideur de l'organisation »."
                    : "Avec cet accord, les demandes de confirmation à J-2 partent seules (courriel, SMS, WhatsApp), tracées « approuvé par accord permanent ». Il est activé dans « À valider » par un autre décideur, pour un an, et se révoque à tout moment."}
                </DialogDescription>
              </DialogHeader>
              {erreur ? (
                <DialogBody>
                  <Avis teinte="rouge" role="alert">
                    {erreur}
                  </Avis>
                </DialogBody>
              ) : null}
              <DialogFooter>
                <button type="button" className="r-btn r-btn--fil" onClick={() => setForm(null)} disabled={envoi}>
                  Annuler
                </button>
                <button type="button" className="r-btn r-btn--noir" onClick={() => void (form.type === "activer" ? faireActiver() : faireDonner())} disabled={envoi}>
                  {envoi ? <Loader variant="spin" /> : null} {form.type === "activer" ? "Activer" : etatAccord === "actif" || etatAccord === "partiel" ? "Renouveler l'accord" : "Donner l'accord"}
                </button>
              </DialogFooter>
            </>
          ) : null}
          {form?.type === "revoquer" ? (
            <>
              <DialogHeader>
                <DialogIcone>
                  <DalIcone nom="Shield" taille={18} />
                </DialogIcone>
                <DialogTitle>Révoquer l&apos;accord permanent</DialogTitle>
                <DialogDescription>Les prochaines demandes de confirmation à J-2 attendront de nouveau leur validation dans « À valider ». Les envois déjà partis ne sont pas touchés.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="esp-form">
                  <label className="rv-libelle">
                    Motif (gardé au journal)
                    <input className="rv-champ" value={ch("motif")} maxLength={500} onChange={(e) => poseChamp("motif", e.target.value)} placeholder="Nous reprenons la main sur les confirmations" />
                  </label>
                  {erreur ? (
                    <Avis teinte="rouge" role="alert">
                      {erreur}
                    </Avis>
                  ) : null}
                </div>
              </DialogBody>
              <DialogFooter>
                <button type="button" className="r-btn r-btn--noir" onClick={() => void faireRevoquer()} disabled={envoi}>
                  {envoi ? <Loader variant="spin" /> : null} Révoquer l&apos;accord
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </DalCarte>
  );
}

/* la case « Select label » de Linear : 14 × 14, bord 1, r 3 ; visible au survol, cochée ou quand une sélection existe */
function Case({ coche, partiel, libelle, onChange }: { coche: boolean; partiel?: boolean; libelle: string; onChange: () => void }) {
  return (
    <label className="dal-rg-case" data-coche={coche || partiel ? "" : undefined} title={libelle}>
      <input
        type="checkbox"
        checked={coche}
        aria-label={libelle}
        ref={(el) => {
          if (el) el.indeterminate = !!partiel;
        }}
        onChange={onChange}
      />
      <span aria-hidden="true">
        {coche ? (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2 5.2 4.1 7.2 8 2.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : partiel ? (
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path d="M2.5 5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : null}
      </span>
    </label>
  );
}

/* la flèche de tri de l'en-tête (12 × 12) */
function FlecheTri({ bas }: { bas: boolean }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true" style={bas ? undefined : { transform: "rotate(180deg)" }}>
      <path d="M6 2.25v7.2M3.1 6.6 6 9.5l2.9-2.9" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* l'icône d'un groupe d'étiquettes : quatre points en losange (relevée sur la capture) */
function IconeGroupe() {
  return (
    <span className="dal-rg-pastille-boite dal-rg-icone-groupe" aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <circle cx="6" cy="2" r="1.6" fill="currentColor" />
        <circle cx="2" cy="6" r="1.6" fill="currentColor" />
        <circle cx="10" cy="6" r="1.6" fill="currentColor" />
        <circle cx="6" cy="10" r="1.6" fill="currentColor" />
      </svg>
    </span>
  );
}

/* le « … » d'une ligne (32 × 32, visible au survol) ou le « + » d'une carte ; menu de Linear */
function MenuLigne({ titre, options, plus }: { titre: string; options: { libelle: string; icone: NomDalIcone; action: () => void }[]; plus?: boolean }) {
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
    <div ref={boite} className="dal-rg-pop" data-ouvert={ouvert ? "" : undefined}>
      <button type="button" className={`dal-rond ${plus ? "dal-rg-plus" : "dal-rg-points"}`} aria-label={titre} title={titre} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        <DalIcone nom={plus ? "Plus" : "Points"} />
      </button>
      {ouvert ? (
        <div className="dal-menu dal-rg-menu" role="menu" aria-label={titre}>
          {options.map((o) => (
            <button
              key={o.libelle}
              type="button"
              role="menuitem"
              className="dal-menu-option"
              onClick={() => {
                setOuvert(false);
                o.action();
              }}
            >
              <DalIcone nom={o.icone} />
              <span>{o.libelle}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
