"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › vue d'ensemble : « Météo de la semaine » pour toute l'entreprise
   (02/11/2026, docs/refonte-metiers/PAGES-MANQUANTES.md ; promesse « l'ordre
   des chantiers de la semaine est reproposé »).

   Une section de ressources de l'accueil d'équipe de Linear (même brique
   que « Vos chantiers ») : une ligne par échange proposé — un passage
   extérieur menacé (pluie, rafales, gel) contre un passage intérieur de la
   même équipe, un jour sec. Un clic ouvre la confirmation, puis l'échange.

   Portes : ordreMeteo(client) → btp_ordre_meteo (b6_35) ; echangerPassages
   → btp_echanger_passages. En exemple, la règle de MeteoCarte (même équipe,
   intérieur, même durée, jours secs), appliquée à chaque chantier ouvert.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { echangesExemple, meteoExemple } from "@/components/espace/daliro/MeteoCarte";
import { echangerPassages, ordreMeteo, type EchangeMeteo } from "@/components/espace/daliro/portes";
import type { Tableau } from "@/components/espace/daliro/types";
import { useToast } from "../Toasts";
import { useDaliro } from "./donnees";
import { DalIcone } from "./DalIcone";

const jj = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function MeteoSemaine() {
  const { source, pret, client, liste, tableau, onLocal, relireChantier } = useDaliro();
  const toast = useToast();
  const reelle = source === "reelle";
  const ouverts = liste.filter((c) => c.statut === "ouvert" || c.statut === "suspendu");
  const tableaux = ouverts.map((c) => tableau(c.id)).filter((t): t is Tableau => !!t);

  /* exemple : la règle de la carte Météo, chantier par chantier */
  const exemple = useMemo(() => (reelle ? [] : tableaux.flatMap((t) => echangesExemple(t, meteoExemple(t)))), [reelle, tableaux]);
  const [reels, setReels] = useState<EchangeMeteo[] | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [tour, setTour] = useState(0);
  useEffect(() => {
    if (!reelle || !pret || !client) return;
    let vivant = true;
    ordreMeteo(client.client_id)
      .then((r) => vivant && setReels(r.propositions ?? []))
      .catch((e: unknown) => vivant && (setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."), setReels([])));
    return () => {
      vivant = false;
    };
  }, [reelle, pret, client, tour]);
  const echanges = reelle ? (reels ?? []) : exemple;

  const [choisi, setChoisi] = useState<EchangeMeteo | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const echanger = async (e: EchangeMeteo) => {
    setEnvoi(true);
    setErreur(null);
    try {
      if (reelle) {
        await echangerPassages(e.exterieur, e.interieur, "Pluie annoncée");
        const t = tableaux.find((x) => x.passages.some((p) => p.id === e.exterieur));
        if (t) await relireChantier(t.chantier.id);
        setTour((n) => n + 1);
      } else {
        const t = tableaux.find((x) => x.passages.some((p) => p.id === e.exterieur));
        if (t) {
          const x = t.passages.find((p) => p.id === e.exterieur)!;
          const i = t.passages.find((p) => p.id === e.interieur)!;
          onLocal({ ...t, passages: t.passages.map((p) => (p.id === x.id ? { ...p, debut: i.debut, fin: i.fin } : p.id === i.id ? { ...p, debut: x.debut, fin: x.fin } : p)) });
        }
      }
      toast(`C'est fait. « ${e.exterieur_tache ?? "Le passage extérieur"} » passe au ${jj(e.interieur_debut)}, « ${e.interieur_tache ?? "le passage intérieur"} » au ${jj(e.exterieur_debut)}.`, "vert");
      setChoisi(null);
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "La base a refusé l'échange.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <section className="dal-h-section" aria-labelledby="dal-h-meteo">
      <div className="dal-h-section-tete">
        <h2 id="dal-h-meteo" className="dal-h-section-titre">
          Météo de la semaine
        </h2>
      </div>
      {erreur && !choisi ? (
        <p className="dal-h-aide" role="alert">
          {erreur}
        </p>
      ) : null}
      {reelle && reels === null ? (
        <p className="dal-h-aide">Lecture des prévisions…</p>
      ) : echanges.length ? (
        <ul className="dal-h-liste">
          {echanges.map((e) => (
            <li key={`${e.exterieur}:${e.interieur}`}>
              <button type="button" className="dal-h-rangee" title={e.risque} onClick={() => setChoisi(e)}>
                <DalIcone nom="Storm" />
                <span className="dal-h-rangee-texte">
                  {e.exterieur_chantier} : « {e.exterieur_tache ?? "passage extérieur"} » du {jj(e.exterieur_debut)} contre « {e.interieur_tache ?? "passage intérieur"} » du {jj(e.interieur_debut)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="dal-h-aide">Rien à échanger cette semaine : aucun passage extérieur menacé n&apos;a de passage intérieur de la même équipe à prendre sa place un jour sec.</p>
      )}

      <Dialog open={!!choisi} onOpenChange={(o) => !o && setChoisi(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Échanger ces deux passages</DialogTitle>
            <DialogDescription>{choisi?.texte ?? choisi?.risque}</DialogDescription>
          </DialogHeader>
          <DialogBody>
            {choisi ? (
              <p className="esp-kpi-sous">
                « {choisi.exterieur_tache ?? "Le passage extérieur"} » ({choisi.exterieur_chantier}) passe au {jj(choisi.interieur_debut)} ; « {choisi.interieur_tache ?? "le passage intérieur"} » ({choisi.interieur_chantier}) prend le {jj(choisi.exterieur_debut)}.
              </p>
            ) : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => choisi && void echanger(choisi)}>
              {envoi ? <Loader variant="spin" /> : null} Échanger
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
