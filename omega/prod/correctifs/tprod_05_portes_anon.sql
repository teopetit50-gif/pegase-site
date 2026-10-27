-- tprod_05_portes_anon — TPROD-05 (recette de production du 27/10, testeur-modules aa94d713) :
-- « 4 fonctions SECURITY DEFINER exécutables par anon ».
--
-- ARBITRAGE (26/10) : les quatre gardent anon. Chacune sert une page publique, appelée avec la clé
-- publishable du site (rôle anon) ou sans compte :
--   · public.agenda_public(depuis, jusqua)       → /reserver-un-audit (lib/creneaux.ts) et /api/sante :
--     les créneaux libres d'Omega, rien de personnel ;
--   · public.demande_pour_confirmation(p_id)     → /api/reservation/confirmation (route serveur du site,
--     clé publishable : le projet Vercel du site n'a pas de clé de service) ; rend la ligne UNE fois,
--     dans les 30 minutes, à qui connaît l'uuid rendu par reserver_audit ;
--   · public.btp_lire_a_signer(jeton)            → /signer/<jeton>, le maître d'ouvrage signe sur le
--   · public.btp_signer_sur_place(jeton, …)        téléphone du chef d'équipe, sans compte (b6_20,
--     exception anon accordée par le coordinateur, NOTES-COORDINATEUR) ; le jeton fait 64 caractères.
-- Retirer anon casserait ces quatre parcours. Le conseil Supabase reste donc affiché : c'est voulu.
--
-- Ce que la migration fait : elle FIGE les droits de ces quatre portes, sans en retirer à anon.
--   · revoke execute … from public : seul un rôle nommé exécute (le droit implicite de PUBLIC donnerait
--     la porte à tout rôle créé plus tard) ;
--   · grant execute … to anon, authenticated, service_role : un visiteur connecté au site garde l'accès.
-- Elle ne vise que les fonctions présentes : sur la recette, agenda_public et demande_pour_confirmation
-- n'existent pas (elles viennent des migrations du site posées directement sur la production en
-- septembre). Aucun DROP, aucune donnée. Idempotente.
--
-- Le garde-fou est dans omega/tests/socle/tprod_05_portes_anon.sql : anon n'exécute AUCUNE autre
-- fonction SECURITY DEFINER que ces quatre-là.

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as f
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef
      and p.proname in ('agenda_public', 'demande_pour_confirmation', 'btp_lire_a_signer', 'btp_signer_sur_place')
  loop
    execute format('revoke execute on function %s from public', r.f);
    execute format('grant execute on function %s to anon, authenticated, service_role', r.f);
  end loop;
end $$;
