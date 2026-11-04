-- 20261011135244 19aq_analyses_paliers
-- Source : dépôt : e92e13b omega/modules/socle/migrations/19aq_analyses_paliers.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : 19aq_analyses_paliers.sql @ e92e13b.
-- ═══ omega/modules/socle/migrations/19aq_analyses_paliers.sql @ e92e13b
-- 19aq_analyses_paliers — socle : le garde-fou des paliers des analyses suit la taille du dossier. A1, 11/10/2026.
-- 19an arrêtait toute analyse au 50e palier. Un vrai dossier de 200 pièces (limite des types Tamila) peut en demander
-- davantage quand les appels au modèle sont lents. Le garde-fou devient : deux paliers par pièce du périmètre, 50 au moins.
-- Seule private.terminer_analyse change (create or replace, même signature, mêmes droits) ; rien d'autre n'est touché.
-- Aucune suppression ; rejouable.

-- ─── private.terminer_analyse : le résultat (ou l'état) rendu par le lecteur ───
create or replace function private.terminer_analyse(p_analyse uuid, p_resultat jsonb, p_version text default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  a public.analyses;
  v_statut text := p_resultat ->> 'statut';
  v_res bytea; v_etat bytea;
  v_non_lues uuid[];
begin
  perform private.exiger_ouvrier();
  select * into a from public.analyses where id = p_analyse for update;
  if not found then raise exception 'Analyse introuvable.' using errcode = 'P0002'; end if;
  if a.statut <> 'en_cours' then
    raise exception 'L''analyse n''est pas en cours (statut %).', a.statut using errcode = '55000';
  end if;
  if v_statut is null or v_statut not in ('finie', 'partielle', 'en_cours', 'echec') then
    raise exception 'Statut d''analyse inconnu : %.', coalesce(v_statut, 'vide') using errcode = '22023';
  end if;
  if a.chiffrement is not null and (p_resultat ? 'resultat' or p_resultat ? 'etat') then
    raise exception 'Analyse chiffrée (%) : ni résultat ni état en clair.', a.chiffrement using errcode = '22023';
  end if;
  if a.chiffrement is null and (p_resultat ? 'resultat_chiffre' or p_resultat ? 'etat_chiffre') then
    raise exception 'Analyse en clair : rien ne s''y écrit chiffré.' using errcode = '22023';
  end if;
  begin
    v_res := case when p_resultat ->> 'resultat_chiffre' is not null then decode(p_resultat ->> 'resultat_chiffre', 'base64') end;
    v_etat := case when p_resultat ->> 'etat_chiffre' is not null then decode(p_resultat ->> 'etat_chiffre', 'base64') end;
  exception when others then
    raise exception 'Chiffré illisible (base64 attendu).' using errcode = '22023';
  end;
  select coalesce(array_agg(x::uuid), '{}') into v_non_lues
    from jsonb_array_elements_text(coalesce(p_resultat -> 'pieces_non_lues', '[]'::jsonb)) x
   where x ~ '^[0-9a-f-]{36}$';

  if v_statut = 'en_cours' then
    if a.paliers >= greatest(50, 2 * coalesce(cardinality(a.pieces), 0)) then
      -- Garde-fou : une analyse qui n'avance plus ne tourne pas sans fin. Deux paliers par pièce du périmètre, 50 au moins :
      -- un dossier de 200 pièces en demande une vingtaine (quatre tranches lues en même temps), jamais 400.
      update public.analyses set statut = 'echec',
             motif = format('Trop de paliers (%s) : l''analyse est arrêtée.', greatest(50, 2 * coalesce(cardinality(a.pieces), 0))), finie_le = now(),
             etat = null, etat_chiffre = null, version = left(p_version, 40)
       where id = a.id;
      return jsonb_build_object('analyse', a.id, 'statut', 'echec', 'paliers', a.paliers);
    end if;
    update public.analyses
       set etat = case when a.chiffrement is null then p_resultat -> 'etat' end,
           etat_chiffre = v_etat,
           paliers = a.paliers + 1,
           cout_eur = coalesce((p_resultat ->> 'cout_eur')::numeric, cout_eur),
           appels_ia = coalesce((p_resultat ->> 'appels_ia')::integer, appels_ia),
           modele = coalesce(left(p_resultat ->> 'modele', 120), modele),
           version = left(p_version, 40)
     where id = a.id;
    perform private.deposer_travail(a.client_id, a.module, 'lecteur.analyser', jsonb_build_object('analyse', a.id),
                                    'analyse:' || a.id::text || ':' || (a.paliers + 1)::text, 0::smallint);
    return jsonb_build_object('analyse', a.id, 'statut', 'en_cours', 'paliers', a.paliers + 1);
  end if;

  update public.analyses
     set statut = v_statut,
         resultat = case when a.chiffrement is null and v_statut <> 'echec' then p_resultat -> 'resultat' end,
         resultat_chiffre = case when v_statut <> 'echec' then v_res end,
         etat = null, etat_chiffre = null,
         comptes = p_resultat -> 'comptes',
         sans_source = (p_resultat ->> 'sans_source')::integer,
         pieces_lues = (p_resultat ->> 'pieces_lues')::integer,
         pieces_non_lues = v_non_lues,
         cout_eur = (p_resultat ->> 'cout_eur')::numeric,
         appels_ia = (p_resultat ->> 'appels_ia')::integer,
         modele = left(p_resultat ->> 'modele', 120),
         motif = left(p_resultat ->> 'motif', 500),
         version = left(p_version, 40),
         finie_le = now()
   where id = a.id;
  perform private.publier_evenement(a.client_id, 'analyse_finie.' || a.module,
    jsonb_build_object('analyse', a.id, 'module', a.module, 'type', a.type, 'statut', v_statut,
                       'objet_type', a.objet_type, 'objet_id', a.objet_id, 'comptes', p_resultat -> 'comptes'),
    'analyse:' || a.id::text);
  return jsonb_build_object('analyse', a.id, 'statut', v_statut);
end $$;

revoke all on function private.terminer_analyse(uuid, jsonb, text) from public, anon, authenticated;
grant execute on function private.terminer_analyse(uuid, jsonb, text) to service_role;
