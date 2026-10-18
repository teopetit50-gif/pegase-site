-- FILED, lot 36 (a4_44) — tva.taux : dire « TVA étrangère » quand le fournisseur est établi hors de France.
--
-- Vu au banc (chantier 3, 18/10, exemples de la norme ZUGFeRD 2 — pas de vraies factures) : un fournisseur allemand
-- qui facture 19 % et 7 % recevait « Taux de TVA qui n'existe pas en France », juste mais trompeur. Le contrôle reste
-- bloquant ; seul le message change quand le fournisseur est établi hors de France (pays hors France et DROM, ou
-- préfixe de TVA autre que FR) : entre entreprises, la TVA d'un fournisseur de l'Union est normalement autoliquidée
-- par l'acheteur ; une TVA étrangère facturée est à vérifier (ou à faire rembourser par le pays qui l'a perçue).
--
-- Pose « par repère », comme a4_43 : le corps en base (pg_get_functiondef) ; seul le fragment visé change ; déjà
-- remplacé, il n'est pas retouché ; introuvable, la migration s'arrête sans rien poser. Droits inchangés.
-- Aucun DROP, aucune suppression ; aucun envoi.

do $do$
declare
  v_def text;
  v_ancien text := $o$            'Taux de TVA qui n''existe pas en France : ' || array_to_string(v_hors, ' %, ') || ' %.', 'TX_TVA_ERR',
$o$;
  v_nouveau text := $n$            case when coalesce(v_four.pays, 'FR') not in ('FR', 'GP', 'MQ', 'GF', 'RE', 'YT', 'PM', 'BL', 'MF')
                      or upper(left(coalesce(nullif(v_f.fournisseur_lu ->> 'tva', ''), v_four.tva, 'FR'), 2)) <> 'FR' -- a4_44
                 then 'TVA étrangère facturée (' || array_to_string(v_hors, ' %, ') || ' %) par un fournisseur établi hors de France : '
                      || 'entre entreprises, l''acheteur autoliquide normalement la TVA. À vérifier avant paiement.'
                 else 'Taux de TVA qui n''existe pas en France : ' || array_to_string(v_hors, ' %, ') || ' %.' end, 'TX_TVA_ERR',
$n$;
begin
  v_def := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  if position(v_nouveau in v_def) > 0 then
    raise notice 'a4_44 : private.filed_controler_facture(uuid) déjà corrigée.';
    return;
  end if;
  if (length(v_def) - length(replace(v_def, v_ancien, ''))) / length(v_ancien) <> 1 then
    raise exception 'a4_44 : le repère attendu n''est pas une fois et une seule dans private.filed_controler_facture. Rien n''est posé.';
  end if;
  execute replace(v_def, v_ancien, v_nouveau);
  raise notice 'a4_44 : private.filed_controler_facture(uuid) corrigée.';
end $do$;
