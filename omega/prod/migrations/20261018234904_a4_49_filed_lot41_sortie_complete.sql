-- 20261018234904 a4_49_filed_lot41_sortie_complete
-- Source : dépôt : 09bea0a omega/migrations/a4_49_filed_lot41_sortie_complete.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_49_filed_lot41_sortie_complete.sql @ 09bea0a ; a4_37 cité comme test : ignoré.
-- ═══ omega/migrations/a4_49_filed_lot41_sortie_complete.sql @ 09bea0a
-- FILED, lot 41 (a4_49) — le dossier de sortie emporte TOUTES les données FILED de l'organisation (Teo, 18/10 : « export
-- de sortie complet » ; chiffrage n° 43, 52, 53).
--
-- Le dossier d'a4_33 portait les fichiers reçus, l'index, les fournisseurs, le FEC et les empreintes. S'y ajoute
-- donnees/ : une table FILED par fichier, au format JSON Lines (une ligne JSON par enregistrement, dates en UTC), pour
-- chaque table publique « filed_* » qui porte l'organisation (client_id) — factures, lignes, TVA, contrôles, levées,
-- validations, imputations, écritures, règlements, relevés, notes de frais, réponses, catégories, historique chaîné,
-- réglages… ; une société choisie restreint les tables qui ont une société (entite_id). Plus :
--   donnees/historique_sceau.json  la vérification de la chaîne de l'historique (a4_46) au moment de la sortie ;
--   donnees/LISEZMOI.txt           ce que contient chaque fichier, et ce qui n'y est pas.
-- Ne sortent pas : les dossiers de sortie eux-mêmes (filed_sorties), le dépôt légal de l'opérateur
-- (filed_conservation*), et les colonnes secrètes ou volumineuses (IBAN en clair — le masqué reste —, contenus
-- chiffrés, jetons, fichiers d'export déjà produits).
-- Branchement : private.filed_preparer_sortie (texte d'a4_33) ajoute ces fichiers au volume 1 et le LISEZMOI les cite ;
-- pose « par repère ». Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create or replace function private.filed_sortie_donnees(p_client uuid, p_entite uuid default null)
returns jsonb language plpgsql stable security definer set search_path to '' set timezone to 'UTC' as $$
declare
  r record; v_lignes text; v_n bigint; v_out jsonb := '[]'::jsonb; v_lisez text[]; v_crlf text := chr(13) || chr(10);
  v_exclues text[] := array['iban', 'iban_clair', 'contenu', 'manifeste', 'chiffre', 'texte_chiffre', 'jeton', 'jetons',
                            'secret', 'mot_de_passe', 'cle_api', 'refresh_token', 'access_token'];
  v_entite boolean; v_sceau jsonb;
begin
  v_lisez := array['Données FILED de l''organisation, une table par fichier (JSON Lines : une ligne JSON par enregistrement ; dates en UTC).', ''];
  for r in
    select t.table_name as nom
      from information_schema.tables t
     where t.table_schema = 'public' and t.table_type = 'BASE TABLE' and t.table_name like 'filed\_%'
       and t.table_name not in ('filed_sorties') and t.table_name not like 'filed\_conservation%'
       and exists (select 1 from information_schema.columns c where c.table_schema = 'public' and c.table_name = t.table_name and c.column_name = 'client_id')
     order by t.table_name
  loop
    v_entite := p_entite is not null and exists (select 1 from information_schema.columns c
                  where c.table_schema = 'public' and c.table_name = r.nom and c.column_name = 'entite_id');
    execute format('select coalesce(string_agg((to_jsonb(t) - $2)::text, chr(10) order by (to_jsonb(t) ->> ''id''), (to_jsonb(t))::text), ''''), count(*)
                      from public.%I t where t.client_id = $1 %s', r.nom, case when v_entite then 'and t.entite_id = $3' else '' end)
      into v_lignes, v_n using p_client, v_exclues, p_entite;
    if v_n > 0 then
      v_out := v_out || jsonb_build_array(jsonb_build_object('volume', 1, 'chemin_zip', 'donnees/' || r.nom || '.jsonl', 'contenu', v_lignes || chr(10)));
    end if;
    v_lisez := v_lisez || (rpad(r.nom || '.jsonl', 44) || v_n || ' enregistrement(s)' || case when v_entite then ' (de la société choisie)' else '' end);
  end loop;
  begin
    v_sceau := private.filed_verifier_historique(p_client);
    v_out := v_out || jsonb_build_array(jsonb_build_object('volume', 1, 'chemin_zip', 'donnees/historique_sceau.json', 'contenu', v_sceau::text || chr(10)));
    v_lisez := v_lisez || (rpad('historique_sceau.json', 44) || 'la chaîne de l''historique vérifiée à la sortie (intacte : ' || coalesce(v_sceau ->> 'intacte', '?') || ')');
  exception when undefined_function then null;
  end;
  v_lisez := v_lisez || ''::text || 'Ne sont pas dans ce dossier : les colonnes secrètes (IBAN en clair — le masqué y est —, contenus chiffrés, jetons),'::text
                     || 'les fichiers d''export déjà produits (leur contenu), et les dossiers de sortie précédents.'::text
                     || 'Les tables vides n''ont pas de fichier ; elles sont listées ci-dessus avec 0 enregistrement.'::text;
  v_out := v_out || jsonb_build_array(jsonb_build_object('volume', 1, 'chemin_zip', 'donnees/LISEZMOI.txt', 'contenu', array_to_string(v_lisez, v_crlf) || v_crlf));
  return v_out;
end $$;
comment on function private.filed_sortie_donnees(uuid, uuid) is
  'Lot 41 (a4_49) : les fichiers donnees/ du dossier de sortie (une table FILED par fichier JSON Lines, sceau de l''historique, LISEZMOI).';
revoke all on function private.filed_sortie_donnees(uuid, uuid) from public, anon, authenticated;
grant execute on function private.filed_sortie_donnees(uuid, uuid) to service_role;

-- Le branchement dans le dossier de sortie (texte d'a4_33, par repère) : deux fragments.
do $do$
declare
  r record; v_def text; v_n integer; v_change boolean := false;
begin
  v_def := pg_get_functiondef('private.filed_preparer_sortie(uuid, date, date, uuid, bigint)'::regprocedure);
  for r in select * from (values
    ($o1$  -- Les empreintes, lisibles par sha256sum -c.
$o1$,
     $n1$  -- a4_49 : toutes les données FILED de l'organisation, une table par fichier.
  v_produits := v_produits || private.filed_sortie_donnees(p_client, p_entite);

  -- Les empreintes, lisibles par sha256sum -c.
$n1$),
    ($o2$    'empreintes.sha256  le SHA-256 de chaque pièce : « sha256sum -c empreintes.sha256 » les vérifie toutes',
$o2$,
     $n2$    'empreintes.sha256  le SHA-256 de chaque pièce : « sha256sum -c empreintes.sha256 » les vérifie toutes',
    'donnees/           toutes les données FILED de l''organisation, une table par fichier (voir donnees/LISEZMOI.txt)',
$n2$)
  ) t(ancien, nouveau)
  loop
    if position(r.nouveau in v_def) > 0 then continue; end if;
    v_n := (length(v_def) - length(replace(v_def, r.ancien, ''))) / length(r.ancien);
    if v_n <> 1 then
      raise exception 'a4_49 : repère trouvé % fois au lieu d''une dans private.filed_preparer_sortie. Rien n''est posé.', v_n;
    end if;
    v_def := replace(v_def, r.ancien, r.nouveau);
    v_change := true;
  end loop;
  if v_change then
    execute v_def;
    raise notice 'a4_49 : private.filed_preparer_sortie branchée.';
  else
    raise notice 'a4_49 : private.filed_preparer_sortie déjà branchée.';
  end if;
end $do$;
