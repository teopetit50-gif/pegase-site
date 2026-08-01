/* Logos des outils grand public — Gmail, Google Sheets, WhatsApp, Outlook,
   Excel, Google Drive.

   26/07/2026 (Teo : « remplace ça par les vrais logos »). La pastille
   « Sur vos outils » de /offres portait un carré de couleur par outil : le
   bon ton, mais aucune marque reconnaissable — six pastilles interchangeables.
   Les marques sont donc redessinées ici en couleurs officielles.

   Pourquoi des tracés maison plutôt que simple-icons, déjà installé : le
   paquet ne rend qu'UN chemin monochrome par marque, et il a retiré les
   icônes Microsoft (ni `siMicrosoftoutlook` ni `siMicrosoftexcel` n'existent
   en v16). Un Gmail rouge à plat et un Drive bleu à plat ne se lisent pas
   comme les vrais logos, qui sont polychromes. WhatsApp fait exception :
   son logo EST monochrome (glyphe blanc sur disque vert), on le dessine donc
   tel quel.

   Toutes les icônes partagent le même viewBox 48×48 et se dimensionnent par
   la prop `taille`, pour que la rangée reste optiquement homogène. */

type Props = { taille?: number };

function Svg({
  taille = 18,
  titre,
  children,
}: Props & { titre: string; children: React.ReactNode }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 48 48"
      role="img"
      aria-label={titre}
      className="shrink-0"
    >
      {children}
    </svg>
  );
}

/* Gmail — enveloppe blanche, joues rouges, rabat en « M ». */
export function LogoGmail({ taille }: Props) {
  return (
    <Svg taille={taille} titre="Gmail">
      <path fill="#4caf50" d="M45,16.2l-5,2.75l-5,4.75L35,40h7c1.657,0,3-1.343,3-3V16.2z" />
      <path fill="#1e88e5" d="M3,16.2l3.614,1.71L13,23.7V40H6c-1.657,0-3-1.343-3-3V16.2z" />
      <polygon fill="#e53935" points="35,11.2 24,19.45 13,11.2 12,17 13,23.7 24,31.95 35,23.7 36,17" />
      <path
        fill="#c62828"
        d="M3,12.298V16.2l10,7.5V11.2L9.876,8.859C9.132,8.301,8.228,8,7.298,8h0C4.924,8,3,9.924,3,12.298z"
      />
      <path
        fill="#fbc02d"
        d="M45,12.298V16.2l-10,7.5V11.2l3.124-2.341C38.868,8.301,39.772,8,40.702,8h0C43.076,8,45,9.924,45,12.298z"
      />
    </Svg>
  );
}

/* Google Sheets — feuille verte, coin replié, tableau blanc. */
export function LogoSheets({ taille }: Props) {
  return (
    <Svg taille={taille} titre="Google Sheets">
      <path
        fill="#43a047"
        d="M37,45H11c-1.657,0-3-1.343-3-3V6c0-1.657,1.343-3,3-3h19l10,10v29C40,43.657,38.657,45,37,45z"
      />
      <path fill="#c8e6c9" d="M40 13L30 13 30 3z" />
      <path fill="#2e7d32" d="M30 13L40 23 40 13z" />
      <path
        fill="#e8f5e9"
        d="M31,23H17h-2v2v2v2v2v2v2v2h2h14h2v-2v-2v-2v-2v-2v-2v-2H31z M17,25h5v2h-5V25z M17,29h5v2h-5V29z M17,33h5v2h-5V33z M31,35h-7v-2h7V35z M31,31h-7v-2h7V31z M31,27h-7v-2h7V27z"
      />
    </Svg>
  );
}

/* WhatsApp — glyphe blanc sur disque vert #25D366, le logo officiel. */
export function LogoWhatsApp({ taille }: Props) {
  return (
    <Svg taille={taille} titre="WhatsApp">
      <circle cx="24" cy="24" r="21" fill="#25d366" />
      <path
        fill="#fff"
        d="M32.4,27.9c-0.5-0.3-3-1.5-3.5-1.6c-0.5-0.2-0.8-0.3-1.1,0.2c-0.3,0.5-1.3,1.6-1.6,2
           c-0.3,0.3-0.6,0.4-1.1,0.1c-0.5-0.3-2.2-0.8-4.1-2.6c-1.5-1.4-2.5-3.1-2.8-3.6c-0.3-0.5,0-0.8,0.2-1c0.2-0.2,0.5-0.6,0.8-0.9
           c0.2-0.3,0.3-0.5,0.5-0.9c0.2-0.3,0.1-0.6,0-0.9c-0.1-0.3-1.1-2.9-1.5-3.9c-0.4-1-0.8-0.9-1.1-0.9c-0.3,0-0.6,0-0.9,0
           c-0.3,0-0.9,0.1-1.3,0.6c-0.5,0.5-1.7,1.8-1.7,4.3c0,2.5,1.8,4.9,2,5.3c0.3,0.3,3.5,5.7,8.6,7.7c3,1.2,4.2,1.3,5.7,1.1
           c0.9-0.1,3-1.3,3.4-2.5c0.4-1.2,0.4-2.3,0.3-2.5C33.2,28.3,32.9,28.2,32.4,27.9z"
      />
    </Svg>
  );
}

/* Outlook — tuile bleu foncé au « O » blanc, carte de courrier bleue à droite. */
export function LogoOutlook({ taille }: Props) {
  return (
    <Svg taille={taille} titre="Outlook">
      {/* carte de droite */}
      <path fill="#0072c6" d="M23,11h20c1.105,0,2,0.895,2,2v22c0,1.105-0.895,2-2,2H23V11z" />
      {/* rabat de l'enveloppe, plus clair */}
      <path fill="#0364b8" d="M45,14.6L34,22.3L23,14.6V11h20c1.105,0,2,0.895,2,2V14.6z" />
      <path fill="#28a8ea" d="M45,15.9V35c0,1.105-0.895,2-2,2H23V21.6l11,7.5L45,15.9z" opacity=".55" />
      {/* tuile de gauche */}
      <path fill="#0f4f9c" d="M3,9.6l18-3.4v35.6L3,38.4V9.6z" />
      {/* le O */}
      <ellipse cx="12" cy="24" rx="4.4" ry="6" fill="none" stroke="#fff" strokeWidth="3" />
    </Svg>
  );
}

/* Excel — classeur vert en damier, tuile au « X » blanc. */
export function LogoExcel({ taille }: Props) {
  return (
    <Svg taille={taille} titre="Excel">
      <path fill="#169154" d="M29,6H15.744C14.781,6,14,6.781,14,7.744v7.259h15V6z" />
      <path fill="#18482a" d="M14,33.054v7.202C14,41.219,14.781,42,15.743,42H29v-8.946H14z" />
      <path fill="#0c8045" d="M14 15.003H29V24.005H14z" />
      <path fill="#17472a" d="M14 24.005H29V33.055H14z" />
      <path fill="#29c27f" d="M42.256,6H29v9.003h15V7.744C44,6.781,43.219,6,42.256,6z" />
      <path fill="#27663f" d="M29,33.054V42h13.257C43.219,42,44,41.219,44,40.256v-7.202H29z" />
      <path fill="#19ac65" d="M29 15.003H44V24.005H29z" />
      <path fill="#129652" d="M29 24.005H44V33.055H29z" />
      <path
        fill="#0c7238"
        d="M22.319,34H5.681C4.753,34,4,33.247,4,32.319V15.681C4,14.753,4.753,14,5.681,14h16.638C23.247,14,24,14.753,24,15.681v16.638C24,33.247,23.247,34,22.319,34z"
      />
      <path
        fill="#fff"
        d="M9.807 19L12.194 19 14.129 22.335 16.063 19 18.451 19 15.322 24 18.451 29 16.063 29 14.129 25.665 12.194 29 9.807 29 12.936 24z"
      />
    </Svg>
  );
}

/* Google Drive — le triangle tricolore. */
export function LogoDrive({ taille }: Props) {
  return (
    <Svg taille={taille} titre="Google Drive">
      <polygon fill="#ffc107" points="17,6 31,6 45,30 31,30" />
      <polygon fill="#1976d2" points="9.875,42 16.938,30 45,30 38.063,42" />
      <polygon fill="#4caf50" points="3,30.125 17,6 24,18 9.875,42" />
    </Svg>
  );
}
