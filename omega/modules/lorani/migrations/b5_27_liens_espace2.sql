-- LORANI, lot B5-27 — les liens des alertes, du point du matin et des courriels mènent au nouvel espace (11/10/2026).
--
-- Pourquoi : consigne de Teo relayée par le coordinateur (11/10) — le tableau de bord client prend le dessin de
-- omegaai.fr/omega, dans /espace2 ; aucun lien vers l'ancien dessin (/espace sans le 2). /espace2/lorani rend le même
-- écran (components/espace/lorani/EcranLorani.tsx), qui ouvre le dossier visé par ?permis=<id> ou ?projet=<id>.
--
-- Ce qui change (corps de b5_02 et de b5_11, seul le chemin change) :
--   · private.lorani_lien_permis(permis) → /espace2/lorani?permis=<id> ;
--   · private.lorani_lien_projet(projet) → /espace2/lorani?projet=<id> ;
--   · private.lorani_rattacher_reception(reception) : l'alerte « courriel du guichet à ranger » mène à /espace2/lorani ;
--   · private.lorani_alerter_rappel (corps de b5_03) : le lien du courriel de rappel est la racine du paramètre
--     espace_url (sans son « /espace » ni « /espace2 ») suivie de lorani_lien_permis — https://…/espace2/lorani?permis=.
-- Toutes les alertes, lignes du point du matin et courriels de Lorani passent par ces deux fonctions. Les alertes déjà
-- levées gardent leur ancien lien (/espace/lorani, qui répond toujours). Idempotent (create or replace).

create or replace function private.lorani_lien_permis(p_permis uuid)
returns text language sql immutable set search_path to '' as $$
  select '/espace2/lorani?permis=' || p_permis::text
$$;

create or replace function private.lorani_lien_projet(p_projet uuid)
returns text language sql immutable set search_path to '' as $$
  select '/espace2/lorani?projet=' || p_projet::text
$$;

CREATE OR REPLACE FUNCTION private.lorani_rattacher_reception(p_reception bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r public.receptions;
  v_texte text;
  v_numeros text[];
  v_projets uuid[];
  pr public.lorani_projets;
  v_permis text;
  e jsonb;
  v_nom text;
  v_mime text;
  v_sha text;
  v_id uuid;
  v_pieces jsonb := '[]'::jsonb;
  n_jointes integer := 0;
  v_lorani boolean;
begin
  select * into r from public.receptions where id = p_reception;
  if not found then
    return jsonb_build_object('ignore', 'réception absente');
  end if;
  v_lorani := r.module = 'lorani';

  v_texte := concat_ws(E'\n', r.sujet, r.corps,
                       regexp_replace(regexp_replace(coalesce(r.corps_html, ''), '<(br|/p|/div|/td|/tr)[^>]*>', E'\n', 'gi'), '<[^>]+>', ' ', 'g'),
                       (select string_agg(x ->> 'nom', E'\n') from jsonb_array_elements(r.pieces) x));
  v_numeros := private.lorani_numeros_cites(v_texte);

  select coalesce(array_agg(distinct x.projet_id), '{}'::uuid[]) into v_projets
  from public.lorani_permis x
  where x.client_id = r.client_id and x.actif and x.numero is not null
    and private.lorani_numero_dossier(x.numero) = any (v_numeros);

  if cardinality(v_projets) <> 1 then
    if not v_lorani then
      return jsonb_build_object('reception', r.id, 'module', r.module, 'ignore', case when cardinality(v_numeros) = 0 then 'aucun numéro d''autorisation cité'
                                               else 'numéros sans dossier Lorani' end, 'numeros', to_jsonb(v_numeros));
    end if;
    perform private.lever_alerte_module(r.client_id, 'lorani', 'attention',
      left(format('Courriel du guichet à ranger : « %s » (%s).', left(coalesce(nullif(btrim(r.sujet), ''), 'sans objet'), 90),
                  case when cardinality(v_projets) > 1 then 'il cite plusieurs dossiers'
                       when cardinality(v_numeros) > 0 then 'numéro ' || v_numeros[1] || ' sans permis connu'
                       else 'aucun numéro de dossier' end), 200),
      jsonb_build_object('reception', r.id, 'de', r.de_adresse, 'numeros', to_jsonb(v_numeros), 'lien', '/espace2/lorani'),
      'courriel:' || r.id, true, null);
    return jsonb_build_object('reception', r.id, 'range', false, 'numeros', to_jsonb(v_numeros), 'dossiers', cardinality(v_projets));
  end if;

  select * into pr from public.lorani_projets where id = v_projets[1];
  select string_agg(x.numero, ', ' order by x.cree_le) into v_permis
  from public.lorani_permis x
  where x.client_id = r.client_id and x.projet_id = pr.id and x.actif
    and private.lorani_numero_dossier(x.numero) = any (v_numeros);

  for e in select x from jsonb_array_elements(r.pieces) x loop
    v_nom := left(coalesce(nullif(btrim(e ->> 'nom'), ''), 'piece-jointe'), 255);
    v_mime := lower(coalesce(nullif(e ->> 'mime', ''),
                             case when v_nom ~* '\.pdf$' then 'application/pdf'
                                  when v_nom ~* '\.png$' then 'image/png'
                                  when v_nom ~* '\.jpe?g$' then 'image/jpeg' end, ''));
    continue when v_mime not in ('application/pdf', 'image/png', 'image/jpeg') or coalesce(e ->> 'chemin', '') = '';
    n_jointes := n_jointes + 1;
    v_sha := case when lower(coalesce(e ->> 'sha256', '')) ~ '^[0-9a-f]{64}$' then lower(e ->> 'sha256')
                  else encode(sha256(convert_to(e ->> 'chemin', 'UTF8')), 'hex') end;
    v_id := null;
    insert into public.pieces (client_id, module, objet_type, objet_id, source, depose_par, nom_fichier, mime, octets, sha256,
                               chemin, statut)
    values (r.client_id, 'lorani', 'lorani_projet', pr.id::text, 'courriel', null, v_nom, v_mime,
            greatest(coalesce((e ->> 'taille')::bigint, 0), 0), v_sha, e ->> 'chemin', 'recue')
    on conflict on constraint pieces_une_fois do nothing
    returning id into v_id;
    if v_id is not null then
      v_pieces := v_pieces || to_jsonb(v_id);
    end if;
  end loop;

  if n_jointes = 0 then
    perform private.lever_alerte_module(r.client_id, 'lorani', 'attention',
      left(format('« %s » (%s) : courriel du guichet sans pièce jointe, à lire : « %s ».', left(pr.nom, 60), v_permis,
                  left(coalesce(nullif(btrim(r.sujet), ''), 'sans objet'), 80)), 200),
      jsonb_build_object('projet', pr.id, 'reception', r.id, 'de', r.de_adresse, 'lien', private.lorani_lien_projet(pr.id)),
      'courriel:' || r.id, true, private.lorani_chef_de_projet(r.client_id, pr.id));
  end if;

  if jsonb_array_length(v_pieces) > 0 or n_jointes = 0 then
    perform private.journaliser_module(r.client_id, 'lorani', 'lorani.courriel_rattache', 'lorani_projet', pr.id::text,
      jsonb_build_object('reception', r.id, 'sujet', left(r.sujet, 200), 'de', r.de_adresse, 'numeros', to_jsonb(v_numeros),
                         'pieces', v_pieces),
      pr.entite_id);
  end if;
  if (v_lorani or r.module is null) and r.statut = 'nouvelle' then
    update public.receptions set statut = 'traitee' where id = r.id;
  end if;
  return jsonb_build_object('reception', r.id, 'range', true, 'projet', pr.id, 'numeros', to_jsonb(v_numeros),
                            'pieces', v_pieces, 'jointes', n_jointes);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_rattacher_reception(bigint) FROM PUBLIC;

-- Le passage des lectures (corps du socle) prend aussi les courriels.

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
