-- LORANI, lot B5-13b — les cinq tables de la vague 3 n'accordent à authenticated que lire, ajouter et modifier.
--
-- Ce que ça corrige (test 51 du coordinateur, 06/10, 15 h 42 Z) : les privilèges par défaut de Supabase donnent TOUS
-- les droits à authenticated (et anon) sur une nouvelle table de public ; le « grant select, insert, update » de b5_12
-- et b5_13 n'en retirait donc rien, et le droit de retrait restait accordé sans politique qui l'encadre.
-- Ici : on retire tout à authenticated et anon, puis on rend à authenticated exactement lire, ajouter et modifier
-- (le retrait, la troncature, les références et les triggers restent refusés ; service_role garde ses droits). Les
-- politiques RLS de b5_12 et b5_13 ne changent pas. Idempotent ; ni table ni ligne n'est retirée.

REVOKE ALL ON TABLE public.lorani_honoraires, public.lorani_temps, public.lorani_marches, public.lorani_situations, public.lorani_visas
  FROM authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.lorani_honoraires, public.lorani_temps, public.lorani_marches, public.lorani_situations, public.lorani_visas
  TO authenticated;
