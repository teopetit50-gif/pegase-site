-- c4_25 — OFFLOAD : une commande pendant la reprise la clôt, partout (testeur T-OFFLOAD, TOFFLOAD-06 ; C4, 21/10/2026).
-- Après c4_00, c4_03 (aides) et les migrations c4_01 à c4_25. Données fictives. runtests() annule tout.

create or replace function tests.test_c4_25_commande_pendant_reprise() returns setof text
language plpgsql as $f$
declare
  banc jsonb := tests.c4_banc();
  v_client uuid := (banc ->> 'client')::uuid;
  v_a uuid; v_b uuid;
  r public.offload_reprises;
begin
  perform tests.c4_reprises_pretes();
  v_a := tests.c4_compte_courriel('CP1', 'Clim Ouest', 'atelier@clim-ouest.test', 70);
  v_b := tests.c4_compte_courriel('CP2', 'Clim Est', 'atelier@clim-est.test', 70);
  update public.offload_comptes set email = null where id = v_b;   -- pas de courriel : la reprise passe par l'appel
  perform private.offload_detecter(v_client, null);
  perform private.offload_cycle(v_client, null);
  return next ok((tests.c4_reprise(v_a)).statut = 'a_valider' and (tests.c4_reprise(v_b)).statut = 'appel'
                 and exists (select 1 from public.offload_taches t where t.reprise_id = (tests.c4_reprise(v_b)).id and t.statut = 'a_faire'),
                 'Deux reprises ouvertes : un message à valider, un appel à passer');

  -- A : la commande est saisie pendant la reprise ; la reprise se clôt aussitôt, le message attendu est annulé.
  perform tests.endosser((banc ->> 'gerant')::uuid, 'gerant@banc-varelo.test');
  perform public.offload_saisir_achat(v_a, (now() at time zone 'Europe/Paris')::date, 450, 'F-9007', 'Entretien climatisation', 'facture');
  perform tests.redevenir_admin();
  r := tests.c4_reprise(v_a);
  return next ok(r.statut = 'close' and r.issue = 'commande',
                 'Une commande saisie pendant la reprise la clôt aussitôt (' || r.statut || ', ' || coalesce(r.issue, '—') || ')');
  return next ok((select e.statut from public.envois e where e.id = r.envoi1_id) not in ('a_valider', 'pret'),
                 'Le message qui attendait est annulé (' || coalesce((select e.statut from public.envois e where e.id = r.envoi1_id), '?') || ')');

  -- B : comme sur banc-test-offload, aucun réglage d'envoi en essai ; la commande arrive par la détection seule.
  update public.reglages_envois set mode = null where client_id = v_client and (module = 'offload' or module is null);
  insert into public.offload_achats (client_id, entite_id, compte_id, date_achat, montant_ht, reference, nature, source)
  select v_client, k.entite_id, k.id, (now() at time zone 'Europe/Paris')::date, 1000, 'F-9011', 'facture', 'saisie' from public.offload_comptes k where k.id = v_b;
  perform private.offload_detecter(v_client, null);
  r := tests.c4_reprise(v_b);
  return next ok(r.statut = 'close' and r.issue = 'commande',
                 'La détection seule clôt la reprise, même sans réglage d''envoi (' || r.statut || ')');
  return next ok(not exists (select 1 from public.offload_taches t where t.reprise_id = r.id and t.statut = 'a_faire'),
                 'La tâche d''appel n''est plus à faire : le client a commandé');
end $f$;

select * from runtests('tests'::name, '^test_c4_25_');
