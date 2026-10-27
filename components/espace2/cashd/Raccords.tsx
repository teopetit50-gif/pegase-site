"use client";

/* ══════════════════════════════════════════════════════════════════════
   CASHD — les raccords (27/10/2026, session C2)

   Trois promesses de la page produit qui se branchent sur autre chose que
   le facturier :
     · MessagerieCashd  — « depuis la boîte de votre entreprise » (C13, c2_48) :
       par où partent les relances, et si elles y sont déposées en brouillon ;
     · ReglageWhatsapp  — WhatsApp (P3, c2_51) : le modèle approuvé par Meta ;
       CanalCompte, dans la fiche, choisit le canal d'un compte ;
     · RaccordCommandes — « une commande au-delà du plafond est bloquée » (C38,
       c2_50) : les clés de raccord d'un logiciel de commandes.
   En exemple, tout se joue en mémoire, et l'écran le dit.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Mail, MessageCircle } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { dateCourte } from "@/components/espace/format";
import * as portes from "@/components/espace/cashd/portes";
import { Badge, Note } from "../ui";

/* l'organisation de la session, en base réelle */
function useClientReel(): string | null {
  const { source } = useSource();
  const [client, setClient] = useState<string | null>(null);
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    void portes.monClient().then((c) => actif && setClient(c?.client_id ?? null), () => actif && setClient(null));
    return () => {
      actif = false;
    };
  }, [source]);
  return source === "reelle" ? client : null;
}

const erreurDe = (e: unknown) => (e instanceof Error ? e.message : "La base a refusé.");

/* ——— C13 : par où partent les relances ——— */
const MESSAGERIE_EXEMPLE: portes.Messagerie = {
  mode: "essai",
  boites: [{ adresse: "compta@atelier-bertin.fr", fournisseur: "gmail", etat: "active", releve_le: null, depot: "brouillon" }],
  phrase: "Vos relances partent de votre boîte connectée.",
};

export function MessagerieCashd() {
  const { source } = useSource();
  const client = useClientReel();
  const [reel, setReel] = useState<portes.Messagerie | null>(null);
  useEffect(() => {
    if (source !== "reelle" || !client) return;
    let actif = true;
    void portes.chargerMessagerie(client).then((m) => actif && setReel(m), () => actif && setReel(null));
    return () => {
      actif = false;
    };
  }, [source, client]);
  const m = source === "exemple" ? MESSAGERIE_EXEMPLE : reel;
  if (!m) return null;
  const boite = m.boites.find((b) => b.etat === "active") ?? m.boites[0];
  return (
    <div className="c2-messagerie" role="status" aria-label="Boîte d'envoi des relances">
      <Mail width={16} height={16} aria-hidden="true" />
      <div>
        <strong>{boite ? `Depuis ${boite.adresse}` : "Depuis l'expéditeur d'Omega"}</strong>{" "}
        {boite ? (
          <>
            ({boite.fournisseur === "gmail" ? "Gmail" : boite.fournisseur === "microsoft" ? "Microsoft 365" : boite.fournisseur}
            {boite.depot === "brouillon" ? ", chaque relance validée est déposée en brouillon : vous l'envoyez depuis votre messagerie" : ", envoi direct"})
            {boite.etat === "a_reconnecter" ? <Badge teinte="ambre">à reconnecter</Badge> : null}
          </>
        ) : null}
        <span className="c2-sous"> {m.phrase}</span>
      </div>
    </div>
  );
}

/* ——— P3 : le modèle WhatsApp des relances ——— */
export function ReglageWhatsapp({ modeleInitial }: { modeleInitial: string | null }) {
  const { source } = useSource();
  const client = useClientReel();
  const [modele, setModele] = useState(modeleInitial ?? "");
  const [corps, setCorps] = useState("");
  const [etat, setEtat] = useState<portes.ReglageWhatsapp | null>(modeleInitial ? { modele: modeleInitial, actif: false } : null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const valide = !modele.trim() || /^[a-z0-9_]{1,200}$/.test(modele.trim());
  const corpsValide = !corps.trim() || (corps.includes("{{message}}") && !corps.replace(/\{\{(message|organisation)\}\}/g, "").includes("{{") && corps.trim().length <= 1024);
  const enregistrer = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        setEtat(await portes.reglerWhatsapp(client, modele.trim() || null, corps.trim() || null));
      } else {
        setEtat(modele.trim()
          ? { modele: modele.trim(), gabarit_statut: "brouillon", actif: false, phrase: "Le modèle attend l'approbation de Meta : d'ici là, les relances partent par courriel (exemple)." }
          : { modele: null, actif: false });
      }
    } catch (e) {
      setErreur(erreurDe(e));
    } finally {
      setEnvoi(false);
    }
  };
  return (
    <div className="esp-form" aria-label="WhatsApp">
      <p className="c2-sous">
        Les rappels et les relances d&apos;un compte qui a choisi WhatsApp partent par WhatsApp, sur votre modèle approuvé par Meta, avec un message court : les factures, le reste dû, votre adresse de paiement. La mise en demeure ne part jamais par WhatsApp. Le destinataire doit avoir donné son accord.
      </p>
      <label className="rv-libelle">Nom du modèle chez Meta
        <input className="rv-champ" value={modele} maxLength={200} onChange={(e) => setModele(e.target.value)} placeholder="relance_impaye_v1" />
      </label>
      {!valide ? <p className="c2-sous">Minuscules, chiffres et _ seulement, comme chez Meta.</p> : null}
      <label className="rv-libelle">Texte du modèle (vide : le texte par défaut)
        <textarea className="rv-champ" rows={3} value={corps} maxLength={1024} onChange={(e) => setCorps(e.target.value)}
          placeholder="Bonjour, {{organisation}} vous rappelle {{message}} Pour toute question, répondez simplement à ce message." />
      </label>
      {!corpsValide ? <p className="c2-sous">Le texte porte {"{{message}}"} et au plus {"{{organisation}}"}.</p> : null}
      <div className="esp-actions">
        <button type="button" className="r-btn" disabled={!valide || !corpsValide || envoi} onClick={() => void enregistrer()}>
          <MessageCircle width={15} height={15} aria-hidden="true" /> Enregistrer le modèle WhatsApp
        </button>
        {etat?.modele ? (
          etat.actif ? <Badge teinte="vert">Validé par Meta</Badge> : <Badge teinte="ambre">En attente de Meta</Badge>
        ) : null}
      </div>
      {etat?.phrase ? <Note teinte={etat.actif ? "vert" : "bleu"} role="status">{etat.phrase}</Note> : null}
      {erreur ? <Note teinte="rouge" role="alert">{erreur}</Note> : null}
    </div>
  );
}

/* ——— le canal d'un compte, dans sa fiche ——— */
export function CanalCompte({ compte, canal, telephone }: { compte: string; canal: "email" | "whatsapp"; telephone: string | null | undefined }) {
  const { source } = useSource();
  const [valeur, setValeur] = useState(canal);
  const [phrase, setPhrase] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const sansNumero = (telephone ?? "").replace(/\D/g, "").length < 9;
  const changer = async (v: "email" | "whatsapp") => {
    setErreur(null);
    setPhrase(null);
    try {
      if (source === "reelle") {
        const r = await portes.canalCompte(compte, v);
        setPhrase(r.phrase);
      } else {
        setPhrase(v === "whatsapp" ? "Ses rappels et relances partiront par WhatsApp ; la mise en demeure, jamais (exemple)." : "Ses relances partent par courriel (exemple).");
      }
      setValeur(v);
    } catch (e) {
      setErreur(erreurDe(e));
    }
  };
  return (
    <div className="c2-canal" role="group" aria-label="Canal des relances">
      <label className="rv-libelle">Relances par
        <select className="rv-champ" value={valeur} onChange={(e) => void changer(e.target.value as "email" | "whatsapp")}>
          <option value="email">Courriel</option>
          <option value="whatsapp" disabled={sansNumero}>WhatsApp{sansNumero ? " (numéro de facturation manquant)" : ""}</option>
        </select>
      </label>
      {phrase ? <span className="c2-sous">{phrase}</span> : null}
      {erreur ? <Note teinte="rouge" role="alert">{erreur}</Note> : null}
    </div>
  );
}

/* ——— C38 : raccorder un logiciel de commandes ——— */
const CLES_EXEMPLE: portes.CleCommandes[] = [
  { id: "exemple-1", libelle: "Logiciel de commandes du comptoir", prefixe: "cashd_cmd_3f", cree_le: "2026-10-20T09:12:00Z", revoquee_le: null, derniere_utilisation_le: "2026-10-26T14:03:00Z" },
];

function cleExemple() {
  const o = new Uint8Array(24);
  crypto.getRandomValues(o);
  return "cashd_cmd_" + Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function RaccordCommandes() {
  const { source } = useSource();
  const client = useClientReel();
  const [clesExemple, setClesExemple] = useState<portes.CleCommandes[]>(CLES_EXEMPLE);
  const [clesReelles, setClesReelles] = useState<portes.CleCommandes[] | null>(null);
  const cles = source === "exemple" ? clesExemple : clesReelles;
  const [libelle, setLibelle] = useState("");
  const [nouvelle, setNouvelle] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const charger = useCallback(async () => {
    if (source !== "reelle" || !client) return;
    try {
      setClesReelles(await portes.chargerClesCommandes(client));
    } catch (e) {
      setErreur(erreurDe(e));
      setClesReelles([]);
    }
  }, [source, client]);
  useEffect(() => {
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [charger]);

  const creer = async () => {
    setEnvoi(true);
    setErreur(null);
    setCopie(false);
    try {
      if (source === "reelle") {
        if (!client) throw new Error("Aucun compte rattaché à cette session.");
        const r = await portes.creerCleCommandes(client, libelle.trim());
        setNouvelle(r.cle);
        await charger();
      } else {
        const cle = cleExemple();
        setNouvelle(cle);
        setClesExemple((prev) => [{ id: `exemple-${Date.now()}`, libelle: libelle.trim(), prefixe: cle.slice(0, 12), cree_le: new Date().toISOString(), revoquee_le: null, derniere_utilisation_le: null }, ...prev]);
      }
      setLibelle("");
    } catch (e) {
      setErreur(erreurDe(e));
    } finally {
      setEnvoi(false);
    }
  };
  const revoquer = async (id: string) => {
    setErreur(null);
    try {
      if (source === "reelle") {
        await portes.revoquerCleCommandes(id);
        await charger();
      } else {
        setClesExemple((prev) => prev.map((k) => (k.id === id ? { ...k, revoquee_le: new Date().toISOString() } : k)));
      }
    } catch (e) {
      setErreur(erreurDe(e));
    }
  };
  const actives = (cles ?? []).filter((k) => !k.revoquee_le).length;

  return (
    <section className="sb-reglages-section c2-raccord" aria-label="Raccorder un logiciel de commandes">
      <header>
        <h2>Raccorder un logiciel de commandes</h2>
        <p>
          Votre logiciel de commandes demande à CASHD, avant de valider une commande, si elle tient dans le plafond du compte. Au-delà, elle est bloquée : un responsable la débloque ou la refuse dans la file de validation, et le logiciel le lit.
        </p>
      </header>
      <div className="esp-carte">
        <div className="esp-carte-corps esp-form">
          {source === "exemple" ? <Note teinte="bleu">Données d&apos;exemple : les clés créées ici ne servent à rien.</Note> : null}
          {nouvelle ? (
            <Note teinte="ambre" role="status">
              <strong>Copiez cette clé maintenant : elle ne sera plus jamais affichée.</strong>
              <code className="c2-cle">{nouvelle}</code>
              <button type="button" className="esp-lien-bouton" onClick={() => void navigator.clipboard?.writeText(nouvelle).then(() => setCopie(true), () => setCopie(false))}>
                <Copy width={14} height={14} aria-hidden="true" /> {copie ? "Clé copiée" : "Copier la clé"}
              </button>
              <span className="c2-sous">Donnez-la à votre logiciel avec l&apos;adresse du raccord : <code>POST /rest/v1/rpc/cashd_commande</code> (compte, montant, référence de la commande).</span>
            </Note>
          ) : null}
          <div className="esp-form-ligne">
            <label className="rv-libelle">Logiciel à raccorder
              <input className="rv-champ" value={libelle} maxLength={80} onChange={(e) => setLibelle(e.target.value)} placeholder="Logiciel de commandes du comptoir" />
            </label>
          </div>
          <div className="esp-actions">
            <button type="button" className="r-btn r-btn--noir" disabled={!libelle.trim() || envoi || actives >= 5} onClick={() => void creer()}>
              <KeyRound width={15} height={15} aria-hidden="true" /> Créer une clé de raccord
            </button>
            {actives >= 5 ? <span className="c2-sous">Cinq clés actives au plus : révoquez-en une.</span> : null}
          </div>
          {erreur ? <Note teinte="rouge" role="alert">{erreur}</Note> : null}
          {cles && cles.length ? (
            <ul className="c2-reglements" aria-label="Clés de raccord">
              {cles.map((k) => (
                <li key={k.id}>
                  <span>
                    <strong>{k.libelle}</strong> <code>{k.prefixe}…</code>
                  </span>
                  <span className="c2-sous">
                    créée le {dateCourte(k.cree_le)}
                    {k.derniere_utilisation_le ? ` · utilisée le ${dateCourte(k.derniere_utilisation_le)}` : " · jamais utilisée"}
                  </span>
                  {k.revoquee_le ? (
                    <Badge>Révoquée</Badge>
                  ) : (
                    <button type="button" className="esp-lien-bouton" onClick={() => void revoquer(k.id)}>Révoquer</button>
                  )}
                </li>
              ))}
            </ul>
          ) : cles ? (
            <p className="c2-sous">Aucune clé : aucun logiciel n&apos;est raccordé.</p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
