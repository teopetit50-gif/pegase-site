-- b2_11b — Un véhicule vendu ne redevient pas actif par un import (session B2, 06/10/2026).
--
-- POURQUOI : l'import de la flotte (private.loc_appliquer_ligne_vehicule, socle) réécrit loc_vehicules.statut avec ce que
-- porte l'export du logiciel du loueur. Un véhicule sorti de la flotte par Tavaro (vente conclue, b2_11) y figure
-- souvent encore « actif » quelques jours : sans garde, l'import suivant le remettrait en service — fiche économique,
-- remises en location, créneaux d'entretien. Demandé par le coordinateur le 06/10 (19 h 50 Z).
--
-- La garde : un déclencheur AJOUTÉ (BEFORE UPDATE OF statut) garde « sorti » quand une vente est conclue pour ce
-- véhicule, et prévient l'agence une fois (alerte dédoublonnée par véhicule). Elle ne bloque jamais l'écriture du
-- reste de la ligne (kilométrage, modèle…). Rien n'est retiré du socle.

CREATE OR REPLACE FUNCTION private.loc_garder_vehicule_sorti()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if old.statut = 'sorti' and new.statut is distinct from 'sorti'
     and exists (select 1 from public.loc_sorties_flotte s where s.client_id = old.client_id and s.vehicule_id = old.id and s.statut = 'vendue') then
    new.statut := 'sorti';
    begin
      perform private.lever_alerte_module(old.client_id, 'tavaro', 'info',
        format('L''export de votre logiciel présente encore %s comme en service : Tavaro le garde sorti de la flotte (vente conclue). Retirez-le de votre logiciel.', old.immatriculation),
        jsonb_build_object('vehicule', old.id), 'vehicule:sorti_reimporte:' || old.id::text, true, null);
    exception when others then
      raise warning 'loc_garder_vehicule_sorti %: %', old.id, sqlerrm;
    end;
  end if;
  return new;
end $function$;

do $$ begin
  if not exists (select 1 from pg_trigger where tgname = 'loc_vehicules_garder_sorti' and tgrelid = 'public.loc_vehicules'::regclass) then
    create trigger loc_vehicules_garder_sorti before update of statut on public.loc_vehicules
      for each row execute function private.loc_garder_vehicule_sorti();
  end if;
end $$;

revoke all on function private.loc_garder_vehicule_sorti() from public, anon, authenticated;
