import type { Metadata } from "next";
import { Suspense } from "react";
import VueEnsemble, { type ReelEnsemble } from "@/components/espace2/teo/VueEnsemble";
import { estAdmin } from "@/lib/omega/donnees";
import { lireAgenda } from "@/lib/teo/agenda";
import { lireClients } from "@/lib/teo/clients";
import { lireBoite } from "@/lib/teo/gmail";
import { lireConversations } from "@/lib/teo/whatsapp";

/* /espace2/teo — la vue d'ensemble de MON ESPACE (11/11/2026) : la page « Home »
   d'une équipe de Linear, copiée de DALIRO, avec les clients, l'agenda, les
   conversations WhatsApp et la boîte mail de Teo. Les quatre lectures sont faites
   ici, sous la session du gérant, en même temps. */

export const metadata: Metadata = {
  title: "Mon espace",
  description: "L'espace personnel du gérant : ses clients et prospects, son agenda, ses conversations WhatsApp et sa boîte mail.",
};

async function lireTout(): Promise<ReelEnsemble | null> {
  if (!(await estAdmin())) return null;
  const [clients, agenda, whatsapp, mails] = await Promise.all([lireClients(), lireAgenda(), lireConversations(), lireBoite()]);
  return {
    clients: clients.clients,
    agenda: agenda.rendezVous,
    whatsapp: whatsapp.conversations,
    mails: mails.fils,
    connexions: { google: mails.etat === "ok" ? "ok" : mails.etat, whatsapp: whatsapp.etat, adresse: mails.adresse, detail: mails.detail ?? agenda.detail ?? whatsapp.detail },
  };
}

export default async function PageTeo() {
  const reel = await lireTout();
  return (
    <Suspense>
      <VueEnsemble reel={reel} />
    </Suspense>
  );
}
