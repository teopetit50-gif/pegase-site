"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le barème de remise en état (06/10/2026, session B2)

   Celui en vigueur, ligne par ligne (code, famille, unité, prix, TVA,
   catégorie) ; les barèmes retirés en dessous. La direction (gérant,
   admin) publie un nouveau barème — une ligne par ligne de texte,
   « CODE ; libellé ; famille ; unité ; prix ; régime ; taux ; catégorie » —
   ou retire celui en vigueur avec un motif. Les deux passent par les
   portes loc_publier_bareme et loc_retirer_bareme ; la base vérifie codes,
   familles, unités et doublons, et son message est montré tel quel.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useState } from "react";
import { BookOpen, Upload } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { dateCourte, montant, pourcent } from "../format";
import { FAMILLES_LIGNE, UNITES } from "./etats";
import type { Bareme, Categorie, LigneBareme, Role } from "./types";

const MODELE = `CARBURANT_8E ; Carburant manquant, au huitième ; carburant ; huitieme ; 12 ; taxable ; 20
KM_SUP ; Kilomètre au-delà du forfait ; kilometres ; km ; 0.25 ; taxable ; 20
RETARD_JOUR ; Jour de retard entamé (au tarif du contrat) ; retard ; jour_entame ; ; taxable ; 20
RAYURE_PORTIERE ; Rayure de portière ; dommage ; forfait ; 180 ; hors_champ
JANTE ; Jante, sur devis carrossier ; dommage ; devis ; ; hors_champ
NETTOYAGE ; Nettoyage approfondi ; nettoyage ; forfait ; 60 ; taxable ; 20
FRAIS_DOSSIER ; Frais de dossier ; frais ; forfait ; 25 ; taxable ; 20`;

export function lireLignesBareme(texte: string): Record<string, unknown>[] {
  return texte.split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#")).map((l) => {
    const [code = "", libelle = "", famille = "", unite = "", prix = "", regime = "", taux = "", categorie = ""] = l.split(";").map((x) => x.trim());
    const ligne: Record<string, unknown> = { code: code.toUpperCase(), libelle, famille, unite, regime_tva: regime || (famille === "dommage" ? "hors_champ" : "taxable") };
    if (prix) ligne.prix_eur = prix.replace(",", ".");
    if (taux) ligne.taux_tva = taux.replace(",", ".");
    if (categorie) ligne.categorie = categorie;
    return ligne;
  });
}

export default function BaremeVue({ baremes, lignes, categories, role, onPublier, onRetirer }: {
  baremes: Bareme[];
  lignes: LigneBareme[];
  categories: Categorie[];
  role: Role | null;
  onPublier: (libelle: string, date_effet: string, lignes: Record<string, unknown>[]) => Promise<void>;
  onRetirer: (bareme: Bareme, motif: string) => Promise<void>;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [retrait, setRetrait] = useState<Bareme | null>(null);
  const [libelle, setLibelle] = useState("");
  const [date, setDate] = useState("");
  const [texte, setTexte] = useState(MODELE);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const direction = role === "gerant" || role === "admin";

  const enVigueur = useMemo(() => {
    const auj = new Date().toISOString().slice(0, 10);
    return baremes.filter((b) => b.statut === "publie" && b.date_effet <= auj).sort((a, b) => b.date_effet.localeCompare(a.date_effet))[0] ?? baremes.find((b) => b.statut === "publie") ?? null;
  }, [baremes]);
  const [choix, setChoix] = useState<string | null>(null);
  const montre = baremes.find((b) => b.id === choix) ?? enVigueur;
  const lignesMontrees = montre ? lignes.filter((l) => l.bareme_id === montre.id).sort((a, b) => a.rang - b.rang) : [];
  const nomCategorie = (id: string | null) => (id ? (categories.find((c) => c.id === id)?.code ?? "?") : "toutes");
  const lignesLues = useMemo(() => lireLignesBareme(texte), [texte]);

  async function envoyer(action: () => Promise<void>, message: string) {
    setEnvoi(true);
    setErreur(null);
    try {
      await action();
      setFait(message);
      setOuvert(false);
      setRetrait(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé l'opération.");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <section className="esp-carte" aria-label="Barème de remise en état">
      <div className="esp-carte-tete">
        <div className="tav-bareme-tete" style={{ width: "100%" }}>
          <div className="esp-item-haut">
            <h2 className="esp-carte-titre">Barème de remise en état</h2>
            {montre ? <Pastille teinte={montre.statut === "publie" ? "vert" : "gris"}>{montre.statut === "publie" ? `en vigueur depuis le ${dateCourte(montre.date_effet)}` : `retiré le ${dateCourte(montre.retire_le)}`}</Pastille> : <Pastille teinte="rouge">Aucun barème</Pastille>}
          </div>
          <div className="esp-actions" style={{ marginTop: 0 }}>
            {baremes.length > 1 ? (
              <select className="rv-champ" value={montre?.id ?? ""} onChange={(e) => setChoix(e.target.value)} aria-label="Choisir un barème" style={{ maxWidth: 260 }}>
                {baremes.map((b) => <option key={b.id} value={b.id}>{b.libelle} · {b.statut === "publie" ? "publié" : "retiré"}</option>)}
              </select>
            ) : null}
            <button type="button" className="r-btn r-btn--fil r-btn--petit" disabled={!direction || !montre || montre.statut !== "publie"} title={direction ? undefined : "Seule la direction retire un barème"} onClick={() => { setMotif(""); setErreur(null); setRetrait(montre); }}>Retirer</button>
            <button type="button" className="r-btn r-btn--noir r-btn--petit" disabled={!direction} title={direction ? undefined : "Seule la direction publie le barème"} onClick={() => { setErreur(null); setFait(null); setOuvert(true); }}><Upload width={14} height={14} aria-hidden="true" /> Publier un barème</button>
          </div>
        </div>
      </div>
      <div className="esp-carte-corps">
        {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status"><strong>C&apos;est fait.</strong> {fait}</Avis></div> : null}
        {!montre ? (
          <Avis teinte="rouge"><strong>Aucun barème publié.</strong> Sans barème en vigueur à la date du départ, aucun retour ne se chiffre : la direction doit en publier un.</Avis>
        ) : (
          <>
            <p className="esp-kpi-sous" style={{ marginBottom: 8 }}>{montre.libelle} · {lignesMontrees.length} lignes{montre.motif_retrait ? ` · retiré : ${montre.motif_retrait}` : ""}</p>
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Lignes du barème">
              <table className="esp-tableau">
                <thead><tr><th>Code</th><th>Libellé</th><th>Famille</th><th>Unité</th><th className="esp-num">Prix</th><th>TVA</th><th>Catégorie</th></tr></thead>
                <tbody>
                  {lignesMontrees.map((l) => (
                    <tr key={l.id}>
                      <td className="esp-mono">{l.code}</td>
                      <td>{l.libelle}</td>
                      <td>{FAMILLES_LIGNE[l.famille]}</td>
                      <td>{UNITES[l.unite]}</td>
                      <td className="esp-num">{l.prix_eur !== null ? montant(l.prix_eur) : l.famille === "retard" ? <span className="esp-kpi-sous">tarif du contrat</span> : <span className="esp-kpi-sous">devis</span>}</td>
                      <td>{l.regime_tva === "hors_champ" ? "hors champ" : l.taux_tva !== null ? pourcent(l.taux_tva) : "de l'agence"}</td>
                      <td>{nomCategorie(l.categorie_id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Dialog open={ouvert} onOpenChange={(o) => !o && setOuvert(false)}>
        <DialogContent className="tav-dialogue-large">
          <DialogHeader>
            <DialogIcone><BookOpen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Publier un barème</DialogTitle>
            <DialogDescription>Une ligne par poste : code ; libellé ; famille (carburant, kilometres, retard, dommage, nettoyage, frais, autre) ; unité (huitieme, litre, km, jour_entame, forfait, devis) ; prix ; régime (taxable, hors_champ) ; taux ; catégorie. Un dommage est hors du champ de la TVA ; le retard sans prix se chiffre au tarif du contrat.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Libellé <span className="esp-obligatoire">(obligatoire)</span><input className="rv-champ" value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Barème de remise en état 2027" /></label>
                <label className="rv-libelle">Date d&apos;effet <span className="esp-obligatoire">(obligatoire)</span><input type="date" className="rv-champ" value={date} onChange={(e) => setDate(e.target.value)} /></label>
              </div>
              <label className="rv-libelle">Lignes ({lignesLues.length})<textarea className="rv-champ esp-mono" rows={10} value={texte} onChange={(e) => setTexte(e.target.value)} spellCheck={false} /></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi || !libelle.trim() || !date || lignesLues.length === 0} onClick={() => envoyer(() => onPublier(libelle.trim(), date, lignesLues), `Le barème « ${libelle.trim()} » est publié ; il s'applique aux départs à partir du ${dateCourte(date)}.`)}>{envoi ? <Loader variant="spin" /> : null} Publier</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!retrait} onOpenChange={(o) => !o && setRetrait(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><BookOpen width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Retirer le barème « {retrait?.libelle} »</DialogTitle>
            <DialogDescription>Un barème retiré ne s&apos;applique plus à aucun départ ; les retours déjà chiffrés gardent le leur. Le motif reste au journal.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">Motif<textarea className="rv-champ" rows={2} value={motif} onChange={(e) => setMotif(e.target.value)} /></label>
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--rouge" disabled={envoi} onClick={() => retrait && envoyer(() => onRetirer(retrait, motif.trim()), "Le barème est retiré.")}>{envoi ? <Loader variant="spin" /> : null} Retirer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
