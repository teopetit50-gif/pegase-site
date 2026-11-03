"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI — la sélection multiple (02/11/2026)

   Les cases à cocher des listes de Linear et d'Attio sélectionnent des
   lignes ; une barre d'actions groupées apparaît en bas, comme dans Linear
   (« n selected » et ses gestes). Les gestes sont ceux qui existent déjà :
   côté navigateur (épingler, suivre, reporter, exporter en CSV) ou par les
   portes du métier ; un geste qui écrit en base passe par une fenêtre de
   confirmation (`confirmer`).
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { datesReport, useMarques, useReports } from "./lor-local";
import { IconeEtoile } from "./lor-icones";

export type ActionGroupee = { cle: string; libelle: string; faire: () => void | Promise<void>; confirmer?: { titre: string; texte: string; bouton: string } };

export function useSelection() {
  const [cles, setCles] = useState<string[]>([]);
  const basculer = (k: string) => setCles((l) => (l.includes(k) ? l.filter((x) => x !== k) : [...l, k]));
  return { cles, a: (k: string) => cles.includes(k), basculer, vider: () => setCles([]), tout: (ks: string[]) => setCles(ks) };
}

export function BarreSelection({ nombre, actions, vider }: { nombre: number; actions: ActionGroupee[]; vider: () => void }) {
  const [aConfirmer, setAConfirmer] = useState<ActionGroupee | null>(null);
  const [envoi, setEnvoi] = useState(false);
  if (!nombre) return null;
  const lancer = async (a: ActionGroupee) => {
    setEnvoi(true);
    try {
      await a.faire();
    } finally {
      setEnvoi(false);
      setAConfirmer(null);
    }
  };
  return (
    <>
      <div className="lor-sel" role="toolbar" aria-label={`${nombre} sélectionné${nombre > 1 ? "s" : ""}`}>
        <span className="lor-sel-compte">
          {nombre} sélectionné{nombre > 1 ? "s" : ""}
        </span>
        <span className="lor-sel-sep" aria-hidden="true" />
        {actions.map((a) => (
          <button key={a.cle} type="button" className="lor-sel-action" disabled={envoi} onClick={() => (a.confirmer ? setAConfirmer(a) : void lancer(a))}>
            {a.libelle}
          </button>
        ))}
        <button type="button" className="lor-sel-fermer" aria-label="Vider la sélection" title="Vider la sélection" onClick={vider}>
          ×
        </button>
      </div>
      <Dialog open={!!aConfirmer} onOpenChange={(o) => !o && !envoi && setAConfirmer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{aConfirmer?.confirmer?.titre}</DialogTitle>
            <DialogDescription>{aConfirmer?.confirmer?.texte}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => aConfirmer && void lancer(aConfirmer)}>
              {aConfirmer?.confirmer?.bouton}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ——— l'étoile « Add to favorites » → Épingler : l'objet remonte en tête de la vue d'ensemble (section « Épinglés ») ——— */
export function BoutonEtoile({ cle, nom }: { cle: string; nom: string }) {
  const favoris = useMarques("favoris");
  const oui = favoris.a(cle);
  const titre = oui ? `Désépingler ${nom}` : `Épingler ${nom} en tête de la vue d'ensemble (gardé dans ce navigateur)`;
  return (
    <button type="button" className="lor-rond" aria-pressed={oui} aria-label={titre} title={titre} onClick={() => favoris.basculer(cle)}>
      <IconeEtoile pleine={oui} />
    </button>
  );
}

/* ——— Snooze → Reporter : l'élément quitte sa liste jusqu'à la date choisie (gardé dans ce navigateur) ——— */
export function BoutonReporter({ cle, nom, className, children, apres }: { cle: string; nom: string; className?: string; children: React.ReactNode; apres?: (date: string | null) => void }) {
  const reports = useReports();
  const [ouvert, setOuvert] = useState(false);
  const [date, setDate] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => e.key === "Escape" && setOuvert(false);
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  const jusqua = reports.jusqua(cle);
  const poser = (d: string | null) => {
    reports.reporter(cle, d);
    setOuvert(false);
    apres?.(d);
  };
  const titre = jusqua ? `${nom} est reporté jusqu'au ${new Date(`${jusqua}T12:00:00`).toLocaleDateString("fr-FR")}` : `Reporter ${nom} : il quitte sa liste jusqu'à la date choisie`;
  return (
    <div className="lor-ancre-rel" ref={ref}>
      <button type="button" className={className ?? "lor-rond"} aria-label={titre} title={titre} aria-expanded={ouvert} aria-pressed={!!jusqua} onClick={() => setOuvert((o) => !o)}>
        {children}
      </button>
      {ouvert ? (
        <div className="lor-menu lor-menu-report" role="menu" aria-label="Reporter jusqu'à" style={{ right: 0, top: 34 }}>
          <div className="lor-menu-liste">
            {datesReport().map((d) => (
              <button key={d.cle} type="button" role="menuitem" className="lor-option" onClick={() => poser(d.date)}>
                <span className="lor-option-libelle">{d.libelle}</span>
                <span className="lor-option-droite">{new Date(`${d.date}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
              </button>
            ))}
            <label className="lor-option">
              <span className="lor-option-libelle">Jusqu&apos;au</span>
              <input type="date" className="lor-date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} onKeyDown={(e) => e.key === "Enter" && date && poser(date)} />
              <button type="button" className="lor-option-ok" disabled={!date} onClick={() => date && poser(date)}>
                OK
              </button>
            </label>
            {jusqua ? (
              <button type="button" role="menuitem" className="lor-option" onClick={() => poser(null)}>
                <span className="lor-option-libelle">Ne plus reporter</span>
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
