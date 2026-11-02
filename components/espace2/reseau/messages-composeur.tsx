"use client";

/* Réseau › Messages — le composeur, sur celui de Slack : un cadre à filet
   qui s'allume au focus, le texte au-dessus, une ligne d'outils en dessous
   (mention, envoi). Entrée envoie, Maj+Entrée va à la ligne. « @ » ouvre
   la liste des membres de la conversation (flèches, Entrée ou Tab pour
   choisir, Échap pour fermer). En données d'exemple, l'envoi reste dans
   l'état de la page. */

import { useId, useRef, useState } from "react";
import { AtSign, SendHorizontal } from "lucide-react";
import { MEMBRES } from "./membres";
import { Avatar } from "./messages-commun";

const I = { width: 16, height: 16, strokeWidth: 1.6, "aria-hidden": true } as const;

export default function Composeur({ etiquette, placeholder, membres, nomVous, envoyer, compact }: { etiquette: string; placeholder: string; membres: string[]; nomVous: string; envoyer: (texte: string) => void; compact?: boolean }) {
  const [texte, setTexte] = useState("");
  const [choix, setChoix] = useState(0);
  const [ferme, setFerme] = useState(false);
  const zone = useRef<HTMLTextAreaElement>(null);
  const idListe = useId();
  const [curseur, setCurseur] = useState(0);

  /* la mention en cours : « @mot » juste avant le curseur */
  const avant = texte.slice(0, curseur);
  const enCours = /(?:^|\s)@([\p{L}0-9-]*)$/u.exec(avant);
  const requete = enCours?.[1].toLowerCase() ?? null;
  const sansAccent = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const suggestions =
    requete === null || ferme
      ? []
      : MEMBRES.filter((m) => membres.includes(m.slug) && (sansAccent(m.nom).includes(sansAccent(requete)) || m.slug.includes(requete))).slice(0, 6);
  const ouverte = suggestions.length > 0;
  const actif = Math.min(choix, Math.max(0, suggestions.length - 1));

  const ajuster = () => {
    const z = zone.current;
    if (!z) return;
    z.style.height = "auto";
    z.style.height = `${Math.min(z.scrollHeight, 200)}px`;
  };

  const poser = (valeur: string, position: number) => {
    setTexte(valeur);
    setCurseur(position);
    requestAnimationFrame(() => {
      const z = zone.current;
      if (!z) return;
      z.focus();
      z.setSelectionRange(position, position);
      ajuster();
    });
  };

  const choisir = (slug: string) => {
    if (!enCours) return;
    const debut = curseur - enCours[1].length - 1;
    const insere = `@${slug} `;
    poser(texte.slice(0, debut) + insere + texte.slice(curseur), debut + insere.length);
    setChoix(0);
  };

  const partir = () => {
    const t = texte.trim();
    if (!t) return;
    envoyer(t);
    poser("", 0);
  };

  const mentionner = () => {
    const z = zone.current;
    const pos = z?.selectionStart ?? texte.length;
    const espace = pos > 0 && !/\s$/.test(texte.slice(0, pos)) ? " " : "";
    setFerme(false);
    poser(texte.slice(0, pos) + espace + "@" + texte.slice(pos), pos + espace.length + 1);
  };

  return (
    <div className="ms-composeur" data-compact={compact ? "" : undefined}>
      {ouverte ? (
        <ul className="ms-suggestions v2-jetons" id={idListe} role="listbox" aria-label="Mentionner un membre">
          {suggestions.map((m, i) => (
            <li
              key={m.slug}
              id={`${idListe}-${m.slug}`}
              role="option"
              aria-selected={i === actif}
              className="ms-suggestion"
              onMouseDown={(e) => {
                e.preventDefault();
                choisir(m.slug);
              }}
              onMouseEnter={() => setChoix(i)}
            >
              <Avatar slug={m.slug} nomVous={nomVous} taille={20} presence />
              <span>{m.nom}</span>
              <span className="v2-gris">{m.secteur}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea
        ref={zone}
        className="ms-saisie"
        rows={1}
        value={texte}
        aria-label={etiquette}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={ouverte}
        aria-controls={ouverte ? idListe : undefined}
        aria-autocomplete="list"
        aria-activedescendant={ouverte ? `${idListe}-${suggestions[actif].slug}` : undefined}
        onChange={(e) => {
          setTexte(e.target.value);
          setCurseur(e.target.selectionStart);
          setFerme(false);
          setChoix(0);
          ajuster();
        }}
        onSelect={(e) => setCurseur(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (ouverte) {
            if (e.key === "ArrowDown" || e.key === "ArrowUp") {
              e.preventDefault();
              const pas = e.key === "ArrowDown" ? 1 : -1;
              setChoix((actif + pas + suggestions.length) % suggestions.length);
              return;
            }
            if (e.key === "Enter" || e.key === "Tab") {
              e.preventDefault();
              choisir(suggestions[actif].slug);
              return;
            }
            if (e.key === "Escape") {
              e.preventDefault();
              setFerme(true);
              return;
            }
          }
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            partir();
          }
        }}
      />
      <div className="ms-outils">
        <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Mentionner un membre" onClick={mentionner}>
          <AtSign {...I} />
        </button>
        <span className="ms-astuce v2-gris" aria-hidden="true">
          <strong>Entrée</strong> pour envoyer, <strong>Maj + Entrée</strong> pour aller à la ligne
        </span>
        <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--primaire ms-envoyer" aria-label="Envoyer" disabled={!texte.trim()} onClick={partir}>
          <SendHorizontal {...I} />
        </button>
      </div>
    </div>
  );
}
