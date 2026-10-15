import type { ConfigCollection } from "./Collection";

/* Les collections de l'équipe, d'après le menu d'Attio (Tasks, Notes,
   Calls, Companies, People). Une entrée ici = une page /espace2/<cle>. */
export const COLLECTIONS: Record<string, ConfigCollection> = {
  taches: {
    cle: "taches",
    titre: "Tâches",
    intro: "Ce qu'il reste à faire dans l'équipe, avec une échéance. Cochez une tâche quand elle est faite.",
    une: "une tâche",
    coche: true,
    champs: [
      { cle: "titre", libelle: "Tâche", requis: true },
      { cle: "echeance", libelle: "Échéance", type: "date" },
      { cle: "qui", libelle: "Pour qui" },
    ],
    vide: "Aucune tâche pour l'instant.",
  },
  notes: {
    cle: "notes",
    titre: "Notes",
    intro: "Comptes rendus, idées, consignes : ce qu'on veut retrouver plus tard.",
    une: "une note",
    champs: [
      { cle: "titre", libelle: "Titre", requis: true },
      { cle: "texte", libelle: "Note", type: "long" },
    ],
    vide: "Aucune note pour l'instant.",
  },
  appels: {
    cle: "appels",
    titre: "Appels",
    intro: "Le journal des appels : avec qui, quand, et ce qui a été dit.",
    une: "un appel",
    champs: [
      { cle: "avec", libelle: "Avec qui", requis: true },
      { cle: "date", libelle: "Date", type: "date" },
      { cle: "resume", libelle: "Ce qui a été dit", type: "long" },
    ],
    vide: "Aucun appel noté pour l'instant.",
  },
  entreprises: {
    cle: "entreprises",
    titre: "Entreprises",
    intro: "Vos clients, fournisseurs et partenaires, avec leurs coordonnées.",
    une: "une entreprise",
    champs: [
      { cle: "nom", libelle: "Nom", requis: true },
      { cle: "type", libelle: "Client, fournisseur, partenaire…" },
      { cle: "ville", libelle: "Commune" },
      { cle: "telephone", libelle: "Téléphone", type: "tel" },
    ],
    vide: "Aucune entreprise pour l'instant.",
  },
  contacts: {
    cle: "contacts",
    titre: "Contacts",
    intro: "Les personnes à qui vous parlez, et l'entreprise où elles travaillent.",
    une: "un contact",
    champs: [
      { cle: "nom", libelle: "Nom", requis: true },
      { cle: "entreprise", libelle: "Entreprise" },
      { cle: "email", libelle: "E-mail", type: "email" },
      { cle: "telephone", libelle: "Téléphone", type: "tel" },
    ],
    vide: "Aucun contact pour l'instant.",
  },
};
