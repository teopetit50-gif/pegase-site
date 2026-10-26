-- 20261026191626 c4_39_tableur_pleine_chasse
-- Source : dépôt : e85922578c27661a3db8164ceb3613e6a10c1f1f omega/modules/offload/migrations/c4_39_tableur_pleine_chasse.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_39_tableur_pleine_chasse.sql @ e85922578c27661a3db8164ceb3613e6a10c1f1f ; fichiers de tests ignorés : omega/tests/offload/c4_39_tableur_pleine_chasse.sql.
-- ═══ omega/modules/offload/migrations/c4_39_tableur_pleine_chasse.sql @ e85922578c27661a3db8164ceb3613e6a10c1f1f
-- c4_39 — OFFLOAD : la restitution en tableur neutralise aussi les signes de formule en pleine chasse (session C4,
-- 27/10/2026 ; contre-recette du testeur des modules, TMOD-14, testeur-modules cc61ebf4).
--
-- Certaines versions d'Excel, avec une saisie asiatique, lisent ＝ ＋ － ＠ (U+FF1D, U+FF0B, U+FF0D, U+FF20) comme
-- = + - @. Une cellule de texte qui commence par l'un d'eux reçoit désormais l'apostrophe, comme = + - @, la tabulation
-- et le retour chariot (c4_38). Les nombres restent des nombres. offload_restitution_tableur (c4_38) appelle déjà
-- private.offload_csv_neutre : la redéfinir suffit.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE.

create or replace function private.offload_csv_neutre(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when p ~ '^[=+@\t\r＝＋－＠-]' then '''' || p else p end
$function$;
revoke execute on function private.offload_csv_neutre(text) from public, anon, authenticated;
grant execute on function private.offload_csv_neutre(text) to service_role;
