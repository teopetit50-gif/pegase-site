"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'aperçu et l'impression d'une facture d'honoraires (06/10/2026,
   session B4, b4_09)

   La facture est composée ici (facture.ts), avec le nom du client et le
   détail du temps déchiffrés dans le navigateur ; l'aperçu est un cadre
   isolé (srcDoc), imprimé tel quel (ou enregistré en PDF par le
   navigateur). L'adresse du client se tape pour l'impression et n'est
   jamais enregistrée. Le gérant pose ici l'en-tête du cabinet (porte
   tamila_poser_entete_facture) ; les autres le lisent.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis } from "../ui";
import { htmlFacture } from "./facture";
import * as portes from "./portes";
import type { Convention, EnteteFacture, Facture, Temps } from "./types";

type Props = {
  ouvert: boolean;
  onFermer: () => void;
  source: Source;
  clientId: string;
  facture: Facture;
  convention: Convention | null;
  temps: Temps[];
  descriptions: Record<string, string>;
  entete: EnteteFacture;
  clientNom: string | null;
  dossier: { reference: string; intitule: string } | null;
  gerant: boolean;
};

const CHAMPS: { cle: keyof EnteteFacture; libelle: string; large?: boolean }[] = [
  { cle: "nom", libelle: "Nom du cabinet" }, { cle: "forme", libelle: "Forme (SELARL, SCP…)" },
  { cle: "adresse", libelle: "Adresse", large: true }, { cle: "code_postal_ville", libelle: "Code postal et ville" },
  { cle: "siren", libelle: "SIREN" }, { cle: "tva_intracom", libelle: "TVA intracommunautaire" },
  { cle: "barreau", libelle: "Barreau" }, { cle: "toque", libelle: "Toque" },
  { cle: "telephone", libelle: "Téléphone" }, { cle: "courriel", libelle: "Courriel" },
  { cle: "iban", libelle: "IBAN" }, { cle: "bic", libelle: "BIC" },
  { cle: "mention_tva", libelle: "Mention de TVA (si 0 %)", large: true },
];

export default function FactureImprimable({ ouvert, onFermer, source, clientId, facture, convention, temps, descriptions, entete, clientNom, dossier, gerant }: Props) {
  const cadre = useRef<HTMLIFrameElement>(null);
  const [adresse, setAdresse] = useState("");
  const [nomClient, setNomClient] = useState(clientNom ?? "");
  const [enEdition, setEnEdition] = useState(false);
  const [enteteLocal, setEnteteLocal] = useState<EnteteFacture>(entete);
  const [brouillon, setBrouillon] = useState<Record<string, string>>({});
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const incomplet = !enteteLocal.nom || !enteteLocal.siren || !enteteLocal.adresse;
  const html = useMemo(
    () => htmlFacture({
      facture, convention, temps, descriptions, entete: enteteLocal,
      client: { nom: nomClient || "Client", adresse },
      dossier: dossier ?? { reference: "Dossier", intitule: "intitulé chiffré" },
    }),
    [facture, convention, temps, descriptions, enteteLocal, nomClient, adresse, dossier],
  );

  const imprimer = () => cadre.current?.contentWindow?.print();

  const enregistrerEntete = async () => {
    setEnvoi(true);
    setErreur(null);
    try {
      const nouvel: EnteteFacture = { ...enteteLocal };
      for (const c of CHAMPS) {
        if (brouillon[c.cle] === undefined) continue;
        const v = brouillon[c.cle].trim();
        if (v) (nouvel as Record<string, unknown>)[c.cle] = c.cle === "siren" ? v.replace(/\s/g, "") : v;
        else delete (nouvel as Record<string, unknown>)[c.cle];
      }
      if (brouillon.delai !== undefined) nouvel.delai_paiement_jours = Math.max(0, Math.min(60, parseInt(brouillon.delai, 10) || 0));
      if (source === "reelle") await portes.poserEnteteFacture(clientId, nouvel);
      setEnteteLocal(nouvel);
      setEnEdition(false);
      setBrouillon({});
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'en-tête.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="tam-facture-dialogue">
        <DialogHeader>
          <DialogIcone><Printer width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>{facture.nature === "compte_definitif" ? "Compte détaillé définitif" : "Facture"} {facture.numero}</DialogTitle>
          <DialogDescription>Composée dans votre navigateur : le nom du client et le détail du temps ne quittent pas cet écran. L&apos;adresse du client se tape pour l&apos;impression et n&apos;est pas enregistrée.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            {incomplet && !enEdition ? (
              <Avis teinte="ambre">L&apos;en-tête du cabinet est incomplet (nom, adresse, SIREN : mentions obligatoires). {gerant ? "Complétez-le une fois pour toutes les factures." : "Le gérant le complète une fois pour toutes les factures."}</Avis>
            ) : null}
            <div className="esp-form-ligne">
              <label className="rv-libelle">Client<input className="rv-champ" value={nomClient} onChange={(e) => setNomClient(e.target.value)} /></label>
              <label className="rv-libelle">Adresse du client (non enregistrée)<textarea className="rv-champ" rows={2} value={adresse} onChange={(e) => setAdresse(e.target.value)} /></label>
            </div>
            {gerant && !enEdition ? (
              <div className="esp-actions"><button type="button" className="esp-lien-bouton" onClick={() => setEnEdition(true)}>Modifier l&apos;en-tête du cabinet</button></div>
            ) : null}
            {enEdition ? (
              <fieldset className="tam-entete">
                <legend>En-tête du cabinet (toutes les factures)</legend>
                <div className="tam-entete-grille">
                  {CHAMPS.map((c) => (
                    <label key={c.cle} className={`rv-libelle${c.large ? " tam-entete-large" : ""}`}>
                      {c.libelle}
                      <input className="rv-champ" value={brouillon[c.cle] ?? String(enteteLocal[c.cle] ?? "")} onChange={(e) => setBrouillon((b) => ({ ...b, [c.cle]: e.target.value }))} />
                    </label>
                  ))}
                  <label className="rv-libelle">Délai de paiement (jours)<input className="rv-champ" type="number" min={0} max={60} value={brouillon.delai ?? String(enteteLocal.delai_paiement_jours ?? 30)} onChange={(e) => setBrouillon((b) => ({ ...b, delai: e.target.value }))} /></label>
                </div>
                <div className="esp-actions">
                  <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setEnEdition(false); setBrouillon({}); }}>Annuler</button>
                  <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi} onClick={enregistrerEntete}>{envoi ? <Loader variant="spin" /> : null} Enregistrer l&apos;en-tête</button>
                </div>
              </fieldset>
            ) : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            <iframe ref={cadre} className="tam-facture-apercu" title={`Aperçu de la facture ${facture.numero}`} srcDoc={html} sandbox="allow-modals allow-same-origin" />
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--fil" onClick={onFermer}>Fermer</button>
          <button type="button" className="r-btn r-btn--noir" onClick={imprimer}><Printer width={15} height={15} aria-hidden="true" /> Imprimer ou enregistrer en PDF</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
