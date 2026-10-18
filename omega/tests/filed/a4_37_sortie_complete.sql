-- Tests A4 — lot 41 (a4_49) : le dossier de sortie emporte toutes les données FILED de l'organisation. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql),
-- tests.a4_comme et tests.a4_sortie_fichier (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

create or replace function tests.test_a4_49_01_donnees() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); autre jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid;
        fa jsonb; v_s uuid; v_f text; v_l text; v_lis text;
begin
  fa := tests.a4_facture(o, 'ia', 'SORC-001', 240);
  perform tests.a4_facture(autre, 'ia', 'SORC-AUTRE', 60);
  perform private.filed_historiser(v_cl, (fa ->> 'document')::uuid, 'filed_facture', fa ->> 'facture', 'note', 'Note d''exemple.', '{}');
  reset role; perform tests.a4_comme((o ->> 'gerant')::uuid);
  perform public.filed_poser_categorie(v_cl, 'ATELIER', 'Atelier', array['atelier']);
  v_s := public.filed_preparer_sortie(v_cl);
  reset role;

  v_f := tests.a4_sortie_fichier(v_s, 'donnees/filed_factures.jsonl');
  return next ok(v_f like '%' || (fa ->> 'facture') || '%' and v_f like '%"SORC-001"%', 'Les factures sortent, une ligne JSON chacune');
  return next ok(v_f not like '%SORC-AUTRE%', 'rien d''une autre organisation');
  return next ok((select bool_and(l::jsonb ? 'id') from unnest(string_to_array(rtrim(v_f, chr(10)), chr(10))) l), 'chaque ligne est un JSON complet');
  return next ok(tests.a4_sortie_fichier(v_s, 'donnees/filed_categories.jsonl') like '%"ATELIER"%', 'Les catégories aussi');
  v_l := tests.a4_sortie_fichier(v_s, 'donnees/filed_historique.jsonl');
  return next ok(v_l like '%Note d''exemple.%' and v_l like '%"empreinte"%', 'L''historique, avec ses empreintes');
  return next ok(tests.a4_sortie_fichier(v_s, 'donnees/historique_sceau.json')::jsonb ? 'intacte', 'Le sceau de l''historique vérifié à la sortie');
  return next ok(not exists (select 1 from public.filed_sorties s, jsonb_array_elements(s.manifeste) e
                              where s.id = v_s and e ->> 'chemin_zip' in ('donnees/filed_sorties.jsonl', 'donnees/filed_conservation.jsonl')),
                 'Ni les dossiers de sortie, ni le dépôt légal de l''opérateur');
  return next ok(not exists (select 1 from public.filed_sorties s, jsonb_array_elements(s.manifeste) e
                              where s.id = v_s and e ->> 'chemin_zip' like 'donnees/%.jsonl' and e ->> 'contenu' ~ '"(iban|contenu|manifeste|jeton|secret)":'),
                 'Aucune colonne secrète ou volumineuse');
  v_lis := tests.a4_sortie_fichier(v_s, 'donnees/LISEZMOI.txt');
  return next ok(v_lis like '%filed_factures.jsonl%1 enregistrement(s)%' and v_lis like '%Ne sont pas dans ce dossier%', 'Le LISEZMOI des données dit ce qui y est et ce qui n''y est pas');
  return next ok(tests.a4_sortie_fichier(v_s, 'LISEZMOI.txt') like '%donnees/%', 'Le LISEZMOI du dossier cite donnees/');
end $f$;
