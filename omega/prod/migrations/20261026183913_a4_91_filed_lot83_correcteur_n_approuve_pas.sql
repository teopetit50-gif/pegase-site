-- 20261026183913 a4_91_filed_lot83_correcteur_n_approuve_pas
-- Source : dépôt : 6c0413ccbafc8e7a05be7a18e39a96f8467c13b9 omega/migrations/a4_91_filed_lot83_correcteur_n_approuve_pas.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_91_filed_lot83_correcteur_n_approuve_pas.sql @ 6c0413ccbafc8e7a05be7a18e39a96f8467c13b9 ; fichiers de tests ignorés : omega/tests/filed/a4_78_correcteur_n_approuve_pas.sql.
-- ═══ omega/migrations/a4_91_filed_lot83_correcteur_n_approuve_pas.sql @ 6c0413ccbafc8e7a05be7a18e39a96f8467c13b9
-- a4_91 (FILED lot 83) : TMOD-02 — qui corrige une facture pour sa reprise ne l'approuve pas, s'il existe un autre
-- décideur ; seul décideur, il le peut, et c'est marqué « [seul décideur] ».
--
-- Avant : la demande de reprise (a4_86) reprenait le payload de la demande refusée, donc son saisi_par d'avant la
-- correction ([] pour une pièce déposée par le système). Le valideur qui avait refusé pouvait corriger la facture, puis
-- approuver seul sa propre correction. Même principe que « celui qui chiffre ne signe pas ».
-- Maintenant :
--   · La demande de reprise porte payload.corrige_par : les personnes qui ont corrigé la facture depuis le refus
--     (historique « corrigee »). S'il existe un autre décideur (un compte de l'organisation dont le rôle peut décider
--     de la demande, dans son périmètre), elles sont aussi ajoutées à payload.saisi_par, que le socle lit ; sinon,
--     payload.seul_decideur = true.
--   · Un déclencheur BEFORE INSERT sur public.approbations (approbations_zz_filed_correcteur, après celui du socle,
--     limité au module FILED et aux approbations) refuse en 42501 l'approbation d'un correcteur quand un autre décideur
--     existe au moment de la décision — y compris un gérant, que le socle laisse décider seul (a4_76 vaut pour la
--     saisie ordinaire, pas pour la correction d'une facture refusée) ; sans autre décideur, il passe, marqué
--     « [seul décideur] ». Un correcteur peut toujours rejeter.
-- Un repère dans filed_traiter_reprises ; la pose s'arrête s'il n'est pas trouvé une fois. Rejouable ; aucune
-- suppression.

-- Les personnes qui ont corrigé la facture depuis p_depuis.
create or replace function private.filed_correcteurs(p_facture uuid, p_depuis timestamptz)
returns uuid[] language sql stable security definer set search_path to '' as $$
  select coalesce(array_agg(distinct h.acteur_id), '{}')
    from public.filed_factures f join public.filed_historique h on h.document_id = f.document_id
   where f.id = p_facture and h.etape = 'corrigee' and h.acteur_type = 'utilisateur' and h.acteur_id is not null
     and h.survenu_le >= p_depuis
$$;

-- Vrai s'il existe, hors p_exclus, une personne de l'organisation qui peut décider de la demande.
create or replace function private.filed_autre_decideur(p_d public.demandes_validation, p_exclus uuid[])
returns boolean language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.comptes c
                  where c.client_id = p_d.client_id and c.role = any (p_d.roles_autorises)
                    and not (c.user_id = any (coalesce(p_exclus, '{}')))
                    and private.perimetre_couvre(c.user_id, p_d.client_id, p_d.entite_id))
$$;

-- Ce que la demande de reprise ajoute à son payload : correcteurs, saisisseurs, seul décideur.
create or replace function private.filed_reprise_separation(p_d public.demandes_validation, p_facture uuid, p_depuis timestamptz)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_corr uuid[] := private.filed_correcteurs(p_facture, p_depuis); v_saisi jsonb;
begin
  v_saisi := case when jsonb_typeof(p_d.payload -> 'saisi_par') = 'array' then p_d.payload -> 'saisi_par' else '[]'::jsonb end;
  if cardinality(v_corr) = 0 then
    return jsonb_build_object('corrige_par', '[]'::jsonb, 'saisi_par', v_saisi);
  end if;
  if private.filed_autre_decideur(p_d, v_corr) then
    return jsonb_build_object('corrige_par', to_jsonb(v_corr), 'seul_decideur', false,
      'saisi_par', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb)
                      from (select jsonb_array_elements_text(v_saisi) x union select u::text from unnest(v_corr) u) s));
  end if;
  return jsonb_build_object('corrige_par', to_jsonb(v_corr), 'seul_decideur', true, 'saisi_par', v_saisi);
end $$;

-- La garde à la décision : un correcteur n'approuve pas sa correction s'il existe un autre décideur.
create or replace function private.filed_correcteur_n_approuve_pas()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_d public.demandes_validation; v_qui uuid := coalesce(new.au_nom_de, new.user_id); v_corr uuid[];
begin
  if new.decision <> 'approuve' then return new; end if;
  select * into v_d from public.demandes_validation d where d.id = new.demande_id;
  if v_d.module is distinct from 'filed' or jsonb_typeof(v_d.payload -> 'corrige_par') is distinct from 'array' then return new; end if;
  select coalesce(array_agg(x::uuid), '{}') into v_corr from jsonb_array_elements_text(v_d.payload -> 'corrige_par') x;
  if not (v_qui = any (v_corr) or new.user_id = any (v_corr)) then return new; end if;
  if private.filed_autre_decideur(v_d, v_corr) then
    raise exception 'Vous avez corrigé cette facture pour sa reprise : une autre personne l''approuve.' using errcode = '42501';
  end if;
  if coalesce(new.commentaire, '') not like '[seul décideur]%' then
    new.commentaire := left('[seul décideur] ' || coalesce(new.commentaire, ''), 2000);
  end if;
  return new;
end $$;

revoke all on function private.filed_correcteurs(uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.filed_autre_decideur(public.demandes_validation, uuid[]) from public, anon, authenticated;
revoke all on function private.filed_reprise_separation(public.demandes_validation, uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.filed_correcteur_n_approuve_pas() from public, anon, authenticated;
grant execute on function private.filed_correcteurs(uuid, timestamptz) to service_role;

do $$ begin
  if not exists (select 1 from pg_trigger where tgrelid = 'public.approbations'::regclass and tgname = 'approbations_zz_filed_correcteur') then
    create trigger approbations_zz_filed_correcteur before insert on public.approbations
      for each row execute function private.filed_correcteur_n_approuve_pas();
  end if;
end $$;

-- filed_traiter_reprises : la demande de reprise porte ses correcteurs.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_traiter_reprises(interval)'::regprocedure);
  v_rep constant text := 'd.payload || jsonb_build_object(''version'', f.version, ''montant_ttc'', f.montant_ttc, ''anomalies'', to_jsonb(f.anomalies)),';
  v_n int;
begin
  if position('filed_reprise_separation' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a4_91 : repère de filed_traiter_reprises trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep,
    'd.payload || jsonb_build_object(''version'', f.version, ''montant_ttc'', f.montant_ttc, ''anomalies'', to_jsonb(f.anomalies))'
    || ' || private.filed_reprise_separation(d, f.id, r.cree_le),   /* a4_91 */');
end $$;
