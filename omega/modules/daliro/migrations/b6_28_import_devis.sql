-- b6_28 — DALIRO : importer le devis d'un coup, depuis Excel (copier-coller) ou un fichier CSV (session B6, 11/10/2026)
--
-- LA PROMESSE (/secteurs/btp) : « Daliro lit vos devis là où ils sont, depuis votre logiciel ou un export » ;
-- « Nous raccordons vos devis… ». Jusqu'ici, le marché se saisissait ligne à ligne (btp_ecrire_ligne).
--
-- CE QUI EST POSÉ.
--   · public.btp_importer_lignes(marche, lignes) : chaque ligne passe par la porte du socle btp_ecrire_ligne, dans
--     l'ordre, comme si elle était saisie à la main (mêmes champs, même contrôle quantité × prix = montant, même
--     journal, même RLS : la fonction reste SECURITY INVOKER). Une ligne refusée n'empêche pas les autres : elle est
--     rendue avec son rang et le message de la base. Au plus 2 000 lignes par appel.
--   · L'écran lit le tableau collé depuis Excel (tabulations) ou le CSV exporté du logiciel de devis (; ou ,),
--     reconnaît les colonnes par leur en-tête (désignation, unité, quantité, prix unitaire, montant, lot, numéro),
--     montre l'aperçu, puis appelle cette porte. Le marché reste « à vérifier » : la vérification ligne à ligne
--     (btp_verifier_marche) ne change pas.
--   · Le PDF du devis n'est PAS lu ici : il demande le lecteur d'A1 (lecteur.document), à brancher plus tard.
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function public.btp_importer_lignes(p_marche uuid, p_lignes jsonb)
 returns jsonb
 language plpgsql
 set search_path to ''
as $function$
declare
  x jsonb;
  v_rang integer := 0;
  v_creees integer := 0;
  v_refus jsonb := '[]'::jsonb;
begin
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' or jsonb_array_length(p_lignes) = 0 then
    raise exception 'Aucune ligne à importer.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lignes) > 2000 then
    raise exception 'Au plus 2 000 lignes par import : découpez le devis.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.btp_marches m where m.id = p_marche) then
    raise exception 'Marché introuvable.' using errcode = 'P0002';
  end if;
  for x in select e from jsonb_array_elements(p_lignes) e loop
    v_rang := v_rang + 1;
    begin
      if jsonb_typeof(x) <> 'object' then
        raise exception 'Ligne illisible.' using errcode = '22023';
      end if;
      perform public.btp_ecrire_ligne(null, p_marche, x);
      v_creees := v_creees + 1;
    exception when others then
      v_refus := v_refus || jsonb_build_object('rang', v_rang, 'designation', left(x ->> 'designation', 120), 'message', left(sqlerrm, 300));
    end;
  end loop;
  return jsonb_build_object('creees', v_creees, 'refus', v_refus);
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function public.btp_importer_lignes(uuid, jsonb) from public, anon;
grant execute on function public.btp_importer_lignes(uuid, jsonb) to authenticated, service_role;
