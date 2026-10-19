-- Tests A4 — lot 47 (a4_55) : le ticket de caisse sans fournisseur identifié. Données fictives.
-- pgTAP, schéma « tests » d'A5 ; utilise tests.a4_organisation, tests.a4_facture (a4_10_facture_electronique.sql) et
-- tests.a4_comme (a4_26_sortie_envois.sql), à poser avant. Ce fichier ne supprime rien.

-- Une pièce lue sans fournisseur identifié ni numéro, au montant donné ; p_type : ce que le lecteur a dit de la pièce.
create or replace function tests.a4_ticket(p_org jsonb, p_ttc numeric, p_type text default null, p_nom text default 'Café d''exemple')
returns jsonb language plpgsql as $$
declare fa jsonb := tests.a4_facture(p_org, 'ia', 'TMP-' || gen_random_uuid()::text, p_ttc);
begin
  update public.filed_factures set fournisseur_id = null, numero = null, numero_normalise = null,
         fournisseur_lu = jsonb_build_object('nom', p_nom), fournisseur_identification = null
   where id = (fa ->> 'facture')::uuid;
  if p_type is not null then update public.pieces set type_piece = p_type where id = (fa ->> 'piece')::uuid; end if;
  return fa;
end $$;

create or replace function tests.test_a4_55_01_tickets() returns setof text
language plpgsql as $f$
declare o jsonb := tests.a4_organisation(); v_cl uuid := (o ->> 'client')::uuid; a jsonb; b jsonb; c jsonb; d jsonb; s text; f public.filed_factures;
begin
  -- Un petit ticket sans fournisseur : rangé chez « Tickets de caisse », numéroté par sa réception, plus bloqué pour cela.
  a := tests.a4_ticket(o, 4.20);
  s := private.filed_controler_facture((a ->> 'facture')::uuid);
  select * into f from public.filed_factures where id = (a ->> 'facture')::uuid;
  return next ok(f.est_ticket and (select code from public.filed_fournisseurs where id = f.fournisseur_id) = 'TICKETS',
                 'Un ticket de 4,20 € est rangé chez « Tickets de caisse »');
  return next ok(f.numero like 'TICKET-R%' and f.fournisseur_lu ->> 'nom' = 'Café d''exemple', 'numéroté par sa réception ; le commerçant lu reste');
  return next is((select resultat from public.filed_controles where facture_id = f.id and code = 'lecture.complete'), 'ok', 'plus « à compléter : le fournisseur »');
  return next is((select resultat from public.filed_controles where facture_id = f.id and code = 'fournisseur.a_confirmer'), 'ok', 'le fournisseur des tickets est actif');

  -- Un second ticket au même montant, le même jour : pas un doublon probable.
  b := tests.a4_ticket(o, 4.20);
  perform private.filed_controler_facture((b ->> 'facture')::uuid);
  return next ok(not exists (select 1 from public.filed_controles where facture_id = (b ->> 'facture')::uuid and code like 'doublon.%' and resultat = 'anomalie'),
                 'Deux tickets au même montant ne sont pas un doublon');
  return next is((select count(*) from public.filed_fournisseurs where client_id = v_cl and code = 'TICKETS'), 1::bigint, 'un seul fournisseur des tickets');

  -- 900 € sans fournisseur : pas un ticket, reste à compléter.
  c := tests.a4_ticket(o, 900);
  perform private.filed_controler_facture((c ->> 'facture')::uuid);
  return next ok((select not est_ticket and fournisseur_id is null from public.filed_factures where id = (c ->> 'facture')::uuid)
                 and (select resultat from public.filed_controles where facture_id = (c ->> 'facture')::uuid and code = 'lecture.complete') = 'anomalie',
                 'Au-delà du seuil, sans fournisseur : pas un ticket, à compléter');

  -- 250 € que le lecteur dit être un ticket : ticket.
  d := tests.a4_ticket(o, 250, 'ticket_caisse', 'Station-service d''exemple');
  perform private.filed_controler_facture((d ->> 'facture')::uuid);
  return next ok((select est_ticket from public.filed_factures where id = (d ->> 'facture')::uuid), 'Le lecteur dit « ticket » : ticket, quel que soit le montant');

  -- Une personne dit que la facture de 900 € est un ticket, puis rend la main.
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  perform public.filed_marquer_ticket((c ->> 'facture')::uuid, true);
  reset role;
  return next ok((select est_ticket from public.filed_factures where id = (c ->> 'facture')::uuid), 'Une personne peut dire : c''est un ticket');
  reset role; perform tests.a4_comme((o ->> 'valideur')::uuid);
  perform public.filed_marquer_ticket((c ->> 'facture')::uuid, false);
  reset role;
  return next ok((select not est_ticket and fournisseur_id is null from public.filed_factures where id = (c ->> 'facture')::uuid),
                 'ou : ce n''en est pas un (il quitte « Tickets de caisse »)');
end $f$;
