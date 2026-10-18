/* ══════════════════════════════════════════════════════════════════════
   Le rendu des pages internes d'Omega (09/10/2026)

   Les cinq documents du pilotage (stratégie, manuel, vendre, vidéos…)
   sont rangés en Markdown dans omega_pages. Ce petit moteur en fait du
   React, sans dépendance : titres, paragraphes, gras, italique, code,
   liens, listes, cases à cocher, citations, tableaux, blocs de code,
   filets. Rien d'autre — c'est tout ce que les documents utilisent.

   Les cases « - [ ] » sont cliquables : `onCase(index)` reçoit leur rang
   dans le texte, et la page réécrit le Markdown puis l'enregistre.
   ══════════════════════════════════════════════════════════════════════ */

import { Fragment, type ReactNode } from "react";

type Bloc =
  | { type: "titre"; niveau: number; texte: string }
  | { type: "paragraphe"; texte: string }
  | { type: "liste"; ordonnee: boolean; items: { texte: string; coche: boolean | null; rang: number | null }[] }
  | { type: "citation"; lignes: string[] }
  | { type: "tableau"; tete: string[]; lignes: string[][] }
  | { type: "code"; langue: string; texte: string }
  | { type: "filet" };

const RE_CASE = /^(\s*)[-*] \[( |x|X)\] (.*)$/;
const RE_PUCE = /^\s*[-*] (.*)$/;
const RE_NUMERO = /^\s*\d+[.)] (.*)$/;

const cellules = (ligne: string) =>
  ligne
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));

export function analyser(source: string): Bloc[] {
  const lignes = source.replace(/\r\n?/g, "\n").split("\n");
  const blocs: Bloc[] = [];
  let rangCase = 0;
  let i = 0;
  while (i < lignes.length) {
    const l = lignes[i];
    if (!l.trim()) {
      i++;
      continue;
    }
    const fence = l.match(/^```(\w*)/);
    if (fence) {
      const corps: string[] = [];
      i++;
      while (i < lignes.length && !lignes[i].startsWith("```")) corps.push(lignes[i++]);
      i++;
      blocs.push({ type: "code", langue: fence[1], texte: corps.join("\n") });
      continue;
    }
    const titre = l.match(/^(#{1,6}) (.*)$/);
    if (titre) {
      blocs.push({ type: "titre", niveau: titre[1].length, texte: titre[2].trim() });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(l)) {
      blocs.push({ type: "filet" });
      i++;
      continue;
    }
    if (l.trim().startsWith("|") && i + 1 < lignes.length && /^\s*\|?\s*:?-{3,}/.test(lignes[i + 1])) {
      const tete = cellules(l);
      i += 2;
      const corps: string[][] = [];
      while (i < lignes.length && lignes[i].trim().startsWith("|")) corps.push(cellules(lignes[i++]));
      blocs.push({ type: "tableau", tete, lignes: corps });
      continue;
    }
    if (l.startsWith(">")) {
      const cit: string[] = [];
      while (i < lignes.length && lignes[i].startsWith(">")) cit.push(lignes[i++].replace(/^>\s?/, ""));
      blocs.push({ type: "citation", lignes: cit });
      continue;
    }
    if (RE_CASE.test(l) || RE_PUCE.test(l) || RE_NUMERO.test(l)) {
      const ordonnee = RE_NUMERO.test(l) && !RE_PUCE.test(l);
      const items: { texte: string; coche: boolean | null; rang: number | null }[] = [];
      while (i < lignes.length && (RE_CASE.test(lignes[i]) || RE_PUCE.test(lignes[i]) || RE_NUMERO.test(lignes[i]) || /^\s{2,}\S/.test(lignes[i]))) {
        const c = lignes[i].match(RE_CASE);
        if (c) items.push({ texte: c[3], coche: c[2] !== " ", rang: rangCase++ });
        else if (RE_PUCE.test(lignes[i]) || RE_NUMERO.test(lignes[i])) {
          const m = lignes[i].match(RE_PUCE) ?? lignes[i].match(RE_NUMERO);
          items.push({ texte: m![1], coche: null, rang: null });
        } else if (items.length) items[items.length - 1].texte += " " + lignes[i].trim();
        i++;
      }
      blocs.push({ type: "liste", ordonnee, items });
      continue;
    }
    const para: string[] = [l];
    i++;
    while (i < lignes.length && lignes[i].trim() && !/^(#{1,6} |```|>|\s*[-*] |\s*\d+[.)] |\|)/.test(lignes[i])) para.push(lignes[i++]);
    blocs.push({ type: "paragraphe", texte: para.join(" ") });
  }
  return blocs;
}

/* gras, italique, code, liens — dans cet ordre de priorité */
export function enLigne(texte: string, cle = "l"): ReactNode[] {
  const sortie: ReactNode[] = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\[[^\]]+\]\([^)\s]+\))|(\*[^*\s][^*]*\*)|(_[^_\s][^_]*_)/;
  let reste = texte;
  let n = 0;
  while (reste) {
    const m = reste.match(re);
    if (!m || m.index === undefined) {
      sortie.push(reste);
      break;
    }
    if (m.index > 0) sortie.push(reste.slice(0, m.index));
    const t = m[0];
    const k = `${cle}-${n++}`;
    if (m[1]) sortie.push(<code key={k}>{t.slice(1, -1)}</code>);
    else if (m[2]) sortie.push(<strong key={k}>{enLigne(t.slice(2, -2), k)}</strong>);
    else if (m[3]) {
      const lien = t.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/)!;
      const externe = /^https?:/.test(lien[2]);
      sortie.push(
        <a key={k} href={lien[2]} {...(externe ? { target: "_blank", rel: "noreferrer" } : {})}>
          {enLigne(lien[1], k)}
        </a>,
      );
    } else sortie.push(<em key={k}>{enLigne(t.slice(1, -1), k)}</em>);
    reste = reste.slice(m.index + t.length);
  }
  return sortie;
}

export function Markdown({ source, onCase }: { source: string; onCase?: (rang: number) => void }) {
  const blocs = analyser(source);
  return (
    <div className="om-md">
      {blocs.map((b, i) => {
        const k = `b${i}`;
        switch (b.type) {
          case "titre": {
            const Balise = (`h${Math.min(b.niveau + 1, 6)}`) as "h2";
            return <Balise key={k}>{enLigne(b.texte, k)}</Balise>;
          }
          case "paragraphe":
            return <p key={k}>{enLigne(b.texte, k)}</p>;
          case "filet":
            return <hr key={k} />;
          case "code":
            return (
              <pre key={k} data-langue={b.langue || undefined}>
                <code>{b.texte}</code>
              </pre>
            );
          case "citation":
            return (
              <blockquote key={k}>
                {b.lignes.map((l, j) => (l.trim() ? <p key={j}>{enLigne(l, `${k}-${j}`)}</p> : <Fragment key={j} />))}
              </blockquote>
            );
          case "tableau":
            return (
              <div key={k} className="v2-tableau-cadre om-tableau-cadre">
                <table className="v2-tableau">
                  <thead>
                    <tr>
                      {b.tete.map((c, j) => (
                        <th key={j}>{enLigne(c, `${k}-h${j}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.lignes.map((ligne, r) => (
                      <tr key={r}>
                        {ligne.map((c, j) => (
                          <td key={j}>{enLigne(c, `${k}-${r}-${j}`)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "liste": {
            const Balise = b.ordonnee ? "ol" : "ul";
            const cases = b.items.some((it) => it.coche !== null);
            return (
              <Balise key={k} className={cases ? "om-cases" : undefined}>
                {b.items.map((it, j) => (
                  <li key={j} data-coche={it.coche ? "" : undefined}>
                    {it.coche !== null ? (
                      <input
                        type="checkbox"
                        checked={it.coche}
                        disabled={!onCase}
                        onChange={() => it.rang !== null && onCase?.(it.rang)}
                        aria-label="Fait"
                      />
                    ) : null}
                    <span>{enLigne(it.texte, `${k}-${j}`)}</span>
                  </li>
                ))}
              </Balise>
            );
          }
        }
      })}
    </div>
  );
}

/* coche ou décoche la case de rang `rang` dans le Markdown */
export function basculerCase(source: string, rang: number): string {
  let n = 0;
  return source
    .split("\n")
    .map((l) => {
      const m = l.match(RE_CASE);
      if (!m) return l;
      if (n++ !== rang) return l;
      return `${m[1]}- [${m[2] === " " ? "x" : " "}] ${m[3]}`;
    })
    .join("\n");
}

/* découpe une page en sections « ## » : chacune se modifie à part */
export function sections(source: string): string[] {
  const parties: string[] = [];
  let courante: string[] = [];
  let dansCode = false;
  for (const l of source.replace(/\r\n?/g, "\n").split("\n")) {
    if (l.startsWith("```")) dansCode = !dansCode;
    if (!dansCode && /^## /.test(l) && courante.some((x) => x.trim())) {
      parties.push(courante.join("\n").trim());
      courante = [];
    }
    courante.push(l);
  }
  if (courante.some((x) => x.trim())) parties.push(courante.join("\n").trim());
  return parties;
}
