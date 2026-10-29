"use client";

/* ══════════════════════════════════════════════════════════════════════
   La frise de DALIRO (29/10/2026) : la page Projects de Linear en
   affichage « Timeline », au 1:1 (relevé : docs/refonte-metiers/releves/
   linear-timeline.md ; briques : ../lin/linear-timeline.css, ltl-).

   Partagée par Chantiers (une ligne par chantier, une barre du début à la
   fin prévue) et Équipes (une ligne par intervenant, une barre par passage
   et par absence). La page fournit les lignes ; la frise calcule l'échelle,
   les mois, les repères de jours, la ligne d'aujourd'hui, place les barres
   et leurs libellés (au-dessus, ou dessous quand deux se chevauchent).

   Zoom Mois / Trimestre / Année (le bouton « Year ▾ » de Linear), choisi
   par la page (gardé dans l'adresse). À 640 px de colonne et moins, la
   frise laisse la place à une liste, comme Linear sur un téléphone.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { ArrowRight, Check, ChevronDown } from "lucide-react";
import { Menu } from "../lin/Lin";
import "../lin/lin.css";
import "../lin/linear-timeline.css";

export type Zoom = "mois" | "trimestre" | "annee";
/* px par jour, et un repère de jour tous les `pas` jours (Année : relevé, 77,5 px le mois, un repère tous les 14 jours) */
export const ZOOMS: { cle: Zoom; libelle: string; px: number; pas: number }[] = [
  { cle: "mois", libelle: "Mois", px: 24, pas: 1 },
  { cle: "trimestre", libelle: "Trimestre", px: 7.5, pas: 7 },
  { cle: "annee", libelle: "Année", px: 2.5, pas: 14 },
];
export const estZoom = (v: string | null): v is Zoom => v === "mois" || v === "trimestre" || v === "annee";

export type TeinteFrise = "rouge" | "ambre" | "bleu" | "vert" | "gris";

export type BarreFrise = {
  cle: string;
  /* null : la barre part du bord gauche (bord ouvert, comme une barre sans date de début chez Linear) */
  debut: string | null;
  /* null : la barre court jusqu'au bord droit */
  fin: string | null;
  libelle: string;
  meta?: string;
  teinte?: TeinteFrise;
  /* une absence : hachurée, sous les passages */
  hachure?: boolean;
  /* un losange posé sur la barre (le prochain passage d'un chantier) */
  jalon?: { jour: string; teinte?: TeinteFrise; titre: string } | null;
  titre: string;
  href?: string;
  onClick?: () => void;
};

export type LigneFrise = {
  cle: string;
  icone: React.ReactNode;
  teinteIcone?: TeinteFrise;
  nom: string;
  href?: string;
  /* les ronds de 28 à droite du nom (santé, statut, priorité, responsable chez Linear) */
  ronds: React.ReactNode;
  /* liste étroite : la pilule après le nom, et les barres en puces sous la ligne */
  pilule?: string;
  puces?: boolean;
  barres: BarreFrise[];
};

const JOUR = 86_400_000;
const GAUCHE = 320;
const MOIS = ["Jan", "Fév", "Mars", "Avr", "Mai", "Juin", "Juil", "Août", "Sept", "Oct", "Nov", "Déc"];

/* les jours comptés en jours UTC : pas d'heure d'été qui décale une barre */
const jourNum = (iso: string) => {
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return Math.floor(Date.UTC(a, (m || 1) - 1, j || 1) / JOUR);
};
const dateDe = (n: number) => new Date(n * JOUR);
const debutDuMois = (n: number) => {
  const d = dateDe(n);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / JOUR);
};
const finDuMois = (n: number) => {
  const d = dateDe(n);
  return Math.floor(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0) / JOUR);
};
/* largeur estimée d'un libellé 13/500 (Inter : ~7 px par signe) */
const largeurTexte = (b: BarreFrise) => Math.round(b.libelle.length * 7 + (b.meta ? 6 + b.meta.length * 6.4 : 0) + 4);

export default function Frise({
  libelle,
  lignes,
  zoom,
  onZoom,
  aujourdhui,
  vide,
}: {
  libelle: string;
  lignes: LigneFrise[];
  zoom: Zoom;
  onZoom: (z: Zoom) => void;
  /* AAAA-MM-JJ, le jour de la visite */
  aujourdhui: string;
  vide?: React.ReactNode;
}) {
  const echelle = ZOOMS.find((z) => z.cle === zoom) ?? ZOOMS[2];
  const { px, pas } = echelle;
  const zone = useRef<HTMLDivElement>(null);
  const auj = jourNum(aujourdhui);

  /* la fenêtre : un mois avant la première date, deux après la dernière, au moins 2 400 px de frise */
  const { debut, fin } = useMemo(() => {
    let min = auj;
    let max = auj;
    for (const l of lignes)
      for (const b of l.barres)
        for (const d of [b.debut, b.fin, b.jalon?.jour])
          if (d) {
            const n = jourNum(d);
            if (n < min) min = n;
            if (n > max) max = n;
          }
    const d0 = debutDuMois(min - 30);
    let f0 = finDuMois(max + 60);
    while ((f0 - d0 + 1) * px < 2400) f0 = finDuMois(f0 + 1);
    return { debut: d0, fin: f0 };
  }, [lignes, auj, px]);
  const jours = fin - debut + 1;
  const largeur = jours * px;
  const x = (n: number) => (n - debut) * px;
  const xAuj = x(auj) + px / 2;

  const mois = useMemo(() => {
    const r: { cle: number; x: number; nom: string; annee: number }[] = [];
    for (let n = debut; n <= fin; n = finDuMois(n) + 1) {
      const d = dateDe(n);
      r.push({ cle: n, x: (n - debut) * px, nom: MOIS[d.getUTCMonth()], annee: d.getUTCFullYear() });
    }
    return r;
  }, [debut, fin, px]);
  const reperes = useMemo(() => {
    const r: { cle: number; x: number; jour: number }[] = [];
    for (let n = debut; n <= fin; n += pas) {
      const cx = (n - debut) * px + px / 2;
      /* la pastille d'aujourd'hui (48 de large) cache les repères qui la touchent */
      if (Math.abs(cx - ((auj - debut) * px + px / 2)) < 30) continue;
      r.push({ cle: n, x: cx, jour: dateDe(n).getUTCDate() });
    }
    return r;
  }, [debut, fin, pas, px, auj]);

  /* à l'ouverture et à chaque zoom : aujourd'hui au tiers de la zone visible */
  const placer = (doux: boolean) => {
    const el = zone.current;
    if (!el) return;
    const visible = Math.max(0, el.clientWidth - GAUCHE);
    el.scrollTo({ left: Math.max(0, xAuj - visible * 0.35), behavior: doux ? "smooth" : "auto" });
  };
  const pleine = lignes.length > 0;
  useEffect(() => {
    const el = zone.current;
    if (!el) return;
    const visible = Math.max(0, el.clientWidth - GAUCHE);
    el.scrollLeft = Math.max(0, xAuj - visible * 0.35);
  }, [xAuj, pleine]);

  /* les barres d'une ligne : position, et libellés rangés sur deux voies (dessus, dessous) */
  const place = (l: LigneFrise) => {
    const barres = l.barres
      .map((b) => {
        const x0 = b.debut ? x(jourNum(b.debut)) : 0;
        const x1 = b.fin ? x(jourNum(b.fin) + 1) : largeur;
        return { b, x0: Math.max(0, x0), l: Math.max(8, Math.min(largeur, x1) - Math.max(0, x0)) };
      })
      .filter((p) => p.x0 < largeur)
      .sort((a, z) => Number(!!z.b.hachure) - Number(!!a.b.hachure) || a.x0 - z.x0);
    const voies: { fin: number; prec: number | null }[] = [
      { fin: -Infinity, prec: null },
      { fin: -Infinity, prec: null },
    ];
    const libelles = barres.map(() => ({ dessous: false, max: undefined as number | undefined }));
    const ordre = barres.map((_, i) => i).sort((a, z) => barres[a].x0 - barres[z].x0);
    for (const i of ordre) {
      const p = barres[i];
      const v = p.x0 >= voies[0].fin + 8 ? 0 : p.x0 >= voies[1].fin + 8 ? 1 : voies[0].fin <= voies[1].fin ? 0 : 1;
      const prec = voies[v].prec;
      if (prec !== null) {
        const dispo = p.x0 - barres[prec].x0 - 8;
        const avant = libelles[prec].max;
        libelles[prec].max = avant === undefined ? dispo : Math.min(avant, dispo);
      }
      libelles[i].dessous = v === 1;
      voies[v] = { fin: p.x0 + largeurTexte(p.b), prec: i };
    }
    return barres.map((p, i) => ({ ...p, ...libelles[i] }));
  };

  const commandes = (
    <div className="ltl-commandes">
      <button type="button" className="ltl-commande" onClick={() => placer(true)}>
        Aujourd&apos;hui
      </button>
      <Menu
        largeur={180}
        bouton={(ouvert, basculer) => (
          <button type="button" className="ltl-commande" aria-haspopup="menu" aria-expanded={ouvert} aria-label={`Zoom : ${echelle.libelle}`} onClick={basculer}>
            {echelle.libelle}
            <ChevronDown aria-hidden="true" />
          </button>
        )}
      >
        {(fermer) => (
          <div role="menu" aria-label="Zoom de la frise">
            {ZOOMS.map((z) => (
              <button
                key={z.cle}
                type="button"
                role="menuitemradio"
                aria-checked={z.cle === zoom}
                className="lin-menu-option"
                onClick={() => {
                  fermer();
                  onZoom(z.cle);
                }}
              >
                {z.libelle}
                {z.cle === zoom ? <Check aria-hidden="true" /> : null}
              </button>
            ))}
          </div>
        )}
      </Menu>
    </div>
  );

  const nomEtIcone = (l: LigneFrise, ouvrir: boolean) => (
    <>
      <span className="ltl-icone" data-teinte={l.teinteIcone} aria-hidden="true">
        {l.icone}
      </span>
      <span className="ltl-nom-texte">{l.nom}</span>
      {ouvrir && l.href ? (
        <span className="ltl-ouvrir" aria-hidden="true">
          <ArrowRight />
        </span>
      ) : null}
    </>
  );

  const barre = (p: { b: BarreFrise; x0: number; l: number }, puce: boolean) => {
    const { b } = p;
    const style = puce ? undefined : { left: p.x0, width: p.l };
    const cls = puce ? "ltl-puce" : "ltl-barre";
    const attrs = {
      className: cls,
      style,
      "data-teinte": b.teinte,
      "data-hachure": b.hachure ? "" : undefined,
      "data-ouvert": puce ? undefined : !b.debut ? "gauche" : !b.fin ? "droite" : undefined,
      title: b.titre,
      "aria-label": b.titre,
    };
    const jalon =
      !puce && b.jalon ? (
        <span className="ltl-jalon" data-teinte={b.jalon.teinte} style={{ left: Math.min(p.l - 4, Math.max(4, x(jourNum(b.jalon.jour)) + px / 2 - p.x0)) }} title={b.jalon.titre} aria-hidden="true" />
      ) : null;
    const contenu = puce ? `${b.libelle}${b.meta ? ` · ${b.meta}` : ""}` : jalon;
    if (b.href)
      return (
        <Link key={b.cle} href={b.href} {...attrs}>
          {contenu}
        </Link>
      );
    if (b.onClick)
      return (
        <button key={b.cle} type="button" onClick={b.onClick} {...attrs}>
          {contenu}
        </button>
      );
    return (
      <span key={b.cle} role="img" {...attrs}>
        {contenu}
      </span>
    );
  };

  if (!lignes.length) return <div className="ltl">{vide}</div>;

  return (
    <div className="ltl">
      {commandes}
      <div className="ltl-frise" ref={zone} role="region" aria-label={libelle} tabIndex={0}>
        <div className="ltl-toile" style={{ width: GAUCHE + largeur }}>
          <div className="ltl-traits" style={{ width: largeur }} aria-hidden="true">
            {mois.map((m) => (
              <span key={m.cle} className="ltl-trait-mois" style={{ left: m.x - 1 }} />
            ))}
            <span className="ltl-trait-jour" style={{ left: xAuj }} />
          </div>

          <div className="ltl-entete" aria-hidden="true">
            <div className="ltl-coin" />
            <div className="ltl-reperes" style={{ width: largeur }}>
              {mois.map((m) => (
                <span key={m.cle}>
                  <span className="ltl-trait-mois" style={{ left: m.x - 1 }} />
                  <span className="ltl-mois" style={{ left: m.x }}>
                    <span>{m.nom}</span>
                    <span>{m.annee}</span>
                  </span>
                </span>
              ))}
              {reperes.map((r) => (
                <span key={r.cle} className="ltl-jour" style={{ left: r.x }}>
                  {r.jour}
                </span>
              ))}
              <span className="ltl-pastille-jour" style={{ left: xAuj }}>
                {dateDe(auj).getUTCDate()} {MOIS[dateDe(auj).getUTCMonth()]}
              </span>
            </div>
          </div>

          <ul className="ltl-lignes">
            {lignes.map((l) => (
              <li key={l.cle} className="ltl-ligne">
                <div className="ltl-gauche">
                  <div className="ltl-gauche-bloc">
                    {l.href ? (
                      <Link href={l.href} className="ltl-nom" title={l.nom}>
                        {nomEtIcone(l, true)}
                      </Link>
                    ) : (
                      <span className="ltl-nom" title={l.nom}>
                        {nomEtIcone(l, false)}
                      </span>
                    )}
                    <span className="ltl-ronds">{l.ronds}</span>
                  </div>
                </div>
                <div className="ltl-piste" style={{ width: largeur }}>
                  {place(l).map((p) => (
                    <span key={p.b.cle}>
                      <span className="ltl-libelle" data-dessous={p.dessous ? "" : undefined} style={{ left: p.x0, maxWidth: p.max !== undefined ? Math.max(0, p.max) : undefined }} aria-hidden="true">
                        <span>{p.b.libelle}</span>
                        {p.b.meta ? <span className="ltl-libelle-meta">{p.b.meta}</span> : null}
                      </span>
                      {barre(p, false)}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <ul className="ltl-liste" aria-label={libelle}>
        {lignes.map((l) => {
          const corps = (
            <>
              <span className="ltl-icone" data-teinte={l.teinteIcone} aria-hidden="true">
                {l.icone}
              </span>
              <span className="ltl-nom-texte">{l.nom}</span>
              {l.pilule ? <span className="ltl-pilule">{l.pilule}</span> : <span />}
            </>
          );
          return (
            <li key={l.cle}>
              {l.href ? (
                <Link href={l.href} className="ltl-liste-ligne">
                  {corps}
                  <span className="ltl-ronds">{l.ronds}</span>
                </Link>
              ) : (
                <div className="ltl-liste-ligne">
                  {corps}
                  <span className="ltl-ronds">{l.ronds}</span>
                </div>
              )}
              {l.puces && l.barres.length ? (
                <ul className="ltl-puces">
                  {[...l.barres]
                    .sort((a, z) => (a.debut ?? "").localeCompare(z.debut ?? ""))
                    .map((b) => (
                      <li key={b.cle}>{barre({ b, x0: 0, l: 0 }, true)}</li>
                    ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
