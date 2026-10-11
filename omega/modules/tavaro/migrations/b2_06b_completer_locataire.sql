-- b2_06b — public.loc_completer_locataire corrigée (session B2, 06/10/2026).
--
-- POURQUOI : la porte ajoutait le nom de chaque champ complété par « v_champs := v_champs || 'siren' ». En PL/pgSQL,
-- text[] || 'littéral' lit le littéral comme un tableau : « 22P02 malformed array literal: "siren" » au premier SIREN
-- (test ^test_b2_15_, ligne 32 de la fonction). Corrigé par array_append, aux trois endroits (siren, raison_sociale,
-- adresse). Rien d'autre ne change : même signature, mêmes droits. Reporté dans la source b2_06.

CREATE OR REPLACE FUNCTION public.loc_completer_locataire(p_locataire uuid, p_valeurs jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  l public.loc_locataires;
  v_siren text;
  v_rs text;
  v_adresse text;
  v_champs text[] := '{}';
begin
  if v_uid is null then
    raise exception 'Ce geste se fait par une personne connectée.' using errcode = '42501';
  end if;
  select * into l from public.loc_locataires where id = p_locataire for update;
  if not found or not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = l.client_id) then
    raise exception 'Client introuvable.' using errcode = 'P0002';
  end if;
  if not private.a_un_role(l.client_id, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not exists (select 1 from public.loc_contrats c where c.client_id = l.client_id and c.locataire_id = l.id and private.voit_entite(c.client_id, c.entite_id)) then
    raise exception 'Ce client n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if l.anonymise_le is not null then
    raise exception 'Ce client est anonymisé.' using errcode = '23514';
  end if;
  if jsonb_typeof(p_valeurs) is distinct from 'object' then
    raise exception 'Les valeurs sont un objet.' using errcode = '22023';
  end if;
  if p_valeurs ? 'siren' then
    v_siren := regexp_replace(coalesce(p_valeurs ->> 'siren', ''), '\s', '', 'g');
    if not private.loc_siren_valide(v_siren) then
      raise exception 'Ce SIREN n''est pas valide (neuf chiffres, clé de contrôle) : vérifiez-le sur l''extrait Kbis ou annuaire-entreprises.data.gouv.fr.' using errcode = '22023';
    end if;
    v_champs := array_append(v_champs, 'siren');
  end if;
  v_rs := private.loc_lire_texte(p_valeurs, 'raison_sociale', 200);
  if v_rs is not null then v_champs := array_append(v_champs, 'raison_sociale'); end if;
  v_adresse := private.loc_lire_texte(p_valeurs, 'adresse', 500);
  if v_adresse is not null then v_champs := array_append(v_champs, 'adresse'); end if;
  if cardinality(v_champs) = 0 then
    raise exception 'Rien à compléter.' using errcode = '22023';
  end if;
  update public.loc_locataires
     set siren = coalesce(v_siren, siren), raison_sociale = coalesce(v_rs, raison_sociale), adresse = coalesce(v_adresse, adresse),
         type = case when v_siren is not null or v_rs is not null then 'professionnel' else type end
   where id = l.id;
  perform private.journaliser_module(l.client_id, 'tavaro', 'tavaro.locataire_complete', 'loc_locataires', l.id::text,
    jsonb_build_object('champs', to_jsonb(v_champs), 'par', v_uid), null);
  return jsonb_build_object('locataire', l.id, 'champs', to_jsonb(v_champs));
end $function$;

revoke all on function public.loc_completer_locataire(uuid, jsonb) from public, anon;
grant execute on function public.loc_completer_locataire(uuid, jsonb) to authenticated, service_role;
