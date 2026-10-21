-- c3_30 — REPUT, correctif TREPUT-07 (série 1, relevé par le coordinateur) : l'export à date fixe (session C3, 21/10/2026)
--
--   · « Délai de réponse (min) » valait 1 pour une demande jamais répondue (greatest(1, null) = 1 : greatest ignore le nul) ;
--     sans envoyee_le, la cellule reste vide ;
--   · les heures et la période étaient converties en dur à « Europe/Paris » : pour une entreprise en Guadeloupe ou en
--     Martinique, heures et bornes étaient fausses. Désormais, le fuseau de l'entité (entites.fuseau, sinon l'entité
--     principale, private.reput_fuseau de c3_21) : chaque ligne à l'heure de son site, la période et « le jour dit » au
--     fuseau du programme.
-- Reprises de c3_19 : private.reput_fabriquer_export, private.reput_exports_du_jour. Règles de pose : create or replace.

create or replace function private.reput_fabriquer_export(p_programme uuid, p_du date, p_au date)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.reput_exports_programmes;
  v_csv text;
  v_n integer;
  v_id uuid;
  v_fz text;
begin
  select * into p from public.reput_exports_programmes x where x.id = p_programme;
  if p.id is null then return null; end if;
  v_fz := private.reput_fuseau(p.client_id, p.entite_id);   -- c3_30 : la période au fuseau du programme
  select count(*)::int,
         string_agg(concat_ws(';',
           private.reput_csv(to_char(d.recu_le at time zone private.reput_fuseau(d.client_id, d.entite_id), 'DD/MM/YYYY HH24:MI')),
           private.reput_csv(d.canal),
           private.reput_csv(coalesce(d.de_nom, d.adresse_reponse, '')),
           private.reput_csv(coalesce(s.libelle, d.sujet, '')),
           private.reput_csv(coalesce(d.langue, '')),
           case when d.urgence then 'oui' else 'non' end,
           case when d.couverte is null then '' when d.couverte then 'oui' else 'non' end,
           private.reput_csv(d.statut),
           private.reput_csv(coalesce(to_char(d.envoyee_le at time zone private.reput_fuseau(d.client_id, d.entite_id), 'DD/MM/YYYY HH24:MI'), '')),
           case when d.envoyee_le is null then '' else greatest(1, round(extract(epoch from (d.envoyee_le - d.recu_le)) / 60))::text end,
           case when d.escaladee_le is not null then 'oui' else 'non' end,
           private.reput_csv(coalesce(e.nom, ''))), E'\r\n' order by d.recu_le, d.id)
    into v_n, v_csv
  from public.reput_demandes d
  left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
  left join public.entites e on e.client_id = d.client_id and e.id = d.entite_id
  where d.client_id = p.client_id and (p.entite_id is null or d.entite_id = p.entite_id)
    and (d.recu_le at time zone v_fz)::date between p_du and p_au;
  v_csv := chr(65279) || 'Reçue le;Canal;Client;Sujet;Langue;Urgente;Tirée de la base;Statut;Répondue le;Délai de réponse (min);'
           || 'Délai de traitement dépassé;Site' || case when v_n > 0 then E'\r\n' || v_csv else '' end;
  insert into public.reput_exports (client_id, entite_id, programme_id, periode_du, periode_au, lignes, nom_fichier, contenu)
  values (p.client_id, p.entite_id, p.id, p_du, p_au, v_n,
          'reput-demandes-' || to_char(p_du, 'YYYY-MM-DD') || '-au-' || to_char(p_au, 'YYYY-MM-DD') || '.csv', v_csv)
  on conflict (programme_id, periode_du) do nothing
  returning id into v_id;
  return v_id;
end $function$;

create or replace function private.reput_exports_du_jour(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jour date;
  p public.reput_exports_programmes;
  v_du date;
  v_au date;
  v_export uuid;
  v_lignes integer;
  m uuid;
  n integer := 0;
begin
  for p in
    select * from public.reput_exports_programmes x
    where x.actif and ((x.frequence = 'hebdomadaire'
                        and extract(isodow from (p_maintenant at time zone private.reput_fuseau(x.client_id, x.entite_id))::date) = x.jour)
                       or (x.frequence = 'mensuel'
                           and extract(day from (p_maintenant at time zone private.reput_fuseau(x.client_id, x.entite_id))::date) = x.jour))
    order by x.client_id, x.id
  loop
    -- c3_30 : « le jour dit » au fuseau du programme (site, sinon organisation), non plus en dur à Paris.
    v_jour := (p_maintenant at time zone private.reput_fuseau(p.client_id, p.entite_id))::date;
    if p.frequence = 'hebdomadaire' then
      v_du := v_jour - 7; v_au := v_jour - 1;
    else
      v_du := (date_trunc('month', v_jour) - interval '1 month')::date; v_au := (date_trunc('month', v_jour) - interval '1 day')::date;
    end if;
    v_export := private.reput_fabriquer_export(p.id, v_du, v_au);
    continue when v_export is null;   -- déjà fabriqué pour cette période
    select x.lignes into v_lignes from public.reput_exports x where x.id = v_export;
    perform private.journaliser_module(p.client_id, 'reput', 'reput.export_fabrique', 'reput_exports', v_export::text,
      jsonb_build_object('programme', p.id, 'du', v_du, 'au', v_au, 'lignes', v_lignes), p.entite_id);
    foreach m in array p.destinataires loop
      continue when not exists (select 1 from public.comptes c where c.client_id = p.client_id and c.user_id = m
                                and c.role in ('gerant', 'admin'))
                    or not private.reput_couvre_strict(m, p.client_id, p.entite_id);
      begin
        perform private.envoyer_interne(p.client_id, 'reput', null, null, 'email', m, 'reput.export_pret',
          jsonb_build_object('jour', to_char(v_au, 'YYYY-MM-DD'), 'nombre', v_lignes),
          'reput.export_pret:' || v_export::text || ':' || m::text, p.entite_id);
      exception when others then
        perform private.journaliser_module(p.client_id, 'reput', 'reput.export_echec', 'reput_exports', v_export::text,
          jsonb_build_object('membre', m, 'erreur', left(sqlerrm, 200)), p.entite_id);
      end;
    end loop;
    n := n + 1;
  end loop;
  return n;
end $function$;
