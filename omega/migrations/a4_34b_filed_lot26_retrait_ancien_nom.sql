-- FILED, lot 26 (a4_34b) — à poser après a4_34 (version de bfdbfe7 ou suivante).
--
-- La première pose d'a4_34 nommait la porte de décision filed_rapprocher_ligne(uuid, uuid). Ce nom est déjà celui du
-- moteur de rapprochement à trois voies d'a4_08 (private.filed_rapprocher_ligne(filed_factures, …)) : le contrôle des
-- droits (socle 44) ne peut pas les distinguer. La porte s'appelle désormais filed_regler_par_releve(uuid, uuid).
-- L'ancienne paire n'est pas supprimée (règle de pose : aucun DROP) : elle est renommée et fermée aux membres
-- (la version private reste exécutable par service_role, comme toute fonction de private). Seule la
-- signature (uuid, uuid) est touchée ; le moteur d'a4_08 reste. Idempotent.
do $$
begin
  if to_regprocedure('public.filed_rapprocher_ligne(uuid, uuid)') is not null then
    alter function public.filed_rapprocher_ligne(uuid, uuid) rename to filed_rapprocher_ligne_retiree_a4_34;
  end if;
  if to_regprocedure('private.filed_rapprocher_ligne(uuid, uuid)') is not null then
    alter function private.filed_rapprocher_ligne(uuid, uuid) rename to filed_rapprocher_ligne_retiree_a4_34;
  end if;
  if to_regprocedure('public.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid)') is not null then
    revoke all on function public.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) from public, anon, authenticated, service_role;
    comment on function public.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) is 'Retirée (a4_34b) : remplacée par public.filed_regler_par_releve(uuid, uuid). Fermée à tous.';
  end if;
  if to_regprocedure('private.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid)') is not null then
    revoke all on function private.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) from public, anon, authenticated, service_role;
    -- Le socle (test 44) veut que service_role exécute toute fonction de private : on le lui rend, et à lui seul.
    grant execute on function private.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) to service_role;
    comment on function private.filed_rapprocher_ligne_retiree_a4_34(uuid, uuid) is 'Retirée (a4_34b) : remplacée par private.filed_regler_par_releve(uuid, uuid). Fermée aux membres ; service_role seul (règle du socle).';
  end if;
end $$;
