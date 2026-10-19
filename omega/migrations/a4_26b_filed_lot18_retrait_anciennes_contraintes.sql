-- FILED, lot 18 bis (a4_26b) — RETRAIT des anciennes contraintes que remplacent celles d'a4_26.
--
-- À POSER PAR LE COORDINATEUR, en connaissance de cause (accord du 6/10), APRÈS a4_26 et seulement si a4_26 est posé :
-- ce fichier contient des « drop constraint ». Il retire, sur chaque colonne, les contraintes CHECK autres que la
-- nouvelle (_v2) qui portent sur cette colonne :
--   filed_verifications_tiers.registre    (ancienne : vies | sirene, a4_04)
--   filed_fournisseurs.identite_source    (ancienne : sirene | vies | humain, a4_10)
--   filed_comptes_systeme.role            (ancienne : cinq rôles, a4_17)
--   identites_registre.registre (B7)      (ancienne : sirene | vies, b7_01)
-- Rien n'est retiré si la contrainte _v2 de la colonne n'existe pas ou n'est pas validée. Rejouable : un second passage
-- ne trouve plus rien à retirer. Chaque retrait est annoncé (NOTICE).

do $$
declare
  c record;
  v_cibles text[][] := array[
    array['filed_verifications_tiers', 'registre', 'filed_verifications_tiers_registre_v2'],
    array['filed_fournisseurs', 'identite_source', 'filed_fournisseurs_identite_source_v2'],
    array['filed_comptes_systeme', 'role', 'filed_comptes_systeme_role_v2'],
    array['identites_registre', 'registre', 'identites_registre_registre_v2']];
  i int;
begin
  for i in 1..array_length(v_cibles, 1) loop
    if to_regclass('public.' || v_cibles[i][1]) is null then continue; end if;
    if not exists (select 1 from pg_constraint where conrelid = ('public.' || v_cibles[i][1])::regclass
                    and conname = v_cibles[i][3] and convalidated) then
      raise notice 'a4_26b : % sans contrainte % validée, rien retiré.', v_cibles[i][1], v_cibles[i][3];
      continue;
    end if;
    for c in select k.conname from pg_constraint k
              where k.conrelid = ('public.' || v_cibles[i][1])::regclass and k.contype = 'c' and k.conname <> v_cibles[i][3]
                and array_length(k.conkey, 1) = 1
                and k.conkey[1] = (select a.attnum from pg_attribute a where a.attrelid = k.conrelid and a.attname = v_cibles[i][2])
    loop
      execute format('alter table public.%I drop constraint %I', v_cibles[i][1], c.conname);
      raise notice 'a4_26b : % — contrainte % retirée (remplacée par %).', v_cibles[i][1], c.conname, v_cibles[i][3];
    end loop;
  end loop;
end $$;
