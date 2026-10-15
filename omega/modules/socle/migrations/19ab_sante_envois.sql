-- 19ab_sante_envois — socle : la santé des envois (trou commun n° 7, relevé par B3 ; avis d'A2, NOTES-A2 fa62599).
-- Coordinateur, 06/10/2026. Pose : recette ygwbgpowzlbdaajlsqkn, puis production.
--
-- Le socle portait déjà la règle : private.fournisseurs_envoi.agree_sante (ce qu'A2 nomme « hds »),
-- private.canaux_envoi.permis_sante (« sante_autorise »), et le verrou SANTE_HORS_CANAL_AGREE de verrous_envoi,
-- rejoué par envoi_valide (passage à « pret ») puis par commencer_envoi (avant de rendre l'envoi à l'ouvrier).
-- Prouvé par le test B3-08 : courriel nominatif → bloque/SANTE_HORS_CANAL_AGREE ; SMS en contexte de santé → CANAL_NON_PERMIS.
--
-- Ce lot comble les deux trous restants :
--   1. verrous_envoi : un envoi donnees_sante = true ne passe jamais par un canal non permis en santé (SMS), même quand
--      le module n'est pas un contexte de santé (jusqu'ici seul le fournisseur l'arrêtait) ;
--   2. commencer_envoi : la réponse rendue à l'ouvrier porte donnees_sante et fournisseur_hds (= agree_sante du
--      fournisseur), en mode essai comme en réel : l'expéditeur d'A2 (29ef6e6) refuse définitivement
--      SANTE_FOURNISSEUR_NON_HDS si un envoi de santé lui parvenait quand même vers un fournisseur non agréé.
--
-- Aucun fournisseur n'est agréé (brevo, brevo_sms, manuel compris) : décision de Teo sur preuve de certification HDS
--   (update private.fournisseurs_envoi set agree_sante = true where fournisseur = '…'). Pas de DROP, pas de nouvelle
-- fonction. Les corps sont réécrits à partir de la définition en base : chaque repère doit s'y trouver le nombre de
-- fois attendu, sinon le lot s'arrête sans rien changer (create or replace garde les droits existants).
-- Pas de DROP, pas de fonction d'aide : l'outil de pose demande une confirmation sur tout DROP et n'aboutit jamais.

do $lot$
declare
  d text;
  rep text;
  par text;
begin
  -- 1. verrous_envoi : le canal refuse un contenu de santé, pas seulement un contexte de santé.
  select pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure) into d;
  rep := 'if not v_canal.permis_sante and ((r ->> ''sante'')::boolean or coalesce(v_module.sante, false)) then';
  par := 'if not v_canal.permis_sante and (p_e.donnees_sante or (r ->> ''sante'')::boolean or coalesce(v_module.sante, false)) then';
  if (length(d) - length(replace(d, rep, ''))) / length(rep) <> 1 then
    raise exception 'Lot 19ab, verrous_envoi : repère absent ou multiple : %', left(rep, 80);
  end if;
  d := replace(d, rep, par);
  execute d;

  -- 2. commencer_envoi : donnees_sante et fournisseur_hds dans la réponse (essai et réel).
  select pg_get_functiondef('private.commencer_envoi(uuid)'::regprocedure) into d;
  rep := '  v_essai_adresse text;' || chr(10) || 'begin';
  par := '  v_essai_adresse text;' || chr(10) || '  v_hds boolean;' || chr(10) || 'begin';
  if (length(d) - length(replace(d, rep, ''))) / length(rep) <> 1 then
    raise exception 'Lot 19ab, commencer_envoi : repère absent ou multiple : %', left(rep, 80);
  end if;
  d := replace(d, rep, par);
  rep := '  select * into v_canal from private.canaux_envoi c where c.canal = e.canal;';
  par := '  v_hds := coalesce((select f.agree_sante from private.fournisseurs_envoi f where f.fournisseur = e.fournisseur), false);' || chr(10) || rep;
  if (length(d) - length(replace(d, rep, ''))) / length(rep) <> 1 then
    raise exception 'Lot 19ab, commencer_envoi : repère absent ou multiple : %', left(rep, 80);
  end if;
  d := replace(d, rep, par);
  rep := '''fournisseur'', e.fournisseur,';
  par := '''fournisseur'', e.fournisseur, ''donnees_sante'', e.donnees_sante, ''fournisseur_hds'', v_hds,';
  if (length(d) - length(replace(d, rep, ''))) / length(rep) <> 2 then
    raise exception 'Lot 19ab, commencer_envoi : repère attendu deux fois (essai et réel) : %', left(rep, 80);
  end if;
  d := replace(d, rep, par);
  execute d;
end $lot$;
