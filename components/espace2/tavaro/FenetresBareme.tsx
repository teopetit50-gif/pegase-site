"use client";

/* TAVARO — les fenêtres du barème (F31 « Publier un barème », F32 « Retirer
   le barème ») : le code de BaremeVue ligne pour ligne, sans la carte qui
   les portait ; la page Réglages (copie de Settings › Labels de Linear)
   les ouvre par une demande (quoi, barème, n). */

import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen } from "lucide-react";
import { dateCourte } from "@/components/espace/format";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { lireLignesBareme } from "@/components/espace/tavaro/BaremeVue";
import type { Bareme } from "@/components/espace/tavaro/types";
import { useTavaro } from "./donnees";

const MODELE = `CARBURANT_8E ; Carburant manquant, au huitième ; carburant ; huitieme ; 12 ; taxable ; 20
KM_SUP ; Kilomètre au-delà du forfait ; kilometres ; km ; 0.25 ; taxable ; 20
RETARD_JOUR ; Jour de retard entamé (au tarif du contrat) ; retard ; jour_entame ; ; taxable ; 20
RAYURE_PORTIERE ; Rayure de portière ; dommage ; forfait ; 180 ; hors_champ
JANTE ; Jante, sur devis carrossier ; dommage ; devis ; ; hors_champ
NETTOYAGE ; Nettoyage approfondi ; nettoyage ; forfait ; 60 ; taxable ; 20
FRAIS_DOSSIER ; Frais de dossier ; frais ; forfait ; 25 ; taxable ; 20`;

export type DemandeBareme = { quoi: "publier" | "retirer"; bareme?: Bareme; n: number } | null;

export function FenetresBareme({ demande, onFait }: { demande: DemandeBareme; onFait: (m: string) => void }) {
  const { publier: onPublier, retirer: onRetirer } = useTavaro();
  const [ouvert, setOuvert] = useState(false);
  const [retrait, setRetrait] = useState<Bareme | null>(null);
  const [libelle, setLibelle] = useState("");
  const [date, setDate] = useState("");
  const [texte, setTexte] = useState(MODELE);
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

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

  useEffect(() => {
    if (fait) {
      onFait(fait);
      const t = window.setTimeout(() => setFait(null), 0);
      return () => window.clearTimeout(t);
    }
  }, [fait, onFait]);
  const vu = useRef(0);
  useEffect(() => {
    if (!demande || demande.n === vu.current) return;
    vu.current = demande.n;
    const t = window.setTimeout(() => {
      if (demande.quoi === "publier") { setErreur(null); setFait(null); setOuvert(true); }
      else if (demande.bareme) { setMotif(""); setErreur(null); setRetrait(demande.bareme); }
    }, 0);
    return () => window.clearTimeout(t);
  });
  return (
    <>
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
    </>
  );
}
