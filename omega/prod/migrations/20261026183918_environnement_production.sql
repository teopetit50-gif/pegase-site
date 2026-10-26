-- 20261026183918 environnement_production
-- Source : assembler.mjs --cloture (A5). Pose environnement = 'production' dans private.reglages.

do $$
begin
  update private.reglages set valeur = 'production' where cle = 'environnement';
  if not found then insert into private.reglages (cle, valeur) values ('environnement', 'production'); end if;
end $$;
