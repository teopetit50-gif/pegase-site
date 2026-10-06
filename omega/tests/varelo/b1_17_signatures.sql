-- b1_17 — VARELO : les signatures des exports ne se recouvrent pas (migration b1_14_signatures, après b1_10)
-- Exécutable tel quel par execute_sql sur la RECETTE. Motif : ^test_b1_17_
--
-- Le lecteur d'exports (A1, choisirJeu) prend le jeu dont le motif reconnaît le nom du fichier, sinon le seul jeu
-- dont la signature d'en-têtes est couverte par le fichier. Pour qu'un export au nom quelconque soit reconnu, aucun
-- fichier d'un jeu ne doit couvrir la signature d'un autre : on prend pour « fichier le plus large » d'un jeu
-- l'ensemble des alias de toutes ses colonnes, normalisés comme le lecteur (accents, casse, ponctuation).

create or replace function tests.b1_norm(t text) returns text language sql immutable as $$
  select trim(both '_' from regexp_replace(
           regexp_replace(lower(translate(t, 'ÀÂÄÇÉÈÊËÎÏÔÖÙÛÜàâäçéèêëîïôöùûü', 'AAACEEEEIIOOUUUaaaceeeeiioouuu')), '[°º‘’''"«»]', '', 'g'),
           '[^a-z0-9]+', '_', 'g'))
$$;

create or replace function tests.test_b1_17_signatures() returns setof text
language plpgsql as $f$
declare
  x record;
  n integer := 0;
begin
  return next is((select count(*) from public.modeles_jeux where module = 'varelo' and version = 1
                   and code like 'balance_agee_%' and entetes[1] in ('Code client', 'Code fournisseur')), 12::bigint,
                 'les douze balances âgées (six logiciels) signent par leur côté : Code client ou Code fournisseur');
  return next is((select count(*) from public.modeles_jeux where module = 'varelo' and version = 1
                   and code in ('clients', 'fournisseurs') and 'Code postal' = any (entetes)), 12::bigint,
                 'les douze fichiers tiers portent « Code postal » dans leur signature');
  for x in
    with alias as (
      select m.logiciel, m.code, tests.b1_norm(a) as e
      from public.modeles_jeux m, jsonb_each(m.colonnes) c, jsonb_array_elements_text(c.value -> 'entetes') a
      where m.module = 'varelo' and m.version = 1
    ), sig as (
      select m.logiciel, m.code, array_agg(tests.b1_norm(s)) as s
      from public.modeles_jeux m, unnest(m.entetes) s
      where m.module = 'varelo' and m.version = 1 group by 1, 2
    )
    select f.logiciel, f.code as fichier, g.code as couvert
    from (select logiciel, code, array_agg(e) as e from alias group by 1, 2) f
    join sig g on g.logiciel = f.logiciel and g.code <> f.code and g.s <@ f.e
  loop
    n := n + 1;
    return next fail(format('%s : un fichier « %s » couvre la signature de « %s »', x.logiciel, x.fichier, x.couvert));
  end loop;
  if n = 0 then
    return next pass('aucun fichier d''un jeu ne couvre la signature d''un autre, sur les six logiciels');
  end if;
  return next is((select count(*) from public.modeles_jeux m, unnest(m.entetes) s
                   where m.module = 'varelo' and m.version = 1
                     and not exists (select 1 from jsonb_each(m.colonnes) c, jsonb_array_elements_text(c.value -> 'entetes') a
                                     where tests.b1_norm(a) = tests.b1_norm(s))), 0::bigint,
                 'chaque en-tête de signature est l''alias d''une colonne déclarée');
end $f$;
