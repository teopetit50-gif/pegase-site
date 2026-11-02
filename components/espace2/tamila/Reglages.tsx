"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA — Réglages du cabinet (02/11/2026) : copie 1:1 de Settings ›
   Team de Linear (releves/linear-team-settings.md). Seul le contenu change.

   Ce qui, dans l'écran d'avant, était un réglage rangé ailleurs (§ 8.4-2) :
   installation (B3, G1), phrase du cabinet (B15, L1, L2), coffre à clés
   (B14, G3, G4), clé d'index du cabinet (B33, G57), en-tête des factures
   et du bordereau (B32, G56), et les durées fixées à l'installation
   (tamila_reglages, lecture seule). La « Danger zone » porte les gestes qui
   ne se défont pas : passer au coffre, ré-envelopper, oublier la phrase —
   chacun derrière une fenêtre de confirmation.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { envelopper, genererCle, phraseMemorisee } from "@/components/espace/tamila/chiffrement";
import * as portes from "@/components/espace/tamila/portes";
import { estAssocie, estGerant } from "@/components/espace/tamila/regles";
import type { EnteteFacture } from "@/components/espace/tamila/types";
import { RACINE } from "@/components/espace2/modules";
import { TamCarte } from "./TamCadre";
import { TamIcone, type NomTamIcone } from "./TamIcone";
import { Champ, TamFenetre } from "./TamFenetre";
import { useTamila } from "./donnees";
import Phrase from "./Phrase";
import { adresseTransfert } from "./acces";
import { copier } from "./navigateur";
import { NATURES_AUDIENCE } from "@/components/espace/tamila/regles";
import "./tam-reglages.css";

type Fenetre = "installer" | "coffre" | "index" | "entete" | "oublier" | null;

const CHAMPS: { cle: keyof EnteteFacture; libelle: string; large?: boolean }[] = [
  { cle: "nom", libelle: "Nom du cabinet" },
  { cle: "forme", libelle: "Forme (SELARL, SCP…)" },
  { cle: "adresse", libelle: "Adresse", large: true },
  { cle: "code_postal_ville", libelle: "Code postal et ville" },
  { cle: "siren", libelle: "SIREN" },
  { cle: "tva_intracom", libelle: "TVA intracommunautaire" },
  { cle: "barreau", libelle: "Barreau" },
  { cle: "toque", libelle: "Toque" },
  { cle: "telephone", libelle: "Téléphone" },
  { cle: "courriel", libelle: "Courriel" },
  { cle: "iban", libelle: "IBAN" },
  { cle: "bic", libelle: "BIC" },
  { cle: "mention_tva", libelle: "Mention de TVA (si 0 %)", large: true },
];

function Rangee({ icone, titre, desc, valeur, onClick, href, verrou, children }: { icone?: NomTamIcone; titre: string; desc: string; valeur?: string; onClick?: () => void; href?: string; verrou?: string; children?: React.ReactNode }) {
  const corps = (
    <>
      {icone ? (
        <figure className="tam-reg-figure">
          <TamIcone nom={icone} />
        </figure>
      ) : null}
      <span className="tam-reg-texte">
        <span className="tam-reg-titre">{titre}</span>
        <span className="tam-reg-desc">{desc}</span>
      </span>
      <span className="tam-reg-droite">
        {verrou ? <span className="tam-reg-verrou">{verrou}</span> : null}
        {children}
        {valeur ? <span>{valeur}</span> : null}
        {!verrou && !children ? <TamIcone nom="Chevron" /> : null}
      </span>
    </>
  );
  if (verrou || children) return <div className="tam-reg-rangee" data-verrou={verrou ? "" : undefined}>{corps}</div>;
  if (href)
    return (
      <Link className="tam-reg-rangee" href={href}>
        {corps}
      </Link>
    );
  return (
    <button type="button" className="tam-reg-rangee" onClick={onClick}>
      {corps}
    </button>
  );
}

export default function Reglages() {
  const t = useTamila();
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [phrase, setPhrase] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [progres, setProgres] = useState<{ fait: number; total: number } | null>(null);
  const [echecs, setEchecs] = useState<string[]>([]);
  /* l'en-tête des factures : en exemple, gardé en mémoire (comme FactureImprimable) */
  const [entete, setEntete] = useState<EnteteFacture>(t.reglages?.facture_entete ?? {});
  const [brouillon, setBrouillon] = useState<Record<string, string>>({});
  /* la clé d'index : en place en exemple ; en réel, lue par tamila_index_cle */
  const [index, setIndex] = useState<boolean | null>(t.source === "exemple" ? true : null);

  const enteteBase = t.reglages?.facture_entete;
  useEffect(() => {
    const h = window.setTimeout(() => {
      if (enteteBase) setEntete(enteteBase);
    }, 0);
    return () => window.clearTimeout(h);
  }, [enteteBase]);
  useEffect(() => {
    if (t.source !== "reelle" || !t.clientId) return;
    let actif = true;
    portes
      .indexCle(t.clientId)
      .then((k) => actif && setIndex(!!k))
      .catch(() => actif && setIndex(null));
    return () => {
      actif = false;
    };
  }, [t.source, t.clientId]);

  const gerant = estGerant(t.moi);
  /* « Sources et outils » (PAGES-MANQUANTES.md : « Vos outils restent en place ») */
  const [adresse, setAdresse] = useState<string | null | undefined>(t.source === "exemple" ? "delorme@recu.omegaai.fr" : undefined);
  useEffect(() => {
    if (t.source !== "reelle") return;
    let actif = true;
    adresseTransfert()
      .then((a) => actif && setAdresse(a))
      .catch(() => actif && setAdresse(null));
    return () => {
      actif = false;
    };
  }, [t.source]);
  const prevues = t.audiencesCabinet.filter((a) => a.statut === "prevue" && new Date(a.date_heure).getTime() >= Date.parse(new Date().toISOString().slice(0, 10)));
  /* l'agenda .ics de tout le cabinet (RFC 5545), composé ici comme celui d'un dossier (L11) */
  const agendaCabinet = () => {
    const echap = (x: string) => x.replace(/\\/g, "\\\\").replace(/[,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
    const utc = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const evts = prevues.map((a) => {
      const ref = t.referenceDe(a.dossier_id) ?? "dossier";
      const fin = new Date(new Date(a.date_heure).getTime() + (a.heure_connue ? 2 : 1) * 3600_000).toISOString();
      return ["BEGIN:VEVENT", `UID:tamila-${a.id}@omegaai.fr`, `DTSTAMP:${utc(new Date().toISOString())}`, a.heure_connue ? `DTSTART:${utc(a.date_heure)}` : `DTSTART;VALUE=DATE:${a.date_heure.slice(0, 10).replace(/-/g, "")}`, a.heure_connue ? `DTEND:${utc(fin)}` : "", `SUMMARY:${echap(`${NATURES_AUDIENCE[a.nature] ?? "Audience"} — ${ref}`)}`, a.juridiction || a.chambre ? `LOCATION:${echap([a.juridiction, a.chambre].filter(Boolean).join(", "))}` : "", "END:VEVENT"].filter(Boolean).join("\r\n");
    });
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Omega//Tamila//FR", "CALSCALE:GREGORIAN", ...evts, "END:VCALENDAR"].join("\r\n") + "\r\n";
    const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
    const lien = document.createElement("a");
    lien.href = url;
    lien.download = `audiences-cabinet-${new Date().toISOString().slice(0, 10)}.ics`;
    lien.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const associe = estAssocie(t.moi);
  const etat = t.etat;
  const nomCabinet = entete.nom || "Le cabinet";
  const incomplet = !entete.nom || !entete.siren || !entete.adresse;
  const nbPersonnes = t.personnes.length;
  const ouvrir = (f: Fenetre) => {
    setErreur(null);
    setFait(null);
    setEchecs([]);
    if (f === "entete") setBrouillon({});
    setFenetre(f);
  };
  const geste = async (f: () => Promise<string | void>) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const m = await f();
      if (m) setFait(m);
      setFenetre(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  };

  /* G1 */
  const installer = () =>
    geste(async () => {
      await t.installerTamila();
      return "Tamila est installé : réglages posés, trois règles de validation actives.";
    });
  /* G3 */
  const activer = () => geste(() => t.activerCoffre());
  /* G4 */
  const reenvelopper = async () => {
    setEnvoi(true);
    setErreur(null);
    setEchecs([]);
    try {
      const r = await t.reenvelopperTout((fait, total) => setProgres({ fait, total }));
      setEchecs(r.echecs);
      if (r.message) setFait(r.message);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Le coffre a refusé.");
    } finally {
      setProgres(null);
      setEnvoi(false);
    }
  };
  /* G57 — la clé d'index du cabinet, créée une fois par le gérant (ConformiteTamila, creerIndex) */
  const creerIndex = () =>
    geste(async () => {
      if (t.source === "exemple") {
        await new Promise((r) => setTimeout(r, 300));
      } else {
        if (etat && etat.statut !== "local") {
          await portes.coffre<{ cle: string }>("nouvelle_cle_index", { client: t.clientId });
        } else {
          const p = phraseMemorisee();
          if (!p) throw new Error("Tapez d'abord la phrase du cabinet : la clé d'index est enveloppée sous elle.");
          const aes = await genererCle();
          await portes.poserIndexCle(t.clientId, await envelopper(aes, p));
        }
      }
      setIndex(true);
      return "La clé d'index du cabinet est créée : les parties peuvent être indexées et contrôlées.";
    });
  /* G56 — l'en-tête de toutes les factures et du bordereau */
  const enregistrerEntete = () =>
    geste(async () => {
      const nouvel: EnteteFacture = { ...entete };
      for (const c of CHAMPS) {
        if (brouillon[c.cle] === undefined) continue;
        const v = brouillon[c.cle].trim();
        if (v) (nouvel as Record<string, unknown>)[c.cle] = c.cle === "siren" ? v.replace(/\s/g, "") : v;
        else delete (nouvel as Record<string, unknown>)[c.cle];
      }
      if (brouillon.delai !== undefined) nouvel.delai_paiement_jours = Math.max(0, Math.min(60, parseInt(brouillon.delai, 10) || 0));
      if (t.source === "reelle") {
        await portes.poserEnteteFacture(t.clientId, nouvel);
        await t.relire();
      }
      setEntete(nouvel);
      return "L'en-tête des factures et du bordereau est enregistré.";
    });

  const libelleCoffre = !etat ? "Absent" : etat.statut === "scaleway" ? "Toutes au coffre" : etat.statut === "bascule" ? "Bascule en cours" : "Sous la phrase";
  const r = t.reglages;

  return (
    <TamCarte>
      <div className="tam-reg">
        <div className="tam-reg-barre">
          <Link className="tam-retour" href={`${RACINE}/tamila`}>
            <TamIcone nom="Chevron" />
            Dossiers
          </Link>
        </div>
        <div className="tam-reg-colonne">
          <div className="tam-reg-tete">
            <h1>{nomCabinet}</h1>
            <div className="tam-reg-sous">
              <span>Réglages de Tamila pour tout le cabinet</span>
              <Link className="tam-reg-lien" href={`${RACINE}/tamila`}>
                Vue d&apos;ensemble <TamIcone nom="Chevron" />
              </Link>
            </div>
          </div>
          {fait ? (
            <p className="tam-note" role="status" style={{ marginTop: 16 }}>
              {fait}
            </p>
          ) : null}

          <fieldset className="tam-reg-champs">
            <section className="tam-reg-carte">
              <Rangee
                icone="Roue"
                titre="Installation"
                desc="Réglages du cabinet et trois règles de validation : clôture, muraille, délai"
                valeur={t.installe ? "Installé" : "Non installé"}
                onClick={() => ouvrir("installer")}
              />
              <Rangee icone="Members" titre="Personnes du cabinet" desc="Avocats, associés, assistants et stagiaires, avec leur rôle" valeur={`${nbPersonnes} personne${nbPersonnes > 1 ? "s" : ""}`} href={`${RACINE}/equipe`} />
              <Rangee icone="Lock" titre="Phrase du cabinet" desc="Déballe dans ce navigateur la clé de chaque dossier ; elle n'est jamais envoyée" valeur={t.source === "exemple" ? "Exemple" : t.phrase ? "Mémorisée" : "Non saisie"} onClick={() => setPhrase(true)} />
            </section>
          </fieldset>

          <fieldset className="tam-reg-champs">
            <h3>Clés et chiffrement</h3>
            <section className="tam-reg-carte">
              {associe && etat ? <Rangee icone="Shield" titre="Coffre à clés" desc="Une clé maître chez Scaleway (France) enveloppe la clé de chaque dossier" valeur={libelleCoffre} onClick={() => ouvrir("coffre")} /> : null}
              {associe && !etat ? <Rangee icone="Shield" titre="Coffre à clés" desc="Une clé maître chez Scaleway (France) enveloppe la clé de chaque dossier" verrou="Non installé sur cette base" /> : null}
              {!associe ? <Rangee icone="Shield" titre="Coffre à clés" desc="Une clé maître chez Scaleway (France) enveloppe la clé de chaque dossier" verrou="Réservé aux associés" /> : null}
              {gerant && index === false ? (
                <Rangee icone="Database" titre="Clé d'index du cabinet" desc="Index aveugle des parties, pour le contrôle des conflits d'intérêts" valeur="À créer" onClick={() => ouvrir("index")} />
              ) : (
                <Rangee icone="Database" titre="Clé d'index du cabinet" desc="Index aveugle des parties, pour le contrôle des conflits d'intérêts" verrou={index === null ? "Absente de cette base" : index ? "En place" : "Le gérant la crée"} />
              )}
              <Rangee icone="Signature" titre="Clé de chaque dossier" desc="Tirée à l'ouverture du dossier ; nom, intitulé, parties et pièces chiffrés dans le navigateur" verrou="AES-256-GCM" />
              <Rangee icone="Policy" titre="Journal des lectures" desc="Chaque ouverture de dossier, de clé ou d'archive est tracée" verrou="Toujours actif" />
            </section>
          </fieldset>

          <fieldset className="tam-reg-champs">
            <h3>Factures et bordereaux</h3>
            <section className="tam-reg-carte">
              {gerant ? (
                <Rangee icone="Page" titre="En-tête des factures" desc="Nom, adresse, SIREN, barreau, coordonnées bancaires : sur chaque facture et bordereau" valeur={incomplet ? "Incomplet" : "Complet"} onClick={() => ouvrir("entete")} />
              ) : (
                <Rangee icone="Page" titre="En-tête des factures" desc="Nom, adresse, SIREN, barreau, coordonnées bancaires : sur chaque facture et bordereau" verrou="Réservé au gérant" />
              )}
              {gerant ? (
                <Rangee icone="Calendar" titre="Délai de paiement" desc="Imprimé sur chaque facture d'honoraires" valeur={`${entete.delai_paiement_jours ?? 30} jours`} onClick={() => ouvrir("entete")} />
              ) : (
                <Rangee icone="Calendar" titre="Délai de paiement" desc="Imprimé sur chaque facture d'honoraires" verrou={`${entete.delai_paiement_jours ?? 30} jours`} />
              )}
            </section>
          </fieldset>

          <fieldset className="tam-reg-champs">
            <h3>Sources et outils</h3>
            <p className="tam-reg-aide">Vos outils restent en place : Tamila reçoit ce que vous lui transférez et produit des fichiers, sans se brancher sur votre messagerie ni sur votre agenda.</p>
            <section className="tam-reg-carte">
              {adresse ? (
                <Rangee
                  icone="Email"
                  titre="Adresse de transfert e-barreau"
                  desc="Faites suivre ici vos notifications e-barreau : chaque avis arrive dans « Arrivées »"
                  valeur={adresse}
                  onClick={() => void copier(adresse).then((ok) => setFait(ok ? `Adresse copiée : ${adresse}` : "Le presse-papier a refusé la copie."))}
                />
              ) : (
                <Rangee icone="Email" titre="Adresse de transfert e-barreau" desc="Faites suivre ici vos notifications e-barreau : chaque avis arrive dans « Arrivées »" verrou={adresse === undefined ? "Lecture…" : associe ? "Pas encore créée" : "Réservée aux associés"} />
              )}
              <Rangee icone="Calendar" titre="Agenda des audiences du cabinet" desc="Un fichier .ics de toutes les audiences prévues, à ouvrir dans votre agenda" valeur={`${prevues.length} audience${prevues.length > 1 ? "s" : ""}`} onClick={agendaCabinet} />
              <Rangee icone="Inbox" titre="e-barreau et RPVA" desc="Vos notifications vous restent adressées ; Tamila n'envoie rien en votre nom" verrou="Lecture seule" />
              <Rangee icone="Chat" titre="Votre messagerie" desc="Aucune connexion à vos courriels : seule l'adresse de transfert reçoit" verrou="Aucun accès" />
            </section>
          </fieldset>

          <fieldset className="tam-reg-champs">
            <h3>Conservation</h3>
            <p className="tam-reg-aide">Fixées à l&apos;installation de Tamila, les mêmes pour tous les dossiers du cabinet.</p>
            <section className="tam-reg-carte">
              <Rangee icone="Trash" titre="Effacement après clôture" desc="Un dossier clos est effacé, pièces comprises, après ce délai" verrou={r ? `${r.delai_cloture_jours} jours` : "—"} />
              <Rangee icone="Archive" titre="Conservation des exports" desc="L'archive d'un dossier reste téléchargeable, puis elle est purgée" verrou={r ? `${r.conservation_exports_jours} jours` : "—"} />
              <Rangee icone="Hourglass" titre="Dossier d'audit" desc="Un audit est effacé après sa date de fin, sauf s'il devient un dossier" verrou={r ? `${r.conservation_audit_jours} jours` : "—"} />
            </section>
          </fieldset>

          <fieldset className="tam-reg-champs">
            <h3>Zone sensible</h3>
            <section className="tam-reg-carte">
              <Rangee titre="Passer au coffre Scaleway" desc="Les nouveaux dossiers y prennent leur clé ; les autres restent sous la phrase jusqu'au ré-enveloppement">
                <button type="button" className="tam-reg-verrou" disabled={!gerant || etat?.statut !== "local"} onClick={() => ouvrir("coffre")}>
                  Passer au coffre…
                </button>
              </Rangee>
              <Rangee titre="Ré-envelopper les clés" desc="Confier au coffre les clés encore sous la phrase, sans déchiffrer une pièce">
                <button type="button" className="tam-reg-verrou" disabled={!associe || etat?.statut !== "bascule"} onClick={() => ouvrir("coffre")}>
                  Ré-envelopper…
                </button>
              </Rangee>
              <Rangee titre="Oublier la phrase" desc="Efface la phrase et les clés déballées de cet onglet">
                <button type="button" className="tam-reg-verrou" disabled={!t.phrase} onClick={() => ouvrir("oublier")}>
                  Oublier…
                </button>
              </Rangee>
            </section>
          </fieldset>
        </div>
      </div>

      <Phrase ouverte={phrase} fermer={() => setPhrase(false)} />

      <TamFenetre
        titre="Installer Tamila"
        sous="L'installation pose les réglages et trois règles de validation : clôture par un associé, levée de muraille par le gérant, confirmation d'un délai par un avocat."
        ouverte={fenetre === "installer"}
        fermer={() => !envoi && setFenetre(null)}
        pied={
          t.source === "reelle" && !t.installe && gerant ? (
            <button type="button" className="tam-bouton tam-bouton--principal" disabled={envoi} onClick={() => void installer()}>
              {envoi ? "…" : "Installer Tamila"}
            </button>
          ) : null
        }
      >
        <p className="tam-note">{t.source === "exemple" || t.installe ? "Tamila est installé pour ce cabinet." : gerant ? "Tamila n'est pas installé pour ce cabinet." : "Tamila n'est pas installé pour ce cabinet. Seul un gérant l'installe."}</p>
        {erreur ? (
          <p className="tam-note" data-teinte="rouge" role="alert">
            {erreur}
          </p>
        ) : null}
      </TamFenetre>

      <TamFenetre
        titre="Le coffre à clés du cabinet"
        sous="Une clé maître par cabinet, chez Scaleway (France), qui ne sort jamais du coffre. Elle enveloppe la clé de chaque dossier ; le serveur la déballe pour qui voit le dossier et pour la lecture des pièces, et journalise chaque remise."
        ouverte={fenetre === "coffre"}
        fermer={() => !progres && setFenetre(null)}
        pied={
          <>
            {etat?.statut === "local" && gerant ? (
              <button type="button" className="tam-bouton tam-bouton--principal" disabled={envoi} onClick={() => void activer()}>
                {envoi ? "…" : "Passer au coffre Scaleway"}
              </button>
            ) : null}
            {etat?.statut === "bascule" ? (
              <button type="button" className="tam-bouton tam-bouton--principal" disabled={!!progres || (t.source === "reelle" && !t.phrase) || etat.dossiers_locaux === 0} onClick={() => void reenvelopper()}>
                Ré-envelopper {etat.dossiers_locaux} dossier{etat.dossiers_locaux > 1 ? "s" : ""}
              </button>
            ) : null}
          </>
        }
      >
        {etat ? (
          <dl className="tam-reg-etat">
            <dt>État</dt>
            <dd>{etat.statut === "scaleway" ? "Toutes les clés au coffre" : etat.statut === "bascule" ? "Bascule en cours" : "Phrase du cabinet"}</dd>
            <dt>Sous la phrase</dt>
            <dd>
              {etat.dossiers_locaux} dossier{etat.dossiers_locaux > 1 ? "s" : ""}
            </dd>
            <dt>Au coffre</dt>
            <dd>
              {etat.dossiers_scaleway} dossier{etat.dossiers_scaleway > 1 ? "s" : ""}
              {etat.region ? ` · ${etat.region === "fr-par" ? "Paris" : etat.region}` : ""}
            </dd>
          </dl>
        ) : null}
        {etat?.statut === "local" ? (
          <p className="tam-note">
            {gerant
              ? "Activer le coffre crée la clé maître du cabinet chez Scaleway. Les nouveaux dossiers y prennent leur clé ; ceux qui existent restent sous la phrase jusqu'à leur ré-enveloppement, que vous lancez ensuite."
              : "Seul le gérant active le coffre du cabinet."}
          </p>
        ) : null}
        {etat?.statut === "bascule" ? (
          <p className="tam-note">
            {t.source === "reelle" && !t.phrase
              ? "Pour ré-envelopper les dossiers encore sous la phrase, tapez d'abord la phrase du cabinet : chaque clé est déballée ici, puis confiée au coffre."
              : "Chaque clé est déballée dans votre navigateur avec la phrase, vérifiée par le coffre sur le dossier, puis enveloppée sous la clé maître. La clé ne change pas : aucune pièce n'est déchiffrée ni re-chiffrée. Les pièces qui attendaient une lecture repartent au lecteur."}
          </p>
        ) : null}
        {etat?.statut === "scaleway" ? <p className="tam-note">Toutes les clés du cabinet sont au coffre : la phrase n&apos;est plus nécessaire pour lire un dossier.</p> : null}
        {progres ? (
          <p className="tam-note" role="status" aria-live="polite">
            Ré-enveloppement : {progres.fait} sur {progres.total}
            <progress max={progres.total} value={progres.fait} aria-label="Avancement du ré-enveloppement" style={{ display: "block", width: "100%", marginTop: 6 }} />
          </p>
        ) : null}
        {echecs.length ? (
          <div className="tam-note" role="alert">
            <strong>
              {echecs.length} dossier{echecs.length > 1 ? "s" : ""} reste{echecs.length > 1 ? "nt" : ""} sous la phrase.
            </strong>{" "}
            Un dossier que vous ne voyez pas (clientèle personnelle, muraille) se ré-enveloppe par son responsable.
            <ul style={{ margin: "6px 0 0 16px", listStyle: "disc" }}>
              {echecs.map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {erreur ? (
          <p className="tam-note" data-teinte="rouge" role="alert">
            {erreur}
          </p>
        ) : null}
      </TamFenetre>

      <TamFenetre
        titre="Créer la clé d'index du cabinet"
        sous="Une fois pour toutes : elle sert à comparer les parties de tous les dossiers sans jamais les lire (empreintes HMAC). Au coffre si le cabinet y est passé, sinon enveloppée sous la phrase."
        ouverte={fenetre === "index"}
        fermer={() => !envoi && setFenetre(null)}
        pied={
          <button type="button" className="tam-bouton tam-bouton--principal" disabled={envoi} onClick={() => void creerIndex()}>
            {envoi ? "…" : "Créer la clé d'index"}
          </button>
        }
      >
        {erreur ? (
          <p className="tam-note" data-teinte="rouge" role="alert">
            {erreur}
          </p>
        ) : (
          <p className="tam-note">Les parties déjà saisies sont indexées au prochain contrôle de chaque dossier.</p>
        )}
      </TamFenetre>

      <TamFenetre
        titre="En-tête des factures et du bordereau"
        sous="Imprimé sur chaque facture, compte détaillé définitif et bordereau de pièces du cabinet. L'adresse d'un client n'est jamais enregistrée."
        ouverte={fenetre === "entete"}
        fermer={() => !envoi && setFenetre(null)}
        large
        pied={
          <button type="button" className="tam-bouton tam-bouton--principal" disabled={envoi} onClick={() => void enregistrerEntete()}>
            {envoi ? "…" : "Enregistrer l'en-tête"}
          </button>
        }
      >
        <div className="tam-champs-ligne">
          {CHAMPS.map((c) => (
            <div key={c.cle} style={c.large ? { gridColumn: "1 / -1" } : undefined}>
              <Champ libelle={c.libelle}>
                <input value={brouillon[c.cle] ?? String(entete[c.cle] ?? "")} onChange={(e) => setBrouillon((b) => ({ ...b, [c.cle]: e.target.value }))} />
              </Champ>
            </div>
          ))}
          <Champ libelle="Délai de paiement (jours, 0 à 60)">
            <input type="number" min={0} max={60} value={brouillon.delai ?? String(entete.delai_paiement_jours ?? 30)} onChange={(e) => setBrouillon((b) => ({ ...b, delai: e.target.value }))} />
          </Champ>
        </div>
        {erreur ? (
          <p className="tam-note" data-teinte="rouge" role="alert">
            {erreur}
          </p>
        ) : null}
      </TamFenetre>

      <TamFenetre
        titre="Oublier la phrase"
        sous="La phrase et les clés déballées de cet onglet sont effacées. Pour relire un dossier, il faudra la saisir de nouveau."
        ouverte={fenetre === "oublier"}
        fermer={() => setFenetre(null)}
        pied={
          <button
            type="button"
            className="tam-bouton tam-bouton--danger"
            onClick={() => {
              t.oublierPhrase();
              setFenetre(null);
              setFait("La phrase est oubliée pour cet onglet.");
            }}
          >
            Oublier la phrase
          </button>
        }
      >
        <p className="tam-note">Rien n&apos;est effacé en base.</p>
      </TamFenetre>
    </TamCarte>
  );
}
