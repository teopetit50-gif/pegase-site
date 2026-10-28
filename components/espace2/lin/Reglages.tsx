"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le modèle « réglages » de Plain (page Settings), au 1:1 — 28/10/2026

   Les briques partagées d'une page de réglages :
     · la vue d'ensemble (titre, sous-titre, sections de cartes icône ·
       titre · description, deux colonnes) ; une carte ouvre sa sous-page
       sur la même route (?section=…) ;
     · la sous-page (lien retour, titre, sous-titre, blocs titrés) ;
     · les champs (libellé, aide, contrôle de 40), la case à cocher, les
       boutons (plein / cerclé, 40 ou 34), la carte encadrée, l'état vide,
       la liste encadrée (lignes de 72), l'étiquette d'état, le segmenté,
       la bande de compteurs.
   Mesures : ./plain-reglages.css (relevé scratchpad/releve-plain-reglages.md).
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import "./lin.css";
import "./plain-reglages.css";

/* ——— la vue d'ensemble ——— */
export type CarteReglage = {
  cle: string;
  icone: React.ReactNode;
  titre: string;
  description: string;
  href: string;
  /* un complément à droite du titre (compteur, étiquette) */
  apres?: React.ReactNode;
};
export type SectionReglage = { cle: string; titre: string; description: string; cartes: CarteReglage[] };

export function TeteReglages({ titre, sousTitre, retour, droite }: { titre: string; sousTitre: string; retour?: { href: string; libelle: string }; droite?: React.ReactNode }) {
  return (
    <>
      {retour ? (
        <Link href={retour.href} className="pr-retour" scroll={false}>
          <ArrowLeft aria-hidden="true" />
          {retour.libelle}
        </Link>
      ) : null}
      <header className="pr-tete">
        <div>
          <h1 className="pr-h1">{titre}</h1>
          <p className="pr-sous">{sousTitre}</p>
        </div>
        {droite ? <div className="pr-tete-droite">{droite}</div> : null}
      </header>
    </>
  );
}

export function VueEnsembleReglages({ titre, sousTitre, sections, avant }: { titre: string; sousTitre: string; sections: SectionReglage[]; avant?: React.ReactNode }) {
  return (
    <div className="lin pr">
      <div className="pr-page">
        <TeteReglages titre={titre} sousTitre={sousTitre} />
        {avant}
        <div className="pr-sections">
          {sections.map((s) => (
            <section key={s.cle} className="pr-section" aria-labelledby={`pr-section-${s.cle}`}>
              <div className="pr-section-tete">
                <h2 id={`pr-section-${s.cle}`}>{s.titre}</h2>
                <p>{s.description}</p>
              </div>
              <div className="pr-grille">
                {s.cartes.map((c) => (
                  <Link key={c.cle} href={c.href} className="pr-carte" scroll={false}>
                    <span className="pr-carte-icone" aria-hidden="true">
                      {c.icone}
                    </span>
                    <span className="pr-carte-texte">
                      <span className="pr-carte-titre">
                        {c.titre}
                        {c.apres}
                      </span>
                      <p className="pr-carte-desc">{c.description}</p>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ——— une sous-page ——— */
export function SousPageReglages({ retour, titre, sousTitre, droite, children }: { retour: { href: string; libelle: string }; titre: string; sousTitre: string; droite?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="lin pr">
      <div className="pr-page">
        <TeteReglages titre={titre} sousTitre={sousTitre} retour={retour} droite={droite} />
        {children}
      </div>
    </div>
  );
}

/* un bloc titré (« Slack », « Discord » chez Plain) : icône 18 + titre 20/400 */
export function BlocReglages({ icone, titre, description, children }: { icone?: React.ReactNode; titre: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="pr-bloc" aria-label={titre}>
      <div className="pr-bloc-titre">
        {icone}
        <h3>{titre}</h3>
      </div>
      {description ? <p className="pr-bloc-desc">{description}</p> : null}
      {children}
    </section>
  );
}

/* ——— les champs ——— */
export function ChampReglage({ libelle, aide, obligatoire, children }: { libelle: string; aide?: string; obligatoire?: boolean; children: React.ReactNode }) {
  return (
    <label className="pr-champ">
      <span className="pr-libelle">
        {libelle}
        {obligatoire ? <span className="pr-note">(obligatoire)</span> : null}
      </span>
      {aide ? <p className="pr-aide">{aide}</p> : null}
      <span className="pr-controle">{children}</span>
    </label>
  );
}
export function SelectReglage({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <>
      <select className="pr-select" {...props}>
        {children}
      </select>
      <ChevronDown className="pr-select-chevron" aria-hidden="true" />
    </>
  );
}
export function CaseReglage({ libelle, aide, ...props }: { libelle: string; aide?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="pr-case">
      <input type="checkbox" {...props} />
      <span>
        <span className="pr-libelle">{libelle}</span>
        {aide ? <span className="pr-aide">{aide}</span> : null}
      </span>
    </label>
  );
}

/* ——— les boutons : 40 (plein ou cerclé) ; `petit` = 34 avec icône ——— */
export function BoutonReglage({ plein, petit, icone, className, children, ...props }: { plein?: boolean; petit?: boolean; icone?: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const classes = ["pr-btn", plein ? "pr-btn--plein" : "", petit ? "pr-btn--34" : "", petit && !icone ? "pr-btn--sans-icone" : "", className ?? ""].filter(Boolean).join(" ");
  return (
    <button type="button" className={classes} {...props}>
      {icone}
      {children}
    </button>
  );
}

/* ——— la carte encadrée et l'état vide ——— */
export function CadreReglage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={["pr-cadre", className ?? ""].filter(Boolean).join(" ")}>{children}</div>;
}
export function VideReglage({ icone, titre, texte, action }: { icone: React.ReactNode; titre: string; texte: string; action?: React.ReactNode }) {
  return (
    <div className="pr-cadre pr-vide" role="status">
      <span className="pr-vide-icone" aria-hidden="true">
        {icone}
      </span>
      <div className="pr-vide-texte">
        <strong>{titre}</strong>
        <p>{texte}</p>
      </div>
      {action}
    </div>
  );
}

/* ——— la liste encadrée ——— */
export function BoiteReglage({ children, libelle }: { children: React.ReactNode; libelle: string }) {
  return (
    <ul className="pr-boite" aria-label={libelle} style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {children}
    </ul>
  );
}
export function LigneReglage({ avatar, nom, second, droite, suite }: { avatar?: React.ReactNode; nom: React.ReactNode; second?: React.ReactNode; droite?: React.ReactNode; suite?: React.ReactNode }) {
  return (
    <>
      <li className="pr-ligne">
        {avatar ? <span className="pr-avatar">{avatar}</span> : null}
        <span className="pr-ligne-texte">
          <span className="pr-ligne-nom">{nom}</span>
          {second ? <span className="pr-ligne-second">{second}</span> : null}
        </span>
        {droite ? <span className="pr-ligne-droite">{droite}</span> : null}
      </li>
      {suite ? <li className="pr-ligne-suite">{suite}</li> : null}
    </>
  );
}
export function BadgeReglage({ teinte, contour, children }: { teinte?: "vert" | "bleu" | "ambre" | "gris"; contour?: boolean; children: React.ReactNode }) {
  return (
    <span className={["pr-badge", contour ? "pr-badge--contour" : ""].filter(Boolean).join(" ")} data-teinte={teinte}>
      {children}
    </span>
  );
}

/* ——— le segmenté et la bande de compteurs ——— */
export function SegmenteReglage<T extends string>({ valeur, options, onChange, libelle }: { valeur: T; options: { cle: T; libelle: string }[]; onChange: (v: T) => void; libelle: string }) {
  return (
    <div className="pr-segmente" role="group" aria-label={libelle}>
      {options.map((o) => (
        <button key={o.cle} type="button" aria-pressed={valeur === o.cle} onClick={() => onChange(o.cle)}>
          {o.libelle}
        </button>
      ))}
    </div>
  );
}
export function CompteursReglage({ items }: { items: { cle: string; nombre: number; libelle: string }[] }) {
  return (
    <div className="pr-compteurs" role="list">
      {items.map((c) => (
        <div key={c.cle} className="pr-compteur" role="listitem">
          <b>{c.nombre}</b>
          <span>{c.libelle}</span>
        </div>
      ))}
    </div>
  );
}
