"use client";

/* ══════════════════════════════════════════════════════════════════════
   Résolution des icônes par NOM (14/09/2026)

   Une page produit est un composant serveur. Lui faire passer un composant
   d'icône à un composant client rend un 500 en production, invisible pour
   `tsc` comme pour ESLint : un composant d'icône EST une fonction, et une
   fonction ne traverse pas la frontière serveur → client. La donnée porte
   donc un nom, et c'est ici, côté client, qu'il devient un composant.
   ══════════════════════════════════════════════════════════════════════ */

import {
  Bell,
  BrainCircuit,
  CalendarCheck,
  Calculator,
  ChartNoAxesColumn,
  Handshake,
  Inbox,
  Landmark,
  Lock,
  Megaphone,
  MessageSquare,
  Route,
  Scale,
  ScanLine,
  Search,
  ShieldCheck,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { NomIcone } from "@/lib/produits/capacites/types";

const TABLE: Record<NomIcone, LucideIcon> = {
  inbox: Inbox,
  scan: ScanLine,
  shield: ShieldCheck,
  route: Route,
  calculator: Calculator,
  chart: ChartNoAxesColumn,
  users: Users,
  search: Search,
  megaphone: Megaphone,
  landmark: Landmark,
  handshake: Handshake,
  message: MessageSquare,
  brain: BrainCircuit,
  calendar: CalendarCheck,
  bell: Bell,
  wallet: Wallet,
  scale: Scale,
  lock: Lock,
};

export function Icone({ nom, className }: { nom: NomIcone; className?: string }) {
  const I = TABLE[nom] ?? ShieldCheck;
  return <I className={className} strokeWidth={1.6} aria-hidden="true" />;
}
