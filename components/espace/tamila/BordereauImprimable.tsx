"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le bordereau de communication de pièces, à l'aperçu et à l'impression
   (15/10/2026, session B4) — première part du « dossier de plaidoirie ».

   On choisit les pièces et leur ordre ; le bordereau est composé ici
   (bordereau.ts) avec les noms déchiffrés, montré dans un cadre isolé
   (srcDoc) et imprimé tel quel. Rien n'est enregistré.
   ══════════════════════════════════════════════════════════════════════ */

import { useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Printer } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { htmlBordereau, intitulePiece } from "./bordereau";
import type { EnteteFacture, Piece } from "./types";

type Props = {
  ouvert: boolean;
  onFermer: () => void;
  pieces: Piece[];
  entete: EnteteFacture;
  dossier: { reference: string; intitule: string; numero_rg: string | null; juridiction: string | null };
  pour: string[];
  contre: string[];
};

export default function BordereauImprimable({ ouvert, onFermer, pieces, entete, dossier, pour, contre }: Props) {
  const cadre = useRef<HTMLIFrameElement>(null);
  const initiales = useMemo(() => [...pieces].filter((p) => p.statut !== "rejetee").sort((a, b) => a.recue_le.localeCompare(b.recue_le)).map((p) => p.id), [pieces]);
  const [ordre, setOrdre] = useState<string[]>(initiales);
  const [ecartees, setEcartees] = useState<Set<string>>(new Set());
  const parId = useMemo(() => new Map(pieces.map((p) => [p.id, p])), [pieces]);
  // une pièce déposée depuis l'ouverture se range à la fin
  const liste = useMemo(() => [...ordre.filter((id) => parId.has(id)), ...initiales.filter((id) => !ordre.includes(id))], [ordre, initiales, parId]);

  const html = useMemo(() => htmlBordereau({
    entete, dossier, pour, contre, le: new Date().toISOString().slice(0, 10),
    pieces: liste.filter((id) => !ecartees.has(id)).map((id) => ({ nom: parId.get(id)!.nom_fichier, le: parId.get(id)!.recue_le })),
  }), [entete, dossier, pour, contre, liste, ecartees, parId]);

  const deplacer = (i: number, pas: -1 | 1) => setOrdre(() => {
    const l = [...liste];
    const j = i + pas;
    if (j < 0 || j >= l.length) return l;
    [l[i], l[j]] = [l[j], l[i]];
    return l;
  });
  const basculer = (id: string) => setEcartees((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && onFermer()}>
      <DialogContent className="tam-facture-dialogue">
        <DialogHeader>
          <DialogIcone><Printer width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Bordereau de pièces</DialogTitle>
          <DialogDescription>Composé dans votre navigateur : les noms des pièces et des parties ne quittent pas cet écran. Choisissez les pièces et leur ordre ; la numérotation suit.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <ol className="tam-bordereau-liste" aria-label="Pièces du bordereau">
              {liste.map((id, i) => (
                <li key={id} className="tam-bordereau-ligne">
                  <label className="tam-bordereau-choix">
                    <input type="checkbox" checked={!ecartees.has(id)} onChange={() => basculer(id)} />
                    <span>{intitulePiece(parId.get(id)!.nom_fichier)}</span>
                  </label>
                  <span className="esp-actions">
                    <button type="button" className="esp-lien-bouton" aria-label={`Monter ${intitulePiece(parId.get(id)!.nom_fichier)}`} disabled={i === 0} onClick={() => deplacer(i, -1)}><ArrowUp width={14} height={14} aria-hidden="true" /></button>
                    <button type="button" className="esp-lien-bouton" aria-label={`Descendre ${intitulePiece(parId.get(id)!.nom_fichier)}`} disabled={i === liste.length - 1} onClick={() => deplacer(i, 1)}><ArrowDown width={14} height={14} aria-hidden="true" /></button>
                  </span>
                </li>
              ))}
            </ol>
            <iframe ref={cadre} className="tam-facture-apercu" title="Aperçu du bordereau de pièces" srcDoc={html} sandbox="allow-modals allow-same-origin" />
          </div>
        </DialogBody>
        <DialogFooter>
          <button type="button" className="r-btn r-btn--fil" onClick={onFermer}>Fermer</button>
          <button type="button" className="r-btn r-btn--noir" onClick={() => cadre.current?.contentWindow?.print()}><Printer width={15} height={15} aria-hidden="true" /> Imprimer ou enregistrer en PDF</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
