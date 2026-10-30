"use client";

/* ══════════════════════════════════════════════════════════════════════
   La carte au milieu de l'écran (28/10/2026). Teo, en montrant la carte de
   décision d'« À valider » : « plutôt que d'ouvrir un truc sur la droite,
   ça ouvre une carte au milieu, exactement comme celle-là ». C'est donc la
   même enveloppe, avec les mêmes classes (detail-demande.css) :
     en-tête   « Module · nature », l'état, « i sur n », ‹ › et ×
     gauche    la pièce : une feuille blanche, puis son pied (référence,
               état, lien)
     droite    titre, chiffre en grand, échéance (rouge si passée), la
               fiche (dl), les blocs, les notes contre les boutons
     pied      les boutons : le geste principal en bleu, les autres à côté
   Les tableaux des troisièmes pages l'ouvrent au clic sur une carte.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import "../detail-demande.css";
import "./carte-centrale.css";

export type NavCarte = { position: number; total: number; precedente?: () => void; suivante?: () => void };

export function CarteCentrale({
  ouverte,
  fermer,
  libelle,
  sur,
  statut,
  nav,
  gauche,
  piedGauche,
  titre,
  chiffre,
  echeance,
  children,
  notes,
  actions,
}: {
  ouverte: boolean;
  fermer: () => void;
  /* le nom lu par les lecteurs d'écran */
  libelle: string;
  /* « CASHD · Envoi » */
  sur: string;
  /* l'icône et le libellé de l'état */
  statut?: React.ReactNode;
  nav?: NavCarte | null;
  /* la colonne de gauche : en général une <Feuille> */
  gauche: React.ReactNode;
  /* sous la feuille : des <div className="v2-det-document-ligne"> */
  piedGauche?: React.ReactNode;
  titre: React.ReactNode;
  chiffre?: React.ReactNode;
  echeance?: { texte: string; urgence?: "retard" | "aujourdhui" } | null;
  /* le corps de droite : <dl className="v2-det-fiche">, <div className="v2-det-bloc">… */
  children?: React.ReactNode;
  notes?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  /* ← → passent d'une carte à l'autre, comme dans « À valider » (hors champs) */
  useEffect(() => {
    if (!ouverte || !nav) return;
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (cible?.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft" && nav.precedente) {
        e.preventDefault();
        nav.precedente();
      } else if (e.key === "ArrowRight" && nav.suivante) {
        e.preventDefault();
        nav.suivante();
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [ouverte, nav]);

  return (
    <ModalOverlay isOpen={ouverte} onOpenChange={(o) => !o && fermer()} isDismissable className="v2-jetons v2-voile v2-voile--carte">
      <Modal className="v2-modale v2-val-carte">
        <Dialog className="v2-modale-dialogue" aria-label={libelle}>
          <div className="v2-det">
            <header className="v2-det-carte-tete">
              <div className="v2-det-ou">
                <span className="v2-det-sur">{sur}</span>
                {statut ? <span className="v2-det-statut">{statut}</span> : null}
              </div>
              <div className="v2-det-carte-outils">
                {nav ? (
                  <>
                    <span className="v2-det-position" aria-live="polite">
                      {nav.position} sur {nav.total}
                    </span>
                    <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Précédente" disabled={!nav.precedente} onClick={() => nav.precedente?.()}>
                      <ChevronLeft width={16} height={16} aria-hidden="true" />
                    </button>
                    <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Suivante" disabled={!nav.suivante} onClick={() => nav.suivante?.()}>
                      <ChevronRight width={16} height={16} aria-hidden="true" />
                    </button>
                  </>
                ) : null}
                <button type="button" className="v2-btn v2-btn--petit v2-btn--icone v2-btn--fantome" aria-label="Fermer" onClick={fermer}>
                  <X width={16} height={16} aria-hidden="true" />
                </button>
              </div>
            </header>

            <div className="v2-det-carte-corps">
              <aside className="v2-det-document" aria-label="La pièce">
                <div className="v2-det-document-pages">
                  <div className="v2-det-liasse">{gauche}</div>
                </div>
                {piedGauche ? <footer className="v2-det-document-pied">{piedGauche}</footer> : null}
              </aside>

              <section className="v2-det-decision" aria-label="Le détail">
                <div className="v2-det-decision-corps">
                  <h2 className="v2-det-titre">{titre}</h2>
                  {chiffre || echeance ? (
                    <div className="v2-det-chiffre">
                      {chiffre ? <span className="v2-det-montant">{chiffre}</span> : null}
                      {echeance ? (
                        <span className="v2-det-echeance" data-urgence={echeance.urgence}>
                          <Clock width={14} height={14} aria-hidden="true" />
                          {echeance.texte}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  {children}
                </div>
                <div className="v2-det-fondu" aria-hidden="true" />
                {notes ? <div className="v2-det-notes">{notes}</div> : null}
                {actions ? <div className="v2-det-actions">{actions}</div> : null}
              </section>
            </div>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

/* la feuille blanche de gauche, à la manière de la facture d'« À valider » : un titre en capitales,
   une référence, un nom, puis soit des lignes « libellé · valeur », soit un texte (une lettre, une
   réponse), et un total. Les vraies valeurs, jamais de traits de remplissage quand on a le texte. */
export function Feuille({
  titre,
  sous,
  nom,
  sousNom,
  lignes,
  texte,
  total,
}: {
  titre: string;
  sous?: string | null;
  nom?: string | null;
  sousNom?: string[];
  lignes?: [string, string][];
  texte?: string | null;
  total?: [string, string] | null;
}) {
  return (
    <div className="v2-det-page v2-det-feuille lin-feuille">
      <div className="v2-det-feuille-tete">
        <div className="v2-det-feuille-titre">{titre}</div>
        <div className="v2-det-feuille-sous">{sous ?? ""}</div>
      </div>
      {nom || sousNom?.length ? (
        <div className="v2-det-feuille-fournisseur">
          {nom ? <div className="v2-det-feuille-nom">{nom}</div> : null}
          {(sousNom ?? []).map((s) => (
            <div key={s} className="lin-feuille-petit">
              {s}
            </div>
          ))}
        </div>
      ) : null}
      {texte ? (
        <div className="lin-feuille-texte">{texte}</div>
      ) : (
        <div className="v2-det-feuille-lignes lin-feuille-lignes">
          {(lignes ?? []).map(([l, v]) => (
            <div key={l} className="v2-det-feuille-ligne lin-feuille-ligne">
              <span>{l}</span>
              <span>{v}</span>
            </div>
          ))}
        </div>
      )}
      {total ? (
        <div className="v2-det-feuille-total">
          <span>{total[0]}</span>
          <span>{total[1]}</span>
        </div>
      ) : null}
    </div>
  );
}
