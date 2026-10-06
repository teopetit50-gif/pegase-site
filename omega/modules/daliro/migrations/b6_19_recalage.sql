-- b6_19 — DALIRO : le recalage du planning quand un lot prend du retard (session B6, 06/10/2026)
--
-- CE QUE ÇA CORRIGE. Le socle connaît les passages (qui vient, quand, sur quel lot) et leurs dépendances (le
-- plaquiste après l'électricien, avec un délai minimal en jours ouvrés). Il signale une dépendance non respectée
-- (vue btp_controle) mais ne propose rien : quand un passage glisse, le conducteur recale toute la suite à la main.
--
-- CE QUI EST POSÉ.
--   · private.btp_calculer_recalage(passage, nouvelle_fin) : le passage finit plus tard ; chaque passage en aval
--     (dépendances, de proche en proche), encore prévu, qui commencerait trop tôt est décalé au premier jour permis
--     — la fin de l'amont + le délai minimal + 1, en jours ouvrés du territoire du chantier (public.ajouter_jours,
--     comme le contrôle dependance_non_respectee) — en gardant sa durée en jours ouvrés. Rien ne recule ; les
--     passages faits ou annulés ne bougent pas.
--   · public.btp_proposer_recalage(passage, nouvelle_fin) : le calcul seul, rien n'est écrit (l'écran le montre).
--   · public.btp_recaler(passage, nouvelle_fin, motif) : l'applique. Chaque passage déplacé repasse en
--     « confirmation non demandée » (déclencheur du socle) : la demande J-2 repartira à la nouvelle date. Journal.
--   · public.btp_terminer_passage(passage, fin_reelle) : noter un passage fait ; s'il a fini plus tard que prévu,
--     la suite est recalée d'abord.
--   · Le point du matin (b6_18) porte en plus les passages qui devaient être finis et ne sont pas notés faits, avec le
--     nombre de passages en aval à recaler.
-- Droits : le bureau du chantier (gérant, admin, valideur : private.btp_exiger_planning), ou le serveur.
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé. La fonction du point du matin est celle de b6_18
-- à l'identique, plus le bloc « 0 ter ».

create or replace function private.btp_calculer_recalage(p_passage uuid, p_nouvelle_fin date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
  v_territoire text;
  v_aval uuid[];
  v_plan jsonb;
  r record;
  v_change boolean;
  v_tours integer := 0;
  v_amont_fin date;
  v_permis date;
  v_debut date;
  v_fin date;
  v_duree integer;
  v_moves jsonb;
begin
  select * into p from public.btp_passages where id = p_passage;
  if not found then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  if p.statut <> 'prevu' then
    raise exception 'Seul un passage prévu se recale.' using errcode = '23514';
  end if;
  if p_nouvelle_fin is null or p_nouvelle_fin < p.debut then
    raise exception 'La nouvelle fin est au plus tôt le jour du début du passage (%).', to_char(p.debut, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  select coalesce(c.territoire, 'metropole') into v_territoire from public.btp_chantiers c where c.id = p.chantier_id;

  -- Les passages en aval, de proche en proche.
  with recursive aval(id) as (
    select d.aval_id from public.btp_dependances d where d.amont_id = p.id
    union
    select d.aval_id from public.btp_dependances d join aval a on d.amont_id = a.id
  )
  select coalesce(array_agg(x.id), '{}') into v_aval
  from aval x join public.btp_passages q on q.id = x.id
  where q.statut = 'prevu' and q.remplace_par_id is null;

  v_plan := jsonb_build_object(p.id::text, jsonb_build_object('debut', p.debut, 'fin', p_nouvelle_fin));
  loop
    v_change := false;
    v_tours := v_tours + 1;
    exit when v_tours > cardinality(v_aval) + 2;
    for r in
      select d.amont_id, d.aval_id, d.delai_min_jours, a.fin as amont_fin, b.debut as aval_debut, b.fin as aval_fin
      from public.btp_dependances d
      join public.btp_passages a on a.id = d.amont_id
      join public.btp_passages b on b.id = d.aval_id
      where d.aval_id = any (v_aval) and a.statut <> 'annule' and a.remplace_par_id is null
    loop
      v_amont_fin := coalesce((v_plan -> r.amont_id::text ->> 'fin')::date, r.amont_fin);
      v_permis := public.ajouter_jours(v_amont_fin, r.delai_min_jours + 1, 'ouvres', v_territoire);
      v_debut := coalesce((v_plan -> r.aval_id::text ->> 'debut')::date, r.aval_debut);
      if v_debut < v_permis then
        -- La durée en jours ouvrés (au moins un jour), gardée telle quelle.
        select greatest(count(*)::integer, 1) into v_duree
        from generate_series(r.aval_debut, r.aval_fin, interval '1 day') g
        where public.jour_ouvre(g::date, v_territoire, false);
        v_fin := public.ajouter_jours(v_permis, v_duree - 1, 'ouvres', v_territoire);
        v_plan := v_plan || jsonb_build_object(r.aval_id::text, jsonb_build_object('debut', v_permis, 'fin', v_fin));
        v_change := true;
      end if;
    end loop;
    exit when not v_change;
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object(
           'passage_id', q.id, 'tache', q.tache, 'lot_id', q.lot_id,
           'intervenant', coalesce((select e.nom from public.btp_equipes e where e.id = q.equipe_id),
                                   (select t.nom from public.btp_tiers t where t.id = q.tiers_id), q.intervenant_lu),
           'ancien_debut', q.debut, 'ancien_fin', q.fin,
           'nouveau_debut', (v_plan -> q.id::text ->> 'debut')::date, 'nouveau_fin', (v_plan -> q.id::text ->> 'fin')::date,
           'reconfirmer', q.confirmation in ('demandee', 'confirmee'),
           'exterieur', q.exterieur)
         order by (v_plan -> q.id::text ->> 'debut')::date, q.tache), '[]'::jsonb)
    into v_moves
  from public.btp_passages q
  where v_plan ? q.id::text
    and ((v_plan -> q.id::text ->> 'debut')::date <> q.debut or (v_plan -> q.id::text ->> 'fin')::date <> q.fin);

  return jsonb_build_object(
    'passage_id', p.id, 'chantier_id', p.chantier_id, 'nouvelle_fin', p_nouvelle_fin,
    'deplaces', v_moves,
    'nombre', jsonb_array_length(v_moves),
    'fin_planning', (select max(coalesce((v_plan -> q.id::text ->> 'fin')::date, q.fin)) from public.btp_passages q
                     where q.chantier_id = p.chantier_id and q.statut = 'prevu' and q.remplace_par_id is null),
    'fin_prevue_chantier', (select c.date_fin_prevue from public.btp_chantiers c where c.id = p.chantier_id));
end $function$;

create or replace function public.btp_proposer_recalage(p_passage uuid, p_nouvelle_fin date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
begin
  select * into p from public.btp_passages where id = p_passage;
  if not found then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(p.client_id, p.entite_id);
  return private.btp_calculer_recalage(p_passage, p_nouvelle_fin);
end $function$;

create or replace function private.btp_appliquer_recalage(p public.btp_passages, p_nouvelle_fin date, p_motif text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_r jsonb;
  m jsonb;
begin
  perform pg_advisory_xact_lock(hashtextextended('daliro.dependances:' || p.chantier_id::text, 0));
  v_r := private.btp_calculer_recalage(p.id, p_nouvelle_fin);
  for m in select x from jsonb_array_elements(v_r -> 'deplaces') x loop
    update public.btp_passages
       set debut = (m ->> 'nouveau_debut')::date, fin = (m ->> 'nouveau_fin')::date
     where id = (m ->> 'passage_id')::uuid and statut = 'prevu';
  end loop;
  if jsonb_array_length(v_r -> 'deplaces') > 0 then
    perform private.journaliser(p.client_id, 'daliro.planning_recale', 'btp_chantiers', p.chantier_id::text,
      jsonb_build_object('passage', p.id, 'nouvelle_fin', p_nouvelle_fin, 'motif', p_motif, 'deplaces', v_r -> 'deplaces'), p.entite_id);
  end if;
  return v_r;
end $function$;

create or replace function public.btp_recaler(p_passage uuid, p_nouvelle_fin date, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
begin
  select * into p from public.btp_passages where id = p_passage for update;
  if not found then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(p.client_id, p.entite_id);
  return private.btp_appliquer_recalage(p, p_nouvelle_fin, left(nullif(btrim(p_motif), ''), 300));
end $function$;

create or replace function public.btp_terminer_passage(p_passage uuid, p_fin_reelle date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.btp_passages;
  v_fin date := coalesce(p_fin_reelle, (now() at time zone 'Europe/Paris')::date);
  v_r jsonb := null;
begin
  select * into p from public.btp_passages where id = p_passage for update;
  if not found then
    raise exception 'Passage introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(p.client_id, p.entite_id);
  if p.statut <> 'prevu' then
    raise exception 'Ce passage n''est plus prévu.' using errcode = '23514';
  end if;
  if v_fin > (now() at time zone 'Europe/Paris')::date then
    raise exception 'Un passage se note fait au plus tard aujourd''hui.' using errcode = '22023';
  end if;
  if v_fin < p.debut then
    raise exception 'La fin réelle est au plus tôt le jour du début (%).', to_char(p.debut, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if v_fin > p.fin then
    v_r := private.btp_appliquer_recalage(p, v_fin, 'Fini plus tard que prévu');
  end if;
  update public.btp_passages set fin = v_fin, statut = 'fait' where id = p.id;
  perform private.journaliser(p.client_id, 'daliro.passage_fait', 'btp_passages', p.id::text,
    jsonb_build_object('fin_prevue', p.fin, 'fin_reelle', v_fin, 'recales', coalesce(v_r -> 'nombre', '0'::jsonb)), p.entite_id);
  return jsonb_build_object('passage_id', p.id, 'fin_reelle', v_fin, 'recalage', v_r);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le point du matin (b6_18) : plus les passages en retard
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_point_matin_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_total numeric;
  v_facture numeric;
  v_ouvertes integer;
begin
  -- 0. Les situations en retard de paiement (b6_16) : relancez.
  for r in
    select s.id, s.numero, s.chantier_id, c.nom as chantier_nom, private.btp_encaissement(s.id, p_jour) as e
    from public.btp_situations s join public.btp_chantiers c on c.id = s.chantier_id
    where s.client_id = p_client and s.statut = 'validee' and s.echeance < p_jour
    order by s.echeance, c.nom, s.numero
  loop
    continue when r.e ->> 'etat' <> 'en_retard';
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : situation n° %s impayée depuis %s jour%s, reste dû %s € (indemnité de 40 € due) : relancez', r.chantier_nom, r.numero,
                           r.e ->> 'retard_jours', case when (r.e ->> 'retard_jours')::int > 1 then 's' else '' end,
                           translate(to_char((r.e ->> 'reste_du')::numeric, 'FM999,999,990.00'), ',.', ' ,')), 300),
      'gravite', case when (r.e ->> 'retard_jours')::int >= 30 then 'critique' else 'attention' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 0 bis. Les avenants pas encore signés (b6_18) : un travail supplémentaire exécuté sans accord écrit risque de
  -- ne pas être payé (marché à forfait : Code civil, art. 1793).
  for r in
    select a.id, a.numero, a.objet, a.statut, a.chantier_id, c.nom as chantier_nom,
           (a.cree_le at time zone 'Europe/Paris')::date as cree_jour,
           (a.soumis_le at time zone 'Europe/Paris')::date as soumis_jour,
           d.statut as demande_statut,
           (select coalesce(sum(l.montant_ht), 0) from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree) as montant
    from public.btp_avenants a
    join public.btp_chantiers c on c.id = a.chantier_id
    left join public.demandes_validation d on d.id = a.demande_id
    where a.client_id = p_client and a.statut in ('brouillon', 'soumis') and c.statut in ('preparation', 'ouvert', 'suspendu')
    order by a.soumis_le nulls last, a.cree_le, c.nom, a.numero
  loop
    exit when v_n >= 50;
    if r.statut = 'soumis' and r.demande_statut = 'approuvee' then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » (%s € HT) validé, pas encore signé : faites-le signer par le maître d''ouvrage avant d''exécuter (C. civ. art. 1793)',
                             r.chantier_nom, r.numero, left(r.objet, 60), translate(to_char(r.montant, 'FM999,999,990.00'), ',.', ' ,')), 300),
        'gravite', case when r.soumis_jour <= p_jour - 14 then 'critique' else 'attention' end,
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    elsif r.statut = 'soumis' and r.demande_statut = 'en_attente' and r.soumis_jour <= p_jour - 2 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » en attente de validation depuis le %s : décidez dans « À valider »',
                             r.chantier_nom, r.numero, left(r.objet, 60), to_char(r.soumis_jour, 'DD/MM/YYYY')), 300),
        'gravite', case when r.soumis_jour <= p_jour - 7 then 'attention' else 'info' end,
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    elsif r.statut = 'brouillon' and r.cree_jour <= p_jour - 7 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » en préparation depuis le %s : chiffrez-le et soumettez-le, ou abandonnez-le',
                             r.chantier_nom, r.numero, left(r.objet, 60), to_char(r.cree_jour, 'DD/MM/YYYY')), 300),
        'gravite', 'info',
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    end if;
  end loop;

  -- 0 ter. Les passages qui devaient être finis et ne sont pas notés faits (b6_19) : notez-les faits ou recalez la suite.
  for r in
    select q.id, q.tache, q.fin, q.chantier_id, c.nom as chantier_nom,
           coalesce((select e.nom from public.btp_equipes e where e.id = q.equipe_id),
                    (select t.nom from public.btp_tiers t where t.id = q.tiers_id), q.intervenant_lu) as intervenant,
           (with recursive aval(id) as (
              select d.aval_id from public.btp_dependances d where d.amont_id = q.id
              union
              select d.aval_id from public.btp_dependances d join aval x on d.amont_id = x.id)
            select count(*) from aval x join public.btp_passages w on w.id = x.id where w.statut = 'prevu') as en_aval
    from public.btp_passages q join public.btp_chantiers c on c.id = q.chantier_id
    where q.client_id = p_client and q.statut = 'prevu' and q.remplace_par_id is null and q.fin < p_jour
      and c.statut in ('ouvert', 'suspendu')
    order by q.fin, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : « %s »%s devait finir le %s et n''est pas noté fait : notez-le fait ou recalez la suite%s',
                           r.chantier_nom, coalesce(r.tache, 'passage'), coalesce(' (' || r.intervenant || ')', ''), to_char(r.fin, 'DD/MM/YYYY'),
                           case when r.en_aval > 0 then format(' (%s passage%s en aval)', r.en_aval, case when r.en_aval > 1 then 's' else '' end) else '' end), 300),
      'gravite', case when r.en_aval > 0 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 1. Les retenues : dues (à réclamer), puis dues dans les 30 jours.
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.retenue_statut = 'bloquee' and (x.retenue_montant > 0 or x.retenue_caution)
      and x.retenue_due_le <= p_jour + 30
    order by x.retenue_due_le, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s %s le %s%s', r.chantier_nom,
                           case when r.retenue_caution then 'caution de retenue de garantie' else 'retenue de garantie de ' || translate(to_char(r.retenue_montant, 'FM999,999,990.00'), ',.', ' ,') || ' €' end,
                           case when r.retenue_due_le <= p_jour then 'due depuis' else 'due' end,
                           to_char(r.retenue_due_le, 'DD/MM/YYYY'),
                           case when r.retenue_due_le <= p_jour then ' : réclamez-la' else '' end), 300),
      'gravite', case when r.retenue_due_le <= p_jour then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 2. Les décomptes finals à envoyer (45 jours après la réception).
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.decompte_statut in ('a_preparer', 'projet')
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : décompte final à envoyer %s le %s', r.chantier_nom,
                           case when p_jour > r.date_reception + 45 then 'depuis' else 'avant' end,
                           to_char(r.date_reception + 45, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 30 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 3. Les réserves encore ouvertes.
  for r in
    select x.chantier_id, x.date_reception, c.nom as chantier_nom, count(v.id) as ouvertes
    from public.btp_receptions x
    join public.btp_chantiers c on c.id = x.chantier_id
    join public.btp_reserves v on v.reception_id = x.id and v.statut = 'ouverte'
    where x.client_id = p_client
    group by x.chantier_id, x.date_reception, c.nom
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s réserve%s encore ouverte%s depuis la réception du %s', r.chantier_nom, r.ouvertes,
                           case when r.ouvertes > 1 then 's' else '' end, case when r.ouvertes > 1 then 's' else '' end,
                           to_char(r.date_reception, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 60 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 4. Les réceptions à prononcer.
  for r in
    select c.* from public.btp_chantiers c
    where c.client_id = p_client and c.statut in ('ouvert', 'suspendu')
      and not exists (select 1 from public.btp_receptions x where x.chantier_id = c.id)
    order by c.nom
  loop
    exit when v_n >= 50;
    select coalesce(sum(l.montant_ht), 0) into v_total
    from public.btp_lignes_marche l
    where l.nature <> 'option'
      and l.marche_id = (select m.id from public.btp_marches m where m.chantier_id = r.id and m.statut = 'verifie' order by m.verifie_le desc nulls last limit 1);
    v_total := v_total + coalesce((select sum(l.montant_ht) from public.btp_avenants_lignes l join public.btp_avenants a on a.id = l.avenant_id
                                   where a.chantier_id = r.id and a.statut = 'signe' and not l.retiree), 0);
    select s.cumul_ht into v_facture from public.btp_situations s where s.chantier_id = r.id and s.statut = 'validee' order by s.numero desc limit 1;
    if v_total > 0 and coalesce(v_facture, 0) >= v_total * 0.995 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : travaux facturés à 100 %% par les situations — prononcez la réception', r.nom), 300),
        'gravite', 'attention', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    elsif r.date_fin_prevue is not null and r.date_fin_prevue < p_jour then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : fin prévue le %s dépassée — réception à prononcer ou planning à recaler', r.nom,
                             to_char(r.date_fin_prevue, 'DD/MM/YYYY')), 300),
        'gravite', 'info', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_items;
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt)
revoke execute on function private.btp_calculer_recalage(uuid, date) from public, anon, authenticated;
revoke execute on function private.btp_appliquer_recalage(public.btp_passages, date, text) from public, anon, authenticated;
revoke execute on function private.btp_point_matin_lignes(uuid, date) from public, anon, authenticated;
grant execute on function private.btp_calculer_recalage(uuid, date) to service_role;
grant execute on function private.btp_appliquer_recalage(public.btp_passages, date, text) to service_role;
grant execute on function private.btp_point_matin_lignes(uuid, date) to service_role;
revoke execute on function public.btp_proposer_recalage(uuid, date) from public, anon;
revoke execute on function public.btp_recaler(uuid, date, text) from public, anon;
revoke execute on function public.btp_terminer_passage(uuid, date) from public, anon;
grant execute on function public.btp_proposer_recalage(uuid, date) to authenticated, service_role;
grant execute on function public.btp_recaler(uuid, date, text) to authenticated, service_role;
grant execute on function public.btp_terminer_passage(uuid, date) to authenticated, service_role;
