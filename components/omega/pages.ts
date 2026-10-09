/* ══════════════════════════════════════════════════════════════════════
   Les écrans du pilotage, calqués sur ceux de /espace2 (09/10/2026)

   Demande de Teo : « reprends le même design, le même emplacement de
   section que le dashboard, remplace le contenu ». Chaque entrée de la
   barre latérale de /espace2 garde sa place et son adresse (sous /omega) ;
   ce qu'elle montre devient le pilotage d'Omega :

     Vue d'ensemble   → l'accueil (app/omega/page.tsx)
     À valider        → les décisions qui attendent Teo
     Point du matin   → la journée : échéances, routines, relances
     Demandes reçues  → le suivi des prospects et clients
     Tâches           → le plan sur 90 jours, les ajouts, les routines
     Notes            → stratégie, manuel, plan LinkedIn
     Appels           → la méthode de vente, les fiches, le kit setter
     Entreprises      → la liste BTP à prospecter
     Contacts         → le programme partenaires
     <module>         → la fiche de vente et les vidéos du produit
     Activité         → le calendrier vidéo, la pub, les preuves
     Automatisations  → les chantiers des moteurs, l'état des produits
     Utilisation      → les finances, la santé des clients
     Aide             → le manuel ; Réglages → le kit contractuel

   Un onglet est soit un document (slug de omega_pages), soit un ou
   plusieurs tableaux (omega_lignes), soit un écran à part (« special »).
   ══════════════════════════════════════════════════════════════════════ */

export type OngletPage = { cle: string; libelle: string; doc?: string; tableaux?: string[]; special?: "validations" | "point" | "prospects" | "demandes" | "contacts" };
export type DefPage = { titre: string; onglets: OngletPage[] };

const NOMS_MODULES: Record<string, string> = { filed: "FILED", cashd: "CASHD", reput: "REPUT", offload: "OFFLOAD", daliro: "DALIRO", tavaro: "TAVARO", lorani: "LORANI", tamila: "TAMILA", tiroma: "TIROMA", varelo: "VARELO" };

export const PAGES_OMEGA: Record<string, DefPage> = {
  validations: { titre: "À valider", onglets: [{ cle: "", libelle: "Décisions", special: "validations" }] },
  point: { titre: "Point du matin", onglets: [{ cle: "", libelle: "Aujourd'hui", special: "point" }] },
  demandes: { titre: "Demandes reçues", onglets: [{ cle: "", libelle: "Prospects et clients", special: "demandes" }] },
  taches: {
    titre: "Tâches",
    onglets: [
      { cle: "", libelle: "Plan sur 90 jours", tableaux: ["plan", "ajouts"] },
      { cle: "routines", libelle: "Routines", tableaux: ["routines"] },
    ],
  },
  notes: {
    titre: "Notes",
    onglets: [
      { cle: "", libelle: "Stratégie", doc: "strategie" },
      { cle: "manuel", libelle: "Manuel", doc: "manuel" },
      { cle: "linkedin", libelle: "Plan LinkedIn", doc: "linkedin" },
    ],
  },
  appels: {
    titre: "Appels",
    onglets: [
      { cle: "", libelle: "Méthode de vente", doc: "vendre" },
      { cle: "fiches", libelle: "Toutes les fiches", doc: "vendre-fiches" },
      { cle: "setter", libelle: "Kit setter", doc: "setter" },
    ],
  },
  entreprises: { titre: "Entreprises", onglets: [{ cle: "", libelle: "Prospection", special: "prospects" }] },
  contacts: { titre: "Contacts", onglets: [{ cle: "", libelle: "Mes contacts", special: "contacts" }] },
  activite: {
    titre: "Activité",
    onglets: [
      { cle: "", libelle: "Calendrier vidéo", doc: "videos" },
      { cle: "general", libelle: "Vidéos générales", doc: "videos-general" },
      { cle: "publicite", libelle: "Publicité Meta", doc: "publicite" },
      { cle: "preuves", libelle: "Machine à preuves", doc: "preuves" },
    ],
  },
  automatisations: {
    titre: "Automatisations",
    onglets: [
      { cle: "", libelle: "Chantiers des moteurs", tableaux: ["moteurs"] },
      { cle: "produits", libelle: "État des produits", doc: "produits" },
    ],
  },
  utilisation: {
    titre: "Utilisation",
    onglets: [
      { cle: "", libelle: "Pilotage financier", doc: "finances" },
      { cle: "sante", libelle: "Santé des clients", doc: "sante" },
    ],
  },
  aide: { titre: "Aide", onglets: [{ cle: "", libelle: "Manuel", doc: "manuel" }] },
  reglages: {
    titre: "Réglages",
    onglets: [{ cle: "", libelle: "Kit contractuel", doc: "contrats" }],
  },
  ...Object.fromEntries(
    Object.entries(NOMS_MODULES).map(([cle, nom]) => [
      cle,
      {
        titre: nom,
        onglets: [
          { cle: "", libelle: "Fiche de vente", doc: `vendre-${cle}` },
          { cle: "videos", libelle: "Vidéos", doc: `videos-${cle}` },
        ],
      },
    ]),
  ),
};

export const titrePage = (chemin: string) => {
  const cle = chemin.replace(/^\/omega\/?/, "").split("/")[0];
  if (!cle) return "Vue d'ensemble";
  if (cle === "audit") return "Audit";
  return PAGES_OMEGA[cle]?.titre ?? "Pilotage";
};
