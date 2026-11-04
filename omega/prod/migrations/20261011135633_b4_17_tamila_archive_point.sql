-- 20261011135633 b4_17_tamila_archive_point
-- Source : dépôt : 300bd59 omega/modules/tamila/migrations/b4_17_tamila_archive_point.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b4_17_tamila_archive_point.sql @ 300bd59.
-- ═══ omega/modules/tamila/migrations/b4_17_tamila_archive_point.sql @ 300bd59
-- b4_17 — Tamila : l'archive d'un dossier, l'effacement du dossier de faits, le point du matin complété (session B4,
-- 11/10/2026, reprise après la pause ; omega/CHIFFRAGE/tamila.md lignes 17, 19, 27 et 41).
--
-- CE QUE ÇA POSE.
--   · tamila_export_contenu(p_export) (serveur seul) : ce que l'ouvrier tamila.exporter range dans l'archive, tel que
--     la base le tient — les champs chiffrés restent chiffrés (hexadécimal), le navigateur les déchiffre au
--     téléchargement avec la clé du dossier. Dossier, parties, appel, délais, audiences, avis, expertises, temps,
--     conventions, provisions, factures, journal des accès, lectures longues (résultat chiffré), pièces (chemins).
--     Un export du cabinet (dossier_id null) rend tous les dossiers vivants ou clos, sans les fichiers des pièces.
--   · tamila_effacer_dossier_verifie (b4_11) remplacée : le résultat et l'état chiffrés des lectures longues du dossier
--     sont vidés à l'effacement (promesse « ses pièces et son dossier de faits sont effacés »).
--   · tamila_point_lignes_cabinet (b4_14) remplacée : deux lignes de plus pour le gérant, forfaits dépassés et dossiers
--     sans diligence depuis trente jours (promesse du point du matin).
-- Rien n'est retiré ni effacé en SQL ; create or replace. Fonctions private : revoke from public ; service_role.

create or replace function private.tamila_export_contenu_dossier(p_dossier uuid)
returns jsonb
language sql
stable
security definer
set search_path to ''
as $function$
  select jsonb_build_object(
    'dossier', to_jsonb(d),
    'parties', coalesce((select jsonb_agg(to_jsonb(x) order by x.cree_le) from public.tamila_parties x where x.dossier_id = d.id), '[]'),
    'appel', (select to_jsonb(x) from public.tamila_appels x where x.dossier_id = d.id limit 1),
    'delais', coalesce((select jsonb_agg(to_jsonb(x) order by x.echeance_retenue) from public.tamila_delais x where x.dossier_id = d.id), '[]'),
    'audiences', coalesce((select jsonb_agg(to_jsonb(x) order by x.date_heure) from public.tamila_audiences x where x.dossier_id = d.id), '[]'),
    'avis', coalesce((select jsonb_agg(to_jsonb(x) order by x.date_avis) from public.tamila_avis x where x.dossier_id = d.id), '[]'),
    'expertises', coalesce((select jsonb_agg(to_jsonb(x) order by x.cree_le) from public.tamila_expertises x where x.dossier_id = d.id), '[]'),
    'temps', coalesce((select jsonb_agg(to_jsonb(x) order by x.jour) from public.tamila_temps x where x.dossier_id = d.id), '[]'),
    'conventions', coalesce((select jsonb_agg(to_jsonb(x) order by x.cree_le) from public.tamila_conventions x where x.dossier_id = d.id), '[]'),
    'provisions', coalesce((select jsonb_agg(to_jsonb(x) order by x.demandee_le) from public.tamila_provisions x where x.dossier_id = d.id), '[]'),
    'factures', coalesce((select jsonb_agg(to_jsonb(x) order by x.emise_le) from public.tamila_factures x where x.dossier_id = d.id), '[]'),
    'journal', coalesce((select jsonb_agg(jsonb_build_object('user_id', l.user_id, 'lu_le', l.lu_le, 'contexte', l.contexte) order by l.lu_le)
                         from public.lectures l where l.client_id = d.client_id and l.objet_type = 'tamila_dossier' and l.objet_id = d.id::text), '[]'),
    'pieces', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'nom_fichier', p.nom_fichier, 'mime', p.mime, 'octets', p.octets,
                                                            'sha256', p.sha256, 'chemin', p.chemin, 'type_piece', p.type_piece,
                                                            'chiffrement', p.chiffrement, 'recue_le', p.recue_le) order by p.recue_le)
                        from public.pieces p where p.client_id = d.client_id and p.objet_type = 'tamila_dossier' and p.objet_id = d.id::text), '[]'))
  from public.tamila_dossiers d where d.id = p_dossier
$function$;

create or replace function private.tamila_export_contenu(p_export uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_e public.tamila_exports;
  v_dossiers jsonb;
  v_analyses jsonb := '[]'::jsonb;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'Le contenu d''une archive est lu par le serveur.' using errcode = '42501';
  end if;
  select * into v_e from public.tamila_exports where id = p_export;
  if not found then
    raise exception 'Export introuvable.' using errcode = 'P0002';
  end if;
  if v_e.statut <> 'a_preparer' then
    raise exception 'Cet export n''est pas en préparation (%).', v_e.statut using errcode = '55000';
  end if;
  if v_e.dossier_id is not null then
    v_dossiers := jsonb_build_array(private.tamila_export_contenu_dossier(v_e.dossier_id));
    if to_regclass('public.analyses') is not null then
      execute 'select coalesce(jsonb_agg(jsonb_build_object(''id'', a.id, ''type'', a.type, ''statut'', a.statut, ''comptes'', a.comptes,
                 ''resultat_chiffre'', a.resultat_chiffre, ''demandee_le'', a.demandee_le, ''finie_le'', a.finie_le) order by a.demandee_le), ''[]'')
               from public.analyses a where a.module = ''tamila'' and a.objet_type = ''tamila_dossier'' and a.objet_id = $1'
        into v_analyses using v_e.dossier_id::text;
    end if;
  else
    select coalesce(jsonb_agg(private.tamila_export_contenu_dossier(d.id) - 'pieces' order by d.cree_le), '[]') into v_dossiers
      from public.tamila_dossiers d where d.client_id = v_e.client_id and d.statut <> 'efface';
  end if;
  return jsonb_build_object('export', v_e.id, 'client', v_e.client_id, 'dossier', v_e.dossier_id, 'genere_le', now(),
                            'format', 'tamila-archive/1', 'dossiers', v_dossiers, 'analyses', v_analyses);
end $function$;

create or replace function public.tamila_export_contenu(p_export uuid) returns jsonb
language sql set search_path to '' as $function$ select private.tamila_export_contenu(p_export) $function$;

revoke execute on function private.tamila_export_contenu_dossier(uuid) from public, anon, authenticated;
revoke execute on function private.tamila_export_contenu(uuid) from public, anon, authenticated;
revoke execute on function public.tamila_export_contenu(uuid) from public, anon, authenticated;
grant execute on function private.tamila_export_contenu_dossier(uuid) to service_role;
grant execute on function private.tamila_export_contenu(uuid) to service_role;
grant execute on function public.tamila_export_contenu(uuid) to service_role;

-- L'effacement vérifié (b4_11), qui vide aussi le dossier de faits.
create or replace function private.tamila_effacer_dossier_verifie(p_dossier uuid)
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_d public.tamila_dossiers;
  v_restants integer;
begin
  if not private.tamila_coffre_serveur() then
    raise exception 'L''effacement d''un dossier est fait par le serveur, à son échéance.' using errcode = '42501';
  end if;
  select * into v_d from public.tamila_dossiers where id = p_dossier;
  if not found then
    raise exception 'Dossier introuvable.' using errcode = 'P0002';
  end if;
  select count(*) into v_restants from private.tamila_fichiers_du_dossier(v_d.client_id, v_d.id);
  if v_restants > 0 then
    raise exception 'Des fichiers du dossier sont encore au stockage (%) : le serveur les efface d''abord.', v_restants
      using errcode = '55000';
  end if;
  -- b4_17 : le dossier de faits (les lectures longues du dossier) s'efface avec lui : le résultat et l'état chiffrés
  -- sont vidés ; la ligne reste comme trace (type, dates, coût), sans contenu.
  if to_regclass('public.analyses') is not null then
    execute 'update public.analyses set resultat_chiffre = null, etat_chiffre = null, comptes = null,
               motif = ''Effacée avec le dossier.'' where module = ''tamila'' and objet_type = ''tamila_dossier'' and objet_id = $1'
      using p_dossier::text;
  end if;
  return private.tamila_effacer_dossier(p_dossier) || jsonb_build_object('fichiers_restants', 0);
end $function$;

-- Le point du matin du cabinet (b4_14), complété.
create or replace function private.tamila_point_lignes_cabinet(p_client uuid, p_jour date, p_maintenant timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path to ''
as $function$
declare
  v_items jsonb := '[]'::jsonb;
  v_n integer;
  v_somme bigint;
  v_lien constant text := '/espace/tamila';
begin
  select count(*) into v_n from public.tamila_delais t join public.tamila_dossiers d on d.id = t.dossier_id
   where t.client_id = p_client and t.statut in ('a_confirmer', 'confirme') and t.acte_depose_le is null
     and t.echeance_retenue < p_jour and d.statut in ('attente', 'ouvert', 'audit');
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s délai%s dépassé%s sans acte déposé dans le cabinet', v_n,
      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end), 'gravite', 'critique', 'lien', v_lien);
  end if;

  select count(distinct c.dossier_id) into v_n from public.tamila_controles_conflits c join public.tamila_dossiers d on d.id = c.dossier_id
   where c.client_id = p_client and c.conflits > 0 and c.decision is null and d.statut in ('attente', 'ouvert', 'audit');
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s dossier%s avec un conflit d''intérêts sans décision (RIN art. 4)', v_n,
      case when v_n > 1 then 's' else '' end), 'gravite', 'critique', 'lien', v_lien);
  end if;

  select count(*) into v_n from public.tamila_dossiers d
   where d.client_id = p_client and d.statut in ('ouvert', 'audit')
     and coalesce(d.ouvert_le, d.cree_le) < p_maintenant - interval '15 days'
     and not exists (select 1 from public.tamila_conventions c where c.dossier_id = d.id and c.statut <> 'resiliee'
                       and (c.statut = 'signee' or c.urgence));
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s dossier%s ouvert%s depuis plus de quinze jours sans convention d''honoraires signée', v_n,
      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end), 'gravite', 'attention', 'lien', v_lien);
  end if;

  select count(*), coalesce(sum(f.reste_du_cents), 0) into v_n, v_somme from public.tamila_factures f
   where f.client_id = p_client and f.statut = 'emise' and f.reste_du_cents > 0 and f.emise_le < p_jour - 30;
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s facture%s d''honoraires impayée%s depuis plus de trente jours, %s € restant dus', v_n,
      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end,
      translate(to_char(v_somme / 100.0, 'FM999,999,990.00'), ',.', ' ,')), 'gravite', 'attention', 'lien', v_lien);
  end if;

  select count(*) into v_n from public.tamila_dossiers d
   where d.client_id = p_client and d.statut in ('clos', 'audit', 'refuse')
     and d.effacement_prevu_le is not null and d.effacement_prevu_le < p_maintenant + interval '7 days';
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s dossier%s effacé%s dans les sept jours : l''export, s''il le faut, avant', v_n,
      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end), 'gravite', 'info', 'lien', v_lien);
  end if;

  -- b4_17 : les forfaits dont le temps passé dépasse le temps prévu (b4_12), et les dossiers sans diligence depuis
  -- trente jours (ni temps, ni acte, ni audience passée, ni avis, ni pièce).
  select count(*) into v_n from public.tamila_conventions c join public.tamila_dossiers d on d.id = c.dossier_id
   where c.client_id = p_client and c.statut <> 'resiliee' and c.mode in ('forfait', 'mixte') and c.minutes_prevues is not null
     and d.statut in ('attente', 'ouvert', 'audit')
     and (select coalesce(sum(t.minutes), 0) from public.tamila_temps t where t.dossier_id = c.dossier_id and t.statut <> 'annule') > c.minutes_prevues;
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s forfait%s dépassé%s : le temps passé excède le temps prévu à la convention', v_n,
      case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end), 'gravite', 'attention', 'lien', v_lien);
  end if;

  select count(*) into v_n from public.tamila_dossiers d
   where d.client_id = p_client and d.statut in ('attente', 'ouvert', 'audit')
     and greatest(coalesce(d.ouvert_le, d.cree_le),
                  (select max(t.jour)::timestamptz from public.tamila_temps t where t.dossier_id = d.id and t.statut <> 'annule'),
                  (select max(coalesce(x.acte_depose_le::timestamptz, x.cree_le)) from public.tamila_delais x where x.dossier_id = d.id),
                  (select max(a.date_heure) from public.tamila_audiences a where a.dossier_id = d.id and a.date_heure <= p_maintenant),
                  (select max(v.date_avis)::timestamptz from public.tamila_avis v where v.dossier_id = d.id),
                  (select max(p.recue_le) from public.pieces p where p.client_id = p_client and p.objet_type = 'tamila_dossier' and p.objet_id = d.id::text))
         < p_maintenant - interval '30 days';
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s dossier%s sans diligence depuis trente jours (ni temps, ni acte, ni audience, ni pièce)', v_n,
      case when v_n > 1 then 's' else '' end), 'gravite', 'attention', 'lien', v_lien);
  end if;
  return v_items;
end $function$;

revoke execute on function private.tamila_point_lignes_cabinet(uuid, date, timestamptz) from public, anon, authenticated;
grant execute on function private.tamila_point_lignes_cabinet(uuid, date, timestamptz) to service_role;
revoke execute on function private.tamila_effacer_dossier_verifie(uuid) from public, anon, authenticated;
grant execute on function private.tamila_effacer_dossier_verifie(uuid) to service_role;
