"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'encours du groupe par tiers — VARELO, vague 3 (06/10/2026, B1)

   Chaque société dépose sa balance âgée (clients ou fournisseurs, telle
   que son logiciel la sort) ; le référentiel range chaque code sous son
   client du groupe ; l'écran montre ce que chaque client doit à TOUT le
   groupe, l'échu, l'ancienneté de chaque balance, et le plafond posé par
   la direction financière. Au-dessus du plafond, la base lève une alerte
   (une seule) et la ferme d'elle-même quand l'encours repasse dessous.

   Portes : grp_deposer_encours (gérant, administrateur), grp_regler_plafond
   (gérant, administrateur, valideur de la direction financière). Lectures :
   grp_encours_courant, grp_encours_par_code, grp_encours_groupe, sous RLS.
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Gauge, Upload } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { EXEMPLE_CLIENT_ID, EXEMPLE_MOI } from "../exemples/socle";
import type { Source } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Vide } from "../ui";
import { dateCourte, montant } from "../format";
import { lireTableau } from "./csv";
import {
  ARRETES_EXEMPLE,
  GABARIT_BALANCE,
  JOURS_FRAICHEUR,
  LIGNES_BRUTES_EXEMPLE,
  PLAFONDS_EXEMPLE,
  SYNONYMES_BALANCE,
  calculerGroupe,
  chargerEncours,
  deposerEncours,
  exempleEncours,
  lireMontant,
  reglerPlafond,
  type ArreteExemple,
  type BrutEncours,
  type DonneesEncours,
  type EncoursGroupe,
  type NatureEncours,
  type Plafond,
  type ResultatEncours,
} from "./encours";
import type { CodeRef, Contexte, Nature, Objet, ResultatDepot, Societe } from "./types";

type Props = {
  source: Source;
  contexte: Contexte | null;
  client_id: string;
  nature: NatureEncours;
  societes: Societe[];
  codes: CodeRef[];
  objets: Objet[];
  /* l'objet ouvert en haut de l'écran */
  onOuvrir: (objet_id: string) => void;
  onFait: (message: string) => void;
  /* exemple : inscrire au référentiel montré les codes inconnus d'une balance */
  inscrireExemple: (entite_id: string, nature: Nature, lignes: Record<string, string>[], source: string | null) => Promise<ResultatDepot>;
  /* base réelle : relire le référentiel après un dépôt (des codes ont pu y entrer) */
  relireReferentiel: () => Promise<void>;
};

const PAR_PAGE = 12;
const COLONNES_MONTANT = ["non_echu", "echu_30", "echu_60", "echu_90", "echu_plus", "echu", "total"];

export default function Encours({ source, contexte, client_id, nature, societes, codes, objets, onOuvrir, onFait, inscrireExemple, relireReferentiel }: Props) {
  /* ——— exemple, en mémoire ——— */
  const [brutes, setBrutes] = useState<BrutEncours[]>(LIGNES_BRUTES_EXEMPLE);
  const [arretes, setArretes] = useState<ArreteExemple[]>(ARRETES_EXEMPLE);
  const [plafondsLocaux, setPlafondsLocaux] = useState<Plafond[]>(PLAFONDS_EXEMPLE);
  /* ——— base réelle ——— */
  const [reel, setReel] = useState<{ donnees: DonneesEncours; groupe: EncoursGroupe[] } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      setReel(await chargerEncours(client_id));
      setErreur(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel({ donnees: { courants: [], lignes: [], plafonds: [] }, groupe: [] });
    }
  }, [client_id]);
  useEffect(() => {
    if (source !== "reelle" || !contexte) return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, contexte, charger]);
  useTempsReel(["grp_ref_codes", "grp_ref_objets"], source === "reelle" && !!contexte, charger);

  const exemple = useMemo(() => {
    const d = exempleEncours(codes, objets, plafondsLocaux, brutes, arretes);
    return { donnees: d, groupe: calculerGroupe(d.lignes, d.plafonds) };
  }, [codes, objets, plafondsLocaux, brutes, arretes]);
  const vue = source === "exemple" ? exemple : reel;

  const groupe = useMemo(
    () =>
      (vue?.groupe ?? [])
        .filter((g) => g.nature === nature)
        .sort((a, b) => Number(b.depasse) - Number(a.depasse) || Number(a.intragroupe) - Number(b.intragroupe) || b.total - a.total),
    [vue, nature],
  );
  const courants = useMemo(() => (vue?.donnees.courants ?? []).filter((c) => c.nature === nature), [vue, nature]);
  const nonRanges = useMemo(() => (vue?.donnees.lignes ?? []).filter((l) => l.nature === nature && !l.objet_id), [vue, nature]);
  const totaux = useMemo(() => {
    const hors = groupe.filter((g) => !g.intragroupe);
    return {
      total: hors.reduce((s, g) => s + g.total, 0),
      echu: hors.reduce((s, g) => s + g.echu, 0),
      plus90: hors.reduce((s, g) => s + g.echu_plus_90, 0),
      intragroupe: groupe.filter((g) => g.intragroupe).reduce((s, g) => s + g.total, 0),
      depasses: hors.filter((g) => g.depasse).length,
    };
  }, [groupe]);

  const [tout, setTout] = useState(false);
  const visibles = tout ? groupe : groupe.slice(0, PAR_PAGE);

  const peutDeposer = !!contexte && (contexte.role === "gerant" || contexte.role === "admin");
  const peutPlafond = peutDeposer || (contexte?.role === "valideur" && contexte.equipes.includes("direction_financiere"));
  const libelle = nature === "client" ? { des: "clients", un: "client", le: "Client du groupe" } : { des: "fournisseurs", un: "fournisseur", le: "Fournisseur du groupe" };

  /* ——— le plafond ——— */
  const [plafond, setPlafond] = useState<EncoursGroupe | null>(null);
  const reglerIci = useCallback(
    async (g: EncoursGroupe, valeur: number | null, echu: number | null, motif: string) => {
      if (source === "reelle") {
        const r = await reglerPlafond(g.objet_id, valeur, echu, motif.trim() || null);
        await charger();
        return r.depasse;
      }
      await new Promise((x) => setTimeout(x, 300));
      const quand = new Date().toISOString();
      setPlafondsLocaux((prev) => {
        const autres = prev.filter((p) => p.objet_id !== g.objet_id);
        const avant = prev.find((p) => p.objet_id === g.objet_id);
        if (valeur === null) return avant ? [...autres, { ...avant, actif: false, motif: motif.trim() || null, regle_par: EXEMPLE_MOI, regle_le: quand }] : prev;
        return [...autres, { client_id: EXEMPLE_CLIENT_ID, objet_id: g.objet_id, nature: "client", plafond: valeur, plafond_echu: echu, actif: true, motif: motif.trim() || null, regle_par: EXEMPLE_MOI, regle_le: quand }];
      });
      return valeur !== null && (g.total > valeur || (echu !== null && g.echu > echu));
    },
    [source, charger],
  );

  /* ——— le dépôt d'une balance âgée ——— */
  const [depot, setDepot] = useState(false);
  const deposerIci = useCallback(
    async (entite_id: string, nat: NatureEncours, arrete_le: string, lignes: Record<string, string>[], src: string | null): Promise<ResultatEncours> => {
      if (source === "reelle") {
        const r = await deposerEncours(client_id, entite_id, nat, arrete_le, lignes, src);
        await Promise.all([charger(), relireReferentiel()]);
        return r;
      }
      await new Promise((x) => setTimeout(x, 400));
      /* le même contrôle que la porte, ligne par ligne */
      const rejetes: ResultatEncours["rejetes"] = [];
      const dernier = new Map<string, number>();
      lignes.forEach((l, i) => {
        const c = (l.code ?? "").trim();
        if (c) dernier.set(c, i);
      });
      const gardees: BrutEncours[] = [];
      const inconnus: Record<string, string>[] = [];
      let sansNom = 0;
      lignes.forEach((l, i) => {
        const code = (l.code ?? "").trim();
        const m = Object.fromEntries(COLONNES_MONTANT.map((k) => [k, lireMontant(l[k])])) as Record<string, number | null>;
        const illisible = COLONNES_MONTANT.find((k) => Number.isNaN(m[k] as number));
        let motif: string | null = null;
        if (!code) motif = "code local manquant";
        else if (dernier.get(code) !== i) motif = "doublon dans le lot";
        else if (COLONNES_MONTANT.every((k) => m[k] === null)) motif = "aucun montant";
        else if (illisible) motif = `montant illisible (${illisible})`;
        const tranches = [m.echu_30, m.echu_60, m.echu_90, m.echu_plus].some((x) => x !== null);
        const e30 = m.echu_30 ?? 0, e60 = m.echu_60 ?? 0, e90 = m.echu_90 ?? 0, eplus = m.echu_plus ?? 0;
        let eautre = m.echu === null ? 0 : m.echu - (e30 + e60 + e90 + eplus);
        if (tranches && Math.abs(eautre) < 0.01) eautre = 0;
        let non = m.non_echu;
        if (!motif && tranches && eautre < 0) motif = "échu inférieur à la somme de ses tranches";
        else if (!motif && non === null) non = m.total === null ? 0 : m.total - (e30 + e60 + e90 + eplus + eautre);
        else if (!motif && m.total !== null && Math.abs(m.total - ((non ?? 0) + e30 + e60 + e90 + eplus + eautre)) >= 0.01) motif = "total différent de la somme de ses tranches";
        if (motif) {
          rejetes.push({ ligne: i + 1, code: code || null, motif });
          return;
        }
        gardees.push({ id: `${entite_id}-${nat}-${code}-${Date.now()}`, nature: nat, entite: entite_id, code, non_echu: non ?? 0, e30, e60, e90, eplus, eautre });
        if (!codes.some((k) => k.entite_id === entite_id && k.nature === nat && k.code_local === code)) {
          if ((l.nom ?? "").trim()) inconnus.push(l);
          else sansNom++;
        }
      });
      const age = Math.max(0, Math.round((Date.now() - new Date(`${arrete_le}T12:00:00`).getTime()) / 86400000));
      const courant = arretes.find((a) => a.entite === entite_id && a.nature === nat);
      /* le dépôt courant est le dernier par date d'arrêté : un arrêté plus ancien ne le remplace pas */
      if (!courant || age <= courant.age) {
        setArretes((prev) => [...prev.filter((a) => !(a.entite === entite_id && a.nature === nat)), { entite: entite_id, nature: nat, age, source: src ?? "dépôt" }]);
        setBrutes((prev) => [...prev.filter((b) => !(b.entite === entite_id && b.nature === nat)), ...gardees]);
      }
      let inscrits = 0;
      if (inconnus.length) inscrits = (await inscrireExemple(entite_id, nat, inconnus, src)).nouveaux;
      const total = gardees.reduce((s, b) => s + b.non_echu + (b.e30 ?? 0) + (b.e60 ?? 0) + (b.e90 ?? 0) + (b.eplus ?? 0) + (b.eautre ?? 0), 0);
      const echu = gardees.reduce((s, b) => s + (b.e30 ?? 0) + (b.e60 ?? 0) + (b.e90 ?? 0) + (b.eplus ?? 0) + (b.eautre ?? 0), 0);
      return { depot: "exemple", arrete_le, lus: lignes.length, retenus: gardees.length, total, echu, rejetes, codes_inscrits: inscrits, codes_inconnus_sans_nom: sansNom };
    },
    [source, client_id, charger, relireReferentiel, codes, arretes, inscrireExemple],
  );

  return (
    <section id="vrl-encours" className="esp-carte" aria-label={`Encours du groupe, ${libelle.des}`} style={{ marginTop: 16 }}>
      <div className="esp-carte-tete">
        <div>
          <h2 className="esp-carte-titre">Encours du groupe — {libelle.des}</h2>
          <p className="esp-kpi-sous" style={{ margin: "2px 0 0" }}>
            {nature === "client"
              ? "Ce que chaque client doit à toutes les sociétés du groupe, d'après la dernière balance âgée de chacune, et son plafond."
              : "Ce que le groupe doit à chaque fournisseur, toutes sociétés confondues, d'après la dernière balance âgée de chacune."}
          </p>
        </div>
        {peutDeposer ? (
          <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setDepot(true)}><Upload width={14} height={14} aria-hidden="true" /> Déposer une balance âgée</button>
        ) : null}
      </div>

      {erreur ? <Avis teinte="rouge" role="alert"><strong>L&apos;encours n&apos;a pas pu être lu.</strong> {erreur}</Avis> : null}

      {source === "reelle" && !reel ? (
        <Chargement texte="Lecture des balances âgées…" />
      ) : !courants.length ? (
        <Vide titre="Aucune balance âgée déposée">
          {peutDeposer
            ? `Déposez la balance âgée ${nature === "client" ? "clients" : "fournisseurs"} d'une société, telle que son logiciel la sort : les codes connus du référentiel sont rassemblés par ${libelle.un} du groupe.`
            : "Le gérant ou l'administrateur dépose la balance âgée de chaque société."}
        </Vide>
      ) : (
        <>
          <dl className="esp-def esp-def--trois" style={{ marginTop: 10 }}>
            <div><dt>Encours du groupe</dt><dd className="esp-def-fort">{montant(totaux.total)}</dd></div>
            <div><dt>Dont échu</dt><dd className="esp-def-fort">{montant(totaux.echu)}</dd></div>
            <div><dt>Échu à plus de 90 jours</dt><dd>{montant(totaux.plus90)}</dd></div>
            {nature === "client" ? (
              <div><dt>Au-dessus du plafond</dt><dd className="esp-def-fort">{totaux.depasses ? <Pastille teinte="rouge">{totaux.depasses} client{totaux.depasses > 1 ? "s" : ""}</Pastille> : "aucun client"}</dd></div>
            ) : null}
            <div><dt>Intragroupe (à part)</dt><dd>{montant(totaux.intragroupe)}</dd></div>
          </dl>

          <h3 className="esp-section-titre" style={{ marginTop: 14 }}>La balance de chaque société</h3>
          <ul className="vrl-balances" aria-label="Dernière balance âgée de chaque société">
            {courants.map((c) => (
              <li key={c.depot_id}>
                <span className="vrl-balance-nom">{c.societe}</span>
                <span className="vrl-paire-sous">arrêtée au {dateCourte(c.arrete_le)} · {c.lignes} ligne{c.lignes > 1 ? "s" : ""} · {montant(c.total)}{c.source ? ` · ${c.source}` : ""}</span>
                {c.age_jours > JOURS_FRAICHEUR ? <Pastille teinte="ambre">ancienne de {c.age_jours} jours</Pastille> : <Pastille teinte="vert" contour>à jour</Pastille>}
              </li>
            ))}
          </ul>
          {societes.length > courants.length ? (
            <p className="esp-kpi-sous" style={{ marginTop: 6 }}>
              Sans balance {nature === "client" ? "clients" : "fournisseurs"} : {societes.filter((s) => !courants.some((c) => c.entite_id === s.entite_id)).map((s) => s.nom).join(", ")}.
            </p>
          ) : null}

          <h3 className="esp-section-titre" style={{ marginTop: 14 }}>Par {libelle.un} du groupe</h3>
          {groupe.length ? (
            <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label={`Encours par ${libelle.un} du groupe (tableau qui défile)`}>
              <table className="esp-tableau">
                <thead>
                  <tr>
                    <th>{libelle.le}</th>
                    <th className="esp-num">Sociétés</th>
                    <th className="esp-num">Encours</th>
                    <th className="esp-num">Échu</th>
                    <th className="esp-num">&gt; 90 j</th>
                    {nature === "client" ? <th className="esp-num">Plafond</th> : null}
                    <th>État</th>
                    {nature === "client" && peutPlafond ? <th><span className="vrl-masque">Action</span></th> : null}
                  </tr>
                </thead>
                <tbody>
                  {visibles.map((g) => (
                    <tr key={g.objet_id}>
                      <td>
                        <button type="button" className="esp-lien-bouton" onClick={() => onOuvrir(g.objet_id)}>
                          <span className="esp-mono">{g.code_groupe}</span> {g.nom_groupe}
                        </button>
                      </td>
                      <td className="esp-num">{g.societes}</td>
                      <td className="esp-num">{montant(g.total)}</td>
                      <td className="esp-num">{montant(g.echu)}</td>
                      <td className="esp-num">{g.echu_plus_90 ? montant(g.echu_plus_90) : "—"}</td>
                      {nature === "client" ? (
                        <td className="esp-num">{g.intragroupe ? "—" : g.plafond === null ? "aucun" : <>{montant(g.plafond)}{g.plafond_echu !== null ? <span className="vrl-paire-sous">échu ≤ {montant(g.plafond_echu)}</span> : null}</>}</td>
                      ) : null}
                      <td>
                        <span className="esp-item-haut">
                          {g.depasse ? <Pastille teinte="rouge">Au-dessus du plafond</Pastille> : null}
                          {g.intragroupe ? <Pastille teinte="noir">Intragroupe</Pastille> : null}
                          {g.provisoire ? <Pastille teinte="ambre" title="Un des codes n'est que proposé sur cet objet : le référent ne l'a pas encore confirmé.">Provisoire</Pastille> : null}
                          {!g.depasse && !g.intragroupe && !g.provisoire ? <Pastille teinte="gris" contour>{g.societes > 1 ? `${g.societes} sociétés` : "une société"}</Pastille> : null}
                        </span>
                      </td>
                      {nature === "client" && peutPlafond ? (
                        <td>
                          {g.intragroupe ? null : (
                            <button type="button" className="r-btn r-btn--fil r-btn--petit" onClick={() => setPlafond(g)} aria-label={`Régler le plafond de ${g.nom_groupe}`}>Plafond</button>
                          )}
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Vide titre={`Aucun ${libelle.un} rangé`}>Les codes des balances déposées ne sont pas encore rangés sous un objet du groupe : lancez un passage.</Vide>
          )}
          {groupe.length > PAR_PAGE ? (
            <button type="button" className="esp-lien-bouton" style={{ marginTop: 8 }} onClick={() => setTout((t) => !t)}>{tout ? "Montrer les premiers seulement" : `Montrer les ${groupe.length}`}</button>
          ) : null}
          {nonRanges.length ? (
            <p className="esp-kpi-sous" style={{ marginTop: 8 }}>
              {nonRanges.length} ligne{nonRanges.length > 1 ? "s" : ""} de balance ({montant(nonRanges.reduce((s, l) => s + l.total, 0))}) sous un code pas encore rangé dans le référentiel ({nonRanges.slice(0, 4).map((l) => l.code_local).join(", ")}{nonRanges.length > 4 ? "…" : ""}) : le prochain passage les range.
            </p>
          ) : null}
        </>
      )}

      {plafond ? <DialoguePlafond g={plafond} onFermer={() => setPlafond(null)} regler={reglerIci} onFait={onFait} /> : null}
      <DialogueBalance ouvert={depot} onFermer={() => setDepot(false)} societes={societes} natureDefaut={nature} deposer={deposerIci} onFait={onFait} />
    </section>
  );
}

/* ——— régler le plafond d'un client du groupe ——— */
function DialoguePlafond({ g, onFermer, regler, onFait }: { g: EncoursGroupe; onFermer: () => void; regler: (g: EncoursGroupe, plafond: number | null, echu: number | null, motif: string) => Promise<boolean>; onFait: (m: string) => void }) {
  const [valeur, setValeur] = useState(g.plafond !== null ? String(g.plafond).replace(".", ",") : "");
  const [echu, setEchu] = useState(g.plafond_echu !== null ? String(g.plafond_echu).replace(".", ",") : "");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const v = lireMontant(valeur);
  const e = lireMontant(echu);
  const valide = v !== null && !Number.isNaN(v) && v > 0 && (e === null || (!Number.isNaN(e) && e >= 0));

  const envoyer = async (retirer: boolean) => {
    setEnvoi(true);
    setErreur(null);
    try {
      const depasse = await regler(g, retirer ? null : v, retirer ? null : e, motif);
      onFait(retirer ? `Le plafond de ${g.nom_groupe} est retiré.` : `Plafond de ${g.nom_groupe} : ${montant(v)}${e !== null ? `, échu ${montant(e)} au plus` : ""}. ${depasse ? "L'encours du groupe le dépasse : une alerte est levée." : "L'encours du groupe est en dessous."}`);
      onFermer();
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Le plafond n'a pas été réglé.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !envoi && onFermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Gauge width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Plafond d&apos;encours — {g.nom_groupe}</DialogTitle>
          <DialogDescription>Un plafond pour tout le groupe : la somme de ce que ce client doit à chaque société. Au-dessus, une alerte est levée chez vous, une seule, et se ferme d&apos;elle-même quand l&apos;encours redescend. Chaque réglage est inscrit au journal.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="esp-form">
            <p className="esp-kpi-sous">Encours du groupe aujourd&apos;hui : <strong>{montant(g.total)}</strong>, dont {montant(g.echu)} échus, chez {g.societes} société{g.societes > 1 ? "s" : ""}.</p>
            <div className="esp-form-ligne">
              <label className="rv-libelle">Plafond total <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" inputMode="decimal" value={valeur} placeholder="100 000" onChange={(x) => setValeur(x.target.value)} />
              </label>
              <label className="rv-libelle">Plafond de l&apos;échu
                <input className="rv-champ" inputMode="decimal" value={echu} placeholder="facultatif" onChange={(x) => setEchu(x.target.value)} />
              </label>
            </div>
            <label className="rv-libelle">Motif
              <input className="rv-champ" value={motif} maxLength={500} placeholder="couverture de l'assurance-crédit, garantie reçue…" onChange={(x) => setMotif(x.target.value)} />
            </label>
            {valeur && !valide ? <Avis teinte="ambre">Un plafond est un montant positif, par exemple « 100 000 » ou « 75 000,50 ».</Avis> : null}
            {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
          </div>
        </DialogBody>
        <DialogFooter>
          {g.plafond !== null ? <button type="button" className="r-btn r-btn--fil" disabled={envoi} onClick={() => envoyer(true)}>Retirer le plafond</button> : null}
          <button type="button" className="r-btn r-btn--noir" disabled={!valide || envoi} onClick={() => envoyer(false)}>{envoi ? <Loader variant="spin" /> : null} Enregistrer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ——— déposer la balance âgée d'une société ——— */
function DialogueBalance({ ouvert, onFermer, societes, natureDefaut, deposer, onFait }: {
  ouvert: boolean;
  onFermer: () => void;
  societes: Societe[];
  natureDefaut: NatureEncours;
  deposer: (entite_id: string, nature: NatureEncours, arrete_le: string, lignes: Record<string, string>[], source: string | null) => Promise<ResultatEncours>;
  onFait: (m: string) => void;
}) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const [societe, setSociete] = useState("");
  const [nature, setNature] = useState<NatureEncours | null>(null);
  const [arrete, setArrete] = useState(aujourdhui);
  const [source, setSource] = useState("");
  const [texte, setTexte] = useState("");
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [resultat, setResultat] = useState<ResultatEncours | null>(null);

  const entite = societe || societes[0]?.entite_id || "";
  const nat = nature ?? natureDefaut;
  const lecture = useMemo(() => (texte.trim() ? lireTableau(texte, SYNONYMES_BALANCE, ["code"]) : null), [texte]);
  const sansMontant = !!lecture && !lecture.reconnues.some((r) => COLONNES_MONTANT.includes(r.cle));
  const pret = !!entite && !!arrete && arrete <= aujourdhui && !!lecture && lecture.lignes.length > 0 && lecture.manque.length === 0 && !sansMontant && lecture.lignes.length <= 20000;

  const lireFichier = async (f: File | null) => {
    if (!f) return;
    setNomFichier(f.name);
    setTexte(await f.text());
    if (!source) setSource(f.name);
  };
  const fermer = () => {
    if (envoi) return;
    setResultat(null);
    setErreur(null);
    setTexte("");
    setNomFichier(null);
    setNature(null);
    onFermer();
  };
  const envoyer = async () => {
    if (!pret || !lecture) return;
    setEnvoi(true);
    setErreur(null);
    try {
      const r = await deposer(entite, nat, arrete, lecture.lignes, source.trim() || nomFichier || null);
      setResultat(r);
      onFait(`Balance âgée déposée : ${r.retenus} ligne${r.retenus > 1 ? "s" : ""} retenue${r.retenus > 1 ? "s" : ""} pour ${montant(r.total)}, ${r.rejetes.length} rejetée${r.rejetes.length > 1 ? "s" : ""}${r.codes_inscrits ? `, ${r.codes_inscrits} code${r.codes_inscrits > 1 ? "s" : ""} inscrit${r.codes_inscrits > 1 ? "s" : ""} au référentiel` : ""}.`);
    } catch (x) {
      setErreur(x instanceof Error ? x.message : "Le dépôt a échoué.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <Dialog open={ouvert} onOpenChange={(o) => !o && fermer()}>
      <DialogContent>
        <DialogHeader>
          <DialogIcone><Upload width={18} height={18} aria-hidden="true" /></DialogIcone>
          <DialogTitle>Déposer une balance âgée</DialogTitle>
          <DialogDescription>La balance âgée d&apos;une société, telle que son logiciel la sort : un code tiers par ligne, avec le non échu et l&apos;échu par tranche (ou le total et l&apos;échu). Elle remplace, pour cette société, la balance d&apos;un arrêté plus ancien. Les codes que le référentiel ne connaît pas y sont inscrits.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          {resultat ? (
            <div className="esp-form">
              <Avis teinte="vert" role="status"><strong>Balance déposée, arrêtée au {dateCourte(resultat.arrete_le)}.</strong> L&apos;encours du groupe est recalculé et les plafonds revérifiés.</Avis>
              <dl className="esp-def esp-def--trois">
                <div><dt>Lignes lues</dt><dd className="esp-def-fort">{resultat.lus}</dd></div>
                <div><dt>Retenues</dt><dd className="esp-def-fort">{resultat.retenus}</dd></div>
                <div><dt>Rejetées</dt><dd>{resultat.rejetes.length}</dd></div>
                <div><dt>Encours déposé</dt><dd className="esp-def-fort">{montant(resultat.total)}</dd></div>
                <div><dt>Dont échu</dt><dd>{montant(resultat.echu)}</dd></div>
                <div><dt>Codes inscrits au référentiel</dt><dd>{resultat.codes_inscrits}{resultat.codes_inconnus_sans_nom ? <span className="vrl-paire-sous">{resultat.codes_inconnus_sans_nom} code{resultat.codes_inconnus_sans_nom > 1 ? "s" : ""} inconnu{resultat.codes_inconnus_sans_nom > 1 ? "s" : ""} sans nom, gardé{resultat.codes_inconnus_sans_nom > 1 ? "s" : ""} hors référentiel</span> : null}</dd></div>
              </dl>
              {resultat.rejetes.length ? (
                <div className="esp-tableau-cadre" tabIndex={0} role="region" aria-label="Lignes de balance rejetées (tableau qui défile)">
                  <table className="esp-tableau">
                    <thead><tr><th className="esp-num">Ligne</th><th>Code</th><th>Motif</th></tr></thead>
                    <tbody>
                      {resultat.rejetes.slice(0, 50).map((r, i) => (
                        <tr key={i}><td className="esp-num">{r.ligne}</td><td className="esp-mono">{r.code ?? "—"}</td><td>{r.motif}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="esp-form">
              <div className="esp-form-ligne">
                <label className="rv-libelle">Société <span className="esp-obligatoire">(obligatoire)</span>
                  <select className="rv-champ" value={entite} onChange={(x) => setSociete(x.target.value)}>
                    {societes.map((s) => <option key={s.entite_id} value={s.entite_id}>{s.nom}</option>)}
                  </select>
                </label>
                <label className="rv-libelle">Balance
                  <select className="rv-champ" value={nat} onChange={(x) => setNature(x.target.value as NatureEncours)}>
                    <option value="client">Clients</option>
                    <option value="fournisseur">Fournisseurs</option>
                  </select>
                </label>
              </div>
              <div className="esp-form-ligne">
                <label className="rv-libelle">Arrêtée au <span className="esp-obligatoire">(obligatoire)</span>
                  <input type="date" className="rv-champ" value={arrete} max={aujourdhui} onChange={(x) => setArrete(x.target.value)} />
                </label>
                <label className="rv-libelle">Source
                  <input className="rv-champ" value={source} maxLength={200} placeholder="balance âgée Sage au 30/09…" onChange={(x) => setSource(x.target.value)} />
                </label>
              </div>
              <div>
                <span className="rv-libelle">Le fichier <span className="esp-obligatoire">(obligatoire)</span></span>
                <div className="esp-fichier">
                  <input id="vrl-balance-fichier" type="file" className="esp-fichier-natif" accept=".csv,.txt,.tsv" onChange={(x) => void lireFichier(x.target.files?.[0] ?? null)} />
                  <label htmlFor="vrl-balance-fichier" className="r-btn r-btn--fil r-btn--petit" style={{ cursor: "pointer" }}>{nomFichier ? "Changer de fichier" : "Choisir un fichier"}</label>
                  <span className="esp-kpi-sous">{nomFichier ?? "CSV (point-virgule, virgule ou tabulation), première ligne : les en-têtes."}</span>
                </div>
                <textarea className="rv-champ" style={{ marginTop: 8, fontFamily: "ui-monospace, Menlo, monospace", fontSize: 12 }} value={texte} placeholder={"…ou collez les lignes ici\n" + GABARIT_BALANCE} onChange={(x) => { setTexte(x.target.value); setNomFichier(null); }} aria-label="Lignes de la balance âgée" />
              </div>
              {lecture ? (
                <div className="esp-item-haut">
                  <Pastille teinte={lecture.lignes.length ? "vert" : "rouge"}>{lecture.lignes.length} ligne{lecture.lignes.length > 1 ? "s" : ""}</Pastille>
                  {lecture.reconnues.map((r) => <Pastille key={r.cle} teinte="gris" contour title={`colonne « ${r.entete} »`}>{r.cle}</Pastille>)}
                  {lecture.ignorees.length ? <Pastille teinte="ambre" title={lecture.ignorees.join(", ")}>{lecture.ignorees.length} colonne{lecture.ignorees.length > 1 ? "s" : ""} ignorée{lecture.ignorees.length > 1 ? "s" : ""}</Pastille> : null}
                  {lecture.manque.length ? <Pastille teinte="rouge">il manque : {lecture.manque.join(", ")}</Pastille> : null}
                  {sansMontant ? <Pastille teinte="rouge">aucune colonne de montant reconnue</Pastille> : null}
                  {lecture.lignes.length > 20000 ? <Pastille teinte="rouge">20 000 lignes au plus par dépôt</Pastille> : null}
                </div>
              ) : null}
              {arrete > aujourdhui ? <Avis teinte="ambre">Une balance âgée ne s&apos;arrête pas dans le futur.</Avis> : null}
              {erreur ? <Avis teinte="rouge" role="alert">{erreur}</Avis> : null}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          {resultat ? (
            <button type="button" className="r-btn r-btn--noir" onClick={fermer}>Fermer</button>
          ) : (
            <button type="button" className="r-btn r-btn--noir" disabled={!pret || envoi} onClick={envoyer}>{envoi ? <Loader variant="spin" /> : null} Déposer</button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
