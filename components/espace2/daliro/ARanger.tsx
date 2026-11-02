"use client";

/* ══════════════════════════════════════════════════════════════════════
   DALIRO › À ranger — le Triage de Linear, au 1:1 (02/11/2026, règles de
   Teo : docs/refonte-metiers/REGLES.md). Relevé :
   docs/refonte-metiers/releves/linear-triage.md (29/10 clair, complément
   du 01/11 sombre et clair, 16 éléments). Styles : ./dal.css (carte) et
   ./dal-triage.css (préfixe dal-tr-).

   Les messages du terrain (WhatsApp, SMS, courriel) que la base n'a pas su
   rattacher à un chantier (bloc B05, l'ancienne carte ARangerCarte.tsx),
   rangés dans les briques du Triage :
     · la colonne de 400 : « À ranger », Filtre (canal) et Affichage (ordre),
       une ligne de 59 par message — le texte en titre, le canal à la place
       de l'identifiant OME-n, l'expéditeur et « il y a 1 h » dessous ;
     · rien d'ouvert : l'illustration de Linear, « 16 messages à ranger »
       et le bouton qui ouvre le premier ;
     · le message ouvert (?id=) : la page d'un élément du Triage. Les
       ronds de la barre Triage portent les gestes de Linear qui existent
       ici : Accepter = Ranger dans un chantier (G05, rangerMessage, menu
       des chantiers ni clos ni annulés), Refuser = Écarter (G06,
       ecarterMessage, fenêtre de confirmation avec le motif, comme la
       fenêtre « Decline » de Linear). « Ouvrir un avenant » (G37 : ranger
       puis avenantDepuisMessage) va dans le menu « … » de l'élément, là
       où Linear range les autres actions d'un ticket.
   ↑/↓ changent de message, Échap referme. Sur l'exemple, seize messages
   (./exemplesARanger), modifiés en mémoire.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button, Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { dateHeure } from "@/components/espace/format";
import { urlSigneeMedia } from "@/app/espace/daliro/actions";
import { STATUTS_CHANTIER } from "@/components/espace/daliro/etats";
import { avenantDepuisMessage, ecarterMessage, messagesARanger, rangerMessage } from "@/components/espace/daliro/portes";
import type { Avenant, Chantier, MessageChantier, PieceMessage } from "@/components/espace/daliro/types";
import { Note } from "../ui";
import { useToast } from "../Toasts";
import { useMaintenant } from "../horloge";
import { RACINE } from "../modules";
import { useDaliro } from "./donnees";
import { DalCarte } from "./DalCadre";
import { DalIcone, type NomDalIcone } from "./DalIcone";
import { messagesExemple } from "./exemplesARanger";
import { ILLUSTRATION_TRIAGE } from "./illustrationTriage";
import "./dal-triage.css";

const CHEMIN = `${RACINE}/daliro/a-ranger`;
const ficheAvenants = (chantier: string) => `${RACINE}/daliro/chantiers/${encodeURIComponent(chantier)}?onglet=argent#avenants`;
const CANAUX: Record<MessageChantier["canal"], string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Courriel" };
const ICONE_CANAL: Record<MessageChantier["canal"], NomDalIcone> = { whatsapp: "Chat", sms: "Phone", email: "Email" };
const MOTIF_MAX = 300;

/* les deux icônes de la barre Triage, hors sprite : tracés du paquet public de Linear
   (startup-root.DQ-fTRWK.js, composants fh « Accept issue… » et X$n « Decline issue… »), 02/11/2026 */
const ACCEPTER =
  '<path d="M1 10.75A4.25 4.25 0 0 0 5.25 15h1a.75.75 0 0 0 0-1.5h-1a2.75 2.75 0 0 1-2.75-2.75v-5.5A2.75 2.75 0 0 1 5.25 2.5h5.5a2.75 2.75 0 0 1 2.75 2.75v.997a.75.75 0 0 0 1.5 0V5.25A4.25 4.25 0 0 0 10.75 1h-5.5A4.25 4.25 0 0 0 1 5.25z"/><path d="M10.75 14.25a.75.75 0 0 0 1.5 0v-2h2a.75.75 0 0 0 0-1.5h-2v-2a.75.75 0 0 0-1.5 0v2h-2a.75.75 0 0 0 0 1.5h2z"/>';
const REFUSER =
  '<path d="M1 11.25C1 13.3211 2.67893 15 4.75 15L5 15C5.41421 15 5.75 14.6642 5.75 14.25C5.75 13.8358 5.41421 13.5 5 13.5L4.75 13.5C3.50736 13.5 2.5 12.4926 2.5 11.25L2.5 4.75C2.5 3.50736 3.50736 2.5 4.75 2.5L11.25 2.5C12.4926 2.5 13.5 3.50736 13.5 4.75V5C13.5 5.41421 13.8358 5.75 14.25 5.75C14.6642 5.75 15 5.41421 15 5V4.75C15 2.67893 13.3211 1 11.25 1L4.75 1C2.67893 1 1 2.67893 1 4.75L1 11.25Z"/><path d="M9.53033 8.46967L11.5 10.4393L13.4697 8.46967C13.7626 8.17678 14.2374 8.17678 14.5303 8.46967C14.8232 8.76256 14.8232 9.23744 14.5303 9.53033L12.5607 11.5L14.5303 13.4697C14.8232 13.7626 14.8232 14.2374 14.5303 14.5303C14.2374 14.8232 13.7626 14.8232 13.4697 14.5303L11.5 12.5607L9.53033 14.5303C9.23744 14.8232 8.76256 14.8232 8.46967 14.5303C8.17678 14.2374 8.17678 13.7626 8.46967 13.4697L10.4393 11.5L8.46967 9.53033C8.17678 9.23744 8.17678 8.76256 8.46967 8.46967C8.76256 8.17678 9.23744 8.17678 9.53033 8.46967Z"/>';
const Trace = ({ d }: { d: string }) => <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" dangerouslySetInnerHTML={{ __html: d }} />;

/* la photo dessinée de l'exemple (la même que le fil, FilCarte.tsx) : rien n'est lu dans un vrai dépôt */
const PHOTO_EXEMPLE = `data:image/svg+xml;utf8,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200"><rect width="320" height="200" fill="#e9e6df"/><rect x="40" y="50" width="110" height="120" fill="#c9c3b6"/><rect x="58" y="68" width="74" height="84" fill="#9fb4c7"/><rect x="180" y="40" width="100" height="130" fill="#d8d2c4"/><text x="160" y="190" font-family="sans-serif" font-size="12" text-anchor="middle" fill="#555">Photo d\'exemple</text></svg>')}`;

const auteurDe = (m: MessageChantier) => m.de_nom ?? m.de_adresse ?? "Expéditeur inconnu";
const aUnVocal = (m: MessageChantier) => m.pieces.some((p) => p.vocal);
const titreDe = (m: MessageChantier) => m.texte?.trim() || (aUnVocal(m) ? `Un vocal de ${auteurDe(m)}` : m.pieces.length ? `Une photo de ${auteurDe(m)}` : "Message sans texte");
const piecesDe = (m: MessageChantier) => {
  if (!m.pieces.length) return "Pièces";
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
    .join("")
    .toUpperCase();
/* les couleurs d'avatar de Linear (relevé des étiquettes, linear-my-issues.md) */
const COULEURS = ["rgb(235, 87, 87)", "rgb(38, 181, 206)", "rgb(76, 183, 130)", "lch(48 59.31 288.43)", "lch(67.969 19.321 31.72)"];
const couleurDe = (s: string) => COULEURS[[...s].reduce((t, c) => t + c.charCodeAt(0), 0) % COULEURS.length];

/* « il y a 1 h », comme le « 1h ago » de Linear */
function depuis(iso: string, maintenant: number | null): string {
  if (maintenant === null) return "";
  const ms = maintenant - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const min = Math.round(ms / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
}

function Avatar({ m, taille = 16 }: { m: MessageChantier; taille?: number }) {
  const nom = m.de_nom?.trim();
  const ini = nom ? initiales(nom) : "";
  if (!ini) return <DalIcone nom="AvatarEmpty" taille={taille} className="dal-tr-avatar-vide" />;
  return (
    <span className="dal-tr-avatar" style={{ width: taille, height: taille, background: couleurDe(nom!) }} aria-hidden="true">
      {ini}
    </span>
  );
}

/* un menu de la carte (mêmes briques que DalMenu, ./DalCadre) sous un déclencheur quelconque */
type OptionTr = { cle: string; libelle: string; icone: NomDalIcone; meta?: string; action: () => void };
function MenuTr({ libelle, declencheur, classe, options, droite, largeur }: { libelle: string; declencheur: React.ReactNode; classe: string; options: OptionTr[]; droite?: boolean; largeur?: number }) {
  const [ouvert, setOuvert] = useState(false);
  const boite = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const dehors = (e: MouseEvent) => {
      if (!boite.current?.contains(e.target as Node)) setOuvert(false);
    };
    const echap = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOuvert(false);
      }
    };
    document.addEventListener("mousedown", dehors);
    document.addEventListener("keydown", echap);
    return () => {
      document.removeEventListener("mousedown", dehors);
      document.removeEventListener("keydown", echap);
    };
  }, [ouvert]);
  return (
    <div ref={boite} className="dal-tr-menu-boite">
      <button type="button" className={classe} aria-label={libelle} title={libelle} aria-haspopup="menu" aria-expanded={ouvert} onClick={() => setOuvert((o) => !o)}>
        {declencheur}
      </button>
      {ouvert ? (
        <div className="dal-menu" role="menu" aria-label={libelle} data-ouvert="" style={{ top: "calc(100% + 4px)", ...(droite ? { right: 0 } : { left: 0 }), minWidth: largeur }}>
          {options.map((o) => (
            <button
              key={o.cle}
              type="button"
              role="menuitem"
              className="dal-menu-option"
              onClick={() => {
                setOuvert(false);
                o.action();
              }}
            >
              <DalIcone nom={o.icone} />
              <span className="dal-tr-menu-libelle">{o.libelle}</span>
              {o.meta ? <span className="dal-tr-menu-meta">{o.meta}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
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
      <img className="dal-tr-photo" src={PHOTO_EXEMPLE} alt={`Photo envoyée par ${auteur} (exemple)`} />
    ) : (
      <span className="dal-tr-piece">
        <DalIcone nom="Mic" taille={14} /> {piece.vocal ? "Vocal" : piece.nom} (exemple : pas de fichier)
      </span>
    );
  }
  if (erreur) {
    return (
      <span className="dal-tr-piece">
        <DalIcone nom="Attachment" taille={14} /> {piece.nom} : {erreur}
      </span>
    );
  }
  if (!url) return <span className="dal-tr-squelette" style={{ width: image ? 160 : 220, height: image ? 100 : 28 }} aria-label="Pièce en lecture" />;
  if (image) {
    return (
      <a href={url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element -- adresse signée du dépôt, dix minutes */}
        <img className="dal-tr-photo" src={url} alt={`Photo envoyée par ${auteur} le ${recu}`} />
      </a>
    );
  }
  if (audio) return <audio controls preload="none" src={url} aria-label={`${piece.vocal ? "Vocal" : "Audio"} de ${auteur} le ${recu}`} />;
  return (
    <a className="dal-tr-piece" href={url} target="_blank" rel="noreferrer">
      <DalIcone nom="Attachment" taille={14} /> {piece.nom}
    </a>
  );
}

type Canal = MessageChantier["canal"];
const estCanal = (v: string | null): v is Canal => v === "whatsapp" || v === "sms" || v === "email";

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
  const canalFiltre = estCanal(params.get("canal")) ? (params.get("canal") as Canal) : null;
  const ancienD = params.get("ordre") === "ancien";

  const [reel, setReel] = useState<MessageChantier[] | null>(null);
  const [erreurLecture, setErreurLecture] = useState<string | null>(null);
  const [local, setLocal] = useState<MessageChantier[]>(messagesExemple);
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

  const messages = useMemo(() => {
    const tous = [...(reelle ? (reel ?? []) : local)].filter((m) => !canalFiltre || m.canal === canalFiltre);
    return tous.sort((a, b) => (ancienD ? a.recu_le.localeCompare(b.recu_le) : b.recu_le.localeCompare(a.recu_le)));
  }, [reelle, reel, local, canalFiltre, ancienD]);
  /* en base réelle : la liste des chantiers, puis les messages ; sans compte rattaché, rien à lire */
  const chargement = reelle && (!d.pret || (!!clientId && reel === null));
  const sansCompte = reelle && d.pret && !clientId;
  const ouverts = useMemo(() => liste.filter((c) => c.statut !== "clos" && c.statut !== "annule").sort((a, b) => a.nom.localeCompare(b.nom, "fr")), [liste]);
  /* un avenant s'ouvre sur un chantier ouvert ou suspendu (G08) */
  const pourAvenant = ouverts.filter((c) => c.statut === "ouvert" || c.statut === "suspendu");
  const choisi = id ? (messages.find((m) => m.id === id) ?? null) : null;

  const lienAvec = useCallback(
    (cle: string, x: string | null) => {
      const p = new URLSearchParams(params.toString());
      if (x) p.set(cle, x);
      else p.delete(cle);
      const qs = p.toString();
      return qs ? `${CHEMIN}?${qs}` : CHEMIN;
    },
    [params],
  );
  const lienId = useCallback((x: string | null) => lienAvec("id", x), [lienAvec]);
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
      if (document.querySelector(".dal-tr .dal-menu")) return;
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
    listeRef.current?.querySelector("[aria-current]")?.scrollIntoView({ block: "nearest" });
  }, [id]);

  const copierLien = () => {
    void navigator.clipboard?.writeText(window.location.href).then(
      () => toast("Lien copié.", "vert"),
      () => toast("Le lien n'a pas pu être copié.", "rouge"),
    );
  };

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

  const optionsChantiers = (m: MessageChantier): OptionTr[] =>
    ouverts.map((c) => ({
      cle: c.id,
      libelle: c.nom,
      meta: c.statut === "ouvert" ? c.commune : STATUTS_CHANTIER[c.statut].libelle,
      icone: "Crane",
      action: () => void ranger(m, c),
    }));

  /* ——— la colonne de gauche : l'en-tête « Triage » et ses lignes ——— */
  const colonneListe = (
    <section className="dal-tr-liste" aria-label="Messages à ranger">
      <header className="dal-tr-tete">
        <h2 className="dal-tr-titre">À ranger</h2>
        <span className="dal-pousse" />
        <MenuTr
          libelle="Filtrer"
          classe="dal-rond"
          droite
          largeur={200}
          declencheur={<DalIcone nom="Filtre" />}
          options={[
            { cle: "tous", libelle: "Tous les canaux", icone: "Inbox", action: () => routeur.replace(lienAvec("canal", null), { scroll: false }) },
            ...(["whatsapp", "sms", "email"] as Canal[]).map((c) => ({ cle: c, libelle: CANAUX[c], icone: ICONE_CANAL[c], meta: canalFiltre === c ? "✓" : undefined, action: () => routeur.replace(lienAvec("canal", c), { scroll: false }) })),
          ]}
        />
        <MenuTr
          libelle="Options d'affichage"
          classe="dal-rond"
          droite
          largeur={200}
          declencheur={<DalIcone nom="Affichage" />}
          options={[
            { cle: "recent", libelle: "Le plus récent d'abord", icone: "Updated", meta: ancienD ? undefined : "✓", action: () => routeur.replace(lienAvec("ordre", null), { scroll: false }) },
            { cle: "ancien", libelle: "Le plus ancien d'abord", icone: "Created", meta: ancienD ? "✓" : undefined, action: () => routeur.replace(lienAvec("ordre", "ancien"), { scroll: false }) },
          ]}
        />
      </header>
      <div className="dal-tr-defile">
        {chargement ? (
          <ul className="dal-tr-lignes" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <li key={i} className="dal-tr-ligne" aria-hidden="true">
                <span className="dal-tr-int">
                  <span className="dal-tr-squelette" style={{ width: "70%", height: 12 }} />
                  <span className="dal-tr-squelette" style={{ width: "40%", height: 10 }} />
                </span>
              </li>
            ))}
          </ul>
        ) : messages.length ? (
          <ul className="dal-tr-lignes" ref={listeRef}>
            {messages.map((m, i) => (
              <li key={m.id}>
                <Link
                  href={lienId(m.id)}
                  scroll={false}
                  className="dal-tr-ligne"
                  data-curseur={!choisi && i === 0 ? "" : undefined}
                  aria-current={m.id === id ? "true" : undefined}
                >
                  <span className="dal-tr-int">
                    <span className="dal-tr-l1">
                      <span className="dal-tr-l1-titre">{titreDe(m)}</span>
                      <span className="dal-tr-l1-id">{CANAUX[m.canal]}</span>
                    </span>
                    <span className="dal-tr-l2">
                      <span className="dal-tr-qui">
                        <Avatar m={m} />
                        <span className="dal-tr-nom">{auteurDe(m)}</span>
                      </span>
                      <span className="dal-tr-quand">{depuis(m.recu_le, maintenant)}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="dal-tr-vide-liste">{erreurLecture ? `La file n'a pas pu être lue : ${erreurLecture}` : sansCompte ? "Aucun compte n'est rattaché à cette session." : canalFiltre ? `Aucun message ${CANAUX[canalFiltre]} à ranger.` : "Rien à ranger."}</p>
        )}
      </div>
    </section>
  );

  /* ——— la moitié droite sans message ouvert ——— */
  const panneauVide = (
    <section className="dal-tr-droite dal-tr-droite--vide" aria-label="Aucun message ouvert">
      <div className="dal-tr-attente">
        <svg className="dal-tr-illustration" viewBox="0 0 132 84" fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: ILLUSTRATION_TRIAGE }} />
        <div className="dal-tr-attente-texte">
          {chargement ? (
            <p className="dal-tr-attente-titre">Lecture des messages…</p>
          ) : messages.length ? (
            <>
              <p className="dal-tr-attente-titre">
                {messages.length} message{messages.length > 1 ? "s" : ""} à ranger
              </p>
              <Link className="dal-tr-bouton" href={lienId(messages[0].id)} scroll={false}>
                <DalIcone nom="Inbox" taille={14} />
                Ouvrir le premier
              </Link>
            </>
          ) : (
            <p className="dal-tr-attente-titre">Rien à ranger</p>
          )}
        </div>
      </div>
    </section>
  );

  /* ——— le message ouvert : la page d'un élément du Triage ——— */
  function detail(m: MessageChantier) {
    const auteur = auteurDe(m);
    const recu = dateHeure(m.recu_le);
    const demandes = m.lecture?.demandes ?? [];
    const transcriptions = (m.lecture?.medias ?? []).filter((x) => x.transcription);
    return (
      <section className="dal-tr-droite" aria-label={`Message de ${auteur}`}>
        <header className="dal-tr-tete dal-tr-tete--detail">
          <Link className="dal-rond dal-tr-retour" href={lienId(null)} scroll={false} aria-label="Revenir à la liste" title="Revenir à la liste">
            <DalIcone nom="Chevron" style={{ transform: "rotate(180deg)" }} />
          </Link>
          <Link className="dal-tr-fil" href={lienId(m.id)} scroll={false}>
            <h2>
              <span className="dal-tr-fil-id">{CANAUX[m.canal]}</span> {titreDe(m)}
            </h2>
          </Link>
          <MenuTr
            libelle="Actions du message"
            classe="dal-rond"
            largeur={220}
            declencheur={<DalIcone nom="Points" />}
            options={[
              { cle: "avenant", libelle: "Ouvrir un avenant…", icone: "Signature", action: () => ouvrirAvenantFenetre(m) },
              { cle: "lien", libelle: "Copier le lien", icone: "Link", action: copierLien },
            ]}
          />
          <span className="dal-pousse" />
          <div className="dal-tr-barre" role="group" aria-label="Triage">
            <MenuTr libelle="Ranger dans un chantier…" classe="dal-rond" droite largeur={280} declencheur={<Trace d={ACCEPTER} />} options={optionsChantiers(m)} />
            <button type="button" className="dal-rond" aria-label="Écarter le message…" title="Écarter le message…" disabled={envoi} onClick={() => ouvrirEcarter(m)}>
              <Trace d={REFUSER} />
            </button>
          </div>
        </header>
        <div className="dal-tr-flottante">
          <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier le lien" title="Copier le lien" onClick={copierLien}>
            <DalIcone nom="LienUrl" />
          </button>
        </div>

        <div className="dal-tr-corps">
          <div className="dal-tr-colonne">
            <h3 className="dal-tr-grand-titre">{titreDe(m)}</h3>

            <div className="dal-tr-pilules">
              <span className="dal-tr-pilule" title="Canal">
                <DalIcone nom={ICONE_CANAL[m.canal]} taille={14} />
                <span>{CANAUX[m.canal]}</span>
              </span>
              <span className="dal-tr-pilule" title="Expéditeur">
                <Avatar m={m} taille={14} />
                <span>{auteur}</span>
              </span>
              <span className="dal-tr-pilule" title="Reçu le">
                <DalIcone nom="Clock" taille={14} />
                <span>{recu}</span>
              </span>
              <span className="dal-tr-pilule" title="Pièces" data-vide={m.pieces.length ? undefined : ""}>
                <DalIcone nom="Attachment" taille={14} />
                <span>{piecesDe(m)}</span>
              </span>
              <MenuTr
                libelle="Chantier : à choisir"
                classe="dal-tr-pilule"
                largeur={280}
                declencheur={
                  <>
                    <DalIcone nom="Crane" taille={14} />
                    <span data-vide="">Chantier</span>
                  </>
                }
                options={optionsChantiers(m)}
              />
            </div>

            <div className="dal-tr-description">
              <p>
                Reçu par {CANAUX[m.canal]} le {recu}
                {m.de_nom && m.de_adresse ? `, de ${m.de_adresse}` : ""}. Aucun chantier n&apos;a pu lui être rattaché : expéditeur absent de l&apos;annuaire, aucun chantier nommé, ou plusieurs chantiers en cours pour lui. Rangez-le dans son chantier, ouvrez un avenant s&apos;il signale un travail en plus, ou écartez-le.
              </p>
              {transcriptions.map((x) => (
                <p key={x.n}>
                  Transcription du vocal{x.duree_s ? ` (${x.duree_s} s)` : ""} : « {x.transcription} »
                </p>
              ))}
              {(m.lecture?.medias ?? []).some((x) => x.statut === "non_transcrit") ? <p>Vocal non transcrit.</p> : null}
              {m.lecture?.resume ? <p>Lu : {m.lecture.resume}</p> : null}
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

            {m.pieces.length ? (
              <div className="dal-tr-pieces">
                {m.pieces.map((p) => (
                  <Piece key={p.chemin} piece={p} reelle={reelle} auteur={auteur} recu={recu} />
                ))}
              </div>
            ) : null}

            <div className="dal-tr-activite-tete">
              <h3 className="dal-tr-activite">Activité</h3>
            </div>
            <ul className="dal-tr-evenements">
              <li>
                <Avatar m={m} taille={14} />
                <span>
                  <b>{auteur}</b> a envoyé le message par {CANAUX[m.canal]} <span className="dal-tr-point">·</span> {depuis(m.recu_le, maintenant)}
                </span>
              </li>
              {m.lu_le ? (
                <li>
                  <DalIcone nom="Agent" taille={14} />
                  <span>
                    Le système a lu les pièces <span className="dal-tr-point">·</span> {depuis(m.lu_le, maintenant)}
                  </span>
                </li>
              ) : null}
              <li>
                <DalIcone nom="IssueStatusTriage" taille={14} />
                <span>Aucun chantier rattaché : en attente de rangement</span>
              </li>
            </ul>
          </div>
        </div>
      </section>
    );
  }

  const nomChantierAvenant = pourAvenant.find((c) => c.id === chantierAvenant)?.nom ?? "";

  return (
    <DalCarte className="dal-tr-page">
      <h1 className="v2-sr">À ranger</h1>
      <div className="dal-tr" data-ouvert={choisi ? "" : undefined}>
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
                <p>Le message de {aEcarter ? auteurDe(aEcarter) : ""} quitte la file sans être rangé dans un chantier. Il reste dans le journal de la base.</p>
                <label className="v2-libelle">
                  Motif (facultatif)
                  <span className="v2-champ">
                    <textarea rows={3} maxLength={MOTIF_MAX} value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Message personnel, publicité, doublon…" />
                  </span>
                  <span className="v2-aide">
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
                  <p>Le message est rangé au chantier « {avenantOuvert.nom} » et l&apos;avenant en est né. Chiffrez-le sur vos prix, puis soumettez-le à la signature avant d&apos;exécuter.</p>
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
                  <p>Le message de {aAvenant ? auteurDe(aAvenant) : ""} est d&apos;abord rangé au chantier choisi, puis il devient l&apos;origine d&apos;un avenant en brouillon.</p>
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
                      </span>
                      {!pourAvenant.length ? <span className="v2-aide">Aucun chantier ouvert ou suspendu : un avenant ne s&apos;ouvre que sur un chantier en cours.</span> : null}
                    </label>
                    <label className="v2-libelle">
                      Ce qui est demandé en plus
                      <span className="v2-champ">
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
    </DalCarte>
  );
}
