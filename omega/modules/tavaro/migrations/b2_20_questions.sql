-- b2_20 — Les Questions (module 06 : « Posez une question en français : Tavaro répond chiffres à l'appui, avec la cause
-- de l'écart et la décision proposée »). Session B2, 17/10/2026.
--
-- Même fournisseur et mêmes garde-fous que le lecteur (Teo, 17/10) : l'ouvrier tavaro-questions appelle Claude par
-- l'abstraction commutable de omega/functions/_partage (API Anthropic sur la recette, Bedrock sinon), sous le plafond
-- plafond_ia_jour_client ; son coût entre dans private.consommation_ia_jour par le genre tavaro.question
-- (b2_20b, lot socle). Aucun autre fournisseur.
--
-- Le modèle n'écrit JAMAIS de SQL. Il choisit dans un catalogue FERMÉ de lectures, toutes en lecture seule, bornées à
-- l'organisation de la question (et à son agence si elle en a une), dix lignes au plus ; puis il répond à partir de ce
-- que ces lectures ont rendu, et de rien d'autre :
--   factures_mois, retours_non_factures, remises, immobilisations, avis, contestations, peages, sinistres.
--
--   · public.loc_questions : la question, son état, la réponse (texte, chiffres, cause, décision, lectures faites) ;
--   · loc_poser_question(question, entite?) : une personne de l'organisation ; trente questions par jour et par
--     organisation au plus ; dépose le travail tavaro.question ;
--   · portes de l'ouvrier (service seul) : loc_question_commencer, loc_question_lire, loc_question_repondre,
--     loc_question_echec.

create table if not exists public.loc_questions (
  id uuid not null default gen_random_uuid(),
  client_id uuid not null,
  entite_id uuid,
  question text not null,
  statut text not null default 'a_traiter',
  reponse jsonb,
  lectures jsonb not null default '[]'::jsonb,
  erreur text,
  modele text,
  tokens_entree integer,
  tokens_sortie integer,
  cout_eur numeric(10,6),
  posee_par uuid,
  posee_le timestamp with time zone not null default now(),
  repondue_le timestamp with time zone,
  maj_le timestamp with time zone not null default now(),
  constraint loc_questions_pkey primary key (id),
  constraint loc_questions_client_id_id_key unique (client_id, id),
  constraint loc_questions_client_fkey foreign key (client_id) references public.clients(id) on delete cascade,
  constraint loc_questions_statut_check check (statut in ('a_traiter', 'en_cours', 'repondue', 'echec')),
  constraint loc_questions_texte check (char_length(btrim(question)) between 5 and 500),
  constraint loc_questions_repondue check ((statut = 'repondue') = (reponse is not null and repondue_le is not null))
);
create index if not exists loc_questions_recentes on public.loc_questions (client_id, posee_le desc);
comment on table public.loc_questions is 'b2_20 : questions en français posées à Tavaro, réponses chiffrées tirées de lectures bornées (jamais d''écriture)';

alter table public.loc_questions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'loc_questions' and policyname = 'on voit les questions de son agence') then
    create policy "on voit les questions de son agence" on public.loc_questions for select to authenticated
      using (client_id in (select private.mes_clients())
             and (case when entite_id is null then (posee_par = (select auth.uid()) or private.a_un_role(client_id, array['gerant', 'admin', 'valideur']))
                       else private.voit_entite(client_id, entite_id) end));
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'loc_questions_toucher' and tgrelid = 'public.loc_questions'::regclass) then
    create trigger loc_questions_toucher before update on public.loc_questions for each row execute function private.loc_toucher();
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'loc_questions') then
    alter publication supabase_realtime add table public.loc_questions;
  end if;
end $$;
revoke all on table public.loc_questions from public, anon, authenticated;
grant select on table public.loc_questions to authenticated;
grant all on table public.loc_questions to service_role;

-- Le catalogue fermé, tel que le modèle le lit.
CREATE OR REPLACE FUNCTION private.loc_catalogue_questions()
 RETURNS jsonb
 LANGUAGE sql
 IMMUTABLE
AS $function$
  select jsonb_build_array(
    jsonb_build_object('lecture', 'factures_mois', 'parametres', '{"mois": "AAAA-MM (défaut : le mois en cours)"}'::jsonb, 'rend', 'retours rendus, facturé TTC, avoirs, euros pour cent retours, factures en litige ou impayées'),
    jsonb_build_object('lecture', 'retours_non_factures', 'parametres', '{"jours": "1 à 90 (défaut 30)"}'::jsonb, 'rend', 'contrats rendus sans facture émise : nombre, liste des dix plus anciens, état du chiffrage'),
    jsonb_build_object('lecture', 'remises', 'parametres', '{"jours": "1 à 90 (défaut 30)"}'::jsonb, 'rend', 'remises en location : durée médiane, prêtes à temps, en retard, en cours, sans personne nommée'),
    jsonb_build_object('lecture', 'immobilisations', 'parametres', '{"jours": "1 à 365 (défaut 90)"}'::jsonb, 'rend', 'véhicules immobilisés par motif, jours perdus, retours dépassés'),
    jsonb_build_object('lecture', 'avis', 'parametres', '{}'::jsonb, 'rend', 'avis de contravention à rapprocher ou à désigner, échéances, désignés hors délai, frais refacturés'),
    jsonb_build_object('lecture', 'contestations', 'parametres', '{"jours": "1 à 365 (défaut 180)"}'::jsonb, 'rend', 'contestations bancaires ouvertes, envoyées, gagnées, perdues, montants'),
    jsonb_build_object('lecture', 'peages', 'parametres', '{"jours": "1 à 90 (défaut 30)"}'::jsonb, 'rend', 'passages de péage à payer, hors délai, refacturés, à la charge du loueur, montants'),
    jsonb_build_object('lecture', 'sinistres', 'parametres', '{"jours": "1 à 365 (défaut 365)"}'::jsonb, 'rend', 'sinistres par étape et par responsabilité, recours préparés et réglés, montants'))
$function$;

-- Une lecture du catalogue : lecture seule, bornée à l'organisation (et à l'agence), dix lignes au plus.
CREATE OR REPLACE FUNCTION private.loc_question_lecture(p_client uuid, p_entite uuid, p_lecture text, p_parametres jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_fuseau text;
  v_jours integer;
  v_mois date;
  v jsonb;
  v_retours integer;
  v_factures numeric;
  v_avoirs numeric;
begin
  select coalesce(e.fuseau, 'Europe/Paris') into v_fuseau from public.entites e
  where e.client_id = p_client and (e.id = p_entite or p_entite is null) order by (e.id = p_entite) desc nulls last, e.principale desc nulls last limit 1;
  v_fuseau := coalesce(v_fuseau, 'Europe/Paris');
  v_jours := least(greatest(coalesce(case when coalesce(p_parametres ->> 'jours', '') ~ '^[0-9]{1,3}$' then (p_parametres ->> 'jours')::integer end,
                                         case p_lecture when 'immobilisations' then 90 when 'contestations' then 180 when 'sinistres' then 365 else 30 end), 1), 365);
  case p_lecture
  when 'factures_mois' then
    v_mois := case when coalesce(p_parametres ->> 'mois', '') ~ '^[0-9]{4}-[0-9]{2}$' then ((p_parametres ->> 'mois') || '-01')::date
                   else date_trunc('month', (now() at time zone v_fuseau))::date end;
    select count(*) into v_retours from public.loc_contrats c
    where c.client_id = p_client and (p_entite is null or coalesce(c.entite_retour_id, c.entite_id) = p_entite) and c.statut <> 'annule'
      and coalesce(c.retour_reel_le, (select max((p.entrees ->> 'retour_reel_le')::timestamptz) from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id and p.entrees ? 'retour_reel_le'))
          between (v_mois::timestamp at time zone v_fuseau) and ((v_mois + interval '1 month')::timestamp at time zone v_fuseau);
    select coalesce(sum(f.total_ttc), 0) into v_factures from public.loc_factures f
    where f.client_id = p_client and (p_entite is null or f.entite_id = p_entite) and f.date_facture >= v_mois and f.date_facture < (v_mois + interval '1 month')::date;
    select coalesce(sum(a.montant_ttc), 0) into v_avoirs from public.loc_avoirs a
    where a.client_id = p_client and (p_entite is null or a.entite_id = p_entite) and a.date_avoir >= v_mois and a.date_avoir < (v_mois + interval '1 month')::date;
    v := jsonb_build_object('mois', to_char(v_mois, 'YYYY-MM'), 'retours', v_retours, 'facture_ttc', v_factures, 'avoirs_ttc', v_avoirs,
      'pour_100_retours', case when v_retours > 0 then round((v_factures - v_avoirs) * 100 / v_retours, 2) end,
      'factures_en_litige', (select count(*) from public.loc_factures f where f.client_id = p_client and (p_entite is null or f.entite_id = p_entite) and f.statut = 'litige'),
      'factures_impayees_ttc', (select coalesce(sum(f.total_ttc), 0) from public.loc_factures f where f.client_id = p_client and (p_entite is null or f.entite_id = p_entite)
                                  and f.statut in ('emise', 'envoyee') and f.echeance_le < (now() at time zone v_fuseau)::date));
  when 'retours_non_factures' then
    with r as (
      select c.id, c.numero, coalesce(c.retour_reel_le, (select max((p.entrees ->> 'retour_reel_le')::timestamptz) from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id and p.entrees ? 'retour_reel_le')) as rendu_le,
             (select p.statut from public.loc_propositions p where p.client_id = c.client_id and p.contrat_id = c.id order by p.version desc limit 1) as chiffrage
      from public.loc_contrats c
      where c.client_id = p_client and (p_entite is null or coalesce(c.entite_retour_id, c.entite_id) = p_entite) and c.statut <> 'annule'
        and not exists (select 1 from public.loc_factures f where f.client_id = c.client_id and f.contrat_id = c.id)
    )
    select jsonb_build_object('jours', v_jours, 'nombre', count(*),
             'par_etat', coalesce((select jsonb_object_agg(coalesce(z.chiffrage, 'pas_chiffre'), z.n) from (select r2.chiffrage, count(*) n from r r2 where r2.rendu_le >= now() - make_interval(days => v_jours) group by 1) z), '{}'::jsonb),
             'plus_anciens', coalesce((select jsonb_agg(jsonb_build_object('contrat', y.numero, 'rendu_le', to_char(y.rendu_le at time zone v_fuseau, 'DD/MM'), 'chiffrage', coalesce(y.chiffrage, 'pas_chiffre')))
                                       from (select * from r r3 where r3.rendu_le >= now() - make_interval(days => v_jours) order by r3.rendu_le limit 10) y), '[]'::jsonb))
      into v from r where r.rendu_le >= now() - make_interval(days => v_jours);
  when 'remises' then
    select jsonb_build_object('jours', v_jours,
             'finies', count(*) filter (where x.statut = 'prete'),
             'mediane_minutes', round(extract(epoch from percentile_cont(0.5) within group (order by x.prete_le - x.retour_le) filter (where x.statut = 'prete')) / 60),
             'pretes_a_temps', count(*) filter (where x.statut = 'prete' and (x.limite_le is null or x.prete_le <= x.limite_le)),
             'en_cours', count(*) filter (where x.statut in ('a_faire', 'en_cours')),
             'en_retard', count(*) filter (where x.statut in ('a_faire', 'en_cours') and x.limite_le < now()),
             'sans_personne', count(*) filter (where x.statut in ('a_faire', 'en_cours') and x.responsable is null))
      into v from public.loc_remises x
    where x.client_id = p_client and (p_entite is null or x.entite_id = p_entite) and (x.retour_le >= now() - make_interval(days => v_jours) or x.statut in ('a_faire', 'en_cours'));
  when 'immobilisations' then
    select jsonb_build_object('jours', v_jours,
             'en_cours', count(*) filter (where i.fin_le is null),
             'retours_depasses', count(*) filter (where i.fin_le is null and i.fin_prevue_le < now()),
             'jours_perdus_par_motif', coalesce((select jsonb_object_agg(z.motif, z.j) from (
                 select i2.motif, round(sum(extract(epoch from (least(coalesce(i2.fin_le, now()), now()) - greatest(i2.debut_le, now() - make_interval(days => v_jours)))) / 86400)::numeric, 1) as j
                 from public.loc_immobilisations i2
                 where i2.client_id = p_client and (p_entite is null or i2.entite_id = p_entite) and i2.motif <> 'preparation'
                   and coalesce(i2.fin_le, now()) > now() - make_interval(days => v_jours) group by 1) z), '{}'::jsonb))
      into v from public.loc_immobilisations i
    where i.client_id = p_client and (p_entite is null or i.entite_id = p_entite) and i.motif <> 'preparation' and coalesce(i.fin_le, now()) > now() - make_interval(days => v_jours);
  when 'avis' then
    select jsonb_build_object(
             'a_rapprocher', count(*) filter (where a.statut = 'a_rapprocher'),
             'a_designer', count(*) filter (where a.statut = 'a_designer'),
             'echeance_sous_7_jours', count(*) filter (where a.statut in ('a_rapprocher', 'a_designer') and a.echeance_le <= (now() at time zone v_fuseau)::date + 7),
             'designes_hors_delai_12_mois', count(*) filter (where a.hors_delai and a.designe_le > now() - interval '12 months'),
             'designes_12_mois', count(*) filter (where a.statut = 'designe' and a.designe_le > now() - interval '12 months'),
             'montant_a_designer_eur', coalesce(sum(a.montant_eur) filter (where a.statut = 'a_designer'), 0))
      into v from public.loc_avis_contravention a where a.client_id = p_client and (p_entite is null or a.entite_id = p_entite);
  when 'contestations' then
    select jsonb_build_object('jours', v_jours,
             'ouvertes', count(*) filter (where c.statut in ('ouverte', 'dossier_pret')),
             'envoyees', count(*) filter (where c.statut = 'envoyee'),
             'gagnees', count(*) filter (where c.statut = 'gagnee'), 'perdues', count(*) filter (where c.statut = 'perdue'),
             'montant_conteste_eur', coalesce(sum(c.montant_eur), 0),
             'montant_perdu_eur', coalesce(sum(c.montant_eur) filter (where c.statut = 'perdue'), 0),
             'a_repondre_sous_7_jours', count(*) filter (where c.statut in ('ouverte', 'dossier_pret') and c.repondre_avant <= (now() at time zone v_fuseau)::date + 7))
      into v from public.loc_contestations c
    where c.client_id = p_client and (p_entite is null or c.entite_id = p_entite) and (c.recue_le >= (now() - make_interval(days => v_jours))::date or c.statut in ('ouverte', 'dossier_pret', 'envoyee'));
  when 'peages' then
    select jsonb_build_object('jours', v_jours,
             'a_payer', count(*) filter (where p.statut = 'a_payer'),
             'hors_delai', count(*) filter (where p.statut = 'a_payer' and p.payer_avant < now()),
             'refactures', count(*) filter (where p.statut = 'refacture'),
             'a_la_charge_du_loueur', count(*) filter (where p.statut = 'a_la_charge_du_loueur'),
             'montant_a_payer_eur', coalesce(sum(p.montant_eur) filter (where p.statut = 'a_payer'), 0),
             'montant_a_la_charge_eur', coalesce(sum(p.montant_eur) filter (where p.statut = 'a_la_charge_du_loueur'), 0),
             'payes_non_refactures', count(*) filter (where p.statut = 'paye'))
      into v from public.loc_passages_peage p
    where p.client_id = p_client and (p_entite is null or p.entite_id = p_entite) and (p.passe_le >= now() - make_interval(days => v_jours) or p.statut in ('a_payer', 'paye'));
  when 'sinistres' then
    select jsonb_build_object('jours', v_jours,
             'par_etape', coalesce((select jsonb_object_agg(z.statut, z.n) from (select s2.statut, count(*) n from public.loc_sinistres s2
                                     where s2.client_id = p_client and (p_entite is null or s2.entite_id = p_entite) and s2.survenu_le >= now() - make_interval(days => v_jours) group by 1) z), '{}'::jsonb),
             'tiers_responsable', count(*) filter (where s.responsabilite in ('tiers', 'partagee')),
             'recours_prepares', count(*) filter (where s.recours is not null),
             'recours_montant_eur', coalesce(sum((s.recours ->> 'montant')::numeric), 0),
             'recu_eur', coalesce(sum(s.montant_recu_eur), 0),
             'reparations_eur', coalesce(sum(s.montant_reparation_eur), 0))
      into v from public.loc_sinistres s
    where s.client_id = p_client and (p_entite is null or s.entite_id = p_entite) and s.survenu_le >= now() - make_interval(days => v_jours);
  else
    raise exception 'Lecture inconnue : %.', left(coalesce(p_lecture, ''), 40) using errcode = '22023';
  end case;
  return coalesce(v, '{}'::jsonb);
end $function$;

-- Poser une question : une personne de l'organisation ; trente par jour et par organisation.
CREATE OR REPLACE FUNCTION public.loc_poser_question(p_question text, p_entite uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid := private.loc_client_de_la_personne(array['gerant', 'admin', 'valideur', 'collaborateur'], 'Une question se pose par une personne de l''organisation.');
  v_id uuid;
  v_texte text := btrim(regexp_replace(coalesce(p_question, ''), '\s+', ' ', 'g'));
begin
  if char_length(v_texte) < 5 or char_length(v_texte) > 500 then
    raise exception 'Une question tient en 5 à 500 caractères.' using errcode = '22023';
  end if;
  if p_entite is not null and not private.voit_entite(v_client, p_entite) then
    raise exception 'Agence introuvable.' using errcode = 'P0002';
  end if;
  if p_entite is null and not private.a_un_role(v_client, array['gerant', 'admin', 'valideur']) then
    -- une personne d'agence pose ses questions sur son agence
    select ce.entite_id into p_entite from public.comptes_entites ce where ce.client_id = v_client and ce.user_id = (select auth.uid()) limit 1;
  end if;
  if (select count(*) from public.loc_questions q where q.client_id = v_client and q.posee_le >= now() - interval '1 day') >= 30 then
    raise exception 'Trente questions par jour au plus : la suivante pourra être posée demain.' using errcode = '54000';
  end if;
  insert into public.loc_questions (client_id, entite_id, question, posee_par) values (v_client, p_entite, v_texte, (select auth.uid())) returning id into v_id;
  perform private.deposer_travail(v_client, 'tavaro', 'tavaro.question', jsonb_build_object('question', v_id), 'tavaro:question:' || v_id::text, 2::smallint);
  perform private.journaliser_module(v_client, 'tavaro', 'tavaro.question_posee', 'loc_questions', v_id::text,
    jsonb_build_object('par', (select auth.uid()), 'entite', p_entite), p_entite);
  return jsonb_build_object('question', v_id, 'statut', 'a_traiter');
end $function$;

-- PORTES DE L'OUVRIER (service seul).
CREATE OR REPLACE FUNCTION public.loc_question_commencer(p_question uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  q public.loc_questions;
begin
  select * into q from public.loc_questions where id = p_question for update;
  if not found then
    return jsonb_build_object('statut', 'ignore', 'motif', 'question introuvable');
  end if;
  if q.statut not in ('a_traiter', 'en_cours') then
    return jsonb_build_object('statut', 'deja', 'motif', q.statut);
  end if;
  update public.loc_questions set statut = 'en_cours' where id = q.id;
  return jsonb_build_object('statut', 'a_traiter', 'question', q.id, 'client', q.client_id, 'texte', q.question,
    'agence', (select e.nom from public.entites e where e.id = q.entite_id),
    'organisation', (select c.nom from public.clients c where c.id = q.client_id),
    'aujourdhui', to_char(now() at time zone 'Europe/Paris', 'YYYY-MM-DD'),
    'catalogue', private.loc_catalogue_questions());
end $function$;

CREATE OR REPLACE FUNCTION public.loc_question_lire(p_question uuid, p_lecture text, p_parametres jsonb DEFAULT '{}'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  q public.loc_questions;
  v jsonb;
begin
  select * into q from public.loc_questions where id = p_question;
  if not found or q.statut <> 'en_cours' then
    raise exception 'Question introuvable ou pas en cours.' using errcode = 'P0002';
  end if;
  if jsonb_array_length(q.lectures) >= 6 then
    raise exception 'Six lectures par question au plus.' using errcode = '54000';
  end if;
  v := private.loc_question_lecture(q.client_id, q.entite_id, p_lecture, case when jsonb_typeof(p_parametres) = 'object' then p_parametres else '{}'::jsonb end);
  update public.loc_questions set lectures = lectures || jsonb_build_array(jsonb_build_object('lecture', p_lecture, 'parametres', p_parametres, 'le', now()))
   where id = q.id;
  return v;
end $function$;

-- p_reponse : {reponse, chiffres: [{libelle, valeur}], cause?, decision?} ; p_meta : {modele, tokens_entree, tokens_sortie, cout_eur}
CREATE OR REPLACE FUNCTION public.loc_question_repondre(p_question uuid, p_reponse jsonb, p_meta jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  q public.loc_questions;
begin
  select * into q from public.loc_questions where id = p_question for update;
  if not found or q.statut <> 'en_cours' then
    raise exception 'Question introuvable ou pas en cours.' using errcode = 'P0002';
  end if;
  if jsonb_typeof(p_reponse) <> 'object' or nullif(btrim(coalesce(p_reponse ->> 'reponse', '')), '') is null or char_length(p_reponse ->> 'reponse') > 3000 then
    raise exception 'Réponse illisible.' using errcode = '22023';
  end if;
  update public.loc_questions
     set statut = 'repondue', repondue_le = now(), erreur = null,
         reponse = jsonb_build_object('reponse', left(p_reponse ->> 'reponse', 3000),
                                      'chiffres', coalesce((select jsonb_agg(c) from (select jsonb_build_object('libelle', left(x ->> 'libelle', 120), 'valeur', left(x ->> 'valeur', 60)) c
                                                                                      from jsonb_array_elements(case when jsonb_typeof(p_reponse -> 'chiffres') = 'array' then p_reponse -> 'chiffres' else '[]'::jsonb end) x limit 8) z), '[]'::jsonb),
                                      'cause', left(nullif(btrim(coalesce(p_reponse ->> 'cause', '')), ''), 1000),
                                      'decision', left(nullif(btrim(coalesce(p_reponse ->> 'decision', '')), ''), 1000)),
         modele = left(p_meta ->> 'modele', 80),
         tokens_entree = nullif(p_meta ->> 'tokens_entree', '')::integer, tokens_sortie = nullif(p_meta ->> 'tokens_sortie', '')::integer,
         cout_eur = nullif(p_meta ->> 'cout_eur', '')::numeric
   where id = q.id;
  return jsonb_build_object('question', q.id, 'statut', 'repondue');
end $function$;

CREATE OR REPLACE FUNCTION public.loc_question_echec(p_question uuid, p_motif text)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  update public.loc_questions set statut = 'echec', erreur = left(coalesce(p_motif, ''), 500)
   where id = p_question and statut in ('a_traiter', 'en_cours')
$function$;

revoke all on function private.loc_catalogue_questions() from public, anon, authenticated;
revoke all on function private.loc_question_lecture(uuid, uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.loc_poser_question(text, uuid) from public, anon;
grant execute on function public.loc_poser_question(text, uuid) to authenticated, service_role;
revoke all on function public.loc_question_commencer(uuid) from public, anon, authenticated;
revoke all on function public.loc_question_lire(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.loc_question_repondre(uuid, jsonb, jsonb) from public, anon, authenticated;
revoke all on function public.loc_question_echec(uuid, text) from public, anon, authenticated;
grant execute on function public.loc_question_commencer(uuid) to service_role;
grant execute on function public.loc_question_lire(uuid, text, jsonb) to service_role;
grant execute on function public.loc_question_repondre(uuid, jsonb, jsonb) to service_role;
grant execute on function public.loc_question_echec(uuid, text) to service_role;
