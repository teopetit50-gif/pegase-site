-- 20261017151925 b1_19_assistant_b4_19_pieces_citees
-- Source : dépôt : b62f7dd omega/modules/varelo/migrations/b1_19_assistant.sql ; 3ea2415 omega/modules/tamila/migrations/b4_19_tamila_pieces_citees.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b1_19_assistant.sql @ b62f7dd, b4_19_tamila_pieces_citees.sql @ 3ea2415.
-- ═══ omega/modules/varelo/migrations/b1_19_assistant.sql @ b62f7dd
-- b1_19 — VARELO : « contexte_varelo » dans l'assistant, le côté base (17/10/2026, B1 ; accord de Teo du 17/10)
--
-- Décision de Teo : l'assistant de l'espace répond sur les données du groupe, en lecture seule, sous la session de
-- la personne, chaque lecture au journal, aucun IBAN ; le fournisseur est celui du lecteur (abstraction commutable
-- de omega/functions/_partage : API Anthropic sur la recette, Bedrock Francfort plus tard) ; un plafond par client
-- et par jour. L'appel au modèle se fait dans la fonction Edge omega/functions/varelo-assistant ; la lecture des
-- données passe par public.grp_contexte (b1_18, security invoker, journal varelo.lecture.contexte).
--
-- CE QUE ÇA POSE (après b1_18) :
--   · public.grp_assistant_client() : le groupe Varelo de la personne connectée (null si aucun) ;
--   · public.grp_assistant_budget(client) [clé de service seulement] : dépense IA du jour (lecteur, via
--     consommation_ia_jour, plus les réponses de l'assistant Varelo), plafond (lire_parametre
--     'plafond_ia_jour_client', 5 € à défaut), permis ou non ;
--   · public.grp_assistant_noter(client, personne, coût, modèle, jetons) [clé de service seulement] : journal
--     varelo.assistant.reponse (qui, combien, quel modèle, quel fournisseur).
--
-- Règles de pose : create or replace ; aucune suppression.

create or replace function private.grp_client_varelo()
 returns uuid
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select c from private.mes_clients() c
  where exists (select 1 from public.grp_installations i where i.client_id = c)
  order by c limit 1
$function$;

create or replace function public.grp_assistant_client()
 returns uuid language sql stable set search_path to ''
as $function$ select private.grp_client_varelo() $function$;

create or replace function private.grp_assistant_budget(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_lecteur numeric := 0;
  v_assistant numeric;
  v_plafond numeric;
begin
  begin
    v_lecteur := coalesce(public.consommation_ia_jour(p_client), 0);
  exception when undefined_function then
    v_lecteur := 0;
  end;
  select coalesce(sum(nullif(j.donnees ->> 'cout_eur', '')::numeric), 0) into v_assistant
  from public.journal_opposable j
  where j.client_id = p_client and j.action = 'varelo.assistant.reponse'
    and j.survenu_le >= (date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris');
  begin
    v_plafond := nullif(public.lire_parametre('plafond_ia_jour_client'), '')::numeric;
  exception when others then
    v_plafond := null;
  end;
  v_plafond := coalesce(v_plafond, 5);
  return jsonb_build_object('depense_eur', round(v_lecteur + v_assistant, 4), 'lecteur_eur', round(v_lecteur, 4),
                            'assistant_eur', round(v_assistant, 4), 'plafond_eur', v_plafond,
                            'permis', v_lecteur + v_assistant < v_plafond);
end $function$;

create or replace function public.grp_assistant_budget(p_client uuid)
 returns jsonb language sql stable set search_path to ''
as $function$ select private.grp_assistant_budget(p_client) $function$;

create or replace function private.grp_assistant_noter(p_client uuid, p_personne uuid, p_cout_eur numeric, p_modele text,
                                                       p_fournisseur text, p_entree integer, p_sortie integer)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if p_cout_eur is null or p_cout_eur < 0 then
    raise exception 'Coût illisible.' using errcode = '22023';
  end if;
  perform private.grp_journal(p_client, 'varelo.assistant.reponse', 'clients', p_client::text,
    jsonb_build_object('personne', p_personne, 'cout_eur', round(p_cout_eur, 6), 'modele', left(p_modele, 80),
                       'fournisseur', left(p_fournisseur, 20), 'jetons_entree', p_entree, 'jetons_sortie', p_sortie));
end $function$;

create or replace function public.grp_assistant_noter(p_client uuid, p_personne uuid, p_cout_eur numeric, p_modele text,
                                                      p_fournisseur text, p_entree integer, p_sortie integer)
 returns void language sql set search_path to ''
as $function$ select private.grp_assistant_noter(p_client, p_personne, p_cout_eur, p_modele, p_fournisseur, p_entree, p_sortie) $function$;

revoke execute on function private.grp_client_varelo() from public, anon;
grant execute on function private.grp_client_varelo() to authenticated, service_role;
revoke execute on function public.grp_assistant_client() from public, anon;
grant execute on function public.grp_assistant_client() to authenticated, service_role;

revoke execute on function private.grp_assistant_budget(uuid) from public, anon, authenticated;
revoke execute on function public.grp_assistant_budget(uuid) from public, anon, authenticated;
revoke execute on function private.grp_assistant_noter(uuid, uuid, numeric, text, text, integer, integer) from public, anon, authenticated;
revoke execute on function public.grp_assistant_noter(uuid, uuid, numeric, text, text, integer, integer) from public, anon, authenticated;
grant execute on function private.grp_assistant_budget(uuid) to service_role;
grant execute on function public.grp_assistant_budget(uuid) to service_role;
grant execute on function private.grp_assistant_noter(uuid, uuid, numeric, text, text, integer, integer) to service_role;
grant execute on function public.grp_assistant_noter(uuid, uuid, numeric, text, text, integer, integer) to service_role;


-- ═══ omega/modules/tamila/migrations/b4_19_tamila_pieces_citees.sql @ 3ea2415
-- b4_19 — Tamila : demander le relevé des pièces citées (session B4, 17/10/2026). À poser APRÈS b4_15.
--
-- POURQUOI. Teo a dit oui (17/10) au relevé d'office des pièces que les écritures adverses invoquent ; A1 construit
-- le type tamila.pieces_citees au lecteur. La porte de b4_15 ne connaît que quatre types : elle apprend le cinquième.
-- Format attendu du résultat (proposé à A1) : constats de code piece_citee, données { numero?, intitule, citee_par
-- (adverse | client | juge | expert | tiers), citee_dans (id de la pièce qui la cite), communiquee (booléen : retrouvée
-- parmi les pièces du dossier), piece? (id de la pièce retrouvée) }. L'écran propose de réclamer au confrère, en
-- pièce attendue (b4_18), chaque pièce non communiquée.
--
-- CE QUE ÇA POSE. private.tamila_demander_analyse remplacée : corps de b4_15, la liste des types gagne
-- pieces_citees (200 pièces au plus, comme les autres). Signature, droits et politiques inchangés. Si le socle (19an)
-- tient lui aussi une liste de types, A1 y ajoute tamila.pieces_citees. Rien n'est retiré ni effacé.

create or replace function private.tamila_demander_analyse(p_dossier uuid, p_type text, p_pieces uuid[] default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_type text;
  v_pieces uuid[];
  v_max integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'Une analyse se demande par un avocat du dossier.' using errcode = '42501';
  end if;
  if to_regclass('public.analyses') is null then
    raise exception 'Les analyses ne sont pas encore installées sur cette base.' using errcode = '55000';
  end if;
  v_d := private.tamila_dossier_ecrit(p_dossier, true);
  if p_type is null or p_type not in ('prelecture', 'chronologie', 'contradictions', 'bordereau', 'pieces_citees') then
    raise exception 'Type d''analyse inconnu : %.', coalesce(p_type, 'vide') using errcode = '22023';
  end if;
  v_type := 'tamila.' || p_type;
  if not exists (select 1 from public.tamila_cles k where k.dossier_id = p_dossier and k.statut = 'active' and k.fournisseur = 'scaleway') then
    raise exception 'La clé de ce dossier est sous la phrase du cabinet : le serveur ne peut ni lire ni chiffrer l''analyse. Passez le cabinet au coffre.'
      using errcode = '55000';
  end if;

  if p_pieces is null then
    select coalesce(array_agg(p.id order by p.recue_le), '{}') into v_pieces from public.pieces p
     where p.client_id = v_d.client_id and p.objet_type = 'tamila_dossier' and p.objet_id = p_dossier::text
       and p.chiffrement = 'dossier:v1' and p.statut in ('lue', 'a_verifier');
  else
    if exists (select 1 from unnest(p_pieces) x(id) where not exists (
                 select 1 from public.pieces p where p.id = x.id and p.client_id = v_d.client_id
                    and p.objet_type = 'tamila_dossier' and p.objet_id = p_dossier::text)) then
      raise exception 'Une pièce demandée n''est pas de ce dossier.' using errcode = '22023';
    end if;
    select coalesce(array_agg(distinct x), '{}') into v_pieces from unnest(p_pieces) x;
  end if;
  if cardinality(v_pieces) = 0 then
    raise exception 'Aucune pièce lue dans ce dossier : l''analyse attend que le lecteur ait lu les pièces.' using errcode = '55000';
  end if;
  v_max := case when p_type = 'prelecture' then 60 else 200 end;
  if cardinality(v_pieces) > v_max then
    raise exception 'Au plus % pièces pour ce type d''analyse (% demandées) : choisissez-les.', v_max, cardinality(v_pieces)
      using errcode = '22023';
  end if;

  execute 'select a.id from public.analyses a where a.client_id = $1 and a.module = ''tamila'' and a.objet_type = ''tamila_dossier''
             and a.objet_id = $2 and a.type = $3 and a.statut in (''demandee'', ''en_cours'') order by a.demandee_le desc limit 1'
    into v_id using v_d.client_id, p_dossier::text, v_type;
  if v_id is not null then
    return v_id;
  end if;

  execute 'select private.demander_analyse($1, ''tamila'', ''tamila_dossier'', $2, $3, $4, ''dossier:v1'', $5)'
    into v_id using v_d.client_id, p_dossier::text, v_type, v_pieces, v_uid;
  perform private.journaliser_module(v_d.client_id, 'tamila', 'tamila.analyse.demandee', 'tamila_dossier', p_dossier::text,
    jsonb_build_object('analyse', v_id, 'type', v_type, 'pieces', cardinality(v_pieces), 'par', v_uid));
  return v_id;
end $function$;

revoke execute on function private.tamila_demander_analyse(uuid, text, uuid[]) from public;
grant execute on function private.tamila_demander_analyse(uuid, text, uuid[]) to authenticated;
