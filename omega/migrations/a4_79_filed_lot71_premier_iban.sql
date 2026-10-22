-- a4_79 (FILED lot 71) : iban.nouveau dit « premier IBAN » quand le fournisseur n'en a pas d'autre.
--
-- Banc NOBAT, pièce 069 (LEADER MAT, relue le 22/10/2026 avec le lecteur v63) : le fournisseur, encore à confirmer, est
-- né d'une autre pièce, qui ne portait aucun IBAN. 069 en porte un ; iban.nouveau disait « Un autre IBAN (…) que celui
-- de la pièce qui a fait naître ce fournisseur », alors qu'il n'y en avait aucun.
--
--   · Même gravité (bloquant) et même règle qu'a4_73 : un IBAN qui ne vient pas de la pièce d'origine d'un fournisseur
--     encore à confirmer se vérifie auprès de lui. Seul le message change quand le fournisseur n'a aucun autre IBAN :
--     « Premier IBAN de ce fournisseur (…), venu d'une autre pièce que celle qui l'a fait naître, qui n'en portait pas ».
-- Redéfinit private.filed_iban_fournisseur_nouveau (a4_73) en entier ; rejouable ; aucune suppression.

create or replace function private.filed_iban_fournisseur_nouveau(p_f public.filed_factures, p_four public.filed_fournisseurs,
                                                                  p_ib public.filed_fournisseurs_ibans)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if p_ib.statut = 'valide' then
    perform private.filed_poser_resultat(p_f, 'iban.nouveau', 'bloquant', false, 'IBAN connu et validé pour ce fournisseur.');
  elsif p_ib.statut is distinct from 'propose'
        or (p_four.document_origine is not null and p_ib.document_id is not distinct from p_four.document_origine) then
    -- L'IBAN de la pièce d'origine (ou un IBAN pas encore au référentiel) : comme avant.
    perform private.filed_poser_resultat(p_f, 'iban.nouveau', 'bloquant', false, 'IBAN proposé avec le fournisseur nouveau : il se valide avec lui.');
  elsif not exists (select 1 from public.filed_fournisseurs_ibans x
                     where x.fournisseur_id = p_four.id and x.id is distinct from p_ib.id and x.statut in ('propose', 'valide')) then
    -- a4_79 : le premier IBAN du fournisseur, venu d'une autre pièce que celle qui l'a fait naître.
    perform private.filed_poser_resultat(p_f, 'iban.nouveau', 'bloquant', true,
      format('Premier IBAN de ce fournisseur (%s), venu d''une autre pièce que celle qui l''a fait naître, qui n''en portait pas : une personne le vérifie auprès de lui, après avoir confirmé le fournisseur.',
             p_ib.iban_masque),
      'COORD_BANC_ERR', jsonb_build_object('iban', p_ib.iban_masque, 'fournisseur_statut', p_four.statut, 'premier', true));
  else
    -- Un autre IBAN proposé, d'une autre pièce, pour un fournisseur encore à confirmer.
    perform private.filed_poser_resultat(p_f, 'iban.nouveau', 'bloquant', true,
      format('Un autre IBAN (%s) que celui de la pièce qui a fait naître ce fournisseur, encore à confirmer : une personne le vérifie auprès de lui, après avoir confirmé le fournisseur.',
             p_ib.iban_masque),
      'COORD_BANC_ERR', jsonb_build_object('iban', p_ib.iban_masque, 'fournisseur_statut', p_four.statut));
  end if;
end $$;
revoke all on function private.filed_iban_fournisseur_nouveau(public.filed_factures, public.filed_fournisseurs, public.filed_fournisseurs_ibans)
  from public, anon, authenticated;
grant execute on function private.filed_iban_fournisseur_nouveau(public.filed_factures, public.filed_fournisseurs, public.filed_fournisseurs_ibans) to service_role;
