-- FILED, lot 15 (a4_23) — le rapprochement commande, réception et facture se refait quand la pièce manquante arrive.
--
-- Audit des promesses (§ 2 FILED, n° 4 ; factures.ts ligne 59). Le rapprochement à trois existe déjà : lot F3 du socle
-- (private.filed_rapprocher_facture), et private.filed_rapprocher_ligne (a4_08) qui compare prix, quantité, déjà facturé
-- et NON REÇU, avec les réglages filed_reglages.commande_exigee / commande_exigee_des_ht / reception_exigee (le non-reçu
-- devient bloquant quand la réception est exigée). Ce qui manquait : une facture arrivée AVANT son bon de livraison (ou
-- avant sa commande) restait bloquée, car rien ne la recontrôlait à l'arrivée de la pièce manquante.
--
-- Ce lot pose deux déclencheurs (par instruction, avec la table de transition) :
--   · à l'enregistrement de lignes de réception (filed_receptions_lignes), ou au changement de statut d'une réception :
--     les factures de la commande concernée, encore « à compléter », « bloquée » ou « à valider », sont recontrôlées ;
--   · à l'arrivée d'une commande (filed_commandes) : les factures ouvertes (même « à valider ») qui la citent
--     (refs.commande), et les factures bloquées ou à compléter du même fournisseur encore sans commande ;
--   · à l'arrivée de lignes de commande (filed_commandes_lignes, saisies ou importées après l'en-tête) : les factures
--     ouvertes déjà rattachées à cette commande, ou qui la citent sans y être encore rattachées.
-- Le recontrôle est celui de toujours (private.filed_controler_facture) : il pose commande_id, refait le rapprochement,
-- recalcule le statut, et dépose la demande de validation si la facture devient « à valider ».
-- Migration idempotente ; aucune suppression.

create or replace function private.filed_recontroler_factures(p_factures uuid[], p_raison text)
returns integer language plpgsql security definer set search_path to '' as $$
declare v_id uuid; v_n integer := 0; v_f public.filed_factures;
begin
  for v_id in select distinct x from unnest(coalesce(p_factures, '{}')) x loop
    select * into v_f from public.filed_factures where id = v_id;
    if not found or v_f.statut not in ('a_completer', 'bloquee', 'a_valider') then continue; end if;
    begin
      perform private.filed_controler_facture(v_id);
      perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'recontrolee',
        'Recontrôlée : ' || p_raison || '.', jsonb_build_object('raison', p_raison));
      v_n := v_n + 1;
    exception when others then
      raise warning 'FILED : facture % non recontrôlée (%)', v_id, sqlerrm;
    end;
  end loop;
  return v_n;
end $$;
comment on function private.filed_recontroler_factures(uuid[], text) is
  'Lot 15 (a4_23) : recontrôle des factures encore ouvertes (à compléter, bloquée, à valider) quand une pièce du rapprochement arrive.';
revoke all on function private.filed_recontroler_factures(uuid[], text) from public, anon, authenticated;

-- Réception enregistrée (lignes ajoutées) : les factures de la commande.
create or replace function private.filed_reception_arrivee()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_factures uuid[];
begin
  select coalesce(array_agg(distinct f.id), '{}') into v_factures
    from nouvelles n
    join public.filed_commandes_lignes cl on cl.id = n.commande_ligne_id
    join public.filed_factures f on f.commande_id = cl.commande_id
   where f.statut in ('a_completer', 'bloquee', 'a_valider');
  perform private.filed_recontroler_factures(v_factures, 'la marchandise commandée a été reçue');
  return null;
end $$;
revoke all on function private.filed_reception_arrivee() from public, anon, authenticated;
create or replace trigger filed_receptions_lignes_recontrole
  after insert on public.filed_receptions_lignes
  referencing new table as nouvelles
  for each statement execute function private.filed_reception_arrivee();

-- Réception dont le statut change (enregistrée, annulée) : les factures de sa commande.
create or replace function private.filed_reception_changee()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_factures uuid[];
begin
  select coalesce(array_agg(distinct f.id), '{}') into v_factures
    from nouvelles n
    join anciennes a on a.id = n.id and a.statut is distinct from n.statut
    join public.filed_factures f on f.commande_id = n.commande_id
   where f.statut in ('a_completer', 'bloquee', 'a_valider');
  perform private.filed_recontroler_factures(v_factures, 'une réception de la commande a changé');
  return null;
end $$;
revoke all on function private.filed_reception_changee() from public, anon, authenticated;
create or replace trigger filed_receptions_recontrole
  after update on public.filed_receptions
  referencing new table as nouvelles old table as anciennes
  for each statement execute function private.filed_reception_changee();

-- Commande arrivée : les factures ouvertes qui la citent ; les bloquées ou à compléter du même fournisseur sans commande.
create or replace function private.filed_commande_arrivee()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_factures uuid[];
begin
  select coalesce(array_agg(distinct f.id), '{}') into v_factures
    from nouvelles c
    join public.filed_factures f on f.client_id = c.client_id
   where f.commande_id is null
     and (f.fournisseur_id is not distinct from c.fournisseur_id or c.fournisseur_id is null)
     and (f.statut in ('a_completer', 'bloquee', 'a_valider')
          and upper(regexp_replace(coalesce(f.refs ->> 'commande', ''), '[^A-Za-z0-9]', '', 'g')) = c.numero_normalise
          or f.statut in ('a_completer', 'bloquee') and c.fournisseur_id is not null and f.fournisseur_id = c.fournisseur_id);
  perform private.filed_recontroler_factures(v_factures, 'la commande est arrivée');
  return null;
end $$;
revoke all on function private.filed_commande_arrivee() from public, anon, authenticated;
create or replace trigger filed_commandes_recontrole
  after insert on public.filed_commandes
  referencing new table as nouvelles
  for each statement execute function private.filed_commande_arrivee();

-- Lignes de commande arrivées après l'en-tête : les factures ouvertes rattachées à la commande ou qui la citent.
create or replace function private.filed_commande_lignes_arrivees()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_factures uuid[];
begin
  select coalesce(array_agg(distinct f.id), '{}') into v_factures
    from (select distinct commande_id from nouvelles) n
    join public.filed_commandes c on c.id = n.commande_id
    join public.filed_factures f on f.client_id = c.client_id
   where f.statut in ('a_completer', 'bloquee', 'a_valider')
     and (f.commande_id = c.id
          or f.commande_id is null
             and (f.fournisseur_id is not distinct from c.fournisseur_id or c.fournisseur_id is null)
             and upper(regexp_replace(coalesce(f.refs ->> 'commande', ''), '[^A-Za-z0-9]', '', 'g')) = c.numero_normalise);
  perform private.filed_recontroler_factures(v_factures, 'les lignes de la commande sont arrivées');
  return null;
end $$;
revoke all on function private.filed_commande_lignes_arrivees() from public, anon, authenticated;
create or replace trigger filed_commandes_lignes_recontrole
  after insert on public.filed_commandes_lignes
  referencing new table as nouvelles
  for each statement execute function private.filed_commande_lignes_arrivees();
