/* partagé entre la lecture serveur (lib/omega/donnees) et la page Notes (NotesOmega) */
export type PageNote = { slug: string; titre: string; contenu: string; maj: string };
/* les trois documents de référence, devenus des notes le 10/10/2026 */
export const NOTES_REFERENCE = ["strategie", "manuel", "linkedin"];
