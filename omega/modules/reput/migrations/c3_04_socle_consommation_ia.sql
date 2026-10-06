-- c3_04 — SOCLE (demandé par C3, posé par le coordinateur) : le plafond d'IA du jour compte aussi les réponses REPUT.
--
-- private.consommation_ia_jour(p_client) ne sommait que les travaux lecteur.lire : les réponses préparées par
-- reput-reponse (travaux reput.preparer, même clé cout_eur dans finir_travail) échappaient au plafond
-- plafond_ia_jour_client (5 € par défaut). Même définition que dans omega/SOCLE-EXTRAITS-ENVOIS.sql (main 959f115),
-- un seul changement : genre in ('lecteur.lire', 'reput.preparer'). Signature, droits et propriétaire inchangés.
-- Rejouable : create or replace.

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
  where t.client_id = p_client and t.genre in ('lecteur.lire', 'reput.preparer') and t.etat = 'fait'
    and t.fini_le >= date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris'
    and (t.resultat ->> 'cout_eur') ~ '^[0-9.]+$';
  return v;
end $function$;
