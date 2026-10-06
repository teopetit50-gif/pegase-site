-- omega/prod/exporter.sql — étape 1 du dossier MISE-EN-PRODUCTION.md : exporter la séquence de la recette.
-- A5, 06/10/2026. À jouer sur la RECETTE (ygwbgpowzlbdaajlsqkn) seulement. LECTURE SEULE : un seul SELECT, rien n'écrit.
--
-- Rend une ligne par version de supabase_migrations.schema_migrations à considérer, dans l'ordre :
--   version, name,
--   decision   : 'emporter' ou 'exclure: <raison>' (les exclusions du § 1.4 restent visibles, pour relecture),
--   source     : 'depot' (la ligne porte une provenance : le fichier viendra du dépôt, au SHA indiqué)
--                ou 'sql' (posée par execute_sql : son texte vient de statements),
--   provenance : pour 'depot', le texte brut de statements (court) ; omega/prod/assembler.mjs en tire branche, SHA, chemin,
--   sql        : pour 'sql', le texte complet de statements, instructions séparées par une ligne vide ; null pour 'depot',
--   octets     : taille de ce que la ligne rend (pour découper en pages).
--
-- Pagination : send_message est borné à 64 Ko. D'abord la page 0 (avec_texte = false) : versions, décisions, provenances,
-- tailles. Puis, avec avec_texte = true, une page par tranche de versions dont la somme des « octets » des lignes 'sql'
-- à emporter reste sous ~55 Ko.
-- Rendre la sortie BRUTE de execute_sql (le tableau JSON) ; A5 la range dans omega/prod/sortie/page-<n>.json.

with bornes as (
  select '00000000000000'::text as de, '99999999999999'::text as a,     -- ← bornes de la page (versions incluses)
         false as avec_texte                                            -- ← false : inventaire (page 0) ; true : avec le SQL
),
base_modules(name) as (
  values ('daliro_m0a_referentiel'), ('daliro_m0b_marches'), ('daliro_m0c_planning'),
         ('varelo_referentiel'), ('varelo_referentiel_index'), ('varelo_referentiel_perf'),
         ('tamila_m10_delais_correctifs'), ('tamila_m10b_porte_etroite'), ('tiroma_releve')
),
lignes as (
  select m.version, m.name, coalesce(array_to_string(m.statements, E'\n\n'), '') as texte
  from supabase_migrations.schema_migrations m, bornes b
  where (m.version > '20260929092923' or m.name in (select name from base_modules))
    and m.version between b.de and b.a
),
classees as (
  select l.*,
    case
      when l.name = 'base_existante'                         then 'exclure: base de la recette et de la CI (la production a son historique)'
      when l.name ~* '^banc_'                                 then 'exclure: donnée du banc'
      when l.name ~* '19ac'                                   then 'exclure: outil de test (sorties_tests, tests_en_tache)'
      when l.name ~* '19ae'                                   then 'exclure: outil de test (tester_sans_trace)'
      when l.name ~* '19i'  and l.name ~* 'brevo'             then 'exclure: réglage Brevo de la recette (décision de production à part)'
      when l.name ~* '(^|_)tests?($|_)' or l.name ~* 'pgtap_seul' then 'exclure: pose de tests, pas une migration'
      when l.texte ~* 'create\s+(or\s+replace\s+)?function\s+private\.(depot_demander|depot_executer|tests_en_tache|tester_sans_trace)'
                                                              then 'exclure: outillage de pose ou de test de la recette'
      else 'emporter'
    end as decision,
    -- Une pose « depuis le dépôt » : statements court, qui nomme un chemin omega/…/*.sql et un SHA hexadécimal.
    (length(l.texte) < 4000
     and l.texte ~ 'omega/[^[:space:]'',;]+\.sql'
     and l.texte ~ '(^|[^0-9a-f])[0-9a-f]{7,40}([^0-9a-f]|$)'
     and l.texte !~* '(^|\s)(create|alter|grant|revoke|insert|update|select)\s') as par_depot
  from lignes l
)
select c.version, c.name, c.decision,
       case when c.par_depot then 'depot' else 'sql' end as source,
       case when c.par_depot then c.texte end as provenance,
       case when not c.par_depot and c.decision = 'emporter' and (select avec_texte from bornes) then c.texte end as sql,
       octet_length(c.texte) as octets
from classees c
order by c.version;
