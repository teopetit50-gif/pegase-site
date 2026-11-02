"use client";

/* VARELO — la confirmation d'un geste qui envoie ou qu'on ne défait pas (02/11/2026, consigne
   commune : « un geste irréversible ou qui envoie demande une confirmation »). L'écran d'avant
   faisait partir sans fenêtre « Faire valider », « Archiver », « Ne plus suivre », « Débrancher ». */

import { useState } from "react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";

export type Demande = { titre: string; texte: string; bouton: string; faire: () => Promise<void> | void };

export function Confirmer({ demande, onFermer }: { demande: Demande | null; onFermer: () => void }) {
  const [envoi, setEnvoi] = useState(false);
  return (
    <Dialog open={!!demande} onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{demande?.titre}</DialogTitle>
          <DialogDescription>{demande?.texte}</DialogDescription>
        </DialogHeader>
        <DialogBody />
        <DialogFooter>
          <button type="button" className="r-btn r-btn--fil" disabled={envoi} onClick={onFermer}>
            Annuler
          </button>
          <button
            type="button"
            className="r-btn r-btn--noir"
            disabled={envoi}
            onClick={async () => {
              if (!demande) return;
              setEnvoi(true);
              try {
                await demande.faire();
              } finally {
                setEnvoi(false);
                onFermer();
              }
            }}
          >
            {envoi ? <Loader variant="spin" /> : null} {demande?.bouton}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
