"use client";

/* ══════════════════════════════════════════════════════════════════════
   MON ESPACE — ce que les pages partagent (11/11/2026)

   `gerant` : la session est celle du compte gérant (app/espace2/teo/layout).
   `reel` : on montre la base réelle (Gmail, Google Agenda, omega_contacts,
   WhatsApp) — le gérant, et « Base réelle » choisi dans le menu de
   l'organisation ; sinon l'exemple (./exemples). Chaque page reçoit ses
   données réelles de son page.tsx (lues sous la session) et choisit ici.
   ══════════════════════════════════════════════════════════════════════ */

import { createContext, useContext } from "react";
import { useSource } from "@/components/espace/source";

const Contexte = createContext<{ gerant: boolean }>({ gerant: false });

export default function DonneesTeo({ gerant, children }: { gerant: boolean; children: React.ReactNode }) {
  return <Contexte.Provider value={{ gerant }}>{children}</Contexte.Provider>;
}

export function useTeo(): { gerant: boolean; reel: boolean } {
  const { gerant } = useContext(Contexte);
  const { source } = useSource();
  return { gerant, reel: gerant && source === "reelle" };
}
