# Contre-recette des lots de la nuit du 26 au 27/10 (CASHD et OFFLOAD)

> Testeur indépendant (session « testeur modules »), le 27/10/2026 vers 07 h 00–07 h 45 Z, sur la recette
> `ygwbgpowzlbdaajlsqkn`.
>
> **Les deux lots** :
> - `cashd-lacunes` (8ca420c6) : c2_47 à c2_52, soit G4, G13, P12, C17, G19 et E1 ;
> - `offload-lacunes` (d3bdc875) : c4_41 à c4_44, soit les lignes 55, 58, N9 et 39.
>
> **Méthode** :
> - Les gestes passent par les portes et sous les rôles du banc : gérant, valideur, gérant d'un autre client, et anon pour le
>   raccord des commandes.
> - Tout se joue dans des transactions annulées (`do $$ … raise exception $$`). **Rien n'est resté en base.**
> - Je n'ai lu les tests que pour connaître l'interface des portes (noms, arguments), jamais pour leurs conclusions.
>
> **Écrans** : les deux branches ont été fusionnées dans une branche locale jetable (`tnuit-jetable`, supprimée, jamais
> poussée), puis servies par **un** serveur `next dev --webpack`. Le serveur est coupé, et le contournement de casse Varelo,
> appliqué à la copie jetable seulement, a disparu avec elle.

## Synthèse (dix lignes)

1. **TNUIT-01, important (CASHD, C38).** Le plafond d'encours se contourne en découpant une commande : quatre commandes de 300 € passent toutes pour un plafond de 1 000 € et 585 € d'encours. Le test c2_50 ne couvre pas ce cas.
2. **TNUIT-02, important (OFFLOAD, 58).** L'effacement proposé par la sortie d'OFFLOAD efface **toute l'organisation**, données CASHD comprises (1 compte → 0). L'écran ne le dit pas.
3. **TNUIT-03, important (OFFLOAD, 58).** Après la sortie, il reste une tâche d'appel « à faire » et deux affaires « à décider » ou « relancée 1 », et une saisie de compte est encore acceptée.
4. **TNUIT-04, mineur (OFFLOAD, N9).** La relance des prospects est allumée par défaut (`prospects_actifs` vaut `true` à la création).
5. **TNUIT-05 à 08, mineurs (CASHD).**
   - TNUIT-05 : `es-ES` refusé par un message de contrainte brut, et `pt` ou `de` reçoivent l'anglais en étant marqués `pt` ou `de`.
   - TNUIT-06 : le texte espagnol garde en français les moyens de règlement et la signature, sans avertissement.
   - TNUIT-07 : téléphone « abc » accepté, puis refus trompeur.
   - TNUIT-08 : rejeu d'une référence avec un autre montant, sans le signaler.
6. **Justes, CASHD.**
   - Raccord des commandes : clés en empreinte, clé fausse ou révoquée, croisements entre clients, montants nuls ou négatifs, rôles.
   - E1, portefeuille : il couvre aussi les commandes.
   - Espagnol : montants et dates au format espagnol.
   - Droits WhatsApp et canal : email ou whatsapp seulement.
7. **Justes, OFFLOAD.**
   - Vocabulaire des sept secteurs, secteur inconnu refusé, valideur refusé.
   - Prospects : notes jamais citées, exclusion respectée, appel sans accord commercial, un passage ne rouvre rien.
   - Point du matin : 3 validations plus « Et 4 autres », rien d'un autre client.
   - Sortie : droits, motif obligatoire, demandes et envois annulés.
8. **Non prouvable sur ce banc.**
   - G13, WhatsApp de bout en bout : l'envoi n'est pas réglé et l'approbation Meta est un geste de l'équipe.
   - c2_47, envoi réadossé.
   - G4, dépôt en brouillon : aucune boîte branchée.
   - P12 : aucun contre-exemple trouvé, mais aucun texte réellement « parti » sur le banc.
9. **Écrans.**
   - `/espace2/cashd/risque` (raccord) et `/espace2/offload/garde-fous` (organisation) : sans erreur de console, sans débordement à 390 et 1 440 px.
   - Les réglages CASHD de la base réelle (boîte, WhatsApp, canal) ne s'affichent pas en données d'exemple, et je n'avais pas d'identifiants de compte vitrine.
10. Aucune écriture ne reste sur la recette. Aucun secret n'a été lu. `main` n'est pas touché.

## Écarts

**TNUIT-01 · CASHD (cashd-lacunes, c2_50, G19 / C38) · important · le plafond se contourne en découpant la commande**

- **La promesse** (C38, `capacites/relances.ts:94`) : « Une commande au-delà du plafond est bloquée jusqu'à la décision d'un
  responsable. » L'écran ajoute : « Au-delà, elle est bloquée. »
- **Reproduction**, transaction annulée :
  1. En gérant `…01c2` : `cashd_creer_cle_commandes(client c2, 'T-NUIT logiciel')`, puis
     `cashd_fixer_plafond(A-C26, 1000, …)`. L'encours d'A-C26 est de 585 €.
  2. En `anon` : `cashd_commande(clé, 'A-C26', 300, 'CUM-1')`, puis CUM-2, CUM-3, CUM-4. Les quatre rendent
     `decision: autorisee, encours: 585.00` : 1 200 € de commandes autorisées, soit un encours final de 1 785 € pour un
     plafond de 1 000 €.
  3. Témoin : une commande unique de 5 000 € → `en_attente` (juste).
- **La cause observée** : l'encours rendu ne compte pas les commandes déjà autorisées et pas encore facturées.
- **Le test** : c2_50 (14/14) ne joue pas ce cas. Le passage de C38 en B repose donc sur un test qui ne prouve pas la promesse.
- **Attendu** : ajouter à l'encours les commandes autorisées non facturées (ou celles des N derniers jours), et le dire dans
  la réponse.

**TNUIT-02 · OFFLOAD (offload-lacunes, c4_42, ligne 58) · important · arrêter OFFLOAD propose un effacement qui emporte toute l'organisation**

- **La promesse** (R:441) : « si vous arrêtez, tout vous est restitué puis effacé ». Elle est écrite pour OFFLOAD.
- **Reproduction**, transaction annulée, banc OFFLOAD `…00c4` :
  1. En gérant : `offload_sortie(c4, 'T-NUIT fin de contrat')`. La réponse renvoie à `effacement.porte =
     public.effacer_donnees_client`, confirmation « banc-test-offload ».
  2. `private.effacer_client(c4, 'banc-test-offload', …)`. Avant : `cashd_comptes` du client = 1. Après : **0**, et le
     client lui-même est supprimé.
- **Ce que dit chaque support** :
  - la phrase de la porte : « toutes les données OFFLOAD sont effacées **avec le reste** » ;
  - l'écran (`Organisation.tsx`) : « L'effacement se fait ensuite par notre équipe, sur confirmation du nom exact de votre
    organisation ». Il ne prévient pas que CASHD, FILED, REPUT et les métiers partent aussi.
- **Attendu** : un effacement limité aux tables OFFLOAD quand seul OFFLOAD s'arrête, ou à défaut un avertissement explicite
  à l'écran et dans la restitution.

**TNUIT-03 · OFFLOAD (c4_42, ligne 58) · important · après la sortie, il reste des choses en suspens, et la saisie continue**

- **La promesse** du lot : « arrêt, rien en suspens ». L'écran dit : « plus aucune vague, plus aucun message ; ce qui attendait
  une validation est annulé ».
- **Reproduction**, transaction annulée : en gérant, `offload_sortie(c4, …)`. Avant : 7 demandes en attente, 7 tâches d'appel à
  faire, affaires `decision` = 1 et `relancee_1` = 1. Après :
  - **juste** : 0 demande en attente, 0 envoi à valider, reprises closes, 6 tâches sur 7 abandonnées ;
  - **reste** la tâche `2bd2c73c…` « Proposer le renouvellement du contrat CT-O10B — Gîte Fictif Reconduction SARL »,
    `a_faire`. Elle vient des échéances et n'est liée à aucune reprise ;
  - **restent** les affaires CMD-O4-01 `decision` et CMD-O8-01 `relancee_1`, avec leurs envois `annule` : l'écran les
    montrera encore « à décider » ;
  - `offload_saisir_compte(c4, …, 'T-APRES', …)` est **accepté** après l'arrêt. La vague, elle, est bien bloquée :
    `offload_cycle` → `{"bloque": "suspendu"}`.
- **Attendu** : clore les tâches d'échéance et les affaires à la sortie, et refuser la saisie, ou la signaler comme reçue
  après l'arrêt.

**TNUIT-04 · OFFLOAD (c4_44, N9) · mineur · la relance des prospects est allumée par défaut**

- **Preuve** : `information_schema.columns` → `offload_reglages.prospects_actifs` a le défaut **`true`**. L'écran du banc affiche
  « Allumée : OFFLOAD reprend vos prospects chaque matin de vague ».
- **Ce qui protège quand même** : les messages sont toujours relus, et sans accord enregistré c'est un appel. Mais l'organisation
  n'a pas choisi de faire travailler ses prospects. Un choix explicite à l'installation est attendu (CHIFFRAGE : « jamais sans
  accord »).

**TNUIT-05 · CASHD (c2_52, C17) · mineur · codes de langue**

- **Reproduction**, transaction annulée, en gérant : `cashd_ecrire_compte(…, {"langue":"es-ES",…})` → `new row for relation
  "cashd_comptes" violates check constraint "cashd_comptes_langue_check"`.
  - C'est un message brut, et `es-ES` est un code courant dans les exports.
  - `ES` en majuscules est accepté et rangé en `es` (juste).
- **Comptes `pt` et `de`** : la relance est en anglais (promesse tenue), mais `cashd_relances.langue` vaut `pt` ou `de`. Tout
  écran ou export qui lit ce champ affichera une langue qui n'est pas celle du texte.

**TNUIT-06 · CASHD (c2_52, C17) · mineur · le texte espagnol mélange deux langues**

- **Reproduction** : compte `es`, facture échue de 1 085,50 €, `private.cashd_preparer_relances(c2, current_date, null)`.
  - Le corps est espagnol et juste (« Estimado/a cliente: … 1.085,50 € IVA incluido, vencida el 17/10/2026 (10 días de
    retraso) … Pagar en línea … »).
  - Mais il contient « Formas de pago: **Virement IBAN … ou chèque à l'ordre de** banc-test-cashd » et la signature
    « Service comptabilité ».
- **Attendu** : signaler à l'organisation que ses moyens de règlement et sa signature n'existent qu'en français, ou les
  laisser traduire.

**TNUIT-07 · CASHD (c2_51, G13) · mineur · un téléphone « abc » est accepté, puis le refus est trompeur**

- **Reproduction** : `cashd_ecrire_compte(…, {"contact_facturation_telephone":"abc",…})` est accepté.
  `cashd_canal_compte(compte, 'whatsapp')` répond alors « Pour relancer par WhatsApp, renseignez d'abord le numéro de
  facturation du compte », alors qu'un numéro est renseigné.
- **Attendu** : refuser « abc » à la saisie, ou dire « numéro invalide ».

**TNUIT-08 · CASHD (c2_50, G19) · mineur · le rejeu d'une référence avec un autre montant est muet**

- **Reproduction** : `cashd_commande(clé, 'A-C26', 5000, 'REJ-1')` → `en_attente`. Puis `cashd_commande(clé, 'A-C26', 10,
  'REJ-1')` → la même décision, `montant: 5000`, `deja_verifiee: true`. Rien ne signale que le montant envoyé diffère.
- **Attendu** : rendre l'écart de montant (ou refuser la référence réutilisée), pour qu'un logiciel ne livre pas une commande
  modifiée sur la foi d'une ancienne décision.

## Ce qui est juste (preuves courtes)

| Lot | Cas | Résultat |
|---|---|---|
| CASHD G19 | création de clé : gérant | clé affichée une fois (« Copiez cette clé maintenant… »), préfixe `cashd_cmd_…` ; table `cashd_cles_commandes` = `empreinte` + `prefixe`, aucune clé en clair |
| CASHD G19 | création de clé : valideur, gérant d'un autre client | refusé : « Seuls le gérant, un administrateur ou un membre chargé du recouvrement règlent CASHD. » |
| CASHD G19 | anon : clé fausse | « Clé de raccord absente ou mal formée. » (même réponse pour `cashd_commande_etat`) |
| CASHD G19 | montant 0 ou −5 | « Le montant de la commande doit être supérieur à 0 €. » |
| CASHD G19 | compte inconnu | « Compte client inconnu de CASHD : A-INCONNU. » |
| CASHD G19 | croisements | clé c3 + commande c2 → « Commande inconnue pour cette clé. » ; clé c3 + compte c2, clé c2 + compte c3 → « Compte client inconnu » |
| CASHD G19 | révocation | `cashd_commande` et `cashd_commande_etat` → « Clé de raccord inconnue ou révoquée. » |
| CASHD E1 | portefeuille sur les tables neuves | `cashd_commandes` lit à travers `cashd_comptes` (politique restrictive du portefeuille) ; `cashd_cles_commandes` n'a aucune politique (porte seule) |
| CASHD G13 | réglages | valideur et autre client refusés ; canal `sms` → « Canal des relances : email ou whatsapp. » ; modèle sans `{{message}}` refusé ; tant que le modèle n'est pas validé : « ses relances partent par courriel » ; `valider_gabarit` fermé aux rôles clients |
| CASHD C17 | espagnol | `es` et `ES` → texte espagnol, montants `1.085,50 €`, dates `17/10/2026`, lien au bon montant |
| OFFLOAD 55 | vocabulaire | `negoce` « besoins d'approvisionne(ment) », `apres_vente` « dernier passage à l'atelier », `maintenance` « dernière intervention », `batiment` « dernier chantier », `conseil` « dernière mission », `immobilier` « dernier dossier ensemble », `general` « dernière commande » ; `boulangerie` → refus avec la liste ; valideur refusé |
| OFFLOAD N9 | prospects | PR1 (accord « tout ») → message `essai` à valider, « Nous avions échangé le 10 juin 2026, lors de votre visite… », **sans la note** ; PR2 (accord transactionnel) → appel, `CONSENTEMENT_ABSENT` ; PR3 exclu → rien ; PR4 (échange il y a 2 jours) → rien ; PR5 (aucun échange) → rien ; second passage → 0 ouvert |
| OFFLOAD c4_41 | point du matin | `offload_point_validations(c4, 3)` → 3 messages avec lien `/espace2/validations?demande=…`, nature, destinataire, objet, début du texte, puis « Et 4 autres messages à valider » ; aucun élément d'un autre client |
| OFFLOAD 58 | sortie | valideur, autre client → refusés ; motif blanc → « Une sortie dit pourquoi. » ; restitution JSON + tableur + `empreinte_sha256` ; seconde sortie sans erreur ; vague bloquée (`suspendu`) |
| Écrans | `/espace2/cashd/risque`, `/espace2/offload/garde-fous` | 0 erreur de console, 0 débordement à 390 et 1 440 px ; mention « Données d'exemple : les clés créées ici ne servent à rien » et « rien ne s'arrête ici » |

## Non vérifié, et pourquoi

- **G13, WhatsApp de bout en bout.**
  - Le banc CASHD n'a pas d'envoi réglé : la relance reste `non_reglee`, par courriel.
  - L'approbation du modèle par Meta passe par `valider_gabarit`, que seuls le serveur et l'équipe peuvent exécuter. c2_51 la
    simule par un UPDATE.
  - La mise en demeure jamais envoyée par WhatsApp n'a donc pas pu être rejouée ici.
- **c2_47, envoi réadossé, et G4, dépôt en brouillon** : il faudrait un envoi réglé et une boîte Gmail branchée au banc.
- **P12.** Aucun texte « parti » sur le banc. Une revue de montant donne toujours un texte différent : aucun contre-exemple
  trouvé, sans preuve positive.
- **Écrans en base réelle** (boîte d'envoi, modèle WhatsApp, canal par compte dans la fiche). Ils ne s'affichent qu'avec une
  session, et je n'avais pas les identifiants du compte vitrine. Hypothèse : ces sections sont masquées en données d'exemple,
  par construction.

---

## Rejeu (27/10, après c2_53 à c2_55 et c4_45)

> **Branches** : `cashd-lacunes` (d4beed8c), `offload-lacunes` (cdcbb4dd).
>
> **Méthode** : la preuve d'origine de chaque écart, puis une seule variante proche, chacune dans une transaction annulée.
>
> **Écran de sortie d'OFFLOAD** : un seul serveur `next dev --webpack`, sur une copie jetable de `offload-lacunes` (supprimée,
> jamais poussée). Le serveur est coupé.

| TNUIT | Preuve d'origine rejouée | Variante | Verdict |
|---|---|---|---|
| 01 | plafond 1 000 €, encours 585 €, quatre commandes de 300 € : CUM-1 `autorisee`, puis CUM-2 à 4 **`en_attente`**, réponse `engage: 300.00` | commande FAC-1 de 300 € autorisée, puis **facturée** (facture FAC-1, 300 €) ; une commande de 100 € → `en_attente`, `encours: 885`, `engage: 300` : la commande facturée est comptée deux fois (885 + 300 + 100 = 1 285 au lieu de 985). Aucun champ ne relie une facture à sa commande (`reference_commande` → « Champ de facture inconnu ») | **en partie** : le contournement est fermé, mais il apparaît un double comptage (blocage à tort) jusqu'à ce que l'engagé s'éteigne. Voir TNUIT-09 |
| 02 | `offload_sortie`, puis `offload_effacer_module(c4, 'banc-test-offload')` → 0 ligne OFFLOAD restante, `cashd_comptes` du client = **1** (inchangé), client présent. Phrase : « Il n'efface qu'OFFLOAD : vos autres modules continuent. » | effacement **sans sortie préalable** → « Arrêtez d'abord OFFLOAD et enregistrez vos fichiers (sortie) : la restitution précède l'effacement. » ; mauvais nom → refusé ; valideur → refusé | **fermé** (coquille : « le droit de effacer ») |
| 03 | après la sortie : 0 tâche `a_faire`, affaires `close_sans_suite` = 2 ; saisie de compte → « OFFLOAD est arrêté pour cette organisation depuis le 27/10/2026 (sortie) : plus aucune saisie n'est reçue. » | saisie d'un **achat** après la sortie → même refus | **fermé** |
| 04 | `offload_reglages.prospects_actifs` : défaut `false` ; banc c4 : `false` | installation neuve (`offload_installer` sur une organisation fictive) → `false` ; l'écran dit « Éteinte (par défaut) : vos prospects restent présentés à part, sans message » | **fermé** |
| 05 | `es-ES` → accepté, rangé en `es` ; compte `pt` → texte anglais, `langue_texte = en` (nouvelle colonne), `langue = pt` (celle du compte) | `pt-BR` → accepté, rangé en `pt`, texte anglais | **fermé** |
| 06 | compte `es` : corps espagnol, signature « banc-test-cashd » (plus de « Service comptabilité ») ; mais « Formas de pago: **Virement IBAN … ou chèque à l'ordre de** banc-test-cashd » reste en français, car `cashd_reglages.traductions = {}` sur le banc | compte `pt` (texte anglais) : « Payment methods: Virement IBAN … ou chèque à l'ordre de … », même mélange ; aucun mot du motif ne prévient l'organisation | **en partie** : l'organisation peut traduire (`traductions`, c2_55), mais rien ne lui dit que ses moyens de règlement partent en français dans un texte étranger |
| 07 | téléphone « abc » → « Numéro de facturation invalide : « abc ». Un numéro compte au moins 9 chiffres, par exemple +590 690 12 34 56. » | « 06 90 12 » → même refus | **fermé** |
| 08 | REJ-1 vérifiée à 5 000 €, revient à 10 € → « La commande REJ-1 a déjà été vérifiée pour 5 000,00 € ; elle revient pour 10,00 € : une commande modifiée se vérifie sous une nouvelle référence (par exemple REJ-1-2). » | REJ-1 revient au même montant → même décision, `deja_verifiee: true` (idempotent) | **fermé** |

**TNUIT-09 · CASHD (c2_54) · mineur · une commande autorisée puis facturée est comptée deux fois dans le cumul**

- **Reproduction**, transaction annulée :
  1. Plafond 1 000 € sur A-C26 (encours 585 €).
  2. En `anon` : `cashd_commande(clé, 'A-C26', 300, 'FAC-1')` → `autorisee`.
  3. En gérant : `cashd_ecrire_facture(…, {compte A-C26, numero 'FAC-1', montant_ttc 300, …})`.
  4. En `anon` : `cashd_commande(clé, 'A-C26', 100, 'FAC-2')` → `en_attente`, `encours 885`, `engage 300`.
- **L'écart** : l'exposition réelle est de 985 €, sous le plafond. La commande est bloquée à tort, et un responsable doit la
  débloquer à la main.
- **Attendu** : éteindre l'engagé d'une commande quand sa facture arrive (par la référence, ou par une durée de vie annoncée
  dans `API-COMMANDES.md`).

**Écran de sortie d'OFFLOAD** (`/espace2/offload/garde-fous`, section « Arrêter OFFLOAD et récupérer vos données »)

- **Texte** : « OFFLOAD s'arrête : plus aucune vague, plus aucun message, plus aucune saisie ; ce qui attendait une
  validation, les tâches et les affaires en cours sont fermés, avec une trace. Toutes vos données OFFLOAD vous sont
  restituées en fichiers pour un tableur, avec l'empreinte de l'export. Ensuite seulement, vous effacez OFFLOAD en
  confirmant le nom de votre organisation : vos autres modules continuent, intacts. » C'est conforme à ce que fait la base.
- **Formulaire** : motif (« Fin de contrat au 31 octobre. »), case « J'ai compris : OFFLOAD s'arrête dès maintenant et plus
  aucun message ne part. », bouton « Arrêter OFFLOAD et préparer mes données ». En données d'exemple, les trois sont
  désactivés (« rien ne s'arrête ici »).
- **Vérifié** : à 375 px (planche mobile) et 1 440 px (planche bureau), aucun débordement horizontal. Seules erreurs de
  console : celles du rechargement à chaud du serveur de dev (WebSocket `/_next/hmr`), rien de la page.
- **Hors lot, observé à 375 px** : dans l'en-tête de l'espace, le badge « Données d'exemple » est recouvert par les boutons
  « + » et « Rechercher » (« Donn… ple »).
- **Non vu** : le parcours réel. Les boutons actifs, la restitution, puis l'étape d'effacement demandent une session, et je
  n'ai pas d'identifiants de compte vitrine.

**Résumé du rejeu (six lignes)**

1. **Fermés** : TNUIT-02, 03, 04, 05, 07 et 08. Les preuves d'origine et leurs variantes donnent le comportement attendu.
2. **TNUIT-01, en partie** : découper une commande ne contourne plus le plafond. Mais une commande autorisée puis facturée compte deux fois (TNUIT-09, mineur), ce qui bloque à tort.
3. **TNUIT-06, en partie** : l'organisation peut traduire ses textes. Sans traduction, « Virement IBAN … ou chèque à l'ordre de » part en français dans un texte espagnol ou anglais, sans avertissement.
4. **Écran de sortie** : texte conforme à la base, sans débordement à 375 et 1 440 px. Le parcours réel n'a pas été vu (pas de compte vitrine).
5. **Hors lot** : en-tête mobile de l'espace, où « Données d'exemple » est recouvert.
6. Tout s'est fait dans des transactions annulées. Rien n'est resté en base, le serveur est coupé, rien n'est fusionné sur `main`.
