"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le rendez-vous d'une demande (19/10/2026, C3, lot c3_21)

   Une demande de rendez-vous : la personne qui la traite choisit le type
   (sa durée), voit les prochains créneaux libres du planning du site, et
   pose le rendez-vous. Si le créneau vient d'être pris, rien n'est posé et
   les suivants sont proposés. Le rappel au client est préparé au délai du
   type, relu comme toute réponse. Aucun agenda externe n'est écrit.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { Avis, Pastille } from "../ui";
import { chargerRdv, creneauxLibres, poserRdv, type Creneau, type Rdv, type TypeRdv } from "./portes";
import type { Client, Demande } from "./types";

const fmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const TYPES_EXEMPLE: TypeRdv[] = [
  { code: "diagnostic", libelle: "Diagnostic à domicile", duree_minutes: 60, actif: true },
  { code: "showroom", libelle: "Visite du showroom", duree_minutes: 30, actif: true },
];

/* L'exemple : demain et après-demain, 9 h, 10 h, 14 h (heure de Paris approchée par l'heure locale du navigateur). */
function creneauxExemple(duree: number): Creneau[] {
  const sortie: Creneau[] = [];
  for (const j of [1, 2]) for (const h of [9, 10, 14]) {
    const d = new Date(); d.setDate(d.getDate() + j); d.setHours(h, 0, 0, 0);
    sortie.push({ debut: d.toISOString(), fin: new Date(d.getTime() + duree * 60000).toISOString() });
  }
  return sortie;
}

export default function RendezVous({ demande, client, traite, source }: { demande: Demande; client: Client | null; traite: boolean; source: "exemple" | "reelle" }) {
  const [lu, setLu] = useState<{ types: TypeRdv[]; rdv: Rdv[] } | null>(source === "exemple" ? { types: TYPES_EXEMPLE, rdv: [] } : null);
  const [type, setType] = useState<string>("");
  const [creneaux, setCreneaux] = useState<Creneau[] | null>(null);
  const [envoi, setEnvoi] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const [tour, setTour] = useState(0);

  useEffect(() => {
    if (source === "exemple" || !client) return;
    let vivant = true;
    chargerRdv(client.client_id, demande.id).then((x) => { if (vivant) setLu(x); })
      .catch((e) => { if (vivant) { setLu({ types: [], rdv: [] }); setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); } });
    return () => { vivant = false; };
  }, [source, client, demande.id, tour]);

  const choisi = useMemo(() => lu?.types.find((t) => t.code === (type || lu.types[0]?.code)), [lu, type]);

  useEffect(() => {
    if (!choisi || !traite) return;
    if (source === "exemple") return;
    let vivant = true;
    creneauxLibres(client!.client_id, demande.entite_id, choisi.code).then((x) => { if (vivant) setCreneaux(x.creneaux ?? []); })
      .catch((e) => { if (vivant) { setCreneaux([]); setErreur(e instanceof Error ? e.message : "La base n'a pas répondu."); } });
    return () => { vivant = false; };
  }, [choisi, traite, source, client, demande.entite_id, tour]);

  const enDossier = demande.sujet === "rendez_vous" || demande.sujet_secondaire === "rendez_vous";
  if (!enDossier || !lu) return null;
  const poses = lu.rdv.filter((r) => r.statut === "confirme");
  const liste = source === "exemple" ? (choisi ? creneauxExemple(choisi.duree_minutes) : []) : creneaux;

  const poser = async (c: Creneau) => {
    if (!choisi) return;
    setEnvoi(c.debut);
    setErreur(null);
    setFait(null);
    try {
      if (source === "reelle") {
        const r = await poserRdv(client!.client_id, demande.entite_id, choisi.code, c.debut, demande.id);
        if (!r.pose) {
          setCreneaux(r.suivants ?? []);
          throw new Error(`${r.motif ?? "Ce créneau n'est plus libre."} Voici les suivants.`);
        }
        setTour((n) => n + 1);
      } else {
        setLu((x) => ({ types: x?.types ?? [], rdv: [...(x?.rdv ?? []), { id: crypto.randomUUID(), type_code: choisi.code, debut: c.debut, fin: c.fin, statut: "confirme", demande_id: demande.id }] }));
      }
      setFait(`Rendez-vous posé : ${fmt.format(new Date(c.debut))}. Le rappel au client est préparé la veille, relu avant envoi.`);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(null);
    }
  };

  return (
    <div className="esp-carte-corps" data-rendez-vous>
      <div className="esp-section-titre">Rendez-vous</div>
      {poses.length ? (
        <p style={{ marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {poses.map((r) => <Pastille key={r.id} teinte="vert">{lu.types.find((t) => t.code === r.type_code)?.libelle ?? r.type_code} · {fmt.format(new Date(r.debut))}</Pastille>)}
        </p>
      ) : null}
      {fait ? <div style={{ marginBottom: 8 }}><Avis teinte="vert">{fait}</Avis></div> : null}
      {erreur ? <div style={{ marginBottom: 8 }}><Avis teinte="rouge">{erreur}</Avis></div> : null}
      {!lu.types.length ? (
        <p className="esp-kpi-sous">Aucun type de rendez-vous n&apos;est réglé : le gérant les pose (durée, rappel) avec les heures d&apos;ouverture.</p>
      ) : traite && !poses.length ? (
        <>
          <label className="rv-libelle" style={{ maxWidth: 360 }}>Type de rendez-vous
            <select className="rv-champ" value={choisi?.code ?? ""} onChange={(e) => { setType(e.target.value); setCreneaux(null); }}>
              {lu.types.map((t) => <option key={t.code} value={t.code}>{t.libelle} ({t.duree_minutes} min)</option>)}
            </select>
          </label>
          {liste === null ? <p className="esp-kpi-sous"><Loader variant="spin" /> Créneaux libres…</p> : !liste.length ? (
            <p className="esp-kpi-sous" style={{ marginTop: 8 }}>Aucun créneau libre dans les deux mois : le planning de ce site n&apos;a pas d&apos;heures d&apos;ouverture.</p>
          ) : (
            <div className="esp-actions" style={{ marginTop: 8, flexWrap: "wrap" }}>
              {liste.map((c) => (
                <button key={c.debut} type="button" className="r-btn" disabled={envoi !== null} onClick={() => void poser(c)}>
                  {envoi === c.debut ? <Loader variant="spin" /> : null} {fmt.format(new Date(c.debut))}
                </button>
              ))}
            </div>
          )}
          {source === "exemple" ? <p className="esp-kpi-sous" style={{ marginTop: 6 }}>Exemple : créneaux fictifs, rien n&apos;est écrit.</p> : null}
        </>
      ) : null}
    </div>
  );
}
