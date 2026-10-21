-- c3_31 — REPUT, correctif TREPUT-06 (série 1 du testeur) : le point du matin compte ce qui attend vraiment une décision
-- (session C3, 21/10/2026)
--
-- Constat : private.reput_point_matin_lignes(banc-test, 21/10) disait « En attente de votre validation : 0 » alors qu'une
-- quinzaine de validations REPUT de ce client attendaient dans demandes_validation : les demandes étaient « bloquées » (pas
-- de réglage d'envoi) et l'entête ne comptait que les demandes « à valider ».
--   · « En attente de votre validation » = les demandes de validation REPUT en attente (non échues) dans la file du socle ;
--   · les demandes bloquées à l'envoi sont dites à part : « Bloquées à l'envoi (réglage d'envoi à vérifier) : n » ;
--     « À traiter vous-même » ne compte plus que les demandes à traiter ;
--   · le jour (hier, sept jours, devis de plus de deux jours) se prend au fuseau de l'organisation (private.reput_fuseau),
--     plus en dur à Paris (remarque du coordinateur avec TREPUT-07).
-- Reprise de c3_10, ces seuls changements. Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function private.reput_point_matin_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_fz text := private.reput_fuseau(p_client, null);   -- c3_31 : le jour au fuseau de l'organisation
  v_debut timestamptz := (p_jour - 1)::timestamp at time zone v_fz;
  v_fin timestamptz := p_jour::timestamp at time zone v_fz;
  v_recues integer; v_repondues integer; v_seules integer; v_attente integer; v_traiter integer; v_bloquees integer;
  v_items jsonb := '[]'::jsonb;
  r record;
  v_n integer := 0;
begin
  select count(*), count(*) filter (where d.statut = 'envoyee'),
         count(*) filter (where d.statut = 'envoyee' and exists (select 1 from public.reput_reponses p
                                                                 join public.demandes_validation v on v.id = p.demande_validation_id
                                                                 where p.demande_id = d.id and v.politique_id is not null))
    into v_recues, v_repondues, v_seules
  from public.reput_demandes d where d.client_id = p_client and d.recu_le >= v_debut and d.recu_le < v_fin;
  -- c3_31 (TREPUT-06) : « en attente de votre validation » = ce qui attend vraiment une décision dans la file REPUT
  -- (réponses, accusés, rappels, accords), quel que soit l'état de la demande — une réponse bloquée à l'envoi y attend aussi.
  select count(*) into v_attente from public.demandes_validation v
  where v.client_id = p_client and v.module = 'reput' and v.statut = 'en_attente' and v.echeance > now();
  select count(*) filter (where d.statut = 'a_traiter'), count(*) filter (where d.statut = 'bloquee')
    into v_traiter, v_bloquees
  from public.reput_demandes d where d.client_id = p_client and d.statut in ('a_traiter', 'bloquee');
  if v_recues = 0 and v_attente = 0 and v_traiter = 0 and v_bloquees = 0 then
    return '[]'::jsonb;
  end if;
  v_items := v_items || jsonb_build_object(
    'texte', format('Hier : %s demande%s reçue%s, %s répondue%s%s. En attente de votre validation : %s. À traiter vous-même : %s.%s',
                    v_recues, case when v_recues > 1 then 's' else '' end, case when v_recues > 1 then 's' else '' end,
                    v_repondues, case when v_repondues > 1 then 's' else '' end,
                    case when v_seules > 0 then format(' (dont %s partie%s seule%s par accord)', v_seules,
                                                       case when v_seules > 1 then 's' else '' end, case when v_seules > 1 then 's' else '' end) else '' end,
                    v_attente, v_traiter,
                    case when v_bloquees > 0 then format(' Bloquée%s à l''envoi (réglage d''envoi à vérifier) : %s.',
                                                         case when v_bloquees > 1 then 's' else '' end, v_bloquees) else '' end),
    'gravite', case when v_traiter > 0 or v_attente > 0 or v_bloquees > 0 then 'attention' else 'info' end,
    'lien', '/espace2/reput');
  for r in
    select d.*, s.libelle from public.reput_demandes d
    left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
    where d.client_id = p_client and d.statut in ('a_traiter', 'bloquee', 'a_valider')
    order by d.urgence desc, (d.statut in ('a_traiter', 'bloquee')) desc, d.recu_le
  loop
    exit when v_n >= 30;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s%s — %s : %s', case when r.urgence then 'URGENT · ' else '' end,
                           coalesce(nullif(btrim(r.de_nom), ''), 'Client'), coalesce(r.libelle, 'demande'),
                           case r.statut when 'a_valider' then 'réponse prête, à valider'
                                         when 'bloquee' then 'réponse bloquée, à traiter'
                                         else 'à traiter vous-même' end), 300),
      'gravite', case when r.urgence or r.statut <> 'a_valider' then 'attention' else 'info' end,
      'lien', '/espace2/reput?demande=' || r.id::text, 'objet_type', 'reput_demandes', 'objet_id', r.id::text);
    v_n := v_n + 1;
  end loop;
  -- c3_05 : les devis demandés qui attendent encore une réponse (la relance d'un devis demandé).
  for r in
    select d.* from public.reput_demandes d
    where d.client_id = p_client and d.sujet = 'devis' and d.statut not in ('envoyee', 'refusee', 'ignoree')
      and d.recu_le < (p_jour - 2)::timestamp at time zone v_fz
    order by d.recu_le
  loop
    exit when v_n >= 40;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('Devis demandé par %s il y a %s jours : toujours sans réponse, relancez votre équipe',
                           coalesce(nullif(btrim(r.de_nom), ''), 'un client'),
                           (p_jour - (r.recu_le at time zone v_fz)::date)), 300),
      'gravite', 'attention', 'lien', '/espace2/reput?demande=' || r.id::text, 'objet_type', 'reput_demandes', 'objet_id', r.id::text);
    v_n := v_n + 1;
  end loop;
  -- c3_06 : les sujets qui reviennent hors de la base sur sept jours nourrissent la base (« ajoutez une fiche »).
  for r in
    select coalesce(s.libelle, d.sujet) as libelle, count(*) as n
    from public.reput_demandes d
    left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
    where d.client_id = p_client and d.couverte is false and d.sujet is not null
      and d.sujet <> all (private.reput_sujets_proteges())
      and d.recu_le >= (p_jour - 7)::timestamp at time zone v_fz
    group by 1 having count(*) >= 2
    order by 2 desc limit 5
  loop
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s questions hors de votre base cette semaine sur « %s » : ajoutez une fiche, elles partiront tirées de la base',
                           r.n, r.libelle), 300),
      'gravite', 'info', 'lien', '/espace2/reput');
  end loop;
  return v_items;
end $function$;
