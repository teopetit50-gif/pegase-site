"use client";

/* ══════════════════════════════════════════════════════════════════════
   LORANI « Questions et réponses » (02/11/2026)

   Plain, Threads, au 1:1 : relevé docs/refonte-metiers/releves/
   plain-threads.md (liste « All threads » et fil ouvert), jetons et
   briques plain-commun.md ; styles ./lor-plain.css (préfixe lor-pl-).
   Un fil de Plain = une question (ou une action) des comptes rendus de
   chantier ou posée depuis un constat du contrôle, tous projets
   confondus (lorani_points, b5_20, b5_25). Elle était visible seulement
   dans « En suspens » d'un compte rendu postérieur (O6 de l'inventaire) :
   ici, chacune a sa ligne, de la question à la réponse.

     · Groupes de Plain (Needs first response, Needs next response,
       Investigating) → « Sans réponse depuis 8 jours » (ce que le point du
       matin remonte, b5_25), « En attente de réponse », « Réponse reçue, à
       solder » ; Affichage : les soldées.
     · Compte (account) → le projet ; client → le destinataire ; tier → le
       lot ; réf. « T-8 » → le compte rendu d'origine ; étiquettes → nature,
       « Point du matin », « Échéance passée » ; priorité → urgence ; SLA →
       échéance ; canal + âge ; assigné → chef de projet.
     · Fil ouvert (?point=) : la question, la réponse, les événements, le
       bandeau d'état ; volet « Détails » ; barre Y · Réponse reçue R ·
       Solder S · Plus ; « Sidekick Agent » → Copier pour l'assistant B.

   Portes (components/espace/lorani/portes.ts, inchangées) : ajouterPoints
   (Nouvelle question, G34), majPoint (Réponse reçue G58, Solder G59,
   Reporter l'échéance, Rouvrir). Rien n'est envoyé : la relance par
   courriel ouvre la messagerie de l'utilisateur, il l'envoie lui-même.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, CircleHelp, Clock3, Undo2 } from "lucide-react";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogIcone, DialogTitle } from "@/components/ui/dialog";
import { Loader } from "@/components/ui/loader";
import { Avis } from "@/components/espace/ui";
import { ajouterPoints, majPoint } from "@/components/espace/lorani/portes";
import type { Dossier, Intervenant, Point, Projet } from "@/components/espace/lorani/types";
import { RACINE } from "../modules";
import { useToast } from "../Toasts";
import { useLorani } from "./donnees";
import { useExempleSuivi } from "./exemples-suivi";
import "@/components/espace/espace.css";
import "./lor-plain.css";

const CHEMIN = `${RACINE}/lorani/questions`;
const lienProjet = (id: string) => `${RACINE}/lorani/projets/${encodeURIComponent(id)}?partie=chantier`;

/* ——— icônes de Plain (plain-threads.md, SVG exacts) ——— */
const Svg = ({ children, vue = "0 0 24 24", titre }: { children: React.ReactNode; vue?: string; titre?: string }) => (
  <svg viewBox={vue} fill="currentColor" aria-hidden={titre ? undefined : true} role={titre ? "img" : undefined}>
    {titre ? <title>{titre}</title> : null}
    {children}
  </svg>
);
const IcPremiere = ({ titre }: { titre?: string }) => (
  <Svg titre={titre}>
    <path d="M3.818 12.818a.818.818 0 1 1 0-1.636h3.273a.818.818 0 1 1 0 1.636zm5.277-3.723a.81.81 0 0 1-1.145 0l-.573-.572a.81.81 0 0 1 1.146-1.146l.572.573a.81.81 0 0 1 0 1.145M12 7.91a.82.82 0 0 1-.818-.818V3.818a.818.818 0 1 1 1.636 0v3.273a.82.82 0 0 1-.818.818m4.05 1.186a.81.81 0 0 1-1.146-1.145l.573-.573a.81.81 0 1 1 1.146 1.146zm.86 3.723a.818.818 0 1 1 0-1.636h3.272a.818.818 0 1 1 0 1.636zM12 14.454a2.37 2.37 0 0 1-1.739-.715A2.37 2.37 0 0 1 9.545 12q.001-1.023.716-1.739A2.37 2.37 0 0 1 12 9.545q1.023.001 1.739.716.715.716.715 1.739t-.715 1.739a2.37 2.37 0 0 1-1.739.715m4.623 2.169a.81.81 0 0 1-1.146 0l-.572-.573a.81.81 0 0 1 1.145-1.146l.573.573a.81.81 0 0 1 0 1.146m-8.1 0a.81.81 0 0 1-1.146-1.146l.573-.572a.81.81 0 1 1 1.145 1.145zM12 21a.82.82 0 0 1-.818-.818v-3.273a.818.818 0 1 1 1.636 0v3.273A.82.82 0 0 1 12 21" />
  </Svg>
);
const IcSuivante = ({ titre }: { titre?: string }) => (
  <Svg titre={titre}>
    <path d="M19.302 18.39a.88.88 0 0 1-.648-.261.88.88 0 0 1-.262-.649V14.75q0-1.139-.797-1.935a2.63 2.63 0 0 0-1.934-.796H7.285l2.663 2.663q.25.25.25.614a.87.87 0 0 1-.273.637.86.86 0 0 1-.637.25.86.86 0 0 1-.637-.25l-4.188-4.187a.8.8 0 0 1-.194-.296 1 1 0 0 1-.056-.342q0-.182.056-.341a.8.8 0 0 1 .194-.296l4.21-4.21a.84.84 0 0 1 .615-.25q.364 0 .637.272.25.25.25.638 0 .387-.25.637l-2.64 2.64h8.376q1.889 0 3.22 1.332 1.332 1.33 1.331 3.22v2.731a.88.88 0 0 1-.261.649.88.88 0 0 1-.649.261" />
  </Svg>
);
const IcEnCours = ({ titre }: { titre?: string }) => (
  <Svg titre={titre}>
    <path d="M4.013 12a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0M8.013 12a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0M12.013 12a1.2 1.2 0 1 1 2.4 0 1.2 1.2 0 0 1-2.4 0" />
    <path d="M13.438 7.425a.95.95 0 0 1 .287-.725q.3-.3.713-.3.412 0 .687.275l4.6 4.6q.15.15.212.325.063.176.063.375 0 .2-.062.375a.9.9 0 0 1-.213.325L15.15 17.25q-.3.3-.713.3a.97.97 0 0 1-.712-.3q-.3-.3-.3-.713 0-.412.3-.712l3.85-3.85L13.75 8.15q-.3-.3-.312-.725" />
  </Svg>
);
const IcFait = ({ titre }: { titre?: string }) => (
  <Svg titre={titre}>
    <path d="M9.55 17.575q-.2 0-.375-.063a.9.9 0 0 1-.325-.212L4.55 13q-.274-.274-.263-.713.014-.437.288-.712a.95.95 0 0 1 .7-.275q.425 0 .7.275L9.55 15.15l8.475-8.475q.274-.275.713-.275.437 0 .712.275.275.274.275.712t-.275.713l-9.2 9.2q-.15.15-.325.212a1.1 1.1 0 0 1-.375.063" />
  </Svg>
);
const IcBulle = () => (
  <Svg>
    <path fillRule="evenodd" clipRule="evenodd" d="M6.34 5.792C4.94 6.955 4 8.756 4 11.38c0 2.002.55 3.515 1.41 4.627.46.594.73 1.5.324 2.367q-.204.435-.423.826c-.086.155-.088.402.033.615a.43.43 0 0 0 .152.167c.027.015.05.021.095.012 1.226-.245 2.547-.603 3.617-1.11a2.42 2.42 0 0 1 1.342-.215c.47.06.956.09 1.45.09 2.232 0 4.235-.606 5.66-1.791C19.06 15.804 20 14.003 20 11.38s-.941-4.425-2.34-5.588C16.235 4.606 14.232 4 12 4s-4.235.606-5.66 1.792M5.06 4.254C6.937 2.694 9.434 2 12 2s5.064.695 6.94 2.254C20.84 5.836 22 8.224 22 11.38c0 3.155-1.16 5.543-3.06 7.125-1.876 1.56-4.373 2.254-6.94 2.254q-.864 0-1.702-.106a.42.42 0 0 0-.235.04c-1.283.606-2.783 1.003-4.08 1.263-1.1.22-1.96-.417-2.378-1.152-.41-.721-.52-1.718-.041-2.576q.186-.335.359-.702c.005-.012.014-.036.005-.088a.5.5 0 0 0-.1-.207C2.663 15.724 2 13.765 2 11.38c0-3.156 1.16-5.544 3.06-7.126" />
  </Svg>
);
/* les deux bulles du titre « All threads » */
const IcFils = () => (
  <Svg>
    <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h8A2.5 2.5 0 0 1 16 5.5v5a2.5 2.5 0 0 1-2.5 2.5H8.2l-2.6 2.1A1 1 0 0 1 4 14.3V13a1 1 0 0 1-1-1zM5.5 5a.5.5 0 0 0-.5.5V11h1v1.2L7.5 11h6a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5z" />
    <path d="M18 8.5a1 1 0 0 1 1-1h.5A2.5 2.5 0 0 1 22 10v5a2.5 2.5 0 0 1-2 2.45v1.25a1 1 0 0 1-1.62.78L15.65 17.5H11a1 1 0 1 1 0-2h5a1 1 0 0 1 .62.22L18 16.8V16.5a1 1 0 0 1 1-1h.5a.5.5 0 0 0 .5-.5v-5a.5.5 0 0 0-.5-.5H19a1 1 0 0 1-1-1" />
  </Svg>
);
const IcSansAssigne = ({ titre }: { titre?: string }) => (
  <Svg titre={titre}>
    <path d="M5.85 17.1q1.275-.975 2.85-1.538A9.7 9.7 0 0 1 12 15q1.725 0 3.3.563t2.85 1.537a7.7 7.7 0 0 0 1.363-2.325A7.8 7.8 0 0 0 20 12q0-3.325-2.337-5.662Q15.325 4 12 4T6.338 6.338 4 12q0 1.474.487 2.775.488 1.3 1.363 2.325M12 13q-1.474 0-2.488-1.012Q8.5 10.975 8.5 9.5q0-1.474 1.012-2.487T12 6t2.488 1.013Q15.5 8.026 15.5 9.5t-1.012 2.488Q13.475 13 12 13m0 9a9.7 9.7 0 0 1-3.9-.788 10.1 10.1 0 0 1-3.175-2.137q-1.35-1.35-2.137-3.175A9.7 9.7 0 0 1 2 12q0-2.075.788-3.9a10.1 10.1 0 0 1 2.137-3.175q1.35-1.35 3.175-2.137A9.7 9.7 0 0 1 12 2q2.075 0 3.9.788a10.1 10.1 0 0 1 3.175 2.137q1.35 1.35 2.137 3.175A9.7 9.7 0 0 1 22 12a9.7 9.7 0 0 1-.788 3.9 10.1 10.1 0 0 1-2.137 3.175q-1.35 1.35-3.175 2.137A9.7 9.7 0 0 1 12 22m0-2q1.325 0 2.5-.387a7.5 7.5 0 0 0 2.15-1.113 7.5 7.5 0 0 0-2.15-1.113A8 8 0 0 0 12 17q-1.325 0-2.5.387A7.5 7.5 0 0 0 7.35 18.5a7.5 7.5 0 0 0 2.15 1.113A8 8 0 0 0 12 20m0-9q.65 0 1.075-.425T13.5 9.5t-.425-1.075T12 8t-1.075.425T10.5 9.5t.425 1.075T12 11" />
  </Svg>
);
/* compte (immeuble), étiquette, filtres, affichage, plus, croix, flèche, chevrons, note, copier */
const IcCompte = () => (
  <Svg>
    <path d="M5 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4h1a2 2 0 0 1 2 2v10h1a1 1 0 1 1 0 2H4a1 1 0 1 1 0-2zm2 0h3v-3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v3h1V5H7zm9 0h1V11h-1zM9 7h1v2H9zm3 0h1v2h-1zm-3 4h1v2H9zm3 0h1v2h-1z" />
  </Svg>
);
const IcEtiquette = () => (
  <Svg>
    <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h9.38a2.5 2.5 0 0 1 1.94.92l2.86 3.5a2.5 2.5 0 0 1 0 3.16l-2.86 3.5a2.5 2.5 0 0 1-1.94.92H6.5A2.5 2.5 0 0 1 4 16.5zM6.5 7a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h9.38a.5.5 0 0 0 .39-.18l2.86-3.5a.5.5 0 0 0 0-.64l-2.86-3.5a.5.5 0 0 0-.39-.18z" />
  </Svg>
);
const IcLosange = ({ couleur }: { couleur: string }) => (
  <svg viewBox="0 0 14 14" aria-hidden="true" style={{ color: couleur }}>
    <path fill="currentColor" d="M7 1.5 12.5 6 7 10.5 1.5 6z" opacity=".55" />
    <path fill="currentColor" d="M7 3.5 12.5 8 7 12.5 1.5 8z" />
  </svg>
);
const IcFiltres = () => (
  <Svg>
    <path d="M3 7a1 1 0 0 1 1-1h7.17a3 3 0 0 1 5.66 0H20a1 1 0 1 1 0 2h-3.17a3 3 0 0 1-5.66 0H4a1 1 0 0 1-1-1m11 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2M3 17a1 1 0 0 1 1-1h3.17a3 3 0 0 1 5.66 0H20a1 1 0 1 1 0 2h-7.17a3 3 0 0 1-5.66 0H4a1 1 0 0 1-1-1m7 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2" />
  </Svg>
);
const IcAffichage = () => (
  <Svg>
    <path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 15.5zM5.5 6a.5.5 0 0 0-.5.5v9a.5.5 0 0 0 .5.5h13a.5.5 0 0 0 .5-.5v-9a.5.5 0 0 0-.5-.5zM2 20a1 1 0 0 1 1-1h18a1 1 0 1 1 0 2H3a1 1 0 0 1-1-1" />
  </Svg>
);
const IcPlus = () => (
  <Svg>
    <path d="M12 4a1 1 0 0 1 1 1v6h6a1 1 0 1 1 0 2h-6v6a1 1 0 1 1-2 0v-6H5a1 1 0 1 1 0-2h6V5a1 1 0 0 1 1-1" />
  </Svg>
);
const IcCroix = () => (
  <Svg>
    <path d="M6.3 6.3a1 1 0 0 1 1.4 0L12 10.6l4.3-4.3a1 1 0 1 1 1.4 1.4L13.4 12l4.3 4.3a1 1 0 0 1-1.4 1.4L12 13.4l-4.3 4.3a1 1 0 0 1-1.4-1.4l4.3-4.3-4.3-4.3a1 1 0 0 1 0-1.4" />
  </Svg>
);
const IcPoints = () => (
  <Svg>
    <path d="M6 13.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m6 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" />
  </Svg>
);
const IcChevron = ({ bas }: { bas?: boolean }) => (
  <Svg>
    <path d={bas ? "M6.3 9.3a1 1 0 0 1 1.4 0L12 13.6l4.3-4.3a1 1 0 1 1 1.4 1.4l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 0 1 0-1.4" : "M9.3 6.3a1 1 0 0 1 1.4 0l5 5a1 1 0 0 1 0 1.4l-5 5a1 1 0 0 1-1.4-1.4l4.3-4.3-4.3-4.3a1 1 0 0 1 0-1.4"} />
  </Svg>
);
const IcRetour = () => (
  <Svg>
    <path d="M10.7 5.3a1 1 0 0 1 0 1.4L7.4 10H15a6 6 0 0 1 6 6v2a1 1 0 1 1-2 0v-2a4 4 0 0 0-4-4H7.4l3.3 3.3a1 1 0 0 1-1.4 1.4l-5-5a1 1 0 0 1 0-1.4l5-5a1 1 0 0 1 1.4 0" />
  </Svg>
);
const IcCopier = () => (
  <Svg>
    <path d="M8 4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-1v1a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3h2zm2 2h4a3 3 0 0 1 3 3v5h1V4h-8zM6 8a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z" />
  </Svg>
);
const IcAssistant = () => (
  <Svg>
    <path d="M12 2.5a1 1 0 0 1 .5.13l7.5 4.33a1 1 0 0 1 .5.87v8.34a1 1 0 0 1-.5.87l-7.5 4.33a1 1 0 0 1-1 0L4 17.04a1 1 0 0 1-.5-.87V7.83a1 1 0 0 1 .5-.87l7.5-4.33a1 1 0 0 1 .5-.13m0 2.15L5.5 8.4v7.2l6.5 3.75 6.5-3.75V8.4zm3.7 4.65a1 1 0 0 1 0 1.4l-4 4a1 1 0 0 1-1.4 0l-2-2a1 1 0 1 1 1.4-1.4l1.3 1.29 3.3-3.3a1 1 0 0 1 1.4 0" />
  </Svg>
);
const IcNote = () => (
  <Svg>
    <path d="M6 3h8.59a2 2 0 0 1 1.41.59l3.41 3.41a2 2 0 0 1 .59 1.41V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m0 2v14h12V9h-3a2 2 0 0 1-2-2V5zm9 .41V7h1.59zM8 12a1 1 0 0 1 1-1h6a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1m0 4a1 1 0 0 1 1-1h4a1 1 0 1 1 0 2H9a1 1 0 0 1-1-1" />
  </Svg>
);
const IcLien = () => (
  <Svg>
    <path d="M10.6 6.3 12 4.9a5 5 0 0 1 7.07 7.07l-1.41 1.42a1 1 0 0 1-1.42-1.42l1.42-1.41a3 3 0 0 0-4.25-4.24L12 7.73a1 1 0 0 1-1.4-1.42m-3.54 3.54a1 1 0 0 1 0 1.41l-1.41 1.42a3 3 0 0 0 4.24 4.24L11.3 15.5a1 1 0 0 1 1.42 1.42l-1.42 1.41a5 5 0 1 1-7.07-7.07l1.41-1.42a1 1 0 0 1 1.42 0m6.65.03a1 1 0 0 1 0 1.42l-3.03 3.03a1 1 0 0 1-1.42-1.42l3.04-3.03a1 1 0 0 1 1.41 0" />
  </Svg>
);
const IcCourriel = () => (
  <Svg>
    <path d="M3 7a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zm2.24-.6L12 11.8l6.76-5.4A1 1 0 0 0 18 6H6a1 1 0 0 0-.76.4M19 8.5l-6.38 5.1a1 1 0 0 1-1.24 0L5 8.5V17a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1z" />
  </Svg>
);
const IcCacheOeil = () => (
  <Svg>
    <path d="M3.3 3.3a1 1 0 0 1 1.4 0l16 16a1 1 0 0 1-1.4 1.4l-2.6-2.6A10.4 10.4 0 0 1 12 19c-4.6 0-8.3-3-9.8-6.6a1 1 0 0 1 0-.8 11.6 11.6 0 0 1 3.5-4.5L3.3 4.7a1 1 0 0 1 0-1.4m3.86 5.27A9.4 9.4 0 0 0 4.2 12c1.4 2.9 4.3 5 7.8 5 1.2 0 2.3-.2 3.3-.7l-1.6-1.6a3.5 3.5 0 0 1-4.4-4.4zM12 5c4.6 0 8.3 3 9.8 6.6a1 1 0 0 1 0 .8 11.6 11.6 0 0 1-1.9 3 1 1 0 0 1-1.5-1.3c.6-.6 1-1.3 1.4-2.1C18.4 9.1 15.5 7 12 7c-.5 0-1 0-1.5.1a1 1 0 0 1-.3-2C10.8 5 11.4 5 12 5" />
  </Svg>
);

/* priorité de Plain : trois barres (Normal, Low, High) ou le carré rouge (Urgent) */
type Urgence = "urgent" | "haute" | "normale" | "basse";
const LIBELLE_URGENCE: Record<Urgence, string> = { urgent: "Urgent", haute: "Haute", normale: "Normale", basse: "Basse" };
function IcPriorite({ u }: { u: Urgence }) {
  if (u === "urgent")
    return (
      <svg viewBox="0 0 18 18" aria-hidden="true">
        <path fill="var(--pl-rouge-i)" fillRule="evenodd" clipRule="evenodd" d="M2.674 3.778C2 4.787 2 6.19 2 9c0 2.809 0 4.213.674 5.222.292.437.667.812 1.104 1.104C4.787 16 6.19 16 9 16c2.809 0 4.213 0 5.222-.674a4.003 4.003 0 0 0 1.104-1.104C16 13.213 16 11.81 16 9c0-2.809 0-4.213-.674-5.222a4.002 4.002 0 0 0-1.104-1.104C13.213 2 11.81 2 9 2c-2.809 0-4.213 0-5.222.674a4 4 0 0 0-1.104 1.104ZM9 10c.283 0 .52-.096.713-.287A.968.968 0 0 0 10 9V6a.968.968 0 0 0-.287-.713A.968.968 0 0 0 9 5a.968.968 0 0 0-.713.287A.968.968 0 0 0 8 6v3c0 .283.096.52.287.713.192.191.43.287.713.287Zm0 3c.283 0 .52-.096.713-.287A.968.968 0 0 0 10 12a.968.968 0 0 0-.287-.713A.967.967 0 0 0 9 11a.967.967 0 0 0-.713.287A.968.968 0 0 0 8 12c0 .283.096.52.287.713.192.191.43.287.713.287Z" />
      </svg>
    );
  const c = u === "haute" ? ["var(--pl-jaune-i)", "var(--pl-jaune-i)", "var(--pl-jaune-i)"] : u === "normale" ? ["var(--pl-prio-vide)", "var(--pl-prio-plein)", "var(--pl-prio-plein)"] : ["var(--pl-prio-vide)", "var(--pl-prio-vide)", "var(--pl-prio-plein)"];
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <rect width="12" height="2" x="3" y="4" rx=".5" fill={c[0]} />
      <rect width="12" height="2" x="3" y="8" rx=".5" fill={c[1]} />
      <rect width="12" height="2" x="3" y="12" rx=".5" fill={c[2]} />
    </svg>
  );
}

/* ——— ce que la page calcule ——— */
type Etat = "relance" | "attente" | "recue" | "soldee";
const GROUPES: { cle: Etat; libelle: string; sous: string }[] = [
  { cle: "relance", libelle: "Sans réponse depuis 8 jours", sous: "Elles remontent au point du matin, la plus ancienne d'abord." },
  { cle: "attente", libelle: "En attente de réponse", sous: "" },
  { cle: "recue", libelle: "Réponse reçue, à solder", sous: "" },
  { cle: "soldee", libelle: "Soldées", sous: "" },
];
const LIBELLE_ETAT: Record<Etat, string> = { relance: "Sans réponse", attente: "En attente", recue: "Réponse reçue", soldee: "Soldée" };
const IconeEtat = ({ e, titre }: { e: Etat; titre?: string }) =>
  e === "relance" ? <IcPremiere titre={titre} /> : e === "attente" ? <IcEnCours titre={titre} /> : e === "recue" ? <IcSuivante titre={titre} /> : <IcFait titre={titre} />;

const jourIso = (d = new Date()) => {
  const x = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return x.toISOString().slice(0, 10);
};
const ecartJours = (a: string, b: string) => Math.round((new Date(`${b.slice(0, 10)}T12:00:00`).getTime() - new Date(`${a.slice(0, 10)}T12:00:00`).getTime()) / 86400000);
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const dateCourteFr = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [a, m, j] = iso.slice(0, 10).split("-").map(Number);
  return `${j} ${MOIS[m - 1]}${a !== new Date().getFullYear() ? ` ${a}` : ""}`;
};
const dateFr = (iso: string | null | undefined) => (iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR") : "—");
const ilYaTexte = (jours: number) => (jours <= 0 ? "aujourd'hui" : jours === 1 ? "hier" : `il y a ${jours} j`);
const initiales = (nom: string) => nom.split(/[\s-]+/).filter(Boolean).slice(0, 2).map((m) => m[0]?.toUpperCase()).join("") || "?";
const LOT_COULEURS = ["#3e9b6e", "#6e56cf", "#2f6fdb", "#d28f19", "#c2477c", "#0f8f8f"];

type Q = {
  p: Point;
  projet: Projet | null;
  dest: Intervenant | null;
  lot: string | null;
  lotCouleur: string;
  cr: number | null;
  age: number;
  etat: Etat;
  urgence: Urgence;
  retard: boolean;
  chef: string | null;
};

function lire(d: Dossier, aujourdhui: string): Q[] {
  const lots = new Map(d.lots.map((l, i) => [l.id, { l, c: LOT_COULEURS[i % LOT_COULEURS.length] }]));
  return d.points
    .filter((p) => p.nature === "question" || p.nature === "action")
    .map((p) => {
      const projet = d.projets.find((x) => x.id === p.projet_id) ?? null;
      const dest = d.intervenants.find((i) => i.id === p.intervenant_id) ?? null;
      const lotId = p.lot_id ?? dest?.lot_id ?? null;
      const lo = lotId ? lots.get(lotId) : undefined;
      const age = Math.max(0, ecartJours(p.cree_le, aujourdhui));
      const etat: Etat = p.statut === "clos" ? "soldee" : p.statut === "repondu" ? "recue" : age >= 8 ? "relance" : "attente";
      const retard = p.statut === "ouvert" && !!p.echeance && p.echeance < aujourdhui;
      const urgence: Urgence = p.statut !== "ouvert" ? "basse" : retard ? "urgent" : age > 15 ? "haute" : p.echeance && ecartJours(aujourdhui, p.echeance) <= 7 ? "normale" : age >= 8 ? "normale" : "basse";
      const chef = d.membres.find((m) => m.projet_id === p.projet_id && m.role_projet === "chef_projet")?.user_id ?? null;
      return {
        p, projet, dest, lot: lo ? `Lot ${lo.l.numero} · ${lo.l.intitule}` : null, lotCouleur: lo?.c ?? "var(--pl-i1)",
        cr: d.comptesRendus.find((c) => c.id === p.ouvert_au_cr)?.numero ?? null, age, etat, urgence, retard, chef,
      };
    });
}

const refDe = (q: Q) => (q.cr ? `CR ${q.cr}` : q.p.nature === "action" ? "Action" : "Directe");
const destDe = (q: Q) => q.dest?.organisme ?? (q.p.nature === "action" ? "L'agence" : "Sans destinataire");

/* le texte d'une ou plusieurs questions, pour l'assistant ou un courriel */
function pourAssistant(qs: Q[], nommer: (id: string | null) => string): string {
  return qs
    .map((q) =>
      [
        `${q.p.nature === "action" ? "Action" : "Question"} — projet « ${q.projet?.nom ?? "?"} »${q.lot ? `, ${q.lot}` : ""}`,
        `Destinataire : ${destDe(q)}${q.dest?.contact ? ` (${q.dest.contact})` : ""}`,
        `Posée le ${dateFr(q.p.cree_le)}${q.cr ? ` au compte rendu n° ${q.cr}` : ""}, ${q.age} jours ; état : ${LIBELLE_ETAT[q.etat].toLowerCase()}${q.p.echeance ? ` ; échéance le ${dateFr(q.p.echeance)}${q.retard ? " (passée)" : ""}` : ""}`,
        `Chef de projet : ${q.chef ? nommer(q.chef) : "—"}`,
        `Texte : ${q.p.texte}`,
        q.p.reponse ? `Réponse${q.p.repondu_le ? ` du ${dateFr(q.p.repondu_le)}` : ""} : ${q.p.reponse}` : "Réponse : aucune",
      ].join("\n"),
    )
    .join("\n\n");
}
const texteRelance = (q: Q) =>
  `Bonjour${q.dest?.contact ? ` ${q.dest.contact}` : ""},\n\nSur le projet « ${q.projet?.nom ?? ""} », nous attendons votre réponse à la question posée le ${dateFr(q.p.cree_le)}${q.cr ? ` (compte rendu de chantier n° ${q.cr})` : ""} :\n\n« ${q.p.texte} »\n\n${q.p.echeance ? `Elle était attendue pour le ${dateFr(q.p.echeance)}. ` : ""}Merci de nous répondre dès que possible.\n\nCordialement,`;

function csv(qs: Q[], nommer: (id: string | null) => string): string {
  const c = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const tete = ["Projet", "Nature", "Destinataire", "Lot", "Compte rendu", "Posée le", "Âge (jours)", "Échéance", "État", "Urgence", "Chef de projet", "Texte", "Réponse", "Répondu le"];
  const lignes = qs.map((q) => [q.projet?.nom, q.p.nature === "action" ? "Action" : "Question", destDe(q), q.lot, q.cr ? `n° ${q.cr}` : "", dateFr(q.p.cree_le), q.age, q.p.echeance ? dateFr(q.p.echeance) : "", LIBELLE_ETAT[q.etat], LIBELLE_URGENCE[q.urgence], q.chef ? nommer(q.chef) : "", q.p.texte, q.p.reponse, q.p.repondu_le ? dateFr(q.p.repondu_le) : ""].map(c).join(";"));
  return "﻿" + [tete.map(c).join(";"), ...lignes].join("\r\n");
}
function telecharger(nom: string, contenu: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* un menu qui se ferme au clic dehors et à Échap */
function useMenu() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOuvert(false);
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche);
    };
  }, [ouvert]);
  return [ouvert, setOuvert, ref] as const;
}

type CleFiltre = "projet" | "destinataire" | "nature" | "urgence";
const FILTRES: { cle: CleFiltre; libelle: string }[] = [
  { cle: "projet", libelle: "Projet" },
  { cle: "destinataire", libelle: "Destinataire" },
  { cle: "nature", libelle: "Nature" },
  { cle: "urgence", libelle: "Urgence" },
];
const valeurFiltre = (q: Q, cle: CleFiltre) => (cle === "projet" ? q.projet?.nom ?? "—" : cle === "destinataire" ? destDe(q) : cle === "nature" ? (q.p.nature === "action" ? "Action" : "Question") : LIBELLE_URGENCE[q.urgence]);

type Form =
  | { type: "nouvelle" }
  | { type: "reponse"; ids: string[] }
  | { type: "solder"; ids: string[] }
  | { type: "reporter"; ids: string[] }
  | null;

export default function Questions() {
  useExempleSuivi();
  const { dossier, agir, peutEcrire, pret, erreur: erreurLecture, nommer, clientId, source } = useLorani();
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const ouvertId = params.get("point");
  const aujourdhui = jourIso();

  const tout = useMemo(() => lire(dossier, aujourdhui), [dossier, aujourdhui]);
  const [filtres, setFiltres] = useState<Partial<Record<CleFiltre, string[]>>>({});
  const [voirSoldees, setVoirSoldees] = useState(false);
  const [voirActions, setVoirActions] = useState(true);
  const [parProjet, setParProjet] = useState(false);
  const [coches, setCoches] = useState<string[]>([]);

  const visibles = useMemo(
    () =>
      tout
        .filter((q) => (voirSoldees ? true : q.etat !== "soldee"))
        .filter((q) => (voirActions ? true : q.p.nature === "question"))
        .filter((q) => FILTRES.every((f) => !filtres[f.cle]?.length || filtres[f.cle]!.includes(valeurFiltre(q, f.cle))))
        .sort((a, b) => a.p.cree_le.localeCompare(b.p.cree_le) || a.p.id.localeCompare(b.p.id)),
    [tout, filtres, voirSoldees, voirActions],
  );
  const groupes = useMemo(() => {
    if (parProjet) {
      const noms = [...new Set(visibles.map((q) => q.projet?.nom ?? "—"))].sort((a, b) => a.localeCompare(b, "fr"));
      return noms.map((n) => ({ cle: n, libelle: n, sous: "", etat: null as Etat | null, lignes: visibles.filter((q) => (q.projet?.nom ?? "—") === n) }));
    }
    return GROUPES.map((g) => ({ cle: g.cle, libelle: g.libelle, sous: g.sous, etat: g.cle as Etat | null, lignes: visibles.filter((q) => q.etat === g.cle) })).filter((g) => g.lignes.length);
  }, [visibles, parProjet]);
  const ordre = useMemo(() => groupes.flatMap((g) => g.lignes), [groupes]);
  const ouverte = ouvertId ? tout.find((q) => q.p.id === ouvertId) ?? null : null;
  const aTraiter = tout.filter((q) => q.etat !== "soldee").length;

  /* ——— adresse ——— */
  const ouvrir = useCallback((id: string | null) => router.replace(id ? `${CHEMIN}?point=${encodeURIComponent(id)}` : CHEMIN, { scroll: false }), [router]);

  /* ——— saisies ——— */
  const [form, setForm] = useState<Form>(null);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [texte, setTexte] = useState("");
  const [date, setDate] = useState("");
  const [nv, setNv] = useState<{ projet: string; dest: string; nature: "question" | "action"; texte: string; echeance: string }>({ projet: "", dest: "", nature: "question", texte: "", echeance: "" });
  const gris = !peutEcrire || envoi;

  const appliquer = async (reel: () => Promise<void>, local: () => Dossier, message: string) => {
    setEnvoi(true);
    setErreur(null);
    try {
      await agir(reel, local);
      setForm(null);
      setCoches([]);
      toast(message, "vert");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "La base n'a pas répondu.");
    } finally {
      setEnvoi(false);
    }
  };
  const ouvrirForm = (f: Form) => {
    setErreur(null);
    setTexte("");
    if (f?.type === "reporter") {
      const premiere = tout.find((q) => q.p.id === f.ids[0]);
      setDate(premiere?.p.echeance ?? jourIso(new Date(Date.now() + 7 * 86400000)));
    }
    if (f?.type === "nouvelle") setNv({ projet: ouverte?.projet?.id ?? dossier.projets.find((p) => p.actif)?.id ?? "", dest: "", nature: "question", texte: "", echeance: "" });
    setForm(f);
  };
  const majLocale = (ids: string[], v: Partial<Point>) => (): Dossier => ({
    ...dossier,
    points: dossier.points.map((p) => (ids.includes(p.id) ? { ...p, ...v, maj_le: new Date().toISOString() } : p)),
  });
  const plusieurs = async (ids: string[], v: Parameters<typeof majPoint>[1]) => {
    for (const id of ids) await majPoint(id, v);
  };
  const soumettreReponse = () => {
    if (form?.type !== "reponse" || !texte.trim()) return;
    const ids = form.ids;
    void appliquer(() => plusieurs(ids, { statut: "repondu", reponse: texte.trim() }), majLocale(ids, { statut: "repondu", reponse: texte.trim(), repondu_le: aujourdhui }), ids.length > 1 ? `${ids.length} réponses notées` : "Réponse notée");
  };
  const soumettreSolde = () => {
    if (form?.type !== "solder") return;
    const ids = form.ids;
    void appliquer(() => plusieurs(ids, { statut: "clos" }), majLocale(ids, { statut: "clos" }), ids.length > 1 ? `${ids.length} questions soldées` : "Question soldée");
  };
  const soumettreReport = () => {
    if (form?.type !== "reporter" || !date) return;
    const ids = form.ids;
    void appliquer(() => plusieurs(ids, { echeance: date }), majLocale(ids, { echeance: date }), `Échéance reportée au ${dateFr(date)}`);
  };
  const rouvrir = (ids: string[]) => void appliquer(() => plusieurs(ids, { statut: "ouvert" }), majLocale(ids, { statut: "ouvert" }), "Question rouverte");
  const projetNv = dossier.projets.find((p) => p.id === nv.projet) ?? null;
  const destsNv = dossier.intervenants.filter((i) => i.projet_id === nv.projet && i.actif);
  const soumettreNouvelle = () => {
    if (!projetNv || !nv.texte.trim() || (nv.nature === "question" && !nv.dest)) return;
    const dest = destsNv.find((i) => i.id === nv.dest) ?? null;
    const ligne = { client_id: clientId, entite_id: projetNv.entite_id, projet_id: projetNv.id, lot_id: dest?.lot_id ?? null, intervenant_id: dest?.id ?? null, nature: nv.nature, texte: nv.texte.trim(), echeance: nv.echeance || null, ouvert_au_cr: null };
    const nouveau = (quand: string): Point => ({ id: `local-${crypto.randomUUID()}`, projet_id: ligne.projet_id, lot_id: ligne.lot_id, intervenant_id: ligne.intervenant_id, nature: ligne.nature, texte: ligne.texte, echeance: ligne.echeance, statut: "ouvert", reponse: null, repondu_le: null, ouvert_au_cr: null, clos_au_cr: null, cree_le: quand, maj_le: quand });
    void appliquer(() => ajouterPoints([ligne]), () => ({ ...dossier, points: [...dossier.points, nouveau(new Date().toISOString())] }), nv.nature === "action" ? "Action posée" : "Question posée");
  };

  const copier = async (t: string, message: string) => {
    try {
      await navigator.clipboard.writeText(t);
      toast(message, "vert");
    } catch {
      toast("Le presse-papiers n'a pas répondu.", "rouge");
    }
  };
  const exporter = (qs: Q[]) => {
    telecharger(`questions-lorani-${aujourdhui}.csv`, csv(qs, nommer));
    toast(`${qs.length} ligne${qs.length > 1 ? "s" : ""} exportée${qs.length > 1 ? "s" : ""}`, "vert");
  };

  /* ——— menus ——— */
  const [mFiltresOuvert, mFiltresSetOuvert, mFiltresRef] = useMenu();
  const [mAffichageOuvert, mAffichageSetOuvert, mAffichageRef] = useMenu();
  const [mPlusOuvert, mPlusSetOuvert, mPlusRef] = useMenu();
  const [mStatutOuvert, mStatutSetOuvert, mStatutRef] = useMenu();
  const [sousFiltre, setSousFiltre] = useState<CleFiltre | null>(null);
  const [cherche, setCherche] = useState("");
  const basculerFiltre = (cle: CleFiltre, v: string) =>
    setFiltres((f) => {
      const l = f[cle] ?? [];
      return { ...f, [cle]: l.includes(v) ? l.filter((x) => x !== v) : [...l, v] };
    });
  const nbFiltres = Object.values(filtres).reduce((n, l) => n + (l?.length ? 1 : 0), 0);

  /* ——— raccourcis : F, V, N ; dans un fil R, S, Y, B, Échap, ↑ ↓ ——— */
  useEffect(() => {
    const touche = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || form) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const k = e.key.toLowerCase();
      if (k === "f") {
        e.preventDefault();
        mFiltresSetOuvert((o) => !o);
        setSousFiltre(null);
      } else if (k === "v") {
        e.preventDefault();
        mAffichageSetOuvert((o) => !o);
      } else if (k === "n" && peutEcrire && !ouverte) {
        e.preventDefault();
        ouvrirForm({ type: "nouvelle" });
      } else if (ouverte) {
        if (k === "escape") ouvrir(null);
        else if (k === "r" && peutEcrire && ouverte.etat !== "soldee") ouvrirForm({ type: "reponse", ids: [ouverte.p.id] });
        else if (k === "s" && peutEcrire && ouverte.etat !== "soldee") ouvrirForm({ type: "solder", ids: [ouverte.p.id] });
        else if (k === "y" && peutEcrire) mStatutSetOuvert((o) => !o);
        else if (k === "b") void copier(pourAssistant([ouverte], nommer), "Copié pour l'assistant");
        else if (k === "arrowdown" || k === "arrowup") {
          const i = ordre.findIndex((q) => q.p.id === ouverte.p.id);
          const s = ordre[i + (k === "arrowdown" ? 1 : -1)];
          if (s) {
            e.preventDefault();
            ouvrir(s.p.id);
          }
        }
      } else if (k === "escape" && coches.length) setCoches([]);
    };
    document.addEventListener("keydown", touche);
    return () => document.removeEventListener("keydown", touche);
  });

  const cocher = (id: string) => setCoches((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const cochees = tout.filter((q) => coches.includes(q.p.id));

  /* ——— rendu d'une ligne (1440) et d'une carte (390, colonne du fil) ——— */
  const avatar = (q: Q, taille?: "24" | "40") =>
    q.chef ? (
      <span className={`lor-pl-avatar${taille ? ` lor-pl-avatar--${taille}` : ""}`} title={`Chef de projet : ${nommer(q.chef)}`}>
        {initiales(nommer(q.chef))}
      </span>
    ) : (
      <IcSansAssigne titre="Pas de chef de projet" />
    );
  const pastilles = (q: Q) => (
    <>
      <span className="lor-pl-pastille">
        <IcEtiquette />
        {q.p.nature === "action" ? "Action" : "Question"}
      </span>
      {q.etat === "relance" ? (
        <span className="lor-pl-pastille lor-pl-pastille--jaune">
          <IcEtiquette />
          Point du matin
        </span>
      ) : null}
      {q.retard ? (
        <span className="lor-pl-pastille lor-pl-pastille--rouge">
          <IcEtiquette />
          Échéance passée
        </span>
      ) : null}
    </>
  );
  const pastilleLot = (q: Q) =>
    q.lot ? (
      <span className="lor-pl-pastille" title={q.lot}>
        <IcLosange couleur={q.lotCouleur} />
        {q.lot}
      </span>
    ) : (
      <span className="lor-pl-pastille">
        <IcLosange couleur="var(--pl-i2)" />
        {q.dest ? NATURE_DEST[q.dest.nature] ?? "Intervenant" : "Agence"}
      </span>
    );

  const ligne = (q: Q) => (
    <li key={q.p.id}>
      <div className="lor-pl-ligne" data-coche={coches.includes(q.p.id) ? "" : undefined} onClick={() => ouvrir(q.p.id)} role="link" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && ouvrir(q.p.id)} aria-label={`${q.projet?.nom ?? ""} : ${q.p.texte}`}>
        <span className="lor-pl-case" onClick={(e) => e.stopPropagation()}>
          <input type="checkbox" checked={coches.includes(q.p.id)} onChange={() => cocher(q.p.id)} aria-label="Sélectionner la question" />
        </span>
        <span className="lor-pl-statut">
          <IconeEtat e={q.etat} titre={LIBELLE_ETAT[q.etat]} />
        </span>
        <span className="lor-pl-col">
          <span className="lor-pl-l1">
            <span className="lor-pl-vignette">
              <IcCompte />
            </span>
            <span className="lor-pl-compte">{q.projet?.nom ?? "—"}</span>
            <span className="lor-pl-client">{destDe(q)}</span>
          </span>
          <span className="lor-pl-l2">{pastilleLot(q)}</span>
        </span>
        <span className="lor-pl-col lor-pl-col--titre">
          <span className="lor-pl-l1">
            <span className="lor-pl-ref">{refDe(q)}</span>
            <span className="lor-pl-sujet">{q.p.texte}</span>
            <span className="lor-pl-apercu">{q.p.reponse ?? (q.dest?.contact ? `À ${q.dest.contact}` : "Pas encore de réponse")}</span>
          </span>
          <span className="lor-pl-l2">{pastilles(q)}</span>
        </span>
        <span className="lor-pl-prio" title={`Urgence : ${LIBELLE_URGENCE[q.urgence]}`}>
          <IcPriorite u={q.urgence} />
          <span>{LIBELLE_URGENCE[q.urgence]}</span>
        </span>
        <span className="lor-pl-sla" data-retard={q.retard ? "" : undefined} title={q.p.echeance ? `Échéance le ${dateFr(q.p.echeance)}` : "Sans échéance"}>
          {q.p.echeance && q.etat !== "soldee" ? dateCourteFr(q.p.echeance) : ""}
        </span>
        <span className="lor-pl-quand" title={`Posée le ${dateFr(q.p.cree_le)}`}>
          {q.cr ? <IcNote /> : <IcBulle />}
          {ilYaTexte(q.age)}
        </span>
        <span className="lor-pl-qui">{avatar(q)}</span>
      </div>
    </li>
  );
  const fiche = (q: Q, colonne = false) => (
    <li key={q.p.id}>
      <Link href={`${CHEMIN}?point=${encodeURIComponent(q.p.id)}`} scroll={false} className="lor-pl-fiche" aria-current={ouverte?.p.id === q.p.id ? "true" : undefined}>
        <span className="lor-pl-fiche-l lor-pl-fiche-l--petit">
          <span className="lor-pl-vignette">
            <IcCompte />
          </span>
          <b>{q.projet?.nom ?? "—"}</b>
          <span className="lor-pl-dest">{destDe(q)}</span>
          <span className="lor-pl-statut">
            <IconeEtat e={q.etat} titre={LIBELLE_ETAT[q.etat]} />
          </span>
        </span>
        <span className="lor-pl-fiche-bloc">
          <span className="lor-pl-fiche-l">
            <span className="lor-pl-ref">{refDe(q)}</span>
            <span className="lor-pl-sujet">{q.p.texte}</span>
          </span>
          <span className="lor-pl-fiche-l">
            <span className="lor-pl-apercu">{q.p.reponse ?? (q.dest?.contact ? `À ${q.dest.contact}` : "Pas encore de réponse")}</span>
          </span>
        </span>
        <span className="lor-pl-l2">
          {colonne ? null : pastilleLot(q)}
          {pastilles(q)}
        </span>
        <span className="lor-pl-fiche-l">
          <span className="lor-pl-prio">
            <IcPriorite u={q.urgence} />
            <span>{LIBELLE_URGENCE[q.urgence]}</span>
          </span>
          <span className="lor-pl-quand lor-pl-pousse">
            {q.cr ? <IcNote /> : <IcBulle />}
            {ilYaTexte(q.age)}
          </span>
          <span className="lor-pl-qui" style={{ paddingRight: 0 }}>
            {avatar(q)}
          </span>
        </span>
      </Link>
    </li>
  );

  /* ——— en-tête de la liste ——— */
  const menuFiltres = (
    <div className="lor-pl-ancre" ref={mFiltresRef}>
      <button type="button" className="lor-pl-fantome" aria-expanded={mFiltresOuvert} onClick={() => { mFiltresSetOuvert((o) => !o); setSousFiltre(null); }} title="Filtrer (F)">
        <IcFiltres />
        <span className="lor-pl-fantome-libelle">Filtres</span>
        <kbd className="lor-pl-kbd">F</kbd>
      </button>
      {mFiltresOuvert ? (
        <div className="lor-pl-menu" role="menu" aria-label="Filtres" style={{ right: 0, top: 38 }}>
          {FILTRES.map((f) => (
            <button key={f.cle} type="button" role="menuitem" className="lor-pl-option" data-actif={sousFiltre === f.cle ? "" : undefined} onClick={() => { setSousFiltre(f.cle); setCherche(""); }}>
              {f.cle === "projet" ? <IcCompte /> : f.cle === "destinataire" ? <IcSansAssigne /> : f.cle === "nature" ? <IcEtiquette /> : <IcPriorite u="haute" />}
              <span className="lor-pl-option-libelle">{f.libelle}</span>
              {filtres[f.cle]?.length ? <span className="lor-pl-option-droite">{filtres[f.cle]!.length}</span> : null}
              <IcChevron />
            </button>
          ))}
          {sousFiltre ? (
            <div className="lor-pl-menu lor-pl-menu--sous" style={{ right: "calc(100% + 4px)", top: 0 }}>
              <div className="lor-pl-menu-champ">
                <IcFiltres />
                <input autoFocus value={cherche} onChange={(e) => setCherche(e.target.value)} placeholder={`${FILTRES.find((f) => f.cle === sousFiltre)?.libelle}…`} aria-label="Chercher une valeur" />
              </div>
              <div className="lor-pl-menu-liste" role="listbox" aria-multiselectable="true">
                {[...new Set(tout.map((q) => valeurFiltre(q, sousFiltre)))]
                  .filter((v) => v.toLowerCase().includes(cherche.toLowerCase()))
                  .sort((a, b) => a.localeCompare(b, "fr"))
                  .map((v) => {
                    const on = !!filtres[sousFiltre]?.includes(v);
                    return (
                      <button key={v} type="button" role="option" aria-selected={on} className="lor-pl-option" onClick={() => basculerFiltre(sousFiltre, v)}>
                        <span className="lor-pl-coche" data-on={on ? "" : undefined} />
                        <span className="lor-pl-option-libelle">{v}</span>
                        <span className="lor-pl-option-droite">{tout.filter((q) => valeurFiltre(q, sousFiltre) === v && q.etat !== "soldee").length}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
  const menuAffichage = (
    <div className="lor-pl-ancre" ref={mAffichageRef}>
      <button type="button" className="lor-pl-fantome" aria-expanded={mAffichageOuvert} onClick={() => mAffichageSetOuvert((o) => !o)} title="Affichage (V)">
        <IcAffichage />
        <span className="lor-pl-fantome-libelle">Affichage</span>
        <kbd className="lor-pl-kbd">V</kbd>
      </button>
      {mAffichageOuvert ? (
        <div className="lor-pl-menu lor-pl-menu--popover" role="dialog" aria-label="Affichage" style={{ right: 0, top: 38 }}>
          <p className="lor-pl-menu-titre">Grouper par</p>
          <button type="button" className="lor-pl-option" data-actif={!parProjet ? "" : undefined} onClick={() => setParProjet(false)}>
            <span className="lor-pl-option-libelle">État de la question</span>
            {!parProjet ? <Check width={14} height={14} aria-hidden="true" /> : null}
          </button>
          <button type="button" className="lor-pl-option" data-actif={parProjet ? "" : undefined} onClick={() => setParProjet(true)}>
            <span className="lor-pl-option-libelle">Projet</span>
            {parProjet ? <Check width={14} height={14} aria-hidden="true" /> : null}
          </button>
          <div className="lor-pl-sep" />
          <button type="button" className="lor-pl-option" role="switch" aria-checked={voirSoldees} onClick={() => setVoirSoldees((v) => !v)}>
            <span className="lor-pl-option-libelle">Afficher les soldées</span>
            <span className="lor-pl-bascule" data-on={voirSoldees ? "" : undefined} />
          </button>
          <button type="button" className="lor-pl-option" role="switch" aria-checked={voirActions} onClick={() => setVoirActions((v) => !v)}>
            <span className="lor-pl-option-libelle">Afficher les actions</span>
            <span className="lor-pl-bascule" data-on={voirActions ? "" : undefined} />
          </button>
          <div className="lor-pl-sep" />
          <button type="button" className="lor-pl-option" onClick={() => { exporter(visibles); mAffichageSetOuvert(false); }} disabled={!visibles.length}>
            <span className="lor-pl-option-libelle">Exporter la liste en CSV</span>
          </button>
        </div>
      ) : null}
    </div>
  );

  const puces = nbFiltres ? (
    <div className="lor-pl-puces">
      {FILTRES.filter((f) => filtres[f.cle]?.length).map((f) => (
        <span key={f.cle} className="lor-pl-puce">
          <span className="lor-pl-puce-cle">{f.libelle}</span>
          <span>{filtres[f.cle]!.length > 1 ? "parmi" : "est"}</span>
          <button type="button" onClick={() => { mFiltresSetOuvert(true); setSousFiltre(f.cle); }} title="Changer les valeurs">
            {filtres[f.cle]!.join(", ")}
          </button>
          <button type="button" aria-label={`Retirer le filtre ${f.libelle}`} onClick={() => setFiltres((x) => ({ ...x, [f.cle]: [] }))}>
            <IcCroix />
          </button>
        </span>
      ))}
      <button type="button" className="lor-pl-fantome" onClick={() => setFiltres({})}>
        <IcCroix />
        Tout effacer
      </button>
    </div>
  ) : null;

  const liste = (
    <>
      {!peutEcrire && pret ? <p className="lor-pl-note">Lecture seule : vous voyez les questions sans pouvoir les traiter.</p> : null}
      {erreurLecture && source === "reelle" ? <p className="lor-pl-note">La base n&apos;a pas répondu : {erreurLecture}</p> : null}
      {!pret ? (
        <p className="lor-pl-vide" role="status">
          Lecture du dossier…
        </p>
      ) : !groupes.length ? (
        <p className="lor-pl-vide">{tout.length ? "Aucune question ne répond à ces filtres." : "Aucune question en suspens. Les questions des comptes rendus de chantier et celles posées depuis un contrôle arrivent ici."}</p>
      ) : (
        groupes.map((g) => (
          <section key={g.cle} className="lor-pl-groupe" aria-label={g.libelle}>
            <h2 className="lor-pl-groupe-tete">
              {g.etat ? <IconeEtat e={g.etat} /> : <IcCompte />}
              <b>{g.libelle}</b>
              <span>{g.lignes.length}</span>
              {g.sous ? <span className="lor-pl-groupe-sous">{g.sous}</span> : null}
            </h2>
            <ul className="lor-pl-lignes">{g.lignes.map(ligne)}</ul>
            <ul className="lor-pl-fiches">{g.lignes.map((q) => fiche(q))}</ul>
          </section>
        ))
      )}
    </>
  );

  /* ——— le fil ouvert ——— */
  const fil = ouverte ? (
    <article className="lor-pl-fil" aria-label={`Question : ${ouverte.p.texte}`}>
      <header className="lor-pl-fil-tete">
        <Link href={CHEMIN} scroll={false} className="lor-pl-icone-btn" aria-label="Revenir à la liste (Échap)" title="Revenir à la liste (Échap)">
          <IcRetour />
        </Link>
        <span className="lor-pl-vignette">
          <IcCompte />
        </span>
        <span className="lor-pl-statut">
          <IconeEtat e={ouverte.etat} titre={LIBELLE_ETAT[ouverte.etat]} />
        </span>
        <span className="lor-pl-ref">{refDe(ouverte)}</span>
        <h2>{ouverte.p.texte}</h2>
        <span className="lor-pl-quand">
          {ouverte.cr ? <IcNote /> : <IcBulle />}
          {ilYaTexte(ouverte.age)}
        </span>
        <span className="lor-pl-fil-tete-droite">
          <button type="button" className="lor-pl-icone-btn" aria-label="Question précédente (↑)" title="Question précédente (↑)" disabled={ordre.findIndex((q) => q.p.id === ouverte.p.id) <= 0} onClick={() => { const i = ordre.findIndex((q) => q.p.id === ouverte.p.id); if (ordre[i - 1]) ouvrir(ordre[i - 1].p.id); }}>
            <span style={{ transform: "rotate(180deg)", display: "inline-flex" }}>
              <IcChevron bas />
            </span>
          </button>
          <button type="button" className="lor-pl-icone-btn" aria-label="Question suivante (↓)" title="Question suivante (↓)" disabled={ordre.findIndex((q) => q.p.id === ouverte.p.id) >= ordre.length - 1} onClick={() => { const i = ordre.findIndex((q) => q.p.id === ouverte.p.id); if (ordre[i + 1]) ouvrir(ordre[i + 1].p.id); }}>
            <IcChevron bas />
          </button>
          <button type="button" className="lor-pl-icone-btn" aria-label="Copier le lien de la question" title="Copier le lien de la question" onClick={() => void copier(`${window.location.origin}${CHEMIN}?point=${encodeURIComponent(ouverte.p.id)}`, "Lien copié")}>
            <IcLien />
          </button>
        </span>
      </header>
      <div className="lor-pl-fil-corps">
        <div className="lor-pl-fil-flux">
          <p className="lor-pl-jour">{new Date(ouverte.p.cree_le).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p>
          <div className="lor-pl-message">
            {avatar(ouverte, "40")}
            <div className="lor-pl-message-carte">
              <p className="lor-pl-message-tete">
                <b>{ouverte.chef ? nommer(ouverte.chef) : "L'agence"} → {destDe(ouverte)}{ouverte.dest?.email ? ` (${ouverte.dest.email})` : ""}</b>
                <time dateTime={ouverte.p.cree_le}>{dateCourteFr(ouverte.p.cree_le)}</time>
              </p>
              <p className="lor-pl-message-corps">{ouverte.p.texte}</p>
            </div>
          </div>
          {ouverte.cr ? (
            <p className="lor-pl-evenement">
              <b>Compte rendu n° {ouverte.cr}</b> : {ouverte.p.nature === "action" ? "action notée" : "question posée"} à la visite
            </p>
          ) : (
            <p className="lor-pl-evenement">{ouverte.p.nature === "action" ? "Action posée hors compte rendu" : "Question posée hors compte rendu (depuis un contrôle ou cette page)"}</p>
          )}
          {ouverte.p.echeance ? (
            <p className="lor-pl-evenement">
              Réponse attendue le <b>{dateFr(ouverte.p.echeance)}</b>
              {ouverte.retard ? " · échéance passée" : ""}
            </p>
          ) : null}
          {ouverte.age >= 8 && ouverte.p.statut === "ouvert" ? (
            <p className="lor-pl-evenement">
              <b>Point du matin</b> : remontée chaque matin depuis le {dateFr(new Date(new Date(ouverte.p.cree_le).getTime() + 8 * 86400000).toISOString())}
              {ouverte.age > 15 ? ", en critique au-delà de quinze jours" : ""}
            </p>
          ) : null}
          {ouverte.p.reponse ? (
            <>
              {ouverte.p.repondu_le ? <p className="lor-pl-jour">{new Date(`${ouverte.p.repondu_le}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}</p> : null}
              <div className="lor-pl-message">
                <span className="lor-pl-avatar lor-pl-avatar--40 lor-pl-avatar--neutre">{initiales(destDe(ouverte))}</span>
                <div className="lor-pl-message-carte">
                  <p className="lor-pl-message-tete">
                    <b>{destDe(ouverte)}{ouverte.dest?.contact ? ` (${ouverte.dest.contact})` : ""}</b>
                    {ouverte.p.repondu_le ? <time dateTime={ouverte.p.repondu_le}>{dateCourteFr(ouverte.p.repondu_le)}</time> : null}
                  </p>
                  <p className="lor-pl-message-corps">{ouverte.p.reponse}</p>
                </div>
              </div>
            </>
          ) : null}
          {ouverte.chef ? (
            <div className="lor-pl-message">
              <span />
              <div className="lor-pl-message-carte lor-pl-message-carte--note">
                <p className="lor-pl-message-tete">
                  <b>Suivi de Lorani</b>
                  <time>{ilYaTexte(ouverte.age)}</time>
                </p>
                <p className="lor-pl-message-corps">
                  {ouverte.etat === "soldee"
                    ? "Soldée : elle ne figure plus dans les points en suspens des comptes rendus."
                    : ouverte.etat === "recue"
                      ? "La réponse est notée ; soldez la question quand elle n'appelle plus rien, elle sortira des points en suspens."
                      : `Sans réponse, elle reste dans les points en suspens du prochain compte rendu${ouverte.age >= 8 ? " et remonte au point du matin de " + nommer(ouverte.chef) : ` et remontera au point du matin dans ${8 - ouverte.age} jour${8 - ouverte.age > 1 ? "s" : ""}`}.`}
                </p>
                <p className="lor-pl-message-pied">
                  <IcCacheOeil /> Visible de l&apos;agence seulement
                </p>
              </div>
            </div>
          ) : null}
          <p className={`lor-pl-bandeau${ouverte.etat === "soldee" ? " lor-pl-bandeau--vert" : ""}`}>
            <IconeEtat e={ouverte.etat} />
            {ouverte.etat === "soldee" ? "Question soldée" : ouverte.etat === "recue" ? "Réponse reçue, à solder" : `En attente de la réponse de ${destDe(ouverte)} depuis ${ouverte.age} jour${ouverte.age > 1 ? "s" : ""}`}
          </p>
        </div>
        <div className="lor-pl-barre">
          <div className="lor-pl-barre-groupe lor-pl-ancre" ref={mStatutRef}>
            <button type="button" className="lor-pl-bouton" aria-expanded={mStatutOuvert} disabled={gris} onClick={() => mStatutSetOuvert((o) => !o)} title="Changer l'état (Y)">
              <IconeEtat e={ouverte.etat} />
              <kbd className="lor-pl-kbd">Y</kbd>
            </button>
            {mStatutOuvert ? (
              <div className="lor-pl-menu" role="menu" style={{ left: 0, bottom: 44, minWidth: 220 }}>
                <button type="button" role="menuitem" className="lor-pl-option" disabled={ouverte.p.statut === "ouvert"} onClick={() => { mStatutSetOuvert(false); rouvrir([ouverte.p.id]); }}>
                  <IcEnCours />
                  <span className="lor-pl-option-libelle">En attente de réponse</span>
                </button>
                <button type="button" role="menuitem" className="lor-pl-option" disabled={ouverte.p.statut !== "ouvert"} onClick={() => { mStatutSetOuvert(false); ouvrirForm({ type: "reponse", ids: [ouverte.p.id] }); }}>
                  <IcSuivante />
                  <span className="lor-pl-option-libelle">Réponse reçue…</span>
                </button>
                <button type="button" role="menuitem" className="lor-pl-option" disabled={ouverte.p.statut === "clos"} onClick={() => { mStatutSetOuvert(false); ouvrirForm({ type: "solder", ids: [ouverte.p.id] }); }}>
                  <IcFait />
                  <span className="lor-pl-option-libelle">Soldée…</span>
                </button>
              </div>
            ) : null}
          </div>
          <div className="lor-pl-barre-groupe">
            <button type="button" className="lor-pl-bouton" disabled={gris || ouverte.p.statut !== "ouvert"} onClick={() => ouvrirForm({ type: "reponse", ids: [ouverte.p.id] })} title="Noter la réponse reçue (R)">
              <IcRetour />
              Réponse reçue
              <kbd className="lor-pl-kbd">R</kbd>
            </button>
            <button type="button" className="lor-pl-bouton" disabled={gris || ouverte.p.statut === "clos"} onClick={() => ouvrirForm({ type: "solder", ids: [ouverte.p.id] })} title="Solder la question (S)">
              <IcFait />
              Solder
              <kbd className="lor-pl-kbd">S</kbd>
            </button>
            <span className="lor-pl-ancre" ref={mPlusRef}>
              <button type="button" className="lor-pl-bouton" aria-expanded={mPlusOuvert} onClick={() => mPlusSetOuvert((o) => !o)}>
                <IcPoints />
                Plus
              </button>
              {mPlusOuvert ? (
                <div className="lor-pl-menu" role="menu" style={{ right: 0, bottom: 44, minWidth: 260 }}>
                  <button type="button" role="menuitem" className="lor-pl-option" disabled={gris || ouverte.p.statut !== "ouvert"} onClick={() => { mPlusSetOuvert(false); ouvrirForm({ type: "reporter", ids: [ouverte.p.id] }); }}>
                    <Clock3 aria-hidden="true" />
                    <span className="lor-pl-option-libelle">Reporter l&apos;échéance…</span>
                  </button>
                  {ouverte.dest?.email && ouverte.p.statut === "ouvert" ? (
                    <a role="menuitem" className="lor-pl-option" href={`mailto:${ouverte.dest.email}?subject=${encodeURIComponent(`${ouverte.projet?.nom ?? "Projet"} : question en attente`)}&body=${encodeURIComponent(texteRelance(ouverte))}`} onClick={() => mPlusSetOuvert(false)}>
                      <IcCourriel />
                      <span className="lor-pl-option-libelle">Relancer par courriel (votre messagerie)</span>
                    </a>
                  ) : null}
                  <button type="button" role="menuitem" className="lor-pl-option" disabled={ouverte.p.statut !== "ouvert"} onClick={() => { mPlusSetOuvert(false); void copier(texteRelance(ouverte), "Texte de relance copié"); }}>
                    <IcCopier />
                    <span className="lor-pl-option-libelle">Copier le texte de relance</span>
                  </button>
                  <button type="button" role="menuitem" className="lor-pl-option" disabled={gris || ouverte.p.statut === "ouvert"} onClick={() => { mPlusSetOuvert(false); rouvrir([ouverte.p.id]); }}>
                    <Undo2 aria-hidden="true" />
                    <span className="lor-pl-option-libelle">Rouvrir la question</span>
                  </button>
                  <div className="lor-pl-sep" />
                  <Link role="menuitem" className="lor-pl-option" href={lienProjet(ouverte.p.projet_id)}>
                    <IcCompte />
                    <span className="lor-pl-option-libelle">Ouvrir le chantier du projet</span>
                  </Link>
                  <button type="button" role="menuitem" className="lor-pl-option" onClick={() => { mPlusSetOuvert(false); exporter([ouverte]); }}>
                    <IcNote />
                    <span className="lor-pl-option-libelle">Exporter en CSV</span>
                  </button>
                </div>
              ) : null}
            </span>
          </div>
          <div className="lor-pl-barre-groupe">
            <button type="button" className="lor-pl-bouton" onClick={() => void copier(pourAssistant([ouverte], nommer), "Copié pour l'assistant")} title="Copier la question et son suivi, à coller dans l'assistant (B)">
              <IcAssistant />
              <span className="lor-pl-bouton-cache">Copier pour l&apos;assistant</span>
              <kbd className="lor-pl-kbd">B</kbd>
            </button>
          </div>
        </div>
      </div>
      <aside className="lor-pl-details" aria-label="Détails de la question">
        <section className="lor-pl-bloc">
          <p className="lor-pl-bloc-tete">Détails de la question</p>
          <p className="lor-pl-bloc-titre">{ouverte.p.texte}</p>
          <dl>
            <div className="lor-pl-prop">
              <dt>Projet</dt>
              <dd>
                <Link href={lienProjet(ouverte.p.projet_id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, borderRadius: 6 }}>
                  <IcCompte />
                  {ouverte.projet?.nom ?? "—"}
                </Link>
              </dd>
            </div>
            <div className="lor-pl-prop">
              <dt>Destinataire</dt>
              <dd>{destDe(ouverte)}</dd>
            </div>
            <div className="lor-pl-prop">
              <dt>État</dt>
              <dd>
                <span className="lor-pl-statut" style={{ color: "var(--pl-bleu-i)" }}>
                  <IconeEtat e={ouverte.etat} />
                </span>
                {LIBELLE_ETAT[ouverte.etat]}
              </dd>
            </div>
            <div className="lor-pl-prop">
              <dt>Chef de projet</dt>
              <dd data-vide={ouverte.chef ? undefined : ""}>
                {ouverte.chef ? avatar(ouverte) : null}
                {ouverte.chef ? nommer(ouverte.chef) : "Aucun"}
              </dd>
            </div>
            <div className="lor-pl-prop">
              <dt>Urgence</dt>
              <dd>
                <IcPriorite u={ouverte.urgence} />
                {LIBELLE_URGENCE[ouverte.urgence]}
              </dd>
            </div>
            <div className="lor-pl-prop">
              <dt>Étiquettes</dt>
              <dd style={{ flexWrap: "wrap" }}>{pastilles(ouverte)}</dd>
            </div>
            <div className="lor-pl-prop">
              <dt>Lot</dt>
              <dd data-vide={ouverte.lot ? undefined : ""}>{ouverte.lot ?? "Non renseigné"}</dd>
            </div>
            <div className="lor-pl-prop">
              <dt>Échéance</dt>
              <dd data-vide={ouverte.p.echeance ? undefined : ""}>
                {peutEcrire && ouverte.p.statut === "ouvert" ? (
                  <button type="button" onClick={() => ouvrirForm({ type: "reporter", ids: [ouverte.p.id] })} style={{ padding: "0 4px", borderRadius: 6 }} title="Reporter l'échéance">
                    {ouverte.p.echeance ? dateFr(ouverte.p.echeance) : "Poser une échéance"}
                  </button>
                ) : ouverte.p.echeance ? (
                  dateFr(ouverte.p.echeance)
                ) : (
                  "Aucune"
                )}
              </dd>
            </div>
            <div className="lor-pl-prop">
              <dt>Posée le</dt>
              <dd>
                {dateFr(ouverte.p.cree_le)}
                {ouverte.cr ? ` · compte rendu n° ${ouverte.cr}` : ""}
              </dd>
            </div>
          </dl>
        </section>
        <section className="lor-pl-bloc">
          <p className="lor-pl-bloc-tete">Destinataire</p>
          {ouverte.dest ? (
            <dl>
              <p className="lor-pl-bloc-titre" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className="lor-pl-avatar lor-pl-avatar--24 lor-pl-avatar--neutre">{initiales(ouverte.dest.organisme)}</span>
                {ouverte.dest.organisme}
              </p>
              <div className="lor-pl-prop">
                <dt>Rôle</dt>
                <dd>{NATURE_DEST[ouverte.dest.nature] ?? "Intervenant"}</dd>
              </div>
              <div className="lor-pl-prop">
                <dt>Contact</dt>
                <dd data-vide={ouverte.dest.contact ? undefined : ""}>{ouverte.dest.contact ?? "Non renseigné"}</dd>
              </div>
              <div className="lor-pl-prop">
                <dt>Courriel</dt>
                <dd data-vide={ouverte.dest.email ? undefined : ""}>
                  {ouverte.dest.email ? (
                    <button type="button" onClick={() => void copier(ouverte.dest!.email!, "Courriel copié")} title="Copier le courriel" style={{ padding: "0 4px", borderRadius: 10 }}>
                      {ouverte.dest.email}
                    </button>
                  ) : (
                    "Non renseigné"
                  )}
                </dd>
              </div>
              <div className="lor-pl-prop">
                <dt>Téléphone</dt>
                <dd data-vide={ouverte.dest.telephone ? undefined : ""}>{ouverte.dest.telephone ? <a href={`tel:${ouverte.dest.telephone.replace(/\s/g, "")}`}>{ouverte.dest.telephone}</a> : "Non renseigné"}</dd>
              </div>
            </dl>
          ) : (
            <p className="lor-pl-lien-bloc">{ouverte.p.nature === "action" ? "Une action de l'agence : elle n'a pas de destinataire." : "Aucun destinataire n'est désigné."}</p>
          )}
        </section>
        <section className="lor-pl-bloc">
          <p className="lor-pl-bloc-tete">Liens</p>
          <div className="lor-pl-lien-bloc">
            <span className="lor-pl-vignette">
              <IcLien />
            </span>
            <b>Le chantier du projet</b>
            <span>Les comptes rendus, les points en suspens et les situations du projet.</span>
            <Link href={lienProjet(ouverte.p.projet_id)} className="lor-pl-secondaire">
              <IcCompte />
              Ouvrir le chantier
            </Link>
          </div>
        </section>
      </aside>
    </article>
  ) : null;

  return (
    <div className="lor-pl" data-ouvert={ouverte ? "" : undefined} data-selection={coches.length ? "" : undefined}>
      {ouverte ? (
        <>
          <h1 className="v2-sr">Questions et réponses</h1>
          <section className="lor-pl-colonne" aria-label="Les questions">
            <header className="lor-pl-colonne-tete">
              <b>Questions</b>
              <span>À traiter {aTraiter}</span>
            </header>
            <ul>{ordre.map((q) => fiche(q, true))}</ul>
          </section>
          {fil}
        </>
      ) : (
        <div className="lor-pl-carte">
          <header className="lor-pl-tete">
            <div className="lor-pl-titre">
              <IcFils />
              <h1>
                Questions et réponses{nbFiltres ? <span> ({visibles.filter((q) => q.etat !== "soldee").length})</span> : null}
              </h1>
            </div>
            {peutEcrire ? (
              <button type="button" className="lor-pl-fantome" onClick={() => ouvrirForm({ type: "nouvelle" })} title="Poser une question (N)">
                <IcPlus />
                <span className="lor-pl-fantome-libelle">Nouvelle question</span>
                <kbd className="lor-pl-kbd">N</kbd>
              </button>
            ) : null}
            {menuFiltres}
            {menuAffichage}
          </header>
          {puces}
          {liste}
          {coches.length ? (
            <div className="lor-pl-barre" role="toolbar" aria-label="Actions sur la sélection">
              <div className="lor-pl-barre-groupe">
                <span className="lor-pl-bouton-nb">
                  {coches.length} sélectionnée{coches.length > 1 ? "s" : ""}
                </span>
                <button type="button" className="lor-pl-bouton" disabled={gris || !cochees.some((q) => q.p.statut !== "clos")} onClick={() => ouvrirForm({ type: "solder", ids: cochees.filter((q) => q.p.statut !== "clos").map((q) => q.p.id) })}>
                  <IcFait />
                  Solder
                </button>
                <button type="button" className="lor-pl-bouton" disabled={gris || !cochees.some((q) => q.p.statut === "ouvert")} onClick={() => ouvrirForm({ type: "reporter", ids: cochees.filter((q) => q.p.statut === "ouvert").map((q) => q.p.id) })}>
                  <Clock3 aria-hidden="true" />
                  Reporter
                </button>
                <button type="button" className="lor-pl-bouton" onClick={() => exporter(cochees)}>
                  <IcNote />
                  CSV
                </button>
                <button type="button" className="lor-pl-bouton" onClick={() => void copier(pourAssistant(cochees, nommer), "Copié pour l'assistant")}>
                  <IcAssistant />
                  <span className="lor-pl-bouton-cache">Copier pour l&apos;assistant</span>
                </button>
                <button type="button" className="lor-pl-bouton" aria-label="Tout désélectionner (Échap)" title="Tout désélectionner (Échap)" onClick={() => setCoches([])}>
                  <IcCroix />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Réponse reçue (G58) */}
      <Dialog open={form?.type === "reponse"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <CircleHelp width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Noter la réponse reçue</DialogTitle>
            <DialogDescription>
              {form?.type === "reponse" && form.ids.length > 1 ? `La même réponse sera notée sur ${form.ids.length} questions. ` : ""}La question passe en « Réponse reçue » ; elle reste à solder.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Réponse <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" rows={4} value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Ce que le destinataire a répondu, et où (courriel, visite, appel)." />
              </label>
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris || !texte.trim()} onClick={soumettreReponse}>
              {envoi ? <Loader variant="spin" /> : null} Noter la réponse
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Solder (G59), une ou plusieurs : confirmation */}
      <Dialog open={form?.type === "solder"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Check width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>{form?.type === "solder" && form.ids.length > 1 ? `Solder ${form.ids.length} questions` : "Solder la question"}</DialogTitle>
            <DialogDescription>Une question soldée sort des points en suspens des comptes rendus et du point du matin. Elle se rouvre depuis « Plus » si besoin.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              {form?.type === "solder" ? (
                <ul style={{ display: "grid", gap: 4, margin: 0, paddingLeft: 18 }}>
                  {tout.filter((q) => form.ids.includes(q.p.id)).map((q) => (
                    <li key={q.p.id} className="esp-kpi-sous">
                      {q.projet?.nom} : {q.p.texte}
                      {q.p.statut === "ouvert" ? " — sans réponse notée" : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris} onClick={soumettreSolde}>
              {envoi ? <Loader variant="spin" /> : null} Solder
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reporter l'échéance */}
      <Dialog open={form?.type === "reporter"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <Clock3 width={18} height={18} aria-hidden="true" />
            </DialogIcone>
            <DialogTitle>Reporter l&apos;échéance</DialogTitle>
            <DialogDescription>
              {form?.type === "reporter" && form.ids.length > 1 ? `${form.ids.length} questions. ` : ""}La date à laquelle la réponse est attendue. Le point du matin compte toujours les jours depuis la question.
            </DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Nouvelle échéance <span className="esp-obligatoire">(obligatoire)</span>
                <input type="date" className="rv-champ" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris || !date} onClick={soumettreReport}>
              {envoi ? <Loader variant="spin" /> : null} Reporter
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nouvelle question (G34, hors compte rendu) */}
      <Dialog open={form?.type === "nouvelle"} onOpenChange={(o) => !o && !envoi && setForm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogIcone>
              <IcPlus />
            </DialogIcone>
            <DialogTitle>Poser une question</DialogTitle>
            <DialogDescription>Elle est suivie jusqu&apos;à la réponse : sans réponse au bout de huit jours, elle remonte au point du matin, et elle figure dans les points en suspens du prochain compte rendu. Rien n&apos;est envoyé au destinataire.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="esp-form">
              <label className="rv-libelle">
                Projet <span className="esp-obligatoire">(obligatoire)</span>
                <select className="rv-champ" value={nv.projet} onChange={(e) => setNv((v) => ({ ...v, projet: e.target.value, dest: "" }))}>
                  <option value="">Choisir…</option>
                  {dossier.projets.filter((p) => p.actif).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nom}
                    </option>
                  ))}
                </select>
              </label>
              <label className="rv-libelle">
                Nature
                <select className="rv-champ" value={nv.nature} onChange={(e) => setNv((v) => ({ ...v, nature: e.target.value as "question" | "action" }))}>
                  <option value="question">Question à un intervenant</option>
                  <option value="action">Action (à faire par l&apos;agence ou un intervenant)</option>
                </select>
              </label>
              <label className="rv-libelle">
                Destinataire {nv.nature === "question" ? <span className="esp-obligatoire">(obligatoire)</span> : null}
                <select className="rv-champ" value={nv.dest} onChange={(e) => setNv((v) => ({ ...v, dest: e.target.value }))} disabled={!nv.projet}>
                  <option value="">{nv.nature === "action" ? "L'agence" : "Choisir…"}</option>
                  {destsNv.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.organisme} · {NATURE_DEST[i.nature] ?? "Intervenant"}
                    </option>
                  ))}
                </select>
                {nv.projet && !destsNv.length ? <span className="esp-kpi-sous">Aucun intervenant sur ce projet : ajoutez-le depuis la vue Équipe du projet.</span> : null}
              </label>
              <label className="rv-libelle">
                {nv.nature === "action" ? "Action" : "Question"} <span className="esp-obligatoire">(obligatoire)</span>
                <textarea className="rv-champ" rows={3} value={nv.texte} onChange={(e) => setNv((v) => ({ ...v, texte: e.target.value }))} maxLength={1000} />
              </label>
              <label className="rv-libelle">
                Réponse attendue le
                <input type="date" className="rv-champ" value={nv.echeance} onChange={(e) => setNv((v) => ({ ...v, echeance: e.target.value }))} />
              </label>
              {erreur ? (
                <Avis teinte="rouge" role="alert">
                  {erreur}
                </Avis>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <button type="button" className="r-btn r-btn--noir" disabled={gris || !projetNv || !nv.texte.trim() || (nv.nature === "question" && !nv.dest)} onClick={soumettreNouvelle}>
              {envoi ? <Loader variant="spin" /> : null} Poser
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const NATURE_DEST: Partial<Record<Intervenant["nature"], string>> = {
  maitre_ouvrage: "Maître d'ouvrage",
  amo: "AMO",
  bet_structure: "BET structure",
  bet_fluides: "BET fluides",
  bet_thermique: "BET thermique",
  bet_acoustique: "BET acoustique",
  bet_vrd: "BET VRD",
  economiste: "Économiste",
  controleur_technique: "Contrôleur technique",
  coordonnateur_sps: "Coordonnateur SPS",
  opc: "OPC",
  geometre: "Géomètre",
  entreprise: "Entreprise",
  autre: "Intervenant",
};
