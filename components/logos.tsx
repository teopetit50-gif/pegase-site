/* Un logo par moteur Omega — depuis le 21/07 : LOGOS DE MARQUES IA
   officiels (demande Teo : « remplace les pictos par des logos de marque
   comme Claude, Mistral AI, NVIDIA etc avec leurs logos »). Chaque moteur
   porte la marque IA qui l'anime, via simple-icons, en tuile app-icon :
   fond couleur de marque + glyphe blanc, ou tuile blanche quand c'est
   l'usage officiel (NVIDIA, AMD, Ollama).
   Pour un logo custom : déposer le fichier dans public/logos/ (ex.
   payd.svg) puis renseigner CUSTOM ci-dessous. */

import {
  siClaude,
  siMistralai,
  siOllama,
  siGooglegemini,
  siAnthropic,
  siElevenlabs,
  siGithubcopilot,
  siCursor,
  siNvidia,
  siAmd,
  siQwen,
  siN8n,
} from "simple-icons";

type Brand = { icon: { path: string; title: string }; bg: string; fg: string };

/* moteur → marque IA. Tuile = codes officiels (mêmes règles que le panneau
   « SOUS LE CAPOT » : Claude carré #D97757 blanc, NVIDIA/AMD sur blanc). */
const BRANDS: Record<string, Brand> = {
  PAYD: { icon: siCursor, bg: "#ffffff", fg: "#0f1013" },
  ANSWR: { icon: siElevenlabs, bg: "#ffffff", fg: "#0f1013" },
  OFFLOAD: { icon: siGithubcopilot, bg: "#0f1013", fg: "#ffffff" },
  BRIEF: { icon: siGooglegemini, bg: "#1b1e26", fg: "#8E75B2" },
  REVIVE: { icon: siAnthropic, bg: "#191919", fg: "#ffffff" },
  POSTD: { icon: siMistralai, bg: "#1a1a1a", fg: "#FA520F" },
  REACH: { icon: siGithubcopilot, bg: "#0f1013", fg: "#ffffff" },
  HIRED: { icon: siClaude, bg: "#D97757", fg: "#ffffff" },
  BILLD: { icon: siNvidia, bg: "#ffffff", fg: "#76B900" },
  PUBLIQ: { icon: siAmd, bg: "#ffffff", fg: "#0f1013" },
  STAYD: { icon: siQwen, bg: "#ffffff", fg: "#6950EF" },
  COLLECT: { icon: siN8n, bg: "#ffffff", fg: "#EA4B71" },
};

/* img renseigné = le fichier de public/logos/ remplace le logo de marque */
const CUSTOM: Record<string, string> = {
  // PAYD: "/logos/payd.svg",
};

export function SystemLogo({ system }: { system: string }) {
  const img = CUSTOM[system];
  if (img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={img} alt={`Logo ${system}`} className="h-11 w-11 object-contain" />;
  }
  const brand = BRANDS[system];
  if (!brand) return null;
  return (
    <span
      className="grid h-11 w-11 place-items-center rounded-[13px]"
      style={{
        background: brand.bg,
        boxShadow:
          "0 10px 22px -8px rgba(15, 16, 19, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 0 0 1px rgba(15, 16, 19, 0.06)",
      }}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" aria-label={brand.icon.title}>
        <path d={brand.icon.path} fill={brand.fg} />
      </svg>
    </span>
  );
}
