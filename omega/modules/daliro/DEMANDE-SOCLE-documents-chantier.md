# Demande — les documents de chantier vont à Daliro (B6, 19/10/2026)

Décision de Teo (19/10, 15 h Z) : les documents de chantier vont à Daliro. Côté Daliro, tout est dans
`omega/modules/daliro/migrations/b6_37_documents_chantier.sql`, et le test `omega/tests/daliro/b6_33_documents_chantier.sql`
le vérifie sur doublures. Pour que les vraies pièces y arrivent seules, deux choses manquent hors de B6. Elles sont
écrites ici et ne sont **pas posées** : le coordinateur relit, puis A1 et A4 (ou le socle) les font.

Le constat : les six photos NOBAT du banc (PV de réserves OPR SCI BOKITO bât. A du 25/03/2024, cartouche de plans
SCI JADE / GB Architecture, trois plans de structure cotés, note de dispositions parasismiques) arrivent dans FILED.
Le lecteur les lit avec le schéma FILED (factures), qui ne connaît pas ces types : `type_piece = autre`, statut
`a_classer`, aucun champ. Seul le texte OCR est dans `pieces_pages`.

## 1. Lecteur (A1) : trois types « document de chantier » dans le schéma FILED

Les pièces arrivent par FILED (module `filed`, le schéma par défaut). C'est donc **ce schéma** qui doit savoir les
reconnaître. Ajouter au schéma du module par défaut, sans toucher aux types de facture, trois types de la famille
« document de chantier » :

| `type_piece` | Ce que c'est | Champs | Clés |
|---|---|---|---|
| `chantier_pv_reserves` | PV de réserves : OPR, réception, levée de réserves ; liste des réserves par logement, ouvrage ou lot | `date_pv` (date), `maitre_ouvrage`, `operation` (l'opération ou le bâtiment, tel qu'écrit), `redacteur` (maître d'œuvre, tel qu'écrit), **`reserves`** (liste) | `reserves` |
| `chantier_plan` | un plan ou un cartouche de plan (architecte, structure, réseaux) | `titre`, `numero_plan`, `indice`, `date`, `echelle`, `phase`, `maitre_ouvrage`, `auteur` | `titre` |
| `chantier_note_technique` | une note technique ou de calcul, des dispositions constructives (parasismique, thermique, incendie…) | `titre`, `date`, `auteur`, `maitre_ouvrage`, **`dispositions`** (liste) | `titre` |

Les listes ont **une seule valeur** (tableau jsonb), comme `lignes` du devis Daliro :
- `reserves` : `[{numero, localisation, lot, entreprise, description, echeance, delai, page}]`. `echeance` est
  une date ISO **seulement si elle est écrite** ; `delai` reprend le délai tel qu'écrit (« 15 jours ») ; `page` est
  la page de la réserve. Une réserve sans description n'est pas rendue.
- `dispositions` : `[{texte, reference, page}]`. `reference` est la norme ou l'article cité (« Eurocode 8 »,
  « NF P 06-013 »), s'il est écrit.

Règle, celle du lecteur : ce qui n'est pas écrit n'est pas rendu (pas de date devinée, pas de lot déduit du nom du
fichier). Daliro garde la vérification du lecteur (`verifiee`) sur chaque élément tiré.

## 2. FILED (A4) ou socle : la nature `document_chantier`, routée vers Daliro

Dans le socle de la recette (non extrait dans `omega/SOCLE-EXTRAITS-*.sql`, donc **à écrire par son propriétaire**,
pas par B6, pour ne rien écraser) :
1. `filed_documents_nature_check` : ajouter `document_chantier`.
2. `private.filed_nature_de(type_piece)` : `chantier_pv_reserves`, `chantier_plan` et `chantier_note_technique`
   donnent `document_chantier`. `private.filed_libelle_nature('document_chantier')` donne « document de chantier ».
3. `private.filed_etat_de('document_chantier')` donne `classe` : le document est rangé dans FILED, et FILED n'a
   rien à en faire.
4. Dans `private.filed_integrer_piece`, à la fin, comme pour les factures, et seulement si Daliro est installé chez
   le client :
   ```sql
   elsif v_nature = 'document_chantier' then
     if exists (select 1 from public.btp_reglages r where r.client_id = v_doc.client_id) then
       perform private.deposer_travail(v_doc.client_id, 'daliro', 'daliro.document',
         jsonb_build_object('piece', p_piece), 'document:' || p_piece::text, 0::smallint);
     end if;
     return 'document_chantier';
   ```
   L'ouvrier Daliro (`private.btp_ouvrier`, b6_37) prend `daliro.document` et appelle
   `private.btp_integrer_document(piece)`. Daliro ne change pas `pieces.module` : la pièce reste celle de FILED,
   et Daliro la cite.

## 3. Le rejeu sur les six pièces réelles (coordinateur)

- **Voie A, après les points 1 et 2** : relire les six pièces (`lecteur.lire`, six photos, quelques centimes une
  fois le crédit Anthropic rétabli). FILED les classe en `document_chantier`, et Daliro les reçoit par le travail
  `daliro.document`. Le PV SCI BOKITO se rattache seul s'il n'y a qu'un chantier dont le maître d'ouvrage est
  « SCI BOKITO ». Sinon, et c'est le cas aujourd'hui sur le banc, il attend `btp_rattacher_document`.
- **Voie B, sans rien relire, dès b6_37** : une personne du bureau (gérant, admin, valideur) prend chaque pièce en
  main avec `public.btp_prendre_document(piece, 'pv_reserves' | 'plan' | 'note_technique', chantier)`. Comme le
  lecteur n'a rendu aucun champ, le document est rangé et cité sans titre, et **rien n'est inventé** : aucune
  réserve n'est créée sans liste lue. Cette voie prouve le rangement, pas la lecture.
- Contrôle : `select public.btp_documents_chantier('<chantier>')` (en gérant) : documents, réserves à lever et
  références, chacun avec `piece_id` et `page`.
