-- LORANI, lot B5-03 — le rappel d'une échéance du permis part au chef de projet, en plus de l'alerte.
--
-- Ce que ça corrige : la page des architectes promet des rappels ; le socle (lorani_alerter_rappel) ne levait qu'une
-- alerte, que seul le point du matin remet le lendemain. Un rappel « pièces manquantes à faire recevoir avant le … »
-- à J-10, J-3 et J doit partir le jour même. Désormais, après l'alerte, le module prépare un ENVOI par courriel au
-- chef de projet (private.preparer_envoi : clé d'idempotence = la clé de l'alerte, transactionnel, échéance = la
-- date butoir). Comme tout envoi d'un moteur, il passe par la file de validation (envoi.email) sauf accord permanent
-- de l'organisation ; en mode essai il part vers l'adresse d'essai. Sans chef de projet, pas d'envoi : l'alerte reste.
-- Un échec de préparation ne casse jamais le rappel : il est consigné en alerte interne et le passage continue.
-- Le corps de la fonction est celui du socle photographié le 05/10/2026, le lien va vers /espace/lorani (b5_02).
-- Migration idempotente (create or replace).

CREATE OR REPLACE FUNCTION private.lorani_alerter_rappel(p public.lorani_permis, p_projet public.lorani_projets, p_nature text, p_rappel integer, p_echeance date, p_calcul jsonb)
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
        v_corps || E'\n\nOuvrir le dossier : ' || coalesce(public.lire_parametre('espace_url'), 'https://app.omegaai.fr/espace') || '/lorani?permis=' || p.id::text,
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
