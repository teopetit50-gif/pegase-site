-- b6_11 — DALIRO : les vues des avenants lisent sous la RLS du lecteur (session B6, 06/10/2026)
--
-- CONSTAT (test socle 46, vues security_invoker) : public.btp_avenants_chiffres et
-- public.btp_avenants_lignes_chiffrees (b6_01) sont lisibles par authenticated SANS security_invoker : elles
-- lisent btp_avenants / btp_avenants_lignes avec les droits de leur propriétaire, donc sans la RLS du lecteur.
--
-- CE QUI EST POSÉ : security_invoker = true sur les deux vues (alter view, sans les recréer). La RLS de
-- btp_avenants et btp_avenants_lignes s'applique au lecteur (son client, son entité). Les prix restent servis
-- par private.btp_prix_avenant / private.btp_prix_ligne_avenant (SECURITY DEFINER, qui vérifient eux-mêmes
-- voit_entite et btp_voit_prix) : la vue les appelle désormais sous le rôle du lecteur, il lui faut donc
-- EXECUTE dessus (même règle que b6_03 et le lot 19w pour btp_est_serveur / btp_voit_prix).
-- À inscrire dans omega/a5_01_liste_figee.txt : btp_prix_avenant(p_id uuid), btp_prix_ligne_avenant(p_id uuid).
--
-- Règles de pose : alter ; rien n'est retiré ni effacé.

alter view public.btp_avenants_chiffres set (security_invoker = true);
alter view public.btp_avenants_lignes_chiffrees set (security_invoker = true);

grant execute on function private.btp_prix_avenant(uuid) to authenticated, service_role;
grant execute on function private.btp_prix_ligne_avenant(uuid) to authenticated, service_role;
revoke execute on function private.btp_prix_avenant(uuid) from public, anon;
revoke execute on function private.btp_prix_ligne_avenant(uuid) from public, anon;

revoke all on public.btp_avenants_chiffres from anon;
revoke all on public.btp_avenants_lignes_chiffrees from anon;
grant select on public.btp_avenants_chiffres to authenticated;
grant select on public.btp_avenants_lignes_chiffrees to authenticated;
