-- CASHD — c2_06 : les réponses reçues lues et proposées (contestation, contact parti, promesse), tranchées par une
-- personne ; les pièces jointes aux factures et le dossier d'assurance-crédit.
-- Sur le banc (client cccccccc-0000-4000-8000-00000000000c), dans une transaction annulée. Aucune réception ni aucun
-- envoi n'est écrit dans les tables du socle : la réponse passe par private.cashd_noter_reponse, que
-- private.cashd_suivre_reception appelle pour chaque réponse réelle.

create or replace function tests.test_c2_06_reponses() returns setof text
language plpgsql as $f$
declare
  banc jsonb; v_client uuid; v_gerant uuid; v_collab uuid; p jsonb; j date := tests.c2_jour();
  r_sci public.cashd_relances; r_hotel public.cashd_relances; v_r jsonb; x public.cashd_reponses_lues; v_d jsonb;
begin
  banc := tests.c2_banc();
  v_client := (banc ->> 'client')::uuid; v_gerant := (banc ->> 'gerant')::uuid;
  perform tests.redevenir_admin();
  perform public.cashd_installer(v_client);
  v_collab := tests.c2_compte(v_client, 'collaborateur', 'c2-reponses-collab@banc-varelo.test');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  p := tests.c2_portefeuille();
  perform tests.redevenir_admin();
  perform private.cashd_preparer_relances(v_client, j + 1, null);
  select * into r_sci from public.cashd_relances z where z.compte_id = (p ->> 'sci')::uuid and z.jour = j + 1 and z.nature = 'facture';
  select * into r_hotel from public.cashd_relances z where z.compte_id = (p ->> 'hotel')::uuid and z.jour = j + 1 and z.nature = 'facture';

  -- ── La lecture ──
  return next is((select string_agg(private.cashd_lire_reponse(t) ->> 'lecture', ',' order by o) from unnest(array[
                    'Bonjour, Mme Martin ne fait plus partie de la société depuis le 1er octobre.',
                    'Nous contestons cette facture : les travaux ne sont pas terminés.',
                    'Le virement a été effectué ce matin.',
                    'Nous réglerons fin du mois.',
                    'Nous ne réglerons pas cette facture.',
                    'We dispute this invoice, the amount is wrong.',
                    'Payment was sent yesterday.',
                    'Bien reçu, merci.']) with ordinality u(t, o)),
                 'absence,contestation,promesse,promesse,contestation,contestation,promesse,autre',
                 'Une réponse se lit en français et en anglais : contact parti, contestation, promesse de paiement, ou autre');

  -- ── Une contestation : proposée, jamais appliquée seule ──
  v_r := private.cashd_noter_reponse(r_sci.id, 900001, 'RE: rappel', 'Bonjour, nous contestons la facture F-2026-101 : les travaux ne sont pas terminés.');
  select * into x from public.cashd_reponses_lues y where y.reception_id = 900001;
  return next ok(x.lecture = 'contestation' and x.proposition = 'litige' and x.statut = 'proposee' and x.indice = 'contestons'
                 and (select f.statut from public.cashd_factures f where f.id = (p ->> 'f1')::uuid) = 'ouverte',
                 'La contestation devient une proposition de litige ; la facture reste ouverte tant que personne n''a tranché');
  perform private.cashd_noter_reponse(r_sci.id, 900001, 'RE: rappel', 'nous contestons');
  return next is((select count(*)::int from public.cashd_reponses_lues y where y.reception_id = 900001), 1, 'Une réponse n''est notée qu''une fois');
  return next ok(exists (select 1 from jsonb_array_elements(public.cashd_fiche_compte((p ->> 'sci')::uuid) -> 'reponses_lues') y where y ->> 'id' = x.id::text),
                 'La fiche du compte montre la réponse à trancher');
  perform tests.endosser(v_collab, 'c2-reponses-collab@banc-varelo.test');
  return next throws_ok(format('select public.cashd_trancher_reponse(%L, true, null)', x.id), '42501', null, 'Un collaborateur ne tranche pas');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  v_r := public.cashd_trancher_reponse(x.id, true, null);
  perform tests.redevenir_admin();
  return next ok(v_r ->> 'statut' = 'acceptee' and (select f.statut from public.cashd_factures f where f.id = (p ->> 'f1')::uuid) = 'litige'
                 and (select y.statut from public.cashd_relances y where y.id = r_sci.id) = 'coupee',
                 'Acceptée : la facture passe en litige, sa relance prête est coupée');
  return next ok(exists (select 1 from public.journal_opposable jj where jj.client_id = v_client and jj.action = 'cashd.reponse_tranchee'
                         and jj.donnees ->> 'reponse' = x.id::text and (jj.donnees ->> 'acceptee')::boolean),
                 'La décision reste au journal');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  return next throws_ok(format('select public.cashd_trancher_reponse(%L, false, null)', x.id), '55000', null, 'Une réponse tranchée ne se retranche pas');

  -- ── Le contact parti, écarté ; la promesse, acceptée ──
  perform tests.redevenir_admin();
  perform private.cashd_noter_reponse(r_hotel.id, 900002, 'Absence', 'M. Durand a quitté l''entreprise ; écrivez à la direction.');
  select * into x from public.cashd_reponses_lues y where y.reception_id = 900002;
  return next ok(x.lecture = 'absence' and x.proposition = 'attente_contact', 'Le contact parti propose la mise en attente de contact');
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_trancher_reponse(x.id, false, 'Il a été remplacé, la nouvelle adresse est déjà sur la fiche');
  return next is((select c.statut from public.cashd_comptes c where c.id = (p ->> 'hotel')::uuid), 'actif', 'Écartée, la proposition ne change rien');
  perform tests.redevenir_admin();
  perform private.cashd_noter_reponse(r_hotel.id, 900003, 'Règlement', 'Le chèque est parti hier.');
  select * into x from public.cashd_reponses_lues y where y.reception_id = 900003;
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  perform public.cashd_trancher_reponse(x.id, true, null);
  return next ok(x.proposition = 'pause' and (select c.statut from public.cashd_comptes c where c.id = (p ->> 'hotel')::uuid) = 'pause',
                 'La promesse acceptée met le compte en pause, le temps du règlement annoncé');

  -- ── Les pièces jointes, le dossier d'assurance-crédit ──
  return next throws_ok(format('select public.cashd_joindre_piece(%L, %L, %L, %L)', p ->> 'f1', 'facture_pdf', 'autre-client/cashd/f.pdf', 'F.pdf'), '42501', null,
                        'Une pièce hors du stockage de l''organisation est refusée');
  v_r := public.cashd_joindre_piece((p ->> 'f1')::uuid, 'facture_pdf', v_client::text || '/cashd/F-2026-101.pdf', 'F-2026-101.pdf');
  perform public.cashd_joindre_piece((p ->> 'f1')::uuid, 'bon_livraison', v_client::text || '/cashd/BL-101.pdf', 'Bon de livraison 101');
  v_d := public.cashd_dossier((p ->> 'sci')::uuid, null, 'assurance_credit');
  return next ok(jsonb_array_length(v_d -> 'pieces_jointes') = 2 and (v_d -> 'pdf_manquants') ? 'F-2026-140' and not (v_d -> 'pdf_manquants') ? 'F-2026-101',
                 'Le dossier d''assurance-crédit porte les pièces jointes et nomme les factures à qui manque leur PDF');
  perform public.cashd_joindre_piece((p ->> 'f1')::uuid, 'bon_livraison', v_client::text || '/cashd/BL-101.pdf', 'Bon de livraison 101', false);
  return next is(jsonb_array_length(public.cashd_dossier((p ->> 'sci')::uuid, null, 'assurance_credit') -> 'pieces_jointes'), 1,
                 'Une pièce détachée sort du dossier ; la ligne reste, datée au journal');
  perform tests.redevenir_admin();
  return next ok(not has_function_privilege('authenticated', 'private.cashd_noter_reponse(uuid, bigint, text, text)', 'execute')
                 and not has_function_privilege('authenticated', 'private.cashd_lire_reponse(text)', 'execute'),
                 'La lecture et la note des réponses restent côté serveur');
end $f$;
