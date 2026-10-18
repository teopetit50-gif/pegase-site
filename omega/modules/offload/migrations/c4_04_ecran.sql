-- c4_04 — OFFLOAD : les deux lectures de l'écran /espace/offload (session C4, 06/10/2026)
--
-- CE QUE ÇA POSE. L'écran aurait une dizaine de requêtes à faire (comptes, signaux, reprises, envois, tâches,
-- achats). Deux fonctions de LECTURE, SECURITY INVOKER : la RLS du lecteur s'applique à chaque table lue.
--   · public.offload_tableau(p_client) → jsonb : réglages, compteurs, les comptes (à risque d'abord, par priorité ;
--     500 au plus) avec leur signal et leur dernière reprise, les messages en attente de validation (sujet et corps
--     de l'envoi), les tâches à faire.
--   · public.offload_fiche(p_compte) → jsonb : le compte, son signal, sa courbe (chiffre HT par mois sur 24 mois),
--     ses 60 dernières pièces, ses reprises (avec l'état de leurs envois) et ses tâches. Null s'il ne le voit pas.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

create or replace function public.offload_tableau(p_client uuid default null)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  with moi as (
    select coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid())
                                order by c.client_id limit 1)) as client_id
  ), comptes as (
    select c.*, s.niveau, s.score, s.priorite, s.avant_cloture, to_jsonb(s) - 'client_id' - 'entite_id' as signal
    from public.offload_comptes c
    left join public.offload_signaux s on s.compte_id = c.id
    where c.client_id = (select client_id from moi)
  )
  select jsonb_build_object(
    'client', (select client_id from moi),
    'reglages', (select to_jsonb(g) - 'installe_par' from public.offload_reglages g where g.client_id = (select client_id from moi)),
    'compteurs', jsonb_build_object(
      'eteint', (select count(*) from comptes where niveau = 'eteint' and statut = 'suivi'),
      'decroche', (select count(*) from comptes where niveau = 'decroche' and statut = 'suivi'),
      'saison', (select count(*) from comptes where niveau = 'saison' and statut = 'suivi'),
      'ralentit', (select count(*) from comptes where niveau = 'ralentit' and statut = 'suivi'),
      'ok', (select count(*) from comptes where niveau = 'ok'),
      'sans_achat', (select count(*) from comptes where niveau = 'sans_achat'),
      'avant_cloture', (select count(*) from comptes where avant_cloture and statut = 'suivi'),
      'comptes', (select count(*) from comptes),
      'a_valider', (select count(*) from public.offload_reprises p where p.client_id = (select client_id from moi)
                    and p.statut in ('a_valider', 'relance_a_valider')),
      'appels', (select count(*) from public.offload_taches t where t.client_id = (select client_id from moi)
                 and t.type = 'appel' and t.statut = 'a_faire'),
      'reponses', (select count(*) from public.offload_taches t where t.client_id = (select client_id from moi)
                   and t.type = 'repondre' and t.statut = 'a_faire')),
    'comptes', coalesce((
      select jsonb_agg(x.j order by x.rang, x.priorite desc nulls last, x.nom)
      from (
        select (to_jsonb(c) - 'signal' - 'niveau' - 'score' - 'priorite' - 'avant_cloture' - 'client_id')
               || jsonb_build_object('signal', c.signal,
                    'reprise', (select to_jsonb(p) - 'raisons' - 'client_id' from public.offload_reprises p
                                where p.compte_id = c.id order by p.cree_le desc limit 1)) as j,
               case when c.statut = 'suivi' and c.niveau in ('eteint', 'decroche', 'saison', 'ralentit') then 0
                    when c.niveau in ('eteint', 'decroche', 'saison', 'ralentit') then 1 else 2 end as rang,
               c.priorite, c.nom
        from comptes c
        order by 2, 3 desc nulls last, 4
        limit 500
      ) x), '[]'::jsonb),
    'a_valider', coalesce((
      select jsonb_agg(jsonb_build_object(
               'reprise', p.id, 'compte_id', p.compte_id, 'compte_nom', c.nom, 'statut', p.statut,
               'rang', case when p.statut = 'relance_a_valider' then 2 else 1 end,
               'envoi', e.id, 'demande', e.demande_id, 'mode', e.mode, 'destinataire', e.destinataire_adresse,
               'sujet', e.sujet, 'corps', e.corps, 'cree_le', p.maj_le) order by p.maj_le)
      from public.offload_reprises p
      join public.offload_comptes c on c.id = p.compte_id
      left join public.envois e on e.id = case when p.statut = 'relance_a_valider' then p.envoi2_id else p.envoi1_id end
      where p.client_id = (select client_id from moi) and p.statut in ('a_valider', 'relance_a_valider')), '[]'::jsonb),
    'taches', coalesce((
      select jsonb_agg((to_jsonb(t) - 'client_id') || jsonb_build_object('compte_nom', c.nom) order by t.echeance, t.cree_le)
      from public.offload_taches t join public.offload_comptes c on c.id = t.compte_id
      where t.client_id = (select client_id from moi) and t.statut = 'a_faire'), '[]'::jsonb))
$function$;

create or replace function public.offload_fiche(p_compte uuid)
 returns jsonb
 language plpgsql
 stable security invoker
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_jour date := (now() at time zone 'Europe/Paris')::date;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'compte', to_jsonb(c) - 'client_id',
    'signal', (select to_jsonb(s) - 'client_id' - 'entite_id' from public.offload_signaux s where s.compte_id = c.id),
    'mois', (select jsonb_agg(jsonb_build_object('mois', to_char(m.debut, 'YYYY-MM'), 'montant', coalesce(a.montant, 0),
                                                 'pieces', coalesce(a.pieces, 0)) order by m.debut)
             from generate_series(date_trunc('month', v_jour) - interval '23 months', date_trunc('month', v_jour), interval '1 month') m(debut)
             left join (select date_trunc('month', x.date_achat) as debut, sum(x.montant_ht) as montant, count(*) as pieces
                        from public.offload_achats x where x.compte_id = c.id and x.annule_le is null
                        group by 1) a on a.debut = m.debut),
    'achats', coalesce((select jsonb_agg(to_jsonb(x) - 'client_id' - 'entite_id' - 'cle' order by x.date_achat desc, x.cree_le desc)
                        from (select * from public.offload_achats a where a.compte_id = c.id
                              order by a.date_achat desc, a.cree_le desc limit 60) x), '[]'::jsonb),
    'nb_achats', (select count(*) from public.offload_achats a where a.compte_id = c.id and a.annule_le is null),
    'reprises', coalesce((select jsonb_agg((to_jsonb(p) - 'client_id') || jsonb_build_object(
                            'envoi1', (select jsonb_build_object('statut', e.statut, 'mode', e.mode, 'verrou', e.verrou, 'sujet', e.sujet)
                                       from public.envois e where e.id = p.envoi1_id),
                            'envoi2', (select jsonb_build_object('statut', e.statut, 'mode', e.mode, 'verrou', e.verrou, 'sujet', e.sujet)
                                       from public.envois e where e.id = p.envoi2_id)) order by p.cree_le desc)
                          from public.offload_reprises p where p.compte_id = c.id), '[]'::jsonb),
    'taches', coalesce((select jsonb_agg(to_jsonb(t) - 'client_id' order by t.statut = 'a_faire' desc, t.echeance desc)
                        from public.offload_taches t where t.compte_id = c.id), '[]'::jsonb));
end $function$;

revoke all on function public.offload_tableau(uuid) from public, anon;
revoke all on function public.offload_fiche(uuid) from public, anon;
grant execute on function public.offload_tableau(uuid) to authenticated, service_role;
grant execute on function public.offload_fiche(uuid) to authenticated, service_role;
