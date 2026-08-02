"use client";

/* Bouton « Copier le prompt » des pré-audits (/audit/[slug]) — la seule
   interactivité de la page. navigator.clipboard exige un contexte sécurisé
   (https ou localhost) : en cas d'échec, repli sur la sélection du texte
   voisin pour que le geste reste possible à la main. */

import { useRef, useState } from "react";

export default function CopierPrompt({ texte }: { texte: string }) {
  const [copie, setCopie] = useState(false);
  const timer = useRef<number | null>(null);

  function confirme() {
    setCopie(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopie(false), 2200);
  }

  /* repli quand l'API Clipboard est refusée (permissions, vieux navigateur,
     webview) : textarea hors écran + execCommand — déprécié mais toléré
     partout, et c'est le geste utilisateur qui l'autorise */
  function copierLegacy() {
    const ta = document.createElement("textarea");
    ta.value = texte;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    document.body.removeChild(ta);
    if (ok) confirme();
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      confirme();
    } catch {
      copierLegacy();
    }
  }

  return (
    <button
      type="button"
      onClick={copier}
      className="inline-flex items-center gap-2 rounded-lg border border-[#3f3f46] px-3.5 py-2 text-[13px] font-medium leading-[20px] text-[#e4e4e7] transition-colors hover:border-[#71717a] hover:text-white"
      aria-live="polite"
    >
      {copie ? (
        <>
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M2.5 7.5 5.5 10.5 11.5 3.5"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Copié
        </>
      ) : (
        <>
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect
              x="4.5"
              y="4.5"
              width="7"
              height="7"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.3"
            />
            <path
              d="M9.5 2.5h-6A1.5 1.5 0 0 0 2 4v6"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
          Copier le prompt
        </>
      )}
    </button>
  );
}
