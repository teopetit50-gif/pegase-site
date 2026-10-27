-- c4_11 — OFFLOAD : un compte en litige ou en retard de paiement sort de la vague commerciale (session C4, 15/10/2026)
--
-- CE QUE ÇA POSE (promesses de /offres/nouvelles-affaires, lues au chiffrage omega/CHIFFRAGE/offload.md, n° 19 et 69) :
--   · « Jamais un compte en litige » et « Le compte a une facture en retard chez vous : il sort de la vague de relance
--     commerciale, parce qu'une relance d'impayé et une relance commerciale ne se croisent jamais. Le recouvrement
--     relève de CASHD, pas d'ici. »
--   · private.offload_impaye(compte) lit CASHD (même organisation, même code client) : compte CASHD en litige ou en
--     recouvrement, facture en litige, ou facture échue non réglée (cashd_factures_etat.retard_jours > 0). Il rend la
--     raison en une phrase, ou null. Sans CASHD posé, il rend null : la lecture est dynamique, OFFLOAD ne dépend pas
--     de CASHD pour se poser.
--   · offload_ecarte l'applique avant toute sollicitation commerciale (reprises, échéances). Le rappel de retrait d'une
--     affaire n'est pas une relance commerciale et ne parle jamais de paiement : il n'est pas écarté.
--   · La règle écrite « Ne relance jamais un compte en litige » (c4_10) devient applicable : sa réponse le dit.
--
-- Règles de pose : create or replace, update ciblé ; aucun DROP, aucun DELETE.

create or replace function private.offload_impaye(p_compte uuid)
 returns text
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v text;
begin
  if to_regclass('public.cashd_comptes') is null or to_regclass('public.cashd_factures_etat') is null then
    return null;
  end if;
  select * into c from public.offload_comptes where id = p_compte;
  if c.id is null or nullif(btrim(c.ref), '') is null then
    return null;
  end if;
  execute $q$
    select coalesce(
      (select format('compte %s chez CASHD%s', case k.statut when 'litige' then 'en litige' else 'en recouvrement' end,
                     coalesce(' (' || k.statut_motif || ')', ''))
       from public.cashd_comptes k
       where k.client_id = $1 and lower(btrim(k.reference)) = lower(btrim($2)) and k.statut in ('litige', 'recouvrement')
       limit 1),
      (select format('facture %s en litige chez CASHD', f.numero)
       from public.cashd_factures_etat f join public.cashd_comptes k on k.id = f.compte_id
       where k.client_id = $1 and lower(btrim(k.reference)) = lower(btrim($2)) and f.statut = 'litige'
       order by f.date_emission limit 1),
      (select format('facture %s échue depuis %s jour%s chez CASHD', f.numero, f.retard_jours, case when f.retard_jours > 1 then 's' else '' end)
       from public.cashd_factures_etat f join public.cashd_comptes k on k.id = f.compte_id
       where k.client_id = $1 and lower(btrim(k.reference)) = lower(btrim($2)) and f.retard_jours > 0
       order by f.retard_jours desc limit 1))
  $q$ into v using c.client_id, c.ref;
  return v;
end $function$;

-- Les règles « litige » déjà écrites deviennent applicables.
update public.offload_regles
   set statut = 'appliquee',
       reponse = 'Compris : un compte en litige ou en retard de paiement chez CASHD est écarté des vagues ; c''est d''ailleurs déjà la règle d''OFFLOAD.'
 where famille = 'litige' and statut = 'en_attente';



-- Un compte en litige ou en retard de paiement chez CASHD est écarté de toute sollicitation commerciale.
create or replace function private.offload_ecarte(p_compte uuid)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  x public.offload_exclusions;
  v_contact public.offload_contacts;
  v_autre text;
  v_impaye text;
begin
  select * into c from public.offload_comptes where id = p_compte;
  select * into g from public.offload_reglages where client_id = c.client_id;
  if c.fusionne_dans is not null then
    return 'Fiche fusionnée dans une autre.';
  end if;
  if c.verification is not null then
    return 'À vérifier : ' || coalesce(c.verification_motif, 'le compte attend une vérification') || '';
  end if;
  v_impaye := private.offload_impaye(c.id);
  if v_impaye is not null then
    return format('Impayé : %s. Une relance commerciale et une relance d''impayé ne se croisent jamais.', v_impaye);
  end if;
  if c.statut = 'exclu' then
    return 'Suivi en direct par un commercial' || coalesce(' : ' || c.statut_motif, '') || '.';
  end if;
  if c.statut = 'arrete' then
    return 'Retiré à sa demande.';
  end if;
  select * into x from public.offload_exclusions e
  where e.client_id = c.client_id and e.levee_le is null
    and ((e.type = 'compte' and (e.valeur = c.id::text or lower(e.valeur) = lower(c.ref)))
      or (e.type = 'secteur' and lower(e.valeur) = lower(c.secteur))
      or (e.type = 'commercial' and lower(e.valeur) = lower(c.commercial))
      or (e.type = 'groupe' and lower(e.valeur) = lower(c.groupe)))
  order by e.cree_le limit 1;
  if x.id is not null then
    return format('Exclu par la liste (%s « %s ») : %s', case x.type when 'compte' then 'compte' when 'secteur' then 'secteur'
                                                               when 'commercial' then 'commercial' else 'groupe' end, x.valeur, x.motif);
  end if;
  select * into v_contact from public.offload_contacts k
  where k.compte_id = c.id and k.le > (now() at time zone 'Europe/Paris')::date - g.quarantaine_jours
  order by k.le desc limit 1;
  if v_contact.id is not null then
    return format('Déjà contacté le %s%s : écarté de la vague en cours.', private.offload_le(v_contact.le), coalesce(' par ' || v_contact.par, ''));
  end if;
  if nullif(btrim(c.groupe), '') is not null then
    select k.nom into v_autre from public.offload_reprises p join public.offload_comptes k on k.id = p.compte_id
    where p.client_id = c.client_id and k.id <> c.id and lower(btrim(k.groupe)) = lower(btrim(c.groupe))
      and (p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
           or coalesce(p.close_le, p.repondu_le, p.cree_le) > now() - make_interval(days => g.quarantaine_jours))
    limit 1;
    if v_autre is not null then
      return format('Le groupe « %s » est déjà sollicité (par %s) : le plafond vaut pour le groupe.', c.groupe, v_autre);
    end if;
  end if;
  return null;
end $function$;

-- La règle « litige » est désormais applicable.
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

-- Droits : fonctions privées, au service seulement.
revoke execute on function private.offload_impaye(uuid) from public, anon, authenticated;
grant execute on function private.offload_impaye(uuid) to service_role;
revoke execute on function private.offload_ecarte(uuid) from public, anon, authenticated;
grant execute on function private.offload_ecarte(uuid) to service_role;
revoke execute on function private.offload_interpreter_regle(text) from public, anon, authenticated;
grant execute on function private.offload_interpreter_regle(text) to service_role;
