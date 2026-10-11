"use client";

/* ══════════════════════════════════════════════════════════════════════
   Demandes reçues — la vue d'ensemble (07/10/2026)

   Le dessin est celui de la maquette donnée par Teo : un titre et la
   période ; trois cartes à jauge en pastilles ; l'activité en carte de
   chaleur jour par jour ; la courbe des demandes et les canaux en
   colonnes ; une barre de raccourcis ; les boîtes et les canaux.

   Les chiffres sont ceux des demandes reçues, par la même porte que la
   liste dessous (components/espace/filed/receptions : chargerBoite
   « toutes », ou l'exemple vueExemple). Rien n'est inventé : un canal
   sans aucune demande se dit « non branché », avec la marche à suivre.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCheck, ChevronDown, ChevronLeft, ChevronRight, Globe, Inbox, Info, Mail, MessageCircle, Plug, Smartphone, Sparkles } from "lucide-react";
import { useSource } from "@/components/espace/source";
import { vueExemple } from "@/components/espace/filed/EcranBoite";
import { CANAUX, chargerBoite, type Canal, type VueBoite } from "@/components/espace/filed/receptions";
import { RACINE } from "./modules";
import { Chiffre, EnDirect } from "./vivant";

const JOUR = 86_400_000;
const PERIODES = [
  { cle: 30, libelle: "30 derniers jours" },
  { cle: 91, libelle: "3 derniers mois" },
  { cle: 365, libelle: "12 derniers mois" },
] as const;
const ORDRE_CANAUX: Canal[] = ["email", "formulaire", "whatsapp", "sms"];
const ICONE_CANAL: Record<Canal, typeof Mail> = { email: Mail, formulaire: Globe, whatsapp: MessageCircle, sms: Smartphone };

const minuit = (t: number) => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
const jourCourt = (t: number) => new Date(t).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

export default function TableauDemandes() {
  const { source } = useSource();
  const [reel, setReel] = useState<VueBoite | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [periode, setPeriode] = useState<number>(91);
  const [aujourdhui] = useState(() => minuit(Date.now()));

  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setReel(null);
      try {
        const v = await chargerBoite("toutes");
        if (actif) setReel(v);
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);

  const exemple = useMemo(() => vueExemple("toutes"), []);
  const vue = source === "exemple" ? exemple : reel;

  const c = useMemo(() => {
    if (!vue) return null;
    const debut = aujourdhui - (periode - 1) * JOUR;
    const toutes = vue.receptions;
    const dans = toutes.filter((r) => new Date(r.recu_le).getTime() >= debut);
    const nouvelles = dans.filter((r) => r.statut === "nouvelle").length;
    const traitees = dans.filter((r) => r.statut === "traitee" || r.statut === "lue").length;
    const ecartees = dans.filter((r) => r.statut === "ignoree" || r.statut === "indesirable").length;
    const parCanal = ORDRE_CANAUX.map((k) => ({ canal: k, n: dans.filter((r) => r.canal === k).length, total: toutes.filter((r) => r.canal === k).length }));
    const actifs = parCanal.filter((x) => x.total > 0).length;
    /* la carte de chaleur : un carré par jour, des semaines en colonnes */
    const parJour = new Map<number, number>();
    for (const r of dans) parJour.set(minuit(new Date(r.recu_le).getTime()), (parJour.get(minuit(new Date(r.recu_le).getTime())) ?? 0) + 1);
    let pic: { t: number; n: number } | null = null;
    for (const [t, n] of parJour) if (!pic || n > pic.n) pic = { t, n };
    /* la courbe : par semaine sur 30 jours / 3 mois, par mois sur 12 mois */
    const parMois = periode > 120;
    const seaux: { libelle: string; n: number }[] = [];
    if (parMois) {
      const d = new Date(aujourdhui);
      d.setDate(1);
      d.setMonth(d.getMonth() - 11);
      for (let i = 0; i < 12; i++) {
        const a = new Date(d.getFullYear(), d.getMonth() + i, 1).getTime();
        const b = new Date(d.getFullYear(), d.getMonth() + i + 1, 1).getTime();
        seaux.push({ libelle: new Date(a).toLocaleDateString("fr-FR", { month: "short" }), n: toutes.filter((r) => new Date(r.recu_le).getTime() >= a && new Date(r.recu_le).getTime() < b).length });
      }
    } else {
      const semaines = Math.ceil(periode / 7);
      for (let i = semaines - 1; i >= 0; i--) {
        const b = aujourdhui + JOUR - i * 7 * JOUR;
        const a = b - 7 * JOUR;
        seaux.push({ libelle: jourCourt(a), n: toutes.filter((r) => new Date(r.recu_le).getTime() >= a && new Date(r.recu_le).getTime() < b).length });
      }
    }
    const parBoite = Array.from(new Set(toutes.map((r) => r.boite)))
      .map((b) => ({ boite: b, canal: toutes.find((r) => r.boite === b)?.canal ?? ("email" as Canal), n: dans.filter((r) => r.boite === b).length, nouvelles: dans.filter((r) => r.boite === b && r.statut === "nouvelle").length }))
      .sort((a, b) => b.n - a.n);
    const derniere = toutes.slice().sort((a, b) => b.recu_le.localeCompare(a.recu_le))[0] ?? null;
    return { debut, dans, nouvelles, traitees, ecartees, parCanal, actifs, parJour, pic, seaux, parMois, parBoite, derniere };
  }, [vue, periode, aujourdhui]);

  if (erreur) return <div className="v2-dr-carte v2-dr-vide">La base réelle n&apos;a pas répondu : {erreur}</div>;
  if (!c) return <div className="v2-dr-carte v2-dr-vide">Lecture des demandes…</div>;

  const total = c.dans.length;
  const canalMax = c.parCanal.reduce((m, x) => (x.n > m.n ? x : m), c.parCanal[0]);

  return (
    <div className="v2-dr v2-vivant">
      {/* ——— le titre, les raccourcis, la période (une seule ligne) ——— */}
      <div className="v2-dr-titre">
        <h2>Vue d&apos;ensemble</h2>
        <span className="v2-dr-titre-actions">
          <EnDirect />
          <button type="button" className="v2-val-bouton" onClick={() => window.dispatchEvent(new Event("espace2-assistant"))}>
            <Sparkles width={16} height={16} aria-hidden="true" /> Préparer une réponse
          </button>
          <Link href={`${RACINE}/reglages`} className="v2-val-bouton">
            <Bell width={16} height={16} aria-hidden="true" /> Alertes
          </Link>
          <label className="v2-val-bouton">
            <span>{PERIODES.find((p) => p.cle === periode)?.libelle}</span>
            <ChevronDown width={14} height={14} aria-hidden="true" className="v2-val-bouton-chevron" />
            <select value={periode} onChange={(e) => setPeriode(Number(e.target.value))} aria-label="Période">
              {PERIODES.map((p) => (
                <option key={p.cle} value={p.cle}>
                  {p.libelle}
                </option>
              ))}
            </select>
          </label>
          <a href="#ecran" className="v2-dr-principal">
            <Inbox width={16} height={16} aria-hidden="true" /> Ouvrir les nouvelles{c.nouvelles ? ` (${c.nouvelles})` : ""}
          </a>
        </span>
      </div>

      {/* ——— trois cartes à jauge ——— */}
      <div className="v2-dr-trois">
        <Jauge
          icone={Inbox}
          titre="À traiter"
          lien="#ecran"
          fort={String(c.nouvelles)}
          faible={` / ${total} demande${total > 1 ? "s" : ""} nouvelle${c.nouvelles > 1 ? "s" : ""}`}
          part={total ? c.nouvelles / total : 0}
          pied={c.derniere ? `Dernière reçue : ${new Date(c.derniere.recu_le).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}` : "Aucune demande reçue"}
        />
        <Jauge
          icone={Plug}
          titre="Canaux"
          lien="#canaux"
          fort={String(c.actifs)}
          faible={` / ${ORDRE_CANAUX.length} branchés`}
          part={c.actifs / ORDRE_CANAUX.length}
          pied={c.parCanal.filter((x) => x.total > 0).map((x) => CANAUX[x.canal]).join(" · ") || "Aucun canal branché"}
        />
        <Jauge
          icone={CheckCheck}
          titre="Traitées"
          lien="#ecran"
          fort={String(c.traitees)}
          faible={` / ${total} (${total ? Math.round((c.traitees / total) * 100) : 0} %)`}
          part={total ? c.traitees / total : 0}
          pied={`${c.ecartees} écartée${c.ecartees > 1 ? "s" : ""} · ${c.nouvelles} en attente`}
        />
      </div>

      {/* ——— deux cartes à vues : les graphiques, les listes (flèches au bord) ——— */}
      <div className="v2-dr-principale" id="canaux">
        <Carrousel
          vues={[
            {
              titre: "Activité",
              contenu: (
                <>
        <p className="v2-dr-pic">
          <span>Pic :</span> {c.pic ? `${c.pic.n} demande${c.pic.n > 1 ? "s" : ""} (${jourCourt(c.pic.t)})` : "aucune demande sur la période"}{" "}
          <Info width={14} height={14} aria-label="Le jour qui a reçu le plus de demandes sur la période" />
        </p>
        <Chaleur debut={c.debut} fin={aujourdhui} parJour={c.parJour} />
                </>
              ),
            },
            {
              titre: c.parMois ? "Demandes par mois" : "Demandes par semaine",
              contenu: (
                <>
          <p className="v2-dr-sous">
            Moy. {(c.seaux.reduce((s, x) => s + x.n, 0) / Math.max(1, c.seaux.length)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} <strong>/ {c.parMois ? "mois" : "semaine"}</strong>
          </p>
          <Courbe seaux={c.seaux} />
                </>
              ),
            },
            {
              titre: "Par canal",
              contenu: (
                <>
          <p className="v2-dr-sous">
            Moy. {(total / ORDRE_CANAUX.length).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} <strong>/ canal</strong>
          </p>
          <Colonnes canaux={c.parCanal} max={canalMax.canal} />
          <p className="v2-dr-note">
            {(() => {
              const I = ICONE_CANAL[canalMax.canal];
              return <I width={16} height={16} aria-hidden="true" />;
            })()}
            <strong>{CANAUX[canalMax.canal]}</strong> : {canalMax.n} demande{canalMax.n > 1 ? "s" : ""} <span>({total ? Math.round((canalMax.n / total) * 100) : 0} % du volume)</span>
          </p>
                </>
              ),
            },
          ]}
        />
        <Carrousel
          liste
          vues={[
            {
              titre: "Boîtes de réception",
              contenu: (
          <ul className="v2-dr-liste">
            {c.parBoite.length ? (
              c.parBoite.map((b, i) => {
                const I = ICONE_CANAL[b.canal];
                return (
                  <li key={b.boite} data-premier={i === 0 ? "" : undefined}>
                    <I width={18} height={18} aria-hidden="true" />
                    <span>
                      <span>{b.boite.replace(/^site:/, "")}</span>
                      <small>
                        {CANAUX[b.canal]} · {b.n} demande{b.n > 1 ? "s" : ""}
                        {b.nouvelles ? ` · ${b.nouvelles} nouvelle${b.nouvelles > 1 ? "s" : ""}` : ""}
                      </small>
                    </span>
                    <a href="#ecran" aria-label={`Voir les demandes de ${b.boite}`}>
                      <ChevronRight width={16} height={16} aria-hidden="true" />
                    </a>
                  </li>
                );
              })
            ) : (
              <li>
                <span>
                  <small>Aucune boîte n&apos;a encore reçu de demande.</small>
                </span>
              </li>
            )}
          </ul>
              ),
            },
            {
              titre: "Canaux",
              contenu: (
          <ul className="v2-dr-liste">
            {c.parCanal.map((x) => {
              const I = ICONE_CANAL[x.canal];
              return (
                <li key={x.canal}>
                  <I width={18} height={18} aria-hidden="true" />
                  <span>
                    <span>{CANAUX[x.canal]}</span>
                    <small>{x.total ? `Branché · ${x.n} demande${x.n > 1 ? "s" : ""} sur la période` : "Non branché"}</small>
                  </span>
                  {x.total ? (
                    <a href="#ecran" aria-label={`Voir les demandes : ${CANAUX[x.canal]}`}>
                      <ChevronRight width={16} height={16} aria-hidden="true" />
                    </a>
                  ) : (
                    <Link href="/contact" className="v2-val-bouton">
                      Brancher
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}

/* ——— une carte à plusieurs vues : le titre de la vue, des points, et
   deux flèches au bord droit pour passer de l'une à l'autre ——— */
function Carrousel({ vues, liste }: { vues: { titre: string; contenu: React.ReactNode }[]; liste?: boolean }) {
  const [i, setI] = useState(0);
  const aller = (d: number) => setI((x) => (x + d + vues.length) % vues.length);
  const v = vues[i];
  return (
    <section className={`v2-dr-carte v2-dr-carrousel${liste ? " v2-dr-carrousel--liste" : ""}`} aria-label={v.titre} aria-roledescription="carrousel">
      <div className="v2-dr-carrousel-tete">
        <h3>{v.titre}</h3>
        <span className="v2-dr-points" aria-hidden="true">
          {vues.map((x, k) => (
            <i key={x.titre} data-actif={k === i ? "" : undefined} />
          ))}
        </span>
        <span className="v2-dr-fleches">
          <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label="Vue précédente" onClick={() => aller(-1)}>
            <ChevronLeft width={16} height={16} />
          </button>
          <button type="button" className="v2-val-bouton v2-val-bouton--icone" aria-label="Vue suivante" onClick={() => aller(1)}>
            <ChevronRight width={16} height={16} />
          </button>
        </span>
      </div>
      <div className="v2-dr-carrousel-corps" aria-live="polite">
        {v.contenu}
      </div>
    </section>
  );
}

/* ——— une carte à jauge en pastilles ——— */
function Jauge({ icone: Icone, titre, lien, fort, faible, part, pied }: { icone: typeof Mail; titre: string; lien: string; fort: string; faible: string; part: number; pied: string }) {
  const N = 40;
  const pleins = Math.round(Math.max(0, Math.min(1, part)) * N);
  return (
    <a href={lien} className="v2-dr-carte v2-dr-jauge">
      <span className="v2-dr-jauge-tete">
        <Icone width={18} height={18} aria-hidden="true" /> {titre}
        <ChevronRight width={16} height={16} aria-hidden="true" />
      </span>
      <span className="v2-dr-jauge-valeur">
        <strong><Chiffre valeur={fort} /></strong>
        {faible}
      </span>
      <span className="v2-dr-jauge-barre" aria-hidden="true">
        {Array.from({ length: N }, (_, i) => (
          <i key={i} data-plein={i < pleins ? "" : undefined} />
        ))}
      </span>
      <small>{pied}</small>
    </a>
  );
}

/* ——— la carte de chaleur : une colonne par semaine, une case par jour ——— */
function Chaleur({ debut, fin, parJour }: { debut: number; fin: number; parJour: Map<number, number> }) {
  /* on part du lundi de la première semaine */
  const d0 = new Date(debut);
  const lundi = minuit(debut - ((d0.getDay() + 6) % 7) * JOUR);
  const semaines: number[][] = [];
  for (let t = lundi; t <= fin; t += 7 * JOUR) semaines.push(Array.from({ length: 7 }, (_, k) => t + k * JOUR));
  const max = Math.max(1, ...parJour.values());
  const niveau = (t: number) => {
    if (t < debut || t > fin) return -1;
    const n = parJour.get(minuit(t)) ?? 0;
    return n === 0 ? 0 : Math.min(4, Math.ceil((n / max) * 4));
  };
  /* le nom du mois au-dessus de la première semaine qui le contient */
  const mois = semaines.map((s, i) => {
    const m = new Date(s[0]).getMonth();
    const avant = i > 0 ? new Date(semaines[i - 1][0]).getMonth() : -1;
    return m !== avant ? new Date(s[0]).toLocaleDateString("fr-FR", { month: "short" }) : "";
  });
  return (
    <div className="v2-dr-chaleur">
      <div className="v2-dr-chaleur-grille" style={{ gridTemplateColumns: `40px repeat(${semaines.length}, minmax(0, 1fr))` }}>
        <span />
        {mois.map((m, i) => (
          <small key={i} className="v2-dr-chaleur-mois">
            {m}
          </small>
        ))}
        {[0, 1, 2, 3, 4, 5, 6].map((k) => (
          <div key={k} className="v2-dr-chaleur-ligne" style={{ display: "contents" }}>
            <small className="v2-dr-chaleur-jour">{k === 0 ? "Lun" : k === 2 ? "Mer" : k === 4 ? "Ven" : ""}</small>
            {semaines.map((s) => {
              const t = s[k];
              const n = niveau(t);
              return <i key={t} data-n={n} title={n >= 0 ? `${jourCourt(t)} : ${parJour.get(minuit(t)) ?? 0} demande(s)` : undefined} />;
            })}
          </div>
        ))}
      </div>
      <p className="v2-dr-echelle">
        <Info width={14} height={14} aria-hidden="true" /> Moins {[0, 1, 2, 3, 4].map((n) => <i key={n} data-n={n} />)} Plus
      </p>
    </div>
  );
}

/* ——— la courbe lissée ——— */
function Courbe({ seaux }: { seaux: { libelle: string; n: number }[] }) {
  const L = 560, H = 220, n = seaux.length;
  const brut = Math.max(1, ...seaux.map((s) => s.n));
  const max = Math.max(4, Math.ceil(brut / 4) * 4);
  const pts = seaux.map((s, i) => [(i / Math.max(1, n - 1)) * L, H - (s.n / max) * H] as const);
  let d = `M${pts[0]?.[0] ?? 0},${pts[0]?.[1] ?? H}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${Math.min(H, p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${Math.min(H, p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  const pas = Math.max(1, Math.ceil(n / 6));
  return (
    <div className="v2-dr-courbe">
      <div className="v2-dr-axe-y" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <span key={p}>{Math.round(max * p)}</span>
        ))}
      </div>
      <div>
        <svg viewBox={`0 0 ${L} ${H}`} preserveAspectRatio="none" role="img" aria-label="Évolution du nombre de demandes">
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1="0" x2={L} y1={H * p} y2={H * p} stroke="var(--v2-a-400)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          <path d={d} pathLength={1} className="v2-trace" fill="none" stroke="var(--v2-gray-900)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="v2-dr-axe-x" aria-hidden="true">
          {seaux.map((s, i) => (
            <span key={i} style={{ left: `${(i / Math.max(1, n - 1)) * 100}%` }}>
              {i % pas === 0 ? s.libelle : ""}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ——— les canaux en colonnes, icône au-dessus, le plus fort en clair ——— */
function Colonnes({ canaux, max }: { canaux: { canal: Canal; n: number }[]; max: Canal }) {
  const haut = Math.max(4, ...canaux.map((x) => x.n));
  const plafond = Math.ceil(haut / 4) * 4;
  return (
    <div className="v2-dr-colonnes">
      <div className="v2-dr-axe-y" aria-hidden="true">
        {[1, 0.75, 0.5, 0.25, 0].map((p) => (
          <span key={p}>{Math.round(plafond * p)}</span>
        ))}
      </div>
      <div className="v2-dr-colonnes-zone">
        {canaux.map((x) => {
          const I = ICONE_CANAL[x.canal];
          return (
            <div key={x.canal} className="v2-dr-col" data-max={x.canal === max && x.n > 0 ? "" : undefined} aria-label={`${CANAUX[x.canal]} : ${x.n}`}>
              <I width={18} height={18} aria-hidden="true" />
              <span style={{ height: `${Math.max(2, (x.n / plafond) * 100)}%` }} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

