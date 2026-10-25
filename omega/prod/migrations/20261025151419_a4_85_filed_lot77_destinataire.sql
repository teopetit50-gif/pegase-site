-- 20261025151419 a4_85_filed_lot77_destinataire
-- Source : dépôt : 4c8d9fbea11412ee5d1b30291287ca647c00f2ba omega/migrations/a4_85_filed_lot77_destinataire.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_85_filed_lot77_destinataire.sql @ 4c8d9fbea11412ee5d1b30291287ca647c00f2ba ; fichiers de tests ignorés : omega/tests/filed/a4_73_destinataire.sql.
-- ═══ omega/migrations/a4_85_filed_lot77_destinataire.sql @ 4c8d9fbea11412ee5d1b30291287ca647c00f2ba
-- a4_85 (FILED lot 77) : une facture adressée à une autre société est arrêtée, même sans SIREN lisible (TFILED-05).
--
-- TFILED-05 (testeur boîte noire, relancé par Teo le 25/10/2026) : destinataire.societe ne jugeait que le SIREN de
-- l'acheteur, tel quel. Une facture adressée à une autre société passait sans un mot quand :
--   · le SIREN était lu avec des espaces (« 412 345 670 ») : jamais égal à celui de la société ;
--   · l'acheteur n'était donné que par son numéro de TVA (FR + clé + SIREN) ;
--   · l'acheteur n'était donné que par son nom (cas de la pièce NOBAT 069).
--
--   · Le SIREN de l'acheteur est lu en chiffres seuls, ou tiré de son numéro de TVA français (private.filed_siren_de_tva_fr).
--   · Sans SIREN, son nom est comparé, par private.filed_cle_nom (formes sociales, espaces, pluriels ignorés, a4_70), au
--     nom de la société, de ses autres sociétés et de l'organisation ; l'un contenu dans l'autre suffit (« NOBAT » /
--     « NOBAT (banc) »). Aucun ne correspond : bloquant, motif DEST_ERR, « adressée à « … », qui n'est pas cette
--     société » ; destinataire.societe est levable (liste du socle) par une personne qui sait que c'est bien elle.
--   · Le reste ne change pas : SIREN égal → ok ; SIREN d'une autre société de l'organisation → la facture y est rangée ;
--     SIREN de la société non renseigné → info.
-- Repères dans private.filed_controler_facture (la lecture du SIREN de l'acheteur et la fin du bloc du destinataire) ;
-- chaque pose s'arrête si son repère n'est pas trouvé une fois. Rejouable ; aucune suppression.

-- Le SIREN de l'acheteur : en chiffres seuls, ou tiré de son numéro de TVA français.
create or replace function private.filed_siren_acheteur(p_f public.filed_factures)
returns text language sql stable security definer set search_path to '' as $$
  select coalesce(
    nullif(regexp_replace(coalesce(p_f.acheteur_lu ->> 'siren', ''), '[^0-9]', '', 'g'), ''),
    private.filed_siren_de_tva_fr(nullif(upper(regexp_replace(coalesce(p_f.acheteur_lu ->> 'tva', ''), '[^A-Za-z0-9]', '', 'g')), '')))
$$;

-- Le nom de l'acheteur, quand il ne correspond à aucune société de l'organisation ; nul sinon (ou sans nom).
create or replace function private.filed_acheteur_inconnu_par_nom(p_f public.filed_factures)
returns text language plpgsql stable security definer set search_path to '' as $$
declare v_nom text := nullif(btrim(coalesce(p_f.acheteur_lu ->> 'nom', '')), ''); v_cle text;
begin
  if v_nom is null then return null; end if;
  v_cle := private.filed_cle_nom(v_nom);
  if coalesce(v_cle, '') = '' then return null; end if;
  if exists (select 1 from public.entites e where e.client_id = p_f.client_id
              and (position(v_cle in private.filed_cle_nom(e.nom)) > 0 or position(private.filed_cle_nom(e.nom) in v_cle) > 0))
     or exists (select 1 from public.clients c where c.id = p_f.client_id
              and (position(v_cle in private.filed_cle_nom(c.nom)) > 0 or position(private.filed_cle_nom(c.nom) in v_cle) > 0)) then
    return null;
  end if;
  return v_nom;
end $$;

revoke all on function private.filed_siren_acheteur(public.filed_factures) from public, anon, authenticated;
revoke all on function private.filed_acheteur_inconnu_par_nom(public.filed_factures) from public, anon, authenticated;
grant execute on function private.filed_siren_acheteur(public.filed_factures) to service_role;
grant execute on function private.filed_acheteur_inconnu_par_nom(public.filed_factures) to service_role;

do $$
declare
  v_def text := pg_get_functiondef('private.filed_controler_facture(uuid)'::regprocedure);
  v_lecture constant text := E'  v_ach_siren := v_f.acheteur_lu ->> ''siren'';\n';
  v_fin constant text := E'    end if;\n  end if;\n\n  -- ── La TVA ──';
  v_n int;
begin
  if position('filed_siren_acheteur' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_lecture, ''))) / length(v_lecture);
  if v_n <> 1 then raise exception 'a4_85 : repère « SIREN de l''acheteur » trouvé % fois (1 attendu)', v_n; end if;
  v_n := (length(v_def) - length(replace(v_def, v_fin, ''))) / length(v_fin);
  if v_n <> 1 then raise exception 'a4_85 : repère « fin du destinataire » trouvé % fois (1 attendu)', v_n; end if;
  v_def := replace(v_def, v_lecture,
    E'  v_ach_siren := private.filed_siren_acheteur(v_f);   -- a4_85 : chiffres seuls, ou tiré de la TVA de l''acheteur\n');
  v_def := replace(v_def, v_fin,
       E'    end if;\n'
    || E'  elsif private.filed_acheteur_inconnu_par_nom(v_f) is not null then   -- a4_85 : sans SIREN, le nom\n'
    || E'    perform private.filed_poser_resultat(v_f, ''destinataire.societe'', ''bloquant'', true,\n'
    || E'      format(''Facture adressée à « %s », qui n''''est ni cette société ni une autre société de l''''organisation : à vérifier avant de la traiter.'',\n'
    || E'             private.filed_acheteur_inconnu_par_nom(v_f)),\n'
    || E'      ''DEST_ERR'', jsonb_build_object(''acheteur_nom'', private.filed_acheteur_inconnu_par_nom(v_f)),\n'
    || E'      private.filed_cle_nom(private.filed_acheteur_inconnu_par_nom(v_f)));\n'
    || E'  end if;\n\n  -- ── La TVA ──');
  execute v_def;
end $$;
