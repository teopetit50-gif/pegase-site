/* ══════════════════════════════════════════════════════════════════════
   Lire un export de logiciel de gestion (CSV, point-virgule, tabulation)
   pour en faire les lignes JSON de grp_deposer_codes (05/10/2026, B1).

   La porte attend un tableau d'objets : {code, nom, siren, siret, tva,
   iban, gtin, ref_fournisseur, fournisseur, unite, adresse, code_postal,
   ville, pays, telephone, email, type, actif}. L'en-tête de l'export
   est reconnu par des synonymes courants (Sage, EBP, Cegid, tableurs) ;
   les colonnes inconnues sont ignorées et dites à l'écran. Rien n'est
   envoyé avant que la personne ait vu le compte des lignes.
   ══════════════════════════════════════════════════════════════════════ */

export type LigneDepot = Record<string, string>;

export const SYNONYMES: Record<string, string[]> = {
  code: ["code", "code_local", "codelocal", "code tiers", "code_tiers", "codetiers", "reference", "référence", "ref", "compte", "numero", "numéro", "n°", "id", "identifiant", "code article", "code_article", "code client", "code fournisseur", "ct_num", "ar_ref"],
  nom: ["nom", "libelle", "libellé", "designation", "désignation", "raison sociale", "raison_sociale", "raisonsociale", "intitule", "intitulé", "nom_local", "ct_intitule", "ar_design", "denomination", "dénomination", "societe", "société"],
  siren: ["siren", "n° siren", "numero siren"],
  siret: ["siret", "n° siret", "ct_siret"],
  tva: ["tva", "n° tva", "tva intracom", "tva_intracom", "numero tva", "ct_identifiant", "tva intracommunautaire"],
  iban: ["iban", "rib", "coordonnees bancaires", "coordonnées bancaires"],
  gtin: ["gtin", "ean", "ean13", "ean 13", "code barre", "code-barre", "code_barre", "codebarre", "ar_codebarre"],
  ref_fournisseur: ["ref_fournisseur", "ref fournisseur", "reference fournisseur", "référence fournisseur", "af_reffourniss"],
  fournisseur: ["fournisseur", "code fournisseur principal", "fournisseur principal"],
  unite: ["unite", "unité", "unite de vente", "unité de vente", "uv"],
  adresse: ["adresse", "adresse 1", "adresse1", "rue", "voie", "ct_adresse"],
  code_postal: ["code_postal", "code postal", "cp", "codepostal", "ct_codepostal"],
  ville: ["ville", "commune", "localite", "localité", "ct_ville"],
  pays: ["pays", "code pays", "ct_pays"],
  telephone: ["telephone", "téléphone", "tel", "tél", "tel.", "ct_telephone", "portable"],
  email: ["email", "e-mail", "courriel", "mail", "ct_email"],
  type: ["type", "type de site", "type_site", "nature"],
  actif: ["actif", "active", "en sommeil", "sommeil", "ct_sommeil", "statut"],
};

function normaliser(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^﻿/, "")
    .replace(/["']/g, "")
    .trim();
}

function cleDe(entete: string, synonymes: Record<string, string[]> = SYNONYMES): string | null {
  const n = normaliser(entete);
  for (const [cle, syn] of Object.entries(synonymes)) {
    if (syn.some((s) => normaliser(s) === n)) return cle;
  }
  return null;
}

function separateur(ligne: string): string {
  const compte = (c: string) => ligne.split(c).length - 1;
  const candidats: [string, number][] = [[";", compte(";")], ["\t", compte("\t")], [",", compte(",")], ["|", compte("|")]];
  candidats.sort((a, b) => b[1] - a[1]);
  return candidats[0][1] > 0 ? candidats[0][0] : ";";
}

/* découpe une ligne en champs, guillemets doubles respectés */
function champs(ligne: string, sep: string): string[] {
  const out: string[] = [];
  let cur = "";
  let dansGuillemets = false;
  for (let i = 0; i < ligne.length; i++) {
    const c = ligne[i];
    if (c === '"') {
      if (dansGuillemets && ligne[i + 1] === '"') {
        cur += '"';
        i++;
      } else dansGuillemets = !dansGuillemets;
    } else if (c === sep && !dansGuillemets) {
      out.push(cur);
      cur = "";
    } else cur += c;
  }
  out.push(cur);
  return out.map((x) => x.trim());
}

export type Lecture = {
  lignes: LigneDepot[];
  /* colonnes reconnues : en-tête d'origine → clé de la porte */
  reconnues: { entete: string; cle: string }[];
  /* colonnes de l'export que la porte ne connaît pas (ignorées) */
  ignorees: string[];
  /* « code » et « nom » manquent dans l'en-tête : le dépôt n'a pas de sens */
  manque: string[];
};

/* lit un tableau collé ou chargé avec une table de synonymes : la première
   ligne porte les en-têtes ; les clés de `obligatoires` doivent y être */
export function lireTableau(texte: string, synonymes: Record<string, string[]>, obligatoires: string[]): Lecture {
  const brut = texte.replace(/\r\n?/g, "\n").split("\n").filter((l) => l.trim() !== "");
  if (!brut.length) return { lignes: [], reconnues: [], ignorees: [], manque: obligatoires };
  const sep = separateur(brut[0]);
  const entetes = champs(brut[0], sep);
  const cles = entetes.map((e) => cleDe(e, synonymes));
  const reconnues: { entete: string; cle: string }[] = [];
  const ignorees: string[] = [];
  const vues = new Set<string>();
  cles.forEach((k, i) => {
    if (k && !vues.has(k)) {
      vues.add(k);
      reconnues.push({ entete: entetes[i], cle: k });
    } else ignorees.push(entetes[i]);
  });
  const manque = obligatoires.filter((k) => !vues.has(k));
  const lignes: LigneDepot[] = [];
  for (const l of brut.slice(1)) {
    const v = champs(l, sep);
    const o: LigneDepot = {};
    const pris = new Set<string>();
    cles.forEach((k, i) => {
      if (!k || pris.has(k)) return;
      pris.add(k);
      const val = (v[i] ?? "").trim();
      if (val !== "") o[k] = val;
    });
    if (Object.keys(o).length) lignes.push(o);
  }
  return { lignes, reconnues, ignorees, manque };
}

export function lireExport(texte: string): Lecture {
  return lireTableau(texte, SYNONYMES, ["code", "nom"]);
}

/* le gabarit à coller, pour qui part d'un tableur vide */
export const GABARIT = "code;nom;siren;tva;iban;adresse;code_postal;ville;pays;telephone;email\nF0123;TRANSPORTS CARAIBES SARL;849300124;;FR7630006000011234567890189;ZI de Jarry;97122;Baie-Mahault;FR;0590 26 12 34;compta@transports-caraibes.gp";
