"use server";

/* ══════════════════════════════════════════════════════════════════════
   /bienvenue — actions serveur du premier passage (07/10/2026)

   · televerserLogo        — le logo de l'entreprise, rangé dans le seau
                             `omega-clients` sous <client>/logo/ — le
                             préfixe du client, que la politique Storage
                             du socle ouvre à son propre compte (comme les
                             photos de grp_receptions). Écrit avec la
                             session du client : aucune clé de service ici.
                             Compte pas encore rattaché à un client : le
                             logo n'est pas rangé, et on le dit.
   · enregistrerBienvenue  — les réponses des quatre étapes, posées dans
                             user_metadata.bienvenue, puis le drapeau
                             user_metadata.bienvenue_faite qui retire la
                             page du chemin (app/espace2/layout.tsx).

   Pourquoi user_metadata : le client n'écrit pas dans `clients` (ses
   droits sont posés par Omega). Ses réponses sont une DÉCLARATION, qu'Omega
   relit à l'installation. Le tout tient en quelques centaines d'octets :
   user_metadata voyage dans le jeton de session, on n'y met jamais de
   fichier (d'où le seau pour le logo).

   Les invitations ne créent AUCUN compte : la liste est rangée avec le
   reste, et Omega ouvre chaque accès lui-même — la page le dit.
   ══════════════════════════════════════════════════════════════════════ */

import { createClient } from "@/lib/supabase/server";

export type RetourBienvenue = { ok: true } | { ok: false; motif: string };

const SEAU = "omega-clients";
const TYPES = new Map([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
]);
const POIDS_MAX = 5 * 1024 * 1024;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type ReponsesBienvenue = {
  entreprise: string;
  siren: string;
  territoire: string;
  metier: string;
  activite: string;
  priorites: string[];
  messagerie: "google" | "microsoft" | "plus-tard";
  invitations: { email: string; role: "collaborateur" | "gerant" }[];
};

async function sessionOuverte() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? supabase : null;
}

export async function televerserLogo(donnees: FormData): Promise<RetourBienvenue> {
  const supabase = await sessionOuverte();
  if (!supabase) return { ok: false, motif: "Votre session a expiré. Rouvrez le lien reçu par e-mail." };

  const fichier = donnees.get("logo");
  if (!(fichier instanceof File) || fichier.size === 0) return { ok: false, motif: "Aucun fichier reçu." };
  const ext = TYPES.get(fichier.type);
  if (!ext) return { ok: false, motif: "Formats acceptés : PNG, JPEG, GIF ou WebP." };
  if (fichier.size > POIDS_MAX) return { ok: false, motif: "Le fichier dépasse 5 Mo." };

  /* le client rattaché au compte (la policy « lit ses rattachements » ne
     rend que les siens) */
  const { data: compte } = await supabase.from("comptes").select("client_id").limit(1).maybeSingle();
  const client = compte?.client_id ? String(compte.client_id) : null;
  if (!client) return { ok: false, motif: "Votre espace n'est pas encore relié : Omega ajoutera le logo à l'installation." };

  const chemin = `${client}/logo/logo.${ext}`;
  const { error } = await supabase.storage
    .from(SEAU)
    .upload(chemin, fichier, { contentType: fichier.type, upsert: true });
  if (error) return { ok: false, motif: "Le logo n'a pas pu être enregistré. Réessayez." };

  await supabase.auth.updateUser({ data: { logo: chemin } });
  return { ok: true };
}

function nettoyer(r: ReponsesBienvenue): ReponsesBienvenue {
  const court = (s: unknown, n = 120) => String(s ?? "").trim().slice(0, n);
  return {
    entreprise: court(r.entreprise),
    siren: court(r.siren, 20).replace(/[^\d ]/g, ""),
    territoire: court(r.territoire, 40),
    metier: court(r.metier, 40),
    activite: court(r.activite, 60),
    priorites: (Array.isArray(r.priorites) ? r.priorites : []).map((p) => court(p, 40)).slice(0, 8),
    messagerie: r.messagerie === "google" || r.messagerie === "microsoft" ? r.messagerie : "plus-tard",
    invitations: (Array.isArray(r.invitations) ? r.invitations : [])
      .map((i) => ({
        email: court(i?.email, 160).toLowerCase(),
        role: i?.role === "gerant" ? ("gerant" as const) : ("collaborateur" as const),
      }))
      .filter((i) => EMAIL.test(i.email))
      .slice(0, 10),
  };
}

export async function enregistrerBienvenue(reponses: ReponsesBienvenue): Promise<RetourBienvenue> {
  const supabase = await sessionOuverte();
  if (!supabase) return { ok: false, motif: "Votre session a expiré. Rouvrez le lien reçu par e-mail." };

  const propre = nettoyer(reponses);
  if (!propre.entreprise) return { ok: false, motif: "Indiquez le nom de votre entreprise." };

  const { error } = await supabase.auth.updateUser({
    data: {
      bienvenue: { ...propre, le: new Date().toISOString() },
      bienvenue_faite: true,
      /* le nom tapé devient celui que l'espace affiche (lib/compte.ts lit
         user_metadata.entreprise) */
      entreprise: propre.entreprise,
    },
  });
  if (error) return { ok: false, motif: "Vos réponses n'ont pas pu être enregistrées. Réessayez." };
  return { ok: true };
}
