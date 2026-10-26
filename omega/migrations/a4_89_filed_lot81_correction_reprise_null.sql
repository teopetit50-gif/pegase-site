-- a4_89 (FILED lot 81) : correctif d'a4_87 — la garde « déjà décidée » de filed_integrer_facture tient aussi quand le
-- réglage de la correction n'a jamais été posé dans la session.
--
-- a4_87 a ajouté à la garde : « or current_setting('omega.filed_correction_reprise', true) = v_f.id::text ». Un réglage
-- jamais défini dans la session rend NULL ; « not (refusee and (faux or NULL)) » vaut NULL, et la garde ne s'applique
-- plus : une facture refusée, sans reprise, se laissait réintégrer (vu sur la recette par test_a1_02_02, joué dans une
-- session neuve). Le réglage absent compte maintenant pour une chaîne vide.
-- Un repère dans filed_integrer_facture ; la pose s'arrête s'il n'est pas trouvé une fois. Rejouable ; aucune suppression.

do $$
declare
  v_def text := pg_get_functiondef('private.filed_integrer_facture(uuid)'::regprocedure);
  v_rep constant text := 'or current_setting(''omega.filed_correction_reprise'', true) = v_f.id::text';
  v_n int;
begin
  if position('coalesce(current_setting(''omega.filed_correction_reprise'', true)' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a4_89 : repère d''a4_87 dans filed_integrer_facture trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep, 'or coalesce(current_setting(''omega.filed_correction_reprise'', true), '''') = v_f.id::text');
end $$;
