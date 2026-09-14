import { Send, FileText, Inbox, ShieldCheck } from "lucide-react";

/* ══════════════════════════════════════════════════════════════════════
   Les chiffres du système — tuiles reprises de
   `stats-section-with-text.tsx` (21st.dev) : bordées, `rounded-md`,
   icône en haut, grand chiffre puis libellé en bas, et les quatre
   traitées à l'identique.

   La version précédente (grille `stats-bento`) a été écartée par Teo :
   sa tuile principale était un aplat blanc plein cadre qui écrasait tout
   autour sur un téléphone. Ici aucune tuile ne domine — c'est ce qui
   fait qu'on lit les quatre.

   Elle REMPLACE trois paragraphes : un chiffre se lit en un dixième de
   seconde, une phrase en quatre.

   ⚠️ TOUS CES CHIFFRES SONT VÉRIFIABLES SUR LE PRODUIT. Aucun n'est une
   performance commerciale : ni part de marché, ni croissance, ni note
   moyenne — FILED n'a pas de client. Ce sont des faits de fabrication :
   ce qu'il faut brancher, ce qu'il sait lire, ce qu'il refuse, ce qu'il
   n'envoie pas. C'est aussi pourquoi il n'y a NI flèche de tendance NI
   variation en pourcentage, contrairement au composant d'origine : ces
   nombres-là ne montent ni ne descendent.
   ══════════════════════════════════════════════════════════════════════ */

const CHIFFRES = [
  {
    icone: Send,
    valeur: "0",
    libelle: "Message envoyé en votre nom",
    detail: "Il lit, recoupe, classe et transmet — il n'écrit à personne.",
  },
  {
    icone: Inbox,
    valeur: "1",
    libelle: "Boîte mail à brancher",
    detail: "Aucun logiciel à installer, aucun fichier à importer.",
  },
  {
    icone: FileText,
    valeur: "10",
    libelle: "Formats reconnus",
    detail: "PDF, scan, photo de travers, corps du mail, ticket, avoir…",
  },
  {
    /* « Verrous en base » était du jargon — et ça nommait presque notre
       outil, ce qu'on ne fait jamais sur un site. */
    icone: ShieldCheck,
    valeur: "12",
    libelle: "Contrôles avant classement",
    detail: "Ils refusent la pièce avant de l'écrire, jamais après.",
  },
];

export default function Chiffres() {
  return (
    <div className="mx-0 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:mx-5 lg:grid-cols-4">
      {CHIFFRES.map(({ icone: Icone, valeur, libelle, detail }) => (
        <div
          key={libelle}
          className="flex flex-col justify-between rounded-md border border-[#171717]/[0.17] bg-[#171717]/[0.03] p-6 transition-colors hover:border-[#171717]/[0.30]"
        >
          <Icone aria-hidden="true" className="mb-8 size-4 text-[#737373] lg:mb-10" />
          <div className="font-display text-4xl leading-none tracking-[-0.03em] text-[#171717]">
            {valeur}
          </div>
          <p className="mt-3 text-[15px] leading-snug text-[#171717]">{libelle}</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-[#737373]">{detail}</p>
        </div>
      ))}
    </div>
  );
}
