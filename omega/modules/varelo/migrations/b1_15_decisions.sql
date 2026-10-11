-- b1_15 — VARELO : les décisions à valider, chacune avec son calcul et sa pièce (11/10/2026, B1)
--
-- CE QUE ÇA CORRIGE (omega/CHIFFRAGE/varelo.md, lignes 4, 10, 30, 32, 39). La page promet « le point du matin
-- d'une direction financière : trois décisions à valider, chacune avec son calcul », « une décision proposée à la
-- direction juridique, avec son calcul, en attente de sa validation », « rien ne part sans l'accord de la
-- direction concernée, décision par décision », « au plus trois décisions ». Jusqu'ici, dénoncer un contrat,
-- protester auprès d'un transporteur ou relever un plafond se notaient directement : rien ne se proposait puis ne
-- se validait.
--
-- CE QUE ÇA POSE (après b1_14) :
--   · public.grp_decisions : une décision proposée sur un objet Varelo, adossée à une demande de la file du socle
--     (public.demandes_validation, module varelo) ; son calcul (texte), sa pièce (photos, bon de livraison) ;
--     une seule ouverte par objet ; une seule par contrat et par échéance (pas de nouvelle proposition après un refus).
--       denoncer_contrat    → direction juridique   (type varelo.denoncer_contrat)
--       protester_reception → direction des opérations (type varelo.protester_reception)
--       relever_plafond     → direction financière  (type varelo.relever_plafond)
--     La règle de routage (public.regles_validation, par type, avec l'équipe) est posée à la première proposition
--     si le groupe n'en a pas : le gérant la change ensuite comme toute règle du socle.
--   · public.grp_proposer_decision(client, genre, objet, détails) : à la main, par toute personne de la société
--     (pas un lecteur) ; et d'office chaque heure (cron varelo-decisions) : dénoncer un contrat tacite dont la date
--     limite tombe dans les 15 jours, protester pour chaque livraison à examiner.
--   · L'exécution à la décision : abonnement demande.decidee.varelo → travail varelo.decision, traité par le cron
--     varelo-releves (grp_traiter_travaux, qui prend désormais les deux genres).
--       approuvée : plafond posé (grp_regler_plafond) ; dénonciation et protestation « validées, à envoyer » (la
--                   lettre part par la personne, puis se note comme avant) ; la demande passe « executee » ;
--       refusée   : protestation → livraison classée sans suite, motif « refusée par la direction » ; contrat →
--                   reconduction acceptée (journal) ; plafond → inchangé.
--   · Le point du matin : section « Décisions à valider » (ordre 1) au gérant, à la DF, à la DJ et à la DO, au
--     plus trois lignes par destinataire, les plus pressées d'abord, chacune avec son calcul et sa pièce ;
--     grp_ce_matin rend la clé « decisions ». Remplace grp_ce_matin et grp_deposer_points de b1_11.
--
-- Règles de pose : create … if not exists ; create or replace ; on conflict do nothing ; aucune suppression.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. La table
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.grp_decisions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  genre text not null,
  objet_type text not null,
  objet_id uuid not null,
  reference text not null,
  demande_id uuid,
  resume text not null,
  calcul text not null,
  piece jsonb not null default '{}'::jsonb,
  details jsonb not null default '{}'::jsonb,
  echeance date,
  montant numeric(16,2),
  statut text not null default 'en_attente',
  resultat jsonb,
  motif text,
  d_office boolean not null default false,
  propose_par uuid,
  propose_le timestamptz not null default now(),
  decide_le timestamptz,
  execute_le timestamptz,
  constraint grp_decisions_client_id_id_key unique (client_id, id),
  constraint grp_decisions_demande_key unique (demande_id),
  constraint grp_decisions_reference_key unique (client_id, genre, objet_id, reference),
  constraint grp_decisions_genre_check check (genre in ('denoncer_contrat', 'protester_reception', 'relever_plafond')),
  constraint grp_decisions_objet_type_check check (objet_type in ('grp_contrats', 'grp_receptions', 'grp_ref_objets')),
  constraint grp_decisions_statut_check check (statut in ('en_attente', 'approuvee', 'rejetee', 'expiree', 'annulee', 'executee', 'echec')),
  constraint grp_decisions_resume_check check (char_length(resume) between 1 and 500),
  constraint grp_decisions_calcul_check check (char_length(calcul) between 1 and 1000),
  constraint grp_decisions_motif_check check (char_length(motif) <= 2000)
);
comment on table public.grp_decisions is 'VARELO — une décision proposée sur un objet du groupe (dénoncer un contrat, protester auprès d''un transporteur, relever un plafond d''encours), avec son calcul et sa pièce, adossée à une demande de la file de validation du socle. Écrite par grp_proposer_decision et grp_executer_decision.';

create unique index if not exists grp_decisions_une_ouverte on public.grp_decisions (client_id, genre, objet_id) where statut = 'en_attente';
create index if not exists grp_decisions_client_idx on public.grp_decisions (client_id, statut, echeance);

create or replace trigger grp_decisions_tracer after insert or update on public.grp_decisions
  for each row execute function private.tracer();

alter table public.grp_decisions enable row level security;
revoke all on public.grp_decisions from anon, authenticated;
grant select on public.grp_decisions to authenticated;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'grp_decisions'
                 and policyname = 'membres lisent les decisions de leur perimetre') then
    create policy "membres lisent les decisions de leur perimetre" on public.grp_decisions
      for select to authenticated
      using (client_id in (select private.mes_clients()) and (entite_id is null or private.voit_entite(client_id, entite_id)));
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Proposer
-- ─────────────────────────────────────────────────────────────────────────

-- La règle de routage d'un type de décision : posée une fois, si le groupe n'en a aucune et que l'équipe existe.
create or replace function private.grp_regle_decision(p_client uuid, p_type text, p_equipe text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_equipe uuid;
begin
  if exists (select 1 from public.regles_validation r where r.client_id = p_client and r.module = 'varelo' and r.type_action = p_type) then
    return;
  end if;
  select e.id into v_equipe from public.equipes e where e.client_id = p_client and e.cle = p_equipe;
  if v_equipe is null then
    return;
  end if;
  insert into public.regles_validation (client_id, module, type_action, approbations_requises, roles_autorises, equipe_id)
  values (p_client, 'varelo', p_type, 1, array['gerant', 'admin', 'valideur'], v_equipe);
end $function$;

create or replace function private.grp_proposer_decision(p_client uuid, p_genre text, p_objet uuid, p_details jsonb default '{}'::jsonb,
                                                         p_d_office boolean default false)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  f jsonb := coalesce(p_details, '{}'::jsonb);
  k record;
  r record;
  o public.grp_ref_objets;
  g record;
  v_entite uuid;
  v_objet_type text;
  v_type text;
  v_equipe text;
  v_reference text;
  v_resume text;
  v_calcul text;
  v_piece jsonb := '{}'::jsonb;
  v_echeance date;
  v_montant numeric;
  v_nouveau numeric;
  v_plafond_avant numeric;
  v_existe public.grp_decisions;
  v_id uuid := gen_random_uuid();
  v_demande uuid;
  v_statut text;
begin
  perform private.grp_exiger_installation(p_client);
  if v_uid is not null and not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']) then
    raise exception 'Une décision se propose par une personne de l''organisation (pas un lecteur).' using errcode = '42501';
  end if;
  if p_genre = 'denoncer_contrat' then
    select * into k from public.grp_contrats_echeancier x where x.id = p_objet and x.client_id = p_client;
    if k.id is null then
      raise exception 'Contrat introuvable.' using errcode = 'P0002';
    end if;
    if k.statut <> 'actif' or k.reconduction <> 'tacite' then
      raise exception 'Seul un contrat actif à reconduction tacite se dénonce (celui-ci : %, %).', k.statut, k.reconduction using errcode = '22023';
    end if;
    if k.date_limite < current_date then
      raise exception 'La date limite de dénonciation est passée (%) : le contrat est reconduit.', to_char(k.date_limite, 'DD/MM/YYYY') using errcode = '22023';
    end if;
    v_entite := k.entite_id; v_objet_type := 'grp_contrats'; v_type := 'varelo.denoncer_contrat'; v_equipe := 'direction_juridique';
    v_reference := 'echeance:' || k.echeance_courante::text;
    v_echeance := k.date_limite; v_montant := k.montant_annuel;
    v_resume := left(format('Dénoncer « %s » (%s, %s) avant le %s', k.intitule, k.tiers, k.societe, to_char(k.date_limite, 'DD/MM/YYYY')), 500);
    v_calcul := format('Échéance du %s − préavis de %s %s = date limite du %s, dans %s jour%s%s',
                       to_char(k.echeance_courante, 'DD/MM/YYYY'), k.preavis_valeur, k.preavis_unite, to_char(k.date_limite, 'DD/MM/YYYY'),
                       k.jours_restants, case when k.jours_restants > 1 then 's' else '' end,
                       case when k.montant_annuel is not null then format(' ; %s € par an', private.grp_euros(k.montant_annuel)) else '' end
                       || case when k.contrats_du_tiers > 1 then format(' ; %s contrats chez ce tiers dans le groupe', k.contrats_du_tiers) else '' end);
  elsif p_genre = 'protester_reception' then
    select * into r from public.grp_reserves x where x.id = p_objet and x.client_id = p_client;
    if r.id is null then
      raise exception 'Livraison introuvable.' using errcode = 'P0002';
    end if;
    if r.statut <> 'a_examiner' then
      raise exception 'Cette livraison est déjà « % ».', r.statut using errcode = '22023';
    end if;
    v_entite := r.entite_id; v_objet_type := 'grp_receptions'; v_type := 'varelo.protester_reception'; v_equipe := 'direction_operations';
    v_reference := 'protestation';
    v_echeance := r.echeance; v_montant := r.montant_estime;
    v_resume := left(format('Protester auprès de %s (livraison du %s, %s) avant le %s', r.transporteur, to_char(r.date_reception, 'DD/MM/YYYY'),
                            r.societe, to_char(r.echeance, 'DD/MM/YYYY')), 500);
    v_calcul := left(format('%s : %s%s', coalesce(r.regle_libelle, r.mode), coalesce(r.calcul_detail, 'date limite au ' || to_char(r.echeance, 'DD/MM/YYYY')),
                            case when r.montant_estime is not null then format(' ; préjudice estimé %s €', private.grp_euros(r.montant_estime)) else '' end), 1000);
    v_piece := jsonb_strip_nulls(jsonb_build_object('photos', jsonb_array_length(coalesce(r.photos, '[]'::jsonb)), 'piece_id', r.piece_id));
  elsif p_genre = 'relever_plafond' then
    select * into o from public.grp_ref_objets x where x.id = p_objet and x.client_id = p_client;
    if o.id is null then
      raise exception 'Objet du groupe introuvable.' using errcode = 'P0002';
    end if;
    if o.nature <> 'client' or o.statut <> 'actif' or o.intragroupe then
      raise exception 'Un plafond d''encours se propose pour un client actif du groupe, hors intragroupe.' using errcode = '22023';
    end if;
    begin
      v_nouveau := round((f ->> 'plafond')::numeric, 2);
    exception when others then
      raise exception 'Le plafond proposé est un montant (plafond).' using errcode = '22023';
    end;
    if v_nouveau is null or v_nouveau <= 0 then
      raise exception 'Le plafond proposé est un montant positif.' using errcode = '22023';
    end if;
    select x.total, x.echu, x.plafond into g from public.grp_encours_groupe x where x.client_id = p_client and x.objet_id = o.id;
    v_plafond_avant := g.plafond;
    v_entite := null; v_objet_type := 'grp_ref_objets'; v_type := 'varelo.relever_plafond'; v_equipe := 'direction_financiere';
    v_reference := 'plafond:' || v_nouveau::text || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS');
    v_montant := v_nouveau;
    v_resume := left(format('Porter le plafond d''encours de %s (%s) à %s €', o.nom_groupe, o.code_groupe, private.grp_euros(v_nouveau)), 500);
    v_calcul := format('Encours du groupe %s € (dont %s € échus), %s : %s',
                       private.grp_euros(coalesce(g.total, 0)), private.grp_euros(coalesce(g.echu, 0)),
                       case when g.plafond is null then 'sans plafond' else 'pour un plafond de ' || private.grp_euros(g.plafond) || ' €' end,
                       case when g.plafond is not null and coalesce(g.total, 0) > g.plafond
                            then format('dépassement de %s € ; plafond proposé %s €', private.grp_euros(g.total - g.plafond), private.grp_euros(v_nouveau))
                            else format('plafond proposé %s €', private.grp_euros(v_nouveau)) end);
    if nullif(btrim(f ->> 'motif'), '') is not null then
      v_calcul := left(v_calcul || ' — ' || btrim(f ->> 'motif'), 1000);
    end if;
  else
    raise exception 'Décision inconnue : denoncer_contrat, protester_reception ou relever_plafond (%).', p_genre using errcode = '22023';
  end if;
  if v_uid is not null and v_entite is not null and not private.voit_entite(p_client, v_entite) then
    raise exception 'Cet objet est hors de votre périmètre.' using errcode = '42501';
  end if;
  select * into v_existe from public.grp_decisions d
  where d.client_id = p_client and d.genre = p_genre and d.objet_id = p_objet
    and (d.statut = 'en_attente' or d.reference = v_reference)
  order by (d.statut = 'en_attente') desc limit 1;
  if v_existe.id is not null then
    return jsonb_build_object('decision', v_existe.id, 'demande', v_existe.demande_id, 'statut', v_existe.statut, 'deja', true);
  end if;
  perform private.grp_regle_decision(p_client, v_type, v_equipe);
  perform set_config('omega.module', 'varelo', true);
  insert into public.grp_decisions (id, client_id, entite_id, genre, objet_type, objet_id, reference, resume, calcul, piece, details,
                                    echeance, montant, d_office, propose_par)
  values (v_id, p_client, v_entite, p_genre, v_objet_type, p_objet, v_reference, v_resume, v_calcul, v_piece,
          case when p_genre = 'relever_plafond' then jsonb_build_object('plafond', v_nouveau, 'plafond_avant', v_plafond_avant) else '{}'::jsonb end,
          v_echeance, round(v_montant, 2), p_d_office, v_uid);
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, montant, payload,
                                          echeance, cle_idempotence)
  values (p_client, v_entite, 'varelo', v_type, v_objet_type, p_objet::text, v_resume, round(v_montant, 2),
          jsonb_build_object('decision', v_id, 'genre', p_genre, 'calcul', v_calcul, 'piece', v_piece, 'echeance', v_echeance),
          case when v_echeance is not null then (v_echeance + 1)::timestamptz end,
          'varelo:decision:' || v_id::text)
  returning id, statut into v_demande, v_statut;
  update public.grp_decisions set demande_id = v_demande where id = v_id;
  perform private.grp_journal(p_client, 'varelo.decision.proposee', 'grp_decisions', v_id::text,
    jsonb_build_object('genre', p_genre, 'objet', p_objet, 'demande', v_demande, 'resume', v_resume, 'calcul', v_calcul,
                       'd_office', p_d_office), v_entite);
  return jsonb_build_object('decision', v_id, 'demande', v_demande, 'statut', v_statut, 'deja', false);
end $function$;

create or replace function public.grp_proposer_decision(p_client uuid, p_genre text, p_objet uuid, p_details jsonb default '{}'::jsonb)
 returns jsonb language sql set search_path to ''
as $function$ select private.grp_proposer_decision(p_client, p_genre, p_objet, p_details, false) $function$;

-- D'office, chaque heure : les contrats à dénoncer sous 15 jours, les livraisons à protester.
create or replace function private.grp_proposer_du_jour(p_client uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v jsonb;
  n integer := 0;
begin
  for x in
    select 'denoncer_contrat' as genre, c.id from public.grp_contrats_echeancier c
    where c.client_id = p_client and c.statut = 'actif' and c.reconduction = 'tacite' and c.jours_restants between 0 and 15
    union all
    select 'protester_reception', r.id from public.grp_reserves r
    where r.client_id = p_client and r.statut = 'a_examiner'
  loop
    begin
      v := private.grp_proposer_decision(p_client, x.genre, x.id, '{}'::jsonb, true);
      if not (v ->> 'deja')::boolean then
        n := n + 1;
      end if;
    exception when others then
      perform private.lever_alerte_module(p_client, 'varelo', 'attention', 'Une décision n''a pas pu être proposée d''office.',
        jsonb_build_object('genre', x.genre, 'objet', x.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'decision:' || x.id::text, false, null);
    end;
  end loop;
  return n;
end $function$;

create or replace function private.grp_tache_decisions()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  i record;
  n integer := 0;
begin
  for i in select client_id from public.grp_installations order by client_id loop
    begin
      n := n + private.grp_proposer_du_jour(i.client_id);
    exception when others then
      perform private.lever_alerte_module(i.client_id, 'varelo', 'attention', 'Les décisions du jour n''ont pas pu être proposées.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'decisions:tache', false, null);
    end;
  end loop;
  return jsonb_build_object('proposees', n);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Exécuter à la décision
-- ─────────────────────────────────────────────────────────────────────────

create or replace function private.grp_executer_decision(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.grp_decisions;
  v_statut text := p_charge ->> 'statut';
  v_motif text;
  v_res jsonb;
  v_final text;
begin
  select * into d from public.grp_decisions where demande_id = nullif(p_charge ->> 'demande', '')::uuid for update;
  if d.id is null then
    return jsonb_build_object('ignore', 'pas une décision Varelo');
  end if;
  if d.statut <> 'en_attente' then
    return jsonb_build_object('decision', d.id, 'deja', d.statut);
  end if;
  select a.commentaire into v_motif from public.approbations a where a.demande_id = d.demande_id order by a.decide_le desc limit 1;
  perform set_config('omega.module', 'varelo', true);
  if v_statut = 'approuvee' then
    begin
      if d.genre = 'relever_plafond' then
        v_res := private.grp_regler_plafond(d.objet_id, (d.details ->> 'plafond')::numeric, null,
                                            left('Validé par la direction financière' || coalesce(' : ' || v_motif, ''), 500));
        v_final := 'executee';
      elsif d.genre = 'denoncer_contrat' then
        v_res := jsonb_build_object('a_faire', format('Envoyer la dénonciation avant le %s, puis la noter sur le contrat.', to_char(d.echeance, 'DD/MM/YYYY')));
        v_final := 'approuvee';
      else
        v_res := jsonb_build_object('a_faire', format('Envoyer la lettre de protestation avant le %s, puis la noter sur la livraison.', to_char(d.echeance, 'DD/MM/YYYY')));
        v_final := 'approuvee';
      end if;
      update public.demandes_validation set statut = 'executee' where id = d.demande_id and statut = 'approuvee';
    exception when others then
      v_res := jsonb_build_object('erreur', left(sqlerrm, 480));
      v_final := 'echec';
      update public.demandes_validation set statut = 'echec_execution', motif_echec = left('Varelo : ' || sqlerrm, 480)
      where id = d.demande_id and statut = 'approuvee';
    end;
  elsif v_statut = 'rejetee' then
    v_final := 'rejetee';
    if d.genre = 'protester_reception' then
      begin
        perform private.grp_classer_reception(d.objet_id, left('Protestation refusée par la direction' || coalesce(' : ' || v_motif, '.'), 500));
        v_res := jsonb_build_object('reception', 'classee sans suite');
      exception when others then
        v_res := jsonb_build_object('reception', left(sqlerrm, 300));
      end;
    elsif d.genre = 'denoncer_contrat' then
      v_res := jsonb_build_object('contrat', 'reconduction acceptée');
    else
      v_res := jsonb_build_object('plafond', 'inchangé');
    end if;
  else
    v_final := case when v_statut in ('expiree', 'annulee') then v_statut else 'expiree' end;
    v_res := jsonb_build_object('demande', v_statut);
  end if;
  update public.grp_decisions
     set statut = v_final, resultat = v_res, motif = left(v_motif, 2000), decide_le = coalesce(nullif(p_charge ->> 'decide_le', '')::timestamptz, now()),
         execute_le = case when v_final in ('executee', 'approuvee', 'rejetee') then now() end
   where id = d.id;
  perform private.grp_journal(d.client_id, 'varelo.decision.' || v_final, 'grp_decisions', d.id::text,
    jsonb_build_object('genre', d.genre, 'objet', d.objet_id, 'demande', d.demande_id, 'resultat', v_res, 'motif', left(v_motif, 500)), d.entite_id);
  return jsonb_build_object('decision', d.id, 'statut', v_final, 'resultat', v_res);
end $function$;

insert into private.abonnements (evenement, module, genre)
select 'demande.decidee.varelo', 'varelo', 'varelo.decision'
where not exists (select 1 from private.abonnements a where a.evenement = 'demande.decidee.varelo' and a.module = 'varelo');

-- Le cron varelo-releves prend désormais les deux genres de travaux (remplace celle de b1_10).
create or replace function private.grp_traiter_travaux(p_nombre integer default 10)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  r jsonb;
  n_ok integer := 0;
  n_ko integer := 0;
begin
  for t in select * from private.prendre_travaux(array['varelo.appliquer_releve', 'varelo.decision'], p_nombre, interval '10 minutes', 'varelo-sql') loop
    begin
      r := case t.genre when 'varelo.decision' then private.grp_executer_decision(t.charge)
                        else private.grp_appliquer_releve(t.charge) end;
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Le point du matin : « Décisions à valider », au plus trois par destinataire
-- ─────────────────────────────────────────────────────────────────────────

-- SECURITY INVOKER : au périmètre de la personne quand l'écran l'appelle ; tout le groupe pour le cron.
-- p_equipe : la clé d'une direction (ses décisions seulement) ; null : toutes (gérant, écran).
create or replace function private.grp_lignes_decisions(p_client uuid, p_equipe text default null::text)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(l.ligne order by l.rang), '[]'::jsonb)
  from (
    select row_number() over (order by d.echeance nulls last, d.propose_le, d.id) as rang,
           jsonb_build_object(
             'texte', left(format('À valider : %s. %s%s', d.resume, d.calcul,
                                  case when coalesce((d.piece ->> 'photos')::int, 0) > 0
                                       then format(' (%s photo%s du constat)', d.piece ->> 'photos', case when (d.piece ->> 'photos')::int > 1 then 's' else '' end)
                                       when d.piece ? 'piece_id' then ' (bon de livraison joint)' else '' end), 300),
             'gravite', case when d.echeance is not null and d.echeance <= current_date + 1 then 'critique' else 'attention' end,
             'lien', '/espace/validations', 'objet_type', 'demandes_validation', 'objet_id', d.demande_id::text) as ligne
    from public.grp_decisions d
    where d.client_id = p_client and d.statut = 'en_attente' and d.demande_id is not null
      and (p_equipe is null
           or (p_equipe = 'direction_juridique' and d.genre = 'denoncer_contrat')
           or (p_equipe = 'direction_operations' and d.genre = 'protester_reception')
           or (p_equipe = 'direction_financiere' and d.genre = 'relever_plafond'))
    order by d.echeance nulls last, d.propose_le, d.id
    limit 3
  ) l
$function$;

-- Remplacent celles de b1_11 : la clé « decisions » à l'écran, la section « Décisions à valider » au matin.
create or replace function public.grp_ce_matin(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is not null and p_client not in (select private.mes_clients()) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('decisions', private.grp_lignes_decisions(p_client, null),
                            'groupe', private.grp_lignes_groupe(p_client),
                            'reserves', private.grp_lignes_reserves(p_client),
                            'reportings', private.grp_lignes_reportings(p_client),
                            'contrats', private.grp_lignes_matin(p_client, 'contrats'),
                            'encours', private.grp_lignes_matin(p_client, 'encours'),
                            'reciproques', private.grp_lignes_matin(p_client, 'reciproques'));
end $function$;

create or replace function private.grp_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  s record;
  q record;
  u record;
  v_jour date;
  v_items jsonb;
  n integer := 0;
begin
  for k in
    select i.client_id,
           coalesce((select e.fuseau from public.entites e where e.client_id = i.client_id and e.principale limit 1), 'Europe/Paris') as fuseau
    from public.grp_installations i
    order by i.client_id
  loop
    continue when (p_maintenant at time zone k.fuseau)::time < time '05:00';
    v_jour := (p_maintenant at time zone k.fuseau)::date;
    begin
      perform set_config('omega.module', 'varelo', true);
      for s in
        select * from (values ('groupe', 'Le groupe ce matin', 5), ('reserves', 'Réserves à émettre', 6), ('reportings', 'Reportings dus', 8),
                              ('contrats', 'Contrats à dénoncer', 10), ('encours', 'Encours du groupe', 20),
                              ('reciproques', 'Réciproques intragroupe', 30)) as t(quoi, titre, ordre)
      loop
        v_items := case s.quoi when 'groupe' then private.grp_lignes_groupe(k.client_id)
                               when 'reserves' then private.grp_lignes_reserves(k.client_id)
                               when 'reportings' then private.grp_lignes_reportings(k.client_id)
                               else private.grp_lignes_matin(k.client_id, s.quoi) end;
        for q in
          select null::uuid as equipe_id, 'gerant'::text as role
          union all
          select e.id, null from public.equipes e
          where e.client_id = k.client_id
            and ((e.cle = 'direction_financiere' and s.quoi not in ('reserves'))
                 or (e.cle = 'direction_juridique' and s.quoi in ('contrats', 'reserves'))
                 or (e.cle = 'presidence' and s.quoi = 'groupe')
                 or (e.cle = 'direction_operations' and s.quoi in ('reportings', 'reserves')))
        loop
          if jsonb_array_length(v_items) = 0 then
            perform private.retirer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, null, q.equipe_id);
          else
            perform private.deposer_section(k.client_id, 'varelo', v_jour, null, q.role, s.titre, v_items, null, q.equipe_id,
                                            false, now(), false, s.ordre);
          end if;
        end loop;
      end loop;
      -- b1_15 : « Décisions à valider », au plus trois par destinataire, chacune avec son calcul et sa pièce
      for q in
        select null::uuid as equipe_id, 'gerant'::text as role, null::text as cle
        union all
        select e.id, null, e.cle from public.equipes e
        where e.client_id = k.client_id and e.cle in ('direction_financiere', 'direction_juridique', 'direction_operations')
      loop
        v_items := private.grp_lignes_decisions(k.client_id, q.cle);
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'varelo', v_jour, null, q.role, 'Décisions à valider', null, q.equipe_id);
        else
          perform private.deposer_section(k.client_id, 'varelo', v_jour, null, q.role, 'Décisions à valider', v_items, null, q.equipe_id,
                                          false, now(), false, 1);
        end if;
      end loop;
      for u in
        select distinct g.responsable_id from public.grp_reportings g
        where g.client_id = k.client_id and g.actif and g.responsable_id is not null
      loop
        v_items := private.grp_lignes_reportings(k.client_id, u.responsable_id);
        if jsonb_array_length(v_items) = 0 then
          perform private.retirer_section(k.client_id, 'varelo', v_jour, u.responsable_id, null, 'Mes reportings dus', null, null);
        else
          perform private.deposer_section(k.client_id, 'varelo', v_jour, u.responsable_id, null, 'Mes reportings dus', v_items, null, null,
                                          false, now(), false, 7);
        end if;
      end loop;
      perform private.battre(k.client_id, 'varelo_matin', jsonb_build_object('jour', v_jour), interval '1 day');
      n := n + 1;
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'varelo', 'attention',
        'Le point du matin du groupe n''a pas pu être déposé.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot', false, null);
    end;
  end loop;
  return n;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Droits et cron
-- ─────────────────────────────────────────────────────────────────────────

revoke execute on function private.grp_regle_decision(uuid, text, text) from public, anon, authenticated;
revoke execute on function private.grp_proposer_du_jour(uuid) from public, anon, authenticated;
revoke execute on function private.grp_tache_decisions() from public, anon, authenticated;
revoke execute on function private.grp_executer_decision(jsonb) from public, anon, authenticated;
revoke execute on function private.grp_traiter_travaux(integer) from public, anon, authenticated;
grant execute on function private.grp_regle_decision(uuid, text, text) to service_role;
grant execute on function private.grp_proposer_du_jour(uuid) to service_role;
grant execute on function private.grp_tache_decisions() to service_role;
grant execute on function private.grp_executer_decision(jsonb) to service_role;
grant execute on function private.grp_traiter_travaux(integer) to service_role;

revoke execute on function private.grp_proposer_decision(uuid, text, uuid, jsonb, boolean) from public, anon;
revoke execute on function private.grp_lignes_decisions(uuid, text) from public, anon;
grant execute on function private.grp_proposer_decision(uuid, text, uuid, jsonb, boolean) to authenticated, service_role;
grant execute on function private.grp_lignes_decisions(uuid, text) to authenticated, service_role;
revoke execute on function public.grp_proposer_decision(uuid, text, uuid, jsonb) from public, anon;
grant execute on function public.grp_proposer_decision(uuid, text, uuid, jsonb) to authenticated, service_role;
revoke execute on function private.grp_deposer_points(timestamp with time zone) from public, anon, authenticated;
grant execute on function private.grp_deposer_points(timestamp with time zone) to service_role;

select cron.schedule('varelo-decisions', '41 * * * *', $cron$select private.grp_tache_decisions()$cron$);
