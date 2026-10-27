-- c4_34 — OFFLOAD : les échéances des contrats à reconduction sont signalées à temps (session C4, 23/10/2026)
--
-- Promesses (omega/CHIFFRAGE/offload.md, C:73 et C:75) : l'échéance se signale avant de tomber ; les contrats qui
-- s'éteignent faute de reconduction sont signalés. Relevé du testeur (O10, banc …c4) : un contrat à reconduction TACITE
-- au 20/12 n'apparaissait nulle part (offload_echeances_tableau vide), alors que son échéance existe.
--   · Le tableau des échéances montre l'échéance de TOUT contrat actif qui tombe dans les 60 jours, avec une phrase :
--     tacite → « se reconduit tacitement le … : rien à faire, sauf si le client veut l'arrêter » ; expresse ou aucune →
--     le signal « s'éteint » déjà posé par le cycle (c4_07), qui reste montré tant qu'il n'est pas clos.
--   · Le jour de référence est celui du fuseau de l'organisation (c4_31).
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- Le tableau des échéances : les contrats à reconduction tacite y figurent aussi, 60 jours avant.
create or replace function public.offload_echeances_tableau(p_client uuid default null)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  with moi as (
    select coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid()) order by c.client_id limit 1)) as client_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', h.id, 'type', h.type, 'nature', h.nature, 'due_le', h.due_le, 'base_le', h.base_le, 'statut', h.statut,
           's_eteint', h.s_eteint, 'motif', h.motif, 'compte_id', h.compte_id, 'compte_nom', k.nom,
           'equipement', case when q.id is not null then jsonb_build_object('id', q.id, 'ref', q.ref, 'designation', q.designation,
                                                                            'site', q.site, 'type_entretien', q.type_entretien) end,
           'contrat', case when t.id is not null then jsonb_build_object('id', t.id, 'numero', t.numero, 'libelle', t.libelle,
                                                                         'reconduction', t.reconduction) end,
           'phrase', case when h.type = 'contrat' and t.reconduction = 'tacite'
                            then format('Le contrat %s se reconduit tacitement le %s : rien à faire, sauf si le client veut l''arrêter.',
                                        t.numero, to_char(h.due_le, 'DD/MM/YYYY'))
                          when h.type = 'contrat' then coalesce(h.motif, format('Le contrat %s prend fin le %s.', t.numero, to_char(h.due_le, 'DD/MM/YYYY'))) end)
           order by h.due_le, h.nature desc), '[]'::jsonb)
  from public.offload_echeances h
  join public.offload_comptes k on k.id = h.compte_id
  left join public.offload_equipements q on q.id = h.equipement_id
  left join public.offload_contrats t on t.id = h.contrat_id
  where h.client_id = (select client_id from moi)
    and ((h.type = 'entretien' and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee')
          and h.due_le <= (now() at time zone private.offload_fuseau((select client_id from moi)))::date + 60)
         or (h.type = 'contrat' and h.statut <> 'close'
             and (h.s_eteint or (t.statut = 'actif' and h.due_le >= (now() at time zone private.offload_fuseau((select client_id from moi)))::date
                                 and h.due_le <= (now() at time zone private.offload_fuseau((select client_id from moi)))::date + 60))))
$function$;
