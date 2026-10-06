-- B3-09 — Les mesures du soir et du matin (tiroma_horloge) : occupation, production, reprise, laboratoire, contrôles,
-- réinscription, acceptation des devis ; à blanc puis en mode réel ; un cabinet coupé ne se mesure plus (étape 15).
-- Après 00_aides_b3.sql, 00b_export_logosw.sql, b3_01 à b3_08. runtests() annule tout.

create or replace function tests.test_b3_09_mesures_du_soir() returns setof text
language plpgsql as $f$
declare
  banc uuid := tests.b3_banc();
  entite uuid := tests.b3_entite();
  j date := tests.b3_jour();
  fz text := (select fuseau from public.entites where id = entite);
  r jsonb;
  v_cabinet uuid;
  v_bilan jsonb;
  n_mesures bigint;
begin
  r := tests.b3_cabinet_releve('initial');
  v_cabinet := (r ->> 'cabinet')::uuid;
  perform tests.b3_deposer_releve((r ->> 'branchement')::uuid, array['agenda', 'actes'], 'courant', 'b3:courant');
  perform tests.b3_traiter();

  -- À 23 h 45, heure du cabinet : la journée écoulée (et les deux précédentes), plus le matin déjà passé.
  v_bilan := private.tiroma_horloge((j + time '23:45') at time zone fz);
  return next ok(v_bilan ? (v_cabinet::text || ':soir:' || j::text), 'la mesure du soir du jour J est passée : ' || left(v_bilan::text, 200));
  return next ok(v_bilan ? (v_cabinet::text || ':soir:' || (j - 1)::text) and v_bilan ? (v_cabinet::text || ':soir:' || (j - 2)::text), 'et celles de J-1 et J-2 (rattrapage)');
  return next ok(v_bilan ? (v_cabinet::text || ':matin:' || j::text), 'la mesure du matin du jour J aussi (il est passé 6 h 40)');
  return next ok(not exists (select 1 from public.alertes a where a.client_id = banc and a.source = 'tiroma' and a.niveau = 'critique' and a.acquittee_le is null and a.titre like 'La mesure de Tiroma%'),
                 'aucune alerte critique de mesure' || coalesce((select ' : ' || (a.detail ->> 'erreur') from public.alertes a where a.client_id = banc and a.source = 'tiroma' and a.niveau = 'critique' and a.titre like 'La mesure de Tiroma%' limit 1), ''));
  select count(*) into n_mesures from public.mesures m where m.client_id = banc and m.entite_id = entite and m.indicateur like 'tiroma.%';
  return next ok(n_mesures > 0, format('%s mesures Tiroma enregistrées', n_mesures));
  return next ok(exists (select 1 from public.mesures m where m.client_id = banc and m.entite_id = entite and m.indicateur = 'tiroma.production_realisee' and m.debut = j - 2 and m.valeur = 23),
                 'production réalisée de J-2 : 23 € (l''acte A003)');
  return next ok(exists (select 1 from public.mesures m where m.client_id = banc and m.entite_id = entite and m.indicateur = 'tiroma.production_realisee_praticien' and m.objet_type = 'praticien' and m.objet_libelle = 'Dr Lacour'),
                 'production réalisée par praticien : Dr Lacour');
  return next ok(exists (select 1 from public.mesures m where m.client_id = banc and m.entite_id = entite and m.indicateur = 'tiroma.patients_sans_controle_18m' and m.debut = j and m.base >= 20),
                 'patients sans contrôle depuis 18 mois : mesuré sur les patients actifs');
  return next ok(exists (select 1 from public.mesures m where m.client_id = banc and m.entite_id = entite and m.indicateur = 'tiroma.taux_acceptation_devis' and m.debut = j - 50 and m.valeur = 1),
                 'taux d''acceptation des devis présentés le J-50 : 1 (D001 signé)');
  if extract(isodow from j) between 1 and 6 then
    return next ok(exists (select 1 from public.mesures m where m.client_id = banc and m.entite_id = entite and m.indicateur = 'tiroma.occupation_prevue' and m.debut = j),
                   'occupation prévue du jour J mesurée (matin)');
  else
    return next skip('occupation prévue : le cabinet est fermé le dimanche');
  end if;
  return next ok((select bool_and(m.mode = 'a_blanc') from public.mesures m where m.client_id = banc and m.entite_id = entite and m.indicateur like 'tiroma.%'), 'toutes les mesures sont « à blanc » (mode du cabinet)');
  return next ok(exists (select 1 from public.journal_opposable x where x.client_id = banc and x.action = 'tiroma.indicateurs_calcules'), 'journal : « tiroma.indicateurs_calcules »');
  -- Rejouer l'horloge ne remesure pas.
  v_bilan := private.tiroma_horloge((j + time '23:50') at time zone fz);
  return next is(v_bilan, '{}'::jsonb, 'un second passage le même soir ne mesure rien de plus');
  return next is((select count(*) from private.tiroma_passages p where p.client_id = banc and p.entite_id = entite and p.tache = 'mesure_soir'), 3::bigint, 'trois passages du soir (J-2, J-1, J)');

  -- En mode réel, les mesures du lendemain le sont aussi.
  perform tests.b3_endosser('gerant');
  perform public.tiroma_changer_mode(banc, entite, 'reel');
  perform tests.redevenir_admin();
  v_bilan := private.tiroma_horloge((j + 1 + time '23:45') at time zone fz);
  return next ok(v_bilan ? (v_cabinet::text || ':soir:' || (j + 1)::text), 'la mesure du soir de J+1 passe');
  return next ok(exists (select 1 from public.mesures m where m.client_id = banc and m.entite_id = entite and m.indicateur like 'tiroma.%' and m.mode = 'reel'), 'et elle est en mode « réel »');

  -- Un cabinet coupé ne se mesure plus.
  perform tests.b3_endosser('gerant');
  update public.tiroma_cabinets set statut = 'coupe' where id = v_cabinet;
  perform tests.redevenir_admin();
  v_bilan := private.tiroma_horloge((j + 2 + time '23:45') at time zone fz);
  return next ok(not (v_bilan ? (v_cabinet::text || ':soir:' || (j + 2)::text)), 'cabinet coupé : aucune mesure de J+2');
end $f$;

select * from runtests('tests'::name, '^test_b3_09_');
