-- a4_72 (FILED lot 64) : même numéro, autre montant (ou autre date) n'est pas un doublon exact : « doublon.numero ».
--
-- TFILED-04 (testeur boîte noire, client banc-test-filed, vérifié par le coordinateur dans filed_controles, 21/10/2026) :
-- F4b (même numéro MCD-2026-1001, TTC 848,47 au lieu de 846,30) portait le code doublon.exact, avec un message juste
-- (« Même numéro… pour un montant de 848,47 € au lieu de 846,30 € ») mais un code faux.
--
--   · doublon.exact ne vaut plus anomalie que pour le vrai doublon : même fournisseur, même numéro, même date, même
--     montant ; c'est le seul cas où la pièce est écartée (inchangé). Sinon il est posé « ok », en disant pourquoi.
--   · doublon.numero (nouveau, bloquant, motif DOUBLON) : même numéro la même année qu'une pièce reçue avant, mais un
--     autre montant ou une autre date. La pièce n'est PAS écartée : une personne tranche (avoir, facture rectificative,
--     erreur de numérotation). Le message est celui d'avant, complété de la date quand elle diffère.
--   · Aucun écran ni filtre du site ne lit doublon.exact (relu : app/, components/, lib/) ; le banc de référence
--     attend doublon.numero pour ses deux cas de TTC contradictoires (COH-FXC-013, BENCH-PDF-AMOUNT-CONFLICT).
-- Repère dans private.filed_controler_facture : l'appel qui pose doublon.exact (texte du lot 7, a4_43). Rejouable.

create or replace function private.filed_poser_doublon_numero(p_f public.filed_factures, p_autre public.filed_factures, p_autre_ref text, p_ecartee uuid)
returns void language plpgsql security definer set search_path to '' as $$
begin
  perform private.filed_poser_resultat(p_f, 'doublon.exact', 'bloquant', p_ecartee is not null,
    case when p_ecartee is not null
           then format('Même facture que la pièce %s : même numéro, même date, même montant. Écartée, elle reste consultable.', p_autre_ref)
         when p_autre.id is not null
           then format('Pas un doublon exact de la pièce %s : même numéro, mais pas le même montant ou pas la même date (voir « même numéro »).', p_autre_ref)
         else 'Aucune autre facture de ce fournisseur ne porte ce numéro cette année.' end,
    'DOUBLON', case when p_ecartee is null then '{}'::jsonb else jsonb_build_object('facture', p_autre.id, 'piece', p_autre_ref) end,
    coalesce(p_ecartee::text, ''));
  if p_autre.id is not null and p_ecartee is null then
    perform private.filed_poser_resultat(p_f, 'doublon.numero', 'bloquant', true,
      left(format('Même numéro que la pièce %s%s%s : un numéro ne sert qu''une fois. La pièce n''est pas écartée : une personne tranche (avoir, facture rectificative, erreur de numéro).',
                  p_autre_ref,
                  case when p_autre.montant_ttc is distinct from p_f.montant_ttc
                       then format(', pour un montant de %s au lieu de %s', private.filed_montant_texte(p_f.montant_ttc), private.filed_montant_texte(p_autre.montant_ttc))
                       else '' end,
                  case when p_autre.date_emission is distinct from p_f.date_emission
                       then format(', datée du %s au lieu du %s', to_char(p_f.date_emission, 'DD/MM/YYYY'), to_char(p_autre.date_emission, 'DD/MM/YYYY'))
                       else '' end), 500),
      'DOUBLON', jsonb_build_object('facture', p_autre.id, 'piece', p_autre_ref, 'montant_autre', p_autre.montant_ttc, 'date_autre', p_autre.date_emission),
      p_autre.id::text);
  end if;
end $$;
revoke all on function private.filed_poser_doublon_numero(public.filed_factures, public.filed_factures, text, uuid) from public, anon, authenticated;
grant execute on function private.filed_poser_doublon_numero(public.filed_factures, public.filed_factures, text, uuid) to service_role;

do $$
declare
  v_def text;
  v_debut constant text := E'    perform private.filed_poser_resultat(v_f, ''doublon.exact'', ''bloquant'', v_autre.id is not null,\n';
  v_fin constant text := E'      coalesce(v_autre.id::text, ''''));\n';
  v_n int; v_i int; v_j int;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  if position('filed_poser_doublon_numero' in v_def) > 0 then
    return;
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_debut, ''))) / length(v_debut);
  if v_n <> 1 then raise exception 'a4_72 : repère doublon.exact trouvé % fois (1 attendu)', v_n; end if;
  v_i := position(v_debut in v_def);
  v_j := position(v_fin in substr(v_def, v_i));
  if v_j = 0 or v_j > 1200 then raise exception 'a4_72 : fin de l''appel doublon.exact introuvable'; end if;
  execute left(v_def, v_i - 1)
       || E'    perform private.filed_poser_doublon_numero(v_f, v_autre, v_autre_ref, v_ecartee);   -- a4_72 : doublon exact, ou même numéro\n'
       || substr(v_def, v_i + v_j - 1 + length(v_fin));
end $$;
