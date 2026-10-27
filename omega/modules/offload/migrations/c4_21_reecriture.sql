-- c4_21 — OFFLOAD : la réécriture du message par des règles et des formules écrites (session C4, 19/10/2026)
--
-- Liste de Teo, point 1, tranché par le bureau le 19/10 : « réécriture par règles et modèles écrits, PAS de modèle de
-- langue ». Jusqu'ici une règle du client ne savait que RETENIR un message (c4_10). Elle sait maintenant le RÉÉCRIRE :
--   · « Remplace « remise » par « geste commercial » » : le mot est réécrit dans l'objet et le corps (famille interdit,
--     parametres.remplacement) au lieu de retenir le message ;
--   · « Un ton sobre » / « formel » / « chaleureux » : la formule de politesse écrite correspondante remplace
--     « Bien cordialement, » (famille signature, parametres.ton et formule) ; la signature reste.
-- Le contrôle reste : après réécriture, le message repasse au crible (mot interdit encore présent, tutoiement,
-- longueur) et il est retenu s'il ne passe pas. Les familles gardent leur contrainte (rien n'est retiré du schéma).
-- Le résultat dit quelles règles ont réécrit le message (« reecritures »).
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- L'interprète : la réécriture d'un mot et le ton.
create or replace function private.offload_interpreter_regle(p_texte text)
 returns jsonb
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  t text := lower(btrim(coalesce(p_texte, '')));
  q text := private.offload_entre_guillemets(p_texte);
  v text;
  n integer;
  v_paire text[];
begin
  -- Compte en litige : comprise, mais la donnée vient de CASHD (lien à venir).
  if t ~ 'litige|impay|facture[s]? en retard|retard de paiement' then
    return jsonb_build_object('famille', 'litige', 'parametres', '{}'::jsonb, 'statut', 'appliquee',
      'reponse', 'Compris : un compte en litige ou en retard de paiement chez CASHD est écarté des vagues ; c''est d''ailleurs déjà la règle d''OFFLOAD.');
  end if;
  -- Exclusions : secteur, commercial, groupe.
  if t ~ '(ne (relance|[ée]cri[st]|contacte|sollicite)|jamais|exclu|[ée]carte|pas de (relance|message))' then
    v := coalesce(q, btrim(substring(p_texte from '(?i)secteur\s+(?:du |de la |des |de l''|d'')?([^,.;]+)')));
    if t ~ 'secteur' and v is not null then
      return jsonb_build_object('famille', 'exclusion', 'parametres', jsonb_build_object('type', 'secteur', 'valeur', v), 'statut', 'appliquee',
        'reponse', format('Compris : les comptes du secteur « %s » sont écartés de toutes les vagues.', v));
    end if;
    v := coalesce(q, btrim(substring(p_texte from '(?i)(?:clients|comptes) (?:de|d'')\s*([A-ZÀ-Ý][^,.;]*)')),
                  btrim(substring(p_texte from '(?i)commercia(?:l|le)\s+([^,.;]+)')));
    if t ~ 'commercia|(clients|comptes) (de|d'')\s*[a-zà-ý]' and t !~ 'groupe' and v is not null then
      return jsonb_build_object('famille', 'exclusion', 'parametres', jsonb_build_object('type', 'commercial', 'valeur', v), 'statut', 'appliquee',
        'reponse', format('Compris : les comptes suivis par %s sont écartés des vagues automatiques.', v));
    end if;
    v := coalesce(q, btrim(substring(p_texte from '(?i)groupe\s+([^,.;]+)')));
    if t ~ 'groupe' and v is not null then
      return jsonb_build_object('famille', 'exclusion', 'parametres', jsonb_build_object('type', 'groupe', 'valeur', v), 'statut', 'appliquee',
        'reponse', format('Compris : les comptes du groupe « %s » sont écartés de toutes les vagues.', v));
    end if;
  end if;
  -- Réécriture : « remplace « X » par « Y » », « dis « Y » plutôt que (au lieu de) « X » » (c4_21).
  if t ~ '(remplace|plut[ôo]t que|au lieu de)' then
    select array_agg(m[1] order by o) into v_paire
    from regexp_matches(p_texte, '[«"]\s*([^»"]{1,60}?)\s*[»"]', 'g') with ordinality as x(m, o);
    if coalesce(array_length(v_paire, 1), 0) = 2 then
      if t ~ 'remplace' then
        v := v_paire[1]; q := v_paire[2];
      else
        v := v_paire[2]; q := v_paire[1];
      end if;
      return jsonb_build_object('famille', 'interdit', 'parametres', jsonb_build_object('mot', v, 'remplacement', q), 'statut', 'appliquee',
        'reponse', format('Compris : « %s » est remplacé par « %s » dans chaque message. Si le mot restait, le message serait retenu.', v, q));
    end if;
  end if;
  -- Ton : la formule de politesse écrite qui lui correspond (c4_21).
  if t ~ '(\mton\M|style|registre)' and t ~ '(sobre|neutre|formel|soutenu|chaleureux|amical|cordial)' then
    v := case when t ~ '(formel|soutenu)' then 'formel' when t ~ '(chaleureux|amical|cordial)' then 'chaleureux' else 'sobre' end;
    return jsonb_build_object('famille', 'signature',
      'parametres', jsonb_build_object('ton', v, 'formule',
        case v when 'formel' then 'Je vous prie d''agréer, Madame, Monsieur, l''expression de mes salutations distinguées.'
               when 'chaleureux' then 'Bien cordialement, et au plaisir de vous lire,'
               else 'Cordialement,' end),
      'statut', 'appliquee',
      'reponse', format('Compris : un ton %s ; chaque message se termine par « %s ».', v,
        case v when 'formel' then 'Je vous prie d''agréer, Madame, Monsieur, l''expression de mes salutations distinguées.'
               when 'chaleureux' then 'Bien cordialement, et au plaisir de vous lire,' else 'Cordialement,' end));
  end if;
  -- Tutoiement.
  if t ~ 'tutoi|vouvoi' then
    return jsonb_build_object('famille', 'tutoiement', 'parametres', '{}'::jsonb, 'statut', 'appliquee',
      'reponse', 'Compris : toujours le vouvoiement. Un message qui tutoierait serait retenu.');
  end if;
  -- Montants et prix.
  if t ~ '(montant|prix|tarif|somme|chiffre)' and t ~ '(jamais|aucun|pas de|sans|ne .* pas|n''.* pas)' then
    return jsonb_build_object('famille', 'montant', 'parametres', '{}'::jsonb, 'statut', 'appliquee',
      'reponse', 'Compris : aucun montant dans les messages. Le montant de la dernière commande est retiré du texte.');
  end if;
  -- Longueur.
  n := substring(t from '(\d{1,4})\s*mots')::integer;
  if n is not null and t ~ '(plus de|au plus|maximum|max|moins de|pas plus|ne d[ée]passe)' then
    return jsonb_build_object('famille', 'longueur', 'parametres', jsonb_build_object('mots', n), 'statut', 'appliquee',
      'reponse', format('Compris : %s mots au plus. Un message plus long est retenu.', n));
  end if;
  -- Formule d'appel.
  if q is not null and t ~ '(commence|ouvre|d[ée]bute|formule d''appel|salue|salutation)' then
    return jsonb_build_object('famille', 'salutation', 'parametres', jsonb_build_object('texte', q), 'statut', 'appliquee',
      'reponse', format('Compris : chaque message commence par « %s ».', q));
  end if;
  -- Signature.
  if q is not null and t ~ '(sign)' then
    return jsonb_build_object('famille', 'signature', 'parametres', jsonb_build_object('texte', q), 'statut', 'appliquee',
      'reponse', format('Compris : chaque message est signé « %s ».', q));
  end if;
  -- Mot ou sujet interdit : « n'utilise jamais le mot X », « ne parle jamais de X », « ne propose aucune X ».
  v := coalesce(q,
                btrim(substring(t from '(?:le mot|l''expression|le terme)\s+([^,.;]+)')),
                btrim(substring(t from '(?:ne parle|ne mentionne|n''[ée]voque)\s+(?:jamais|pas)\s+(?:de |d''|du |des |de la )?([^,.;]+)')),
                btrim(substring(t from '(?:ne propose|n''offre|ne promets?)\s+(?:jamais|aucune?|pas)\s+(?:de |d''|une? )?([^,.;]+)')),
                btrim(substring(t from '(?:aucune?|jamais de|pas de)\s+([a-zà-ÿ'' -]{3,40})\s+dans')));
  if v is not null and t ~ '(jamais|aucun|pas|interdi|sans)' then
    v := regexp_replace(v, '\s+(dans|aux|à|pour)\s.*$', '');
    v := regexp_replace(v, '^(les?|la|l''|des?|du|une?)\s+', '');
    v := regexp_replace(v, 's$', '');
    if char_length(v) between 2 and 60 then
      return jsonb_build_object('famille', 'interdit', 'parametres', jsonb_build_object('mot', v), 'statut', 'appliquee',
        'reponse', format('Compris : « %s » n''apparaît dans aucun message. Un message qui le contiendrait serait retenu.', v));
    end if;
  end if;
  return jsonb_build_object('famille', 'inconnue', 'parametres', '{}'::jsonb, 'statut', 'non_comprise',
    'reponse', 'Je n''ai pas compris cette règle, elle n''est donc pas appliquée. Reformulez-la, par exemple : « N''utilise jamais le mot remise », « Pas plus de 120 mots », « Commence par « Madame, Monsieur, » », « Ne relance jamais le secteur BTP ».');
end $function$;

-- L'application : réécrire, puis contrôler.
create or replace function private.offload_regles_appliquer(p_client uuid, p_message jsonb)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_regles;
  v_sujet text := p_message ->> 'sujet';
  v_corps text := p_message ->> 'corps';
  v_ids uuid[] := '{}';
  v_mot text;
  v_motif text;
  v_reecrites uuid[] := '{}';
begin
  -- Réécriture d'abord : les mots à remplacer (c4_21).
  for r in select * from public.offload_regles g where g.client_id = p_client and g.retiree_le is null and g.statut = 'appliquee'
           and g.famille = 'interdit' and g.parametres ? 'remplacement' order by g.cree_le loop
    v_motif := '(^|[^[:alnum:]])' || regexp_replace(r.parametres ->> 'mot', '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || '(s?)(?=[^[:alnum:]]|$)';
    v_sujet := regexp_replace(v_sujet, v_motif, '\1' || replace(r.parametres ->> 'remplacement', '\', '\\') || '\2', 'gi');
    v_corps := regexp_replace(v_corps, v_motif, '\1' || replace(r.parametres ->> 'remplacement', '\', '\\') || '\2', 'gi');
    v_reecrites := v_reecrites || r.id;
  end loop;
  -- Les formules (la formule de politesse du ton passe après la signature, qui s'accroche à « Bien cordialement, »).
  for r in select * from public.offload_regles g where g.client_id = p_client and g.retiree_le is null and g.statut = 'appliquee'
           and g.famille in ('montant', 'salutation', 'signature') order by (g.parametres ? 'formule'), g.cree_le loop
    if r.famille = 'signature' and r.parametres ? 'formule' then
      v_corps := regexp_replace(v_corps, '(^|\n)Bien cordialement,\n', '\1' || replace(r.parametres ->> 'formule', '\', '\\') || E'\n');
      v_reecrites := v_reecrites || r.id;
      v_ids := v_ids || r.id;
      continue;
    end if;
    if r.famille = 'montant' then
      v_corps := regexp_replace(v_corps, ',?\s*-?\d[\d   .]*(,\d{1,2})?\s?€(\s?(HT|TTC))?', '', 'g');
      v_sujet := regexp_replace(v_sujet, ',?\s*-?\d[\d   .]*(,\d{1,2})?\s?€(\s?(HT|TTC))?', '', 'g');
    elsif r.famille = 'salutation' then
      v_corps := regexp_replace(v_corps, '^Bonjour[^\n]*', r.parametres ->> 'texte');
    elsif r.famille = 'signature' then
      v_corps := regexp_replace(v_corps, '(Bien cordialement,\n)[^\n]*', '\1' || replace(r.parametres ->> 'texte', '\', '\\'));
    end if;
    v_ids := v_ids || r.id;
  end loop;
  -- Le contrôle : le message réécrit repasse au crible.
  for r in select * from public.offload_regles g where g.client_id = p_client and g.retiree_le is null and g.statut = 'appliquee'
           and g.famille in ('interdit', 'tutoiement', 'longueur') order by g.cree_le loop
    v_ids := v_ids || r.id;
    if r.famille = 'interdit' then
      v_mot := private.offload_plat(r.parametres ->> 'mot');
      if private.offload_plat(coalesce(v_sujet, '') || ' ' || coalesce(v_corps, '')) ~ ('(^|[^a-z])' || regexp_replace(v_mot, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || 's?([^a-z]|$)') then
        return jsonb_build_object('sujet', v_sujet, 'corps', v_corps, 'retenu', r.texte, 'regles', to_jsonb(v_ids), 'reecritures', to_jsonb(v_reecrites));
      end if;
    elsif r.famille = 'tutoiement' then
      if lower(split_part(v_corps, 'Si vous ne souhaitez plus', 1)) ~ '(^|[^a-zà-ÿ''])(tu|toi|ton|ta|tes|t''es)([^a-zà-ÿ]|$)' then
        return jsonb_build_object('sujet', v_sujet, 'corps', v_corps, 'retenu', r.texte, 'regles', to_jsonb(v_ids), 'reecritures', to_jsonb(v_reecrites));
      end if;
    elsif r.famille = 'longueur' then
      if array_length(regexp_split_to_array(btrim(split_part(v_corps, 'Si vous ne souhaitez plus', 1)), '\s+'), 1) > (r.parametres ->> 'mots')::integer then
        return jsonb_build_object('sujet', v_sujet, 'corps', v_corps, 'retenu', r.texte, 'regles', to_jsonb(v_ids), 'reecritures', to_jsonb(v_reecrites));
      end if;
    end if;
  end loop;
  return jsonb_build_object('sujet', v_sujet, 'corps', v_corps, 'retenu', null, 'regles', to_jsonb(v_ids), 'reecritures', to_jsonb(v_reecrites));
end $function$;

revoke execute on function private.offload_interpreter_regle(text) from public, anon, authenticated;
grant execute on function private.offload_interpreter_regle(text) to service_role;
revoke execute on function private.offload_regles_appliquer(uuid, jsonb) from public, anon, authenticated;
grant execute on function private.offload_regles_appliquer(uuid, jsonb) to service_role;
