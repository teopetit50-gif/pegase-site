# FILED — l'écran de la facture électronique, du cycle de vie et du FEC (pour A3)

Rédigé par A4 le 06/10/2026, d'après a4_15 à a4_18, posés sur la recette (`00eeeeb`, tests `^test_a4_` 19/19).
Toutes les signatures ci-dessous sont celles de la base. Une erreur de porte remonte telle quelle : le message SQL est
écrit pour être montré (français, phrase complète). Les codes servent à choisir le ton : `42501` refus de droit,
`22023` saisie à corriger, `55000` action impossible dans l'état, `P0002` introuvable.

Lecture : par `select` sous RLS sur les tables citées (les membres de l'organisation les lisent), ou par la fonction
nommée. Écriture : uniquement par les portes `public.filed_*`, jamais d'`update` ou d'`insert`.

---

## 1. La provenance d'une facture : « Facture électronique »

**Donnée** : `filed_factures.provenance` ∈ `structuree` | `lue` | `saisie`. Nulle pour les factures intégrées avant le
lot 9 : dans ce cas, `structuree` si la pièce porte une valeur `pieces_valeurs.source = 'xml'` sur `numero` ou
`montant_ttc` (le dossier les charge déjà), sinon `lue`.

**Reçue par la plateforme agréée** : il existe une ligne `filed_pa_flux` avec `document_id` = le document,
`sens = 'entrant'`, `etat = 'depose'`.

| Cas | Pastille | Texte d'aide (survol) |
|---|---|---|
| structurée + reçue par la plateforme | **Facture électronique** | « Reçue par la plateforme agréée. Ses données viennent du fichier structuré et font foi. » |
| structurée, hors plateforme | **Fichier structuré** | « Factur-X, UBL ou CII reçu par un autre canal : ses données viennent du fichier et font foi. » |
| lue | **Lue sur la pièce** | « Lue sur le PDF ou l'image ; chaque valeur est vérifiée sur la page citée. » |
| saisie | **Saisie** | « Saisie à la main, sans pièce lue. » |

**Valeurs** : à côté d'une valeur `pieces_valeurs.source = 'xml'`, la mention **« du fichier »** à la place de la
citation de page (une valeur xml n'a ni `page` ni `boite`).

## 2. La facture structurée fait foi : pas de correction contraire

Sur une pièce structurée, une valeur `humain` qui contredit la valeur `xml` du même champ est refusée par la base
(`22023`, message : « Facture électronique : la valeur de <champ> vient du fichier structuré et fait foi. Refusez la
facture ou ouvrez un litige avec le fournisseur ; elle ne se corrige pas. »).

À l'écran :
- le bouton « Corriger » est **désactivé** sur un champ qui a une valeur `xml` ; survol : « Valeur du fichier
  structuré : elle fait foi. Pour la contester, refusez la facture ou ouvrez un litige. » ;
- « Confirmer » reste possible (même valeur : la base l'accepte) ;
- un champ **absent** du XML se complète normalement ;
- deux actions proposées à la place : **« Ouvrir un litige »** (§ 4) et **« Refuser »** (la file de validation).

## 3. La frise du cycle de vie

**Porte** : `public.filed_cycle_vie_facture(p_facture uuid)` → lignes `code smallint, libelle text, survenu_le
timestamptz, motif_code text, motif_libelle text, motif text, montant numeric, etat text, emis_le timestamptz`, dans
l'ordre. Pour savoir si un statut est **reçu** du fournisseur, lire aussi `filed_cycle_vie.sens` (`emis` | `recu`) par
`select … from filed_cycle_vie where facture_id = … order by survenu_le, id`.

Référentiel (lecture) : `filed_cycle_vie_statuts (code, libelle, emetteur, obligatoire, transmis_administration,
motif_requis)`, `filed_cycle_vie_motifs (code, libelle, statuts)`.

| Ce que FILED dépose | Quand |
|---|---|
| 204 Prise en charge | la facture est intégrée |
| 205 Approuvée | elle est validée (une fois par version) |
| 210 Refusée | elle est refusée (motif : premier contrôle bloquant, sinon AUTRE) ou écartée en doublon (DOUBLON) |
| 207 En litige | un litige est ouvert |
| 211 Paiement transmis | un paiement est noté (avec son montant) |
| statut reçu (`sens = recu`) | la plateforme nous transmet un statut du fournisseur (ex. 212 Encaissée) |

Textes par état (sous le libellé du statut, avec `survenu_le` au format « 06/10/2026 à 14 h 32 ») :

| `sens` / `etat` | Texte |
|---|---|
| emis / `a_emettre` | « À transmettre au fournisseur » |
| emis / `en_cours` | « Transmission en cours » |
| emis / `emis` | « Transmis au fournisseur le <emis_le> » |
| emis / `echec` | « Non transmis : <erreur> » (rouge ; `erreur` dans `filed_cycle_vie`) |
| emis / `sans_objet` | « Noté (facture reçue hors plateforme : rien à transmettre) » (gris) |
| recu | « Reçu du fournisseur » |

Motif (206, 207, 208, 210) : « Motif : <motif_libelle> » puis le texte libre s'il y en a. Montant (211, 212) :
« <montant> € ». Pastille **« obligatoire »** à côté des statuts où `obligatoire` est vrai (200, 210, 212, 213).

## 4. Ouvrir un litige avec un motif normalisé

**Porte** (a4_06) : `public.filed_ouvrir_litige(p_facture uuid, p_motif text) → uuid` ; gérant, admin, valideur,
collaborateur ; refus `22023` « Un litige dit pourquoi. », `55000` « Un litige est déjà ouvert sur cette facture. ».
Clôture : `public.filed_clore_litige(p_litige uuid, p_issue text)`.

Le motif normalisé du statut 207 est lu **en tête** du texte : envoyer `p_motif = '<CODE> : <texte>'`, avec `<CODE>`
choisi dans `select code, libelle from filed_cycle_vie_motifs where 207 = any (statuts) order by libelle`. Sans code,
le statut part avec AUTRE. Libellé du champ : « Motif du litige » ; liste : les libellés ; texte libre :
« Précisez pour le fournisseur ».

## 5. Le paiement (rappel, a4_15)

- `public.filed_noter_paiement(p_facture uuid, p_date date, p_montant numeric, p_moyen text, p_reference text) → uuid` ;
  gérant, admin, valideur (pas le collaborateur) ; montant vide = le reste ; moyen ∈ `virement`, `prelevement`,
  `cheque`, `carte`, `especes`, `compensation`, `autre`.
- `public.filed_etat_paiement(p_facture uuid)` → `facture_id, du, regle, reste, etat (a_payer | partielle | payee),
  dernier_le, nb_reglements`. Textes : « À payer », « Payée en partie (reste <reste> €) », « Payée le <dernier_le> ».
- Une facture reçue par la plateforme envoie alors « Paiement transmis » (211) : rien à faire de plus.

## 6. Les écritures d'une facture

**Lecture** : `select journal_code, journal_lib, ecriture_num, ecriture_date, compte_num, compte_lib, comp_aux_num,
debit, credit, ecriture_let, date_let from filed_ecritures where facture_id = … order by ecriture_num, id`.

Écrites par FILED à la comptabilisation (`public.filed_comptabiliser_facture(p_facture, p_motif)`, gérant, admin,
valideur) puis à chaque paiement. Onglet « Écritures » de la facture : un tableau Journal · N° · Date · Compte ·
Libellé · Débit · Crédit · Lettrage. Texte vide : « Pas encore d'écriture : la facture s'écrit en comptabilité quand
elle est transmise à la comptabilité. »

Erreur de comptabilisation à montrer telle quelle (`55000`) : « Les imputations validées (…) ne couvrent pas le hors
taxes de la facture (…). » → proposer « Compléter l'imputation ».

## 7. L'export FEC

**Porte** : `public.filed_exporter_fec(p_client uuid, p_entite uuid, p_exercice uuid default null, p_du date default
null, p_au date default null) → jsonb` ; gérant, admin, valideur (bouton masqué pour le collaborateur). Soit un
exercice (`filed_exercices`), soit une période (par défaut : l'année civile en cours).

Retour : `{nom_fichier, encodage: "UTF-8", separateur: "tabulation", contenu, lignes, ecritures, total_debit,
total_credit, equilibre, ecritures_desequilibrees, du, au, empreinte}`. Télécharger `contenu` sous `nom_fichier`
(`<SIREN>FEC<AAAAMMJJ>.txt`), en `text/plain;charset=utf-8`, sans rien y changer (les fins de ligne sont CRLF).

Erreurs : `55000` « La société n'a pas de SIREN : le fichier des écritures comptables est nommé d'après lui. » →
lien vers la fiche de la société ; `22023` « Exercice introuvable. ».

Textes de l'écran (Pilotage → Exports, ou Comptabilité) :
- titre : **« Fichier des écritures comptables (FEC) — achats »** ;
- sous-titre, **obligatoire** : « Ce fichier contient les écritures d'achats tenues par FILED (journaux Achats,
  Banque, Caisse). Il ne remplace pas le FEC complet de votre comptabilité : transmettez-le à votre expert-comptable,
  qui l'intègre au sien. » ;
- après l'export : « <lignes> lignes, <ecritures> écritures, débit <total_debit> € = crédit <total_credit> € » ;
  si `equilibre` est faux : « Attention : <ecritures_desequilibrees> écriture(s) déséquilibrée(s). Ne transmettez pas ce
  fichier ; signalez-le. » ;
- l'export est inscrit au journal (avec son empreinte) : « Export enregistré au journal le … ».

## 8. Les comptes de FILED (réglages)

Lecture : `filed_comptes_systeme (client_id, role, numero, libelle)` ; un rôle absent prend la valeur par défaut.
Porte : `public.filed_regler_compte_systeme(p_client uuid, p_role text, p_numero text, p_libelle text)`, gérant ou
admin ; `22023` « Numéro de compte : de 3 à 12 chiffres. ».

| `role` | Libellé à l'écran | Par défaut |
|---|---|---|
| `fournisseurs` | Compte fournisseurs | 401 Fournisseurs |
| `tva_deductible_abs` | TVA déductible sur biens et services | 44566 |
| `tva_deductible_immo` | TVA déductible sur immobilisations | 44562 |
| `banque` | Banque | 512 |
| `caisse` | Caisse | 530 |

## 9. Ce que l'écran ne fait pas

- Pas d'appel aux portes `pa_*` : elles sont réservées à l'ouvrier `echange-pa` (service_role).
- Pas de modification d'une écriture : la base la refuse (`42501`, « Une écriture comptable ne se modifie pas : on
  passe une écriture de correction. »).
- Les flux orphelins de la plateforme (client introuvable) ne sont visibles d'aucun client ; ils relèvent de
  l'administration d'Omega.
