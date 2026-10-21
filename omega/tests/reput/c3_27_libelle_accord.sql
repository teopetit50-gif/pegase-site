-- c3_27 — REPUT, détail d'écran de la série 1 : le résumé d'une demande d'activation d'accord ne double plus
-- « Accord permanent : ». Exécutable tel quel par execute_sql sur la RECETTE, après c3_00 à c3_26 et les migrations c3_01 à
-- c3_27. runtests() annule tout.

create or replace function tests.test_c3_27_libelle_accord() returns setof text
language plpgsql as $f$
declare
  banc jsonb;
  v_client uuid; v_gerant uuid; v_pol uuid; v_resume text;
begin
  banc := tests.c3_banc();
  v_client := (banc ->> 'client')::uuid;
  perform tests.redevenir_admin();
  v_gerant := tests.c3_compte(v_client, 'gerant', 'c3-27-gerant@banc-varelo.test');
  perform public.reput_installer(v_client);
  perform tests.endosser(v_gerant, 'c3-27-gerant@banc-varelo.test');
  v_pol := (public.reput_donner_accord(v_client, 'horaires') ->> 'proposee')::uuid;
  perform tests.redevenir_admin();
  return next is((select p.libelle from public.politiques p where p.id = v_pol), 'Réponses « Horaires et accès » envoyées sans relecture',
                 'Le libellé de l''accord ne porte plus le préfixe');
  select d.resume into v_resume from public.demandes_validation d where d.id = (select p.demande_id from public.politiques p where p.id = v_pol);
  return next ok(v_resume is not null and v_resume not like '%Accord permanent : Accord permanent%',
                 'Le résumé de la demande d''activation ne double plus « Accord permanent : » — ' || coalesce(v_resume, 'aucun'));
  perform tests.endosser(v_gerant, 'c3-27-gerant@banc-varelo.test');
  v_pol := (public.reput_donner_accord(v_client, 'accuse') ->> 'proposee')::uuid;
  perform tests.redevenir_admin();
  return next ok((select p.libelle not like 'Accord permanent%' and p.libelle like '%envoyés sans relecture' from public.politiques p where p.id = v_pol),
                 'Accusés : même règle');
end $f$;

select * from runtests('tests'::name, '^test_c3_27_');
