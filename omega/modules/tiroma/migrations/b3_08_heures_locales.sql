-- b3_08 — Les heures d'un export sont celles du cabinet, pas celles du serveur.
--
-- CE QUE ÇA CORRIGE : private.tiroma_v_instant(p, p_cle, p_fuseau) lit « 2026-10-07 09:00 » (un rendez-vous à 9 h dans
-- l'agenda de Logos_w, sans fuseau) par un simple ::timestamptz : la valeur est alors prise dans le fuseau de la
-- session (UTC sur Supabase), et 9 h à Pointe-à-Pitre devient 5 h. Le fuseau du cabinet, pourtant passé à la
-- fonction, ne servait qu'aux dates sans heure. Conséquence : rendez-vous décalés de quatre heures en Guadeloupe (deux
-- à Paris), créneaux à sauver faux, occupation fausse, « 7 h » du point du matin faux.
--
-- CE QUE ÇA POSE : la même fonction, où une date-heure SANS indication de fuseau est lue dans le fuseau du cabinet ;
-- une date-heure qui porte son fuseau (« …+02:00 », « …Z ») est lue telle quelle. Idempotent.

create or replace function private.tiroma_v_instant(p jsonb, p_cle text, p_fuseau text)
 returns timestamp with time zone
 language sql
 stable
 set search_path to ''
as $function$
  select case
    when private.tiroma_v(p, p_cle) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}(:[0-9]{2}(\.[0-9]+)?)?\s*([zZ]|[+-][0-9]{2}(:?[0-9]{2})?)$'
      then private.tiroma_v(p, p_cle)::timestamptz
    when private.tiroma_v(p, p_cle) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}[T ][0-9]{2}:[0-9]{2}'
      then (left(private.tiroma_v(p, p_cle), 19)::timestamp) at time zone coalesce(p_fuseau, 'UTC')
    when private.tiroma_v(p, p_cle) ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      then (private.tiroma_v(p, p_cle)::date::timestamp) at time zone coalesce(p_fuseau, 'UTC')
  end
$function$;
