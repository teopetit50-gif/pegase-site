"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO « À ranger », sur le Triage de Linear (29/10/2026)

   Les messages du terrain (WhatsApp, SMS, courriel) que la base n'a pas su
   rattacher à un chantier : expéditeur absent de l'annuaire, aucun chantier
   nommé, ou plusieurs chantiers en cours pour lui (bloc B05 de l'inventaire,
   l'ancienne carte components/espace/daliro/ARangerCarte.tsx).

     · la liste : une ligne par message, le plus récent d'abord ; le texte
       (ou « Un vocal », « Une photo »), le canal, l'expéditeur, l'heure.
     · le message ouvert (?id=<message>) : la page d'un élément du Triage —
       le texte en titre, les propriétés en pilules (canal, expéditeur,
       reçu, pièces, chantier), les photos et vocaux, ce que le système en
       a lu, puis l'activité. Les trois gestes sont les ronds de la tête :
         Ranger dans un chantier  → rangerMessage (G05), choix parmi les
                                    chantiers ni clos ni annulés ;
         Ouvrir un avenant        → rangerMessage puis avenantDepuisMessage
                                    (G37 : la base exige un message rangé),
                                    puis le lien vers la fiche du chantier ;
         Écarter                  → ecarterMessage avec un motif (G06), après
                                    une fenêtre de confirmation.
     · rien d'ouvert : le nombre à ranger et « Ouvrir le premier » ; rien du
       tout : « Rien à ranger ».

   ↑/↓ changent de message, Échap referme. Mêmes portes que l'ancienne carte
   (portes.ts) ; sur l'exemple, son message d'exemple, modifié en mémoire
   (l'avenant ouvert entre dans le tableau du chantier par onLocal). Les
   pièces sont servies comme dans le fil (FilCarte.tsx) : une adresse signée
   de dix minutes (app/espace/daliro/actions.ts).
   Gabarit : ../lin/lin.css ; mesures propres : ../lin/linear-triage.css.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, Clock, FileSignature, HardHat, Inbox, Mail, MessageCircle, Mic, Paperclip, Smartphone, Sparkles, User, X } from "lucide-react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { ilYa } from "@/components/espace/exemples/socle";
import { dateCourte, dateHeure } from "@/components/espace/format";
import { urlSigneeMedia } from "@/app/espace/daliro/actions";
import { STATUTS_CHANTIER } from "@/components/espace/daliro/etats";
import { avenantDepuisMessage, ecarterMessage, messagesARanger, rangerMessage } from "@/components/espace/daliro/portes";
import type { Avenant, Chantier, MessageChantier, PieceMessage } from "@/components/espace/daliro/types";
import { MenuOptions, type Option } from "../lin/Lin";
import { Note } from "../ui";
import { useToast } from "../Toasts";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";
import { useDaliro } from "./donnees";
import "../lin/linear-triage.css";

const CHEMIN = `${RACINE}/daliro/a-ranger`;
const ficheAvenants = (chantier: string) => `${RACINE}/daliro/chantiers/${encodeURIComponent(chantier)}?onglet=argent#avenants`;
const CANAUX: Record<MessageChantier["canal"], string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Courriel" };
const MOTIF_MAX = 300;

/* le message d'exemple de l'ancienne carte (ARangerCarte.tsx, exemple()), repris tel quel */
function exemple(): MessageChantier[] {
  return [{
    id: "00000000-0000-4000-8000-00000000f101", reception_id: 9, chantier_id: null, canal: "whatsapp", de_nom: null, de_adresse: "33 6 •• •• •• 41",
    intervenant_id: null, tiers_id: null, texte: "Bonjour, la benne est pleine, on la fait enlever quand ?", rangement: null, statut: "a_ranger", avenant_id: null,
    recu_le: ilYa(0, 8), pieces: [{ nom: "image.jpg", mime: "image/jpeg", taille: 64000, chemin: "exemple/benne", vocal: false }],
  }];
}

/* la photo dessinée de l'exemple (la même que le fil, FilCarte.tsx) : rien n'est lu dans un vrai dépôt */
const PHOTO_EXEMPLE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#e9e6df"/><rect x="40" y="50" width="110" height="120" fill="#c9c3b6"/><rect x="58" y="68" width="74" height="84" fill="#9fb4c7"/><rect x="180" y="40" width="100" height="130" fill="#d8d2c4"/><text x="160" y="190" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#555">Photo d\'exemple</text></svg>')}`;

const auteurDe = (m: MessageChantier) => m.de_nom ?? m.de_adresse ?? "Expéditeur inconnu";
const aUnVocal = (m: MessageChantier) => m.pieces.some((p) => p.vocal);
const titreDe = (m: MessageChantier) => m.texte?.trim() || (aUnVocal(m) ? `Un vocal de ${auteurDe(m)}` : m.pieces.length ? `Une photo de ${auteurDe(m)}` : "Message sans texte");
const piecesDe = (m: MessageChantier) => {
  if (!m.pieces.length) return "Texte seul";
  const vocaux = m.pieces.filter((p) => p.vocal || (p.mime ?? "").startsWith("audio/")).length;
  const photos = m.pieces.filter((p) => (p.mime ?? "").startsWith("image/")).length;
  const autres = m.pieces.length - vocaux - photos;
  return [photos ? `${photos} photo${photos > 1 ? "s" : ""}` : "", vocaux ? `${vocaux} vocal${vocaux > 1 ? "s" : ""}` : "", autres ? `${autres} fichier${autres > 1 ? "s" : ""}` : ""].filter(Boolean).join(", ");
};
const initiales = (nom: string) =>
  nom
    .split(/\s+/)
    .filter((x) => /\p{L}/u.test(x))
    .slice(0, 2)
    .map((x) => x[0])
    .join("");
const COULEURS = ["#26b5ce", "#5e6ad2", "#4cb782", "#f2994a", "#eb5757", "#bb87fc", "#f2c94c", "#95a2b3"];
const couleurDe = (s: string) => COULEURS[[...s].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];

/* « il y a 8 h », comme le « 18min ago » de Linear */
function depuis(iso: string, maintenant: number | null): string {
  if (maintenant === null) return "";
  const ms = maintenant - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const j = Math.round(h / 24);
  if (j === 1) return "hier";
  if (j < 30) return `il y a ${j} j`;
  return dateCourte(iso);
}

function Avatar({ m, petit }: { m: MessageChantier; petit?: boolean }) {
  const nom = m.de_nom?.trim();
  const ini = nom ? initiales(nom) : "";
  if (!ini) {
    return (
      <span className={`ltr-avatar ltr-avatar--vide${petit ? " ltr-avatar--14" : ""}`} aria-hidden="true">
        <User />
      </span>
    );
  }
  return (
    <span className={`ltr-avatar${petit ? " ltr-avatar--14" : ""}`} style={{ "--ltr-teinte": couleurDe(nom!) } as React.CSSProperties} aria-hidden="true">
      {ini}
    </span>
  );
}

function IconeCanal({ canal }: { canal: MessageChantier["canal"] }) {
  return canal === "email" ? <Mail aria-hidden="true" /> : canal === "sms" ? <Smartphone aria-hidden="true" /> : <MessageCircle aria-hidden="true" />;
}

/* une pièce : la photo ou le vocal, servis par une adresse signée de dix minutes (comme le fil) */
function Piece({ piece, reelle, auteur, recu }: { piece: PieceMessage; reelle: boolean; auteur: string; recu: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const image = (piece.mime ?? "").startsWith("image/");
  const audio = (piece.mime ?? "").startsWith("audio/") || piece.vocal;

  useEffect(() => {
    if (!reelle) return;
    let vivant = true;
    void urlSigneeMedia(piece.chemin).then((r) => {
      if (!vivant) return;
      if ("url" in r) setUrl(r.url);
      else setErreur(r.erreur);
    });
    return () => {
      vivant = false;
    };
  }, [piece.chemin, reelle]);

  if (!reelle) {
    return image ? (
      // eslint-disable-next-line @next/next/no-img-element -- image d'exemple en data: URL
      <img className="ltr-photo" src={PHOTO_EXEMPLE} alt={`Photo envoyée par ${auteur} (exemple)`} />
    ) : (
      <span className="ltr-piece-texte">
        <Mic aria-hidden="true" /> {piece.vocal ? "Vocal" : piece.nom} (exemple : pas de fichier)
      </span>
    );
  }
  if (erreur) {
    return (
      <span className="ltr-piece-texte">
        <Paperclip aria-hidden="true" /> {piece.nom} : {erreur}
      </span>
    );
  }
  if (!url) return <span className="ltr-squelette" style={{ width: image ? 160 : 220, height: image ? 100 : 32 }} aria-label="Pièce en lecture" />;
  if (image) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element -- adresse signée du dépôt, dix minutes */}
        <img className="ltr-photo" src={url} alt={`Photo envoyée par ${auteur} le ${recu}`} />
      </a>
    );
  }
  if (audio) return <audio controls preload="none" src={url} aria-label={`${piece.vocal ? "Vocal" : "Audio"} de ${auteur} le ${recu}`} />;
  return (
    <a className="ltr-piece-texte" href={url} target="_blank" rel="noreferrer">
      <Paperclip aria-hidden="true" /> {piece.nom}
    </a>
  );
}

/* l'illustration du panneau vide (132 × 84) : un plateau et deux messages */
function Illustration() {
  return (
    <svg className="ltr-illustration" viewBox="0 0 132 84" fill="none" aria-hidden="true">
      <rect x="18" y="14" width="96" height="62" rx="9" stroke="currentColor" strokeOpacity="0.45" />
      <path d="M18 52h26l6 9h32l6-9h26" stroke="currentColor" strokeOpacity="0.45" />
      <rect x="34" y="4" width="64" height="14" rx="7" fill="currentColor" fillOpacity="0.14" />
      <rect x="42" y="24" width="48" height="10" rx="5" fill="currentColor" fillOpacity="0.22" />
      <rect x="48" y="38" width="36" height="8" rx="4" fill="currentColor" fillOpacity="0.14" />
    </svg>
  );
}

export default function ARanger() {
  const d = useDaliro();
  const { source, liste, onLocal, tableau, relire, relireChantier } = d;
  const reelle = source === "reelle";
  const clientId = d.client?.client_id ?? null;
  const routeur = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const maintenant = useMaintenant();
  const id = params.get("id");

  const [reel, setReel] = useState<MessageChantier[] | null>(null);
  const [erreurLecture, setErreurLecture] = useState<string | null>(null);
  const [local, setLocal] = useState<MessageChantier[]>(exemple);
  const [envoi, setEnvoi] = useState(false);
  /* Écarter : la fenêtre de confirmation et son motif */
  const [aEcarter, setAEcarter] = useState<MessageChantier | null>(null);
  const [motif, setMotif] = useState("");
  /* Ouvrir un avenant : le chantier, ce qui est demandé, puis le lien vers la fiche */
  const [aAvenant, setAAvenant] = useState<MessageChantier | null>(null);
  const [chantierAvenant, setChantierAvenant] = useState("");
  const [objet, setObjet] = useState("");
  const [avenantOuvert, setAvenantOuvert] = useState<Chantier | null>(null);
  const [erreurFenetre, setErreurFenetre] = useState<string | null>(null);
  const listeRef = useRef<HTMLUListElement>(null);

  const lire = useCallback(async () => {
    if (!clientId) return;
    try {
      setReel(await messagesARanger(clientId));
      setErreurLecture(null);
    } catch (e) {
      setErreurLecture(e instanceof Error ? e.message : "La base n'a pas répondu.");
      setReel([]);
    }
  }, [clientId]);

  useEffect(() => {
    if (!reelle) return;
    const t = window.setTimeout(() => void lire(), 0);
    return () => window.clearTimeout(t);
  }, [reelle, lire]);

  const messages = useMemo(() => [...(reelle ? (reel ?? []) : local)].sort((a, b) => b.recu_le.localeCompare(a.recu_le)), [reelle, reel, local]);
  /* en base réelle : la liste des chantiers, puis les messages ; sans compte rattaché, rien à lire */
  const chargement = reelle && (!d.pret || (!!clientId && reel === null));
  const sansCompte = reelle && d.pret && !clientId;
  const ouverts = useMemo(() => liste.filter((c) => c.statut !== "clos" && c.statut !== "annule").sort((a, b) => a.nom.localeCompare(b.nom, "fr")), [liste]);
  /* un avenant s'ouvre sur un chantier ouvert ou suspendu (G08) */
  const pourAvenant = ouverts.filter((c) => c.statut === "ouvert" || c.statut === "suspendu");
  const choisi = id ? (messages.find((m) => m.id === id) ?? null) : null;

  const lienId = useCallback(
    (x: string | null) => {
      const p = new URLSearchParams(params.toString());
      if (x) p.set("id", x);
      else p.delete("id");
      const qs = p.toString();
      return qs ? `${CHEMIN}?${qs}` : CHEMIN;
    },
    [params],
  );
  /* après un geste, le message suivant s'ouvre (comme le Triage de Linear) */
  const suivantDe = (m: MessageChantier) => {
    const i = messages.findIndex((x) => x.id === m.id);
    const reste = messages.filter((x) => x.id !== m.id);
    return reste.length ? reste[Math.min(Math.max(i, 0), reste.length - 1)].id : null;
  };

  /* ↑/↓ changent de message, Échap referme (pas quand un menu, un champ ou une fenêtre a la main) */
  const fenetreOuverte = !!aEcarter || !!aAvenant;
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || fenetreOuverte) return;
      const c = e.target as HTMLElement | null;
      if (c && (c.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(c.tagName))) return;
      if (document.querySelector(".lin-menu")) return;
      if (e.key === "Escape" && id) {
        e.preventDefault();
        routeur.replace(lienId(null), { scroll: false });
      } else if ((e.key === "ArrowDown" || e.key === "ArrowUp") && messages.length) {
        e.preventDefault();
        const i = messages.findIndex((m) => m.id === id);
        const j = e.key === "ArrowDown" ? (i < 0 ? 0 : Math.min(messages.length - 1, i + 1)) : i < 0 ? messages.length - 1 : Math.max(0, i - 1);
        routeur.replace(lienId(messages[j].id), { scroll: false });
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [fenetreOuverte, id, messages, routeur, lienId]);
  useEffect(() => {
    listeRef.current?.querySelector("[data-actif]")?.scrollIntoView({ block: "nearest" });
    /* en étroit, le message ouvert remplace la liste : il s'ouvre par le haut */
    const colonne = document.querySelector<HTMLElement>(".ltr-liste");
    if (id && colonne && getComputedStyle(colonne).display === "none") document.querySelector(".ltr-detail")?.scrollIntoView({ block: "start" });
  }, [id]);

  /* ——— Ranger (G05) : le chantier choisi dans le menu, la porte rangerMessage ——— */
  const ranger = async (m: MessageChantier, c: Chantier) => {
    if (envoi) return;
    const suivant = suivantDe(m);
    setEnvoi(true);
    try {
      if (reelle) {
        await rangerMessage(m.id, c.id);
        await lire();
        await relire();
      } else {
        setLocal((l) => l.filter((x) => x.id !== m.id));
      }
      toast(`Message rangé au chantier « ${c.nom} ».`, "vert");
      routeur.replace(lienId(suivant), { scroll: false });
    } catch (e) {
      toast(e instanceof Error ? e.message : "La base a refusé l'action.", "rouge");
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— Écarter (G06) : après confirmation, avec un motif facultatif ——— */
  const ouvrirEcarter = (m: MessageChantier) => {
    setErreurFenetre(null);
    setMotif("");
    setAEcarter(m);
  };
  const ecarter = async () => {
    const m = aEcarter;
    if (!m || envoi) return;
    const suivant = suivantDe(m);
    setEnvoi(true);
    setErreurFenetre(null);
    try {
      if (reelle) {
        await ecarterMessage(m.id, motif.trim() || null);
        await lire();
      } else {
        setLocal((l) => l.filter((x) => x.id !== m.id));
      }
      setAEcarter(null);
      toast("Message écarté.", "vert");
      routeur.replace(lienId(suivant), { scroll: false });
    } catch (e) {
      setErreurFenetre(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— Ouvrir un avenant (G37) : la base veut un message rangé, donc ranger puis ouvrir ——— */
  const ouvrirAvenantFenetre = (m: MessageChantier) => {
    setErreurFenetre(null);
    setAvenantOuvert(null);
    setObjet(m.texte?.trim() ?? "");
    setChantierAvenant(pourAvenant.length === 1 ? pourAvenant[0].id : "");
    setAAvenant(m);
  };
  const ouvrirAvenant = async () => {
    const m = aAvenant;
    const c = pourAvenant.find((x) => x.id === chantierAvenant);
    if (!m || !c || !objet.trim() || envoi) return;
    const suivant = suivantDe(m);
    setEnvoi(true);
    setErreurFenetre(null);
    let range = false;
    try {
      if (reelle) {
        await rangerMessage(m.id, c.id);
        range = true;
        await avenantDepuisMessage(m.id, objet.trim());
        await lire();
        await relireChantier(c.id).catch(() => undefined);
      } else {
        /* l'exemple : l'avenant brouillon entre dans le tableau du chantier, avec le message pour origine (comme btp_avenant_depuis_message) */
        const t = tableau(c.id);
        if (t) {
          const avenant: Avenant = {
            id: crypto.randomUUID(),
            chantier_id: c.id,
            marche_id: t.marches.find((x) => x.statut === "verifie")?.id ?? null,
            numero: Math.max(0, ...t.avenants.map((a) => a.numero)) + 1,
            objet: objet.trim(),
            origine: { canal: aUnVocal(m) ? "vocal" : m.pieces.length ? "photo" : m.canal, auteur: m.de_nom ?? undefined, date: new Date().toISOString().slice(0, 10), texte: m.texte ?? undefined, message: m.id },
            statut: "brouillon",
            demande_id: null,
            demande_statut: null,
            piece_id: null,
            soumis_le: null,
            signe_le: null,
            signe_par: null,
            signe_libelle: null,
            motif: null,
            cree_le: new Date().toISOString(),
            nb_lignes: 0,
            montant_ht: 0,
            lignes: [],
          };
          onLocal({ ...t, avenants: [...t.avenants, avenant] });
        }
        setLocal((l) => l.filter((x) => x.id !== m.id));
      }
      setAvenantOuvert(c);
      routeur.replace(lienId(suivant), { scroll: false });
    } catch (e) {
      const texte = e instanceof Error ? e.message : "La base a refusé l'action.";
      if (range) {
        /* rangé mais pas d'avenant : le message a quitté la file, l'avenant s'ouvre depuis le fil du chantier */
        await lire();
        setErreurFenetre(`Le message est rangé au chantier « ${c.nom} », mais l'avenant n'a pas été ouvert : ${texte} Ouvrez-le depuis le fil du chantier.`);
      } else {
        setErreurFenetre(texte);
      }
    } finally {
      setEnvoi(false);
    }
  };
  const fermerAvenant = () => {
    if (envoi) return;
    setAAvenant(null);
    setAvenantOuvert(null);
  };

  /* ——— la liste ——— */
  const colonneListe = (
    <section className="ltr-liste" aria-label="Messages à ranger">
      <header className="ltr-tete">
        <h2 className="ltr-tete-titre">À ranger</h2>
        {messages.length ? <span className="ltr-tete-compte">{messages.length}</span> : null}
      </header>
      {chargement ? (
        <ul className="ltr-lignes" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <li key={i} className="ltr-ligne" aria-hidden="true">
              <span className="ltr-ligne-int">
                <span className="ltr-squelette" style={{ width: "70%" }} />
                <span className="ltr-squelette" style={{ width: "40%", height: 10 }} />
              </span>
            </li>
          ))}
        </ul>
      ) : messages.length ? (
        <ul className="ltr-lignes" ref={listeRef}>
          {messages.map((m) => (
            <li key={m.id}>
              <Link href={lienId(m.id)} scroll={false} className="ltr-ligne" data-actif={m.id === id ? "" : undefined} aria-current={m.id === id ? "true" : undefined}>
                <span className="ltr-ligne-int">
                  <span className="ltr-l1">
                    <span className="ltr-l1-titre">{titreDe(m)}</span>
                    <span className="ltr-l1-id">{CANAUX[m.canal]}</span>
                  </span>
                  <span className="ltr-l2">
                    <span className="ltr-qui">
                      <Avatar m={m} />
                      <span>{auteurDe(m)}</span>
                    </span>
                    <span className="ltr-quand">{depuis(m.recu_le, maintenant)}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ltr-liste-vide">{erreurLecture ? `La file n'a pas pu être lue : ${erreurLecture}` : sansCompte ? "Aucun compte n'est rattaché à cette session." : "Rien à ranger."}</p>
      )}
    </section>
  );

  /* ——— le panneau sans message ouvert ——— */
  const panneauVide = (
    <section className="ltr-detail" aria-label="Aucun message ouvert">
      <header className="ltr-tete" />
      <div className="ltr-vide">
        <Illustration />
        <div className="ltr-vide-texte">
          {chargement ? (
            <p className="ltr-vide-titre">Lecture des messages…</p>
          ) : messages.length ? (
            <>
              <p className="ltr-vide-titre">
                {messages.length} message{messages.length > 1 ? "s" : ""} à ranger
              </p>
              <Link className="ltr-vide-bouton" href={lienId(messages[0].id)} scroll={false}>
                <Inbox aria-hidden="true" />
                Ouvrir le premier
              </Link>
            </>
          ) : (
            <>
              <p className="ltr-vide-titre">Rien à ranger</p>
              <p className="ltr-vide-aide">Les messages du terrain que la base n&apos;a pas su rattacher à un chantier arrivent ici.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );

  /* ——— le message ouvert : la page d'un élément du Triage ——— */
  function detail(m: MessageChantier) {
    const auteur = auteurDe(m);
    const recu = dateHeure(m.recu_le);
    const optionsChantiers: Option[] = ouverts.map((c) => ({
      cle: c.id,
      libelle: c.nom,
      meta: c.statut === "ouvert" ? c.commune : STATUTS_CHANTIER[c.statut].libelle,
      icone: <HardHat width={16} height={16} aria-hidden="true" />,
      action: () => void ranger(m, c),
    }));
    const demandes = m.lecture?.demandes ?? [];
    const transcriptions = (m.lecture?.medias ?? []).filter((x) => x.transcription);
    return (
      <section className="ltr-detail" aria-label={`Message de ${auteur}`}>
        <header className="ltr-tete">
          <Link className="ltr-rond ltr-retour" href={lienId(null)} scroll={false} aria-label="Revenir à la liste">
            <ChevronLeft aria-hidden="true" />
          </Link>
          <span className="ltr-fil">
            <h2>
              <span className="ltr-fil-id">{CANAUX[m.canal]}</span>
              <span className="ltr-fil-nom">{auteur}</span>
            </h2>
          </span>
          <div className="ltr-ronds">
            <span className="ltr-bulle" data-bulle="Ranger dans un chantier">
              <MenuOptions rond libelle="Ranger dans un chantier" titre="Ranger dans le chantier…" declencheur={<Check aria-hidden="true" />} options={optionsChantiers} largeur={280} />
            </span>
            <span className="ltr-bulle" data-bulle="Ouvrir un avenant">
              <button type="button" className="ltr-rond" aria-label="Ouvrir un avenant depuis ce message" disabled={envoi} onClick={() => ouvrirAvenantFenetre(m)}>
                <FileSignature aria-hidden="true" />
              </button>
            </span>
            <span className="ltr-bulle" data-bulle="Écarter">
              <button type="button" className="ltr-rond" aria-label="Écarter ce message" disabled={envoi} onClick={() => ouvrirEcarter(m)}>
                <X aria-hidden="true" />
              </button>
            </span>
          </div>
        </header>

        <div className="ltr-corps">
          <h3 className="ltr-titre">{titreDe(m)}</h3>

          <div className="ltr-pilules">
            <span className="ltr-pilule" title="Canal">
              <IconeCanal canal={m.canal} />
              <span>{CANAUX[m.canal]}</span>
            </span>
            <span className="ltr-pilule" title="Expéditeur" data-vide={m.de_nom ? undefined : ""}>
              <User aria-hidden="true" />
              <span>{m.de_nom ?? (m.de_adresse ? m.de_adresse : "Expéditeur inconnu")}</span>
            </span>
            <span className="ltr-pilule" title="Reçu le">
              <Clock aria-hidden="true" />
              <span>{recu}</span>
            </span>
            <span className="ltr-pilule" title="Pièces" data-vide={m.pieces.length ? undefined : ""}>
              <Paperclip aria-hidden="true" />
              <span>{piecesDe(m)}</span>
            </span>
            <MenuOptions
              libelle="Chantier : à choisir"
              titre="Ranger dans le chantier…"
              teinte="vide"
              declencheur={
                <>
                  <HardHat aria-hidden="true" />
                  <span>Chantier à choisir</span>
                </>
              }
              options={optionsChantiers}
              largeur={280}
            />
          </div>

          <div className="ltr-desc">
            <p>
              Reçu par {CANAUX[m.canal]} le {recu}
              {m.de_nom && m.de_adresse ? `, de ${m.de_adresse}` : ""}. Aucun chantier n&apos;a pu lui être rattaché : expéditeur absent de l&apos;annuaire, aucun chantier nommé, ou plusieurs chantiers en cours pour lui.
            </p>
            <p className="ltr-second">Rangez-le dans son chantier, ouvrez un avenant s&apos;il signale un travail en plus, ou écartez-le.</p>
          </div>

          {m.pieces.length ? (
            <div className="ltr-pieces">
              {m.pieces.map((p) => (
                <Piece key={p.chemin} piece={p} reelle={reelle} auteur={auteur} recu={recu} />
              ))}
            </div>
          ) : null}

          {m.lecture ? (
            <div className="ltr-lecture">
              {transcriptions.map((x) => (
                <p key={x.n}>
                  Transcription du vocal{x.duree_s ? ` (${x.duree_s} s)` : ""} : « {x.transcription} »
                </p>
              ))}
              {(m.lecture.medias ?? []).some((x) => x.statut === "non_transcrit") ? <p>Vocal non transcrit.</p> : null}
              {m.lecture.resume ? (
                <p>
                  <b>Lu :</b> {m.lecture.resume}
                </p>
              ) : null}
              {demandes.length ? (
                <ul>
                  {demandes.map((x, k) => (
                    <li key={k}>
                      {x.nature === "avancement"
                        ? `Avancement${x.lot_code ? ` (lot ${x.lot_code})` : ""} : ${x.ouvrage ?? x.texte ?? "ouvrage non nommé"}${x.pourcentage != null ? ` — ${x.pourcentage} %` : ""}`
                        : `${x.nature === "travail_supplementaire" ? "Travail supplémentaire" : x.nature === "probleme" ? "Problème" : x.nature === "question" ? "Question" : "Information"} : ${x.texte ?? ""}`}
                      {x.quantite != null ? ` — ${x.quantite} ${x.unite ?? ""}` : ""} · {x.verifiee ? "vérifié" : "à confirmer"}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <hr className="ltr-trait" />
          <h3 className="ltr-activite-titre">Activité</h3>
          <ul className="ltr-evenements">
            <li>
              <Avatar m={m} petit />
              <span>
                <b>{auteur}</b> a envoyé le message par {CANAUX[m.canal]} <span className="ltr-point">·</span> {depuis(m.recu_le, maintenant)}
              </span>
            </li>
            {m.lu_le ? (
              <li>
                <Sparkles aria-hidden="true" />
                <span>
                  Le système a lu les pièces <span className="ltr-point">·</span> {depuis(m.lu_le, maintenant)}
                </span>
              </li>
            ) : null}
            <li>
              <Inbox aria-hidden="true" />
              <span>Aucun chantier rattaché : en attente de rangement</span>
            </li>
          </ul>
        </div>
      </section>
    );
  }

  const nomChantierAvenant = pourAvenant.find((c) => c.id === chantierAvenant)?.nom ?? "";

  return (
    <div className="lin ltr" data-ouvert={choisi ? "" : undefined}>
      <h1 className="v2-sr">À ranger</h1>
      <div className="ltr-carte">
        {colonneListe}
        {choisi ? detail(choisi) : panneauVide}
      </div>

      {/* Écarter : la fenêtre de confirmation, avec le motif (300 caractères au plus, comme la base) */}
      <ModalOverlay isOpen={!!aEcarter} onOpenChange={(o) => !o && !envoi && setAEcarter(null)} isDismissable={!envoi} className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void ecarter();
              }}
            >
              <div className="v2-modale-corps">
                <Heading slot="title">Écarter ce message ?</Heading>
                <p>
                  Le message de {aEcarter ? auteurDe(aEcarter) : ""} quitte la file sans être rangé dans un chantier. Il reste dans le journal de la base.
                </p>
                <label className="v2-libelle">
                  Motif (facultatif)
                  <span className="v2-champ ltr-zone">
                    <textarea rows={3} maxLength={MOTIF_MAX} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Message personnel, publicité, doublon…" />
                  </span>
                  <span className="ltr-compteur">
                    {motif.length} / {MOTIF_MAX}
                  </span>
                </label>
                {erreurFenetre ? (
                  <Note teinte="rouge" role="alert">
                    <strong>Refusé par la base.</strong> {erreurFenetre}
                  </Note>
                ) : null}
              </div>
              <div className="v2-modale-pied">
                <Button className="v2-btn v2-btn--petit" slot="close" isDisabled={envoi}>
                  Annuler
                </Button>
                <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={envoi}>
                  {envoi ? "Enregistrement…" : "Écarter le message"}
                </button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>

      {/* Ouvrir un avenant : ranger au chantier choisi, puis l'avenant brouillon (la base l'exige dans cet ordre) */}
      <ModalOverlay isOpen={!!aAvenant} onOpenChange={(o) => !o && fermerAvenant()} isDismissable={!envoi} className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            {avenantOuvert ? (
              <>
                <div className="v2-modale-corps">
                  <Heading slot="title">Avenant ouvert en brouillon</Heading>
                  <p>
                    Le message est rangé au chantier « {avenantOuvert.nom} » et l&apos;avenant en est né. Chiffrez-le sur vos prix, puis soumettez-le à la signature avant d&apos;exécuter.
                  </p>
                </div>
                <div className="v2-modale-pied">
                  <Button className="v2-btn v2-btn--petit" slot="close">
                    Fermer
                  </Button>
                  <Link className="v2-btn v2-btn--petit v2-btn--primaire" href={ficheAvenants(avenantOuvert.id)}>
                    Voir l&apos;avenant
                  </Link>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void ouvrirAvenant();
                }}
              >
                <div className="v2-modale-corps">
                  <Heading slot="title">Ouvrir un avenant depuis ce message</Heading>
                  <p>
                    Le message de {aAvenant ? auteurDe(aAvenant) : ""} est d&apos;abord rangé au chantier choisi, puis il devient l&apos;origine d&apos;un avenant en brouillon.
                  </p>
                  <div className="v2-grille-champs" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
                    <label className="v2-libelle">
                      Chantier
                      <span className="v2-champ">
                        <select value={chantierAvenant} onChange={(e) => setChantierAvenant(e.target.value)} required>
                          <option value="">Choisir le chantier</option>
                          {pourAvenant.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nom}
                            </option>
                          ))}
                        </select>
                        <ChevronDown width={16} height={16} aria-hidden="true" style={{ pointerEvents: "none" }} />
                      </span>
                      {!pourAvenant.length ? <span className="v2-aide">Aucun chantier ouvert ou suspendu : un avenant ne s&apos;ouvre que sur un chantier en cours.</span> : null}
                    </label>
                    <label className="v2-libelle">
                      Ce qui est demandé en plus
                      <span className="v2-champ ltr-zone">
                        <textarea rows={3} maxLength={500} value={objet} onChange={(e) => setObjet(e.target.value)} placeholder="Une prise supplémentaire dans le garage" required />
                      </span>
                    </label>
                  </div>
                  {erreurFenetre ? (
                    <Note teinte="rouge" role="alert">
                      <strong>Refusé par la base.</strong> {erreurFenetre}
                    </Note>
                  ) : null}
                </div>
                <div className="v2-modale-pied">
                  <Button className="v2-btn v2-btn--petit" slot="close" isDisabled={envoi}>
                    Annuler
                  </Button>
                  <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={envoi || !chantierAvenant || !objet.trim()}>
                    {envoi ? "Enregistrement…" : nomChantierAvenant ? `Ranger à « ${nomChantierAvenant} » et ouvrir` : "Ouvrir l'avenant"}
                  </button>
                </div>
              </form>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </div>
  );
}
