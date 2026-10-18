"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   <MenuSobre> — un menu déroulant aux couleurs de la page (18/10/2026)

   Le <select> natif ouvre la liste du système : sur Mac, un panneau gris
   sombre qui ne ressemble à rien d'autre sur la page. Scale utilise aussi des
   <select> natifs ; ici le menu est dessiné, pour rester dans le même registre
   que les champs : 46 px, bordure fine, liste blanche, filet de sélection.

   CLAVIER ET LECTEURS D'ÉCRAN : le bouton annonce `aria-haspopup="listbox"` et
   l'état `aria-expanded`. Une fois ouvert, le focus passe sur les options ; les
   flèches, Début, Fin, Entrée, Espace et Échap fonctionnent comme dans un menu
   natif. Tab ferme le menu.

   La valeur choisie part dans un champ caché de même nom : le formulaire la lit
   comme un champ ordinaire. La validation est faite par le formulaire lui-même
   (voir FormulaireFormat), sans bulle native qui serait invisible à cause du
   champ caché.
   ══════════════════════════════════════════════════════════════════════ */

export type Choix = { valeur: string; libelle: string };

type Props = {
  nom: string;
  libelle: string;
  options: Choix[];
  erreur?: boolean;
  pleine?: boolean;
};

export default function MenuSobre({ nom, libelle, options, erreur, pleine }: Props) {
  const id = useId();
  const racine = useRef<HTMLDivElement>(null);
  const bouton = useRef<HTMLButtonElement>(null);
  const liste = useRef<HTMLUListElement>(null);
  const [ouvert, setOuvert] = useState(false);
  const [valeur, setValeur] = useState("");
  const [actif, setActif] = useState(0);

  const choisi = options.find((o) => o.valeur === valeur);

  /* un clic hors du menu le referme */
  useEffect(() => {
    if (!ouvert) return;
    const hors = (e: MouseEvent) => {
      if (!racine.current?.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener("mousedown", hors);
    return () => document.removeEventListener("mousedown", hors);
  }, [ouvert]);

  /* à l'ouverture, le focus va sur l'option active */
  useEffect(() => {
    if (ouvert) liste.current?.querySelectorAll<HTMLLIElement>("[role=option]")[actif]?.focus();
  }, [ouvert, actif]);

  function ouvrir() {
    const i = options.findIndex((o) => o.valeur === valeur);
    setActif(i >= 0 ? i : 0);
    setOuvert(true);
  }

  function fermer() {
    setOuvert(false);
    bouton.current?.focus();
  }

  function choisir(i: number) {
    setValeur(options[i].valeur);
    fermer();
  }

  /* touches sur le bouton fermé : ouvrir */
  function surBouton(e: KeyboardEvent<HTMLButtonElement>) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      ouvrir();
    }
  }

  /* touches sur la liste ouverte */
  function surListe(e: KeyboardEvent<HTMLUListElement>) {
    const dernier = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActif((a) => Math.min(dernier, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActif((a) => Math.max(0, a - 1));
        break;
      case "Home":
        e.preventDefault();
        setActif(0);
        break;
      case "End":
        e.preventDefault();
        setActif(dernier);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choisir(actif);
        break;
      case "Escape":
        e.preventDefault();
        fermer();
        break;
      case "Tab":
        setOuvert(false);
        break;
    }
  }

  return (
    <div
      ref={racine}
      className={pleine ? "rdv-champ-bloc rdv-champ-bloc--pleine rdv-menu" : "rdv-champ-bloc rdv-menu"}
      onBlur={(e) => {
        /* le focus quitte le menu : on le referme */
        if (!racine.current?.contains(e.relatedTarget as Node | null)) setOuvert(false);
      }}
    >
      <span id={`${id}-libelle`} className="rdv-sr">
        {libelle}
      </span>
      <button
        ref={bouton}
        type="button"
        id={`${id}-bouton`}
        className={`rdv-champ rdv-menu-bouton${erreur ? " rdv-champ--erreur" : ""}`}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-labelledby={`${id}-libelle ${id}-valeur`}
        onClick={() => (ouvert ? fermer() : ouvrir())}
        onKeyDown={surBouton}
      >
        <span id={`${id}-valeur`} className={choisi ? undefined : "rdv-menu-vide"}>
          {choisi ? choisi.libelle : `${libelle}*`}
        </span>
        <ChevronDown aria-hidden size={16} strokeWidth={1.6} className="rdv-menu-fleche" />
      </button>

      {ouvert ? (
        <ul
          ref={liste}
          role="listbox"
          aria-labelledby={`${id}-libelle`}
          tabIndex={-1}
          className="rdv-menu-liste"
          onKeyDown={surListe}
        >
          {options.map((o, i) => {
            const coche = o.valeur === valeur;
            return (
              <li
                key={o.valeur}
                role="option"
                aria-selected={coche}
                tabIndex={-1}
                className="rdv-menu-option"
                onClick={() => choisir(i)}
              >
                <span>{o.libelle}</span>
                {coche ? <Check aria-hidden size={16} strokeWidth={1.8} /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <input type="hidden" name={nom} value={valeur} />
      {erreur ? <p className="rdv-erreur">Ce champ est obligatoire.</p> : null}
    </div>
  );
}
