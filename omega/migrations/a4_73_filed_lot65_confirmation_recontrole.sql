-- a4_73 (FILED lot 65) : confirmer un fournisseur relance le contrôle de ses factures non closes, par tous les chemins ;
-- un second IBAN d'un fournisseur pas encore confirmé se signale tout de suite.
--
-- TFILED-08 (testeur boîte noire, client banc-test-filed, vérifié par le coordinateur, 21/10/2026) : Béton Archipel est
-- confirmé, mais F2b (même fournisseur, un autre IBAN que F2a) garde l'ancien jeu de contrôles ; iban.nouveau n'est
-- apparu qu'après un appel manuel de private.filed_controler_facture.
--
-- Constat en local : la porte directe (filed_confirmer_fournisseur) et la décision de la file (filed_executer_decision,
-- « filed.valider_fournisseur », jouée par le travail filed.decision) appellent déjà filed_recontroler_fournisseur.
-- Mais tout autre chemin qui change le statut d'un fournisseur (une décision jouée hors de ces deux fonctions, une
-- correction de la fiche) n'en relance aucun ; et avant la confirmation, le second IBAN de F2b se lisait
-- « IBAN proposé avec le fournisseur nouveau : il se valide avec lui », ce qui est faux : seul l'IBAN de la pièce
-- d'origine se valide avec lui.
--
--   · Un déclencheur sur public.filed_fournisseurs : quand le statut change (confirmé, refusé, bloqué, rouvert), les
--     factures non closes du fournisseur (à compléter, bloquées, à valider) sont recontrôlées, quel que soit le chemin.
--     Les deux fonctions qui le faisaient déjà gardent leur appel (sans effet de plus qu'un second contrôle identique).
--   · iban.nouveau, pour un fournisseur pas encore confirmé : l'IBAN de sa pièce d'origine reste « il se valide avec
--     lui » (ok) ; un AUTRE IBAN proposé est signalé tout de suite (bloquant) : « une personne le vérifie auprès de lui,
--     après avoir confirmé le fournisseur ».
-- Repère dans private.filed_controler_facture (la branche « IBAN connu / proposé avec le fournisseur nouveau »).
-- Rejouable ; aucune suppression.

create or replace function private.filed_fournisseur_statut_change()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.statut is distinct from old.statut then
    begin
      perform private.filed_recontroler_fournisseur(new.id);
    exception when others then
      raise warning 'FILED : factures du fournisseur % non recontrôlées (%)', new.id, sqlerrm;
    end;
  end if;
  return null;
end $$;
revoke all on function private.filed_fournisseur_statut_change() from public, anon, authenticated;
grant execute on function private.filed_fournisseur_statut_change() to service_role;
do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.filed_fournisseurs'::regclass and tgname = 'filed_fournisseurs_recontroler') then
    create trigger filed_fournisseurs_recontroler after update of statut on public.filed_fournisseurs
      for each row execute function private.filed_fournisseur_statut_change();
  end if;
end $$;

-- Le résultat iban.nouveau quand l'IBAN de la facture n'est ni refusé, ni révoqué, ni nouveau pour un fournisseur actif.
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

do $$
declare
  v_def text;
  v_ancien constant text :=
       E'        perform private.filed_poser_resultat(v_f, ''iban.nouveau'', ''bloquant'', false,\n'
    || E'          case when v_ib.statut = ''valide'' then ''IBAN connu et validé pour ce fournisseur.''\n'
    || E'               else ''IBAN proposé avec le fournisseur nouveau : il se valide avec lui.'' end);\n';
  v_n int;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  if position('filed_iban_fournisseur_nouveau' in v_def) > 0 then
    return;
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien);
  if v_n <> 1 then
    raise exception 'a4_73 : repère « IBAN connu / proposé » trouvé % fois (1 attendu)', v_n;
  end if;
  execute replace(v_def, v_ancien,
    E'        perform private.filed_iban_fournisseur_nouveau(v_f, v_four, v_ib);   -- a4_73 : un second IBAN d''un fournisseur à confirmer se signale\n');
end $$;
