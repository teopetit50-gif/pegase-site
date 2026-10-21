-- c3_29 — REPUT, correctif TREPUT-05 (série 1 du testeur) : « envoyées seules ce mois » ne compte que ce qui est parti
-- (session C3, 21/10/2026)
--
-- Constat : private.reput_accords_etat comptait, dans envoyees_seules_mois, toutes les demandes couvertes par l'accord sur le
-- mois, quelle que soit leur issue ; R13a (exécution en échec, envoi bloqué, rien parti) comptait pour 1. Désormais : une
-- demande couverte par l'accord ne compte que si son envoi est « envoye ». Le début du mois se prend au fuseau de
-- l'organisation (entité principale, private.reput_fuseau de c3_21) et non plus en dur à Paris.
-- Reprise de c3_07, ce seul changement. Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function private.reput_accords_etat(p_client uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with p as (
    select p.*, row_number() over (partition by p.type_action
                                   order by (p.statut = 'active' and now() >= p.debut and now() < p.fin) desc,
                                            (p.statut = 'a_valider') desc, p.cree_le desc) as rang
    from public.politiques p
    where p.client_id = p_client and p.module = 'reput'
  ), s as (
    select x.code, x.libelle, x.autorisable, x.actif, x.ordre, 'reput.repondre.' || x.code as type_action, 'sujet' as genre
    from public.reput_sujets x where x.client_id = p_client
    union all select 'accuse', 'Accusés de réception', true, true, (-2)::smallint, 'reput.accuser', 'message'
    union all select 'demande_avis', 'Demandes d''avis', true, true, (-1)::smallint, 'reput.avis', 'message'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'sujet', s.code, 'libelle', s.libelle, 'genre', s.genre, 'autorisable', s.autorisable, 'actif', s.actif,
           'politique', p.id,
           'statut', case when p.id is null then 'aucun'
                          when p.statut = 'active' and p.fin <= now() then 'expire'
                          else p.statut end,
           'debut', p.debut, 'fin', p.fin, 'entite', p.entite_id, 'active_le', p.active_le,
           'donne_par_libelle', (select u.email from auth.users u where u.id = p.cree_par),
           'demande_activation', p.demande_id,
           'demande_activation_statut', (select d.statut from public.demandes_validation d where d.id = p.demande_id),
           'revoquee_le', p.revoquee_le, 'motif_revocation', p.motif_revocation,
           -- c3_29 (TREPUT-05) : seulement ce qui est vraiment parti (envoi « envoye »), mois au fuseau de l'organisation.
           'envoyees_seules_mois', (select count(distinct d.id) from public.demandes_validation d
                                    join public.envois e on e.demande_id = d.id and e.statut = 'envoye'
                                    where d.politique_id = p.id
                                      and d.cree_le >= date_trunc('month', now() at time zone private.reput_fuseau(p_client, null))
                                                       at time zone private.reput_fuseau(p_client, null)),
           'nombre_mensuel', p.nombre_mensuel)
         order by s.ordre, s.code), '[]'::jsonb)
  from s
  left join p on p.type_action = s.type_action and p.rang = 1
$function$;
