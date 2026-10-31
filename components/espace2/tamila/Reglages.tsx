"use client";

/* ══════════════════════════════════════════════════════════════════════
   TAMILA › Réglages du cabinet (30/10/2026, refonte des pages métiers)

   Settings › Team de Linear, au 1:1 : relevé docs/refonte-metiers/
   releves/linear-team-settings.md, mesures dans components/espace2/lin/
   linear-team-settings.css (préfixe lts-). Barre de retour, colonne de
   640, sections titrées faites de rangées de 65.

   Les réglages qui étaient dans la barre de l'écran quotidien ou cachés
   dans une carte (inventaire § 8.4-2) :
     · Installation (B3, G1), désormais derrière une confirmation ;
     · la phrase du cabinet (B15, L1, L2) ;
     · le coffre à clés (B14, G3 « Passer au coffre », G4 « Ré-envelopper »,
       avec la progression et les échecs) ;
     · la clé d'index des conflits (G57 : au coffre, nouvelle_cle_index ;
       sinon enveloppée sous la phrase), qui était dans la carte Conflits
       d'un dossier ; confirmation ajoutée ;
     · l'en-tête des factures et du bordereau (G56, 13 champs et le délai
       de paiement), qui n'était modifiable que depuis l'aperçu d'une
       facture ; le gérant seul ;
     · les durées du cabinet (clôture, conservation des exports), lues ;
       le coût de revient d'une heure, sur la page Pilotage.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock, FileText, Fingerprint, Gauge, KeyRound, Settings2, ShieldCheck, Timer } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { envelopper, genererCle, phraseMemorisee } from "@/components/espace/tamila/chiffrement";
import * as portes from "@/components/espace/tamila/portes";
import { estAssocie, estGerant } from "@/components/espace/tamila/regles";
import type { EnteteFacture } from "@/components/espace/tamila/types";
import { useToast } from "../Toasts";
import { BASE, FenetresCabinet, type Fenetre } from "./commun";
import { useTamila } from "./donnees";
import "@/components/espace/espace.css";
import "../lin/lin.css";
import "../lin/linear-team-settings.css";

const CHAMPS: { cle: keyof EnteteFacture; libelle: string }[] = [
  { cle: "nom", libelle: "Nom du cabinet" },
  { cle: "forme", libelle: "Forme (SELARL, SCP…)" },
  { cle: "adresse", libelle: "Adresse" },
  { cle: "code_postal_ville", libelle: "Code postal et ville" },
  { cle: "siren", libelle: "SIREN" },
  { cle: "tva_intracom", libelle: "TVA intracommunautaire" },
  { cle: "barreau", libelle: "Barreau" },
  { cle: "toque", libelle: "Toque" },
  { cle: "telephone", libelle: "Téléphone" },
  { cle: "courriel", libelle: "Courriel" },
  { cle: "iban", libelle: "IBAN" },
  { cle: "bic", libelle: "BIC" },
  { cle: "mention_tva", libelle: "Mention de TVA (si 0 %)" },
];

type RangeeP = { href?: string; action?: () => void; inactif?: boolean; icone?: React.ReactNode; nom: string; desc?: string; valeur?: string; teinte?: string };
/* une rangée de 65 : case icône, titre et description, valeur, chevron ; sans lien ni geste, ni chevron ni survol */
function Rangee({ href, action, inactif, icone, nom, desc, valeur, teinte }: RangeeP) {
  const corps = (
    <>
      {icone ? <figure className="lts-case">{icone}</figure> : null}
      <span className="lts-textes">
        <span className="lts-nom">{nom}</span>
        {desc ? <span className="lts-desc">{desc}</span> : null}
      </span>
      <span className="lts-droite">
        {valeur ? (
          <span className="lts-valeur" data-teinte={teinte}>
            {valeur}
          </span>
        ) : null}
        {href || (action && !inactif) ? <ChevronRight className="lts-chevron" aria-hidden="true" /> : null}
      </span>
    </>
  );
  return (
    <li>
      {href ? (
        <Link href={href} className="lts-rangee">
          {corps}
        </Link>
      ) : action && !inactif ? (
        <button type="button" className="lts-rangee" style={{ width: "100%", textAlign: "left" }} onClick={action}>
          {corps}
        </button>
      ) : (
        <div className="lts-rangee lts-rangee--muette">{corps}</div>
      )}
    </li>
  );
}

function Section({ titre, children }: { titre?: string; children: React.ReactNode }) {
  return (
    <section className="lts-section" aria-label={titre}>
      {titre ? <h3 className="lts-h3">{titre}</h3> : null}
      <ul className="lts-carte">{children}</ul>
    </section>
  );
}

type Geste = "installer" | "coffre" | "reenvelopper" | "index" | "entete" | null;

export default function Reglages() {
  const { source, pret, erreur, cabinet, moi, clientId, reglages, phrase, etat, auCoffre, activerCoffre, reenvelopperTout, installerTamila } = useTamila();
  const toast = useToast();
  const [fenetre, setFenetre] = useState<Fenetre>(null);
  const [geste, setGeste] = useState<Geste>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreurGeste, setErreurGeste] = useState<string | null>(null);
  const [progres, setProgres] = useState<{ fait: number; total: number } | null>(null);
  const [echecs, setEchecs] = useState<string[]>([]);
  const gerant = estGerant(moi);
  const associe = estAssocie(moi);

  /* l'en-tête des factures : celui du cabinet, modifié en mémoire sur l'exemple */
  const [entete, setEntete] = useState<EnteteFacture>({});
  const [enteteAvant, setEnteteAvant] = useState<EnteteFacture | undefined>(undefined);
  if (reglages?.facture_entete !== enteteAvant && reglages) {
    setEnteteAvant(reglages.facture_entete);
    setEntete(reglages.facture_entete ?? {});
  }
  const [brouillon, setBrouillon] = useState<Record<string, string>>({});

  /* la clé d'index : null = pas encore créée ; undefined = lecture */
  const [index, setIndex] = useState<{ fournisseur: string } | null | undefined>(undefined);
  useEffect(() => {
    if (!pret) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      if (source === "exemple") {
        if (actif) setIndex({ fournisseur: "local" });
        return;
      }
      if (!clientId) return;
      try {
        const k = await portes.indexCle(clientId);
        if (actif) setIndex(k ? { fournisseur: k.fournisseur } : null);
      } catch {
        if (actif) setIndex(null);
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [pret, source, clientId]);

  const ouvrir = (g: Geste) => {
    setErreurGeste(null);
    setEchecs([]);
    if (g === "entete") setBrouillon({});
    setGeste(g);
  };
  const jouer = async (f: () => Promise<string | null | void>) => {
    setEnvoi(true);
    setErreurGeste(null);
    try {
      const m = await f();
      if (m) toast(m, "vert");
      setGeste(null);
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "La base a refusé.");
    } finally {
      setEnvoi(false);
    }
  };

  const confirmerInstallation = () =>
    jouer(async () => {
      await installerTamila();
      return "Tamila est installé : réglages posés, règles de validation en place.";
    });
  const confirmerCoffre = () => jouer(activerCoffre);
  const lancerReenveloppement = async () => {
    setEnvoi(true);
    setErreurGeste(null);
    try {
      const r = await reenvelopperTout((fait, total) => setProgres({ fait, total }));
      setEchecs(r.echecs);
      if (r.message) {
        toast(r.message, "vert");
        setGeste(null);
      }
    } catch (e) {
      setErreurGeste(e instanceof Error ? e.message : "Le coffre n'a pas répondu.");
    } finally {
      setProgres(null);
      setEnvoi(false);
    }
  };
  const creerIndex = () =>
    jouer(async () => {
      if (source === "reelle") {
        const e = await portes.etatCoffre(clientId);
        if (e && e.statut !== "local") await portes.coffre<{ cle: string }>("nouvelle_cle_index", { client: clientId });
        else {
          const p = phraseMemorisee();
          if (!p) throw new Error("Tapez d'abord la phrase du cabinet : la clé d'index est enveloppée sous elle.");
          await portes.poserIndexCle(clientId, await envelopper(await genererCle(), p));
        }
        setIndex({ fournisseur: e && e.statut !== "local" ? "scaleway" : "local" });
      }
      return "La clé d'index du cabinet est créée : les parties peuvent être indexées et contrôlées.";
    });
  const enregistrerEntete = () =>
    jouer(async () => {
      const nouvel: EnteteFacture = { ...entete };
      for (const c of CHAMPS) {
        if (brouillon[c.cle] === undefined) continue;
        const v = brouillon[c.cle].trim();
        if (v) (nouvel as Record<string, unknown>)[c.cle] = c.cle === "siren" ? v.replace(/\s/g, "") : v;
        else delete (nouvel as Record<string, unknown>)[c.cle];
      }
      if (brouillon.delai !== undefined) nouvel.delai_paiement_jours = Math.max(0, Math.min(60, parseInt(brouillon.delai, 10) || 0));
      if (source === "reelle") await portes.poserEnteteFacture(clientId, nouvel);
      setEntete(nouvel);
      return "L'en-tête des factures et du bordereau est enregistré.";
    });

  const installe = source === "exemple" || !!cabinet?.installe;
  const incomplet = !entete.nom || !entete.siren || !entete.adresse;
  const libelleCoffre = !etat ? "Indisponible" : etat.statut === "scaleway" ? "Toutes les clés au coffre" : etat.statut === "bascule" ? "Bascule en cours" : "Phrase du cabinet";

  return (
    <div className="lin lts">
      <h1 className="v2-sr">Réglages du cabinet</h1>
      <div className="lts-barre">
        <Link href={BASE} className="lts-retour">
          <ChevronLeft aria-hidden="true" />
          Dossiers
        </Link>
      </div>
      <div className="lts-zone">
        <div className="lts-colonne">
          <div className="lts-tete">
            <h2 className="lts-titre">Réglages du cabinet</h2>
            <div className="lts-sous">
              <p className="lts-aide">Chiffrement, installation, conflits d&apos;intérêts et factures. Valent pour tous les dossiers.</p>
            </div>
          </div>
          {erreur && source === "reelle" ? (
            <p className="lts-note" role="alert">
              La base réelle n&apos;a pas répondu. {erreur}
            </p>
          ) : null}

          {!pret ? (
            <p className="lts-note" role="status">
              Lecture du cabinet…
            </p>
          ) : (
            <div className="lts-sections">
              <Section titre="Cabinet">
                <Rangee
                  icone={<Settings2 aria-hidden="true" />}
                  nom="Installation"
                  desc="Pose les réglages et trois règles de validation : clôture par un associé, levée de muraille par le gérant, confirmation d'un délai par un avocat."
                  valeur={installe ? "Installé" : gerant ? "À installer" : "Seul un gérant l'installe"}
                  teinte={installe ? undefined : "jaune"}
                  action={!installe && gerant ? () => ouvrir("installer") : undefined}
                />
                <Rangee icone={<Timer aria-hidden="true" />} nom="Effacement après la clôture" desc="Un dossier clos est effacé au terme de ce délai ; l'export se demande avant." valeur={reglages ? `${reglages.delai_cloture_jours} jours` : "—"} />
                <Rangee icone={<Clock aria-hidden="true" />} nom="Conservation des exports" desc="L'archive d'un export reste téléchargeable ce temps-là, puis elle est purgée." valeur={reglages ? `${reglages.conservation_exports_jours} jours` : "—"} />
              </Section>

              <Section titre="Chiffrement">
                {source === "reelle" ? (
                  <Rangee icone={<KeyRound aria-hidden="true" />} nom="Phrase du cabinet" desc="Elle déballe la clé de chaque dossier dans ce navigateur ; elle reste dans cet onglet et n'est jamais envoyée." valeur={phrase ? "Mémorisée pour cet onglet" : auCoffre ? "Inutile au coffre" : "À taper"} teinte={phrase || auCoffre ? undefined : "jaune"} action={() => setFenetre("phrase")} />
                ) : null}
                {etat && associe ? (
                  <>
                    <Rangee
                      icone={<ShieldCheck aria-hidden="true" />}
                      nom="Coffre à clés Scaleway"
                      desc={`Une clé maître par cabinet, en France, qui ne sort jamais du coffre. ${etat.dossiers_locaux} dossier${etat.dossiers_locaux > 1 ? "s" : ""} sous la phrase, ${etat.dossiers_scaleway} au coffre${etat.region ? ` (${etat.region === "fr-par" ? "Paris" : etat.region})` : ""}.`}
                      valeur={libelleCoffre}
                      teinte={etat.statut === "bascule" ? "jaune" : undefined}
                      action={etat.statut === "local" && gerant ? () => ouvrir("coffre") : etat.statut === "bascule" ? () => ouvrir("reenvelopper") : undefined}
                    />
                    {etat.statut === "local" && !gerant ? <Rangee nom="Seul le gérant active le coffre du cabinet." /> : null}
                  </>
                ) : null}
              </Section>

              <Section titre="Conflits d'intérêts">
                <Rangee
                  icone={<Fingerprint aria-hidden="true" />}
                  nom="Clé d'index du cabinet"
                  desc="Elle compare les noms des parties entre dossiers sans qu'aucun nom ne quitte votre navigateur. Créée une fois par le gérant."
                  valeur={index === undefined ? "Lecture…" : index ? (index.fournisseur === "scaleway" ? "Au coffre" : "Sous la phrase") : gerant ? "À créer" : "Pas encore créée"}
                  teinte={index === null ? "jaune" : undefined}
                  action={index === null && gerant ? () => ouvrir("index") : undefined}
                />
              </Section>

              <Section titre="Factures et bordereau">
                <Rangee
                  icone={<FileText aria-hidden="true" />}
                  nom="En-tête du cabinet"
                  desc={entete.nom ? [entete.nom, entete.forme, entete.code_postal_ville, entete.barreau ? `barreau de ${entete.barreau}` : null].filter(Boolean).join(" · ") : "Nom, SIREN, adresse, barreau, coordonnées bancaires : sur chaque facture et chaque bordereau."}
                  valeur={incomplet ? "Incomplet" : `Paiement à ${entete.delai_paiement_jours ?? 0} jours`}
                  teinte={incomplet ? "jaune" : undefined}
                  action={gerant ? () => ouvrir("entete") : undefined}
                />
              </Section>

              <Section titre="Pilotage">
                <Rangee href={`${BASE}/pilotage`} icone={<Gauge aria-hidden="true" />} nom="Coût de revient d'une heure" desc="Il sert au calcul de la marge par dossier ; il reste dans ce navigateur." />
              </Section>
            </div>
          )}
        </div>
      </div>

      <FenetresCabinet fenetre={fenetre} fermer={() => setFenetre(null)} />

      <Dialog open={!!geste} onOpenChange={(o) => !o && !envoi && setGeste(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>{geste === "entete" ? <FileText width={18} height={18} aria-hidden="true" /> : geste === "index" ? <Fingerprint width={18} height={18} aria-hidden="true" /> : geste === "installer" ? <Settings2 width={18} height={18} aria-hidden="true" /> : <ShieldCheck width={18} height={18} aria-hidden="true" />}</DialogIcone>
            <DialogTitle>{geste === "installer" ? "Installer Tamila" : geste === "coffre" ? "Passer au coffre Scaleway" : geste === "reenvelopper" ? "Ré-envelopper les dossiers" : geste === "index" ? "Créer la clé d'index" : "En-tête du cabinet"}</DialogTitle>
            <DialogDescription>
              {geste === "installer"
                ? "Les réglages du cabinet et trois règles de validation sont posés. Le geste ne se défait pas."
                : geste === "coffre"
                  ? "Le coffre crée la clé maître du cabinet chez Scaleway. Les nouveaux dossiers y prennent leur clé ; ceux qui existent restent sous la phrase jusqu'à leur ré-enveloppement."
                  : geste === "reenvelopper"
                    ? "Chaque clé est déballée dans votre navigateur avec la phrase, vérifiée par le coffre, puis enveloppée sous la clé maître. La clé ne change pas : aucune pièce n'est déchiffrée ni re-chiffrée."
                    : geste === "index"
                      ? auCoffre
                        ? "Une clé d'index est tirée par le coffre du cabinet. Elle sert à comparer les parties de tous les dossiers."
                        : "Une clé d'index est tirée dans votre navigateur et enveloppée sous la phrase du cabinet."
                      : "Il figure sur toutes les factures et sur le bordereau de pièces."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {geste === "reenvelopper" && etat ? (
                source === "reelle" && !phrase ? (
                  <Avis teinte="ambre">Tapez d&apos;abord la phrase du cabinet : chaque clé est déballée ici, puis confiée au coffre.</Avis>
                ) : (
                  <Avis teinte="bleu">
                    {etat.dossiers_locaux} dossier{etat.dossiers_locaux > 1 ? "s" : ""} sous la phrase. Les pièces qui attendaient une lecture repartent au lecteur.
                  </Avis>
                )
              ) : null}
              {progres ? (
                <div className="tam-coffre-progres" role="status" aria-live="polite">
                  <Loader variant="spin" /> Ré-enveloppement : {progres.fait} sur {progres.total}
                  <progress max={progres.total} value={progres.fait} aria-label="Avancement du ré-enveloppement" />
                </div>
              ) : null}
              {echecs.length ? (
                <Avis teinte="ambre" role="alert">
                  <strong>
                    {echecs.length} dossier{echecs.length > 1 ? "s" : ""} reste{echecs.length > 1 ? "nt" : ""} sous la phrase.
                  </strong>{" "}
                  Un dossier que vous ne voyez pas (clientèle personnelle, muraille) se ré-enveloppe par son responsable.
                  <ul>
                    {echecs.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                </Avis>
              ) : null}
              {geste === "index" && source === "reelle" && !auCoffre && !phrase ? <Avis teinte="ambre">Tapez d&apos;abord la phrase du cabinet : la clé d&apos;index est enveloppée sous elle.</Avis> : null}
              {geste === "entete" ? (
                <>
                  <div className="esp-form-ligne">
                    {CHAMPS.map((c) => (
                      <label key={c.cle} className="rv-libelle">
                        {c.libelle}
                        <input className="rv-champ" value={brouillon[c.cle] ?? String(entete[c.cle] ?? "")} onChange={(e) => setBrouillon((b) => ({ ...b, [c.cle]: e.target.value }))} />
                      </label>
                    ))}
                    <label className="rv-libelle">
                      Délai de paiement (jours, 60 au plus)
                      <input className="rv-champ" inputMode="numeric" value={brouillon.delai ?? String(entete.delai_paiement_jours ?? "")} onChange={(e) => setBrouillon((b) => ({ ...b, delai: e.target.value }))} />
                    </label>
                  </div>
                </>
              ) : null}
              {erreurGeste ? (
                <Avis teinte="rouge" role="alert">
                  {erreurGeste}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--fil" disabled={envoi} onClick={() => setGeste(null)}>
              Annuler
            </button>
            <button
              type="button"
              className="r-btn r-btn--noir"
              disabled={envoi || (geste === "reenvelopper" && (!etat || etat.dossiers_locaux === 0 || (source === "reelle" && !phrase)))}
              onClick={() => (geste === "installer" ? void confirmerInstallation() : geste === "coffre" ? void confirmerCoffre() : geste === "reenvelopper" ? void lancerReenveloppement() : geste === "index" ? void creerIndex() : void enregistrerEntete())}
            >
              {envoi ? <Loader variant="spin" /> : null}{" "}
              {geste === "installer" ? "Installer Tamila" : geste === "coffre" ? "Passer au coffre Scaleway" : geste === "reenvelopper" ? `Ré-envelopper ${etat?.dossiers_locaux ?? 0} dossier${(etat?.dossiers_locaux ?? 0) > 1 ? "s" : ""}` : geste === "index" ? "Créer la clé d'index" : "Enregistrer l'en-tête"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
