"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › Chantiers : l'aperçu à droite de la frise (30/10/2026)

   Un clic sur la barre d'un chantier, ou sur un passage posé dessus, ouvre
   ici ce qu'il faut savoir sans quitter la frise (le « peek » de Linear,
   volet de 380) :
     · un chantier : ce qu'il demande, en phrases (./enClair), ses passages
       des trois prochaines semaines (chacun s'ouvre ici), où il en est, et
       les portes de sa fiche (Aperçu, Terrain, Argent, Fil, Réception) ;
     · un passage : qui, quoi, quand, sur quel lot, ce que l'intervenant a
       répondu, et où agir (« À faire » pour noter la réponse, le planning
       du chantier pour le décaler).
   Lecture seule : les gestes restent dans leurs pages, rien n'est réécrit —
   sauf les heures d'un passage (30/10/2026, b6_82) : arrivée et départ se
   posent ici, la page les écrit (onHeures).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { dateCourte } from "@/components/espace/format";
import { STATUTS_CHANTIER } from "@/components/espace/daliro/etats";
import type { Chantier, Passage, Tableau } from "@/components/espace/daliro/types";
import { CONFIRMATION_CLAIRE, ecartJours, lienFiche, lienPassage, periode, phrasePassage, phrasesChantier, quand, qui } from "./enClair";

const maj = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const ONGLETS = [
  { cle: undefined, libelle: "Fiche" },
  { cle: "terrain", libelle: "Terrain" },
  { cle: "argent", libelle: "Argent" },
  { cle: "fil", libelle: "Fil" },
  { cle: "reception", libelle: "Réception" },
];

export default function ApercuFrise({
  chantier,
  tableau,
  passage,
  auj,
  lecture,
  onPassage,
  onChantier,
  onFermer,
  onHeures,
}: {
  chantier: Chantier;
  tableau: Tableau | null;
  passage: Passage | null;
  auj: string;
  lecture: boolean;
  onPassage: (id: string) => void;
  onChantier: () => void;
  onFermer: () => void;
  /* poser ou retirer les heures d'un passage prévu (« 07:30 », « 12:00 », ou null et null) */
  onHeures?: (p: Passage, debut: string | null, fin: string | null) => void;
}) {
  return (
    <aside className="ltl-apercu" aria-label={passage ? `Passage : ${passage.tache ?? "sans tâche"}` : `Aperçu : ${chantier.nom}`}>
      <div className="ltl-apercu-tete">
        <span className="ltl-apercu-sur">
          {passage ? (
            <button type="button" onClick={onChantier}>
              <ArrowLeft width={12} height={12} aria-hidden="true" style={{ verticalAlign: "-1px", marginRight: 4 }} />
              {chantier.nom}
            </button>
          ) : (
            "Aperçu du chantier"
          )}
        </span>
        <button type="button" className="ltl-apercu-fermer" aria-label="Fermer l'aperçu (Échap)" title="Fermer (Échap)" onClick={onFermer}>
          <X aria-hidden="true" />
        </button>
      </div>
      {passage ? <VuePassage chantier={chantier} p={passage} auj={auj} onHeures={onHeures} /> : <VueChantier c={chantier} t={tableau} auj={auj} lecture={lecture} onPassage={onPassage} />}
    </aside>
  );
}

function VueChantier({ c, t, auj, lecture, onPassage }: { c: Chantier; t: Tableau | null; auj: string; lecture: boolean; onPassage: (id: string) => void }) {
  const phrases = phrasesChantier(c, t, auj).filter((p) => !p.cle.startsWith("p-"));
  const aVenir = (t?.passages ?? []).filter((p) => p.statut === "prevu" && ecartJours(p.fin, auj) >= 0 && ecartJours(p.debut, auj) <= 21).sort((a, b) => a.debut.localeCompare(b.debut));
  const statut = STATUTS_CHANTIER[c.statut];
  const pct = c.etape && c.etape.etapes ? c.etape.avancement_pct : null;
  return (
    <div className="ltl-apercu-corps">
      <div>
        <h2 className="ltl-apercu-titre">{c.nom}</h2>
        <p className="ltl-apercu-meta">
          {[c.adresse, `${c.code_postal} ${c.commune}`].filter(Boolean).join(", ")}
        </p>
      </div>

      <section className="ltl-apercu-section" aria-label="À faire sur ce chantier">
        <h3>À faire</h3>
        {lecture && !t ? (
          <p className="ltl-apercu-meta">Lecture du chantier…</p>
        ) : phrases.length || aVenir.some((p) => phrasePassage(p, auj)) ? (
          <ul className="ltl-apercu-phrases">
            {phrases.map((ph) =>
              ph.href ? (
                <li key={ph.cle}>
                  <Link href={ph.href} className="ltl-apercu-phrase" data-teinte={ph.teinte}>
                    <span>{ph.texte}</span>
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </li>
              ) : (
                <li key={ph.cle} className="ltl-apercu-phrase" data-teinte={ph.teinte}>
                  <span>{ph.texte}</span>
                </li>
              ),
            )}
            {aVenir.map((p) => {
              const ph = phrasePassage(p, auj);
              return ph ? (
                <li key={ph.cle}>
                  <button type="button" className="ltl-apercu-phrase" data-teinte={ph.teinte} onClick={() => onPassage(p.id)}>
                    <span>{ph.texte}</span>
                    <ArrowRight aria-hidden="true" />
                  </button>
                </li>
              ) : null;
            })}
          </ul>
        ) : (
          <p className="ltl-apercu-meta">Rien ne coince sur ce chantier.</p>
        )}
      </section>

      {t ? (
        <section className="ltl-apercu-section" aria-label="Les trois prochaines semaines">
          <h3>Les trois prochaines semaines</h3>
          {aVenir.length ? (
            <ul className="ltl-apercu-phrases">
              {aVenir.map((p) => {
                const conf = CONFIRMATION_CLAIRE[p.confirmation];
                return (
                  <li key={p.id}>
                    <button type="button" className="ltl-apercu-phrase" data-teinte={conf.teinte} onClick={() => onPassage(p.id)}>
                      <span>
                        {maj(periode(p, auj))} · {qui(p)}
                        <span className="ltl-apercu-phrase-sous">
                          {p.tache ?? p.lot_libelle ?? "Passage"} · {conf.court}
                        </span>
                      </span>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="ltl-apercu-meta">Personne n&apos;est prévu sur le chantier.</p>
          )}
        </section>
      ) : null}

      <section className="ltl-apercu-section" aria-label="Où il en est">
        <h3>Où il en est</h3>
        <dl className="ltl-apercu-props">
          <dt>État</dt>
          <dd>{statut.libelle}</dd>
          <dt>Dates</dt>
          <dd>{c.date_debut || c.date_fin_prevue ? `${c.date_debut ? dateCourte(c.date_debut) : "?"} → ${c.date_fin_prevue ? dateCourte(c.date_fin_prevue) : "?"}` : "Pas encore datées"}</dd>
          <dt>En cours</dt>
          <dd>
            {c.etape?.lot_libelle ? (
              <span className="ltl-apercu-jauge">
                <span>
                  <span style={{ width: `${Math.min(100, pct ?? 0)}%` }} />
                </span>
                <span>
                  {c.etape.lot_libelle} · {pct ?? 0} %
                </span>
              </span>
            ) : (
              "Aucun lot posé"
            )}
          </dd>
          <dt>Pour qui</dt>
          <dd>{c.maitre_ouvrage_nom ?? "Maître d'ouvrage à désigner"}</dd>
        </dl>
      </section>

      <div className="ltl-apercu-pied">
        {ONGLETS.map((o, i) => (
          <Link key={o.libelle} href={lienFiche(c.id, o.cle)} className={i === 0 ? "v2-btn v2-btn--petit v2-btn--primaire" : "v2-btn v2-btn--petit"}>
            {o.libelle}
          </Link>
        ))}
      </div>
    </div>
  );
}

const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

function VuePassage({ chantier, p, auj, onHeures }: { chantier: Chantier; p: Passage; auj: string; onHeures?: (p: Passage, debut: string | null, fin: string | null) => void }) {
  const conf = CONFIRMATION_CLAIRE[p.confirmation];
  const [hd, setHd] = useState(hhmm(p.heure_debut));
  const [hf, setHf] = useState(hhmm(p.heure_fin));
  const change = hd !== hhmm(p.heure_debut) || hf !== hhmm(p.heure_fin);
  const incomplet = !!hd !== !!hf;
  const ph = phrasePassage(p, auj);
  const dans = ecartJours(p.debut, auj);
  return (
    <div className="ltl-apercu-corps">
      <div>
        <h2 className="ltl-apercu-titre">{p.tache ?? p.lot_libelle ?? "Passage"}</h2>
        <p className="ltl-apercu-meta">
          {maj(periode(p, auj))}
          {dans > 1 ? ` (dans ${dans} jours)` : ""} · {qui(p)}
        </p>
      </div>

      <ul className="ltl-apercu-phrases">
        <li className="ltl-apercu-phrase" data-teinte={conf.teinte}>
          <span>{ph ? ph.texte : p.confirmation === "confirmee" ? `${qui(p)} a confirmé sa venue${p.confirmation_le ? ` le ${dateCourte(p.confirmation_le)}` : ""}. Rien à faire.` : p.statut === "fait" ? "Passage fait." : p.exterieur ? `${qui(p)} n'est pas encore prévenu : la demande partira à J-2.` : `${qui(p)} n'est pas encore prévenu.`}</span>
        </li>
      </ul>

      <section className="ltl-apercu-section" aria-label="Le passage">
        <h3>Le passage</h3>
        <dl className="ltl-apercu-props">
          <dt>Quand</dt>
          <dd>{p.debut.slice(0, 10) === p.fin.slice(0, 10) ? `${quand(p.debut, auj)} (${dateCourte(p.debut)})` : `${dateCourte(p.debut)} → ${dateCourte(p.fin)}`}</dd>
          <dt>Heures</dt>
          <dd>
            {p.statut === "prevu" && onHeures ? (
              <span className="ltl-apercu-heures">
                <input type="time" step={900} value={hd} onChange={(e) => setHd(e.target.value)} aria-label="Heure d'arrivée" />
                <span aria-hidden="true">→</span>
                <input type="time" step={900} value={hf} onChange={(e) => setHf(e.target.value)} aria-label="Heure de départ" />
                {change ? (
                  <button type="button" className="v2-btn v2-btn--petit" disabled={incomplet} title={incomplet ? "L'arrivée et le départ, ou aucun des deux" : undefined} onClick={() => onHeures(p, hd || null, hf || null)}>
                    Enregistrer
                  </button>
                ) : null}
              </span>
            ) : p.heure_debut ? (
              `${hhmm(p.heure_debut)} → ${hhmm(p.heure_fin)}`
            ) : (
              "Toute la journée"
            )}
          </dd>
          <dt>Qui</dt>
          <dd>
            {qui(p)}
            {p.intervenant_type === "equipe" ? " (nos équipes)" : p.intervenant_type === "tiers" ? " (sous-traitant)" : " (à rapprocher de l'annuaire)"}
          </dd>
          <dt>Lot</dt>
          <dd>{p.lot_libelle ? `${p.lot_code ? `${p.lot_code} · ` : ""}${p.lot_libelle}` : "Aucun"}</dd>
          <dt>Réponse</dt>
          <dd>{maj(conf.court)}</dd>
          <dt>Chantier</dt>
          <dd>{chantier.nom}</dd>
        </dl>
      </section>

      <div className="ltl-apercu-pied">
        <Link href={lienPassage(p.id)} className="v2-btn v2-btn--petit v2-btn--primaire">
          {p.confirmation === "confirmee" ? "Voir dans À faire" : "Noter la réponse"}
        </Link>
        <Link href={`${lienFiche(chantier.id, "terrain")}#planning`} className="v2-btn v2-btn--petit">
          Planning du chantier
        </Link>
      </div>
    </div>
  );
}
