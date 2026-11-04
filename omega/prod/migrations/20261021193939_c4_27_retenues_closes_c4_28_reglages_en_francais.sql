-- 20261021193939 c4_27_retenues_closes+c4_28_reglages_en_francais
-- Source : dépôt : 87c39988 omega/modules/offload/migrations/c4_27_retenues_closes.sql ; 2d05c1cd omega/modules/offload/migrations/c4_28_reglages_en_francais.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_27_retenues_closes.sql @ 87c39988, c4_28_reglages_en_francais.sql @ 2d05c1cd.
-- ═══ omega/modules/offload/migrations/c4_27_retenues_closes.sql @ 87c39988
-- c4_27 — OFFLOAD : une demande de retenue ne survit pas à sa reprise (testeur T-OFFLOAD, TOFFLOAD-07 ; C4, 21/10/2026)
--
-- Écart (O14) : la reprise est close « commande » (c4_25), son message annulé, mais la demande « offload.message_retenu »
-- (c4_18) reste en attente dans « À valider », et offload_envoi_auto.retenus_en_attente la compte.
--   · offload_clore annule aussi les demandes « offload.message_retenu » encore en attente de la reprise ;
--   · le compteur ne compte que les demandes dont le message attend encore une validation ;
--   · l'existant est réparé à la pose : une demande de retenue en attente dont le message n'attend plus rien (annulé,
--     bloqué, parti) passe à « annulee ». Rejouable.
--
-- Règles de pose : create or replace, update ciblé et rejouable. Aucun DROP, aucun DELETE.

-- Clore une reprise : ses demandes de retenue en attente sont annulées.
create or replace function private.offload_clore(p_reprise uuid, p_issue text, p_motif text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
begin
  select * into r from public.offload_reprises where id = p_reprise for update;
  if not found or r.statut in ('repondue', 'close') then
    return;
  end if;
  update public.offload_reprises
     set statut = case when p_issue in ('reponse', 'arret') then 'repondue' else 'close' end,
         issue = p_issue, motif = coalesce(left(p_motif, 500), motif), close_le = now(), maj_le = now()
   where id = r.id;
  if p_issue in ('commande', 'arret', 'refusee', 'reprise_en_main', 'abandon', 'sans_reponse') then
    update public.offload_taches set statut = 'abandonnee', faite_le = now(), maj_le = now(),
           compte_rendu = coalesce(compte_rendu, case p_issue when 'commande' then 'Le client a commandé : appel sans objet.'
                                                              when 'arret' then 'Le client a demandé l''arrêt.'
                                                              else 'Reprise close : ' || p_issue || '.' end)
     where reprise_id = r.id and statut = 'a_faire' and type = 'appel';
  end if;
  -- Le message qui n'est pas encore parti n'a plus d'objet (c4_25).
  if r.envoi1_id is not null and exists (select 1 from public.envois e where e.id = r.envoi1_id and e.statut in ('a_valider', 'pret')) then
    perform private.annuler_envoi(r.envoi1_id, 'Reprise close (' || p_issue || ') : le message n''a plus d''objet.');
  end if;
  if r.envoi2_id is not null and exists (select 1 from public.envois e where e.id = r.envoi2_id and e.statut in ('a_valider', 'pret')) then
    perform private.annuler_envoi(r.envoi2_id, 'Reprise close (' || p_issue || ') : le message n''a plus d''objet.');
  end if;
  -- La demande de retenue qui attendait une personne n'a plus d'objet (c4_27).
  update public.demandes_validation d set statut = 'annulee'
   where d.client_id = r.client_id and d.module = 'offload' and d.type_action = 'offload.message_retenu'
     and d.objet_type = 'offload_reprises' and d.objet_id = r.id::text and d.statut = 'en_attente';
  perform private.journaliser_module(r.client_id, 'offload', 'offload.reprise_close', 'offload_reprises', r.id::text,
    jsonb_build_object('compte', r.compte_id, 'issue', p_issue, 'motif', p_motif, 'avant', r.statut), r.entite_id);
end $function$;

-- Le compteur : seulement les messages qui attendent encore une personne.
create or replace function private.offload_accord_etat(p_client uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'envoi_auto', g.envoi_auto,
    'sujets_auto', to_jsonb(g.sujets_auto),
    'accord', case when exists (select 1 from public.politiques p where p.client_id = p_client and p.module = 'offload'
                                  and p.type_action = 'envoi.email' and p.statut = 'active' and p.fin > now()) then 'actif'
                   when exists (select 1 from public.politiques p where p.client_id = p_client and p.module = 'offload'
                                  and p.type_action = 'envoi.email' and p.statut = 'a_valider') then 'a_valider'
                   else 'absent' end,
    'politiques', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'statut', p.statut, 'nombre_mensuel', p.nombre_mensuel,
                                                                'debut', p.debut, 'fin', p.fin, 'donne_par', p.cree_par,
                                                                'demande', p.demande_id) order by p.cree_le desc), '[]'::jsonb)
                   from public.politiques p where p.client_id = p_client and p.module = 'offload' and p.type_action = 'envoi.email'
                     and p.statut in ('a_valider', 'active')),
    'retenus_en_attente', (select count(*) from public.demandes_validation d where d.client_id = p_client and d.module = 'offload'
                             and d.type_action = 'offload.message_retenu' and d.statut = 'en_attente'
                             and exists (select 1 from public.envois e where e.demande_id = d.id and e.statut = 'a_valider')))
  from public.offload_reglages g where g.client_id = p_client
$function$;

-- Révoque l'accord permanent d'OFFLOAD (à valider ou actif) ; rend le nombre d'accords révoqués.
create or replace function private.offload_revoquer_accord(p_client uuid, p_motif text)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
begin
  for r in select p.id from public.politiques p
           where p.client_id = p_client and p.module = 'offload' and p.type_action = 'envoi.email' and p.statut in ('a_valider', 'active')
  loop
    perform private.revoquer_politique(r.id, left(coalesce(nullif(btrim(p_motif), ''), 'Envoi automatique d''OFFLOAD révoqué'), 500));
    n := n + 1;
  end loop;
  if n > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.accord_auto_revoque', 'offload_reglages', p_client::text,
      jsonb_build_object('politiques', n, 'motif', p_motif), null);
  end if;
  return n;
end $function$;

-- L'existant : les demandes de retenue dont le message n'attend plus rien sont annulées.
update public.demandes_validation d set statut = 'annulee'
 where d.module = 'offload' and d.type_action = 'offload.message_retenu' and d.statut = 'en_attente'
   and not exists (select 1 from public.envois e where e.demande_id = d.id and e.statut = 'a_valider');

revoke execute on function private.offload_clore(uuid, text, text) from public, anon, authenticated;
grant execute on function private.offload_clore(uuid, text, text) to service_role;
revoke execute on function private.offload_accord_etat(uuid) from public, anon, authenticated;
grant execute on function private.offload_accord_etat(uuid) to service_role;


-- ═══ omega/modules/offload/migrations/c4_28_reglages_en_francais.sql @ 2d05c1cd
-- c4_28 — OFFLOAD : un réglage hors bornes se dit en français (testeur T-OFFLOAD, TOFFLOAD-08 ; C4, 21/10/2026)
--
-- Écart : offload_regler(client, '{"vague_jour": 9}') renvoyait le texte brut de la contrainte
-- offload_reglages_vague_jour_check. Chaque borne de offload_regler a désormais sa phrase ; le code d'erreur reste
-- 23514 (borne) ; une valeur qui n'est pas un nombre, ou trop grande pour son champ, répond 22023 avec une phrase.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- La phrase d'une borne de offload_reglages.
create or replace function private.offload_phrase_reglage(p_contrainte text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case p_contrainte
    when 'offload_reglages_arrete_check' then 'Le jour d''arrêté du mois va de 1 à 28.'
    when 'offload_reglages_avant_cloture_check' then 'L''alerte avant la clôture se donne entre 1 et 28 jours.'
    when 'offload_reglages_cloture_check' then 'Le jour de clôture va de 1 à 31.'
    when 'offload_reglages_delai_check' then 'Le délai de silence va de 7 à 3 650 jours.'
    when 'offload_reglages_montant_check' then 'Le montant minimal est positif ou nul.'
    when 'offload_reglages_plafond_check' then 'Le plafond de reprises par jour va de 1 à 500.'
    when 'offload_reglages_quarantaine_check' then 'La quarantaine entre deux reprises va de 30 à 730 jours.'
    when 'offload_reglages_relance_check' then 'Le délai de relance va de 3 à 60 jours.'
    when 'offload_reglages_retrait_check' then 'Le délai de retrait va de 1 à 180 jours, la relance de retrait de 3 à 90 jours.'
    when 'offload_reglages_seuil_non_remis_check' then 'Le seuil de messages non remis va de 5 à 80 %.'
    when 'offload_reglages_signature_check' then 'La signature tient en 500 caractères.'
    when 'offload_reglages_sujets_auto_check' then 'Les sujets de l''envoi automatique sont reprise, echeance ou affaire.'
    when 'offload_reglages_vague_jour_check' then 'Le jour de la vague va de 1 (lundi) à 7 (dimanche).'
    when 'offload_reglages_mode_check' then 'Le mode est essai ou reel.'
    else 'Ce réglage sort des bornes permises.' end
$function$;

-- Les réglages : chaque borne a sa phrase.
create or replace function private.offload_regler(p_client uuid, p_reglages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_inconnus text;
  p jsonb := coalesce(p_reglages, '{}'::jsonb);
  v_contrainte text;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'régler les seuils');
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Les réglages se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k
  where k not in ('delai_silence_jours', 'montant_min', 'jour_cloture', 'alerte_avant_cloture_jours', 'signature',
                  'delai_relance_jours', 'quarantaine_jours', 'plafond_reprises_jour', 'delai_retrait_jours', 'delai_relance_retrait_jours',
                  'arrete_jour', 'seuil_non_remis_pct', 'vague_jour', 'relance_ecrite',
                  'envoi_auto', 'sujets_auto');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  select * into g from public.offload_reglages where client_id = p_client for update;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if p ? 'envoi_auto' and jsonb_typeof(p -> 'envoi_auto') <> 'boolean' then
    raise exception 'envoi_auto vaut true ou false.' using errcode = '22023';
  end if;
  if p ? 'sujets_auto' and jsonb_typeof(p -> 'sujets_auto') <> 'array' then
    raise exception 'sujets_auto est une liste : reprise, echeance, affaire.' using errcode = '22023';
  end if;
  -- Une borne dépassée se dit en français (c4_28).
  begin
    update public.offload_reglages set
      delai_silence_jours = case when p ? 'delai_silence_jours' then (p ->> 'delai_silence_jours')::integer else delai_silence_jours end,
      montant_min = case when p ? 'montant_min' then (p ->> 'montant_min')::numeric else montant_min end,
      jour_cloture = case when p ? 'jour_cloture' then (p ->> 'jour_cloture')::smallint else jour_cloture end,
      alerte_avant_cloture_jours = case when p ? 'alerte_avant_cloture_jours' then (p ->> 'alerte_avant_cloture_jours')::smallint
                                        else alerte_avant_cloture_jours end,
      signature = case when p ? 'signature' then private.offload_texte(p ->> 'signature', 500) else signature end,
      delai_relance_jours = case when p ? 'delai_relance_jours' then (p ->> 'delai_relance_jours')::smallint else delai_relance_jours end,
      quarantaine_jours = case when p ? 'quarantaine_jours' then (p ->> 'quarantaine_jours')::smallint else quarantaine_jours end,
      plafond_reprises_jour = case when p ? 'plafond_reprises_jour' then (p ->> 'plafond_reprises_jour')::smallint else plafond_reprises_jour end,
      delai_retrait_jours = case when p ? 'delai_retrait_jours' then (p ->> 'delai_retrait_jours')::smallint else delai_retrait_jours end,
      delai_relance_retrait_jours = case when p ? 'delai_relance_retrait_jours' then (p ->> 'delai_relance_retrait_jours')::smallint
                                         else delai_relance_retrait_jours end,
      relance_ecrite = case when p ? 'relance_ecrite' then coalesce((p ->> 'relance_ecrite')::boolean, false) else relance_ecrite end,
      envoi_auto = case when p ? 'envoi_auto' then (p ->> 'envoi_auto')::boolean else envoi_auto end,
      sujets_auto = case when p ? 'sujets_auto' then array(select distinct x from jsonb_array_elements_text(p -> 'sujets_auto') x order by x)
                         else sujets_auto end,
      vague_jour = case when p ? 'vague_jour' then (p ->> 'vague_jour')::smallint else vague_jour end,
      seuil_non_remis_pct = case when p ? 'seuil_non_remis_pct' then (p ->> 'seuil_non_remis_pct')::smallint else seuil_non_remis_pct end,
      arrete_jour = case when p ? 'arrete_jour' then (p ->> 'arrete_jour')::smallint else arrete_jour end,
      maj_le = now()
    where client_id = p_client;
  exception
    when check_violation then
      get stacked diagnostics v_contrainte = constraint_name;
      raise exception '%', private.offload_phrase_reglage(v_contrainte) using errcode = '23514';
    when invalid_text_representation or numeric_value_out_of_range or datatype_mismatch then
      raise exception 'Réglage invalide : une valeur attendue est un nombre, dans ses bornes.' using errcode = '22023';
  end;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('avant', to_jsonb(g) - 'branchement_id' - 'installe_par', 'demande', p), null);
  -- L'envoi automatique éteint : l'accord permanent d'OFFLOAD est révoqué, chaque message repasse par une personne.
  if g.envoi_auto and p ? 'envoi_auto' and not (p ->> 'envoi_auto')::boolean then
    perform private.offload_revoquer_accord(p_client, 'Envoi automatique éteint dans les réglages d''OFFLOAD.');
  end if;
  return (select to_jsonb(x) from public.offload_reglages x where x.client_id = p_client);
end $function$;

revoke execute on function private.offload_phrase_reglage(text) from public, anon, authenticated;
grant execute on function private.offload_phrase_reglage(text) to service_role;
revoke execute on function private.offload_regler(uuid, jsonb) from public, anon;
grant execute on function private.offload_regler(uuid, jsonb) to authenticated, service_role;
