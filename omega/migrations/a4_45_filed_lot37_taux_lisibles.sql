-- FILED, lot 37 (a4_45) — les taux de TVA des messages s'écrivent « 19 % », « 5,5 % », et non « 19.000 % ».
--
-- Vu sur la recette après a4_44 (18/10) : filed_factures_tva.taux y est un numeric à trois décimales ; les messages de
-- tva.taux recopiaient le texte brut (« TVA étrangère facturée (19.000 %) »). Les messages passent par trim_scale et la
-- virgule française. Seul le texte affiché change : la clé du contrôle (cle) et la preuve gardent le texte brut, pour
-- que les levées déjà faites restent attachées à leur contrôle.
--
-- Pose « par repère » sur le corps en base (pg_get_functiondef) de private.filed_controler_facture : chaque fragment
-- est remplacé partout où il est, à condition d'y être exactement le nombre de fois attendu ; déjà remplacé, il n'est
-- pas retouché ; sinon la migration s'arrête sans rien poser. Droits inchangés. Aucun DROP, aucune suppression.

do $do$
declare
  r record; v_def text; v_n integer; v_change boolean := false;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  for r in select * from (values
    ($o1$array_to_string(v_hors, ' %, ')$o1$,
     $n1$(select string_agg(replace(trim_scale(x::numeric)::text, '.', ','), ' %, ' order by x::numeric) from unnest(v_hors) x)$n1$, 3),
    ($o2$replace(trim(trailing '.' from trim(trailing '0' from v_taux_trouve::text)), '.', ',')$o2$,
     $n2$replace(trim_scale(v_taux_trouve)::text, '.', ',')$n2$, 2)
  ) t(ancien, nouveau, attendu)
  loop
    v_n := (length(v_def) - length(replace(v_def, r.ancien, ''))) / length(r.ancien);
    if v_n = 0 and position(r.nouveau in v_def) > 0 then
      continue;
    end if;
    if v_n <> r.attendu then
      raise exception 'a4_45 : repère trouvé % fois au lieu de % dans private.filed_controler_facture. Rien n''est posé.', v_n, r.attendu;
    end if;
    v_def := replace(v_def, r.ancien, r.nouveau);
    v_change := true;
  end loop;
  if v_change then
    execute v_def;
    raise notice 'a4_45 : private.filed_controler_facture(uuid) corrigée.';
  else
    raise notice 'a4_45 : private.filed_controler_facture(uuid) déjà corrigée.';
  end if;
end $do$;
