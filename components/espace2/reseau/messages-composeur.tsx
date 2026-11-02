"use client";

/* Réseau › Messages — le composeur.

   CONTENU : le composeur de Zulip (zulip.com/help/direct-messages,
   zulip.com/help/mention-a-user-or-group) : on écrit dans une
   conversation précise (« Message # salon › sujet », ou à un membre) ;
   dans un salon, on ouvre un nouveau sujet en lui donnant un titre ;
   « @ » suivi de quelques lettres propose les membres, on choisit au
   clavier ou à la souris. Entrée envoie, Maj + Entrée va à la ligne.

   HABILLAGE : le composeur des fiches des moteurs (lin-ticket-composeur :
   rayon 8, padding 12 16, texte 15/24, bouton rond de 28 en bas à droite).
   En données d'exemple, l'envoi reste dans l'état de la page. */

import { useId, useRef, useState } from "react";
import { ArrowUp, AtSign } from "lucide-react";
import { MEMBRES } from "./membres";
import { Avatar } from "./messages-commun";

const sansAccent = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();

export default function Composeur({
  etiquette,
  placeholder,
  membres,
  nomVous,
  envoyer,
  avecTitre,
}: {
  etiquette: string;
  placeholder: string;
  /** les membres proposés après « @ » */
  membres: string[];
  nomVous: string;
  envoyer: (texte: string, titre: string) => void;
  /** ouvrir un nouveau sujet : un champ « titre » au-dessus du message */
  avecTitre?: boolean;
}) {
  const [texte, setTexte] = useState("");
  const [titre, setTitre] = useState("");
  const [choix, setChoix] = useState(0);
  const [ferme, setFerme] = useState(false);
  const [curseur, setCurseur] = useState(0);
  const zone = useRef<HTMLTextAreaElement>(null);
  const idListe = useId();

  const enCours = /(?:^|\s)@([\p{L}0-9-]*)$/u.exec(texte.slice(0, curseur));
  const requete = enCours?.[1] ?? null;
  const suggestions = requete === null || ferme ? [] : MEMBRES.filter((m) => membres.includes(m.slug) && (sansAccent(m.nom).includes(sansAccent(requete)) || m.slug.includes(requete.toLowerCase()))).slice(0, 6);
  const ouverte = suggestions.length > 0;
  const actif = Math.min(choix, Math.max(0, suggestions.length - 1));
  const pret = !!texte.trim() && (!avecTitre || !!titre.trim());

  const ajuster = () => {
    const z = zone.current;
    if (!z) return;
    z.style.height = "auto";
    z.style.height = `${Math.min(z.scrollHeight, 240)}px`;
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
    if (!pret) return;
    envoyer(texte.trim(), titre.trim());
    setTitre("");
    poser("", 0);
  };
  const mentionner = () => {
    const pos = zone.current?.selectionStart ?? texte.length;
    const espace = pos > 0 && !/\s$/.test(texte.slice(0, pos)) ? " " : "";
    setFerme(false);
    poser(texte.slice(0, pos) + espace + "@" + texte.slice(pos), pos + espace.length + 1);
  };

  return (
    <div className="lin-ticket-composeur ms-composeur">
      {avecTitre ? <input className="ms-composeur-titre" value={titre} onChange={(e) => setTitre(e.target.value)} placeholder="Titre du sujet" aria-label="Titre du nouveau sujet" maxLength={80} /> : null}
      {ouverte ? (
        <ul className="lin-menu ms-suggestions" id={idListe} role="listbox" aria-label="Mentionner un membre">
          {suggestions.map((m, i) => (
            <li
              key={m.slug}
              id={`${idListe}-${m.slug}`}
              role="option"
              aria-selected={i === actif}
              className="lin-menu-option ms-suggestion"
              onMouseDown={(e) => {
                e.preventDefault();
                choisir(m.slug);
              }}
              onMouseEnter={() => setChoix(i)}
            >
              <Avatar slug={m.slug} nomVous={nomVous} taille={18} presence />
              <span>{m.nom}</span>
              <span className="lin-meta">{m.secteur}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <textarea
        ref={zone}
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
              setChoix((actif + (e.key === "ArrowDown" ? 1 : -1) + suggestions.length) % suggestions.length);
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
      <div className="lin-ticket-composeur-pied ms-composeur-pied">
        <button type="button" className="lin-ticket-icone" aria-label="Mentionner un membre" title="Mentionner un membre" onClick={mentionner}>
          <AtSign aria-hidden="true" />
        </button>
        <span className="ms-astuce" aria-hidden="true">
          Entrée pour envoyer · Maj + Entrée pour aller à la ligne
        </span>
        <button type="button" className="lin-ticket-envoyer" aria-label={avecTitre ? "Ouvrir le sujet" : "Envoyer"} title={avecTitre ? "Ouvrir le sujet (Entrée)" : "Envoyer (Entrée)"} disabled={!pret} onClick={partir}>
          <ArrowUp width={16} height={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
