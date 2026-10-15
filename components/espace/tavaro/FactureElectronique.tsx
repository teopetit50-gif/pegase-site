"use client";

/* ══════════════════════════════════════════════════════════════════════
   La forme électronique d'une facture ou d'un avoir, et la préparation
   au 1er septembre 2027 (06/10/2026, session B2, vague 3, migration b2_06)

   Pour une pièce : son flux (facture électronique par plateforme agréée,
   e-reporting pour un particulier, ou à compléter), ce qui la ferait
   rejeter, le XML CII EN 16931 à lire ou télécharger, et, s'il manque le
   SIREN d'un client professionnel, le champ pour le compléter (contrôlé
   par la base : clé de Luhn). Pour le loueur : où il en est.
   ══════════════════════════════════════════════════════════════════════ */

import { useState } from "react";
import { Download, FileCode2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { LIBELLES_FLUX, LIBELLES_MANQUES, sirenValide, type FormeElectronique } from "./cii";

export type Preparation = {
  echeance_emission: string;
  emetteur: { siren: boolean; numero_tva: boolean; adresse: boolean };
  clients_pro_sans_siren: number;
  pieces_90_jours: { flux: string; n: number; prets: number }[];
};

export function BoutonFactureElectronique({ piece, charger, completer }: {
  piece: string;
  charger: () => Promise<FormeElectronique>;
  /* compléter le client (SIREN), si le geste est permis ; la prochaine facture le portera */
  completer: ((valeurs: Record<string, string>) => Promise<void>) | null;
}) {
  const [forme, setForme] = useState<FormeElectronique | null>(null);
  const [ouvert, setOuvert] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [siren, setSiren] = useState("");
  const [fait, setFait] = useState<string | null>(null);

  const ouvrir = async () => {
    setOuvert(true);
    setErreur(null);
    setFait(null);
    setForme(null);
    try {
      setForme(await charger());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  };
  const telecharger = () => {
    if (!forme) return;
    const url = URL.createObjectURL(new Blob([forme.xml], { type: "application/xml" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = forme.fichier;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const completerSiren = async () => {
    if (!completer) return;
    setEnvoi(true);
    setErreur(null);
    try {
      await completer({ siren: siren.replace(/\s/g, "") });
      setFait("Le SIREN du client est enregistré : les prochaines factures le porteront. Une facture déjà émise ne change pas.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé le SIREN.");
    } finally {
      setEnvoi(false);
    }
  };
  const sirenSaisi = siren.replace(/\s/g, "");

  return (
    <>
      <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => void ouvrir()}><FileCode2 width={14} height={14} aria-hidden="true" /> Forme électronique</button>
      <Dialog open={ouvert} onOpenChange={(o) => !o && setOuvert(false)}>
        <DialogContent className="tav-dialogue-large">
          <DialogHeader>
            <DialogIcone><FileCode2 width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>{piece} — forme électronique</DialogTitle>
            <DialogDescription>Au 1er septembre 2027, une facture à un client professionnel part par une plateforme agréée, au format structuré ; une facture à un particulier est déclarée en e-reporting. Voici celle-ci telle qu&apos;elle partirait.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {!forme && !erreur ? <Loader variant="spin" /> : null}
            {forme ? (
              <div className="esp-form">
                <div className="esp-item-haut">
                  <Pastille teinte={forme.flux === "a_completer" ? "ambre" : "bleu"}>{LIBELLES_FLUX[forme.flux]}</Pastille>
                  <Pastille teinte={forme.pret ? "vert" : "rouge"}>{forme.pret ? "prête" : `${forme.manques.length} point${forme.manques.length > 1 ? "s" : ""} à corriger`}</Pastille>
                  <span className="esp-kpi-sous">{forme.format}</span>
                </div>
                {forme.manques.length ? (
                  <Avis teinte="ambre">
                    <strong>Une plateforme agréée la refuserait : il manque</strong>
                    <ul className="tav-avert">{forme.manques.map((m) => <li key={m}><span>{LIBELLES_MANQUES[m] ?? m}</span></li>)}</ul>
                  </Avis>
                ) : <Avis teinte="vert">Contrôles passés : SIREN, TVA, adresses, catégories et totaux.</Avis>}
                {forme.manques.includes("siren_client") && completer ? (
                  <div className="esp-form-ligne">
                    <label className="rv-libelle">SIREN du client<input className="rv-champ esp-mono" inputMode="numeric" value={siren} onChange={(e) => setSiren(e.target.value)} placeholder="9 chiffres" autoComplete="off" /></label>
                    <div style={{ alignSelf: "end" }}>
                      <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={envoi || !sirenValide(sirenSaisi)} onClick={() => void completerSiren()}>{envoi ? <Loader variant="spin" /> : null} Enregistrer le SIREN</button>
                    </div>
                    {sirenSaisi.length === 9 && !sirenValide(sirenSaisi) ? <p className="esp-kpi-sous">La clé de contrôle de ce SIREN est fausse : vérifiez-le sur l&apos;extrait Kbis.</p> : null}
                  </div>
                ) : null}
                {fait ? <Avis teinte="vert" role="status">{fait}</Avis> : null}
                <div className="tav-xml" tabIndex={0} role="region" aria-label={`XML de ${piece}`}><pre>{forme.xml}</pre></div>
              </div>
            ) : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={!forme} onClick={telecharger}><Download width={14} height={14} aria-hidden="true" /> Télécharger le XML</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function Preparation2027({ preparation }: { preparation: Preparation | null }) {
  if (!preparation) return null;
  const e = preparation.emetteur;
  const total = preparation.pieces_90_jours.reduce((t, p) => t + p.n, 0);
  const prets = preparation.pieces_90_jours.reduce((t, p) => t + p.prets, 0);
  const lignes: [boolean, string][] = [
    [e.siren, "Le SIREN du loueur est connu et valide"],
    [e.numero_tva, "Le numéro de TVA intracommunautaire est renseigné"],
    [e.adresse, "L'adresse du loueur porte code postal et ville"],
    [preparation.clients_pro_sans_siren === 0, preparation.clients_pro_sans_siren === 0 ? "Chaque client professionnel de l'année a son SIREN" : `${preparation.clients_pro_sans_siren} client${preparation.clients_pro_sans_siren > 1 ? "s" : ""} professionnel${preparation.clients_pro_sans_siren > 1 ? "s" : ""} sans SIREN valide`],
  ];
  const ok = lignes.every(([v]) => v);
  return (
    <section className="esp-carte" aria-label="Facture électronique : préparation 2027">
      <div className="esp-carte-tete">
        <div className="esp-item-haut">
          <h2 className="esp-carte-titre">Facture électronique : prêt pour le 1er septembre 2027 ?</h2>
          <Pastille teinte={ok ? "vert" : "ambre"}>{ok ? "prêt" : "à préparer"}</Pastille>
        </div>
      </div>
      <div className="esp-carte-corps">
        <ul className="tav-preparation">
          {lignes.map(([v, t]) => <li key={t} data-ok={v ? "oui" : "non"}><span aria-hidden="true">{v ? "✓" : "!"}</span> {t}</li>)}
        </ul>
        <p className="esp-kpi-sous" style={{ marginTop: 8 }}>
          Sur 90 jours : {total} facture{total > 1 ? "s" : ""}, {prets} prête{prets > 1 ? "s" : ""} pour la plateforme agréée
          {preparation.pieces_90_jours.length ? ` (${preparation.pieces_90_jours.map((p) => `${LIBELLES_FLUX[p.flux as keyof typeof LIBELLES_FLUX] ?? p.flux} : ${p.n}`).join(" ; ")})` : ""}.
          Le raccordement à la plateforme elle-même est fait par Omega pour tous les modules.
        </p>
      </div>
    </section>
  );
}
