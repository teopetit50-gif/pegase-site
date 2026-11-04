-- 20261021194834 c3_29_envoyees_seules+c2_21_incoherence_dite
-- Source : dépôt : 89ab43fa omega/modules/reput/migrations/c3_29_envoyees_seules.sql ; 131085a1 omega/modules/cashd/migrations/c2_21_incoherence_dite.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_29_envoyees_seules.sql @ 89ab43fa, c2_21_incoherence_dite.sql @ 131085a1.
-- ═══ omega/modules/reput/migrations/c3_29_envoyees_seules.sql @ 89ab43fa
-- c3_29 — REPUT, correctif TREPUT-05 (série 1 du testeur) : « envoyées seules ce mois » ne compte que ce qui est parti
-- (session C3, 21/10/2026)
--
-- Constat : private.reput_accords_etat comptait, dans envoyees_seules_mois, toutes les demandes couvertes par l'accord sur le
-- mois, quelle que soit leur issue ; R13a (exécution en échec, envoi bloqué, rien parti) comptait pour 1. Désormais : une
-- demande couverte par l'accord ne compte que si son envoi est « envoye ». Le début du mois se prend au fuseau de
-- l'organisation (entité principale, private.reput_fuseau de c3_21) et non plus en dur à Paris.
-- Reprise de c3_07, ce seul changement. Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function private.reput_accords_etat(p_client uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  with p as (
    select p.*, row_number() over (partition by p.type_action
                                   order by (p.statut = 'active' and now() >= p.debut and now() < p.fin) desc,
                                            (p.statut = 'a_valider') desc, p.cree_le desc) as rang
    from public.politiques p
    where p.client_id = p_client and p.module = 'reput'
  ), s as (
    select x.code, x.libelle, x.autorisable, x.actif, x.ordre, 'reput.repondre.' || x.code as type_action, 'sujet' as genre
    from public.reput_sujets x where x.client_id = p_client
    union all select 'accuse', 'Accusés de réception', true, true, (-2)::smallint, 'reput.accuser', 'message'
    union all select 'demande_avis', 'Demandes d''avis', true, true, (-1)::smallint, 'reput.avis', 'message'
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'sujet', s.code, 'libelle', s.libelle, 'genre', s.genre, 'autorisable', s.autorisable, 'actif', s.actif,
           'politique', p.id,
           'statut', case when p.id is null then 'aucun'
                          when p.statut = 'active' and p.fin <= now() then 'expire'
                          else p.statut end,
           'debut', p.debut, 'fin', p.fin, 'entite', p.entite_id, 'active_le', p.active_le,
           'donne_par_libelle', (select u.email from auth.users u where u.id = p.cree_par),
           'demande_activation', p.demande_id,
           'demande_activation_statut', (select d.statut from public.demandes_validation d where d.id = p.demande_id),
           'revoquee_le', p.revoquee_le, 'motif_revocation', p.motif_revocation,
           -- c3_29 (TREPUT-05) : seulement ce qui est vraiment parti (envoi « envoye »), mois au fuseau de l'organisation.
           'envoyees_seules_mois', (select count(distinct d.id) from public.demandes_validation d
                                    join public.envois e on e.demande_id = d.id and e.statut = 'envoye'
                                    where d.politique_id = p.id
                                      and d.cree_le >= date_trunc('month', now() at time zone private.reput_fuseau(p_client, null))
                                                       at time zone private.reput_fuseau(p_client, null)),
           'nombre_mensuel', p.nombre_mensuel)
         order by s.ordre, s.code), '[]'::jsonb)
  from s
  left join p on p.type_action = s.type_action and p.rang = 1
$function$;


-- ═══ omega/modules/cashd/migrations/c2_21_incoherence_dite.sql @ 131085a1
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_21 : l'incohérence d'une pièce est dite à l'import et sur la fiche (21/10/2026, session C2 — TCASHD-02)
-- ═══════════════════════════════════════════════════════════════════════════
-- c2_17 marque une pièce au total incohérent et suspend sa relance, mais en silence pour le client : la réponse de
-- cashd_importer ne la citait pas, la fiche la montrait ouverte, sans motif, relançable pour tout son montant
-- (recette T-CASHD du 21/10, TCASHD-02, FB-2026-0102).
-- Désormais :
--   · la réponse de l'import porte « incoherentes » : numéro, compte et motif de chaque pièce du lot marquée ;
--   · la fiche du compte porte, pièce par pièce, « incoherence » et « relance_suspendue » (le motif en clair), et
--     « reste_relancable » 0 tant que la relance est suspendue ; un avoir n'est jamais relançable (0 lui aussi) ;
--   · l'avoir porte aussi « facture_visee » (c2_20).
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Intégrer un import (c2_20) : la réponse dit les pièces au total incohérent.
create or replace function private.cashd_integrer(p_client uuid, p_entite uuid, p_jeu text, p_lignes jsonb, p_complet boolean, p_source text, p_origine text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  l jsonb;
  k integer := 0;
  v_cree integer := 0;
  v_modif integer := 0;
  v_pareil integer := 0;
  v_soldees integer := 0;
  v_ecartees jsonb := '[]'::jsonb;
  v_vus text[] := '{}';
  v_compte uuid;
  v_id uuid;
  f public.cashd_factures;
  v_nature text;
  v_numero text;
  v_ttc numeric;
  v_ht numeric;
  v_reste numeric;
  v_emission date;
  v_echeance date;
  v_statut text;
  v_res jsonb;
  v_lettrees integer := 0;
  g public.cashd_reglages;
  c record;
  v_incoh text;
  v_visee text;
  v_orphelins jsonb := '[]'::jsonb;
  v_incoherentes jsonb := '[]'::jsonb;
  v_autre text;
  v_doublons text[] := '{}';
begin
  g := private.cashd_exiger_installe(p_client);
  if p_jeu not in ('clients', 'factures', 'reglements', 'devis') then
    raise exception 'Jeu inconnu : % (clients, factures, reglements, devis).', coalesce(p_jeu, 'vide') using errcode = '22023';
  end if;
  if p_lignes is null or jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes se donnent en tableau.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_lignes) > 20000 then
    raise exception 'Plus de 20 000 lignes : découpez l''export.' using errcode = '22023';
  end if;

  for l in select x.value from jsonb_array_elements(p_lignes) x loop
    k := k + 1;
    begin
      if jsonb_typeof(l) <> 'object' then
        raise exception 'ligne illisible' using errcode = '22023';
      end if;

      if p_jeu = 'clients' then
        if private.cashd_v(l, 'code') is null and private.cashd_v(l, 'nom') is null then
          raise exception 'ni code ni nom' using errcode = '22023';
        end if;
        select x.id into v_id from public.cashd_comptes x
        where x.client_id = p_client and x.entite_id = p_entite and x.reference = left(coalesce(private.cashd_v(l, 'code'), private.cashd_v(l, 'nom')), 80);
        v_res := jsonb_strip_nulls(jsonb_build_object(
          'reference', left(coalesce(private.cashd_v(l, 'code'), private.cashd_v(l, 'nom')), 80),
          'nom', left(coalesce(private.cashd_v(l, 'nom'), private.cashd_v(l, 'code')), 200),
          'groupe', left(private.cashd_v(l, 'groupe'), 200),
          'siren', case when regexp_replace(coalesce(private.cashd_v(l, 'siren'), ''), '\s', '', 'g') ~ '^[0-9]{9}$' then regexp_replace(private.cashd_v(l, 'siren'), '\s', '', 'g') end,
          'pays', case when upper(private.cashd_v(l, 'pays')) ~ '^[A-Z]{2}$' then upper(private.cashd_v(l, 'pays')) end,
          'langue', case when lower(private.cashd_v(l, 'langue')) ~ '^[a-z]{2}$' then lower(private.cashd_v(l, 'langue')) end,
          'devise', case when upper(private.cashd_v(l, 'devise')) ~ '^[A-Z]{3}$' then upper(private.cashd_v(l, 'devise')) end,
          'contact_facturation_nom', left(private.cashd_v(l, 'contact'), 200),
          'contact_facturation_email', case when lower(private.cashd_v(l, 'email')) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(private.cashd_v(l, 'email')) end,
          'contact_facturation_telephone', left(private.cashd_v(l, 'telephone'), 40),
          'contact_commercial_email', case when lower(private.cashd_v(l, 'email_commercial')) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then lower(private.cashd_v(l, 'email_commercial')) end,
          'delai_paiement_jours', case when private.cashd_nombre(private.cashd_v(l, 'delai_paiement')) between 0 and 60 then private.cashd_nombre(private.cashd_v(l, 'delai_paiement'))::integer end,
          'plafond_encours', case when private.cashd_nombre(private.cashd_v(l, 'plafond')) >= 0 then private.cashd_nombre(private.cashd_v(l, 'plafond')) end));
        if v_id is null then
          perform private.cashd_ecrire_compte(null, p_client, v_res || jsonb_build_object('entite_id', p_entite), p_source);
          v_cree := v_cree + 1;
        else
          perform private.cashd_ecrire_compte(v_id, p_client, v_res, p_source);
          v_modif := v_modif + 1;
        end if;
        continue;
      end if;

      if p_jeu = 'reglements' then
        v_ttc := private.cashd_nombre(private.cashd_v(l, 'montant'));
        v_emission := private.cashd_date(private.cashd_v(l, 'date'));
        if v_ttc is null or v_ttc <= 0 then
          raise exception 'montant illisible ou nul' using errcode = '22023';
        end if;
        if v_emission is null then
          raise exception 'date illisible' using errcode = '22023';
        end if;
        v_compte := null;
        if private.cashd_v(l, 'compte_ref') is not null or private.cashd_v(l, 'compte_nom') is not null then
          select x.id into v_compte from public.cashd_comptes x where x.client_id = p_client and x.entite_id = p_entite
            and x.reference = left(coalesce(private.cashd_v(l, 'compte_ref'), private.cashd_v(l, 'compte_nom')), 80);
        end if;
        v_res := private.cashd_noter_reglement(p_client, v_compte, v_ttc, v_emission, private.cashd_v(l, 'reference'),
          private.cashd_mode(private.cashd_v(l, 'mode')), null, p_entite, private.cashd_v(l, 'libelle'), private.cashd_v(l, 'facture_numero'),
          p_source, left(concat_ws('|', 'export', v_emission, round(v_ttc, 2), coalesce(private.cashd_v(l, 'reference'), ''),
                                   coalesce(private.cashd_v(l, 'facture_numero'), ''), coalesce(private.cashd_v(l, 'compte_ref'), '')), 300));
        if (v_res ->> 'deja_note')::boolean then
          v_pareil := v_pareil + 1;
        else
          v_cree := v_cree + 1;
          v_lettrees := v_lettrees + coalesce((v_res ->> 'imputations')::integer, 0);
        end if;
        continue;
      end if;

      -- factures et devis
      v_numero := left(private.cashd_v(l, 'numero'), 80);
      if v_numero is null then
        raise exception 'numéro absent' using errcode = '22023';
      end if;
      v_ttc := private.cashd_nombre(private.cashd_v(l, 'montant_ttc'));
      v_ht := private.cashd_nombre(private.cashd_v(l, 'montant_ht'));
      v_ttc := coalesce(v_ttc, v_ht);
      if v_ttc is null then
        raise exception 'montant illisible' using errcode = '22023';
      end if;
      v_nature := case when p_jeu = 'devis' then 'devis' else private.cashd_nature(private.cashd_v(l, 'nature'), v_ttc) end;
      if v_nature = 'devis' and p_jeu = 'factures' then
        raise exception 'un devis dans l''export des factures' using errcode = '22023';
      end if;
      v_ttc := abs(v_ttc);
      v_ht := abs(v_ht);
      v_reste := abs(private.cashd_nombre(private.cashd_v(l, 'reste_du')));
      v_emission := private.cashd_date(private.cashd_v(l, 'date_emission'));
      if v_emission is null then
        raise exception 'date d''émission illisible' using errcode = '22023';
      end if;
      v_echeance := private.cashd_date(private.cashd_v(l, 'echeance'));
      if v_echeance is not null and v_echeance < v_emission then
        raise exception 'échéance antérieure à l''émission' using errcode = '22023';
      end if;
      v_compte := private.cashd_compte_pour(p_client, p_entite, private.cashd_v(l, 'compte_ref'), private.cashd_v(l, 'compte_nom'), l, p_source);
      if v_compte is null then
        raise exception 'compte client absent' using errcode = '22023';
      end if;
      v_incoh := case when v_nature in ('facture', 'acompte') then private.cashd_controle_total(l) end;   -- c2_17
      v_visee := case when v_nature = 'avoir' then private.cashd_facture_visee(l, v_numero) end;           -- c2_20
      v_vus := v_vus || (v_nature || ':' || v_numero);
      select * into f from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.nature = v_nature and x.numero = v_numero for update;
      if not found then
        v_id := private.cashd_ecrire_facture(null, p_client, jsonb_strip_nulls(jsonb_build_object(
          'entite_id', p_entite, 'compte_id', v_compte, 'nature', v_nature, 'numero', v_numero, 'date_emission', v_emission,
          'echeance', v_echeance, 'montant_ht', v_ht, 'montant_ttc', v_ttc,
          'devise', case when upper(private.cashd_v(l, 'devise')) ~ '^[A-Z]{3}$' then upper(private.cashd_v(l, 'devise')) end,
          'commande_ref', left(private.cashd_v(l, 'commande_ref'), 80),
          'statut', case when v_nature = 'devis' then coalesce(private.cashd_statut_devis(private.cashd_v(l, 'statut')), 'en_attente') end)), p_source);
        update public.cashd_factures set reste_du_source = case when v_nature in ('facture', 'acompte') then least(v_reste, montant_ttc) end,
               incoherence = v_incoh, facture_visee = v_visee where id = v_id;
        v_cree := v_cree + 1;
      else
        -- c2_17 : le même numéro sur un autre compte n'écrase pas la pièce existante ; la ligne est écartée et signalée.
        if f.compte_id is distinct from v_compte then
          select x.reference into v_autre from public.cashd_comptes x where x.id = f.compte_id;
          v_doublons := v_doublons || (v_numero || ' (déjà au compte ' || coalesce(v_autre, '?') || ')');
          raise exception 'numéro déjà porté par la pièce du compte % : ligne écartée, la pièce existante est gardée', coalesce(v_autre, '?') using errcode = '23505';
        end if;
        -- La pièce connue : on suit ce que le facturier en dit, sans toucher à ce qu'une personne a décidé ici.
        v_statut := case
          when f.nature = 'devis' then coalesce(private.cashd_statut_devis(private.cashd_v(l, 'statut')), f.statut)
          when f.statut = 'soldee' and f.statut_motif like 'absente de l''export%' and coalesce(v_reste, v_ttc) > 0 then 'ouverte'
          else f.statut end;
        if (f.montant_ttc, f.date_emission, f.echeance, f.reste_du_source, f.compte_id, f.statut, f.incoherence, f.facture_visee)
           is distinct from (case when f.statut in ('litige') then f.montant_ttc else v_ttc end, v_emission, coalesce(v_echeance, f.echeance),
                             case when f.nature in ('facture', 'acompte') then least(v_reste, v_ttc) end, f.compte_id, v_statut, v_incoh, v_visee) then
          update public.cashd_factures set
            montant_ttc = case when statut = 'litige' or exists (select 1 from public.cashd_imputations x where (x.facture_id = f.id or x.avoir_id = f.id) and x.annulee_le is null)
                               then montant_ttc else v_ttc end,
            montant_ht = coalesce(v_ht, montant_ht),
            date_emission = v_emission,
            echeance = coalesce(v_echeance, echeance),
            reste_du_source = case when nature in ('facture', 'acompte') then least(v_reste, v_ttc) end,
            statut = v_statut,
            statut_motif = case when v_statut is distinct from f.statut then 'suivi de l''export' else statut_motif end,
            statut_le = case when v_statut is distinct from f.statut then now() else statut_le end,
            incoherence = v_incoh,
            facture_visee = v_visee,
            vue_le = now(), maj_le = now()
          where id = f.id;
          v_modif := v_modif + 1;
        else
          update public.cashd_factures set vue_le = now() where id = f.id;
          v_pareil := v_pareil + 1;
        end if;
      end if;
    exception when others then
      if sqlstate = '42501' then
        raise;
      end if;
      v_ecartees := v_ecartees || jsonb_build_object('ligne', k, 'motif', left(sqlerrm, 200));
    end;
  end loop;

  -- L'export complet : les pièces importées qui n'y sont plus sont soldées (ou, pour un devis, sorties du suivi).
  if coalesce(p_complet, false) and p_jeu in ('factures', 'devis') and jsonb_array_length(p_lignes) > 0 then
    for c in
      select x.id, x.nature, x.numero, x.statut from public.cashd_factures x
      where x.client_id = p_client and x.entite_id = p_entite and x.source in ('export', 'import')
        and ((p_jeu = 'factures' and x.nature in ('facture', 'acompte', 'avoir') and x.statut = 'ouverte')
             or (p_jeu = 'devis' and x.nature = 'devis' and x.statut = 'en_attente'))
        and not ((x.nature || ':' || x.numero) = any (v_vus))
    loop
      update public.cashd_factures
         set statut = case when c.nature = 'devis' then 'expire' else 'soldee' end,
             statut_motif = left(format('absente de l''export du %s (%s)', to_char((now() at time zone 'Europe/Paris')::date, 'DD/MM/YYYY'), coalesce(p_origine, p_source)), 500),
             statut_le = now(), maj_le = now()
       where id = c.id;
      perform private.journaliser_module(p_client, 'cashd', 'cashd.piece_sortie_export', 'cashd_factures', c.id::text,
        jsonb_build_object('nature', c.nature, 'numero', c.numero, 'origine', p_origine), p_entite);
      v_soldees := v_soldees + 1;
    end loop;
  end if;

  -- c2_17 : ce qui doit être vu — les numéros en doublon d'un compte à l'autre, les pièces au total incohérent.
  if cardinality(v_doublons) > 0 then
    perform private.lever_alerte_module(p_client, 'cashd', 'attention',
      format('Import : %s ligne%s écartée%s, numéro déjà porté par la facture d''un autre client : %s. Vérifiez la numérotation du facturier.',
             cardinality(v_doublons), case when cardinality(v_doublons) > 1 then 's' else '' end, case when cardinality(v_doublons) > 1 then 's' else '' end,
             array_to_string(v_doublons[1:10], ', ')),
      jsonb_build_object('numeros', to_jsonb(v_doublons[1:50]), 'origine', p_origine), 'import:doublon:' || md5(array_to_string(v_doublons, ',')), true, null);
  end if;
  -- c2_21 : la réponse de l'import dit aussi les pièces au total incohérent, et que leur relance est suspendue.
  if p_jeu = 'factures' then
    select coalesce(jsonb_agg(jsonb_build_object('numero', x.numero, 'compte', c2.reference, 'motif', x.incoherence) order by x.numero), '[]'::jsonb)
      into v_incoherentes
    from public.cashd_factures x join public.cashd_comptes c2 on c2.id = x.compte_id
    where x.client_id = p_client and x.entite_id = p_entite and x.incoherence is not null and x.statut = 'ouverte'
      and (x.nature || ':' || x.numero) = any (v_vus);
  end if;
  if p_jeu = 'factures' and exists (select 1 from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.incoherence is not null
                                    and x.statut = 'ouverte' and (x.nature || ':' || x.numero) = any (v_vus)) then
    perform private.lever_alerte_module(p_client, 'cashd', 'attention',
      format('Import : %s facture%s au total incohérent, relance suspendue : %s.',
             count(*), case when count(*) > 1 then 's' else '' end, string_agg(x.numero || ' (' || x.incoherence || ')', ' ; ' order by x.numero)),
      jsonb_build_object('factures', jsonb_agg(x.id)), 'import:incoherence:' || md5(string_agg(x.id::text, ',' order by x.id)), true, null)
    from public.cashd_factures x where x.client_id = p_client and x.entite_id = p_entite and x.incoherence is not null
      and x.statut = 'ouverte' and (x.nature || ':' || x.numero) = any (v_vus);
  end if;

  -- c2_20 : un avoir qui vise une facture inconnue de ce compte n'est imputé nulle part ; il est dit, ici et sur sa fiche.
  if p_jeu = 'factures' then
    select coalesce(jsonb_agg(jsonb_build_object('numero', a.numero, 'vise', a.facture_visee, 'compte', c2.reference) order by a.numero), '[]'::jsonb)
      into v_orphelins
    from public.cashd_factures a join public.cashd_comptes c2 on c2.id = a.compte_id
    where a.client_id = p_client and a.entite_id = p_entite and a.nature = 'avoir' and a.statut = 'ouverte' and a.facture_visee is not null
      and (a.nature || ':' || a.numero) = any (v_vus)
      and not exists (select 1 from public.cashd_factures y where y.compte_id = a.compte_id and y.nature in ('facture', 'acompte') and y.numero = a.facture_visee);
    update public.cashd_factures a
       set statut_motif = left(format('avoir sur %s, facture inconnue de ce compte : non imputé', a.facture_visee), 500), maj_le = now()
     where a.client_id = p_client and a.entite_id = p_entite and a.nature = 'avoir' and a.statut = 'ouverte'
       and a.numero in (select x ->> 'numero' from jsonb_array_elements(v_orphelins) x)
       and a.statut_motif is distinct from left(format('avoir sur %s, facture inconnue de ce compte : non imputé', a.facture_visee), 500);
    if jsonb_array_length(v_orphelins) > 0 then
      perform private.lever_alerte_module(p_client, 'cashd', 'attention',
        format('Import : %s avoir%s visant une facture inconnue, non imputé%s : %s.', jsonb_array_length(v_orphelins),
               case when jsonb_array_length(v_orphelins) > 1 then 's' else '' end, case when jsonb_array_length(v_orphelins) > 1 then 's' else '' end,
               (select string_agg((x ->> 'numero') || ' sur ' || (x ->> 'vise') || ' (compte ' || (x ->> 'compte') || ')', ' ; ') from jsonb_array_elements(v_orphelins) x)),
        jsonb_build_object('avoirs', v_orphelins, 'origine', p_origine), 'import:avoir_orphelin:' || md5(v_orphelins::text), true, null);
    end if;
  end if;

  perform private.journaliser_module(p_client, 'cashd', 'cashd.import', 'cashd_reglages', p_client::text,
    jsonb_build_object('jeu', p_jeu, 'source', p_source, 'origine', p_origine, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif,
                       'inchangees', v_pareil, 'ecartees', jsonb_array_length(v_ecartees), 'soldees_par_absence', v_soldees,
                       'lettrees', v_lettrees, 'complet', coalesce(p_complet, false)), p_entite);
  return jsonb_build_object('jeu', p_jeu, 'lignes', k, 'creees', v_cree, 'modifiees', v_modif, 'inchangees', v_pareil,
    'soldees_par_absence', v_soldees, 'lettrees', v_lettrees, 'ecartees', v_ecartees, 'avoirs_non_imputes', v_orphelins,
    'incoherentes', v_incoherentes);
end $function$;

-- La fiche du compte (c2_05) : la retenue du moteur, dite sur la pièce.
create or replace function public.cashd_fiche_compte(p_compte uuid)
 returns jsonb language sql stable security invoker set search_path to ''
as $function$
  select case when c.id is null then null else jsonb_build_object(
    'compte', to_jsonb(c),
    'balance', (select to_jsonb(b) from public.cashd_balance_agee b where b.compte_id = c.id),
    'pieces', (select coalesce(jsonb_agg(to_jsonb(f) || (select jsonb_build_object('solde_decision', z.solde_decision, 'solde_decision_motif', z.solde_decision_motif,
                 'accord_oral_le', z.accord_oral_le, 'accord_note', z.accord_note, 'attente_commande_le', z.attente_commande_le,
                 'attente_commande_email', z.attente_commande_email, 'attente_commande_nom', z.attente_commande_nom,
                 'attente_commande_motif', z.attente_commande_motif,
                 -- c2_21 : ce que le moteur retient, dit sur la pièce ; un avoir et une pièce suspendue ne sont pas relançables
                 'incoherence', z.incoherence, 'facture_visee', z.facture_visee,
                 'relance_suspendue', case when z.incoherence is not null and z.statut = 'ouverte'
                                           then 'total incohérent (' || z.incoherence || ') : relance suspendue jusqu''à l''export corrigé ou la marque levée' end)
                 || case when (z.incoherence is not null and z.statut = 'ouverte') or z.nature = 'avoir' then jsonb_build_object('reste_relancable', 0) else '{}'::jsonb end
                 from public.cashd_factures z where z.id = f.id)
               order by (f.reste_du > 0) desc, f.echeance nulls last, f.date_emission desc), '[]'::jsonb)
               from public.cashd_factures_etat f where f.compte_id = c.id),
    'reponses_lues', (select coalesce(jsonb_agg(to_jsonb(x) order by x.cree_le desc), '[]'::jsonb) from public.cashd_reponses_lues x
                      where x.compte_id = c.id and x.statut = 'proposee'),
    'pieces_jointes', (select coalesce(jsonb_agg(to_jsonb(p) order by p.cree_le), '[]'::jsonb) from public.cashd_pieces_jointes p
                       join public.cashd_factures f on f.id = p.facture_id where f.compte_id = c.id and p.actif),
    'reglements', (select coalesce(jsonb_agg(to_jsonb(r) order by r.recu_le desc, r.cree_le desc), '[]'::jsonb)
                   from public.cashd_reglements_etat r where r.compte_id = c.id),
    'imputations', (select coalesce(jsonb_agg(to_jsonb(x) || jsonb_build_object('facture', (select f.numero from public.cashd_factures f where f.id = x.facture_id))
                                              order by x.cree_le desc), '[]'::jsonb)
                    from public.cashd_imputations x join public.cashd_factures f on f.id = x.facture_id where f.compte_id = c.id)) end
  from (select 1) d left join public.cashd_comptes c on c.id = p_compte
$function$;

revoke execute on function private.cashd_integrer(uuid, uuid, text, jsonb, boolean, text, text) from public, anon, authenticated;
revoke execute on function public.cashd_fiche_compte(uuid) from public, anon;
grant execute on function public.cashd_fiche_compte(uuid) to authenticated, service_role;
