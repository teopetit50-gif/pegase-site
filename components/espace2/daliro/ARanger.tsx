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
import { IconeLinear } from "./IconesLinear";
import { copier, useFavoris, useReportes, useSuivis } from "./navigateur";
import { ILLUSTRATION_TRIAGE } from "./illustrationTriage";
import "./dal-triage.css";

const CHEMIN = `${RACINE}/daliro/a-ranger`;
const ficheAvenants = (chantier: string) => `${RACINE}/daliro/chantiers/${encodeURIComponent(chantier)}?onglet=argent#avenants`;
const CANAUX: Record<MessageChantier["canal"], string> = { whatsapp: "WhatsApp", sms: "SMS", email: "Courriel" };
const ICONE_CANAL: Record<MessageChantier["canal"], NomDalIcone> = { whatsapp: "Chat", sms: "Phone", email: "Email" };
const MOTIF_MAX = 300;


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

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const jourMois = (iso: string) => (iso ? `${Number(iso.slice(8, 10))} ${MOIS[Number(iso.slice(5, 7)) - 1]}` : "");

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

/* dates du report (Snooze) : AAAA-MM-JJ locales */
const isoJour = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dansJours = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoJour(d);
};
const lundiProchain = () => {
  const d = new Date();
  d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7));
  return isoJour(d);
};
const jourClair = (iso: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(`${iso}T12:00:00`));

/* l'expéditeur suivi (cloche « Subscribe ») : sa fiche d'annuaire, sinon son adresse */
const cleExpediteur = (m: MessageChantier) => m.tiers_id ?? m.intervenant_id ?? m.de_adresse ?? m.de_nom ?? m.id;

/* répondre par le canal du message, depuis l'application de l'utilisateur : rien ne part d'ici */
function lienReponse(m: MessageChantier, texte: string): string | null {
  const adresse = m.de_adresse?.trim() ?? "";
  if (!adresse || adresse.includes("•")) return null;
  if (m.canal === "email") return adresse.includes("@") ? `mailto:${adresse}?subject=${encodeURIComponent("Votre message")}&body=${encodeURIComponent(texte)}` : null;
  const chiffres = adresse.replace(/[^\d+]/g, "");
  if (chiffres.replace(/\D/g, "").length < 9) return null;
  return m.canal === "whatsapp" ? `https://wa.me/${chiffres.replace(/\D/g, "")}?text=${encodeURIComponent(texte)}` : `sms:${chiffres}?&body=${encodeURIComponent(texte)}`;
}

/* « Copy as prompt » : le message en clair, pour un assistant */
function resumeDe(m: MessageChantier, url: string): string {
  const lignes = [
    `Message reçu par ${CANAUX[m.canal]} le ${dateHeure(m.recu_le)}, de ${auteurDe(m)}${m.de_nom && m.de_adresse ? ` (${m.de_adresse})` : ""}.`,
    `Il n'est rattaché à aucun chantier (DALIRO, file « À ranger »).`,
    "",
    `Texte : ${m.texte?.trim() || "(sans texte)"}`,
  ];
  if (m.pieces.length) lignes.push(`Pièces : ${piecesDe(m)}.`);
  if (m.lecture?.resume) lignes.push(`Lu par le système : ${m.lecture.resume}`);
  for (const x of m.lecture?.medias ?? []) if (x.transcription) lignes.push(`Transcription du vocal : « ${x.transcription} »`);
  lignes.push("", "Dites à quel chantier il se rapporte, s'il signale un travail en plus (avenant), ou s'il est à écarter.", `Lien : ${url}`);
  return lignes.join("\n");
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
  const canalFiltre = estCanal(params.get("canal")) ? (params.get("canal") as Canal) : null;
  const ancienD = params.get("ordre") === "ancien";
  const voirReportes = params.get("reportes") === "1";
  const favoris = useFavoris();
  const suivis = useSuivis();
  const reportes = useReportes();

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
  /* Marquer comme doublon : le message d'origine, puis Écarter avec ce motif */
  const [aDoublon, setADoublon] = useState<MessageChantier | null>(null);
  const [origine, setOrigine] = useState("");
  /* Reporter : la date choisie à la main */
  const [aReporter, setAReporter] = useState<MessageChantier | null>(null);
  const [dateReport, setDateReport] = useState("");
  /* Répondre : le texte de la boîte, puis la confirmation */
  const [reponse, setReponse] = useState("");
  const [aRepondre, setARepondre] = useState<MessageChantier | null>(null);
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

  const { estSuivi } = suivis;
  const { estReporte } = reportes;
  const suiviDe = useCallback((m: MessageChantier) => estSuivi("expediteur", cleExpediteur(m)) || (!!m.chantier_id && estSuivi("btp_chantiers", m.chantier_id)), [estSuivi]);
  const tousMessages = useMemo(() => [...(reelle ? (reel ?? []) : local)], [reelle, reel, local]);
  const nbReportes = tousMessages.filter((m) => estReporte("message", m.id)).length;
  const messages = useMemo(() => {
    const tous = tousMessages.filter((m) => (!canalFiltre || m.canal === canalFiltre) && (voirReportes || !estReporte("message", m.id)));
    /* les messages suivis d'abord (cloche « Subscribe »), puis l'ordre choisi */
    return tous.sort((a, b) => Number(suiviDe(b)) - Number(suiviDe(a)) || (ancienD ? a.recu_le.localeCompare(b.recu_le) : b.recu_le.localeCompare(a.recu_le)));
  }, [tousMessages, canalFiltre, ancienD, voirReportes, estReporte, suiviDe]);
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
  const fenetreOuverte = !!aEcarter || !!aAvenant || !!aDoublon || !!aReporter || !!aRepondre;
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

  const copierTexte = (texte: string, ok: string) => void copier(texte).then((r) => toast(r ? ok : "Le presse-papier a refusé la copie.", r ? "vert" : "rouge"));
  const copierLien = () => copierTexte(window.location.href, "Lien copié.");
  const lienAbsolu = (m: MessageChantier) => `${window.location.origin}${CHEMIN}?id=${encodeURIComponent(m.id)}`;

  /* ——— Reporter (Snooze) : le message quitte la file jusqu'à la date choisie ——— */
  const reporterMessage = (m: MessageChantier, jusqu: string) => {
    const suivant = suivantDe(m);
    reportes.reporter("message", m.id, jusqu);
    toast(`Message reporté au ${jourClair(jusqu)} : il revient dans la file ce jour-là.`, "vert");
    if (!voirReportes && id === m.id) routeur.replace(lienId(suivant), { scroll: false });
  };
  const optionsReport = (m: MessageChantier): OptionTr[] => [
    { cle: "demain", libelle: "Demain", meta: jourClair(dansJours(1)), icone: "Clock", action: () => reporterMessage(m, dansJours(1)) },
    { cle: "3j", libelle: "Dans 3 jours", meta: jourClair(dansJours(3)), icone: "Clock", action: () => reporterMessage(m, dansJours(3)) },
    { cle: "lundi", libelle: "Lundi prochain", meta: jourClair(lundiProchain()), icone: "Calendar", action: () => reporterMessage(m, lundiProchain()) },
    { cle: "semaine", libelle: "Dans une semaine", meta: jourClair(dansJours(7)), icone: "Calendar", action: () => reporterMessage(m, dansJours(7)) },
    {
      cle: "date",
      libelle: "Choisir une date…",
      icone: "FromDate",
      action: () => {
        setDateReport(dansJours(1));
        setAReporter(m);
      },
    },
    ...(estReporte("message", m.id)
      ? [{ cle: "annuler", libelle: "Annuler le report", icone: "Refresh" as NomDalIcone, action: () => { reportes.annuler("message", m.id); toast("Report annulé : le message est de retour dans la file.", "vert"); } }]
      : []),
  ];

  /* ——— Marquer comme doublon : Écarter (G06) avec le message d'origine pour motif ——— */
  const motifDoublon = (o: MessageChantier) => `Doublon du message de ${auteurDe(o)} reçu le ${dateHeure(o.recu_le)} : « ${titreDe(o).slice(0, 120)} »`.slice(0, MOTIF_MAX);
  const marquerDoublon = async () => {
    const m = aDoublon;
    const o = messages.find((x) => x.id === origine) ?? tousMessages.find((x) => x.id === origine);
    if (!m || !o || envoi) return;
    const suivant = suivantDe(m);
    setEnvoi(true);
    setErreurFenetre(null);
    try {
      if (reelle) {
        await ecarterMessage(m.id, motifDoublon(o));
        await lire();
      } else {
        setLocal((l) => l.filter((x) => x.id !== m.id));
      }
      setADoublon(null);
      toast(`Message écarté comme doublon de celui de ${auteurDe(o)}.`, "vert");
      routeur.replace(lienId(suivant), { scroll: false });
    } catch (e) {
      setErreurFenetre(e instanceof Error ? e.message : "La base a refusé l'action.");
    } finally {
      setEnvoi(false);
    }
  };

  /* ——— Répondre (boîte de commentaire) : par le canal du message, depuis votre application ——— */
  const repondre = () => {
    const m = aRepondre;
    if (!m) return;
    const lien = lienReponse(m, reponse.trim());
    if (lien) {
      window.open(lien, m.canal === "whatsapp" ? "_blank" : "_self", "noopener");
      toast(`Réponse ouverte dans ${m.canal === "email" ? "votre messagerie" : m.canal === "sms" ? "vos SMS" : "WhatsApp"} : envoyez-la de là.`, "vert");
    } else {
      copierTexte(reponse.trim(), "Réponse copiée : collez-la dans votre conversation avec l'expéditeur.");
    }
    setReponse("");
    setARepondre(null);
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
        <button
          type="button"
          className="dal-rond dal-tr-etoile"
          aria-pressed={favoris.estEpingle("page", "daliro/a-ranger")}
          aria-label={favoris.estEpingle("page", "daliro/a-ranger") ? "Retirer la page des épinglés" : "Épingler la page"}
          title={favoris.estEpingle("page", "daliro/a-ranger") ? "Retirer des épinglés de la vue d'ensemble" : "Épingler dans la vue d'ensemble"}
          onClick={() => favoris.basculer({ type: "page", id: "daliro/a-ranger", titre: "À ranger", href: CHEMIN })}
        >
          <DalIcone nom={favoris.estEpingle("page", "daliro/a-ranger") ? "Favorite" : "Etoile"} />
        </button>
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
            { cle: "reportes", libelle: `Afficher les reportés (${nbReportes})`, icone: "Clock", meta: voirReportes ? "✓" : undefined, action: () => routeur.replace(lienAvec("reportes", voirReportes ? null : "1"), { scroll: false }) },
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
                      {suiviDe(m) ? (
                        <span className="dal-tr-marque" title="Vous suivez cet expéditeur">
                          <DalIcone nom="Subscribe" taille={14} />
                          suivi
                        </span>
                      ) : null}
                      {estReporte("message", m.id) ? (
                        <span className="dal-tr-marque" title="Reporté">
                          <DalIcone nom="Clock" taille={14} />
                          {jourMois(reportes.reportes.find((x) => x.type === "message" && x.id === m.id)?.jusqu ?? "")}
                        </span>
                      ) : null}
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
    const epingle = favoris.estEpingle("message", m.id);
    const suivi = suivis.estSuivi("expediteur", cleExpediteur(m));
    const report = reportes.reportes.find((x) => x.type === "message" && x.id === m.id && estReporte("message", m.id));
    const optionsPieces: OptionTr[] = m.pieces.length
      ? m.pieces.map((p, i) => ({
          cle: p.chemin,
          libelle: p.vocal ? `Vocal ${i + 1}` : (p.mime ?? "").startsWith("image/") ? `Photo ${i + 1}` : p.nom,
          icone: p.vocal ? "Mic" : (p.mime ?? "").startsWith("image/") ? "Image" : "Attachment",
          action: () => document.getElementById("dal-tr-pieces")?.scrollIntoView({ behavior: "smooth", block: "center" }),
        }))
      : [{ cle: "aucune", libelle: "Aucune pièce : texte seul", icone: "Attachment", action: () => copierTexte(m.texte ?? "", "Texte du message copié.") }];
    const optionsCopie: OptionTr[] = [
      { cle: "prompt", libelle: "Copier pour l'assistant", icone: "Agent", action: () => copierTexte(resumeDe(m, lienAbsolu(m)), "Résumé copié : collez-le dans votre assistant.") },
      { cle: "texte", libelle: "Copier le texte du message", icone: "Page", action: () => copierTexte(m.texte ?? "", "Texte du message copié.") },
      { cle: "lien", libelle: "Copier le lien", icone: "Link", action: copierLien },
    ];
    const lienRep = lienReponse(m, "x");
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
          <button
            type="button"
            className="dal-rond"
            aria-pressed={epingle}
            aria-label={epingle ? "Retirer des épinglés" : "Épingler le message"}
            title={epingle ? "Retirer des épinglés de la vue d'ensemble" : "Épingler dans la vue d'ensemble"}
            onClick={() => favoris.basculer({ type: "message", id: m.id, titre: `${CANAUX[m.canal]} de ${auteur} : ${titreDe(m)}`, href: `${CHEMIN}?id=${encodeURIComponent(m.id)}` })}
          >
            <DalIcone nom={epingle ? "Favorite" : "Etoile"} />
          </button>
          <MenuTr
            libelle="Actions du message"
            classe="dal-rond"
            largeur={220}
            declencheur={<DalIcone nom="Points" />}
            options={[
              { cle: "avenant", libelle: "Ouvrir un avenant…", icone: "Signature", action: () => ouvrirAvenantFenetre(m) },
              { cle: "suivre", libelle: suivi ? "Ne plus suivre l'expéditeur" : "Suivre l'expéditeur", icone: "Subscribe", action: () => suivis.basculer({ type: "expediteur", id: cleExpediteur(m), titre: auteur, href: CHEMIN }) },
              { cle: "lien", libelle: "Copier le lien", icone: "Link", action: copierLien },
            ]}
          />
          <span className="dal-pousse" />
          <div className="dal-tr-barre" role="group" aria-label="Triage">
            <MenuTr libelle="Ranger dans un chantier…" classe="dal-rond" droite largeur={280} declencheur={<IconeLinear nom="accepter" />} options={optionsChantiers(m)} />
            <button type="button" className="dal-rond" aria-label="Écarter le message…" title="Écarter le message…" disabled={envoi} onClick={() => ouvrirEcarter(m)}>
              <IconeLinear nom="refuser" />
            </button>
            <button
              type="button"
              className="dal-rond"
              aria-label="Marquer comme doublon de…"
              title="Marquer comme doublon de…"
              disabled={envoi}
              onClick={() => {
                setErreurFenetre(null);
                setOrigine(messages.find((x) => x.id !== m.id)?.id ?? "");
                setADoublon(m);
              }}
            >
              <IconeLinear nom="doublon" />
            </button>
            <MenuTr libelle="Reporter…" classe="dal-rond" droite largeur={300} declencheur={<IconeLinear nom="reporter" />} options={optionsReport(m)} />
          </div>
        </header>
        <div className="dal-tr-flottante">
          <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier le lien" title="Copier le lien" onClick={copierLien}>
            <DalIcone nom="LienUrl" />
          </button>
          <button
            type="button"
            className="dal-rond dal-rond--plein"
            aria-label="Copier la référence du message"
            title="Copier la référence du message"
            onClick={() => copierTexte(`${CANAUX[m.canal]} de ${auteur}, reçu le ${recu}`, "Référence copiée.")}
          >
            <IconeLinear nom="copierId" />
          </button>
          <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier le texte du message" title="Copier le texte du message" onClick={() => copierTexte(m.texte ?? "", "Texte du message copié.")}>
            <IconeLinear nom="branche" />
          </button>
          <div className="dal-tr-double">
            <button type="button" className="dal-tr-double-g" aria-label="Copier pour l'assistant" title="Copier pour l'assistant : le message en clair, prêt à coller" onClick={() => copierTexte(resumeDe(m, lienAbsolu(m)), "Résumé copié : collez-le dans votre assistant.")}>
              <IconeLinear nom="prompt" />
            </button>
            <MenuTr
              libelle="Choisir quoi copier"
              classe="dal-tr-double-d"
              droite
              largeur={240}
              declencheur={
                <svg width="10" height="10" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                  <path d="M3.47 5.97a.75.75 0 0 1 1.06 0L8 9.44l3.47-3.47a.75.75 0 1 1 1.06 1.06l-4 4a.75.75 0 0 1-1.06 0l-4-4a.75.75 0 0 1 0-1.06" />
                </svg>
              }
              options={optionsCopie}
            />
          </div>
        </div>

        <div className="dal-tr-corps">
          <div className="dal-tr-colonne">
            <h3 className="dal-tr-grand-titre">{titreDe(m)}</h3>

            <div className="dal-tr-pilules">
              <MenuTr
                libelle="État : à ranger"
                classe="dal-tr-pilule"
                largeur={280}
                declencheur={
                  <>
                    <DalIcone nom="IssueStatusTriage" taille={14} className="dal-tr-triage" />
                    <span>À ranger</span>
                  </>
                }
                options={[...optionsChantiers(m), { cle: "ecarter", libelle: "Écarter…", icone: "StatusCanceled", action: () => ouvrirEcarter(m) }]}
              />
              <span className="dal-tr-pilule" title="Canal">
                <DalIcone nom={ICONE_CANAL[m.canal]} taille={14} />
                <span>{CANAUX[m.canal]}</span>
              </span>
              <span className="dal-tr-pilule" title="Expéditeur">
                <Avatar m={m} taille={14} />
                <span>{auteur}</span>
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
              <span className="dal-tr-pilule" title="Pièces" data-vide={m.pieces.length ? undefined : ""}>
                <DalIcone nom="Attachment" taille={14} />
                <span>{piecesDe(m)}</span>
              </span>
              <MenuTr
                libelle={report ? `Reporté au ${jourClair(report.jusqu)}` : "Reporter…"}
                classe={`dal-tr-pilule${report ? "" : " dal-tr-pilule--icone"}`}
                largeur={300}
                declencheur={
                  <>
                    <DalIcone nom="Cycle" taille={14} />
                    {report ? <span>{jourMois(report.jusqu)}</span> : null}
                  </>
                }
                options={optionsReport(m)}
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
              <div className="dal-tr-pieces" id="dal-tr-pieces">
                {m.pieces.map((p) => (
                  <Piece key={p.chemin} piece={p} reelle={reelle} auteur={auteur} recu={recu} />
                ))}
              </div>
            ) : null}

            <div className="dal-tr-ronds-corps">
              <button type="button" className="dal-rond dal-rond--plein" aria-label="Copier le texte du message" title="Copier le texte du message" onClick={() => copierTexte(m.texte ?? "", "Texte du message copié.")}>
                <DalIcone nom="Page" taille={14} />
              </button>
              <MenuTr libelle={`Pièces reçues (${m.pieces.length})`} classe="dal-rond dal-rond--plein" largeur={220} declencheur={<DalIcone nom="Attachment" taille={14} />} options={optionsPieces} />
            </div>
            <div className="dal-tr-sous">
              <button type="button" className="dal-tr-sous-bouton" disabled={envoi} onClick={() => ouvrirAvenantFenetre(m)}>
                <DalIcone nom="Plus" taille={14} />
                Ajouter un avenant
              </button>
            </div>

            <div className="dal-tr-activite-tete">
              <h3 className="dal-tr-activite">Activité</h3>
              <span className="dal-pousse" />
              <button
                type="button"
                className="dal-tr-suivre"
                aria-pressed={suivi}
                title={suivi ? "Ses prochains messages ne passeront plus en tête de la file" : "Ses prochains messages passeront en tête de la file, marqués « suivi »"}
                onClick={() => suivis.basculer({ type: "expediteur", id: cleExpediteur(m), titre: auteur, href: CHEMIN })}
              >
                {suivi ? "Ne plus suivre" : "Suivre"}
              </button>
              <span className="dal-tr-abonnes" aria-hidden="true">
                <Avatar m={m} taille={20} />
              </span>
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
              {report ? (
                <li>
                  <DalIcone nom="Clock" taille={14} />
                  <span>Reporté dans ce navigateur jusqu&apos;au {jourClair(report.jusqu)}</span>
                </li>
              ) : null}
            </ul>

            <form
              className="dal-tr-reponse"
              onSubmit={(e) => {
                e.preventDefault();
                if (reponse.trim()) setARepondre(m);
              }}
            >
              <textarea rows={reponse.includes("\n") || reponse.length > 80 ? 3 : 1} value={reponse} onChange={(e) => setReponse(e.target.value)} placeholder={`Répondre à ${auteur}…`} aria-label={`Répondre à ${auteur}`} maxLength={2000} />
              <div className="dal-tr-reponse-pied">
                <button
                  type="button"
                  className="dal-tr-reponse-rond"
                  aria-label="Joindre le lien de ce message"
                  title="Joindre le lien de ce message"
                  onClick={() => setReponse((r) => `${r}${r && !r.endsWith(" ") ? " " : ""}${lienAbsolu(m)}`)}
                >
                  <DalIcone nom="Attachment" taille={14} />
                </button>
                <button type="submit" className="dal-tr-reponse-rond dal-tr-reponse-envoyer" aria-label={lienRep ? `Répondre par ${CANAUX[m.canal]}` : "Copier la réponse"} title={lienRep ? `Répondre par ${CANAUX[m.canal]}` : "Copier la réponse"} disabled={!reponse.trim()}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                    <path d="M8 2a.75.75 0 0 1 .53.22l4.5 4.5a.75.75 0 0 1-1.06 1.06L8.75 4.56v8.69a.75.75 0 0 1-1.5 0V4.56L4.03 7.78a.75.75 0 0 1-1.06-1.06l4.5-4.5A.75.75 0 0 1 8 2" />
                  </svg>
                </button>
              </div>
            </form>
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
      {/* Marquer comme doublon : choisir le message d'origine, puis écarter celui-ci (G06) avec ce motif */}
      <ModalOverlay isOpen={!!aDoublon} onOpenChange={(o) => !o && !envoi && setADoublon(null)} isDismissable={!envoi} className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void marquerDoublon();
              }}
            >
              <div className="v2-modale-corps">
                <Heading slot="title">Marquer comme doublon de…</Heading>
                <p>Le message de {aDoublon ? auteurDe(aDoublon) : ""} est écarté de la file ; le motif garde le message d&apos;origine, qui reste à ranger.</p>
                <label className="v2-libelle">
                  Message d&apos;origine
                  <span className="v2-champ">
                    <select value={origine} onChange={(e) => setOrigine(e.target.value)} required>
                      <option value="">Choisir le message</option>
                      {tousMessages
                        .filter((x) => x.id !== aDoublon?.id)
                        .map((x) => (
                          <option key={x.id} value={x.id}>
                            {auteurDe(x)} · {dateHeure(x.recu_le)} · {titreDe(x).slice(0, 60)}
                          </option>
                        ))}
                    </select>
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
                <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={envoi || !origine}>
                  {envoi ? "Enregistrement…" : "Écarter comme doublon"}
                </button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>

      {/* Reporter à une date choisie (Snooze) : dans ce navigateur */}
      <ModalOverlay isOpen={!!aReporter} onOpenChange={(o) => !o && setAReporter(null)} isDismissable className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (aReporter && dateReport > isoJour(new Date())) {
                  reporterMessage(aReporter, dateReport);
                  setAReporter(null);
                }
              }}
            >
              <div className="v2-modale-corps">
                <Heading slot="title">Reporter jusqu&apos;au…</Heading>
                <p>Le message quitte la file jusqu&apos;à ce jour, puis il y revient. Le report vaut pour ce navigateur ; rien n&apos;est changé en base.</p>
                <label className="v2-libelle">
                  Date
                  <span className="v2-champ">
                    <input type="date" value={dateReport} min={dansJours(1)} onChange={(e) => setDateReport(e.target.value)} required />
                  </span>
                </label>
              </div>
              <div className="v2-modale-pied">
                <Button className="v2-btn v2-btn--petit" slot="close">
                  Annuler
                </Button>
                <button type="submit" className="v2-btn v2-btn--petit v2-btn--primaire" disabled={!dateReport || dateReport <= isoJour(new Date())}>
                  Reporter
                </button>
              </div>
            </form>
          </Dialog>
        </Modal>
      </ModalOverlay>

      {/* Répondre : la confirmation (la réponse part de votre application, par le canal du message) */}
      <ModalOverlay isOpen={!!aRepondre} onOpenChange={(o) => !o && setARepondre(null)} isDismissable className="v2-jetons v2-voile">
        <Modal className="v2-modale">
          <Dialog className="v2-modale-dialogue">
            <div className="v2-modale-corps">
              <Heading slot="title">{aRepondre && lienReponse(aRepondre, "x") ? `Répondre par ${CANAUX[aRepondre.canal]} ?` : "Copier la réponse ?"}</Heading>
              <p>
                {aRepondre && lienReponse(aRepondre, "x")
                  ? `Votre ${aRepondre.canal === "email" ? "messagerie" : aRepondre.canal === "sms" ? "application SMS" : "application WhatsApp"} s'ouvre avec ce texte, adressé à ${auteurDe(aRepondre)} (${aRepondre.de_adresse}). Le message part quand vous l'envoyez de là.`
                  : `L'adresse de ${aRepondre ? auteurDe(aRepondre) : "l'expéditeur"} n'est pas utilisable ici : le texte est copié, collez-le dans votre conversation avec lui.`}
              </p>
              <blockquote className="dal-tr-citation">{reponse}</blockquote>
            </div>
            <div className="v2-modale-pied">
              <Button className="v2-btn v2-btn--petit" slot="close">
                Annuler
              </Button>
              <button type="button" className="v2-btn v2-btn--petit v2-btn--primaire" onClick={repondre}>
                {aRepondre && lienReponse(aRepondre, "x") ? `Ouvrir ${aRepondre.canal === "email" ? "la messagerie" : aRepondre.canal === "sms" ? "les SMS" : "WhatsApp"}` : "Copier la réponse"}
              </button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DalCarte>
  );
}
