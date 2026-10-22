-- a4_77 (FILED lot 69) : une levée posée recontrôle la facture, quel que soit le chemin.
--
-- Question de T-FILED (22/10/2026, banc dddddddd-…-f1) : toutes les factures sont arrêtées par identite.registre
-- (VIES) et aucune demande de validation n'est ouverte. C'est voulu : une facture bloquée n'a pas de demande ; on lève
-- le bloquant (public.filed_lever_anomalie(p_facture, 'identite.registre', p_motif) ; identite.registre est levable,
-- private.filed_levable = tout sauf lecture.%), la facture repasse « à valider » au recontrôle, et la demande est
-- déposée à ce moment-là. Un gérant le fait seul (a4_76).
--
-- Le trou : rien dans FILED ne recontrôlait la facture quand une levée entrait dans filed_levees. Le corps de
-- filed_lever_anomalie est dans le socle, hors de ce dépôt ; si elle ne recontrôle pas, la facture levée restait
-- « bloquee », sans demande, jusqu'au prochain recontrôle.
--
--   · Un déclencheur après insertion sur public.filed_levees recontrôle la facture (private.filed_controler_facture),
--     qui pose la levée (« levee »), passe la facture « à valider » s'il ne reste aucun bloquant, et dépose la demande.
--     Un échec du recontrôle n'empêche pas la levée (avertissement). Si la porte recontrôle déjà, le second contrôle
--     ne change rien.
-- Rejouable ; aucune suppression.

create or replace function private.filed_levee_recontroler()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  begin
    perform private.filed_controler_facture(new.facture_id);
  exception when others then
    raise warning 'FILED : facture % non recontrôlée après la levée de % (%)', new.facture_id, new.code, sqlerrm;
  end;
  return null;
end $$;
revoke all on function private.filed_levee_recontroler() from public, anon, authenticated;
grant execute on function private.filed_levee_recontroler() to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_levees'::regclass and tgname = 'filed_levees_recontroler') then
    create trigger filed_levees_recontroler after insert on public.filed_levees
      for each row execute function private.filed_levee_recontroler();
  end if;
end $$;
