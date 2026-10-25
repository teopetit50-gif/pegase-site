-- 20261022192041 a4_78_filed_lot70_registre_levable
-- Source : dépôt : 5069cb2a43452dedd10c5bfd0961f9fae12d3381 omega/migrations/a4_78_filed_lot70_registre_levable.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_78_filed_lot70_registre_levable.sql @ 5069cb2a43452dedd10c5bfd0961f9fae12d3381.
-- ═══ omega/migrations/a4_78_filed_lot70_registre_levable.sql @ 5069cb2a43452dedd10c5bfd0961f9fae12d3381
-- a4_78 (FILED lot 70) : identite.registre se lève, par une personne et avec un motif (TFILED-16).
--
-- TFILED-16 (testeur boîte noire, banc dddddddd-…-f1, relevé par le coordinateur le 22/10/2026, 19 h 20 Z) : toutes les
-- factures du banc sont arrêtées par identite.registre (VIES), et public.filed_lever_anomalie refuse de le lever
-- (22023) : private.filed_levable, sur la recette, est une liste fermée qui ne le contient pas. Aucune porte ne
-- permettait donc de décider cet arrêt ; la facture restait bloquée sans demande de validation.
--
--   · private.filed_levable garde sa liste (copiée telle quelle sous private.filed_levable_socle, sans la réécrire) et
--     y ajoute :
--       - identite.registre : le registre ne connaît pas l'identifiant, ou n'a pas répondu, ou ne peut pas être
--         interrogé ; une personne qui a vérifié le fournisseur autrement le lève, avec son motif ;
--       - doublon.numero (a4_72) : même numéro qu'une pièce reçue avant, autre montant ou autre date ; son message
--         promet « une personne tranche (avoir, facture rectificative, erreur de numéro) » : c'est la levée.
--     Un gérant lève seul (a4_76). filed_lever_anomalie recontrôle déjà : levée, la facture passe « à valider » et
--     sa demande est déposée.
--   · Restent non levables : identite.siren / identite.siret / identite.tva_intracom à clé fausse (a4_74 : un numéro
--     impossible se corrige, il ne se lève pas), fournisseur.a_confirmer (a4_12), lecture.*.
--   · a4_77 (déclencheur de recontrôle après une levée) fait doublon avec la porte du socle : non posé, à ne pas poser.
-- Rejouable ; aucune suppression.

do $$
declare v_def text := pg_get_functiondef('private.filed_levable(text)'::regprocedure);
begin
  if position('filed_levable_socle' in v_def) > 0 then return; end if;
  -- La règle du socle, telle quelle, sous un autre nom.
  if to_regprocedure('private.filed_levable_socle(text)') is null then
    if (length(v_def) - length(replace(v_def, 'private.filed_levable(', ''))) / length('private.filed_levable(') <> 1 then
      raise exception 'a4_78 : en-tête de private.filed_levable introuvable';
    end if;
    execute replace(v_def, 'private.filed_levable(', 'private.filed_levable_socle(');
  end if;
  execute $f$
    create or replace function private.filed_levable(p_code text) returns boolean language sql immutable set search_path to '' as $b$
      -- a4_78 : la liste du socle, plus identite.registre et doublon.numero (TFILED-16).
      select private.filed_levable_socle(p_code) or p_code in ('identite.registre', 'doublon.numero')
    $b$
  $f$;
end $$;
revoke all on function private.filed_levable_socle(text) from public, anon, authenticated;
grant execute on function private.filed_levable_socle(text) to service_role;
