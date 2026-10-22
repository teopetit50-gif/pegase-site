-- c3_41 — REPUT, complément TREPUT-16 : quand une urgence attend, les décideurs sont prévenus HORS des heures d'envoi
-- (session C3, 22/10/2026 ; s'appuie sur le lot socle c3_41a)
--
--   · private.reput_prevenir_decideurs (reprise de c3_11) : si l'une des réponses en attente d'un décideur est celle
--     d'une URGENCE non prise, le récapitulatif « Réponses clients à valider » est envoyé URGENT (drapeau de transaction
--     omega.envoi_interne_urgent autour de private.envoyer_interne → il saute le seul verrou HORS_HEURES, c3_41a), avec
--     sa propre clé (reput.a_valider.urgent:<membre>:<heure>). Un récapitulatif ordinaire reste soumis aux heures.
--   · Avis « astreinte épuisée » : gabarit global fermé reput.astreinte_epuisee (une date ; ni client, ni question), aux
--     gérants et administrateurs dont le périmètre couvre la demande, URGENT lui aussi, une fois par demande et par
--     membre (reput.astreinte_epuisee:<demande>:<membre>) ; déclencheur reput_aviser_epuisement sur reput_demandes
--     quand astreinte_epuisee_le se renseigne.
-- Seuls ces deux messages internes sont marqués urgents. Aucun envoi vers un client ne l'est.
--
-- Règles de pose : insert … on conflict do nothing, create or replace ; ni DROP ni DELETE.

insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                      transactionnel, donnees_sante, espacement, statut)
values (null, 'reput', 'reput.astreinte_epuisee', 'fr', 1, 'email',
        'REPUT — urgence sans personne de garde (sans contenu client)',
        'URGENT — une demande attend, la garde est injoignable — {{organisation}}',
        'Bonjour,' || chr(10) || chr(10)
        || 'Une demande URGENTE attend chez {{organisation}} ({{jour}}) : aucun membre de garde n''a pris l''appel d''astreinte.' || chr(10)
        || 'Rappelez le client vous-même, ou confiez-la : https://omegaai.fr/espace2/reput' || chr(10)
        || '(la connexion à votre espace vous est demandée ; le contenu de la demande ne sort jamais par courriel).' || chr(10) || chr(10)
        || 'REPUT, pour {{organisation}}.',
        '{"jour": "date"}'::jsonb,
        true, false, false, 'brouillon')
on conflict (client_id, code, langue, version) do nothing;

do $$
declare v_id uuid;
begin
  select g.id into v_id from public.gabarits_messages g
  where g.client_id is null and g.code = 'reput.astreinte_epuisee' and g.langue = 'fr' and g.version = 1 and g.statut = 'brouillon';
  if v_id is not null then
    set local role service_role;
    perform public.valider_gabarit(v_id, 'C3 — avis « astreinte épuisée », 22/10/2026');
    reset role;
  end if;
end $$;

-- Le récapitulatif (reprise de c3_11).
create or replace function private.reput_prevenir_decideurs(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v_cle text;
  n integer := 0;   -- courriels nouveaux (un déjà parti dans l'heure ne compte pas)
begin
  for x in
    select p.client_id, c.user_id, count(distinct p.id)::int as attente, max(p.cree_le) as derniere,
           coalesce(bool_or(d.urgence and d.urgence_prise_le is null), false) as urgent
    from public.reput_reponses p
    join public.reput_demandes d on d.id = p.demande_id
    join public.reput_reglages g on g.client_id = p.client_id and g.entite_id is null and g.actif
    join public.comptes c on c.client_id = p.client_id and c.role in ('gerant', 'admin', 'valideur')
    left join public.reput_sujets s on s.client_id = p.client_id and s.code = p.sujet
    where p.statut = 'a_valider' and p.demande_validation_id is not null
      and (s.equipe_id is null
           or exists (select 1 from public.equipes_membres m where m.equipe_id = s.equipe_id and m.user_id = c.user_id))
      and private.perimetre_couvre(c.user_id, p.client_id, p.entite_id)
    group by p.client_id, c.user_id
    having max(p.cree_le) >= date_trunc('hour', p_maintenant)
    order by p.client_id, c.user_id
  loop
    -- c3_41 : quand une urgence non prise attend, le récapitulatif est URGENT (il part hors des heures, c3_41a) et a sa
    -- propre clé : il n'est pas retenu par un récapitulatif ordinaire déjà parti (ou différé) dans l'heure.
    v_cle := 'reput.a_valider' || case when x.urgent then '.urgent' else '' end || ':' || x.user_id::text || ':'
             || to_char(p_maintenant at time zone 'UTC', 'YYYY-MM-DD"T"HH24');
    continue when exists (select 1 from public.envois e where e.client_id = x.client_id and e.cle_idempotence = v_cle);
    begin
      perform set_config('omega.envoi_interne_urgent', case when x.urgent then 'on' else 'off' end, true);
      perform private.envoyer_interne(
        x.client_id, 'reput', null, null, 'email', x.user_id, 'reput.a_valider',   -- un compteur : aucun objet
        jsonb_build_object('jour', to_char(p_maintenant at time zone 'Europe/Paris', 'YYYY-MM-DD'), 'attente', x.attente),
        v_cle, null);
      perform set_config('omega.envoi_interne_urgent', 'off', true);
      n := n + 1;
    exception when others then
      perform set_config('omega.envoi_interne_urgent', 'off', true);
      -- Un membre sans adresse, un verrou du socle : les autres sont prévenus quand même ; le point du matin reste.
      raise notice 'reput_prevenir_decideurs : % (%)', sqlerrm, sqlstate;
    end;
  end loop;
  return n;
end $function$;

create or replace function private.reput_aviser_epuisement(p_demande uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  x record;
  n integer := 0;
begin
  select * into d from public.reput_demandes y where y.id = p_demande;
  if d.id is null or d.astreinte_epuisee_le is null or d.urgence_prise_le is not null then
    return 0;
  end if;
  for x in
    select c.user_id from public.comptes c
    where c.client_id = d.client_id and c.role in ('gerant', 'admin')
      and private.perimetre_couvre(c.user_id, d.client_id, d.entite_id)
    order by c.user_id
  loop
    begin
      perform set_config('omega.envoi_interne_urgent', 'on', true);
      perform private.envoyer_interne(d.client_id, 'reput', 'reput_demandes', d.id::text, 'email', x.user_id,
        'reput.astreinte_epuisee', jsonb_build_object('jour', to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD')),
        'reput.astreinte_epuisee:' || d.id::text || ':' || x.user_id::text, d.entite_id);
      perform set_config('omega.envoi_interne_urgent', 'off', true);
      n := n + 1;
    exception when others then
      perform set_config('omega.envoi_interne_urgent', 'off', true);
      raise notice 'reput_aviser_epuisement : % (%)', sqlerrm, sqlstate;   -- l'alerte critique (c3_40) reste
    end;
  end loop;
  return n;
end $function$;
revoke execute on function private.reput_aviser_epuisement(uuid) from public, anon, authenticated;
grant execute on function private.reput_aviser_epuisement(uuid) to service_role;

create or replace function private.reput_aviser_epuisement_declencheur()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.reput_aviser_epuisement(new.id);
  return null;
end $function$;
revoke execute on function private.reput_aviser_epuisement_declencheur() from public, anon, authenticated;

create or replace trigger reput_aviser_epuisement after update of astreinte_epuisee_le on public.reput_demandes
  for each row when (old.astreinte_epuisee_le is null and new.astreinte_epuisee_le is not null)
  execute function private.reput_aviser_epuisement_declencheur();
