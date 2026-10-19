-- c3_16 — REPUT : le sujet secondaire, et le second service prévenu (session C3, 19/10/2026)
--
-- Chiffrage #49 (« Une demande qui relève de deux services est orientée vers le premier concerné. ») : jusqu'ici une demande
-- n'avait qu'un sujet, donc un seul service, et le second n'en savait rien. Désormais :
--   · reput_demandes.sujet_secondaire : l'autre sujet que la demande touche (posé par l'ouvrier d'après le modèle, ou par
--     une personne qui traite la demande). Le sujet PRINCIPAL ne change pas : la réponse, sa validation et son service
--     restent ceux du premier concerné (c3_07).
--   · public.reput_noter_sujet_secondaire(p_demande, p_sujet) — serveur, ou une personne qui traite la demande (gérant,
--     administrateur, valideur, collaborateur, sur son périmètre). Un sujet inconnu, inactif ou égal au principal est
--     refusé ; nul l'efface.
--   · Si le sujet secondaire est routé vers un AUTRE service que le principal, chaque membre de ce second service dont le
--     périmètre couvre la demande reçoit un courriel interne (socle 19as : gabarit fermé « reput.second_service », une date
--     et un nombre, sans contenu client), une fois par demande et par membre. Le second service lit la demande dans
--     l'espace ; il ne la valide pas (la règle de validation reste celle du sujet principal).
-- Les modes d'envoi ne changent pas : sur la recette et le banc, rien ne part pour de vrai.
--
-- Règles de pose : alter … if not exists, insert … on conflict do nothing, create or replace ; ni DROP ni DELETE.

alter table public.reput_demandes add column if not exists sujet_secondaire text;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_demandes_sujet_secondaire_check') then
    alter table public.reput_demandes add constraint reput_demandes_sujet_secondaire_check
      check (sujet_secondaire is null or sujet_secondaire ~ '^[a-z][a-z0-9_]{1,39}$');
  end if;
end $do$;

insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                      transactionnel, donnees_sante, espacement, statut)
values (null, 'reput', 'reput.second_service', 'fr', 1, 'email',
        'REPUT — une demande concerne aussi votre service (sans contenu client)',
        'Une demande client concerne aussi votre service — {{organisation}}',
        'Bonjour,' || chr(10) || chr(10)
        || 'Une demande reçue le {{jour}} concerne aussi votre service ({{organisation}}). Elle est suivie par le service '
        || 'qui en a la charge principale ; {{nombre}} demande(s) de ce jour vous concernent en second.' || chr(10) || chr(10)
        || 'Pour la consulter : https://omegaai.fr/espace2/reput' || chr(10)
        || '(la connexion à votre espace vous est demandée ; le contenu des demandes ne sort jamais par courriel).' || chr(10) || chr(10)
        || 'REPUT, pour {{organisation}}.',
        '{"jour": "date", "nombre": "nombre"}'::jsonb,
        true, false, false, 'brouillon')
on conflict (client_id, code, langue, version) do nothing;

do $$
declare v_id uuid;
begin
  select g.id into v_id from public.gabarits_messages g
  where g.client_id is null and g.code = 'reput.second_service' and g.langue = 'fr' and g.version = 1 and g.statut = 'brouillon';
  if v_id is not null then
    set local role service_role;
    perform public.valider_gabarit(v_id, 'C3 — courriel « concerne aussi votre service », 19/10/2026');
    reset role;
  end if;
end $$;

-- Les membres du second service prévenus pour une demande (une fois par demande et par membre).
create or replace function private.reput_prevenir_second_service(p_demande uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  v_eq1 uuid;
  v_eq2 uuid;
  x record;
  v_cle text;
  v_jour date;
  n integer := 0;
begin
  select * into d from public.reput_demandes y where y.id = p_demande;
  if d.id is null or d.sujet_secondaire is null then return 0; end if;
  select s.equipe_id into v_eq1 from public.reput_sujets s where s.client_id = d.client_id and s.code = d.sujet;
  select s.equipe_id into v_eq2 from public.reput_sujets s where s.client_id = d.client_id and s.code = d.sujet_secondaire;
  if v_eq2 is null or v_eq2 is not distinct from v_eq1 then return 0; end if;
  v_jour := (d.recu_le at time zone 'Europe/Paris')::date;
  for x in
    select distinct m.user_id
    from public.equipes_membres m
    join public.comptes c on c.client_id = d.client_id and c.user_id = m.user_id
    where m.equipe_id = v_eq2 and private.perimetre_couvre(m.user_id, d.client_id, d.entite_id)
    order by m.user_id
  loop
    v_cle := 'reput.second_service:' || d.id::text || ':' || x.user_id::text;
    continue when exists (select 1 from public.envois e where e.client_id = d.client_id and e.cle_idempotence = v_cle);
    begin
      perform private.envoyer_interne(
        d.client_id, 'reput', null, null, 'email', x.user_id, 'reput.second_service',
        jsonb_build_object('jour', to_char(v_jour, 'YYYY-MM-DD'),
                           'nombre', (select count(*) from public.reput_demandes z
                                      where z.client_id = d.client_id and z.sujet_secondaire is not null
                                        and (z.recu_le at time zone 'Europe/Paris')::date = v_jour
                                        and exists (select 1 from public.reput_sujets s where s.client_id = z.client_id
                                                    and s.code = z.sujet_secondaire and s.equipe_id = v_eq2))),
        v_cle, d.entite_id);
      n := n + 1;
    exception when others then
      perform private.journaliser_module(d.client_id, 'reput', 'reput.second_service_echec', 'reput_demandes', d.id::text,
        jsonb_build_object('membre', x.user_id, 'erreur', left(sqlerrm, 200)), d.entite_id);
    end;
  end loop;
  return n;
end $function$;

revoke execute on function private.reput_prevenir_second_service(uuid) from public, anon, authenticated;

create or replace function public.reput_noter_sujet_secondaire(p_demande uuid, p_sujet text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  v_code text := nullif(lower(btrim(coalesce(p_sujet, ''))), '');
  s public.reput_sujets;
  v_prevenus integer := 0;
begin
  if private.reput_est_serveur() then
    select * into d from public.reput_demandes x where x.id = p_demande;
    if d.id is null then
      raise exception 'Demande introuvable.' using errcode = 'P0002';
    end if;
  else
    d := private.reput_demande_traitee_par(p_demande);
  end if;
  if v_code is not null then
    select * into s from public.reput_sujets x where x.client_id = d.client_id and x.code = v_code;
    if s.id is null or not s.actif then
      raise exception 'Sujet secondaire inconnu ou inactif : %.', v_code using errcode = '22023';
    end if;
    if v_code is not distinct from d.sujet then
      raise exception 'Le sujet secondaire diffère du sujet principal.' using errcode = '22023';
    end if;
  end if;
  if d.sujet_secondaire is not distinct from v_code then
    return jsonb_build_object('demande', d.id, 'sujet_secondaire', v_code, 'change', false, 'prevenus', 0);
  end if;
  update public.reput_demandes x set sujet_secondaire = v_code, maj_le = now() where x.id = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.sujet_secondaire', 'reput_demandes', d.id::text,
    jsonb_build_object('sujet', d.sujet, 'secondaire', v_code, 'service', s.equipe_id, 'par', (select auth.uid())), d.entite_id);
  if v_code is not null then
    v_prevenus := private.reput_prevenir_second_service(d.id);
  end if;
  return jsonb_build_object('demande', d.id, 'sujet_secondaire', v_code, 'change', true, 'service', s.equipe_id, 'prevenus', v_prevenus);
end $function$;

revoke execute on function public.reput_noter_sujet_secondaire(uuid, text) from public, anon;
grant execute on function public.reput_noter_sujet_secondaire(uuid, text) to authenticated, service_role;
