"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le modèle des pages de suivi (06/10/2026, C1) — la page « Usage » du
   tableau de bord de référence : un choix de période en tête, puis des
   cartes, une ligne par indicateur : sa jauge circulaire, son libellé, sa
   valeur à droite (« 1 208 € / 3 834 € »), et un détail qui se déplie.

   Réutilisable : <ChoixPeriode> et <CarteSuivi lignes=…>. Chaque page de
   suivi (temps économisé, facturé, relances…) ne fournit que ses lignes.
   ══════════════════════════════════════════════════════════════════════ */

import { useId, useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { AnneauJauge, ItemMenu, MenuDeroulant, type Teinte } from "./ui";

export type Periode = { cle: string; libelle: string; jours: number };

export const PERIODES: Periode[] = [
  { cle: "7j", libelle: "7 derniers jours", jours: 7 },
  { cle: "30j", libelle: "30 derniers jours", jours: 30 },
  { cle: "90j", libelle: "90 derniers jours", jours: 90 },
  { cle: "annee", libelle: "12 derniers mois", jours: 365 },
];

export function ChoixPeriode({ valeur, changer, periodes = PERIODES }: { valeur: Periode; changer: (p: Periode) => void; periodes?: Periode[] }) {
  return (
    <MenuDeroulant
      etiquette={`Période : ${valeur.libelle}`}
      classe="v2-btn v2-btn--petit"
      placement="bottom end"
      largeur={220}
      declencheur={
        <>
          {valeur.libelle}
          <ChevronDown width={16} height={16} aria-hidden="true" />
        </>
      }
    >
      {periodes.map((p) => (
        <ItemMenu key={p.cle} id={p.cle} onAction={() => changer(p)} suffixe={p.cle === valeur.cle ? <Check width={16} height={16} aria-label="choisie" /> : null}>
          {p.libelle}
        </ItemMenu>
      ))}
    </MenuDeroulant>
  );
}

export type LigneSuivi = {
  cle: string;
  libelle: string;
  /* la valeur de la période, et son plafond ou sa référence (la jauge) */
  valeur: number;
  plafond?: number;
  format: (n: number) => string;
  teinte?: Teinte;
  /* une phrase sous le libellé */
  aide?: string;
  /* ce qui se déplie */
  detail?: React.ReactNode;
};

export function CarteSuivi({ titre, sous, lignes }: { titre: string; sous?: string; lignes: LigneSuivi[] }) {
  return (
    <section className="v2-carte" aria-label={titre}>
      <div className="v2-suivi-tete">
        <h2 className="v2-h3">{titre}</h2>
        {sous ? <span className="v2-gris" style={{ fontSize: 13 }}>{sous}</span> : null}
      </div>
      <ul className="v2-liste">
        {lignes.map((l) => (
          <LigneDeSuivi key={l.cle} ligne={l} />
        ))}
      </ul>
    </section>
  );
}

function LigneDeSuivi({ ligne: l }: { ligne: LigneSuivi }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const part = l.plafond ? l.valeur / l.plafond : l.valeur ? 1 : 0;
  const contenu = (
    <>
      <AnneauJauge part={part} teinte={l.teinte ?? "bleu"} />
      <span className="v2-suivi-libelle">
        <span>{l.libelle}</span>
        {l.aide ? <small>{l.aide}</small> : null}
      </span>
      <span className="v2-suivi-valeur">
        {l.format(l.valeur)}
        {l.plafond !== undefined ? <span className="v2-gris"> / {l.format(l.plafond)}</span> : null}
      </span>
    </>
  );
  if (!l.detail) {
    return (
      <li className="v2-suivi-ligne">
        <span className="v2-suivi-bouton" style={{ cursor: "default" }}>
          {contenu}
          <span style={{ width: 16 }} aria-hidden="true" />
        </span>
      </li>
    );
  }
  return (
    <li className="v2-suivi-ligne">
      <button type="button" className="v2-suivi-bouton" aria-expanded={ouvert} aria-controls={id} onClick={() => setOuvert((v) => !v)}>
        {contenu}
        <ChevronRight width={16} height={16} aria-hidden="true" className="v2-lien-chevron" />
      </button>
      <div id={id} className="v2-sous-menu" data-ouvert={ouvert ? "" : undefined}>
        <div inert={!ouvert}>
          <div className="v2-suivi-detail">{l.detail}</div>
        </div>
      </div>
    </li>
  );
}

/* un détail simple : une liste libellé → valeur, avec une barre proportionnelle */
export function DetailBarres({ lignes, format }: { lignes: { libelle: string; valeur: number }[]; format: (n: number) => string }) {
  const max = Math.max(1, ...lignes.map((l) => l.valeur));
  if (!lignes.length) return <p className="v2-gris" style={{ margin: 0 }}>Rien sur la période.</p>;
  return (
    <ul className="v2-barres">
      {lignes.map((l) => (
        <li key={l.libelle}>
          <span className="v2-barres-libelle">{l.libelle}</span>
          <span className="v2-barres-rail" aria-hidden="true">
            <span style={{ width: `${(l.valeur / max) * 100}%` }} />
          </span>
          <span className="v2-tabulaire">{format(l.valeur)}</span>
        </li>
      ))}
    </ul>
  );
}
