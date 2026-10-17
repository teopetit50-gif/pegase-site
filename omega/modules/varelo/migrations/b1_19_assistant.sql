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
