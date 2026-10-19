-- FILED, lot 52 (a4_60) — un IBAN lu à la place du numéro de TVA (Teo, 19/10 : vraies pièces NOBAT).
--
-- Sur une pièce réelle, le lecteur a rendu l'IBAN du fournisseur (FR76…) comme numéro de TVA ; identite.tva_intracom le
-- jugeait comme une TVA. Désormais, dans private.filed_controles_identite (texte d'a4_39 et a4_43) :
--   · une valeur au format IBAN — FR76 suivi de 23 chiffres, ou tout IBAN dont la clé est juste — n'est pas tenue pour
--     un numéro de TVA, qu'elle vienne de la valeur sûre ou de la valeur lue sans vérification : le contrôle
--     identite.tva_iban le dit (attention), et la TVA est jugée absente ;
--   · si la facture n'a pas d'IBAN, la valeur est PROPOSÉE comme IBAN à vérifier (fournisseur_lu.iban_propose et le
--     contrôle iban.propose, attention), jamais reprise d'office sur la facture ni chez le fournisseur.
-- Pose « par repère » (deux fragments). Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

do $do$
declare
  r record; v_def text; v_n integer; v_change boolean := false;
begin
  v_def := pg_get_functiondef('private.filed_controles_identite(uuid)'::regprocedure);
  for r in select * from (values
    ($o1$  v_registre text; v_ident text; v_verdict record; v_pays text;
$o1$,
     $n1$  v_registre text; v_ident text; v_verdict record; v_pays text;
  v_iban_tva text;   -- a4_60
$n1$),
    ($o2$  select * into v_x from private.filed_identifiant_etranger(v_tva);
$o2$,
     $n2$  -- a4_60 : une valeur au format IBAN n'est pas un numéro de TVA ; elle est proposée comme IBAN à vérifier.
  v_iban_tva := upper(regexp_replace(coalesce(v_tva, v_f.fournisseur_lu->'non_verifie'->>'tva', ''), '[^A-Za-z0-9]', '', 'g'));
  if v_iban_tva ~ '^FR76[0-9]{23}$'
     or (v_iban_tva ~ '^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$' and private.filed_iban_valide(v_iban_tva)) then
    if v_tva is not null and upper(regexp_replace(v_tva, '[^A-Za-z0-9]', '', 'g')) = v_iban_tva then v_tva := null; end if;
    v_f.fournisseur_lu := coalesce(v_f.fournisseur_lu, '{}'::jsonb) #- '{non_verifie,tva}';
    perform private.filed_poser_resultat(v_f, 'identite.tva_iban', 'attention', true,
      format('La valeur lue comme numéro de TVA (%s) est un IBAN : elle n''est pas retenue comme numéro de TVA.', private.filed_masquer_iban(v_iban_tva)),
      'EMMET_INC', jsonb_build_object('iban', private.filed_masquer_iban(v_iban_tva)));
    if v_f.iban is null then
      update public.filed_factures set fournisseur_lu = coalesce(fournisseur_lu, '{}'::jsonb) || jsonb_build_object('iban_propose', v_iban_tva)
       where id = v_f.id;
      perform private.filed_poser_resultat(v_f, 'iban.propose', 'attention', true,
        format('IBAN proposé (%s), lu à la place du numéro de TVA : à vérifier ; il n''est pas repris sur la facture.', private.filed_masquer_iban(v_iban_tva)),
        'COORD_BANC_ERR', jsonb_build_object('iban', private.filed_masquer_iban(v_iban_tva)));
    end if;
  else
    v_iban_tva := null;
  end if;
  select * into v_x from private.filed_identifiant_etranger(v_tva);
$n2$)
  ) t(ancien, nouveau)
  loop
    if position(r.nouveau in v_def) > 0 then continue; end if;
    v_n := (length(v_def) - length(replace(v_def, r.ancien, ''))) / length(r.ancien);
    if v_n <> 1 then
      raise exception 'a4_60 : repère trouvé % fois au lieu d''une dans private.filed_controles_identite. Rien n''est posé.', v_n;
    end if;
    v_def := replace(v_def, r.ancien, r.nouveau);
    v_change := true;
  end loop;
  if v_change then
    execute v_def;
    raise notice 'a4_60 : private.filed_controles_identite corrigée.';
  else
    raise notice 'a4_60 : private.filed_controles_identite déjà corrigée.';
  end if;
end $do$;
