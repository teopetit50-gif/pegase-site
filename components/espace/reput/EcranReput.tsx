"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace/reput — les demandes clients et leurs réponses (06/10/2026, C3)

   Trois onglets :
   · Demandes : en haut, quatre compteurs qui filtrent (à valider, à
     traiter vous-même, répondues, reçues sur 7 jours) ; à gauche la liste,
     à droite la demande ouverte — le message reçu, la réponse préparée
     dans la minute avec ses sources dans la base, et Valider / Corriger /
     Refuser (portes reput_decider et reput_corriger).
   · Base de connaissances : les fiches (BaseConnaissances).
   · Sujets autorisés : l'accord permanent, sujet par sujet (SujetsAutorises).

   Deux sources : l'exemple (exemples.ts, modifié en mémoire) ou la base
   réelle (portes.ts, sous RLS).
   ══════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader } from "@/components/ui/loader";
import { useSource } from "../source";
import { useTempsReel } from "../tempsReel";
import { Avis, Chargement, Pastille, Ruban, Vide, type Teinte } from "../ui";
import { dateHeure, relatif } from "../format";
import BaseConnaissances from "./BaseConnaissances";
import ReglagesAvis from "./ReglagesAvis";
import SujetsAutorises from "./SujetsAutorises";
import { mondeExemple } from "./exemples";
import { chargerMonde, corriger, decider, monClient } from "./portes";
import type { Client, Demande, Monde, Reponse, StatutDemande } from "./types";

type Onglet = "demandes" | "base" | "sujets" | "reglages";
type Famille = "a_valider" | "a_traiter" | "repondues" | "recues";

export const STATUTS: Record<StatutDemande, { libelle: string; teinte: Teinte }> = {
  a_preparer: { libelle: "En préparation", teinte: "gris" },
  a_valider: { libelle: "Réponse à valider", teinte: "ambre" },
  a_traiter: { libelle: "À traiter vous-même", teinte: "rouge" },
  validee: { libelle: "Validée, en partance", teinte: "bleu" },
  envoyee: { libelle: "Répondue", teinte: "vert" },
  refusee: { libelle: "Réponse refusée", teinte: "gris" },
  bloquee: { libelle: "Envoi bloqué", teinte: "rouge" },
  ignoree: { libelle: "Ignorée", teinte: "gris" },
};

const CANAUX: Record<string, string> = { email: "Courriel", whatsapp: "WhatsApp", sms: "SMS", formulaire: "Formulaire du site" };

const FAMILLES: { cle: Famille; libelle: string; sous: string; teinte: Teinte }[] = [
  { cle: "a_valider", libelle: "À valider", sous: "réponses prêtes", teinte: "ambre" },
  { cle: "a_traiter", libelle: "À traiter", sous: "par vous-même", teinte: "rouge" },
  { cle: "repondues", libelle: "Répondues", sous: "sur 7 jours", teinte: "vert" },
  { cle: "recues", libelle: "Reçues", sous: "sur 7 jours", teinte: "gris" },
];

/* les premiers mots du message, sur une ligne */
function extrait(t: string | null | undefined): string {
  const x = (t ?? "").replace(/\s+/g, " ").trim();
  return x.length > 90 ? `${x.slice(0, 89)}…` : x;
}

function famille(d: Demande, depuis: number): Famille[] {
  const f: Famille[] = [];
  if (d.statut === "a_valider") f.push("a_valider");
  if (d.statut === "a_traiter" || d.statut === "bloquee") f.push("a_traiter");
  if (new Date(d.recu_le).getTime() >= depuis) {
    f.push("recues");
    if (d.statut === "envoyee") f.push("repondues");
  }
  return f;
}

export default function EcranReput() {
  const { source } = useSource();
  const [onglet, setOnglet] = useState<Onglet>("demandes");
  const [local, setLocal] = useState<Monde>(() => mondeExemple());
  const [reel, setReel] = useState<{ monde: Monde; client: Client } | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Famille | null>(null);
  const [choix, setChoix] = useState<string | null>(null);
  const [depuis] = useState(() => Date.now() - 7 * 86_400_000);

  const charger = useCallback(async () => {
    await Promise.resolve();
    setErreur(null);
    try {
      const client = await monClient();
      if (!client) throw new Error("Aucun compte rattaché à cette session.");
      setReel({ monde: await chargerMonde(client), client });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    }
  }, []);

  useEffect(() => {
    if (source !== "reelle") return;
    const t = window.setTimeout(() => void charger(), 0);
    return () => window.clearTimeout(t);
  }, [source, charger]);
  useTempsReel(["reput_demandes", "reput_reponses", "reput_connaissances"], source === "reelle", () => void charger());

  const monde: Monde | null = source === "exemple" ? local : (reel?.monde ?? null);
  const client = source === "reelle" ? (reel?.client ?? null) : null;
  const role = source === "exemple" ? "valideur" : (client?.role ?? "lecteur");
  const decideur = role === "gerant" || role === "admin" || role === "valideur";

  const compteurs = useMemo(() => {
    const c: Record<Famille, number> = { a_valider: 0, a_traiter: 0, repondues: 0, recues: 0 };
    for (const d of monde?.demandes ?? []) for (const f of famille(d, depuis)) c[f]++;
    return c;
  }, [monde, depuis]);

  const visibles = useMemo(() => {
    const ordre: Partial<Record<StatutDemande, number>> = { a_traiter: 0, bloquee: 0, a_valider: 1, a_preparer: 2, validee: 3 };
    return [...(monde?.demandes ?? [])]
      .filter((d) => !filtre || famille(d, depuis).includes(filtre))
      .sort((a, b) => Number(b.urgence) - Number(a.urgence) || (ordre[a.statut] ?? 9) - (ordre[b.statut] ?? 9) || b.recu_le.localeCompare(a.recu_le));
  }, [monde, filtre, depuis]);

  const choisi = choix && visibles.some((d) => d.id === choix) ? choix : (visibles[0]?.id ?? null);
  const demande = visibles.find((d) => d.id === choisi) ?? null;

  /* ——— les actions de l'exemple, en mémoire ——— */
  const modifierLocal = useCallback((f: (m: Monde) => Monde) => setLocal((m) => f(m)), []);

  return (
    <>
      <div className="esp-tete" data-arrivee="">
        <div>
          <h1 className="esp-titre">Demandes clients</h1>
          <p className="esp-sous">
            Chaque message reçu par courriel, WhatsApp ou le formulaire de votre site reçoit dans la minute une réponse préparée à partir de votre base de connaissances. Rien ne part sans que vous l&apos;ayez vu, sauf sur les sujets que vous avez autorisés d&apos;avance.
          </p>
        </div>
        <div className="esp-item-haut">
          <Ruban source={source} />
        </div>
      </div>

      {erreur ? (
        <div style={{ marginBottom: 14 }}>
          <Avis teinte="rouge" role="alert"><strong>La base réelle n&apos;a pas répondu.</strong> {erreur}</Avis>
        </div>
      ) : null}

      <div className="esp-onglets" role="tablist" aria-label="REPUT" style={{ marginBottom: 16 }}>
        {([["demandes", "Demandes"], ["base", "Base de connaissances"], ["sujets", "Sujets autorisés"], ["reglages", "Réglages et avis"]] as [Onglet, string][]).map(([cle, libelle]) => (
          <button key={cle} type="button" role="tab" aria-selected={onglet === cle} className="esp-onglet" onClick={() => setOnglet(cle)}>{libelle}</button>
        ))}
      </div>

      {source === "reelle" && !reel && !erreur ? <Chargement texte="Lecture des demandes…" /> : null}

      {monde && onglet === "demandes" ? (
        <>
          <div className="esp-kpis" data-arrivee="">
            {FAMILLES.map((fa) => (
              <button key={fa.cle} type="button" className="esp-kpi" data-teinte={compteurs[fa.cle] ? fa.teinte : undefined} aria-pressed={filtre === fa.cle} onClick={() => setFiltre(filtre === fa.cle ? null : fa.cle)}>
                <span className="esp-kpi-etiquette">{fa.libelle}</span>
                <span className="esp-kpi-valeur">{compteurs[fa.cle]}</span>
                <span className="esp-kpi-sous">{fa.sous}</span>
              </button>
            ))}
          </div>
          <p className="esp-kpi-sous" style={{ margin: "-4px 0 14px" }}>
            Sur 7 jours : {monde.indicateurs.recues} reçue{monde.indicateurs.recues > 1 ? "s" : ""}, {monde.indicateurs.repondues} répondue{monde.indicateurs.repondues > 1 ? "s" : ""}
            {monde.indicateurs.parties_seules ? ` dont ${monde.indicateurs.parties_seules} sans intervention` : ""}
            {monde.indicateurs.hors_base ? `, ${monde.indicateurs.hors_base} hors de votre base` : ""}
            {monde.indicateurs.delai_median_minutes !== null ? ` · première réponse en ${Math.round(monde.indicateurs.delai_median_minutes)} min (médiane)` : ""}.
          </p>
          <div className="esp-grille esp-grille--large">
            <section className="esp-carte" aria-label="Demandes">
              <div className="esp-carte-tete">
                <h2 className="esp-carte-titre">{filtre ? FAMILLES.find((x) => x.cle === filtre)?.libelle : "Toutes les demandes"}</h2>
                <span className="esp-kpi-sous">{visibles.length} demande{visibles.length > 1 ? "s" : ""}</span>
              </div>
              {visibles.length === 0 ? (
                <Vide titre="Aucune demande">{filtre ? "Rien dans cette famille." : "Les messages reçus s'afficheront ici, avec leur réponse préparée."}</Vide>
              ) : (
                <ul className="esp-liste" aria-label="Demandes">
                  {visibles.map((d) => {
                    const s = STATUTS[d.statut];
                    const sujet = monde.sujets.find((x) => x.code === d.sujet)?.libelle;
                    const rec = monde.receptions[d.reception_id];
                    return (
                      <li key={d.id}>
                        <button type="button" aria-current={choisi === d.id ? "true" : undefined} className="esp-item"
                          onClick={() => {
                            setChoix(d.id);
                            if (window.innerWidth < 1024) document.getElementById("esp-dossier")?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}>
                          <span className="esp-item-haut">
                            <span style={{ fontWeight: 600 }}>{d.de_nom || d.adresse_reponse || "Client"}</span>
                            <Pastille teinte={s.teinte}>{s.libelle}</Pastille>
                            {d.urgence ? <Pastille teinte="rouge">Urgent</Pastille> : null}
                          </span>
                          <span className="esp-item-titre">{(d.canal !== "formulaire" && rec?.sujet) || extrait(rec?.corps) || rec?.sujet || "Message sans texte"}</span>
                          <span className="esp-item-bas">
                            <span>{CANAUX[d.canal]} · {relatif(d.recu_le)}</span>
                            {sujet ? <span>{sujet}</span> : null}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
            <section id="esp-dossier" className="esp-detail-mobile" aria-label="La demande">
              {demande ? (
                <DemandeVue key={demande.id} demande={demande} monde={monde} decideur={decideur} source={source}
                  relire={charger} modifierLocal={modifierLocal} />
              ) : (
                <div className="esp-carte"><Vide titre="Choisissez une demande">Le message reçu et la réponse préparée s&apos;affichent ici.</Vide></div>
              )}
            </section>
          </div>
        </>
      ) : null}

      {monde && onglet === "base" ? (
        <BaseConnaissances monde={monde} source={source} client={client} role={role} relire={charger} modifierLocal={modifierLocal} />
      ) : null}
      {monde && onglet === "reglages" ? (
        <ReglagesAvis key={`${source}:${monde.reglages?.id ?? ""}`} monde={monde} source={source} client={client} role={role} relire={charger} modifierLocal={modifierLocal} />
      ) : null}
      {monde && onglet === "sujets" ? (
        <SujetsAutorises monde={monde} source={source} client={client} role={role} relire={charger} modifierLocal={modifierLocal} />
      ) : null}
    </>
  );
}

function DemandeVue({ demande, monde, decideur, source, relire, modifierLocal }: {
  demande: Demande; monde: Monde; decideur: boolean; source: "exemple" | "reelle";
  relire: () => Promise<void>; modifierLocal: (f: (m: Monde) => Monde) => void;
}) {
  const rec = monde.receptions[demande.reception_id];
  const versions = monde.reponses.filter((r) => r.demande_id === demande.id).sort((a, b) => b.version - a.version);
  const rep: Reponse | undefined = versions[0];
  const sources = (rep?.sources ?? []).map((id) => monde.fiches.find((f) => f.id === id)).filter((f) => f !== undefined);
  const sujet = monde.sujets.find((x) => x.code === demande.sujet);
  const [mode, setMode] = useState<"lire" | "corriger" | "refuser">("lire");
  const [texte, setTexte] = useState(rep?.corps ?? "");
  const [motif, setMotif] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [fait, setFait] = useState<string | null>(null);
  const aValider = rep?.statut === "a_valider" && demande.statut === "a_valider";
  const corrigeable = rep && (rep.statut === "a_valider" || rep.statut === "sans_envoi");

  const agir = async (quoi: "valider" | "refuser" | "corriger") => {
    if (!rep) return;
    setEnvoi(true);
    setErreur(null);
    try {
      if (source === "reelle") {
        if (quoi === "corriger") await corriger(rep.id, texte);
        else await decider(rep.id, quoi, quoi === "refuser" ? motif : undefined);
        await relire();
      } else {
        modifierLocal((m) => {
          const maintenant = new Date().toISOString();
          const statutRep = quoi === "valider" ? "envoyee" : quoi === "refuser" ? "refusee" : "remplacee";
          let reponses = m.reponses.map((r) => (r.id === rep.id ? { ...r, statut: statutRep as Reponse["statut"] } : r));
          if (quoi === "corriger") {
            reponses = [{ ...rep, id: crypto.randomUUID(), version: rep.version + 1, corps: texte, type_action: "reput.transferer", redigee_par: "vous", cree_le: maintenant, statut: "a_valider" }, ...reponses];
          }
          const demandes = m.demandes.map((d) => (d.id === demande.id
            ? { ...d, statut: (quoi === "valider" ? "envoyee" : quoi === "refuser" ? "refusee" : "a_valider") as StatutDemande, decidee_le: maintenant, envoyee_le: quoi === "valider" ? maintenant : d.envoyee_le }
            : d));
          return { ...m, reponses, demandes };
        });
      }
      setFait(quoi === "valider" ? "La réponse est validée : elle part par le canal du client, sous votre signature."
        : quoi === "refuser" ? "La réponse est refusée : rien ne part. La demande reste dans l'historique."
          : "Votre correction remplace la réponse ; elle revient dans la file dans la minute, validez-la pour l'envoyer.");
      setMode("lire");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };

  return (
    <div className="esp-carte">
      <div className="esp-carte-tete">
        <h2 className="esp-carte-titre">{demande.de_nom || demande.adresse_reponse || "Client"}</h2>
        <Pastille teinte={STATUTS[demande.statut].teinte}>{STATUTS[demande.statut].libelle}</Pastille>
      </div>
      <div className="esp-carte-corps">
        <div className="esp-section-titre">Le message reçu</div>
        <p className="esp-kpi-sous" style={{ marginBottom: 8 }}>
          {CANAUX[demande.canal]}{rec?.de_adresse ? ` · ${rec.de_adresse}` : ""} · {dateHeure(demande.recu_le)}
          {sujet ? ` · classé « ${sujet.libelle} »` : ""}
          {demande.envoyee_le ? ` · répondue en ${Math.max(1, Math.round((new Date(demande.envoyee_le).getTime() - new Date(demande.recu_le).getTime()) / 60000))} min` : ""}{demande.langue && demande.langue !== "fr" ? ` · langue : ${demande.langue}` : ""}
        </p>
        {(() => {
          const precedentes = demande.de_empreinte ? monde.demandes.filter((x) => x.id !== demande.id && x.de_empreinte === demande.de_empreinte) : [];
          return precedentes.length || demande.litige || demande.escaladee_le ? (
            <p style={{ marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {precedentes.length ? <Pastille contour>Client connu · {precedentes.length} demande{precedentes.length > 1 ? "s" : ""} avant celle-ci</Pastille> : null}
              {demande.litige ? <Pastille teinte="rouge">Litige ouvert : jamais de réponse automatique</Pastille> : null}
              {demande.escaladee_le ? <Pastille teinte="rouge">Délai dépassé, remontée au responsable</Pastille> : null}
            </p>
          ) : null;
        })()}
        {rec?.sujet ? <p style={{ fontWeight: 600, marginBottom: 6 }}>{rec.sujet}</p> : null}
        <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{rec?.corps || "(message sans texte)"}</p>
        {Array.isArray(rec?.pieces) && rec.pieces.length ? (
          <p className="esp-kpi-sous" style={{ marginTop: 8, overflowWrap: "anywhere" }}>
            Pièces jointes conservées : {(rec.pieces as { nom?: string }[]).map((x) => x?.nom ?? "pièce").join(", ")}
          </p>
        ) : null}
      </div>

      <div className="esp-carte-corps">
        <div className="esp-section-titre">{rep ? `La réponse préparée${rep.version > 1 ? ` (version ${rep.version})` : ""}` : "La réponse"}</div>
        {demande.motif ? <div style={{ marginBottom: 10 }}><Avis teinte="ambre">{demande.motif}</Avis></div> : null}
        {!rep ? (
          <Vide titre={demande.statut === "a_preparer" ? "Réponse en préparation" : "Aucune réponse préparée"}>
            {demande.statut === "a_preparer" ? "Elle est prête dans la minute qui suit la réception." : "Cette demande est à traiter par une personne."}
          </Vide>
        ) : (
          <>
            <p style={{ marginBottom: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
              {rep.couverte ? <Pastille teinte="vert">Tirée de votre base</Pastille> : <Pastille teinte="ambre">Hors de votre base : à compléter</Pastille>}
              {rep.type_action === "reput.transferer" ? <Pastille contour>Toujours relue</Pastille> : null}
              {rep.statut === "envoyee" ? <Pastille teinte="vert">Envoyée</Pastille> : null}
              {rep.redigee_par ? <Pastille contour>Corrigée par une personne</Pastille> : null}
            </p>
            {rep.raison && !rep.couverte ? <p className="esp-kpi-sous" style={{ marginBottom: 8 }}>{rep.raison}</p> : null}
            {rep.objet ? <p style={{ fontWeight: 600, marginBottom: 6 }}>Objet : {rep.objet}</p> : null}
            {mode === "corriger" ? (
              <label className="rv-libelle">Votre version
                <textarea className="rv-champ" rows={10} value={texte} onChange={(e) => setTexte(e.target.value)} />
              </label>
            ) : (
              <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", padding: "10px 12px", borderRadius: 10, background: "rgba(0,0,0,0.035)" }}>{rep.corps}</p>
            )}
            {sources.length ? (
              <div style={{ marginTop: 10 }}>
                <div className="esp-section-titre">Ses sources dans la base</div>
                <ul style={{ display: "grid", gap: 6 }}>
                  {sources.map((f) => (
                    <li key={f!.id} className="esp-kpi-sous"><strong>{f!.titre}</strong> — {f!.source}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>

      {rep && decideur && (aValider || corrigeable) ? (
        <div className="esp-carte-corps">
          {fait ? <div style={{ marginBottom: 10 }}><Avis teinte="vert" role="status">{fait}</Avis></div> : null}
          {erreur ? <div style={{ marginBottom: 10 }}><Avis teinte="rouge" role="alert">{erreur}</Avis></div> : null}
          {mode === "refuser" ? (
            <div className="esp-form">
              <label className="rv-libelle">Pourquoi refuser ? <span className="esp-obligatoire">(obligatoire)</span>
                <input className="rv-champ" value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Client en litige : je l'appelle moi-même" />
              </label>
              <div className="esp-actions">
                <button type="button" className="r-btn r-btn--noir" disabled={envoi || !motif.trim()} onClick={() => agir("refuser")}>{envoi ? <Loader variant="spin" /> : null} Refuser la réponse</button>
                <button type="button" className="r-btn" onClick={() => setMode("lire")}>Annuler</button>
              </div>
            </div>
          ) : mode === "corriger" ? (
            <div className="esp-actions">
              <button type="button" className="r-btn r-btn--noir" disabled={envoi || !texte.trim()} onClick={() => agir("corriger")}>{envoi ? <Loader variant="spin" /> : null} Enregistrer la correction</button>
              <button type="button" className="r-btn" onClick={() => { setMode("lire"); setTexte(rep.corps); }}>Annuler</button>
            </div>
          ) : (
            <div className="esp-actions">
              {aValider ? <button type="button" className="r-btn r-btn--noir" disabled={envoi} onClick={() => agir("valider")}>{envoi ? <Loader variant="spin" /> : null} Valider et envoyer</button> : null}
              {corrigeable ? <button type="button" className="r-btn" onClick={() => { setTexte(rep.corps); setMode("corriger"); }}>Corriger</button> : null}
              {aValider ? <button type="button" className="r-btn" onClick={() => setMode("refuser")}>Refuser</button> : null}
            </div>
          )}
        </div>
      ) : fait ? (
        <div className="esp-carte-corps"><Avis teinte="vert" role="status">{fait}</Avis></div>
      ) : null}
    </div>
  );
}
