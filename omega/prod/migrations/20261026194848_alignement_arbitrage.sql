-- 20261026194848 alignement_arbitrage
-- Source : omega/prod/arbitrage/alignement.sql (arbitrage du 26/10, avant la clôture).

-- Lot d'alignement de l'arbitrage du 26/10/2026 (omega/prod/ARBITRAGE-2026-10-26.md).
-- Les 7 fonctions dont la recette a une version plus récente que celle où la séquence s'arrête : définitions
-- exactes de la recette (pg_get_functiondef, relevé du 26/10). « create or replace » garde propriétaire et droits.
-- Rejouable : sans effet si la fonction est déjà à cette version.

-- private.filed_saisisseurs(uuid)
-- FILED (a4_13, reposé sur la recette à un commit plus récent sans nouvelle ligne) : les étapes que FILED écrit lui-même en contrôlant (controlee, integree, imputee…) ne font pas d'une personne un « saisisseur » ; sans elles, la séparation saisie/approbation bloque à tort.
CREATE OR REPLACE FUNCTION private.filed_saisisseurs(p_facture uuid)
 RETURNS uuid[]
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(array_agg(distinct u), '{}')
    from (
      select d.depose_par as u from public.filed_factures f join public.filed_documents d on d.id = f.document_id where f.id = p_facture and d.depose_par is not null
      union
      select h.acteur_id from public.filed_factures f join public.filed_historique h on h.document_id = f.document_id
       where f.id = p_facture and h.acteur_type = 'utilisateur' and h.acteur_id is not null
         and h.etape not in ('validee', 'refusee', 'archivee', 'litige_ouvert', 'litige_clos', 'reglee', 'validation_demandee', 'relancee', 'remontee', 'annexe',
                             -- Lot 7 (a4_13) : ce que FILED écrit en contrôlant, même quand une personne a déclenché le contrôle.
                             'controlee', 'integree', 'identite_completee', 'identite_verifiee', 'reorientee', 'doublon', 'charge_reconnue',
                             'imputation_proposee', 'imputation_tranchee', 'imputee', 'relue_sans_effet', 'decision_perimee', 'comptabilisee')
    ) s
$function$;

-- private.grp_proposer_aretes(uuid,public.grp_installations,boolean)
-- Varelo (retouche faite à la main sur la recette, sans fichier) : CTE « materialized », même résultat, calcul borné sur les gros groupes.
CREATE OR REPLACE FUNCTION private.grp_proposer_aretes(p_client uuid, p_inst grp_installations, p_complet boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  a record;
  v_sources uuid[];
  v_cibles uuid[];
  v_codes uuid[];
  v_cle text;
  v_empreinte text;
  v_haut numeric := p_inst.seuil_sur - 0.001;
  v_rare integer := least(p_inst.bloc_max, 40);
  n_sures integer := 0;
  n_probables integer := 0;
  n_memoire integer := 0;
  n_gros integer;
begin
  select coalesce(array_agg(distinct pr.objet_source), '{}') into v_sources
  from public.grp_ref_propositions pr
  where pr.client_id = p_client and pr.statut = 'a_valider' and pr.genre in ('deplacer', 'fusionner');
  select coalesce(array_agg(distinct pr.objet_cible), '{}') into v_cibles
  from public.grp_ref_propositions pr
  where pr.client_id = p_client and pr.statut = 'a_valider' and pr.genre in ('placer', 'deplacer', 'fusionner');

  create temporary table if not exists pg_temp.grp_cles_blocage (id uuid, nature text, objet_id uuid, cle text, precise boolean)
    on commit drop;
  truncate pg_temp.grp_cles_blocage;
  insert into pg_temp.grp_cles_blocage
  select c.id, c.nature, c.objet_id, k.cle, k.precise
  from public.grp_ref_codes c
  cross join lateral (
    select 'm:' || j, false from unnest(c.jetons) as j where char_length(j) >= 3 and j !~ '^[0-9.]+$'
    union all
    select 'mc:' || j || ':' || c.code_postal, true from unnest(c.jetons) as j
    where c.code_postal is not null and char_length(j) >= 3 and j !~ '^[0-9.]+$'
    union all
    select 'bc:' || c.bloc || ':' || c.code_postal, true where c.bloc is not null and c.code_postal is not null
    union all
    select 't:' || c.telephone_cle, true where c.telephone_cle is not null
    union all
    select 'd:' || c.domaine_email, true where c.domaine_email is not null
  ) as k(cle, precise)
  where c.client_id = p_client and c.actif and c.etat in ('nouveau', 'confirme');
  analyze pg_temp.grp_cles_blocage;
  select count(*) into n_gros from (
    select 1 from pg_temp.grp_cles_blocage k group by k.nature, k.cle, k.precise
    having count(*) > case when k.precise then p_inst.bloc_max else v_rare end) g;

  for a in
    with terr as (
      select s.entite_id, private.territoire_de_entite(s.client_id, s.entite_id) as t
      from public.grp_societes s where s.client_id = p_client
    ),
    taille as (
      select o.id, o.numero, o.nature, o.intragroupe, count(y.id) as nb, count(y.id) filter (where y.etat = 'propose') as nb_propose
      from public.grp_ref_objets o left join public.grp_ref_codes y on y.objet_id = o.id
      where o.client_id = p_client and o.statut = 'actif'
      group by o.id
    ),
    e as (
      select c.* from public.grp_ref_codes c
      where c.client_id = p_client and c.actif and c.etat in ('nouveau', 'confirme') and (p_complet or c.a_rapprocher)
    ),
    cles_utiles as (
      select k.id, k.nature, k.objet_id, k.cle
      from pg_temp.grp_cles_blocage k
      join (select k2.nature, k2.cle, count(*) as n, bool_or(k2.precise) as precise
            from pg_temp.grp_cles_blocage k2 group by k2.nature, k2.cle) f on f.nature = k.nature and f.cle = k.cle
      where f.n between 2 and case when f.precise then p_inst.bloc_max else v_rare end
    ),
    candidats as materialized (
      select distinct ke.id as e_id, kx.id as x_id
      from cles_utiles ke
      join e on e.id = ke.id
      join cles_utiles kx on kx.nature = ke.nature and kx.cle = ke.cle and kx.objet_id <> ke.objet_id
      where not exists (select 1 from e e2 where e2.id = kx.id and kx.id < ke.id)
    ),
    sures as materialized (
      select e.id as c_id, e.objet_id as c_obj, b.objet_id as x_obj, b.preuves, 'sure'::text as preuve, b.regle,
             1.000::numeric as score, jsonb_build_array(jsonb_build_object('critere', b.regle, 'valeur', b.valeur)) as raisons
      from e cross join lateral private.grp_preuves_sures(e.id, p_inst.iban_partage_max) b
    ),
    paires as materialized (
      select e.id as c_id, e.objet_id as c_obj, x.id as x_id, x.objet_id as x_obj, e.nature,
             e.jetons as ja, x.jetons as jb, e.code_postal as cpa, x.code_postal as cpb,
             e.adresse_normalisee as aa, x.adresse_normalisee as ab, e.telephone_cle as ta, x.telephone_cle as tb,
             e.domaine_email as da, x.domaine_email as db,
             coalesce(private.grp_territoire_cp(e.code_postal), te.t) as terra,
             coalesce(private.grp_territoire_cp(x.code_postal), tx.t) as terrb, e.unite as ua, x.unite as ub,
             case when e.nature = 'article' then private.grp_fournisseur_de(e.client_id, e.entite_id, e.fournisseur_code) end as fa,
             case when e.nature = 'article' then private.grp_fournisseur_de(x.client_id, x.entite_id, x.fournisseur_code) end as fb
      from candidats k
      join e on e.id = k.e_id
      join public.grp_ref_codes x on x.id = k.x_id
      join terr te on te.entite_id = e.entite_id
      join terr tx on tx.entite_id = x.entite_id
      where not (e.siren is not null and x.siren is not null and e.siren <> x.siren)
        and not (e.tva is not null and x.tva is not null and e.tva <> x.tva)
        and not (e.gtin is not null and x.gtin is not null and e.gtin <> x.gtin)
    ),
    probables as materialized (
      select p.c_id, p.c_obj, p.x_obj, array[p.x_id] as preuves, 'probable'::text as preuve, 'similarite'::text as regle,
             least(s.score, v_haut) as score,
             s.raisons || case when s.score > v_haut
                               then jsonb_build_array(jsonb_build_object('critere', 'plafond', 'detail',
                                      'sans identifiant commun, un rapprochement n''est jamais sûr'))
                               else '[]'::jsonb end as raisons
      from paires p
      cross join lateral (
        select t.score, t.raisons
        from private.grp_score_tiers(p.ja, p.jb, p.cpa, p.cpb, p.aa, p.ab, p.ta, p.tb, p.da, p.db, p.terra, p.terrb) t
        where p.nature <> 'article'
        union all
        select t.score, t.raisons
        from private.grp_score_article(p.ja, p.jb, p.ua, p.ub,
               (select tf.id from taille tf where tf.id = p.fa and not tf.intragroupe),
               (select tf.id from taille tf where tf.id = p.fb and not tf.intragroupe)) t
        where p.nature = 'article'
      ) s
      where s.score >= p_inst.seuil_probable
    ),
    aretes as materialized (
      select * from sures
      union all
      select * from probables
    ),
    orientees as (
      select ar.*, (tx.nb > tc.nb or (tx.nb = tc.nb and tx.numero < tc.numero)) as vers_x,
             tc.nb as nb_c, tx.nb as nb_x, tc.nb_propose as prop_c, tx.nb_propose as prop_x, tc.numero as num_c, tx.numero as num_x
      from aretes ar join taille tc on tc.id = ar.c_obj join taille tx on tx.id = ar.x_obj
    ),
    tournees as (
      select case when o.vers_x then o.c_obj else o.x_obj end as source,
             case when o.vers_x then o.x_obj else o.c_obj end as cible,
             case when o.vers_x then o.c_id else o.preuves[1] end as code_source,
             case when o.vers_x then o.preuves else array[o.c_id] end as preuves_cible,
             case when o.vers_x then o.nb_c else o.nb_x end as nb_source,
             case when o.vers_x then o.prop_c else o.prop_x end as prop_source,
             case when o.vers_x then o.nb_x else o.nb_c end as nb_cible,
             case when o.vers_x then o.num_x else o.num_c end as num_cible,
             o.preuve, o.regle, o.score, o.raisons
      from orientees o
    ),
    uniques as (
      select distinct on (least(u.source, u.cible), greatest(u.source, u.cible)) u.*
      from tournees u
      order by least(u.source, u.cible), greatest(u.source, u.cible), (u.preuve = 'sure') desc, u.score desc, u.code_source
    )
    select u.*, o.nature from uniques u join public.grp_ref_objets o on o.id = u.source
    where u.prop_source = 0 and private.grp_objets_compatibles(u.source, u.cible)
    order by (u.preuve = 'sure') desc, u.nb_cible desc, u.num_cible asc, u.score desc, u.source
  loop
    continue when a.source = any (v_sources) or a.source = any (v_cibles) or a.cible = any (v_sources);
    if a.nb_source = 1 then
      v_cle := 'c:' || a.code_source::text || '>' || a.cible::text;
      v_codes := array[a.code_source];
    else
      v_cle := 'o:' || least(a.source, a.cible)::text || '|' || greatest(a.source, a.cible)::text;
      select array_agg(y.id) into v_codes from public.grp_ref_codes y where y.objet_id in (a.source, a.cible);
    end if;
    v_empreinte := private.grp_empreinte_codes(v_cle, v_codes);
    if exists (select 1 from public.grp_ref_propositions q where q.client_id = p_client and q.cle_paire = v_cle
               and q.empreinte = v_empreinte and q.statut in ('rejetee', 'ecartee')) then
      n_memoire := n_memoire + 1;
      continue;
    end if;
    insert into public.grp_ref_propositions (client_id, nature, genre, preuve, type_action, code_id, objet_source, objet_cible,
                                             regle, score, raisons, preuves, cle_paire, empreinte)
    values (p_client, a.nature, case when a.nb_source = 1 then 'deplacer' else 'fusionner' end, a.preuve,
            case when a.nature = 'fournisseur' and private.grp_iban_differents(a.source, a.cible) then 'rattacher_iban_different'
                 when a.preuve = 'sure' then 'rattacher_codes' else 'rapprocher_codes' end,
            a.code_source, a.source, a.cible, a.regle, a.score, a.raisons, a.preuves_cible, v_cle, v_empreinte);
    v_sources := v_sources || a.source;
    v_cibles := v_cibles || a.cible;
    if a.preuve = 'sure' then n_sures := n_sures + 1; else n_probables := n_probables + 1; end if;
  end loop;
  return jsonb_build_object('propositions_sures', n_sures, 'propositions_probables', n_probables,
                            'refus_gardes', n_memoire, 'blocs_trop_gros', n_gros);
end $function$;

-- private.lorani_alerter_rappel(public.lorani_permis,public.lorani_projets,text,integer,date,jsonb)
-- Lorani (b5_27 reposé plus récent) : le lien du rappel passe par lorani_lien_permis et ne double pas /espace2.
CREATE OR REPLACE FUNCTION private.lorani_alerter_rappel(p lorani_permis, p_projet lorani_projets, p_nature text, p_rappel integer, p_echeance date, p_calcul jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_titre text;
  v_niveau text;
  v_quand text := case p_rappel when 0 then 'aujourd''hui' when 1 then 'demain' else format('dans %s jours', p_rappel) end;
  v_cle text := format('permis:%s:%s:rappel:%s', p.id, p_nature, p_rappel);
  v_resp uuid := private.lorani_chef_de_projet(p.client_id, p.projet_id);
  v_alerte uuid;
  v_corps text;
  v_envoi uuid;
begin
  if p_nature = 'pieces' and p.date_pieces_fournies is null then
    v_niveau := case when p_rappel >= 10 then 'attention' else 'critique' end;
    v_titre := format('%s : pièces manquantes à faire recevoir par la mairie au plus tard le %s (%s), sinon rejet tacite.',
      private.lorani_titre_permis(p, p_projet), to_char(p_echeance, 'DD/MM/YYYY'), v_quand);
    v_corps := format(E'Bonjour,\n\nLa mairie a réclamé des pièces pour le %s (dossier %s). Elles doivent lui être parvenues au plus tard le %s, c''est-à-dire %s. Passé ce jour, la demande est tacitement rejetée (code de l''urbanisme, art. R*423-39, b).\n\nPièces réclamées : %s.\n\nUne fois les pièces reçues par la mairie, saisissez la date de leur réception dans Omega : l''instruction en repart.\n\nOmega — Lorani',
      private.lorani_titre_permis(p, p_projet), coalesce(p.numero, 'sans numéro'), to_char(p_echeance, 'DD/MM/YYYY'), v_quand,
      coalesce((select string_agg(x ->> 'code', ', ') from jsonb_array_elements(p.pieces_demandees) x), 'voir la lettre de la mairie'));
  elsif p_nature = 'instruction' and p.decision is null then
    v_niveau := 'info';
    v_titre := format('%s : décision de la mairie attendue au plus tard le %s (%s) ; sans réponse, %s.',
      private.lorani_titre_permis(p, p_projet), to_char(p_echeance, 'DD/MM/YYYY'), v_quand,
      coalesce(p_calcul #>> '{regime,effet_silence}', 'permis tacite'));
    v_corps := format(E'Bonjour,\n\nLe délai d''instruction du %s (dossier %s) s''achève le %s, %s. Sans décision notifiée à cette date, le silence de la mairie vaut %s.\n\nSi un arrêté ou une lettre arrive d''ici là, déposez-le dans Omega : la date sera lue et le calendrier recalculé.\n\nOmega — Lorani',
      private.lorani_titre_permis(p, p_projet), coalesce(p.numero, 'sans numéro'), to_char(p_echeance, 'DD/MM/YYYY'), v_quand,
      coalesce(p_calcul #>> '{regime,effet_silence}', 'permis tacite'));
  elsif p_nature = 'affichage' and p.date_affichage is null then
    v_niveau := 'attention';
    v_titre := format('%s : affichage sur le terrain non saisi quinze jours après la décision. Tant qu''il n''est pas fait, le recours des tiers ne court pas.',
      private.lorani_titre_permis(p, p_projet));
    v_corps := format(E'Bonjour,\n\nLe %s (dossier %s) est accordé depuis le %s et son affichage sur le terrain n''est pas saisi dans Omega. Tant que le panneau n''est pas en place, le délai de recours des tiers ne court pas (code de l''urbanisme, art. R*600-2) et le permis ne se purge pas.\n\nAffichez le permis, faites-le constater, puis saisissez le premier jour d''affichage dans Omega.\n\nOmega — Lorani',
      private.lorani_titre_permis(p, p_projet), coalesce(p.numero, 'sans numéro'), to_char(p.date_decision, 'DD/MM/YYYY'));
  else
    return null;
  end if;

  v_alerte := private.lever_alerte_module(p.client_id, 'lorani', v_niveau, left(v_titre, 200),
    jsonb_build_object('projet', p.projet_id, 'permis', p.id, 'nature', p_nature, 'echeance', p_echeance,
                       'rappel', p_rappel, 'lien', private.lorani_lien_permis(p.id)),
    v_cle, true, v_resp);

  -- Le rappel part au chef de projet, par courriel, le jour même. Il n'est pas un travail de l'alerte : s'il échoue, l'alerte reste.
  if v_resp is not null then
    begin
      v_envoi := private.preparer_envoi(
        p.client_id, 'lorani', 'lorani_projet', p.projet_id::text, 'email',
        jsonb_build_object('membre', v_resp),
        null, '{}'::jsonb,
        left('Omega — ' || v_titre, 300),
        v_corps || E'\n\nOuvrir le dossier : ' || regexp_replace(coalesce(public.lire_parametre('espace_url'), 'https://app.omegaai.fr/espace'), '/espace2?/?$', '') || private.lorani_lien_permis(p.id),
        null, 'lorani:' || v_cle, p.entite_id, true, false,
        greatest(p_echeance::timestamptz, now() + interval '1 hour'), '{}'::jsonb);
      if v_alerte is not null and v_envoi is not null then
        update public.alertes set detail = detail || jsonb_build_object('envoi', v_envoi) where id = v_alerte;
      end if;
    exception when others then
      perform private.lever_alerte(p.client_id, true, 'attention', 'lorani',
        left(format('Rappel du permis non préparé en envoi : %s', sqlerrm), 200),
        jsonb_build_object('permis', p.id, 'nature', p_nature, 'rappel', p_rappel, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)),
        'lorani:envoi_rappel:' || p.id::text || ':' || p_nature);
    end;
  end if;
  return v_alerte;
end $function$;

-- private.lorani_chantier_rappeler(public.travaux)
-- Lorani (b5_20, écrasé ensuite par b6_33_b5_30 plus ancien) : les rappels de points de chantier (questions, actions) ; sans lui, un point en retard ne prévient personne.
CREATE OR REPLACE FUNCTION private.lorani_chantier_rappeler(t travaux)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.lorani_reserves;
  pt public.lorani_points;
  pr public.lorani_projets;
  v_delai uuid := (t.charge ->> 'delai')::uuid;
  v_rappel integer := (t.charge ->> 'rappel')::integer;
  v_depasse boolean := t.genre = 'lorani.chantier.depasse';
  v_ouvertes integer;
  v_detail text;
  v_lot text;
  v_qui text;
begin
  select * into pt from public.lorani_points where delai_id = v_delai;
  if found then
    if pt.statut <> 'ouvert' then
      return jsonb_build_object('ignore', 'point répondu ou soldé', 'point', pt.id);
    end if;
    select * into pr from public.lorani_projets where id = pt.projet_id;
    v_qui := coalesce((select organisme from public.lorani_intervenants where id = pt.intervenant_id), 'l''équipe');
    perform private.lever_alerte_module(pt.client_id, 'lorani', 'attention',
      left(format('« %s » : %s (%s) %s — %s', left(pr.nom, 40),
                  case pt.nature when 'question' then 'question sans réponse' else 'action non faite' end, left(v_qui, 40),
                  case when v_depasse then 'attendue le ' || to_char(pt.echeance, 'DD/MM/YYYY')
                       else 'attendue ' || case coalesce(v_rappel, 0) when 0 then 'aujourd''hui' when 1 then 'demain' else 'dans ' || v_rappel || ' jours' end end,
                  pt.texte), 200),
      jsonb_build_object('projet', pt.projet_id, 'point', pt.id, 'lien', private.lorani_lien_projet(pt.projet_id)),
      case when v_depasse then format('point:%s:retard', pt.id) else format('point:%s:rappel:%s', pt.id, coalesce(v_rappel, 0)) end,
      true, private.lorani_chef_de_projet(pt.client_id, pt.projet_id));
    return jsonb_build_object('point', pt.id, 'genre', t.genre, 'rappel', v_rappel);
  end if;

  select * into r from public.lorani_reserves where delai_id = v_delai;
  if found then
    if r.statut <> 'ouverte' then
      return jsonb_build_object('ignore', 'réserve levée ou contestée', 'reserve', r.id);
    end if;
    select * into pr from public.lorani_projets where id = r.projet_id;
    select l.numero into v_lot from public.lorani_lots l where l.id = r.lot_id;
    perform private.lever_alerte_module(r.client_id, 'lorani', 'attention',
      left(case when v_depasse
        then format('« %s » : réserve n° %s%s non levée au %s — %s', left(pr.nom, 40), r.numero, coalesce(' (lot ' || v_lot || ')', ''), to_char(r.lever_avant, 'DD/MM/YYYY'), r.intitule)
        else format('« %s » : réserve n° %s%s à lever avant le %s (%s) — %s', left(pr.nom, 40), r.numero, coalesce(' (lot ' || v_lot || ')', ''), to_char(r.lever_avant, 'DD/MM/YYYY'),
                    case coalesce(v_rappel, 0) when 0 then 'aujourd''hui' when 1 then 'demain' else 'dans ' || v_rappel || ' jours' end, r.intitule) end, 200),
      jsonb_build_object('projet', r.projet_id, 'reserve', r.id, 'lien', private.lorani_lien_projet(r.projet_id)),
      case when v_depasse then format('reserve:%s:retard', r.id) else format('reserve:%s:rappel:%s', r.id, coalesce(v_rappel, 0)) end,
      true, private.lorani_chef_de_projet(r.client_id, r.projet_id));
    return jsonb_build_object('reserve', r.id, 'genre', t.genre, 'rappel', v_rappel);
  end if;

  select * into pr from public.lorani_projets where gpa_delai_id = v_delai;
  if not found then
    return jsonb_build_object('ignore', 'délai hors du chantier');
  end if;
  select string_agg(case when x.numero is null then format('sans lot : %s', x.n) else format('lot %s : %s', x.numero, x.n) end, ', ' order by x.numero nulls last)
    into v_detail
  from (select l.numero, count(*) as n from public.lorani_reserves rr left join public.lorani_lots l on l.id = rr.lot_id
        where rr.projet_id = pr.id and rr.statut = 'ouverte' group by l.numero) x;
  select coalesce(sum(n), 0) into v_ouvertes from (select count(*) as n from public.lorani_reserves rr where rr.projet_id = pr.id and rr.statut = 'ouverte') y;
  perform private.lever_alerte_module(pr.client_id, 'lorani', case when v_ouvertes > 0 then 'attention' else 'info' end,
    left(format('« %s » : %s le %s ; %s', left(pr.nom, 40),
                case when v_depasse then 'la garantie de parfait achèvement a pris fin' else 'fin de la garantie de parfait achèvement' end,
                to_char((pr.reception_le + interval '1 year')::date, 'DD/MM/YYYY'),
                case when v_ouvertes = 0 then 'toutes les réserves sont levées, la retenue de garantie peut être libérée.'
                     else format('%s réserve%s non levée%s (%s) : retenue de garantie à conserver par opposition motivée.', v_ouvertes,
                                 case when v_ouvertes > 1 then 's' else '' end, case when v_ouvertes > 1 then 's' else '' end, v_detail) end), 200),
    jsonb_build_object('projet', pr.id, 'reception_le', pr.reception_le, 'reserves_ouvertes', v_ouvertes, 'lien', private.lorani_lien_projet(pr.id)),
    case when v_depasse then format('gpa:%s:fin', pr.id) else format('gpa:%s:rappel:%s', pr.id, coalesce(v_rappel, 0)) end,
    true, private.lorani_chef_de_projet(pr.client_id, pr.id));
  return jsonb_build_object('projet', pr.id, 'genre', t.genre, 'reserves_ouvertes', v_ouvertes);
end $function$;

-- private.lorani_lectures_passage()
-- Lorani (b5_23 / b5_26, écrasés par b6_33_b5_30) : lecture des offres, des CERFA, attestations RE2020, plans BET, notices, compléments du PLU.
CREATE OR REPLACE FUNCTION private.lorani_lectures_passage()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  t public.travaux;
  r record;
  v_res jsonb;
  v_type text;
  n integer := 0;
  n_erreurs integer := 0;
  n_agences integer := 0;
  n_plu integer := 0;
begin
  for t in select * from private.prendre_travaux(array['lorani.piece_lue', 'lorani.reception', 'lorani.visa.rappel', 'lorani.visa.depasse',
                                                       'lorani.attestation.rappel', 'lorani.attestation.depasse', 'lorani.chantier.rappel', 'lorani.chantier.depasse'],
                                                 200, interval '10 minutes', 'lorani_lecture') loop
    begin
      v_type := null;
      if t.genre = 'lorani.piece_lue' then
        select x.type_piece into v_type from public.pieces x where x.id = (t.charge ->> 'piece')::uuid;
      end if;
      if t.genre = 'lorani.reception' then
        v_res := private.lorani_rattacher_reception((t.charge ->> 'reception')::bigint);
      elsif t.genre in ('lorani.visa.rappel', 'lorani.visa.depasse') then
        v_res := private.lorani_visa_rappeler(t);
      elsif t.genre in ('lorani.attestation.rappel', 'lorani.attestation.depasse') then
        v_res := private.lorani_attestation_rappeler(t);
      elsif t.genre in ('lorani.chantier.rappel', 'lorani.chantier.depasse') then
        v_res := private.lorani_chantier_rappeler(t);
      elsif v_type = 'lorani_situation_travaux' then
        v_res := private.lorani_poser_situation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type = 'lorani_attestation_decennale' then
        v_res := private.lorani_poser_attestation_lue((t.charge ->> 'piece')::uuid);
      elsif v_type = 'lorani_offre' then
        v_res := private.lorani_poser_offre_lue((t.charge ->> 'piece')::uuid);
      elsif v_type in ('lorani_planche', 'lorani_cctp', 'lorani_dpgf', 'lorani_plu_reglement', 'lorani_metre', 'lorani_cerfa',
                           'lorani_attestation_re2020', 'lorani_plan_bet', 'lorani_notice')
            or exists (select 1 from public.lorani_controle_pieces cp where cp.piece_id = (t.charge ->> 'piece')::uuid) then
        v_res := private.lorani_piece_controle_lue((t.charge ->> 'piece')::uuid);
        if v_type = 'lorani_dpgf' then
          v_res := coalesce(v_res, '{}'::jsonb) || jsonb_build_object('consultations', private.lorani_offres_dpgf_lue((t.charge ->> 'piece')::uuid));
        end if;
      else
        v_res := private.lorani_lire_piece((t.charge ->> 'piece')::uuid);
      end if;
      perform private.finir_travail(t.id, v_res);
      n := n + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000));
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Les recherches de PLU dont les réponses sont arrivées (ou qui ont attendu trop longtemps).
  for r in select l.projet_id from public.lorani_plu l where l.statut in ('geocodage', 'zonage') or l.complements_statut = 'en_cours' loop
    begin
      perform private.lorani_plu_avancer(r.projet_id);
      perform private.lorani_plu_complements_avancer(r.projet_id);
      n_plu := n_plu + 1;
    exception when others then
      n_erreurs := n_erreurs + 1;
    end;
  end loop;
  -- Le battement de chaque agence qui a des dossiers en cours, même à vide.
  for r in select distinct pr.client_id from public.lorani_projets pr where pr.actif loop
    perform private.battre(r.client_id, 'lorani_lecture', jsonb_build_object('passage', now()), interval '15 minutes');
    n_agences := n_agences + 1;
  end loop;
  return jsonb_build_object('pieces', n, 'erreurs', n_erreurs, 'agences', n_agences, 'plu', n_plu);
end $function$;

-- private.lorani_valeurs_de_piece(uuid)
-- Lorani (b5_06 reposé plus récent) : les valeurs en tableau (liste de pièces) restent des tableaux.
CREATE OR REPLACE FUNCTION private.lorani_valeurs_de_piece(p_piece uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with lues as (
    select pv.id, pv.champ,
           case jsonb_typeof(pv.valeur) when 'array' then pv.valeur else to_jsonb(pv.valeur #>> '{}') end as valeur, (pv.verifiee or pv.source = 'humain') as verifiee,
           pv.texte, pv.page, pv.boite, pv.source = 'humain' as humain, pv.cree_le
    from public.pieces_valeurs pv
    where pv.piece_id = p_piece and pv.chiffre is null
  ), simples as (
    select distinct on (l.champ) l.champ,
           jsonb_build_object('valeur', l.valeur, 'verifiee', l.verifiee, 'texte', l.texte, 'page', l.page) as v
    from lues l
    where l.champ <> 'pieces'
    order by l.champ, l.humain desc, l.verifiee desc, l.cree_le desc, l.id
  ), repetes as (
    select l.champ,
           jsonb_agg(jsonb_build_object('valeur', l.valeur, 'verifiee', l.verifiee, 'texte', l.texte, 'page', l.page)
                     order by l.page nulls last,
                              coalesce((l.boite ->> 'y')::numeric, -((l.boite ->> 'y1')::numeric)) nulls last,
                              coalesce((l.boite ->> 'x')::numeric, (l.boite ->> 'x0')::numeric) nulls last,
                              l.cree_le, l.id) as v
    from lues l
    where l.champ = 'pieces'
      and (l.humain or not exists (select 1 from lues h where h.champ = 'pieces' and h.humain))
    group by l.champ
  )
  select coalesce(jsonb_object_agg(x.champ, x.v), '{}'::jsonb)
  from (select * from simples union all select * from repetes) x
$function$;

-- public.loc_refacturer_peages(uuid)
-- Tavaro (b2_14 reposé plus récent) : la ligne de péage est chiffrée au forfait ; message d'erreur qui dit l'unité attendue.
CREATE OR REPLACE FUNCTION public.loc_refacturer_peages(p_contrat uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Les péages se refacturent par l''agence.');
  c public.loc_contrats;
  lp public.loc_bareme_lignes;
  lf public.loc_bareme_lignes;
  x public.loc_passages_peage;
  v_fuseau text;
  v_bareme uuid;
  v_version integer;
  v_prop uuid;
  v_rang integer := 0;
  v_n integer := 0;
  v_taux numeric;
  v_ht numeric;
begin
  select * into c from public.loc_contrats where client_id = v_client and id = p_contrat;
  if not found or not private.voit_entite(c.client_id, c.entite_id) then
    raise exception 'Contrat introuvable.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.loc_passages_peage p where p.client_id = c.client_id and p.contrat_id = c.id and p.statut = 'paye' and p.refacture_proposition_id is null) then
    raise exception 'Aucun passage payé à refacturer sur ce contrat : payez d''abord les passages chez l''opérateur.' using errcode = '55000';
  end if;
  if exists (select 1 from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id and p.statut in ('calculee', 'preuve_manquante', 'a_valider', 'validee')) then
    raise exception 'Une facture de ce contrat est en cours : refacturez les péages une fois émise.' using errcode = '55000';
  end if;
  select e.fuseau into v_fuseau from public.entites e where e.client_id = c.client_id and e.id = c.entite_id;
  v_bareme := private.loc_bareme_en_vigueur(c.client_id, (now() at time zone coalesce(v_fuseau, 'Europe/Paris'))::date);
  select * into lp from public.loc_bareme_lignes l where l.client_id = c.client_id and l.bareme_id = v_bareme and l.code = 'PEAGE' order by l.categorie_id nulls last limit 1;
  if lp.id is null then
    raise exception 'Ajoutez au barème la ligne PEAGE, unité « devis » (péage refacturé au montant réel, prévu par vos conditions générales).' using errcode = '23514';
  end if;
  select * into lf from public.loc_bareme_lignes l where l.client_id = c.client_id and l.bareme_id = v_bareme and l.code = 'FRAIS_PEAGE' order by l.categorie_id nulls last limit 1;
  select coalesce(max(p.version), 0) + 1 into v_version from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id;
  insert into public.loc_propositions (client_id, entite_id, contrat_id, version, source, bareme_id, entrees, calculee_par)
  values (c.client_id, c.entite_id, c.id, v_version, 'saisie', v_bareme, jsonb_build_object('objet', 'peages'), (select auth.uid()))
  returning id into v_prop;
  for x in select * from public.loc_passages_peage p where p.client_id = c.client_id and p.contrat_id = c.id and p.statut = 'paye' and p.refacture_proposition_id is null order by p.passe_le loop
    v_rang := v_rang + 1;
    -- le péage payé est un montant toutes taxes : refacturé sur une ligne taxable, il est ramené hors taxes
    v_taux := private.loc_taux_tva(c.client_id, c.entite_id, lp.taux_tva);
    v_ht := case when lp.regime_tva = 'taxable' and coalesce(v_taux, 0) > 0 then round(x.montant_eur / (1 + v_taux / 100), 2) else x.montant_eur end;
    perform private.loc_poser_ligne(c.client_id, v_prop, v_rang, 'frais', lp.famille, lp.code,
      format('%s — %s, %s', lp.libelle, coalesce(x.portique, x.operateur), to_char(x.passe_le at time zone coalesce(v_fuseau, 'Europe/Paris'), 'DD/MM/YYYY à HH24:MI')),
      lp.id, 'forfait', 1, v_ht, v_ht, lp.regime_tva, v_taux, 'chiffree',
      jsonb_build_object('passage', x.id, 'operateur', x.operateur, 'reference', x.reference, 'paiement', x.paiement_reference),
      jsonb_build_array(jsonb_build_object('note', format('Passage %s chez %s, payé le %s (référence %s)', x.reference, x.operateur,
                                                          to_char(x.paye_le at time zone coalesce(v_fuseau, 'Europe/Paris'), 'DD/MM/YYYY'), x.paiement_reference))),
      false);
    if lf.id is not null and lf.prix_eur is not null then
      v_rang := v_rang + 1;
      perform private.loc_poser_ligne(c.client_id, v_prop, v_rang, 'frais', lf.famille, lf.code, lf.libelle || ' — passage ' || x.reference,
        lf.id, lf.unite, 1, lf.prix_eur, round(lf.prix_eur, 2), lf.regime_tva, private.loc_taux_tva(c.client_id, c.entite_id, lf.taux_tva), 'chiffree',
        jsonb_build_object('passage', x.id), '[]'::jsonb, false);
    end if;
    update public.loc_passages_peage set refacture_proposition_id = v_prop, statut = 'refacture' where id = x.id;
    v_n := v_n + 1;
  end loop;
  update public.loc_propositions p
     set statut = 'calculee',
         total_ht = (select coalesce(sum(l.montant_ht), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop),
         total_tva = (select coalesce(sum(l.montant_tva), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop),
         total_ttc = (select coalesce(sum(l.montant_ttc), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop),
         total_frais_ttc = (select coalesce(sum(l.montant_ttc), 0) from public.loc_proposition_lignes l where l.proposition_id = v_prop)
   where p.id = v_prop;
  perform private.deposer_travail(c.client_id, 'tavaro', 'tavaro.deposer_demande', jsonb_build_object('proposition', v_prop), 'tavaro:deposer:' || v_prop::text, 0::smallint);
  perform private.journaliser_module(c.client_id, 'tavaro', 'tavaro.peages_refactures', 'loc_contrats', c.id::text,
    jsonb_build_object('contrat', c.numero, 'passages', v_n, 'proposition', v_prop), c.entite_id);
  return jsonb_build_object('contrat', c.id, 'proposition', v_prop, 'passages', v_n);
end $function$;
