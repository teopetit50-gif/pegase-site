# TPROD-05 — pose en production (pour Teo)

Écart du testeur (`omega/TESTEUR/RECETTE-PRODUCTION-2026-10-27.md`, branche `testeur-modules`) :
4 fonctions SECURITY DEFINER exécutables par `anon`, et la protection des mots de passe divulgués
désactivée.

## Arbitrage : les quatre gardent `anon`

| Fonction | Qui l'appelle sans compte | Pourquoi c'est sans risque |
|---|---|---|
| `agenda_public` | `/reserver-un-audit` (`lib/creneaux.ts`), `/api/sante` | créneaux libres d'Omega, rien de personnel |
| `demande_pour_confirmation` | `/api/reservation/confirmation`, clé publishable (le site n'a pas de clé de service) | rend la ligne une fois, dans les 30 min, à qui connaît l'uuid de `reserver_audit` |
| `btp_lire_a_signer` | `/signer/<jeton>` (`SignatureSurPlace.tsx`) | jeton de 64 caractères ; exception anon accordée au lot b6_20 |
| `btp_signer_sur_place` | même page | idem ; refuse nom vide, case non cochée, tracé illisible |

Retirer `anon` casserait la prise de rendez-vous, son e-mail de confirmation et la signature sur
chantier. Le conseil Supabase restera affiché : il est voulu.

`tprod_05_portes_anon.sql` fige seulement les droits : `revoke execute … from public`, puis
`grant execute … to anon, authenticated, service_role` sur les quatre (sans DROP, idempotent).
Sur la recette, seules les deux `btp_*` existent (les deux autres sont des fonctions du site, posées
directement en production en septembre).

## Au réveil, sur `omega-core-eu`

1. **Avant** : jouer `tprod_05_verification.sql` (lecture seule) et garder le résultat.
2. **Essai en transaction annulée** (SQL Editor) :
   ```sql
   begin;
   -- coller ici le bloc do $$ … $$ de tprod_05_portes_anon.sql
   -- coller ici la requête de tprod_05_verification.sql
   rollback;
   ```
   Attendu : 4 lignes, `par_public = false`, `anon`, `authenticated` et `service_role` à `true`,
   `hors_liste = false`.
3. **Pose** : `apply_migration` du connecteur, nom `tprod_05_portes_anon`, avec le contenu du fichier
   (la ligne `schema_migrations` est écrite par l'outil).
4. **Après** : rejouer `tprod_05_verification.sql`, puis ouvrir
   `omegaai.fr/reserver-un-audit` et `omegaai.fr/api/sante` : les créneaux doivent s'afficher
   (pas de réservation d'essai : elle écrirait en production).

## À faire à la main : les mots de passe divulgués

Tableau de bord Supabase → `omega-core-eu` → Authentication → Sign In / Providers (Email) →
« Prevent use of leaked passwords » : activer. Ce réglage n'a pas été touché (la recette non plus).
