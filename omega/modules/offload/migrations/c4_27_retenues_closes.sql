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
