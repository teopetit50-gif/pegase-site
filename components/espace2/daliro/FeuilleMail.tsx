"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO — la feuille d'un mail, dessinée comme un vrai mail (07/11/2026,
   demande de Teo : « prends une capture d'un vrai mail pour l'afficher
   correctement, là c'est mal fait »)

   À gauche de la carte (../lin/CarteCentrale.tsx), à la place de la
   feuille-document (Feuille) : le message tel que Gmail le montre. L'objet
   en titre avec l'étiquette « Boîte de réception », puis la ligne de
   l'expéditeur — l'avatar rond à ses initiales, le nom en gras et l'adresse
   entre chevrons, la date à droite, « à contact@… » dessous —, le texte du
   message, et les pièces jointes en vignettes (une photo pour une image, la
   page rouge pour un PDF), comme sous un mail. En bas, « Répondre » amène à
   la réponse prête, « Transférer » ouvre la messagerie. Papier blanc quel
   que soit le thème, encres fixes, comme les autres feuilles de la carte.
   ══════════════════════════════════════════════════════════════════════ */

import { ChevronDown, File, FileText, Forward, Image as IconeImage, Paperclip, Reply } from "lucide-react";
import { couleurDe, initialesDe } from "../lin/ListeFils";
import { BOITE, type Mail, type PieceMail } from "./exemplesMails";

const taille = (o: number) => (o >= 1024 * 1024 ? `${(o / 1024 / 1024).toFixed(1).replace(".", ",")} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
const genre = (nom: string): "image" | "pdf" | "autre" => (/\.(jpe?g|png|gif|webp|heic)$/i.test(nom) ? "image" : /\.pdf$/i.test(nom) ? "pdf" : "autre");
/* « 7 nov. 2026, 07:42 », comme Gmail */
function quand(iso: string): string {
  const x = new Date(iso);
  if (Number.isNaN(x.getTime())) return "";
  const jour = x.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  const heure = x.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return `${jour}, ${heure}`;
}

function Vignette({ piece, i }: { piece: PieceMail; i: number }) {
  const g = genre(piece.nom);
  return (
    <li className="dal-fm-piece" data-genre={g} title="Pièce d'exemple : le fichier n'existe pas.">
      <span className="dal-fm-piece-apercu" aria-hidden="true" data-teinte={i % 3}>
        {g === "image" ? <IconeImage width={22} height={22} /> : g === "pdf" ? <FileText width={26} height={26} /> : <File width={24} height={24} />}
      </span>
      <span className="dal-fm-piece-pied">
        <span className="dal-fm-piece-icone" aria-hidden="true">
          {g === "image" ? <IconeImage width={14} height={14} /> : g === "pdf" ? <FileText width={14} height={14} /> : <Paperclip width={14} height={14} />}
        </span>
        <span className="dal-fm-piece-nom">{piece.nom}</span>
        <span className="dal-fm-piece-taille">{taille(piece.taille)}</span>
      </span>
    </li>
  );
}

export function FeuilleMail({ mail: m, envoye, repondre }: { mail: Mail; envoye: boolean; repondre?: () => void }) {
  const nom = envoye ? "Vous" : m.de_nom || m.de_adresse || "Expéditeur inconnu";
  const adresse = envoye ? BOITE : m.de_adresse;
  const a = envoye ? m.a || "" : m.a || BOITE;
  const transfert = `mailto:?subject=${encodeURIComponent(`Fwd: ${m.objet}`)}&body=${encodeURIComponent(`---------- Message transféré ----------\nDe : ${nom}${adresse ? ` <${adresse}>` : ""}\nDate : ${quand(m.recu_le)}\nObjet : ${m.objet}\nÀ : ${a}\n\n${m.corps}`)}`;
  return (
    <article className="v2-det-page dal-fm" aria-label={`Le mail « ${m.objet || "(sans objet)"} »`}>
      <header className="dal-fm-objet">
        <h2>{m.objet || "(sans objet)"}</h2>
        <span className="dal-fm-etiquette">{envoye ? "Messages envoyés" : "Boîte de réception"}</span>
      </header>
      <div className="dal-fm-expediteur">
        <span className="dal-fm-avatar" style={{ background: couleurDe(adresse || nom) }} aria-hidden="true">
          {initialesDe(nom)}
        </span>
        <div className="dal-fm-qui">
          <div className="dal-fm-qui-ligne">
            <strong>{nom}</strong>
            {adresse ? <span className="dal-fm-adresse">&lt;{adresse}&gt;</span> : null}
            <time className="dal-fm-date" dateTime={m.recu_le}>
              {quand(m.recu_le)}
            </time>
          </div>
          <div className="dal-fm-a">
            à {a}
            {m.cc ? `, cc ${m.cc}` : ""}
            <ChevronDown width={12} height={12} aria-hidden="true" />
          </div>
        </div>
      </div>
      <div className="dal-fm-corps">{m.corps.trim() || "Message sans texte."}</div>
      {m.pieces.length ? (
        <div className="dal-fm-pieces">
          <div className="dal-fm-pieces-titre">
            <Paperclip width={14} height={14} aria-hidden="true" />
            {m.pieces.length} pièce{m.pieces.length > 1 ? "s" : ""} jointe{m.pieces.length > 1 ? "s" : ""}
          </div>
          <ul className="dal-fm-pieces-liste">
            {m.pieces.map((p, i) => (
              <Vignette key={`${p.nom}-${i}`} piece={p} i={i} />
            ))}
          </ul>
        </div>
      ) : null}
      <footer className="dal-fm-gestes">
        {repondre ? (
          <button type="button" onClick={repondre}>
            <Reply width={16} height={16} aria-hidden="true" /> Répondre
          </button>
        ) : null}
        <a href={transfert}>
          <Forward width={16} height={16} aria-hidden="true" /> Transférer
        </a>
      </footer>
    </article>
  );
}
