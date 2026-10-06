"use client";

/* ══════════════════════════════════════════════════════════════════════
   Les honoraires d'un dossier Tamila (06/10/2026, session B4, b4_06)

   Une carte du dossier ouvert : la convention d'honoraires (obligatoire
   sauf urgence, loi du 31/12/1971 art. 10), le temps passé de chacun
   (description chiffrée avec la clé du dossier), les provisions, les
   factures et le compte détaillé définitif (RIN art. 11.7), numérotés
   sans trou. Ce qui reste à facturer se lit d'un coup d'œil.

   En exemple, les gestes s'appliquent en mémoire avec les règles des
   portes ; en base réelle, chaque geste passe par sa porte et la base
   reste juge (son message s'affiche tel quel). Sans b4_06 sur la base,
   la carte ne s'affiche pas.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Banknote, Clock, FileSignature, Printer, ReceiptText } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Def, Pastille } from "../ui";
import { dateCourte } from "../format";
import { chiffrer, dechiffrer } from "./chiffrement";
import { DESCRIPTIONS_TEMPS_EXEMPLE, honorairesExemple } from "./exemples";
import FactureImprimable from "./FactureImprimable";
import * as portes from "./portes";
import type { Moi } from "./regles";
import type { Clair, Convention, Dossier, EnteteFacture, Facture, Honoraires, ModeHonoraires, ModeReglement, NatureTemps, Personne, Piece, Provision, Temps } from "./types";

type Props = {
  dossier: Dossier;
  source: Source;
  moi: Moi;
  personnes: Personne[];
  pieces: Piece[];
  cle: CryptoKey | null;
  peutEcrire: boolean;
  peutGerer: boolean;
  /* un associé du cabinet, ou celui qui gère le dossier : il note les encaissements */
  peutEncaisser: boolean;
  /* pour la facture imprimable (b4_09) */
  clientId: string;
  gerant: boolean;
  entete: EnteteFacture;
  clair: Clair | null;
  clientNom: string | null;
};

type Form =
  | { type: "temps" }
  | { type: "convention" }
  | { type: "signer"; convention: Convention }
  | { type: "provision" }
  | { type: "recue"; provision: Provision }
  | { type: "facturer" }
  | { type: "payee"; facture: Facture }
  | { type: "annuler_facture"; facture: Facture }
  | null;

export const NATURES_TEMPS: Record<NatureTemps, string> = {
  consultation: "Consultation", redaction: "Rédaction", recherche: "Recherche", audience: "Audience", rendez_vous: "Rendez-vous",
  correspondance: "Correspondance", deplacement: "Déplacement", negociation: "Négociation", autre: "Autre",
};
export const MODES_HONORAIRES: Record<ModeHonoraires, string> = { temps_passe: "Au temps passé", forfait: "Au forfait", mixte: "Forfait et temps passé" };
export const MODES_REGLEMENT: Record<ModeReglement, string> = { virement: "Virement", cheque: "Chèque", carte: "Carte bancaire", especes: "Espèces", billet_a_ordre: "Billet à ordre" };
const MOTIFS_ANNULATION_FACTURE: Record<string, string> = { erreur_montant: "Erreur de montant", erreur_client: "Erreur de client", erreur_dossier: "Erreur de dossier", doublon: "Facture en double" };

const euros = (cents: number) => (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const duree = (minutes: number) => `${Math.floor(minutes / 60)} h ${String(minutes % 60).padStart(2, "0")}`;
const aujourdhui = () => new Date().toISOString().slice(0, 10);
/** « 250 », « 250,50 », « 1 200 » → centimes ; null si illisible. */
const centimes = (s: string): number | null => {
  const t = s.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  return Math.round(parseFloat(t) * 100);
};

/* ——— le résumé, calculé comme le fait tamila_honoraires ——— */
export function resumer(h: Honoraires, d: Dossier, maintenant = Date.now()) {
  const c = h.convention;
  const aFacturer = h.temps.filter((t) => t.statut === "saisi" && t.facturable);
  const minutes = aFacturer.reduce((s, t) => s + t.minutes, 0);
  let ht = c && c.mode !== "forfait" && c.taux_horaire_cents ? Math.round((minutes * c.taux_horaire_cents) / 60) : 0;
  const forfaitFacture = h.factures.some((f) => f.statut !== "annulee" && f.forfait_cents > 0);
  if (c && c.mode !== "temps_passe" && c.forfait_cents && !forfaitFacture) ht += c.forfait_cents;
  const ouvertDepuis = Date.parse(d.ouvert_le ?? d.cree_le);
  return {
    minutes,
    aFacturerHt: ht,
    forfaitFacture,
    provisionsDispo: h.provisions.filter((p) => p.statut === "recue" && !p.facture_id).reduce((s, p) => s + p.montant_ttc_cents, 0),
    provisionsDemandees: h.provisions.filter((p) => p.statut === "demandee").reduce((s, p) => s + p.montant_ttc_cents, 0),
    factureTtc: h.factures.filter((f) => f.statut !== "annulee").reduce((s, f) => s + f.total_ttc_cents, 0),
    resteDu: h.factures.filter((f) => f.statut === "emise").reduce((s, f) => s + f.reste_du_cents, 0),
    sansConvention: ["ouvert", "audit"].includes(d.statut) && (!c || (c.statut !== "signee" && !c.urgence)) && maintenant - ouvertDepuis > 15 * 86_400_000,
    peutFacturer: !!c && (c.statut === "signee" || c.urgence),
  };
}

export default function HonorairesTamila({ dossier: d, source, moi, personnes, pieces, cle, peutEcrire, peutGerer, peutEncaisser, clientId, gerant, entete, clair, clientNom }: Props) {
  /* undefined : lecture en cours ; null : la base n'a pas les honoraires (b4_06 non posée) */
  const [h, setH] = useState<Honoraires | null | undefined>(() => (source === "exemple" ? honorairesExemple(d.id) : undefined));
  const [descriptions, setDescriptions] = useState<Record<string, string>>(() => (source === "exemple" ? DESCRIPTIONS_TEMPS_EXEMPLE : {}));
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [tout, setTout] = useState(false);
  const [imprimee, setImprimee] = useState<Facture | null>(null);
  const [f, setF] = useState<Record<string, string>>({});
  const champ = (k: string, defaut = "") => f[k] ?? defaut;
  const poser = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));
  const nomDe = (id: string | null | undefined) => (id ? (personnes.find((p) => p.user_id === id)?.nom ?? "—") : "—");

  /* ——— base réelle : les quatre tables du dossier ——— */
  const relire = async () => {
    const x = await portes.chargerHonoraires(d.id);
    setH(x);
    return x;
  };
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const x = await portes.chargerHonoraires(d.id);
      if (actif) setH(x);
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, d.id]);

  /* ——— les descriptions du temps, déchiffrées avec la clé du dossier ——— */
  useEffect(() => {
    if (source !== "reelle" || !cle || !h) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      const prochaines: Record<string, string> = {};
      for (const x of h.temps) {
        if (!x.description_chiffree || descriptions[x.id] !== undefined) continue;
        const clair = await dechiffrer(cle, x.description_chiffree);
        if (clair !== null) prochaines[x.id] = clair;
      }
      if (actif && Object.keys(prochaines).length) setDescriptions((p) => ({ ...p, ...prochaines }));
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, cle, h, descriptions]);

  const r = useMemo(() => (h ? resumer(h, d) : null), [h, d]);

  const ouvrir = (x: Form) => {
    setErreur(null);
    setFait(null);
    setF({});
    setForm(x);
  };

  /* Un geste : la porte en base réelle, la même règle en mémoire en exemple. */
  async function envoyer(action: () => Promise<unknown>, local: (x: Honoraires) => Honoraires, message: string) {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await action();
        await relire();
      } else {
        await new Promise((res) => setTimeout(res, 300));
        setH((x) => (x ? local(x) : x));
      }
      setFait(message);
      setForm(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  const conv = h?.convention ?? null;
  const tempsVisibles = h ? h.temps.filter((t) => t.statut !== "annule").slice(0, tout ? undefined : 6) : [];
  const nbTemps = h ? h.temps.filter((t) => t.statut !== "annule").length : 0;

  /* ——— les soumissions ——— */
  const soumettreTemps = async () => {
    const minutes = (parseInt(champ("heures", "0"), 10) || 0) * 60 + (parseInt(champ("minutes", "30"), 10) || 0);
    const jour = champ("jour", aujourdhui());
    const nature = champ("nature", "redaction") as NatureTemps;
    const texte = champ("description").trim();
    const facturable = champ("facturable", "oui") === "oui";
    if (minutes < 1 || minutes > 1440) return setErreur("Une durée de 1 minute à 24 heures.");
    if (jour > aujourdhui()) return setErreur("Le jour est passé ou du jour.");
    if (texte && source === "reelle" && !cle) return setErreur("La clé du dossier est nécessaire pour chiffrer la description.");
    const id = crypto.randomUUID();
    await envoyer(
      async () => portes.saisirTemps(d.id, jour, minutes, nature, texte && cle ? await chiffrer(cle, texte) : null, facturable),
      (x) => ({ ...x, temps: [{ id, client_id: d.client_id, dossier_id: d.id, user_id: moi?.user_id ?? "", jour, minutes, nature, description_chiffree: texte ? "\\x01" : null, facturable, statut: "saisi", facture_id: null, cree_le: new Date().toISOString() }, ...x.temps] }),
      `${duree(minutes)} de ${NATURES_TEMPS[nature].toLowerCase()} saisies au ${dateCourte(jour)}.`,
    );
    if (texte && source === "exemple") setDescriptions((p) => ({ ...p, [id]: texte }));
  };

  const soumettreConvention = async () => {
    const mode = champ("mode", "temps_passe") as ModeHonoraires;
    const taux = mode === "forfait" ? null : centimes(champ("taux", "250"));
    const forfait = mode === "temps_passe" ? null : centimes(champ("forfait", ""));
    const complement = champ("complement").trim() ? parseFloat(champ("complement").replace(",", ".")) : null;
    const tva = parseFloat(champ("tva", "20"));
    const urgence = champ("urgence", "non") === "oui";
    if (mode !== "forfait" && (taux === null || taux < 1000 || taux > 200000)) return setErreur("Un taux horaire de 10 € à 2 000 € HT.");
    if (mode !== "temps_passe" && (forfait === null || forfait < 1)) return setErreur("Un forfait positif, en euros HT.");
    if (complement !== null && (Number.isNaN(complement) || complement < 0 || complement > 50)) return setErreur("Un honoraire de résultat de 0 à 50 %.");
    await envoyer(
      () => portes.poserConvention(d.id, mode, taux, forfait, complement, tva, urgence),
      (x) => {
        const nouvelle: Convention = { id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, mode, taux_horaire_cents: taux, forfait_cents: forfait, complement_resultat_pct: complement, taux_tva: tva, urgence, statut: "proposee", signee_le: null, piece_id: null, cree_par: moi?.user_id ?? null, cree_le: new Date().toISOString(), resiliee_le: null };
        const anciennes = x.conventions.map((c) => (c.statut === "resiliee" ? c : { ...c, statut: "resiliee" as const, resiliee_le: new Date().toISOString() }));
        return { ...x, convention: nouvelle, conventions: [nouvelle, ...anciennes] };
      },
      urgence ? "Convention posée en urgence : vous pouvez facturer, la convention écrite viendra ensuite." : "Convention proposée : faites-la signer, puis enregistrez la signature.",
    );
  };

  const soumettreSignature = async (c: Convention) => {
    const le = champ("signee_le", aujourdhui());
    const piece = champ("piece") || null;
    if (le > aujourdhui()) return setErreur("La date de signature est passée ou du jour.");
    await envoyer(
      () => portes.signerConvention(c.id, le, piece),
      (x) => {
        const signee = { ...c, statut: "signee" as const, signee_le: le, piece_id: piece };
        return { ...x, convention: signee, conventions: x.conventions.map((y) => (y.id === c.id ? signee : y)) };
      },
      `Convention signée le ${dateCourte(le)}.`,
    );
  };

  const soumettreProvision = async () => {
    const montant = centimes(champ("montant"));
    if (montant === null || montant < 1) return setErreur("Un montant TTC en euros.");
    await envoyer(
      () => portes.demanderProvision(d.id, montant),
      (x) => ({ ...x, provisions: [{ id: crypto.randomUUID(), client_id: d.client_id, dossier_id: d.id, montant_ttc_cents: montant, demandee_le: aujourdhui(), recue_le: null, mode_reglement: null, statut: "demandee", facture_id: null, cree_par: moi?.user_id ?? null, cree_le: new Date().toISOString() }, ...x.provisions] }),
      `Provision de ${euros(montant)} TTC demandée.`,
    );
  };

  const soumettreRecue = async (p: Provision) => {
    const le = champ("le", aujourdhui());
    const mode = champ("mode", "virement") as ModeReglement;
    if (le > aujourdhui()) return setErreur("La date de réception est passée ou du jour.");
    await envoyer(
      () => portes.provisionRecue(p.id, le, mode),
      (x) => ({ ...x, provisions: x.provisions.map((y) => (y.id === p.id ? { ...y, statut: "recue" as const, recue_le: le, mode_reglement: mode } : y)) }),
      `Provision de ${euros(p.montant_ttc_cents)} reçue (${MODES_REGLEMENT[mode].toLowerCase()}).`,
    );
  };

  const soumettreFacture = async () => {
    if (!h || !conv || !r) return;
    const jusqu = champ("jusqu", aujourdhui());
    const debours = centimes(champ("debours", "0")) ?? -1;
    const definitif = champ("definitif", "non") === "oui";
    if (debours < 0) return setErreur("Les déboursés en euros (0 s'il n'y en a pas).");
    if (jusqu > aujourdhui()) return setErreur("On facture le temps passé, jusqu'à aujourd'hui au plus.");
    let numero = "";
    await envoyer(
      async () => {
        const res = await portes.emettreFacture(d.id, jusqu, debours, definitif);
        numero = res.numero;
      },
      (x) => {
        const pris = x.temps.filter((t) => t.statut === "saisi" && t.facturable && t.jour <= jusqu);
        const minutes = pris.reduce((s, t) => s + t.minutes, 0);
        const temps = conv.mode !== "forfait" && conv.taux_horaire_cents ? Math.round((minutes * conv.taux_horaire_cents) / 60) : 0;
        const forfait = conv.mode !== "temps_passe" && conv.forfait_cents && !x.factures.some((fa) => fa.statut !== "annulee" && fa.forfait_cents > 0) ? conv.forfait_cents : 0;
        const ht = temps + forfait;
        if (ht === 0 && debours === 0 && !definitif) throw new Error("Rien à facturer : aucun temps facturable saisi, forfait déjà facturé, aucun déboursé.");
        const tva = Math.round((ht * conv.taux_tva) / 100);
        const ttc = ht + tva + debours;
        const prov = x.provisions.filter((p) => p.statut === "recue" && !p.facture_id).reduce((s, p) => s + p.montant_ttc_cents, 0);
        const rang = x.factures.reduce((m, fa) => Math.max(m, parseInt(fa.numero.slice(-6), 10)), 41) + 1;
        numero = `H-${new Date().getFullYear()}-${String(rang).padStart(6, "0")}`;
        const id = crypto.randomUUID();
        const fa: Facture = { id, client_id: d.client_id, dossier_id: d.id, numero, nature: definitif ? "compte_definitif" : "facture", emise_le: aujourdhui(), jusqu_au: jusqu, minutes, honoraires_temps_cents: temps, forfait_cents: forfait, debours_cents: debours, total_ht_cents: ht, taux_tva: conv.taux_tva, tva_cents: tva, total_ttc_cents: ttc, provisions_imputees_cents: prov, reste_du_cents: ttc - prov, statut: "emise", payee_le: null, mode_reglement: null, motif_annulation: null, emise_par: moi?.user_id ?? null, cree_le: new Date().toISOString() };
        return {
          ...x,
          factures: [fa, ...x.factures],
          temps: x.temps.map((t) => (pris.includes(t) ? { ...t, statut: "facture" as const, facture_id: id } : t)),
          provisions: x.provisions.map((p) => (p.statut === "recue" && !p.facture_id ? { ...p, facture_id: id } : p)),
        };
      },
      definitif ? "Compte détaillé définitif émis." : "Facture émise.",
    );
    if (numero) setFait(`${definitif ? "Compte détaillé définitif" : "Facture"} ${numero} émis${definitif ? "" : "e"}.`);
  };

  const soumettrePayee = async (fa: Facture) => {
    const le = champ("le", aujourdhui());
    const mode = champ("mode", "virement") as ModeReglement;
    if (le > aujourdhui() || le < fa.emise_le) return setErreur("Le paiement est daté entre l'émission et aujourd'hui.");
    await envoyer(
      () => portes.facturePayee(fa.id, le, mode),
      (x) => ({ ...x, factures: x.factures.map((y) => (y.id === fa.id ? { ...y, statut: "payee" as const, payee_le: le, mode_reglement: mode } : y)) }),
      `Facture ${fa.numero} payée le ${dateCourte(le)}.`,
    );
  };

  const soumettreAnnulation = async (fa: Facture) => {
    const motif = champ("motif", "erreur_montant");
    await envoyer(
      () => portes.annulerFacture(fa.id, motif),
      (x) => ({
        ...x,
        factures: x.factures.map((y) => (y.id === fa.id ? { ...y, statut: "annulee" as const, motif_annulation: motif } : y)),
        temps: x.temps.map((t) => (t.facture_id === fa.id ? { ...t, statut: "saisi" as const, facture_id: null } : t)),
        provisions: x.provisions.map((p) => (p.facture_id === fa.id ? { ...p, facture_id: null } : p)),
      }),
      `Facture ${fa.numero} annulée : son numéro reste, son temps redevient à facturer.`,
    );
  };

  const annulerTemps = (t: Temps) =>
    envoyer(() => portes.annulerTemps(t.id), (x) => ({ ...x, temps: x.temps.map((y) => (y.id === t.id ? { ...y, statut: "annule" as const } : y)) }), "Temps annulé.");

  /* ——— l'aperçu de la facture, avant de l'émettre ——— */
  const apercu = useMemo(() => {
    if (!h || !conv || form?.type !== "facturer") return null;
    const jusqu = f.jusqu ?? aujourdhui();
    const minutes = h.temps.filter((t) => t.statut === "saisi" && t.facturable && t.jour <= jusqu).reduce((s, t) => s + t.minutes, 0);
    const temps = conv.mode !== "forfait" && conv.taux_horaire_cents ? Math.round((minutes * conv.taux_horaire_cents) / 60) : 0;
    const forfait = conv.mode !== "temps_passe" && conv.forfait_cents && !h.factures.some((fa) => fa.statut !== "annulee" && fa.forfait_cents > 0) ? conv.forfait_cents : 0;
    const debours = centimes(f.debours ?? "0") ?? 0;
    const ht = temps + forfait;
    const tva = Math.round((ht * conv.taux_tva) / 100);
    const prov = h.provisions.filter((p) => p.statut === "recue" && !p.facture_id).reduce((s, p) => s + p.montant_ttc_cents, 0);
    return { minutes, temps, forfait, debours, ht, tva, ttc: ht + tva + debours, prov, reste: ht + tva + debours - prov };
  }, [h, conv, form, f]);

  if (h === null) return null;

  const titre: Record<NonNullable<Form>["type"], string> = {
    temps: "Saisir du temps passé", convention: "La convention d'honoraires", signer: "Enregistrer la signature", provision: "Demander une provision",
    recue: "Provision reçue", facturer: "Émettre une facture", payee: "Facture payée", annuler_facture: "Annuler une facture",
  };

  return (
    <section className="esp-carte" aria-label="Honoraires">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Honoraires</h2>
        <div className="esp-actions">
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutEcrire || !h} onClick={() => ouvrir({ type: "temps" })}><Clock width={14} height={14} aria-hidden="true" /> Saisir du temps</button>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutGerer || !h} onClick={() => ouvrir({ type: "convention" })}><FileSignature width={14} height={14} aria-hidden="true" /> Convention</button>
          <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!peutGerer || !h} onClick={() => ouvrir({ type: "provision" })}><Banknote width={14} height={14} aria-hidden="true" /> Provision</button>
          <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!peutGerer || !r?.peutFacturer} title={r && !r.peutFacturer ? "Une convention signée (ou d'urgence) est nécessaire" : undefined} onClick={() => ouvrir({ type: "facturer" })}><ReceiptText width={14} height={14} aria-hidden="true" /> Facturer</button>
        </div>
      </div>
      <div className="esp-carte-corps">
        {h === undefined ? (
          <p className="esp-kpi-sous"><Loader variant="spin" /> Lecture des honoraires…</p>
        ) : (
          <>
            {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
            {r?.sansConvention ? (
              <Avis teinte="ambre" role="alert"><strong>Pas de convention d&apos;honoraires signée.</strong> Le dossier est ouvert depuis plus de quinze jours ; la convention écrite est obligatoire (loi du 31/12/1971, art. 10), sauf urgence.</Avis>
            ) : null}

            <dl className="esp-def esp-def--trois tam-honoraires-chiffres">
              <Def etiquette="À facturer" fort>{r ? `${euros(r.aFacturerHt)} HT` : "—"}<span className="esp-kpi-sous"> · {r ? duree(r.minutes) : ""}</span></Def>
              <Def etiquette="Provisions disponibles">{r ? euros(r.provisionsDispo) : "—"}{r?.provisionsDemandees ? <span className="esp-kpi-sous"> · {euros(r.provisionsDemandees)} demandées</span> : null}</Def>
              <Def etiquette="Reste dû">{r ? euros(r.resteDu) : "—"}<span className="esp-kpi-sous"> · facturé {r ? euros(r.factureTtc) : ""} TTC</span></Def>
            </dl>

            <div className="tam-ligne">
              <div className="tam-ligne-haut">
                <span className="tam-ligne-titre">Convention</span>
                {conv ? (
                  <>
                    <Pastille teinte={conv.statut === "signee" ? "vert" : conv.urgence ? "ambre" : "bleu"}>{conv.statut === "signee" ? `Signée le ${dateCourte(conv.signee_le)}` : conv.urgence ? "Urgence, sans écrit" : "Proposée"}</Pastille>
                    <Pastille teinte="gris" contour>{MODES_HONORAIRES[conv.mode]}</Pastille>
                  </>
                ) : <Pastille teinte="gris">Aucune</Pastille>}
              </div>
              {conv ? (
                <div className="tam-ligne-meta">
                  {conv.taux_horaire_cents ? <span>{euros(conv.taux_horaire_cents)} HT de l&apos;heure</span> : null}
                  {conv.forfait_cents ? <span>forfait {euros(conv.forfait_cents)} HT</span> : null}
                  {conv.complement_resultat_pct ? <span>honoraire de résultat {conv.complement_resultat_pct.toLocaleString("fr-FR")} %</span> : null}
                  <span>TVA {conv.taux_tva.toLocaleString("fr-FR")} %</span>
                  {conv.statut === "proposee" && peutGerer ? <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "signer", convention: conv })}>Enregistrer la signature</button> : null}
                </div>
              ) : (
                <div className="tam-ligne-meta"><span>Posez la convention : mode, taux, forfait. Sans elle, pas de facture.</span></div>
              )}
            </div>

            <h3 className="tam-sous-titre">Temps passé</h3>
            {tempsVisibles.length === 0 ? <p className="esp-kpi-sous">Aucun temps saisi. Chacun saisit le sien ; la description est chiffrée avec la clé du dossier.</p> : tempsVisibles.map((t) => (
              <div key={t.id} className="tam-ligne">
                <div className="tam-ligne-haut">
                  <span className="tam-ligne-titre">{duree(t.minutes)} · {NATURES_TEMPS[t.nature]}</span>
                  <Pastille teinte={t.statut === "facture" ? "vert" : "bleu"}>{t.statut === "facture" ? "Facturé" : "À facturer"}</Pastille>
                  {!t.facturable ? <Pastille teinte="gris" contour>Non facturable</Pastille> : null}
                </div>
                <div className="tam-ligne-meta">
                  <span>{dateCourte(t.jour)} · {nomDe(t.user_id)}</span>
                  {t.description_chiffree ? <span>{descriptions[t.id] ?? <span className="tam-chiffre">description chiffrée</span>}</span> : null}
                  {t.statut === "saisi" && (t.user_id === moi?.user_id || peutGerer) && peutEcrire ? <button type="button" className="esp-lien-bouton" disabled={envoi} onClick={() => annulerTemps(t)}>Annuler</button> : null}
                </div>
              </div>
            ))}
            {nbTemps > 6 ? <div className="esp-actions"><button type="button" className="esp-lien-bouton" onClick={() => setTout(!tout)}>{tout ? "Moins" : `Tout le temps (${nbTemps})`}</button></div> : null}

            <h3 className="tam-sous-titre">Provisions et factures</h3>
            {h && h.provisions.length + h.factures.length === 0 ? <p className="esp-kpi-sous">Ni provision ni facture.</p> : null}
            {h?.provisions.map((p) => (
              <div key={p.id} className="tam-ligne">
                <div className="tam-ligne-haut">
                  <span className="tam-ligne-titre">Provision {euros(p.montant_ttc_cents)} TTC</span>
                  <Pastille teinte={p.statut === "recue" ? "vert" : p.statut === "annulee" ? "gris" : "ambre"}>{p.statut === "recue" ? (p.facture_id ? "Reçue, imputée" : "Reçue") : p.statut === "annulee" ? "Annulée" : "Demandée"}</Pastille>
                </div>
                <div className="tam-ligne-meta">
                  <span>Demandée le {dateCourte(p.demandee_le)}</span>
                  {p.recue_le ? <span>reçue le {dateCourte(p.recue_le)} ({MODES_REGLEMENT[p.mode_reglement as ModeReglement]?.toLowerCase()})</span> : null}
                  {p.statut === "demandee" && peutEncaisser ? <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "recue", provision: p })}>Reçue</button> : null}
                </div>
              </div>
            ))}
            {h?.factures.map((fa) => (
              <div key={fa.id} className="tam-ligne">
                <div className="tam-ligne-haut">
                  <span className="tam-ligne-titre"><span className="esp-mono">{fa.numero}</span> · {euros(fa.total_ttc_cents)} TTC</span>
                  <Pastille teinte={fa.statut === "payee" ? "vert" : fa.statut === "annulee" ? "gris" : "ambre"}>{fa.statut === "payee" ? `Payée le ${dateCourte(fa.payee_le)}` : fa.statut === "annulee" ? "Annulée" : `Reste dû ${euros(fa.reste_du_cents)}`}</Pastille>
                  {fa.nature === "compte_definitif" ? <Pastille teinte="noir" contour>Compte définitif</Pastille> : null}
                </div>
                <div className="tam-ligne-meta">
                  <span>Émise le {dateCourte(fa.emise_le)}</span>
                  <span>{duree(fa.minutes)} · honoraires {euros(fa.total_ht_cents)} HT · TVA {euros(fa.tva_cents)}{fa.debours_cents ? ` · déboursés ${euros(fa.debours_cents)}` : ""}{fa.provisions_imputees_cents ? ` · provisions ${euros(fa.provisions_imputees_cents)}` : ""}</span>
                  {fa.statut !== "annulee" ? <button type="button" className="esp-lien-bouton" onClick={() => setImprimee(fa)}><Printer width={12} height={12} aria-hidden="true" /> Imprimer</button> : null}
                  {fa.statut === "emise" && peutEncaisser ? <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "payee", facture: fa })}>Payée</button> : null}
                  {fa.statut === "emise" && peutGerer ? <button type="button" className="esp-lien-bouton" onClick={() => ouvrir({ type: "annuler_facture", facture: fa })}>Annuler</button> : null}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {imprimee && h ? (
        <FactureImprimable
          ouvert
          onFermer={() => setImprimee(null)}
          source={source}
          clientId={clientId}
          facture={imprimee}
          convention={h.conventions.find((c) => c.statut !== "resiliee") ?? h.conventions[0] ?? null}
          temps={h.temps.filter((t) => t.facture_id === imprimee.id)}
          descriptions={descriptions}
          entete={entete}
          clientNom={clientNom}
          dossier={clair ? { reference: clair.reference, intitule: clair.intitule } : null}
          gerant={gerant}
        />
      ) : null}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          {form ? (
            <>
              <DialogHeader>
                <DialogIcone>{form.type === "temps" ? <Clock width={18} height={18} aria-hidden="true" /> : form.type === "convention" || form.type === "signer" ? <FileSignature width={18} height={18} aria-hidden="true" /> : form.type === "facturer" || form.type === "annuler_facture" ? <ReceiptText width={18} height={18} aria-hidden="true" /> : <Banknote width={18} height={18} aria-hidden="true" />}</DialogIcone>
                <DialogTitle>{titre[form.type]}</DialogTitle>
                <DialogDescription>
                  {form.type === "temps" ? "Votre temps, au jour où vous l'avez passé. La description est chiffrée dans votre navigateur avec la clé du dossier." : null}
                  {form.type === "convention" ? "Écrite et signée sauf urgence (loi du 31/12/1971, art. 10). Une nouvelle convention remplace la précédente, qui reste au dossier." : null}
                  {form.type === "signer" ? "La date de signature, et l'exemplaire signé s'il est déposé parmi les pièces du dossier." : null}
                  {form.type === "provision" ? "Une provision sur honoraires, imputée sur la prochaine facture une fois reçue." : null}
                  {form.type === "recue" ? `Provision de ${euros(form.provision.montant_ttc_cents)} TTC demandée le ${dateCourte(form.provision.demandee_le)}. Les modes de règlement sont ceux du RIN (art. 11.6).` : null}
                  {form.type === "facturer" ? "Le temps facturable jusqu'à la date choisie, le forfait s'il n'est pas encore facturé, les déboursés hors TVA ; les provisions reçues s'imputent. Le numéro suit sans trou." : null}
                  {form.type === "payee" ? `Facture ${form.facture.numero}, reste dû ${euros(form.facture.reste_du_cents)}.` : null}
                  {form.type === "annuler_facture" ? `Facture ${form.facture.numero} : son numéro reste dans la suite ; le temps et les provisions qu'elle portait redeviennent à facturer.` : null}
                </DialogDescription>
              </DialogHeader>
              <DialogBody>
                <div className="esp-form">
                  {form.type === "temps" ? (
                    <>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Jour<input className="rv-champ" type="date" max={aujourdhui()} value={champ("jour", aujourdhui())} onChange={(e) => poser("jour", e.target.value)} /></label>
                        <label className="rv-libelle">Nature<select className="rv-champ" value={champ("nature", "redaction")} onChange={(e) => poser("nature", e.target.value)}>{(Object.keys(NATURES_TEMPS) as NatureTemps[]).map((n) => <option key={n} value={n}>{NATURES_TEMPS[n]}</option>)}</select></label>
                      </div>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Heures<input className="rv-champ" type="number" min={0} max={24} inputMode="numeric" value={champ("heures", "0")} onChange={(e) => poser("heures", e.target.value)} /></label>
                        <label className="rv-libelle">Minutes<input className="rv-champ" type="number" min={0} max={59} step={5} inputMode="numeric" value={champ("minutes", "30")} onChange={(e) => poser("minutes", e.target.value)} /></label>
                      </div>
                      <label className="rv-libelle">Ce qui a été fait<textarea className="rv-champ" rows={2} value={champ("description")} onChange={(e) => poser("description", e.target.value)} /></label>
                      <label className="rv-libelle">Facturable<select className="rv-champ" value={champ("facturable", "oui")} onChange={(e) => poser("facturable", e.target.value)}><option value="oui">Oui</option><option value="non">Non (temps interne)</option></select></label>
                    </>
                  ) : null}
                  {form.type === "convention" ? (
                    <>
                      <label className="rv-libelle">Mode<select className="rv-champ" value={champ("mode", "temps_passe")} onChange={(e) => poser("mode", e.target.value)}>{(Object.keys(MODES_HONORAIRES) as ModeHonoraires[]).map((m) => <option key={m} value={m}>{MODES_HONORAIRES[m]}</option>)}</select></label>
                      <div className="esp-form-ligne">
                        {champ("mode", "temps_passe") !== "forfait" ? <label className="rv-libelle">Taux horaire (€ HT)<input className="rv-champ" inputMode="decimal" value={champ("taux", "250")} onChange={(e) => poser("taux", e.target.value)} /></label> : null}
                        {champ("mode", "temps_passe") !== "temps_passe" ? <label className="rv-libelle">Forfait (€ HT)<input className="rv-champ" inputMode="decimal" value={champ("forfait")} onChange={(e) => poser("forfait", e.target.value)} /></label> : null}
                      </div>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Honoraire de résultat (%)<input className="rv-champ" inputMode="decimal" placeholder="facultatif" value={champ("complement")} onChange={(e) => poser("complement", e.target.value)} /></label>
                        <label className="rv-libelle">TVA<select className="rv-champ" value={champ("tva", "20")} onChange={(e) => poser("tva", e.target.value)}><option value="20">20 %</option><option value="10">10 %</option><option value="0">0 % (exonéré ou hors champ)</option></select></label>
                      </div>
                      <label className="rv-libelle">Urgence<select className="rv-champ" value={champ("urgence", "non")} onChange={(e) => poser("urgence", e.target.value)}><option value="non">Non : convention écrite à faire signer</option><option value="oui">Oui : intervention urgente, sans écrit pour l&apos;instant</option></select></label>
                      {conv ? <Avis teinte="gris">La convention en cours ({MODES_HONORAIRES[conv.mode].toLowerCase()}, {conv.statut === "signee" ? "signée" : "proposée"}) sera résiliée.</Avis> : null}
                    </>
                  ) : null}
                  {form.type === "signer" ? (
                    <>
                      <label className="rv-libelle">Signée le<input className="rv-champ" type="date" max={aujourdhui()} value={champ("signee_le", aujourdhui())} onChange={(e) => poser("signee_le", e.target.value)} /></label>
                      <label className="rv-libelle">Exemplaire signé<select className="rv-champ" value={champ("piece")} onChange={(e) => poser("piece", e.target.value)}><option value="">— pas encore déposé —</option>{pieces.map((pc) => <option key={pc.id} value={pc.id}>{pc.nom_fichier}</option>)}</select></label>
                    </>
                  ) : null}
                  {form.type === "provision" ? (
                    <label className="rv-libelle">Montant (€ TTC) <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" inputMode="decimal" value={champ("montant")} onChange={(e) => poser("montant", e.target.value)} /></label>
                  ) : null}
                  {form.type === "recue" || form.type === "payee" ? (
                    <div className="esp-form-ligne">
                      <label className="rv-libelle">{form.type === "recue" ? "Reçue le" : "Payée le"}<input className="rv-champ" type="date" max={aujourdhui()} value={champ("le", aujourdhui())} onChange={(e) => poser("le", e.target.value)} /></label>
                      <label className="rv-libelle">Mode de règlement<select className="rv-champ" value={champ("mode", "virement")} onChange={(e) => poser("mode", e.target.value)}>{(Object.keys(MODES_REGLEMENT) as ModeReglement[]).map((m) => <option key={m} value={m}>{MODES_REGLEMENT[m]}</option>)}</select></label>
                    </div>
                  ) : null}
                  {form.type === "facturer" ? (
                    <>
                      <div className="esp-form-ligne">
                        <label className="rv-libelle">Temps passé jusqu&apos;au<input className="rv-champ" type="date" max={aujourdhui()} value={champ("jusqu", aujourdhui())} onChange={(e) => poser("jusqu", e.target.value)} /></label>
                        <label className="rv-libelle">Déboursés (€, hors TVA)<input className="rv-champ" inputMode="decimal" value={champ("debours", "0")} onChange={(e) => poser("debours", e.target.value)} /></label>
                      </div>
                      <label className="rv-libelle">Nature<select className="rv-champ" value={champ("definitif", "non")} onChange={(e) => poser("definitif", e.target.value)}><option value="non">Facture</option><option value="oui">Compte détaillé définitif (RIN art. 11.7)</option></select></label>
                      {apercu ? (
                        <dl className="esp-def esp-def--trois tam-honoraires-apercu">
                          <Def etiquette="Honoraires HT">{euros(apercu.ht)}<span className="esp-kpi-sous"> · {duree(apercu.minutes)}{apercu.forfait ? ` + forfait ${euros(apercu.forfait)}` : ""}</span></Def>
                          <Def etiquette={`TVA ${conv?.taux_tva.toLocaleString("fr-FR")} %`}>{euros(apercu.tva)}</Def>
                          <Def etiquette="TTC" fort>{euros(apercu.ttc)}<span className="esp-kpi-sous"> · provisions {euros(apercu.prov)} · reste {euros(apercu.reste)}</span></Def>
                        </dl>
                      ) : null}
                    </>
                  ) : null}
                  {form.type === "annuler_facture" ? (
                    <label className="rv-libelle">Motif<select className="rv-champ" value={champ("motif", "erreur_montant")} onChange={(e) => poser("motif", e.target.value)}>{Object.entries(MOTIFS_ANNULATION_FACTURE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
                  ) : null}
                  {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
                </div>
              </DialogBody>
              <DialogFooter>
                <button type="button" className="r-btn r-btn--fil" onClick={() => setForm(null)}>Fermer</button>
                <button
                  type="button"
                  className={`r-btn ${form.type === "annuler_facture" ? "r-btn--rouge" : "r-btn--noir"}`}
                  disabled={envoi}
                  onClick={() => {
                    if (form.type === "temps") void soumettreTemps();
                    else if (form.type === "convention") void soumettreConvention();
                    else if (form.type === "signer") void soumettreSignature(form.convention);
                    else if (form.type === "provision") void soumettreProvision();
                    else if (form.type === "recue") void soumettreRecue(form.provision);
                    else if (form.type === "facturer") void soumettreFacture();
                    else if (form.type === "payee") void soumettrePayee(form.facture);
                    else void soumettreAnnulation(form.facture);
                  }}
                >
                  {envoi ? <Loader variant="spin" /> : null}{" "}
                  {form.type === "temps" ? "Saisir" : form.type === "convention" ? "Poser la convention" : form.type === "signer" ? "Enregistrer" : form.type === "provision" ? "Demander" : form.type === "recue" ? "Noter reçue" : form.type === "facturer" ? (champ("definitif", "non") === "oui" ? "Émettre le compte définitif" : "Émettre la facture") : form.type === "payee" ? "Noter payée" : "Annuler la facture"}
                </button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
