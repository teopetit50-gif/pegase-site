-- 28 — Le relevé des pièces citées se demande (migration b4_19). Après 00_jeu_tamila.sql, b4_01 à b4_19.
-- runtests() annule tout.

create or replace function tests.test_b4_28_pieces_citees() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; v_dossier uuid; v_p1 uuid;
begin
  jeu := tests.tamila_scene();
  v_dossier := (jeu ->> 'dossier')::uuid;
  v_p1 := tests.tamila_piece(jeu, 'conclusions-adverses.pdf');
  update public.pieces set statut = 'lue' where id = v_p1;

  perform tests.endosser((jeu ->> 'gerant')::uuid, 'b4-delorme@essai.invalid');
  -- Le type est connu : la porte va jusqu'au contrôle du coffre (clé sous la phrase du cabinet).
  return next throws_ok(format('select public.tamila_demander_analyse(%L::uuid, ''pieces_citees'')', v_dossier), '55000', null,
                        'pieces_citees est un type connu : refus au coffre, pas au type (55000)');
  -- Un type inconnu reste refusé.
  return next throws_ok(format('select public.tamila_demander_analyse(%L::uuid, ''pieces_inventees'')', v_dossier), '22023', null,
                        'un type inconnu est refusé (22023)');
  -- Le stagiaire (lecteur) ne demande pas.
  perform tests.redevenir_admin();
  perform tests.endosser((jeu ->> 'stagiaire')::uuid, 'b4-stagiaire@essai.invalid');
  return next throws_ok(format('select public.tamila_demander_analyse(%L::uuid, ''pieces_citees'')', v_dossier), '42501', null,
                        'un lecteur du dossier ne demande pas de relevé (42501)');
  perform tests.redevenir_admin();
end $f$;

select * from runtests('tests'::name, '^test_b4_28_');
