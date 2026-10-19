-- FILED, lot 47 (a4_55) — le ticket de caisse sans fournisseur identifié (chiffrage n° 10 : « ticket de caisse
-- froissé » ; « rattachement d'un ticket à une dépense sans fournisseur identifié : à préciser »).
--
-- Un ticket se lit comme une facture, mais n'a souvent ni SIREN, ni TVA, ni numéro lisibles : il restait bloqué
-- (« à compléter : le fournisseur, le numéro »). Désormais, avant les contrôles :
--   · une pièce est un ticket si le lecteur l'a dit (pieces.type_piece : ticket, ticket_caisse, ticket_de_caisse,
--     recu) ou si, sans fournisseur identifié, son montant ne dépasse pas le seuil des mentions (150 € HT par défaut,
--     filed_reglages.seuil_mentions_ht — le seuil de la facture simplifiée) ; un avoir n'en est jamais un ;
--   · le ticket est rangé chez le fournisseur « Tickets de caisse » de l'organisation (code TICKETS, actif, créé au
--     premier ticket) ; le nom du commerçant lu reste sur la facture (fournisseur_lu) ; sans numéro lisible, il prend
--     le numéro de réception (TICKET-R2026-000123) ;
--   · le doublon « probable » (même fournisseur, même montant, à quelques jours) ne vaut pas entre tickets : deux cafés
--     à 3,50 € ne sont pas une même facture ; le doublon exact (même numéro) vaut toujours ;
--   · une personne peut dire qu'une pièce est ou n'est pas un ticket (filed_marquer_ticket) ; la facture est recontrôlée.
-- Le reste ne change pas : catégorie (a4_47), note de frais (a4_35), contrôles des montants et de la TVA.
-- Branchements par repère dans private.filed_controler_facture (texte d'a4_11). Migration idempotente ; aucun DROP,
-- aucune suppression ; aucun envoi.

alter table public.filed_factures add column if not exists est_ticket boolean not null default false;
alter table public.filed_factures add column if not exists ticket_force boolean;   -- le choix d'une personne : vrai, faux, ou nul

-- Le fournisseur « Tickets de caisse » de l'organisation, créé au besoin.
create or replace function private.filed_fournisseur_tickets(p_client uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_id uuid;
begin
  select f.id into v_id from public.filed_fournisseurs f where f.client_id = p_client and f.code = 'TICKETS';
  if v_id is null then
    insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source)
    values (p_client, 'TICKETS', 'Tickets de caisse', 'tickets de caisse', 'FR', 'actif', 'saisie')
    on conflict do nothing
    returning id into v_id;
    if v_id is null then
      select f.id into v_id from public.filed_fournisseurs f where f.client_id = p_client and f.code = 'TICKETS';
    end if;
  end if;
  return v_id;
end $$;
revoke all on function private.filed_fournisseur_tickets(uuid) from public, anon, authenticated;
grant execute on function private.filed_fournisseur_tickets(uuid) to service_role;

-- Reconnaître un ticket et le ranger. Rend vrai si la facture a changé.
create or replace function private.filed_reconnaitre_ticket(p_facture uuid)
returns boolean language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_doc public.filed_documents; v_type text; v_seuil numeric; v_ticket boolean; v_four uuid;
        v_tickets uuid;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found or v_f.nature <> 'facture' then return false; end if;
  select * into v_doc from public.filed_documents where id = v_f.document_id;
  select lower(p.type_piece) into v_type from public.pieces p where p.id = v_doc.piece_id;
  v_seuil := coalesce((private.filed_reglage(v_f.client_id, v_f.entite_id)).seuil_mentions_ht, 150);
  v_tickets := (select f.id from public.filed_fournisseurs f where f.client_id = v_f.client_id and f.code = 'TICKETS');
  v_ticket := case
    when v_f.ticket_force is not null then v_f.ticket_force
    when v_f.fournisseur_id is not null and v_f.fournisseur_id is distinct from v_tickets then false   -- un fournisseur identifié l'emporte
    when v_type in ('ticket', 'ticket_caisse', 'ticket_de_caisse', 'recu') then true
    when coalesce(v_f.montant_ht, v_f.montant_ttc) is not null and coalesce(v_f.montant_ht, v_f.montant_ttc) <= v_seuil then true
    else false end;
  if v_ticket = v_f.est_ticket and (not v_ticket or v_f.fournisseur_id is not null) then return false; end if;
  if v_ticket then
    v_four := coalesce(case when v_f.fournisseur_id is distinct from v_tickets and v_f.ticket_force then v_f.fournisseur_id end,
                       case when v_f.fournisseur_id is null or v_f.fournisseur_id = v_tickets then private.filed_fournisseur_tickets(v_f.client_id) end,
                       v_f.fournisseur_id);
    update public.filed_factures
       set est_ticket = true, fournisseur_id = v_four,
           numero = coalesce(numero, 'TICKET-' || v_doc.reference),
           numero_normalise = coalesce(numero_normalise, upper(regexp_replace('TICKET-' || v_doc.reference, '[^A-Za-z0-9]', '', 'g')))
     where id = v_f.id;
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'ticket',
      format('Ticket de caisse%s : rangé chez « Tickets de caisse »%s.',
             coalesce(' (' || nullif(v_f.fournisseur_lu ->> 'nom', '') || ')', ''),
             case when v_f.numero is null then ', numéroté par sa réception' else '' end),
      jsonb_build_object('type_lu', v_type, 'seuil_ht', v_seuil, 'force', v_f.ticket_force));
  else
    update public.filed_factures
       set est_ticket = false, fournisseur_id = case when fournisseur_id = v_tickets then null else fournisseur_id end
     where id = v_f.id;
  end if;
  return true;
end $$;
revoke all on function private.filed_reconnaitre_ticket(uuid) from public, anon, authenticated;
grant execute on function private.filed_reconnaitre_ticket(uuid) to service_role;

-- Une personne dit qu'une pièce est (ou n'est pas) un ticket ; nul rend la main à la machine.
create or replace function private.filed_marquer_ticket(p_facture uuid, p_ticket boolean)
returns text language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  perform private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'], v_f.entite_id);
  if v_f.statut not in ('a_completer', 'bloquee', 'a_valider') then
    raise exception 'Cette facture est % : elle ne change plus de nature.', v_f.statut using errcode = '55000';
  end if;
  update public.filed_factures set ticket_force = p_ticket where id = v_f.id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'ticket',
    case when p_ticket is null then 'Une personne rend à FILED le choix ticket / facture.'
         when p_ticket then 'Une personne dit : c''est un ticket de caisse.'
         else 'Une personne dit : ce n''est pas un ticket de caisse.' end, jsonb_build_object('force', p_ticket));
  return private.filed_controler_facture(v_f.id);
end $$;
revoke all on function private.filed_marquer_ticket(uuid, boolean) from public, anon;
grant execute on function private.filed_marquer_ticket(uuid, boolean) to authenticated, service_role;
create or replace function public.filed_marquer_ticket(p_facture uuid, p_ticket boolean)
returns text language sql set search_path to '' as $$ select private.filed_marquer_ticket(p_facture, p_ticket) $$;
comment on function public.filed_marquer_ticket(uuid, boolean) is
  'Lot 47 (a4_55) : dit qu''une pièce est un ticket de caisse (vrai), n''en est pas un (faux), ou laisse FILED juger (nul) ; la facture est recontrôlée. Membres (hors lecteur).';
revoke all on function public.filed_marquer_ticket(uuid, boolean) from public, anon;
grant execute on function public.filed_marquer_ticket(uuid, boolean) to authenticated, service_role;

-- Les branchements dans private.filed_controler_facture (texte d'a4_11, par repère).
do $do$
declare
  r record; v_def text; v_n integer; v_change boolean := false;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  for r in select * from (values
    ($o1$  if private.filed_completer_fournisseur_lu(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
$o1$,
     $n1$  if private.filed_completer_fournisseur_lu(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
  -- a4_55 : un ticket de caisse sans fournisseur identifié est rangé chez « Tickets de caisse ».
  if private.filed_reconnaitre_ticket(v_f.id) then
    select * into v_f from public.filed_factures where id = v_f.id;
  end if;
$n1$),
    ($o2$      and e.fournisseur_id = v_f.fournisseur_id and e.montant_ttc = v_f.montant_ttc
$o2$,
     $n2$      and e.fournisseur_id = v_f.fournisseur_id and e.montant_ttc = v_f.montant_ttc
      and not v_f.est_ticket   -- a4_55 : deux tickets au même montant ne sont pas une même facture
$n2$)
  ) t(ancien, nouveau)
  loop
    if position(r.nouveau in v_def) > 0 then continue; end if;
    v_n := (length(v_def) - length(replace(v_def, r.ancien, ''))) / length(r.ancien);
    if v_n <> 1 then
      raise exception 'a4_55 : repère trouvé % fois au lieu d''une dans private.filed_controler_facture. Rien n''est posé.', v_n;
    end if;
    v_def := replace(v_def, r.ancien, r.nouveau);
    v_change := true;
  end loop;
  if v_change then
    execute v_def;
    raise notice 'a4_55 : private.filed_controler_facture branchée.';
  else
    raise notice 'a4_55 : private.filed_controler_facture déjà branchée.';
  end if;
end $do$;
