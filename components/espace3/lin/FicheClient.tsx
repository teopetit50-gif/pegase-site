"use client";

/* ══════════════════════════════════════════════════════════════════════
   Le modèle « clients » (28/10/2026) : les briques des pages « Tenants »
   de Plain, au 1:1 (relevé : scratchpad/plain-clients/releve-plain.md,
   gabarit : ./plain-clients.css). Deux pages :

     · ListeClients — la liste : tête (icône + titre ; étoile, « Filtres »,
       « Affichage V », un bouton plein), la barre (recherche, « Trié par … ✕ »),
       le tableau (en-tête 32, lignes de 56) ; une ligne ouvre la fiche ;
     · FicheClient — la fiche d'un client : « ← retour », tuile + nom + méta,
       étoile / « ··· » / volet, les onglets, le corps, le volet « Détails ».

   Les icônes sont celles de Plain (pleines, grille 24), redessinées ici ;
   le menu (Filtres, Affichage, « ··· ») est le menu d'options de Linear.
   Chaque SaaS remplit ces briques avec ses données ; rien n'est décidé ici.
   ══════════════════════════════════════════════════════════════════════ */

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import "./lin.css";
import "./plain-clients.css";

/* ——— les icônes de Plain (fill, viewBox 24) ——— */
type IconeProps = { taille?: number; className?: string };
const Ic = ({ d, taille = 18, className, evenodd }: IconeProps & { d: string | string[]; evenodd?: boolean }) => (
  <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
    {(Array.isArray(d) ? d : [d]).map((p, i) => (
      <path key={i} fill="currentColor" d={p} fillRule={evenodd ? "evenodd" : undefined} clipRule={evenodd ? "evenodd" : undefined} />
    ))}
  </svg>
);
export const IcBatiment = (p: IconeProps) => (
  <Ic
    {...p}
    d={[
      "M21 11.5a.5.5 0 0 0-.5-.5H17v10h3.5a.5.5 0 0 0 .5-.5zm-6-8a.5.5 0 0 0-.5-.5h-11a.5.5 0 0 0-.5.5v17a.5.5 0 0 0 .5.5H15zM17 9h3.5a2.5 2.5 0 0 1 2.5 2.5v9a2.5 2.5 0 0 1-2.5 2.5h-17A2.5 2.5 0 0 1 1 20.5v-17A2.5 2.5 0 0 1 3.5 1h11A2.5 2.5 0 0 1 17 3.5z",
      "M11.5 13a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0M12 5a1 1 0 1 1 0 2H6a1 1 0 0 1 0-2zM13 18.554V21H5v-2.446c0-.34.192-.65.495-.802a7.84 7.84 0 0 1 7.01 0 .9.9 0 0 1 .495.802",
    ]}
  />
);
export const IcEtoile = (p: IconeProps) => (
  <Ic
    {...p}
    d="m8.85 16.825 3.15-1.9 3.15 1.925-.825-3.6 2.775-2.4-3.65-.325-1.45-3.4-1.45 3.375-3.65.325 2.775 2.425zm3.15.45-4.15 2.5a.9.9 0 0 1-.575.15.97.97 0 0 1-.525-.2 1.2 1.2 0 0 1-.35-.438.87.87 0 0 1-.05-.587l1.1-4.725L3.775 10.8A.96.96 0 0 1 3.5 9.725q.1-.274.3-.45.2-.175.55-.225l4.85-.425 1.875-4.45q.125-.3.388-.45t.537-.15.537.15.388.45l1.875 4.45 4.85.425q.35.05.55.225t.3.45.038.563a.96.96 0 0 1-.313.512l-3.675 3.175 1.1 4.725a.87.87 0 0 1-.05.587q-.125.262-.35.438a.97.97 0 0 1-.525.2.9.9 0 0 1-.575-.15z"
  />
);
export const IcEtoilePleine = (p: IconeProps) => (
  <Ic
    {...p}
    d="m12 17.275-4.15 2.5a.9.9 0 0 1-.575.15.97.97 0 0 1-.525-.2 1.2 1.2 0 0 1-.35-.438.87.87 0 0 1-.05-.587l1.1-4.725L3.775 10.8A.96.96 0 0 1 3.5 9.725q.1-.274.3-.45.2-.175.55-.225l4.85-.425 1.875-4.45q.125-.3.388-.45t.537-.15.537.15.388.45l1.875 4.45 4.85.425q.35.05.55.225t.3.45.038.563a.96.96 0 0 1-.313.512l-3.675 3.175 1.1 4.725a.87.87 0 0 1-.05.587q-.125.262-.35.438a.97.97 0 0 1-.525.2.9.9 0 0 1-.575-.15z"
  />
);
export const IcPoints = (p: IconeProps) => (
  <Ic
    {...p}
    d="M6 14q-.824 0-1.412-.588A1.93 1.93 0 0 1 4 12q0-.825.588-1.412A1.93 1.93 0 0 1 6 10q.824 0 1.412.588Q8 11.175 8 12t-.588 1.412A1.93 1.93 0 0 1 6 14m6 0q-.825 0-1.412-.588A1.93 1.93 0 0 1 10 12q0-.825.588-1.412A1.93 1.93 0 0 1 12 10q.825 0 1.412.588Q14 11.175 14 12t-.588 1.412A1.93 1.93 0 0 1 12 14m6 0q-.824 0-1.413-.588A1.93 1.93 0 0 1 16 12q0-.825.587-1.412A1.93 1.93 0 0 1 18 10q.824 0 1.413.588Q20 11.175 20 12t-.587 1.412A1.93 1.93 0 0 1 18 14"
  />
);
export const IcVolet = (p: IconeProps) => (
  <Ic
    {...p}
    evenodd
    d={[
      "M14 19V6H4a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1zM4 21a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3h16a3 3 0 0 1 3 3v11a3 3 0 0 1-3 3zM16 6h4a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-4z",
      "M17 7.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5zM17 11.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5zM17 15.5a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5z",
    ]}
  />
);
export const IcRetour = (p: IconeProps) => (
  <Ic
    {...p}
    d="M10.275 17.275q.3-.3.287-.725a1.03 1.03 0 0 0-.312-.725L7.425 13h11.15q.424 0 .713-.287a.97.97 0 0 0 .287-.713.97.97 0 0 0-.287-.713.97.97 0 0 0-.713-.287H7.425l2.85-2.85q.3-.3.3-.712 0-.413-.3-.713t-.712-.3-.713.3L4.275 11.3q-.15.15-.212.325A1.1 1.1 0 0 0 4 12q0 .2.063.375a.9.9 0 0 0 .212.325l4.6 4.6a.93.93 0 0 0 .688.275q.412 0 .712-.3"
  />
);
export const IcFiltres = (p: IconeProps) => (
  <Ic
    {...p}
    d="M4 19a.97.97 0 0 1-.712-.288A.97.97 0 0 1 3 18q0-.424.288-.712A.97.97 0 0 1 4 17h4q.424 0 .713.288Q9 17.575 9 18q0 .424-.287.712A.97.97 0 0 1 8 19zM4 7a.97.97 0 0 1-.712-.287A.97.97 0 0 1 3 6q0-.424.288-.713A.97.97 0 0 1 4 5h8q.424 0 .713.287Q13 5.576 13 6q0 .424-.287.713A.97.97 0 0 1 12 7zm8 14a.97.97 0 0 1-.713-.288A.97.97 0 0 1 11 20v-4q0-.424.287-.713A.97.97 0 0 1 12 15q.424 0 .713.287.287.288.287.713v1h7q.424 0 .712.288.288.287.288.712 0 .424-.288.712A.97.97 0 0 1 20 19h-7v1q0 .424-.287.712A.97.97 0 0 1 12 21m-4-6a.97.97 0 0 1-.713-.287A.97.97 0 0 1 7 14v-1H4a.97.97 0 0 1-.712-.287A.97.97 0 0 1 3 12q0-.424.288-.713A.97.97 0 0 1 4 11h3v-1q0-.424.287-.713A.97.97 0 0 1 8 9q.424 0 .713.287Q9 9.576 9 10v4q0 .424-.287.713A.97.97 0 0 1 8 15m4-2a.97.97 0 0 1-.713-.287A.97.97 0 0 1 11 12q0-.424.287-.713A.97.97 0 0 1 12 11h8q.424 0 .712.287.288.288.288.713 0 .424-.288.713A.97.97 0 0 1 20 13zm4-4a.97.97 0 0 1-.713-.287A.97.97 0 0 1 15 8V4q0-.424.287-.712A.97.97 0 0 1 16 3q.424 0 .712.288Q17 3.575 17 4v1h3q.424 0 .712.287Q21 5.576 21 6q0 .424-.288.713A.97.97 0 0 1 20 7h-3v1q0 .424-.288.713A.97.97 0 0 1 16 9"
  />
);
export const IcAffichage = (p: IconeProps) => (
  <Ic
    {...p}
    d="M2 21a.97.97 0 0 1-.712-.288A.97.97 0 0 1 1 20q0-.424.288-.712A.97.97 0 0 1 2 19h20q.424 0 .712.288.288.287.288.712 0 .424-.288.712A.97.97 0 0 1 22 21zm2-3q-.824 0-1.412-.587A1.93 1.93 0 0 1 2 16V5q0-.824.587-1.412A1.93 1.93 0 0 1 4 3h16q.824 0 1.413.587Q22 4.176 22 5v11q0 .824-.587 1.413A1.93 1.93 0 0 1 20 18zm0-2h16V5H4z"
  />
);
export const IcPlus = (p: IconeProps) => (
  <Ic
    {...p}
    d="M12 19a.97.97 0 0 1-.713-.288A.97.97 0 0 1 11 18v-5H6a.97.97 0 0 1-.713-.287A.97.97 0 0 1 5 12q0-.424.287-.713A.97.97 0 0 1 6 11h5V6q0-.424.287-.713A.97.97 0 0 1 12 5q.424 0 .713.287Q13 5.576 13 6v5h5q.424 0 .712.287.288.288.288.713 0 .424-.288.713A.97.97 0 0 1 18 13h-5v5q0 .424-.287.712A.97.97 0 0 1 12 19"
  />
);
export const IcLoupe = (p: IconeProps) => (
  <Ic
    {...p}
    d="m18.9 20.3-5.6-5.6q-.75.6-1.725.95T9.5 16q-2.725 0-4.612-1.887T3 9.5t1.888-4.612T9.5 3t4.613 1.888T16 9.5a6.1 6.1 0 0 1-1.3 3.8l5.625 5.625a.92.92 0 0 1 .275.675q0 .4-.3.7a.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275M9.5 14q1.875 0 3.188-1.312Q14 11.375 14 9.5t-1.312-3.187T9.5 5 6.313 6.313 5 9.5t1.313 3.188T9.5 14"
  />
);
export const IcTri = (p: IconeProps) => (
  <Ic
    {...p}
    evenodd
    d="M18.8 10a1 1 0 0 1 1 1v5.286l.393-.393a1 1 0 0 1 1.414 1.414L19.514 19.4a1.01 1.01 0 0 1-1.428 0l-2.093-2.093a1 1 0 0 1 1.414-1.414l.393.393V11a1 1 0 0 1 1-1M2 19a1 1 0 0 0 1 1h4.2a1 1 0 1 0 0-2H3a1 1 0 0 0-1 1m0-4.2a1 1 0 0 0 1 1h7a1 1 0 1 0 0-2H3a1 1 0 0 0-1 1m0-4.2a1 1 0 0 0 1 1h9.8a1 1 0 1 0 0-2H3a1 1 0 0 0-1 1m0-4.2a1 1 0 0 0 1 1h14a1 1 0 1 0 0-2H3a1 1 0 0 0-1 1"
  />
);
export const IcFlecheBas = (p: IconeProps) => (
  <Ic
    {...p}
    d="M17.28 13.513a.95.95 0 0 0-.725-.288 1.03 1.03 0 0 0-.725.313l-2.825 2.825V5.213a.97.97 0 0 0-.288-.713.97.97 0 0 0-.712-.287.97.97 0 0 0-.713.287.97.97 0 0 0-.287.713v11.15l-2.85-2.85q-.3-.3-.713-.3-.412 0-.712.3t-.3.712.3.713l4.575 4.575q.15.15.325.212.175.063.375.063t.375-.063a.9.9 0 0 0 .325-.212l4.6-4.6a.93.93 0 0 0 .275-.688q0-.412-.3-.712"
  />
);
export const IcCroix = (p: IconeProps) => (
  <Ic
    {...p}
    d="m12 13.4-4.9 4.9a.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275.95.95 0 0 1-.275-.7q0-.425.275-.7l4.9-4.9-4.9-4.9a.95.95 0 0 1-.275-.7q0-.425.275-.7a.95.95 0 0 1 .7-.275q.425 0 .7.275l4.9 4.9 4.9-4.9a.95.95 0 0 1 .7-.275q.425 0 .7.275a.95.95 0 0 1 .275.7.95.95 0 0 1-.275.7L13.4 12l4.9 4.9a.95.95 0 0 1 .275.7.95.95 0 0 1-.275.7.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275z"
  />
);
export const IcInfo = (p: IconeProps) => (
  <Ic
    {...p}
    d="M12 17q.424 0 .713-.288A.97.97 0 0 0 13 16v-4.025a.93.93 0 0 0-.287-.7A1 1 0 0 0 12 11a.97.97 0 0 0-.713.287A.97.97 0 0 0 11 12v4.025q0 .425.287.7.288.275.713.275m0-8q.424 0 .713-.287A.97.97 0 0 0 13 8a.97.97 0 0 0-.287-.713A.97.97 0 0 0 12 7a.97.97 0 0 0-.713.287A.97.97 0 0 0 11 8q0 .424.287.713Q11.576 9 12 9m0 13a9.7 9.7 0 0 1-3.9-.788 10.1 10.1 0 0 1-3.175-2.137q-1.35-1.35-2.137-3.175A9.7 9.7 0 0 1 2 12q0-2.075.788-3.9a10.1 10.1 0 0 1 2.137-3.175q1.35-1.35 3.175-2.137A9.7 9.7 0 0 1 12 2q2.075 0 3.9.788a10.1 10.1 0 0 1 3.175 2.137q1.35 1.35 2.137 3.175A9.7 9.7 0 0 1 22 12a9.7 9.7 0 0 1-.788 3.9 10.1 10.1 0 0 1-2.137 3.175q-1.35 1.35-3.175 2.137A9.7 9.7 0 0 1 12 22m0-2q3.325 0 5.663-2.337T20 12t-2.337-5.662T12 4 6.338 6.338 4 12t2.338 5.663T12 20"
  />
);
export const IcCercle = (p: IconeProps) => <Ic {...p} evenodd d="M12 18.3a6.3 6.3 0 1 0 0-12.6 6.3 6.3 0 0 0 0 12.6m0 2.7a9 9 0 1 0 0-18 9 9 0 0 0 0 18" />;
export const IcChevron = (p: IconeProps) => (
  <Ic
    {...p}
    d="M12 15.549q-.229 0-.442-.077a1.1 1.1 0 0 1-.402-.264l-4.012-4.013a.9.9 0 0 1-.28-.693.98.98 0 0 1 .3-.692.96.96 0 0 1 .703-.29q.413 0 .702.29L12 13.24l3.451-3.45a.9.9 0 0 1 .693-.28q.402.01.692.3t.29.703-.29.702l-3.992 3.992a1.1 1.1 0 0 1-.844.341"
  />
);
export const IcOeilBarre = (p: IconeProps) => (
  <Ic
    {...p}
    d="m16.1 13.3-1.45-1.45q.225-1.175-.675-2.2t-2.325-.8L10.2 7.4a4.2 4.2 0 0 1 .863-.3A4.2 4.2 0 0 1 12 7q1.875 0 3.188 1.313Q16.5 9.625 16.5 11.5q0 .5-.1.938t-.3.862m3.2 3.15-1.45-1.4a11 11 0 0 0 1.688-1.587A9 9 0 0 0 20.8 11.5q-1.25-2.524-3.588-4.012T12 6q-.724 0-1.425.1a10 10 0 0 0-1.375.3L7.65 4.85A11.1 11.1 0 0 1 12 4q3.575 0 6.425 1.888T22.7 10.8q.075.125.1.313t.025.387a2 2 0 0 1-.125.7 10.9 10.9 0 0 1-3.4 4.25m-.2 5.45-3.5-3.45q-.874.274-1.762.413Q12.95 19 12 19q-3.575 0-6.425-1.887T1.3 12.2a.8.8 0 0 1-.1-.312 3 3 0 0 1 0-.763.8.8 0 0 1 .1-.3Q1.825 9.7 2.55 8.75A13.3 13.3 0 0 1 4.15 7L2.075 4.9a.93.93 0 0 1-.275-.687q0-.413.3-.713a.95.95 0 0 1 .7-.275q.425 0 .7.275l17 17q.275.275.288.688a.93.93 0 0 1-.288.712.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275M5.55 8.4q-.725.65-1.325 1.425A9 9 0 0 0 3.2 11.5q1.25 2.524 3.587 4.013Q9.125 17 12 17q.5 0 .975-.062.475-.063.975-.138l-.9-.95q-.274.075-.525.113A3.5 3.5 0 0 1 12 16q-1.875 0-3.188-1.312Q7.5 13.375 7.5 11.5q0-.274.037-.525.038-.25.113-.525z"
  />
);
export const IcEngrenage = (p: IconeProps) => (
  <Ic
    {...p}
    d={[
      "M14 12a2 2 0 1 0-4 0 2 2 0 0 0 4 0m2 0a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
      "M12 1.667a3.334 3.334 0 0 1 3.244 2.567l.007.028c.091.447.323.779.654.97l.001.001.002.001.127.065c.305.133.662.143 1.041.017l.027-.009a3.334 3.334 0 0 1 3.223 5.639c-.341.303-.513.67-.513 1.053V12l.008.143c.032.284.161.555.385.793l.12.117.021.019a3.334 3.334 0 0 1-3.271 5.61c-.43-.143-.832-.11-1.163.08l-.007.004c-.332.192-.563.524-.655.971l-.007.027a3.333 3.333 0 0 1-6.488 0l-.006-.027c-.092-.447-.324-.779-.655-.97l-.007-.006c-.331-.189-.733-.222-1.163-.079l-.028.01a3.333 3.333 0 0 1-3.244-5.62l.02-.02c.299-.264.468-.578.505-.909l.01-.143v-.002l-.01-.143c-.037-.33-.206-.645-.504-.91l-.02-.02a3.333 3.333 0 0 1 2.97-5.688l.273.07.028.008c.432.144.836.11 1.168-.082h.002c.331-.192.563-.525.655-.972l.006-.028A3.334 3.334 0 0 1 12 1.667m0 2c-.63 0-1.159.437-1.297 1.026h-.001c-.193.904-.712 1.745-1.588 2.259l-.021.015c-.89.513-1.89.543-2.779.253a1.335 1.335 0 0 0-1.29 2.25c.692.623 1.163 1.503 1.163 2.529V12l-.006.192c-.054.943-.51 1.752-1.159 2.336l.001.001a1.334 1.334 0 0 0 1.297 2.247c.886-.287 1.883-.256 2.77.256l.005.002.164.1c.789.52 1.26 1.319 1.443 2.172a1.334 1.334 0 0 0 2.596 0c.182-.854.654-1.652 1.444-2.171l.163-.101.019-.01c.883-.504 1.874-.533 2.755-.248a1.335 1.335 0 0 0 1.298-2.247c-.648-.584-1.103-1.393-1.158-2.336l-.006-.193v-.002l.006-.193c.055-.943.51-1.752 1.158-2.337l.078-.08a1.333 1.333 0 0 0-1.366-2.17c-.888.291-1.89.262-2.781-.252l-.022-.015c-.876-.514-1.396-1.356-1.588-2.26l-.03-.108A1.335 1.335 0 0 0 12 3.667",
    ]}
  />
);
export const IcCode = (p: IconeProps) => (
  <Ic
    {...p}
    d="M16.7 17.3a.93.93 0 0 1-.687.275.97.97 0 0 1-.713-.3q-.3-.3-.3-.712 0-.413.3-.713l3.875-3.875-3.9-3.9a.9.9 0 0 1-.263-.687.98.98 0 0 1 .288-.688.95.95 0 0 1 .7-.275q.425 0 .7.275l4.6 4.6q.3.3.3.7t-.3.7zm-9.4 0-4.6-4.6a.96.96 0 0 1-.3-.7q0-.4.3-.7l4.6-4.6a1 1 0 0 1 .7-.287.95.95 0 0 1 .725.287q.3.3.3.713 0 .412-.3.712l-3.9 3.9 3.9 3.9q.274.275.262.688a.98.98 0 0 1-.287.687.95.95 0 0 1-.7.275.95.95 0 0 1-.7-.275"
  />
);

/* ——— les petites briques ——— */
export const Kbd = ({ touche }: { touche: string }) => <kbd className="pc-kbd">{touche}</kbd>;

export type OptionPc = {
  cle: string;
  libelle: string;
  icone?: React.ReactNode;
  meta?: string;
  coche?: boolean;
  href?: string;
  action?: () => void;
  /* un trait au-dessus */
  section?: boolean;
  inactif?: boolean;
};

/* un menu d'options sous son bouton : clic dehors ou Échap le ferme ; une option agit (action, ou lien) et le ferme */
export function MenuPc({
  bouton,
  titre,
  options,
  cote = "droite",
  largeur,
  raccourci,
}: {
  bouton: (ouvert: boolean) => React.ReactNode;
  titre: string;
  options: OptionPc[];
  cote?: "droite" | "gauche";
  largeur?: number;
  raccourci?: string;
}) {
  const routeur = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ouvert) return;
    const clic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const touche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOuvert(false);
      }
    };
    document.addEventListener("mousedown", clic);
    document.addEventListener("keydown", touche, true);
    return () => {
      document.removeEventListener("mousedown", clic);
      document.removeEventListener("keydown", touche, true);
    };
  }, [ouvert]);
  /* la touche du raccourci (F, V) ouvre le menu hors d'un champ, comme sur Plain */
  useEffect(() => {
    if (!raccourci) return;
    const touche = (e: KeyboardEvent) => {
      const cible = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (cible && (cible.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)))) return;
      if (e.key.toLowerCase() === raccourci.toLowerCase()) {
        e.preventDefault();
        setOuvert(true);
      }
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [raccourci]);
  const choisir = (o: OptionPc) => {
    if (o.inactif) return;
    setOuvert(false);
    if (o.action) o.action();
    else if (o.href) routeur.replace(o.href, { scroll: false });
  };
  return (
    <div className="lin-ancre" ref={ref}>
      <span onClick={() => setOuvert((v) => !v)} aria-haspopup="menu" aria-expanded={ouvert} style={{ display: "contents" }}>
        {bouton(ouvert)}
      </span>
      {ouvert ? (
        <div className="pc-menu" role="menu" aria-label={titre} data-cote={cote} style={largeur ? { minWidth: largeur } : undefined}>
          <div className="pc-menu-titre">{titre}</div>
          <ul>
            {options.length ? (
              options.map((o) => (
                <li key={o.cle} data-section={o.section ? "" : undefined} role="none">
                  <button type="button" role="menuitem" className="pc-menu-option" aria-disabled={o.inactif || undefined} onClick={() => choisir(o)}>
                    {o.icone}
                    <span>{o.libelle}</span>
                    {o.meta ? <small>{o.meta}</small> : null}
                    {o.coche ? <Check className="pc-coche" aria-label="actuel" /> : null}
                  </button>
                </li>
              ))
            ) : (
              <li className="pc-menu-vide">Rien à proposer.</li>
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

/* « Filtres » (avec son F) et « Affichage V » : les deux boutons de Plain, chacun sur son menu */
export function BoutonFiltres({ options, raccourci = true }: { options: OptionPc[]; raccourci?: boolean }) {
  return (
    <MenuPc
      titre="Filtrer"
      options={options}
      raccourci="f"
      bouton={(ouvert) => (
        <button type="button" className="pc-btn" aria-expanded={ouvert}>
          <IcFiltres />
          Filtres
          {raccourci ? <Kbd touche="F" /> : null}
        </button>
      )}
    />
  );
}
export function BoutonAffichage({ options }: { options: OptionPc[] }) {
  return (
    <MenuPc
      titre="Affichage"
      options={options}
      raccourci="v"
      bouton={(ouvert) => (
        <button type="button" className="pc-btn" aria-expanded={ouvert}>
          <IcAffichage />
          Affichage
          <Kbd touche="V" />
        </button>
      )}
    />
  );
}

/* l'étoile : épingler (localStorage, par navigateur) */
export function Etoile({ actif, basculer, libelle }: { actif: boolean; basculer: () => void; libelle: string }) {
  return (
    <button type="button" className="pc-rond pc-rond--sombre" aria-pressed={actif} aria-label={libelle} title={libelle} onClick={basculer}>
      {actif ? <IcEtoilePleine /> : <IcEtoile />}
    </button>
  );
}

export type ColonnePc = {
  cle: string;
  libelle: string;
  icone?: React.ReactNode;
  /* alignée à droite */
  num?: boolean;
  /* largeur en px ; sans largeur, la colonne prend le reste */
  largeur?: number;
  /* repliée en dessous de 900 (secondaire) ou de 640 (tertiaire) */
  repli?: "secondaire" | "tertiaire";
  /* la colonne du tri courant : la flèche */
  triee?: boolean;
};
export type LignePc = { id: string; href: string; libelle: string; cellules: React.ReactNode[] };

/* ——— la liste ——— */
export function ListeClients({
  icone,
  titre,
  etoile,
  filtres,
  affichage,
  action,
  recherche,
  tri,
  filtresActifs,
  erreur,
  colonnes,
  lignes,
  chargement,
  vide,
  pied,
}: {
  icone: React.ReactNode;
  titre: string;
  etoile?: { actif: boolean; basculer: () => void };
  filtres?: OptionPc[];
  affichage?: OptionPc[];
  /* le bouton plein, à droite (« + Create tenant ») */
  action?: React.ReactNode;
  recherche: { valeur: string; changer: (v: string) => void; placeholder: string };
  tri?: { libelle: string; retirer?: () => void };
  filtresActifs?: { cle: string; libelle: string; icone?: React.ReactNode; retirer: () => void }[];
  erreur?: string | null;
  colonnes: ColonnePc[];
  lignes: LignePc[];
  chargement?: boolean;
  vide: { titre: string; texte: string };
  /* sous le tableau (le bloc « à rattacher », par exemple) */
  pied?: React.ReactNode;
}) {
  return (
    <div className="lin pc">
      <div className="pc-page">
        <header className="pc-tete">
          <div className="pc-titre">
            {icone}
            <h1>{titre}</h1>
          </div>
          <div className="pc-tete-droite">
            {etoile ? <Etoile actif={etoile.actif} basculer={etoile.basculer} libelle="Épingler cette page" /> : null}
            {filtres ? <BoutonFiltres options={filtres} raccourci={false} /> : null}
            {affichage ? <BoutonAffichage options={affichage} /> : null}
            {action}
          </div>
        </header>
        <section className="pc-section" aria-label={titre}>
          <div className="pc-outils">
            <label className="pc-recherche">
              <IcLoupe />
              <input type="search" value={recherche.valeur} placeholder={recherche.placeholder} aria-label={recherche.placeholder} onChange={(e) => recherche.changer(e.target.value)} />
            </label>
            {tri ? (
              <div className="pc-tri">
                <IcTri />
                <span>
                  Trié par <b>{tri.libelle}</b>
                </span>
                {tri.retirer ? (
                  <button type="button" className="pc-rond pc-rond--petit" aria-label="Revenir au tri par défaut" title="Revenir au tri par défaut" onClick={tri.retirer}>
                    <IcCroix />
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
          {filtresActifs?.length ? (
            <div className="pc-filtres-actifs">
              {filtresActifs.map((f) => (
                <button key={f.cle} type="button" className="pc-filtre" title="Retirer ce filtre" onClick={f.retirer}>
                  {f.icone}
                  {f.libelle}
                  <IcCroix taille={14} />
                </button>
              ))}
            </div>
          ) : null}
          {erreur ? (
            <p className="pc-erreur" role="alert">
              La base réelle n&apos;a pas répondu. {erreur}
            </p>
          ) : null}
          {chargement ? (
            <p className="pc-chargement" aria-busy="true">
              Lecture en cours…
            </p>
          ) : !lignes.length ? (
            <div className="pc-vide" role="status">
              <strong>{vide.titre}</strong>
              <p>{vide.texte}</p>
            </div>
          ) : (
            <div className="pc-table-cadre">
              <table className="pc-table">
                <colgroup>
                  {colonnes.map((c) => (
                    <col key={c.cle} style={c.largeur ? { width: c.largeur } : undefined} className={c.repli ? `pc-col--${c.repli}` : undefined} />
                  ))}
                </colgroup>
                <thead>
                  <tr>
                    {colonnes.map((c) => (
                      <th key={c.cle} scope="col" className={[c.num ? "pc-num pc-fin" : "", c.repli ? `pc-col--${c.repli}` : ""].join(" ").trim() || undefined}>
                        <span>
                          {c.icone}
                          <b>{c.libelle}</b>
                          {c.triee ? <IcFlecheBas taille={14} /> : null}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l) => (
                    <tr key={l.id}>
                      {l.cellules.map((cell, i) => {
                        const c = colonnes[i];
                        return (
                          <td key={c?.cle ?? i} className={[c?.num ? "pc-num" : "", c?.repli ? `pc-col--${c.repli}` : ""].join(" ").trim() || undefined}>
                            {i === 0 ? (
                              <Link href={l.href} className="pc-nom pc-ligne-lien" aria-label={l.libelle} scroll={false}>
                                {cell}
                              </Link>
                            ) : (
                              cell
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {pied}
        </section>
      </div>
    </div>
  );
}

/* ——— la fiche d'un client ——— */
export type OngletPc = { cle: string; libelle: string; nombre?: number };

export function FicheClient({
  retour,
  icone,
  nom,
  meta,
  etoile,
  actions,
  onglets,
  onglet,
  choisirOnglet,
  droite,
  children,
  details,
  introuvable,
}: {
  retour: { href: string; libelle: string };
  icone: React.ReactNode;
  nom: string;
  meta?: React.ReactNode;
  etoile?: { actif: boolean; basculer: () => void };
  /* le « ··· » */
  actions?: OptionPc[];
  onglets: OngletPc[];
  onglet: string;
  choisirOnglet: (cle: string) => void;
  /* à droite des onglets : « Filtres F », « Affichage V » ou « Ajouter + » */
  droite?: React.ReactNode;
  children: React.ReactNode;
  /* le volet « Détails » : des <DetailsSection> */
  details: React.ReactNode;
  introuvable?: boolean;
}) {
  const [volet, setVolet] = useState(true);
  return (
    <div className="lin pc">
      <div className="pc-fiche" data-volet={volet ? undefined : "ferme"}>
        <div className="pc-fiche-gauche">
          <header className="pc-fiche-tete">
            <div className="pc-fiche-identite">
              <Link href={retour.href} className="pc-retour" scroll={false}>
                <IcRetour />
                {retour.libelle}
              </Link>
              <div className="pc-fiche-titre">
                <span className="pc-fiche-tuile">{icone}</span>
                <div style={{ minWidth: 0 }}>
                  <h1 className="pc-fiche-nom">{nom}</h1>
                  {meta ? <div className="pc-fiche-meta">{meta}</div> : null}
                </div>
              </div>
            </div>
            <div className="pc-fiche-droite">
              {etoile ? <Etoile actif={etoile.actif} basculer={etoile.basculer} libelle="Épingler" /> : null}
              {actions ? (
                <MenuPc
                  titre="Plus d'actions"
                  options={actions}
                  bouton={(ouvert) => (
                    <button type="button" className="pc-rond" aria-label="Plus d'actions" aria-expanded={ouvert}>
                      <IcPoints />
                    </button>
                  )}
                />
              ) : null}
              <button type="button" className="pc-rond" aria-label={volet ? "Masquer le volet Détails" : "Afficher le volet Détails"} aria-pressed={!volet} onClick={() => setVolet((v) => !v)}>
                <IcVolet />
              </button>
            </div>
          </header>
          {introuvable ? (
            <div className="pc-fiche-corps">
              <div className="pc-vide" role="status">
                <strong>Introuvable</strong>
                <p>Ce que désigne ce lien n&apos;est pas connu.</p>
              </div>
            </div>
          ) : (
            <section className="pc-fiche-corps" aria-label={nom}>
              <div className="pc-onglets-rangee">
                <div className="pc-onglets" role="tablist">
                  {onglets.map((o) => (
                    <button key={o.cle} type="button" role="tab" className="pc-onglet" aria-selected={onglet === o.cle} onClick={() => choisirOnglet(o.cle)}>
                      {o.libelle}
                      {o.nombre !== undefined ? <small>{o.nombre}</small> : null}
                    </button>
                  ))}
                </div>
                {droite ? <div className="pc-onglets-droite">{droite}</div> : null}
              </div>
              <div role="tabpanel">{children}</div>
            </section>
          )}
        </div>
        <aside className="pc-details" aria-label="Détails">
          <div className="pc-details-tete">
            <h2>Détails</h2>
          </div>
          <div className="pc-details-sections">{details}</div>
        </aside>
      </div>
    </div>
  );
}

export function DetailsSection({ titre, children }: { titre?: string; children: React.ReactNode }) {
  return (
    <div className="pc-details-section">
      {titre ? <h3>{titre}</h3> : null}
      <div className="pc-details-lignes">{children}</div>
    </div>
  );
}

/* une rangée du volet : étiquette (+ info) · valeur (texte, lien ou bouton) */
export function DetailsLigne({
  etiquette,
  aide,
  valeur,
  vide,
  mono,
  teinte,
  href,
  action,
  point,
}: {
  etiquette: string;
  aide?: string;
  valeur: React.ReactNode;
  vide?: boolean;
  mono?: boolean;
  teinte?: "rouge" | "jaune" | "vert" | "bleu";
  href?: string;
  action?: () => void;
  point?: "gris" | "rouge" | "jaune" | "vert" | "bleu";
}) {
  const contenu = (
    <>
      <span className={mono ? "pc-mono" : undefined}>
        {point ? <span className="pc-point" data-teinte={point === "gris" ? undefined : point} /> : null}
        {valeur}
      </span>
      {href || action ? <IcChevron /> : null}
    </>
  );
  const props = { className: "pc-details-valeur", "data-vide": vide ? "" : undefined, "data-teinte": teinte };
  return (
    <div className="pc-details-ligne">
      <div className="pc-details-etiquette" title={aide}>
        <span>{etiquette}</span>
        {aide ? <IcInfo taille={14} /> : null}
      </div>
      {href ? (
        <Link href={href} {...props} title={aide}>
          {contenu}
        </Link>
      ) : action ? (
        <button type="button" {...props} onClick={action} title={aide}>
          {contenu}
        </button>
      ) : (
        <div {...props} title={aide}>
          {contenu}
        </div>
      )}
    </div>
  );
}

/* le pied du volet : une phrase et un engrenage (un vrai lien) */
export function DetailsPied({ texte, href, libelle }: { texte: string; href?: string; libelle?: string }) {
  return (
    <div className="pc-details-section">
      <div className="pc-details-pied">
        <span>
          <IcOeilBarre taille={14} />
          <b>{texte}</b>
        </span>
        {href ? (
          <Link href={href} className="pc-rond pc-rond--petit" aria-label={libelle ?? texte} title={libelle ?? texte}>
            <IcEngrenage taille={14} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}

/* ——— la liste d'un onglet, comme « Customers » : une recherche, puis des lignes de 64 ——— */
export type ItemPc = { id: string; avatar: React.ReactNode; teinte?: "rouge" | "jaune" | "vert" | "bleu"; texte: React.ReactNode; sous?: React.ReactNode; droite?: React.ReactNode; href?: string; action?: () => void };

export function ListeItems({ recherche, items, vide }: { recherche?: { valeur: string; changer: (v: string) => void; placeholder: string }; items: ItemPc[]; vide: { titre: string; texte: string } }) {
  return (
    <div>
      {recherche ? (
        <div className="pc-liste-tete">
          <label className="pc-recherche">
            <IcLoupe />
            <input type="search" value={recherche.valeur} placeholder={recherche.placeholder} aria-label={recherche.placeholder} onChange={(e) => recherche.changer(e.target.value)} />
          </label>
        </div>
      ) : null}
      {items.length ? (
        <ul className="pc-liste">
          {items.map((it) => {
            const corps = (
              <>
                <span className="pc-avatar" data-teinte={it.teinte} aria-hidden="true">
                  {it.avatar}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span className="pc-item-texte">{it.texte}</span>
                  {it.sous ? <span className="pc-item-sous">{it.sous}</span> : null}
                </span>
                {it.droite ? <span className="pc-item-droite">{it.droite}</span> : <span />}
              </>
            );
            return (
              <li key={it.id}>
                {it.href ? (
                  <Link href={it.href} className="pc-item" scroll={false}>
                    {corps}
                  </Link>
                ) : it.action ? (
                  <button type="button" className="pc-item" style={{ width: "100%" }} onClick={it.action}>
                    {corps}
                  </button>
                ) : (
                  <div className="pc-item">{corps}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="pc-vide" role="status">
          <strong>{vide.titre}</strong>
          <p>{vide.texte}</p>
        </div>
      )}
    </div>
  );
}

/* ——— l'épingle de la page (par navigateur) ——— */
export function useEpingle(cle: string): [boolean, () => void] {
  const [actif, setActif] = useState(false);
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lu après le montage : le rendu du serveur ne connaît pas ce navigateur
      setActif(localStorage.getItem(`pc-epingle:${cle}`) === "1");
    } catch {
      /* stockage indisponible */
    }
  }, [cle]);
  const basculer = () =>
    setActif((v) => {
      try {
        localStorage.setItem(`pc-epingle:${cle}`, v ? "0" : "1");
      } catch {
        /* l'épingle vaut pour cette visite */
      }
      return !v;
    });
  return [actif, basculer];
}

export const initiale = (s: string) => (s.trim()[0] ?? "?").toUpperCase();
