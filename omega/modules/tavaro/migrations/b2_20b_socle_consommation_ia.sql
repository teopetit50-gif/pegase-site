-- b2_20b — SOCLE (demandé par B2, à poser par le coordinateur) : le plafond d'IA du jour compte aussi les Questions
-- Tavaro. Même définition que c3_04 (omega/modules/reput/migrations), un seul changement : le genre tavaro.question
-- s'ajoute à la liste. AVANT DE POSER : vérifier sur la recette que la définition en place ne compte pas d'autre genre
-- que lecteur.lire et reput.preparer ; sinon, ajouter tavaro.question à la liste en place, sans rien retirer.
-- Signature, droits et propriétaire inchangés. Rejouable : create or replace.

CREATE OR REPLACE FUNCTION private.consommation_ia_jour(p_client uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v numeric;
begin
  perform private.exiger_ouvrier();
  select coalesce(sum((t.resultat ->> 'cout_eur')::numeric), 0) into v
  from public.travaux t
  where t.client_id = p_client and t.genre in ('lecteur.lire', 'reput.preparer', 'tavaro.question') and t.etat = 'fait'
    and t.fini_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
    and (t.resultat ->> 'cout_eur') ~ '^[0-9.]+$';
  return v;
end $function$;
