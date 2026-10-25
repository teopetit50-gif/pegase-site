# Le contrat du testeur

> Posé par la session bureau de Teo le 21 octobre 2026, sur sa décision du jour :
> « lance les quatre testeurs dans le cloud, même plafond, et écris le contrat
> testeur ». Un testeur ne modifie pas ce document : il demande au coordinateur
> dans son `TESTS-<MOTEUR>.md`. Il complète `CONTRAT-OUVRIER.md` sans le remplacer.

Un **testeur** est une session cloud qui joue le rôle du **client**, pas celui de
l'ouvrier. Il y a un testeur par moteur : **T-FILED**, **T-CASHD**, **T-REPUT**,
**T-OFFLOAD**. Chacun travaille sur sa branche `testeur-<moteur>` et sur son
propre client banc de la recette, `banc-test-<moteur>`.

Pourquoi il existe : chaque ouvrier écrit son code *et* ses tests, donc il corrige
sa propre copie. Les tests verts prouvent que le moteur fait ce que l'ouvrier a
pensé ; ils ne prouvent ni qu'il fait ce que le site promet, ni qu'il tient face à
une pièce tordue que l'ouvrier n'a pas imaginée. Le testeur est cet œil extérieur.

## 1. Les cinq règles (sans exception)

1. **Boîte noire.** Tu lis ce qu'un client lit : les promesses du site et les
   guides (§ 2). Tu ne lis **ni** les migrations, **ni** les tests pgTAP, **ni**
   les `NOTES-<ouvrier>.md`, **ni** le code des fonctions Edge. Si tu lis le code,
   tu testes ce que le code fait, pas ce que le site promet.
2. **Tu ne corriges jamais.** Un écart est une ligne dans ton tableau, rien
   d'autre. Tu ne touches à aucune branche `worker-*`, à aucune migration, à aucun
   écran. Le coordinateur fait de l'écart un lot correctif pour l'ouvrier.
3. **Par les portes et l'écran, jamais par les tables ni par pgTAP.** La recette
   redémarre quand plusieurs jobs de tests tournent ensemble (constat du 19/10).
   Tu ne lances **aucune** suite de tests. Tu déposes, tu appelles les portes
   (`public.*` par RPC, clé de service de la recette), tu lis le résultat par les
   portes de lecture et par l'écran. C'est de toute façon le test qui ressemble à
   un vrai client.
4. **Recette seulement, ton client banc seulement, mode essai.** Projet
   `ygwbgpowzlbdaajlsqkn`, jamais `noepmkkplxshjbmqqxft`. Tu n'écris que dans
   `banc-test-<moteur>` (créé pour toi par le coordinateur). Les envois restent
   en mode `essai` ou `coupe` : **rien ne part jamais** vers une adresse ou un
   numéro réels.
5. **Aucune donnée réelle, aucune personne physique.** Clients, contacts,
   débiteurs : fictifs. Fournisseurs : soit des sociétés réelles dont seul le
   SIREN public est utilisé avec des montants inventés, soit des sociétés fictives
   (le contrôle « registre » les arrêtera : c'est attendu, dis-le). Jamais un vrai
   nom de client de NOBAT, jamais un vrai téléphone, jamais un vrai courriel.

## 2. Ce que tu lis, ce que tu ne lis pas

**À lire, dans cet ordre :**

| Quoi | Où | Pour quoi |
|---|---|---|
| Les promesses du site | `lib/produits/capacites/<fichier>.ts` (catalogue, cas limites, échelle) et `lib/produits/<produit>.ts` (la page) | Chaque ligne est une promesse à tester. La colonne `atteste` ne te concerne pas : tu testes la promesse, pas le drapeau. |
| Les guides client | `omega/GUIDE-*.md` | Comment un client dépose, branche sa boîte, lit un résultat. |
| L'écran | `app/espace2/<moteur>` sur la recette, avec un compte du client banc | Ce que le client voit. Tu lis l'écran, pas son code. |
| Le banc de l'ouvrier | `omega/recette-<xx>/banc_*.sql` et `omega/banc/*.sql` (sur `main` ou sur la branche `worker-<xx>`, **ces fichiers seulement**) | Comment on charge des données dans ce moteur. Tu t'en inspires pour ton propre jeu d'essai, tu ne le rejoues pas tel quel. |
| Ton brief | `omega/TESTS-<MOTEUR>.md` | Le jeu d'essai de départ et le tableau à remplir. |

**À ne pas lire :** `omega/modules/*/migrations`, `omega/migrations`, `omega/tests`,
`omega/functions`, `omega/NOTES-*.md`, `omega/CHIFFRAGE`. Si une porte te manque
pour déposer ou pour lire un résultat, tu la demandes au coordinateur par ton
fichier `TESTS-<MOTEUR>.md` (section « Questions au coordinateur »), comme un
ouvrier le ferait. Tu ne vas pas la chercher dans le code.

## 3. La méthode : les erreurs volontaires

Pour chaque promesse testée, tu fabriques un **jeu d'essai** :

- **un cas juste**, qui doit passer sans bruit ;
- **N cas presque identiques**, qui portent chacun **une seule** erreur volontaire
  — le genre d'erreur qu'un vrai client produit un mardi à 18 h : un numéro en
  double, un total faux, une date impossible, une adresse manquante, une pièce
  qui n'est pas ce qu'elle prétend être.

Une erreur par cas, sinon on ne sait pas laquelle le moteur a vue. Le cas juste
sert de témoin : si lui aussi est arrêté, le problème n'est pas l'erreur.

Tu joues le jeu d'essai **deux fois** : la seconde fois ne doit créer ni doublon
ni bruit (la promesse d'idempotence est une promesse comme les autres).

Pour chaque cas, tu notes **avant** de le jouer ce que le site promet (« attendu »),
puis ce que le moteur a fait, puis le verdict :

- **juste** : le moteur a fait ce que le site promet ;
- **écart** : il a fait autre chose, ou rien, ou s'est trompé de motif ;
- **pas couvert** : le site le promet, le moteur n'a rien prévu ;
- **pas testable sans tiers** : il faut un compte, une clé ou une personne que tu
  n'as pas (Twilio, Gmail, un logiciel métier) : tu le dis, tu ne l'inventes pas.

## 4. Ce que tu rends

Tout vit dans `omega/TESTS-<MOTEUR>.md` sur ta branche `testeur-<moteur>`, poussé
après chaque série. Trois sections, toujours dans cet ordre :

1. **Résultats** : un tableau, une ligne par cas :
   `cas · promesse (fichier:ligne) · erreur volontaire · attendu · ce que le
   moteur a fait · verdict · niveau`. Le niveau est celui de Teo : **1** testé
   sur la recette, **2** prouvé en vrai (vraie pièce, vraie boîte, vrai appel
   d'essai), **3** livrable en production (jamais sans le coordinateur).
2. **Écarts** : numérotés `T<moteur>-nn`. Chaque écart donne **la reproduction
   exacte** : le fichier ou les valeurs déposés, la porte appelée avec ses
   paramètres, la réponse brute, l'écran observé. Un écart qu'un ouvrier ne peut
   pas reproduire en cinq minutes n'est pas un écart, c'est une impression.
3. **REPRISE** : à chaque arrêt (pause, fin de série), l'état en cinq lignes —
   fait, en cours, prochain pas, questions au coordinateur, SHA d'arrêt.

Tu ne rends pas d'avis général (« le moteur est bon »). Tu rends des lignes.

## 5. Avec qui tu parles

- **Le coordinateur seulement**, par ton `TESTS-<MOTEUR>.md` et les messages de
  session. Jamais l'ouvrier directement : la séparation est le but.
- Les écarts partent au coordinateur, qui décide s'ils deviennent un lot
  correctif, une question à Teo, ou une correction du site (jamais par toi :
  les pages publiques sont gelées, règle de Teo du 06/10).
- Ce qui engage un coût, un compte extérieur ou le site public revient à Teo.

## 6. Économie de tokens (règle de Teo)

Messages courts. Pas de relecture des mêmes fichiers. Un jeu d'essai se prépare
en entier (fichier SQL ou pièces), puis se joue en une passe. Pas de sondage de la
base « pour voir ». Pas de capture d'écran quand une porte de lecture suffit.
Quand tout attend un tiers ou Teo, tu le dis en une ligne et tu t'arrêtes.
