-- 04_banc.sql — SOUCHE LOCALE : le client du banc et ses comptes, comme sur la recette.
insert into public.clients (id, nom) values ('cccccccc-0000-4000-8000-00000000000c', 'Groupe Sogexal (banc)') on conflict do nothing;
insert into auth.users (id, email) values
  ('cccccccc-0000-4000-8000-0000000000c1', 'gerant@banc-varelo.test'), ('cccccccc-0000-4000-8000-0000000000c2', 'referent@banc-varelo.test'),
  ('cccccccc-0000-4000-8000-0000000000c3', 'daf@banc-varelo.test'), ('cccccccc-0000-4000-8000-0000000000c4', 'daf2@banc-varelo.test')
on conflict do nothing;
insert into public.comptes (user_id, client_id, role) values
  ('cccccccc-0000-4000-8000-0000000000c1', 'cccccccc-0000-4000-8000-00000000000c', 'gerant'),
  ('cccccccc-0000-4000-8000-0000000000c2', 'cccccccc-0000-4000-8000-00000000000c', 'valideur'),
  ('cccccccc-0000-4000-8000-0000000000c3', 'cccccccc-0000-4000-8000-00000000000c', 'valideur'),
  ('cccccccc-0000-4000-8000-0000000000c4', 'cccccccc-0000-4000-8000-00000000000c', 'valideur')
on conflict do nothing;
