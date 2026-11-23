"use client";

/* ══════════════════════════════════════════════════════════════════════
   OngletsAgents — un onglet par agent, et ce qu'il prépare, en direct

   ORIGINE. `tabs-illustration-vercel` de Cult UI (@cult-ui, 21st.dev,
   relevé le 23/11/2026 sur le registre) : à gauche un titre et des
   onglets empilés, dont l'actif porte une ligne qui se vide en 6 s puis
   passe au suivant ; à droite, séparée par un filet, une bulle où
   l'illustration de l'onglet se joue.

   CE QUI EST REPRIS TEL QUEL : le cycle de 6 s, la ligne de 2 px qui se
   vide, la description qui se déplie (350 ms) sous l'onglet actif, les
   trois animations (`panelIn`, `descIn`, le curseur qui clignote), la
   frappe à deux signes toutes les 16 ms, le fondu du texte en bas de
   bulle (175°, 40 % → 90 %), la bulle (rayon 24, carré d'icône de 32 px,
   ombre fine), les marges (48 / 40 px à gauche, 40 px à droite), le fond
   #fafafa et la hauteur minimale de 380 px.

   CE QUI CHANGE, et pourquoi :
   1. QUATRE ONGLETS, UN PAR AGENT, et quatre illustrations écrites pour
      eux : la relance qui se rédige, la réponse à une demande reçue le
      soir, les clients inactifs repérés un à un, la facture fournisseur
      lue ligne à ligne. La source montrait un texte, un globe et une onde
      aux couleurs de l'arc-en-ciel : rien de cela ne dit ce qu'on vend,
      et ses tracés sont son actif. Les textes des onglets viennent de
      lib/paliers (une seule source de vérité avec /tarifs).
   2. TOUTES LES BULLES ONT LA MÊME HAUTEUR (236 px). La source les tient
      en 16/9 : en français et à 390 px, une liste de cinq lignes n'y
      entre pas, et la colonne sauterait d'un onglet à l'autre.
   3. LA LISTE FINIT AVANT L'ONGLET. La barre de la source dure 8 s dans
      un onglet de 6 s : elle ne se remplit jamais. Ici 4,5 s.
   4. ELLE S'ARRÊTE QUAND ON LA REGARDE. Pointeur ou clavier sur le bloc :
      le cycle attend. Mouvement réduit : pas de défilement automatique,
      les illustrations s'affichent finies.
   5. DES BOUTONS, PAS `all: unset`. La source efface l'anneau de focus ;
      ici de vrais boutons, `aria-expanded`, et l'illustration est
      décorative (`aria-hidden`), le texte de l'onglet disant l'essentiel.
   6. EMPILÉ SOUS 768 px (la source reste en ligne et déborde).
   Les noms et les montants des illustrations sont des EXEMPLES.
   ══════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, FileText, Mail, MessageCircle, Users } from "lucide-react";
import { POSTES } from "@/lib/paliers";
import "./essai.css";

const CYCLE_MS = 6000;
const LISTE_MS = 4500;

/* le nom court de l'onglet ; le reste (nom de l'agent, phrase) vient de POSTES */
const ONGLETS: Record<string, { onglet: string; suite?: string }> = {
  cashd: { onglet: "Relances", suite: " Aucun envoi sans votre validation." },
  frontd: { onglet: "Demandes clients" },
  reload: { onglet: "Clients inactifs" },
  filed: { onglet: "Factures fournisseurs" },
};

const mouvementReduit = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ── la bulle ── */
function Coquille({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <div className="flex w-full items-end gap-3">
      <div className="eb-blanc eb-ombre eb-texte flex size-8 shrink-0 items-center justify-center rounded-lg [&>svg]:size-4">
        {icone}
      </div>
      <div className="relative min-w-0 flex-1">
        <span aria-hidden="true" className="eb-queue" />
        <div className="eb-blanc eb-ombre relative h-[236px] overflow-hidden rounded-3xl">{children}</div>
      </div>
    </div>
  );
}

/* ── un texte qui se tape ── */
function Frappe({ texte, entete }: { texte: string; entete?: ReactNode }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (mouvementReduit()) {
      const raf = requestAnimationFrame(() => setN(texte.length));
      return () => cancelAnimationFrame(raf);
    }
    let c = 0;
    const id = window.setInterval(() => {
      c = Math.min(c + 2, texte.length);
      setN(c);
      if (c >= texte.length) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [texte]);

  return (
    <div className="flex h-full items-start p-5">
      <div className="relative h-full w-full overflow-hidden">
        {entete}
        <p
          className="eb-texte m-0 text-[15px] leading-[1.65]"
          style={{
            WebkitMaskImage: "linear-gradient(175deg, black 40%, transparent 90%)",
            maskImage: "linear-gradient(175deg, black 40%, transparent 90%)",
          }}
        >
          {texte.slice(0, n)}
          {n < texte.length && <span className="eb-curseur eb-barre-curseur" />}
        </p>
      </div>
    </div>
  );
}

/* ── une avancée de 0 à 100, pour les deux listes ── */
function useAvancee(duree: number) {
  const [p, setP] = useState(0);

  useEffect(() => {
    const reduit = mouvementReduit();
    const t0 = performance.now();
    let raf = 0;
    const pas = (t: number) => {
      const v = reduit ? 100 : Math.min(100, Math.round(((t - t0) / duree) * 100));
      setP((avant) => (avant === v ? avant : v));
      if (v < 100) raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => cancelAnimationFrame(raf);
  }, [duree]);

  return p;
}

function CadreListe({ titre, p, children }: { titre: string; p: number; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col px-4 pt-3.5 pb-6">
      <div className="eb-doux mb-1.5 flex shrink-0 justify-between text-[11px] font-semibold tracking-[0.05em] uppercase">
        {titre}
        <span>Exemple</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <div className="absolute right-3 bottom-2.5 left-3">
        <div className="eb-piste h-1 overflow-hidden rounded-full">
          <div className="eb-remplit h-full rounded-full" style={{ width: `${p}%` }} />
        </div>
      </div>
    </div>
  );
}

const INACTIFS = [
  { nom: "Garage du Port", motif: "Dernier achat il y a 14 mois", seuil: 12 },
  { nom: "Cabinet Lenoir", motif: "Entretien annuel redevenu dû", seuil: 40 },
  { nom: "Bâti Sud", motif: "Commande jamais retirée", seuil: 68 },
];

function ListeInactifs() {
  const p = useAvancee(LISTE_MS);
  return (
    <CadreListe titre="Clients à recontacter" p={p}>
      {INACTIFS.filter((client) => p >= client.seuil).map((client) => {
        const pret = p >= client.seuil + 22;
        return (
          <div
            key={client.nom}
            className="eb-anim-ligne eb-trait flex h-[52px] shrink-0 items-center gap-3 border-t first:border-t-0"
          >
            <div className="flex min-w-0 flex-1 flex-col leading-[1.3]">
              <b className="truncate text-[13px] font-semibold">{client.nom}</b>
              <span className="eb-doux truncate text-xs">{client.motif}</span>
            </div>
            <span
              className={`eb-puce shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${pret ? "eb-ton-ambre" : "eb-ton-neutre"}`}
            >
              {pret ? "Message prêt" : "Analyse…"}
            </span>
          </div>
        );
      })}
    </CadreListe>
  );
}

const PIECE = [
  { champ: "Fournisseur", valeur: "Bois & Dérivés", seuil: 8 },
  { champ: "Numéro", valeur: "FA-2026-0912", seuil: 24 },
  { champ: "Montant HT", valeur: "1 240,00 €", seuil: 40 },
  { champ: "TVA 8,5 %", valeur: "105,40 €", seuil: 56 },
  { champ: "Total TTC", valeur: "1 345,40 €", seuil: 72 },
];

function ListePiece() {
  const p = useAvancee(LISTE_MS);
  return (
    <CadreListe titre="Facture lue" p={p}>
      {PIECE.filter((ligne) => p >= ligne.seuil).map((ligne) => (
        <div
          key={ligne.champ}
          className="eb-anim-ligne eb-trait flex h-[29px] shrink-0 items-center gap-3 border-t text-[13px] first:border-t-0"
        >
          <span className="eb-doux min-w-0 flex-1 truncate">{ligne.champ}</span>
          <b className="font-medium whitespace-nowrap tabular-nums">{ligne.valeur}</b>
        </div>
      ))}
      {p >= 90 && (
        <div className="eb-anim-ligne eb-trait eb-texte flex h-[29px] shrink-0 items-center gap-1.5 border-t text-xs">
          <Check size={13} strokeWidth={2.4} />
          Totaux contrôlés entre eux
        </div>
      )}
    </CadreListe>
  );
}

const RELANCE =
  "Bonjour Monsieur Costa, sauf erreur de notre part, la facture F-2041 de 2 480,00 € est arrivée à échéance le 30 septembre. Pouvez-vous nous indiquer la date de règlement prévue ? Si le virement est déjà parti, ne tenez pas compte de ce message. Nous restons à votre disposition pour tout justificatif. Bien cordialement, Atelier Bertin.";

const REPONSE =
  "Bonjour, oui, nous sommes ouverts le samedi de 8 h à 12 h. Je vous propose samedi à 9 h 30 pour votre devis. Ce créneau vous convient-il ?";

function Illustration({ id }: { id: string }) {
  if (id === "cashd")
    return (
      <Coquille icone={<Mail />}>
        <Frappe texte={RELANCE} />
      </Coquille>
    );
  if (id === "frontd")
    return (
      <Coquille icone={<MessageCircle />}>
        <Frappe
          texte={REPONSE}
          entete={
            <div className="eb-voile mb-3 rounded-xl px-3 py-2 text-[13px] leading-[1.45]">
              <span className="eb-doux block text-[11px]">Reçu à 21 h 04 · WhatsApp</span>
              Bonjour, êtes-vous ouverts samedi matin ? J&apos;aimerais passer pour un devis.
            </div>
          }
        />
      </Coquille>
    );
  if (id === "reload")
    return (
      <Coquille icone={<Users />}>
        <ListeInactifs />
      </Coquille>
    );
  return (
    <Coquille icone={<FileText />}>
      <ListePiece />
    </Coquille>
  );
}

export default function OngletsAgents({
  titre = "Quatre agents font le travail répétitif",
}: {
  titre?: string;
}) {
  const [actif, setActif] = useState(0);
  const barres = useRef<(HTMLSpanElement | null)[]>([]);
  const pause = useRef(false);

  useEffect(() => {
    const barre = barres.current[actif];
    if (mouvementReduit()) {
      if (barre) barre.style.width = "100%";
      return () => {
        if (barre) barre.style.width = "0%";
      };
    }
    let ecoule = 0;
    let dernier = performance.now();
    let raf = 0;
    const pas = (t: number) => {
      if (!pause.current) ecoule += t - dernier;
      dernier = t;
      const reste = Math.max(1 - ecoule / CYCLE_MS, 0);
      if (barre) barre.style.width = `${reste * 100}%`;
      if (reste <= 0) {
        setActif((i) => (i + 1) % POSTES.length);
        return;
      }
      raf = requestAnimationFrame(pas);
    };
    raf = requestAnimationFrame(pas);
    return () => {
      cancelAnimationFrame(raf);
      if (barre) barre.style.width = "0%";
    };
  }, [actif]);

  return (
    <div
      className="eb flex w-full flex-col overflow-hidden bg-[#fafafa] md:min-h-[380px] md:flex-row"
      onPointerEnter={() => {
        pause.current = true;
      }}
      onPointerLeave={() => {
        pause.current = false;
      }}
      onFocus={() => {
        pause.current = true;
      }}
      onBlur={() => {
        pause.current = false;
      }}
    >
      {/* à gauche : les onglets et leur phrase */}
      <div className="flex flex-1 flex-col justify-center px-6 py-8 md:px-10 md:py-12">
        <h3 className="m-0 mb-6 text-2xl leading-[1.2] font-medium tracking-[-0.03em] md:mb-9">{titre}</h3>
        <div className="flex flex-col">
          {POSTES.map((poste, index) => {
            const ouvert = index === actif;
            const { onglet, suite } = ONGLETS[poste.id];
            return (
              <div key={poste.id}>
                <button
                  type="button"
                  aria-expanded={ouvert}
                  aria-controls={`eb-agent-${poste.id}`}
                  onClick={() => setActif(index)}
                  className="block w-full cursor-pointer border-0 bg-transparent p-0 py-2.5 text-left select-none"
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={`text-base font-semibold tracking-[-0.01em] transition-colors duration-200 ${ouvert ? "eb-encre" : "eb-doux"}`}
                    >
                      {onglet}
                    </span>
                    <span
                      className={`eb-doux text-xs font-medium transition-opacity duration-200 ${ouvert ? "opacity-100" : "opacity-60"}`}
                    >
                      {poste.system}
                    </span>
                  </span>
                  <span
                    className={`mt-1 block h-0.5 overflow-hidden rounded-full transition-colors duration-200 ${ouvert ? "eb-piste" : ""}`}
                  >
                    <span
                      ref={(el) => {
                        barres.current[index] = el;
                      }}
                      className="eb-remplit block h-full rounded-full"
                      style={{ width: "0%" }}
                    />
                  </span>
                </button>
                <div
                  id={`eb-agent-${poste.id}`}
                  className="eb-deplie overflow-hidden"
                  style={{ maxHeight: ouvert ? 150 : 0, opacity: ouvert ? 1 : 0 }}
                >
                  <p
                    key={ouvert ? "ouvert" : "ferme"}
                    className={`eb-doux m-0 mb-4 max-w-[400px] text-[15px] leading-[1.6] ${ouvert ? "eb-anim-desc" : ""}`}
                  >
                    {poste.court}
                    {suite}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="eb-piste h-px w-full shrink-0 md:h-auto md:w-px md:self-stretch" />

      {/* à droite : ce que l'agent prépare */}
      <div aria-hidden="true" className="flex flex-1 flex-col items-start justify-end p-6 md:p-10">
        <div key={actif} className="eb-anim-panneau w-full">
          <Illustration id={POSTES[actif].id} />
        </div>
      </div>
    </div>
  );
}
