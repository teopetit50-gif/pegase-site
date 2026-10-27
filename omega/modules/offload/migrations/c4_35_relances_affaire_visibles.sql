-- c4_35 — OFFLOAD : les relances d'affaire se valident, et la suite attend leur départ (testeur T-OFFLOAD, TOFFLOAD-11 ;
-- session C4, 25/10/2026)
--
-- Écart (après c4_33) : la relance de retrait préparée en message n'apparaissait pas dans offload_tableau.a_valider ; le
-- cycle comptait « relancé » une relance qui attendait encore sa validation ; la seconde relance et la décision venaient
-- après le délai même si la première n'était jamais partie.
--   · offload_tableau.a_valider liste aussi les relances de retrait à valider (« affaire », rang 1 ou 2), et le compteur
--     a_valider les compte ;
--   · le cycle compte à part les relances préparées qui attendent une validation (« a_valider ») ; « relances_1 » et
--     « relances_2 » ne comptent que ce qui est parti (message parti ou tâche d'appel confiée à une personne) ;
--   · la seconde relance n'a lieu qu'après le départ de la première (message parti ou déposé en brouillon, ou relance
--     par une personne) ; la décision manuelle, qu'après le départ de la seconde.
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- Le cycle des affaires : la suite attend le départ ; « relancé » ne compte que ce qui est parti.
create or replace function private.offload_affaires_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau(p_client))::date);
  k record;
  n1 integer := 0; n2 integer := 0; nd integer := 0; ne integer := 0;
  -- Une affaire relancée pendant ce passage attend le suivant : jamais deux étapes d'un coup.
  v_debut timestamptz := clock_timestamp();
  v_appel text;
  v_issue text;
  nv integer := 0;
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  -- Sans message possible, la relance passe par une personne (c4_33) : jamais d'envoi hors essai, jamais d'arrêt muet.
  v_appel := case when private.offload_essai_contre_reel(p_client)
                    then 'OFFLOAD ne prépare aucun message : les envois du module ne sont pas réglés en essai'
                  when private.offload_suspendu(p_client) then 'OFFLOAD est suspendu' end;
  perform private.offload_chiffrer_affaires(p_client);
  -- 1. Première relance, après le délai fixé.
  -- Un rappel de retrait n'est pas une sollicitation commerciale : un compte inactif, ou déjà contacté, est prévenu
  -- quand même. Seuls l'arrêt demandé et la fiche fusionnée l'écartent ; un compte suivi en direct par un commercial
  -- ou sur une liste d'exclusion est prévenu par une personne (tâche d'appel), jamais par un message automatique.
  for k in select a.id, a.compte_id, private.offload_ecarte(a.compte_id) as raison from public.offload_affaires a
           where a.client_id = p_client and a.statut = 'en_attente' and a.disponible_le <= v_jour - g.delai_retrait_jours
           order by a.disponible_le loop
    if k.raison like 'Fiche fusionnée%' or k.raison like 'Retiré à sa demande%' then
      ne := ne + 1;
      continue;
    end if;
    begin
      v_issue := private.offload_relancer_affaire(k.id, 1,
        coalesce(case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' or k.raison like 'À vérifier%' then k.raison end, v_appel));
      if v_issue = 'message' and exists (select 1 from public.offload_affaires a3 join public.envois e3 on e3.id = a3.envoi1_id
                                         where a3.id = k.id and e3.statut = 'a_valider') then
        nv := nv + 1;
      else
        n1 := n1 + 1;
      end if;
    exception when others then
      ne := ne + 1;
    end;
  end loop;
  -- 2. Une seule autre, après le délai de relance.
  for k in select a.id, private.offload_ecarte(a.compte_id) as raison from public.offload_affaires a
           where a.client_id = p_client and a.statut = 'relancee_1' and (a.envoi1_id is null or exists (select 1 from public.envois e1 where e1.id = a.envoi1_id and e1.statut in ('envoye', 'brouillon_depose')))
             and (a.relance1_le at time zone private.offload_fuseau(p_client))::date <= v_jour - g.delai_relance_retrait_jours and a.relance1_le < v_debut loop
    begin
      v_issue := private.offload_relancer_affaire(k.id, 2,
        coalesce(case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' or k.raison like 'Retiré à sa demande%'
             or k.raison like 'Fiche fusionnée%' or k.raison like 'À vérifier%' then k.raison end, v_appel));
      if v_issue = 'message' and exists (select 1 from public.offload_affaires a3 join public.envois e3 on e3.id = a3.envoi2_id
                                         where a3.id = k.id and e3.statut = 'a_valider') then
        nv := nv + 1;
      else
        n2 := n2 + 1;
      end if;
    exception when others then
      ne := ne + 1;
    end;
  end loop;
  -- 3. Deux relances sans réponse : décision manuelle, montant immobilisé en regard.
  update public.offload_affaires a set statut = 'decision', maj_le = now(),
         motif = format('Relancé deux fois sans réponse : à décider (%s immobilisés depuis le %s).',
                        coalesce(private.offload_euros(a.valeur_ht), 'valeur inconnue'), private.offload_le(a.disponible_le))
   where a.client_id = p_client and a.statut = 'relancee_2' and (a.envoi2_id is null or exists (select 1 from public.envois e2 where e2.id = a.envoi2_id and e2.statut in ('envoye', 'brouillon_depose')))
     and (a.relance2_le at time zone private.offload_fuseau(p_client))::date <= v_jour - g.delai_relance_retrait_jours and a.relance2_le < v_debut;
  get diagnostics nd = row_count;
  if n1 + n2 + nd + nv > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.affaires', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne, 'a_valider', nv), null);
  end if;
  return jsonb_build_object('relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne, 'a_valider', nv);
end $function$;

-- Le tableau : les relances de retrait à valider figurent dans « à valider ».
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
    where c.client_id = (select client_id from moi) and c.fusionne_dans is null and c.efface_le is null
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
                    and p.statut in ('a_valider', 'relance_a_valider'))
                 + (select count(*) from public.offload_affaires a join public.envois e
                      on e.id = case when a.statut = 'relancee_2' then a.envoi2_id else a.envoi1_id end
                    where a.client_id = (select client_id from moi) and a.statut in ('relancee_1', 'relancee_2') and e.statut = 'a_valider'),
      'appels', (select count(*) from public.offload_taches t where t.client_id = (select client_id from moi)
                 and t.type = 'appel' and t.statut = 'a_faire'),
      'doublons', (select count(*) from public.offload_rapprochements x where x.client_id = (select client_id from moi)
                   and x.statut = 'propose'),
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
      where p.client_id = (select client_id from moi) and p.statut in ('a_valider', 'relance_a_valider')), '[]'::jsonb)
    || coalesce((
      select jsonb_agg(jsonb_build_object(
               'affaire', a.id, 'reference', a.reference, 'compte_id', a.compte_id, 'compte_nom', c.nom, 'statut', a.statut,
               'rang', case when a.statut = 'relancee_2' then 2 else 1 end,
               'envoi', e.id, 'demande', e.demande_id, 'mode', e.mode, 'destinataire', e.destinataire_adresse,
               'sujet', e.sujet, 'corps', e.corps, 'cree_le', a.maj_le) order by a.maj_le)
      from public.offload_affaires a
      join public.offload_comptes c on c.id = a.compte_id
      join public.envois e on e.id = case when a.statut = 'relancee_2' then a.envoi2_id else a.envoi1_id end
      where a.client_id = (select client_id from moi) and a.statut in ('relancee_1', 'relancee_2') and e.statut = 'a_valider'), '[]'::jsonb),
    'rapprochements', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'a', x.compte_a, 'a_nom', a.nom, 'a_ref', a.ref, 'b', x.compte_b, 'b_nom', b.nom,
                                          'b_ref', b.ref, 'raisons', x.raisons) order by x.cree_le)
      from public.offload_rapprochements x join public.offload_comptes a on a.id = x.compte_a join public.offload_comptes b on b.id = x.compte_b
      where x.client_id = (select client_id from moi) and x.statut = 'propose'), '[]'::jsonb),
    'exclusions', coalesce((
      select jsonb_agg(to_jsonb(e) - 'client_id' order by e.cree_le) from public.offload_exclusions e
      where e.client_id = (select client_id from moi) and e.levee_le is null), '[]'::jsonb),
    'taches', coalesce((
      select jsonb_agg((to_jsonb(t) - 'client_id') || jsonb_build_object('compte_nom', c.nom) order by t.echeance, t.cree_le)
      from public.offload_taches t join public.offload_comptes c on c.id = t.compte_id
      where t.client_id = (select client_id from moi) and t.statut = 'a_faire'), '[]'::jsonb))
$function$;

revoke execute on function private.offload_affaires_cycle(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_affaires_cycle(uuid, date) to service_role;
