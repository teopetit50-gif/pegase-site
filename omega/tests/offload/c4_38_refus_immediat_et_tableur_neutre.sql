-- c4_38 — OFFLOAD : le refus sort tout de suite le message de « à valider » (TMOD-06), le résumé de la reprise cite le
-- contact en vigueur (TMOD-07), la restitution en tableur neutralise les formules (session C4, 26/10/2026).
-- Après c4_00, c4_03, c4_08, c4_09, c4_37 (aides) et les migrations c4_01 à c4_38. Mode essai. runtests() annule tout.

-- Les messages « à valider » du tableau, lus par le gérant du banc.
create or replace function tests.c4_a_valider() returns jsonb
language plpgsql as $$
declare banc jsonb := tests.c4_banc(); t jsonb;
begin
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  t := public.offload_tableau((banc ->> 'client')::uuid);
  perform tests.redevenir_admin();
  return coalesce(t -> 'a_valider', '[]'::jsonb);
end $$;

create or replace function tests.test_c4_38_refus_immediat() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_a uuid; v_d uuid; v_aff uuid;
  ra public.offload_reprises; af public.offload_affaires;
  v_da uuid; v_dd uuid; v_rep uuid;
begin
  if to_regclass('private.reprises') is null then
    return next ok(true, 'Lot socle 19az absent : reprise non vérifiable ici');
    return;
  end if;
  perform tests.c4_reprises_pretes();
  v_a := tests.c4_compte_courriel('RF1', 'Refus Immédiat', 'achats@refus-immediat.test', 70);
  v_d := tests.c4_compte_courriel('RF4', 'Garage Décidé', 'atelier@decide-ancien.test', 70);
  perform private.offload_ouvrir(v_a, 'manuel');
  ra := tests.c4_reprise(v_a);
  -- Une affaire déjà passée par une décision « relancer » : elle porte une date de décision antérieure au refus.
  v_aff := tests.c4_affaire(v_d, 'CMD-RF4', 40, '{"libelle": "Pompe doseuse", "valeur_ht": 210}');
  update public.offload_affaires set statut = 'decision' where id = v_aff;
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_decider_affaire(v_aff, 'relancer', 'Le client a promis de passer.');
  perform tests.redevenir_admin();
  -- Le test tient dans une transaction (now() fixe) : la décision est datée de deux jours avant le refus, comme en vrai.
  update public.offload_affaires set decide_le = now() - interval '2 days' where id = v_aff;
  perform private.offload_affaires_cycle(v_client, null);
  af := tests.c4_affaire_lue(v_aff);
  v_da := tests.c4_demande_de(ra.envoi1_id);
  v_dd := tests.c4_demande_de(af.envoi1_id);
  return next ok(exists (select 1 from jsonb_array_elements(tests.c4_a_valider()) x where x ->> 'reprise' = ra.id::text)
                 and af.statut = 'relancee_1' and af.decide_le is not null,
                 'Avant le refus : le message de reprise est à valider ; l''affaire, relancée par décision, attend la sienne');

  -- TMOD-06 : le refus, sans attendre l'événement de l'envoi ni le passage du cron.
  perform tests.c4_refuser(v_da, 'Mauvais interlocuteur : écrire à Mme Durand.');
  perform tests.c4_refuser(v_dd, 'Le client a changé d''adresse.');
  ra := tests.c4_reprise(v_a);
  return next ok(ra.statut = 'close' and ra.issue = 'refusee' and ra.motif like 'Message refusé en validation (consigne : Mauvais interlocuteur%',
                 'Le refus clôt tout de suite la reprise de contact, avec la consigne : ' || coalesce(ra.statut, '') || ' / ' || coalesce(ra.motif, ''));
  return next ok(not exists (select 1 from jsonb_array_elements(tests.c4_a_valider()) x where x ->> 'reprise' = ra.id::text),
                 'Le message refusé sort de « à valider »');
  return next ok((tests.c4_affaire_lue(v_aff)).statut = 'decision' and (tests.c4_affaire_lue(v_aff)).motif like 'Relance de retrait refusée.%',
                 'La relance de retrait refusée renvoie tout de suite l''affaire à la décision');

  -- La reprise, après correction : un NOUVEAU message à valider ; TMOD-07, le résumé cite le contact en vigueur.
  update public.offload_comptes set contact = 'Mme Durand' where id = v_a;
  update public.offload_comptes set email = 'atelier@decide-nouveau.test' where id = v_d;
  perform public.noter_consentement(v_client, 'email', 'atelier@decide-nouveau.test', 'contrat', 'tout', 'Jeu d''essai C4 : client sous contrat', null, 'offload');
  return next is(private.offload_reprendre_refus(v_da, (select x.consigne from private.reprises x where x.demande_id = v_da)), 'proposee',
                 'La fiche corrigée : la reprise est proposée');
  select d.id into v_rep from public.demandes_validation d where d.payload ->> 'reprise_de' = v_da::text;
  ra := tests.c4_reprise(v_a);
  return next ok(ra.statut = 'a_valider' and ra.envoi1_id <> (select y.id from public.envois y where y.demande_id = v_da)
                 and exists (select 1 from jsonb_array_elements(tests.c4_a_valider()) x where x ->> 'demande' = v_rep::text),
                 'Seule la reprise remet un message à valider, et c''est un nouveau message');
  return next ok((select d.resume like 'Reprise après refus — %Courriel à Mme Durand (au lieu de Martin)%' from public.demandes_validation d where d.id = v_rep),
                 'Le résumé de la reprise cite le contact en vigueur et l''ancien : '
                 || coalesce((select d.resume from public.demandes_validation d where d.id = v_rep), ''));
  return next is(private.offload_reprendre_refus(v_dd, (select x.consigne from private.reprises x where x.demande_id = v_dd)), 'proposee',
                 'Une décision antérieure au refus n''empêche pas la reprise de l''affaire');

  -- TMOD-06, second refus : la reprise refusée clôt pour de bon, hors de « à valider ».
  perform tests.c4_refuser(v_rep, 'Toujours pas.');
  ra := tests.c4_reprise(v_a);
  return next ok(ra.statut = 'close' and ra.issue = 'refusee' and ra.motif like 'Reprise refusée à son tour (consigne : Toujours pas.)%'
                 and not exists (select 1 from jsonb_array_elements(tests.c4_a_valider()) x where x ->> 'reprise' = ra.id::text)
                 and not exists (select 1 from private.reprises x where x.demande_id = v_rep),
                 'Le refus d''une reprise la clôt, avec son motif, sans autre reprise : ' || coalesce(ra.motif, ''));
end $f$;

create or replace function tests.test_c4_38_tableur_neutre() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_f uuid;
  tab jsonb;
  v_comptes text; v_achats text;
begin
  perform tests.c4_reprises_pretes();
  v_f := tests.c4_compte_courriel('RF9', '=HYPERLINK("http://piege.test";"clic")', 'achats@formule.test', 70);
  update public.offload_comptes set contact = '@SOMME(A1:A9)', telephone = '+590 690 00 00 01', ville = '-2+3', secteur = E'\tTab' where id = v_f;
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  tab := public.offload_restitution_tableur(v_client);
  perform tests.redevenir_admin();
  v_comptes := tab -> 'fichiers' ->> 'offload-comptes.csv';
  v_achats := tab -> 'fichiers' ->> 'offload-achats.csv';
  return next ok(position('"''=HYPERLINK(""http://piege.test"";""clic"")"' in v_comptes) > 0,
                 'Une cellule qui commence par « = » est neutralisée par une apostrophe (et reste protégée par le format CSV)');
  return next ok(position('''@SOMME(A1:A9)' in v_comptes) > 0 and v_comptes !~ '(^|;|\n)@SOMME'
                 and position('''+590 690 00 00 01' in v_comptes) > 0 and v_comptes !~ '(^|;|\n)\+590'
                 and position('''-2+3' in v_comptes) > 0 and v_comptes !~ '(^|;|\n)-2\+3'
                 and position(E'''\tTab' in v_comptes) > 0 and v_comptes !~ E'(^|;|\n)\tTab',
                 'De même pour « @ », « + », « - » et une tabulation en tête');
  return next ok(v_achats ~ '(^|;|\n)650(\.0+)?(;|\n|$)' and v_achats !~ '''[0-9]',
                 'Les nombres restent des nombres : aucun montant n''est neutralisé');
  return next ok(private.offload_csv_neutre(E'\rx') = E'''\rx' and private.offload_csv_neutre('Martin') = 'Martin',
                 'Un retour chariot en tête est neutralisé ; un texte ordinaire est laissé tel quel');
end $f$;

select * from runtests('tests'::name, '^test_c4_38_');
