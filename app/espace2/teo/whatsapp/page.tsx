import type { Metadata } from "next";
import { Suspense } from "react";
import WhatsApp, { type ReelWhatsApp } from "@/components/espace2/teo/WhatsApp";
import { estAdmin } from "@/lib/omega/donnees";
import { lireClients } from "@/lib/teo/clients";
import { lireConversations } from "@/lib/teo/whatsapp";

/* /espace2/teo/whatsapp — les conversations WhatsApp de Teo sur l'Inbox de
   Linear (les Appels de DALIRO) : la liste à gauche, la conversation ouverte
   (?numero=) à droite, avec son fil et le composeur. Les messages arrivent par
   le webhook /api/teo/whatsapp (omega_whatsapp_messages). */

export const metadata: Metadata = {
  title: "WhatsApp",
  description: "Vos conversations WhatsApp : ce qui attend une réponse, le fil de chacune, et la réponse qui part d'ici.",
};

export default async function PageWhatsApp() {
  let reel: ReelWhatsApp | null = null;
  if (await estAdmin()) {
    const [w, c] = await Promise.all([lireConversations(), lireClients()]);
    reel = { ...w, clients: c.clients };
  }
  return (
    <Suspense>
      <WhatsApp reel={reel} />
    </Suspense>
  );
}
