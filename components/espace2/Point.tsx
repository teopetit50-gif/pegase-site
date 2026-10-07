"use client";

/* ══════════════════════════════════════════════════════════════════════
   /espace2/point — le Point du matin, redessiné (07/10/2026)

   Le dessin est celui de la maquette de Teo : les menus (date, heure,
   modules) et la remise à droite ; puis « À regarder en premier » et
   « Depuis la dernière édition », trois cartes (Encaissements,
   Documents, Qualité des données), « Équipe & continuité » et
   « Prochaine édition ».

   Les données ne changent pas : c'est le point du jour, lu par les mêmes
   portes que components/espace/point/PointDuMatin.tsx (exemple, ou base
   réelle : points_du_jour → lire_point, et apercu_point quand rien n'est
   assemblé). Chaque ligne du point est rangée dans UNE carte, dans cet
   ordre : section incomplète → Qualité ; équipe ou délégation → Équipe ;
   CASHD hors urgence → Encaissements ; FILED d'information → Documents ;
   critique ou à surveiller → À regarder en premier ; le reste → Depuis la
   dernière édition. Rien n'est inventé : une carte vide le dit.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Archive,
  CalendarDays,
  ChevronDown,
  Clock,
  FileText,
  Landmark,
  LayoutGrid,
  ListChecks,
  Mail,
  MessageCircle,
  MoreVertical,
  Send,
  User,
} from "lucide-react";
import { pointExemple } from "@/components/espace/exemples/point";
import { aujourdHui } from "@/components/espace/exemples/socle";
import { useSource } from "@/components/espace/source";
import { useTempsReel } from "@/components/espace/tempsReel";
import { libelleModule } from "@/components/espace/format";
import type { LignePoint, PointDuJour } from "@/components/espace/types";
import { apercuPoint, lirePoint, listerPoints, monCompte } from "@/components/espace/point/portes";
import { Note } from "./ui";
import { useToast } from "./Toasts";
import { RACINE } from "./modules";

type Contenu = { point: PointDuJour | null; lignes: LignePoint[]; apercu?: boolean; motifs?: unknown[] };
type Motif = { module?: string; motif?: string };

/* « /espace/filed » → « /espace2/filed » : les liens du point visent l'ancien espace */
const lienV2 = (l: string | null) => (l ? l.replace(/^\/espace(?=\/|$)/, RACINE) : null);

/* la première phrase fait le titre, le reste le détail */
function couper(texte: string | null): { titre: string; detail: string | null } {
  const t = (texte ?? "").trim();
  /* un point suivi d'un espace, sauf après une initiale (« M. Perrin ») ou dans une parenthèse */
  let i = -1;
  let prof = 0;
  for (let k = 0; k < t.length - 1; k++) {
    if (t[k] === "(") prof++;
    else if (t[k] === ")") prof = Math.max(0, prof - 1);
    else if (t[k] === "." && t[k + 1] === " " && prof === 0 && !/(^|\s)\p{Lu}$/u.test(t.slice(Math.max(0, k - 2), k))) {
      i = k;
      break;
    }
  }
  if (i < 0) return { titre: t.replace(/\.$/, ""), detail: null };
  return { titre: t.slice(0, i), detail: t.slice(i + 2).trim() || null };
}

const MONTANT = /(\d[\d\s ]*(?:,\d+)?)\s?€/;

/* « Encaissement attendu : Confluence Promotion, 38 500 € (échéance dans 4 jours, relance envoyée hier). » */
function encaissement(texte: string | null) {
  const t = texte ?? "";
  const m = t.match(MONTANT);
  if (!m) return null;
  const qui = t.split(":")[1]?.split(",")[0]?.trim() ?? null;
  const parenthese = t.match(/\(([^)]*)\)/)?.[1] ?? "";
  const notes = parenthese
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1));
  return { qui, montant: `${m[1].trim()} €`, notes };
}

const ICONE_MODULE: Record<string, typeof FileText> = { filed: FileText, cashd: Landmark, reput: MessageCircle, socle: ListChecks, rh: User };

export default function Point() {
  const { source } = useSource();
  const toast = useToast();
  const [decalage, setDecalage] = useState(0);
  const [module, setModule] = useState("");
  const [points, setPoints] = useState<PointDuJour[] | null>(null);
  const [contenus, setContenus] = useState<Record<string, Contenu>>({});
  const [erreur, setErreur] = useState<string | null>(null);
  const [chargeApercu, setChargeApercu] = useState(false);
  const jour = aujourdHui(decalage);

  /* ——— base réelle : comme PointDuMatin ——— */
  useEffect(() => {
    if (source !== "reelle") return;
    let actif = true;
    const t = window.setTimeout(async () => {
      setErreur(null);
      setPoints(null);
      try {
        const l = await listerPoints();
        if (actif) setPoints(l);
      } catch (e) {
        if (actif) {
          setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
          setPoints([]);
        }
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source]);
  const relire = useCallback(async () => {
    try {
      setPoints(await listerPoints());
      setContenus({});
    } catch {
      /* la prochaine lecture dira l'erreur */
    }
  }, []);
  useTempsReel(["points_du_jour"], source === "reelle", relire);

  const pointDuJour = useMemo(() => (points ?? []).filter((p) => p.jour === jour).sort((a, b) => b.version - a.version)[0] ?? null, [points, jour]);
  useEffect(() => {
    if (source !== "reelle" || !pointDuJour || contenus[pointDuJour.id]) return;
    let actif = true;
    const t = window.setTimeout(async () => {
      try {
        const r = await lirePoint(pointDuJour);
        if (actif) setContenus((prev) => ({ ...prev, [pointDuJour.id]: { point: r.point, lignes: r.lignes, motifs: r.motifs } }));
      } catch (e) {
        if (actif) setErreur(e instanceof Error ? e.message : "Le point n'a pas pu être lu.");
      }
    }, 0);
    return () => {
      actif = false;
      window.clearTimeout(t);
    };
  }, [source, pointDuJour, contenus]);
  const demanderApercu = useCallback(async () => {
    setChargeApercu(true);
    setErreur(null);
    try {
      const c = await monCompte();
      if (!c) throw new Error("Aucun compte rattaché à cette session.");
      const r = await apercuPoint(c.client_id, c.user_id, jour);
      setContenus((prev) => ({ ...prev, [`apercu-${jour}`]: { point: null, lignes: r.lignes, apercu: true, motifs: r.motifs } }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "L'aperçu n'a pas pu être fabriqué.");
    } finally {
      setChargeApercu(false);
    }
  }, [jour]);

  const contenu: Contenu | null = useMemo(() => {
    if (source === "exemple") return decalage < -6 ? { point: null, lignes: [] } : pointExemple(decalage);
    if (pointDuJour) return contenus[pointDuJour.id] ?? null;
    return contenus[`apercu-${jour}`] ?? { point: null, lignes: [] };
  }, [source, decalage, pointDuJour, contenus, jour]);

  const p = contenu?.point ?? null;
  const motifs = (contenu?.motifs ?? p?.motifs ?? []) as Motif[];
  const modules = useMemo(() => Array.from(new Set((contenu?.lignes ?? []).map((l) => l.module).filter((m): m is string => !!m))).sort(), [contenu]);

  /* ——— ranger chaque ligne dans une carte ——— */
  const cartes = useMemo(() => {
    const c = { qualite: [] as LignePoint[], equipe: [] as LignePoint[], encaissements: [] as LignePoint[], documents: [] as LignePoint[], premier: [] as LignePoint[], depuis: [] as LignePoint[] };
    for (const l of contenu?.lignes ?? []) {
      if (l.rang === 0) continue;
      if (module && l.module !== module) continue;
      if (l.section_incomplete && l.gravite !== "info") c.qualite.push(l);
      else if (l.module === "rh" || /d[ée]l[ée]gation/i.test(l.texte ?? "")) c.equipe.push(l);
      else if (l.module === "cashd" && l.gravite !== "critique") c.encaissements.push(l);
      else if (l.module === "filed" && l.gravite === "info") c.documents.push(l);
      else if (l.gravite === "critique" || l.gravite === "attention") c.premier.push(l);
      else c.depuis.push(l);
    }
    c.premier.sort((a, b) => Number(b.gravite === "critique") - Number(a.gravite === "critique"));
    return c;
  }, [contenu, module]);

  const heure = (p?.heure ?? "07:00").slice(0, 5).replace(":", " h ");
  const fuseau = p?.fuseau ?? "Europe/Paris";
  const canal = p?.canal === "whatsapp" ? "WhatsApp" : "courriel";
  const jours = Array.from({ length: 7 }, (_, i) => -i);
  const nomJour = (d: number) => {
    const s = new Date(`${aujourdHui(d)}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    return s.charAt(0).toUpperCase() + s.slice(1);
  };
  const qualitePartielle = motifs.length > 0 || cartes.qualite.length > 0 || !!p?.incomplet;
  const enCours = source === "reelle" && (!points || (pointDuJour && !contenu));
  const vide = !enCours && !(contenu?.lignes ?? []).length;

  return (
    <div className="v2-page v2-arrivee v2-pm">
      <h1 className="v2-sr">Point du matin</h1>

      {/* ——— les menus, la remise ——— */}
      <div className="v2-val-filtres">
        <label className="v2-val-bouton">
          <CalendarDays width={16} height={16} aria-hidden="true" />
          <span>{decalage === 0 ? `Aujourd'hui, ${nomJour(0).split(" ").slice(1).join(" ")}` : nomJour(decalage)}</span>
          <ChevronDown width={14} height={14} aria-hidden="true" className="v2-val-bouton-chevron" />
          <select value={decalage} onChange={(e) => setDecalage(Number(e.target.value))} aria-label="Édition">
            {jours.map((d) => (
              <option key={d} value={d}>
                {d === 0 ? "Aujourd'hui" : nomJour(d)}
              </option>
            ))}
          </select>
        </label>
        <Link href={`${RACINE}/reglages`} className="v2-val-bouton" title="L'heure du point se règle dans Réglages">
          <Clock width={16} height={16} aria-hidden="true" />
          <span>{heure}</span>
        </Link>
        <label className="v2-val-bouton" data-actif={module ? "" : undefined}>
          <LayoutGrid width={16} height={16} aria-hidden="true" />
          <span>{module ? libelleModule(module) : "Tous les modules"}</span>
          <ChevronDown width={14} height={14} aria-hidden="true" className="v2-val-bouton-chevron" />
          <select value={module} onChange={(e) => setModule(e.target.value)} aria-label="Modules">
            <option value="">Tous les modules</option>
            {modules.map((m) => (
              <option key={m} value={m}>
                {libelleModule(m)}
              </option>
            ))}
          </select>
        </label>
        <span className="v2-val-droite">
          <span className="v2-pm-remise">{p?.remis_le ? `Remis par ${canal}` : contenu?.apercu ? "Aperçu, non remis" : "Pas encore remis"}</span>
          <button
            type="button"
            className="v2-val-bouton"
            onClick={() => toast(`Le point vous est remis chaque matin à ${heure} par ${canal}. L'heure et le canal se règlent dans Réglages.`)}
          >
            <Mail width={16} height={16} aria-hidden="true" />
            <span>Recevoir par {canal}</span>
          </button>
        </span>
      </div>

      {erreur ? <Note teinte="rouge" role="alert">La base réelle n&apos;a pas répondu : {erreur}</Note> : null}

      {enCours ? (
        <div className="v2-carte v2-val-vide">Lecture du point…</div>
      ) : vide ? (
        <div className="v2-carte v2-val-vide">
          {contenu?.apercu
            ? "L'aperçu ne porte aucune section : aucun gabarit de point n'est réglé, ou rien n'est à signaler."
            : source === "reelle" && decalage === 0 ? (
                <>
                  Le point du matin n&apos;a pas encore été assemblé aujourd&apos;hui.{" "}
                  <button type="button" className="v2-val-lien" disabled={chargeApercu} onClick={demanderApercu}>
                    {chargeApercu ? "Fabrication…" : "Fabriquer un aperçu maintenant"} <ArrowRight width={14} height={14} aria-hidden="true" />
                  </button>
                </>
              ) : (
                "Aucun point n'a été assemblé ce jour-là."
              )}
        </div>
      ) : (
        <div className="v2-pm-grille">
          {/* ——— À regarder en premier ——— */}
          <Carte titre="À regarder en premier" classe="v2-pm-large" lien={`${RACINE}/activite`}>
            {cartes.premier.length ? (
              <ul className="v2-pm-liste">
                {cartes.premier.map((l) => {
                  const { titre, detail } = couper(l.texte);
                  const Icone = ICONE_MODULE[l.module ?? ""] ?? FileText;
                  const lien = lienV2(l.lien);
                  const action = l.module === "socle" ? { libelle: "À valider", icone: ArrowRight } : l.gravite === "critique" ? { libelle: "Ouvrir", icone: ArrowUpRight } : { libelle: "Examiner", icone: ArrowUpRight };
                  return (
                    <li key={l.id}>
                      <Icone width={20} height={20} aria-hidden="true" className="v2-pm-icone" data-critique={l.gravite === "critique" ? "" : undefined} />
                      <span className="v2-pm-texte">
                        <span>{titre}</span>
                        {l.entite_nom || l.objet_id ? <small>{[l.entite_nom, l.objet_id].filter(Boolean).join(" · ")}</small> : null}
                        {detail ? <small>{detail}</small> : null}
                      </span>
                      {lien ? (
                        <Link href={lien} className="v2-pm-action">
                          {action.libelle} <action.icone width={14} height={14} aria-hidden="true" />
                        </Link>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="v2-pm-rien">Rien d&apos;urgent ce matin.</p>
            )}
          </Carte>

          {/* ——— Depuis la dernière édition ——— */}
          <Carte titre="Depuis la dernière édition" lien={`${RACINE}/activite`}>
            {cartes.depuis.length ? (
              <ul className="v2-pm-liste">
                {cartes.depuis.map((l) => {
                  const { titre, detail } = couper(l.texte);
                  const Icone = l.module === "cashd" ? Send : (ICONE_MODULE[l.module ?? ""] ?? FileText);
                  return (
                    <li key={l.id}>
                      <Icone width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                      <span className="v2-pm-texte">
                        <span>{titre}</span>
                        <small>{[libelleModule(l.module), detail].filter(Boolean).join(" · ")}</small>
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="v2-pm-rien">Rien de nouveau depuis le dernier point.</p>
            )}
          </Carte>

          {/* ——— Encaissements ——— */}
          <Carte titre="Encaissements" lien={`${RACINE}/cashd`} pied={{ libelle: "Voir dans CASHD", href: `${RACINE}/cashd` }}>
            {cartes.encaissements.length ? (
              <ul className="v2-pm-liste">
                {cartes.encaissements.map((l) => {
                  const e = /encaissement/i.test(l.texte ?? "") ? encaissement(l.texte) : null;
                  return (
                    <li key={l.id}>
                      <Landmark width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                      {e ? (
                        <span className="v2-pm-texte">
                          {e.qui ? <small>{e.qui}</small> : null}
                          <strong className="v2-pm-montant">{e.montant}</strong>
                          {e.notes.map((n) => (
                            <small key={n}>{n}</small>
                          ))}
                        </span>
                      ) : (
                        <span className="v2-pm-texte">
                          <span>{couper(l.texte).titre}</span>
                          {couper(l.texte).detail ? <small>{couper(l.texte).detail}</small> : null}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="v2-pm-rien">Aucun encaissement à suivre.</p>
            )}
          </Carte>

          {/* ——— Documents ——— */}
          <Carte titre="Documents" lien={`${RACINE}/filed`} pied={{ libelle: "Voir dans FILED", href: `${RACINE}/filed` }}>
            {cartes.documents.length ? (
              <ul className="v2-pm-liste">
                {cartes.documents.flatMap((l) => {
                  /* « 2 documents attendent : 1 en lecture, 1 à classer (scan du 1er octobre). » → deux lignes */
                  const t = l.texte ?? "";
                  const apres = t.includes(":") ? t.split(":").slice(1).join(":") : "";
                  const morceaux = apres
                    .replace(/\.$/, "")
                    .split(/,\s(?![^()]*\))/)
                    .map((x) => x.trim())
                    .filter(Boolean);
                  const lien = lienV2(l.lien);
                  const lignes = morceaux.length > 1 ? morceaux : [t.replace(/\.$/, "")];
                  return lignes.map((m, i) => {
                    const note = m.match(/\(([^)]*)\)/)?.[1];
                    const libelle = m.replace(/\s*\([^)]*\)/, "");
                    const nom = /lecture/i.test(libelle) ? `${libelle.replace(/^(\d+)\s+en/, "$1 pièce en")}` : /classer/i.test(libelle) ? libelle.replace(/^(\d+)\s+à/, "$1 scan à") : libelle;
                    const Icone = /classer/i.test(libelle) ? Archive : FileText;
                    return (
                      <li key={`${l.id}-${i}`}>
                        <Icone width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                        <span className="v2-pm-texte">
                          <span>{nom}</span>
                          {note ? <small>{note.charAt(0).toUpperCase() + note.slice(1)}</small> : null}
                        </span>
                        {lien ? (
                          <Link href={lien} className="v2-pm-action" aria-label={`Ouvrir : ${nom}`}>
                            <ArrowRight width={14} height={14} aria-hidden="true" />
                          </Link>
                        ) : null}
                      </li>
                    );
                  });
                })}
              </ul>
            ) : (
              <p className="v2-pm-rien">Aucun document en attente.</p>
            )}
          </Carte>

          {/* ——— Qualité des données ——— */}
          <Carte
            titre="Qualité des données"
            badge={qualitePartielle ? "Partielle" : "Complète"}
            pied={motifs[0]?.module ? { libelle: "Voir la connexion", href: `${RACINE}/${motifs[0].module}` } : undefined}
          >
            {qualitePartielle ? (
              <div className="v2-pm-qualite">
                {(motifs.length ? motifs.map((m) => ({ module: m.module ?? null, texte: m.motif ?? "" })) : cartes.qualite.map((l) => ({ module: l.module, texte: l.texte ?? "" }))).map((q, i) => {
                  const { titre, detail } = couper(q.texte);
                  return (
                    <div key={i}>
                      <p>{titre.replace(/ ;.*$/, "")}.</p>
                      <small>{[q.module ? libelleModule(q.module) : null, detail ?? titre.split(" ; ")[1] ?? null].filter(Boolean).join(" · ")}</small>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="v2-pm-rien">Toutes les sources ont répondu à temps.</p>
            )}
          </Carte>

          {/* ——— Équipe & continuité ——— */}
          <Carte titre="Équipe & continuité" classe="v2-pm-large" lien={`${RACINE}/validations`}>
            {cartes.equipe.length ? (
              <div className="v2-pm-equipe">
                {cartes.equipe
                  .filter((l) => !/d[ée]l[ée]gation/i.test(l.texte ?? ""))
                  .map((l) => {
                    /* « Sofia Carvalho demande 5 jours du 13 au 17 octobre ; Yanis Dupré assurerait le remplacement. » */
                    const t = l.texte ?? "";
                    const qui = t.match(/^([A-ZÉ][\p{L}-]+\s[A-ZÉ][\p{L}-]+)/u)?.[1];
                    const periode = t.match(/du (\d+) au (\d+ \p{L}+)/u);
                    const duree = t.match(/(\d+) jours?/)?.[0];
                    const remplacant = t.match(/;\s*([A-ZÉ][\p{L}-]+\s[A-ZÉ][\p{L}-]+) assurerait/u)?.[1];
                    return qui && periode ? (
                      <div key={l.id} className="v2-pm-equipe-ligne">
                        <span className="v2-pm-equipe-qui">
                          <User width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                          <span className="v2-pm-texte">
                            <span>{qui}</span>
                            <small>
                              {periode[1]}–{periode[2]}
                              {duree ? ` · ${duree}` : ""}
                            </small>
                          </span>
                        </span>
                        {remplacant ? (
                          <span className="v2-pm-texte v2-pm-equipe-remp">
                            <small>Remplacement proposé</small>
                            <span>{remplacant}</span>
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <div key={l.id} className="v2-pm-equipe-ligne">
                        <span className="v2-pm-equipe-qui">
                          <User width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                          <span className="v2-pm-texte">
                            <span>{couper(t).titre}</span>
                          </span>
                        </span>
                      </div>
                    );
                  })}
                {cartes.equipe
                  .filter((l) => /d[ée]l[ée]gation/i.test(l.texte ?? ""))
                  .map((l) => (
                    <div key={l.id} className="v2-pm-equipe-pied">
                      <span>{(l.texte ?? "").replace(/\.$/, "")}.</span>
                      <Link href={`${RACINE}/validations`} className="v2-pm-action">
                        Consulter <ArrowUpRight width={14} height={14} aria-hidden="true" />
                      </Link>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="v2-pm-rien">Aucune absence ni délégation à signaler.</p>
            )}
          </Carte>

          {/* ——— Prochaine édition ——— */}
          <Carte titre="Prochaine édition" classe="v2-pm-haut">
            <ul className="v2-pm-liste">
              <li>
                <CalendarDays width={20} height={20} aria-hidden="true" className="v2-pm-icone" />
                <span className="v2-pm-texte">
                  <span>Demain à {heure}</span>
                  <small>
                    {fuseau} · {canal}
                  </small>
                </span>
                <Link href={`${RACINE}/reglages`} className="v2-pm-action">
                  Personnaliser <ArrowRight width={14} height={14} aria-hidden="true" />
                </Link>
              </li>
            </ul>
          </Carte>
        </div>
      )}
    </div>
  );
}

function Carte({
  titre,
  classe,
  lien,
  badge,
  pied,
  children,
}: {
  titre: string;
  classe?: string;
  lien?: string;
  badge?: string;
  pied?: { libelle: string; href: string };
  children: React.ReactNode;
}) {
  return (
    <section className={`v2-carte v2-pm-carte${classe ? ` ${classe}` : ""}`} aria-label={titre}>
      <div className="v2-pm-tete">
        <h2>{titre}</h2>
        {badge ? <span className="v2-pm-badge">{badge}</span> : null}
        {lien ? (
          <Link href={lien} className="v2-pm-kebab" aria-label={`Ouvrir : ${titre}`}>
            <MoreVertical width={16} height={16} aria-hidden="true" />
          </Link>
        ) : null}
      </div>
      <div className="v2-pm-corps">{children}</div>
      {pied ? (
        <div className="v2-pm-pied">
          <Link href={pied.href} className="v2-pm-action">
            {pied.libelle} <ArrowUpRight width={14} height={14} aria-hidden="true" />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
