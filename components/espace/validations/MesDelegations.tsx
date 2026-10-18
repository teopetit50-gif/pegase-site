"use client";

/* Mes délégations (05/10/2026) : celles que j'ai données (révocables d'un
   clic confirmé — UPDATE revoquee_le, la seule écriture directe que la
   policy ouvre au délégant) et celles que je tiens (lecture). Posé sous la
   file ; en exemple, la révocation est appliquée en mémoire. */

import { useState } from "react";
import { Users } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import type { Source } from "../source";
import { Avis, Pastille } from "../ui";
import { dateCourte, libelleModule } from "../format";
import type { Delegation } from "../types";
import { revoquer } from "./portes";

type Props = {
  delegations: Delegation[];
  moi: string;
  source: Source;
  nommer: (id: string | null | undefined) => string;
  onRevocationLocale: (id: string) => void;
  recharger: () => Promise<void>;
};

const enCours = (g: Delegation, t = Date.now()) => !g.revoquee_le && new Date(g.debut).getTime() <= t && (!g.fin || new Date(g.fin).getTime() >= t);

export default function MesDelegations({ delegations, moi, source, nommer, onRevocationLocale, recharger }: Props) {
  const [aRevoquer, setARevoquer] = useState<Delegation | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);

  const donnees = delegations.filter((g) => g.delegant === moi && enCours(g));
  const tenues = delegations.filter((g) => g.delegataire === moi && enCours(g));
  if (!donnees.length && !tenues.length) return null;

  const confirmer = async () => {
    if (!aRevoquer) return;
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        await revoquer(aRevoquer);
        await recharger();
      } else {
        await new Promise((r) => setTimeout(r, 300));
        onRevocationLocale(aRevoquer.id);
      }
      setFait(`La délégation à ${nommer(aRevoquer.delegataire)} est révoquée.`);
      setARevoquer(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base a refusé la révocation.");
    } finally {
      setEnvoi(false);
    }
  };

  const Ligne = ({ g, donnee }: { g: Delegation; donnee: boolean }) => (
    <li className="esp-item" style={{ cursor: "default" }}>
      <span className="esp-item-haut">
        <Pastille teinte={donnee ? "ambre" : "bleu"}>{donnee ? "Donnée" : "Reçue"}</Pastille>
        <Pastille contour>{g.module ? libelleModule(g.module) : "Tous les modules"}</Pastille>
      </span>
      {donnee ? (
        <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => { setFait(null); setARevoquer(g); }}>
          Révoquer
        </button>
      ) : (
        <span />
      )}
      <span className="esp-item-titre">
        {donnee ? <>Vous → <strong>{nommer(g.delegataire)}</strong></> : <><strong>{nommer(g.delegant)}</strong> → vous</>}
      </span>
      <span className="esp-item-bas">
        <span>{g.fin ? `jusqu'au ${dateCourte(g.fin)}` : "jusqu'à révocation"}</span>
        {g.motif ? <span>{g.motif}</span> : null}
      </span>
    </li>
  );

  return (
    <section className="esp-carte" aria-label="Mes délégations">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">Mes délégations</h2>
        <span className="esp-kpi-sous">{donnees.length} donnée{donnees.length > 1 ? "s" : ""} · {tenues.length} reçue{tenues.length > 1 ? "s" : ""}</span>
      </div>
      {fait ? <div className="esp-carte-corps"><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
      <ul className="esp-liste">
        {donnees.map((g) => <Ligne key={g.id} g={g} donnee />)}
        {tenues.map((g) => <Ligne key={g.id} g={g} donnee={false} />)}
      </ul>

      <Dialog open={!!aRevoquer} onOpenChange={(o) => !o && setARevoquer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone><Users width={18} height={18} aria-hidden="true" /></DialogIcone>
            <DialogTitle>Révoquer la délégation</DialogTitle>
            <DialogDescription>
              {aRevoquer ? `${nommer(aRevoquer.delegataire)} ne pourra plus décider en votre nom${aRevoquer.module ? ` sur ${libelleModule(aRevoquer.module)}` : ""}. Les décisions déjà prises restent valables.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogBody>{erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}</DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--rouge" disabled={envoi} onClick={confirmer}>
              {envoi ? <Loader variant="spin" /> : null} Révoquer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
