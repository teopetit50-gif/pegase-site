-- c4_18 — OFFLOAD : l'envoi automatique par défaut, « modèle 2 » (décision de Teo, 18/10/2026, session C4)
--
-- Teo, 18/10 (relayé par le coordinateur à 21 h 20 Z, confirmé dans la session C4) : « OFFLOAD a le droit de répondre
-- automatiquement ». Les messages d'OFFLOAD partent sans validation par défaut ; ils sont RETENUS pour une personne
-- quand le système doute ou que le sujet n'est pas autorisé ; c'est réglable par organisation. La règle d'un message
-- par compte et par trimestre (c4_16) et la quarantaine de 90 jours restent.
--
--   · offload_reglages.envoi_auto (allumé par défaut) et offload_reglages.sujets_auto (reprise, echeance, affaire :
--     tous par défaut), réglés par offload_regler (gérant ou admin).
--   · Le socle ne laisse jamais un moteur se passer de validation : un message part seul quand l'accord permanent
--     d'OFFLOAD (politique du socle, module offload, envoi.email) est actif. Cet accord est DONNÉ une fois par le
--     gérant ou un administrateur (public.offload_donner_accord_auto), puis activé par une décision du socle (une
--     autre personne qui décide, ou le seul décideur si le socle met offload/envoi.email sur sa liste blanche).
--     Sans accord actif, chaque message passe par « À valider », comme avant.
--   · Retenue : private.offload_retenue dit pourquoi un message ne part pas seul — envoi automatique éteint, sujet non
--     autorisé, compte à vérifier, adresse générique (contact@, info@…), moins de trois achats connus (pour une
--     reprise). Le message retenu naît adossé à une demande « offload.message_retenu » (jamais couverte par l'accord
--     d'OFFLOAD) : une personne le lit, l'approuve ou le refuse dans « À valider ». Une règle du client enfreinte
--     retient toujours le message comme avant (c4_10 : la reprise passe par l'appel).
--   · Éteindre l'envoi automatique révoque l'accord permanent d'OFFLOAD.
--   · En recette, les réglages d'envoi restent en essai : rien ne part pour de vrai.
--
-- Règles de pose : alter … add column if not exists, create or replace. Aucun DROP, aucun DELETE.

alter table public.offload_reglages add column if not exists envoi_auto boolean not null default true;
alter table public.offload_reglages add column if not exists sujets_auto text[] not null default array['affaire', 'echeance', 'reprise'];
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offload_reglages_sujets_auto_check') then
    alter table public.offload_reglages add constraint offload_reglages_sujets_auto_check
      check (sujets_auto <@ array['affaire', 'echeance', 'reprise']);
  end if;
end $$;
comment on column public.offload_reglages.envoi_auto is 'OFFLOAD — les messages partent sans validation (accord permanent actif), sauf retenue ; allumé par défaut (c4_18).';
comment on column public.offload_reglages.sujets_auto is 'OFFLOAD — sujets que l''envoi automatique couvre : reprise, echeance, affaire (c4_18).';

-- La reprise : le message part par offload_envoyer (seul sous l'accord permanent, ou retenu pour une personne).
create or replace function private.offload_preparer_message(p_reprise uuid, p_rang integer)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
  c public.offload_comptes;
  g public.offload_reglages;
  v_msg jsonb;
  v_envoi uuid;
begin
  select * into r from public.offload_reprises where id = p_reprise;
  select * into c from public.offload_comptes where id = r.compte_id;
  select * into g from public.offload_reglages where client_id = r.client_id;
  if nullif(btrim(c.email), '') is null then
    return null;
  end if;
  if private.offload_essai_contre_reel(r.client_id) then
    raise exception 'OFFLOAD est en mode essai et les envois du module sont réglés en réel : rien n''est préparé.' using errcode = '55000';
  end if;
  if private.offload_suspendu(r.client_id) then
    raise exception 'OFFLOAD est suspendu (%) : rien n''est préparé tant qu''un gérant ne l''a pas relancé.',
      (select z.suspendu_motif from public.offload_reglages z where z.client_id = r.client_id) using errcode = '55000';
  end if;
  perform private.offload_assurer_consentement(c.id);
  v_msg := private.offload_regles_appliquer(r.client_id, private.offload_message(c.id, p_rang, r.envoye1_le, null));
  if v_msg ->> 'retenu' is not null then
    -- Une règle du client est enfreinte : le message est retenu, la reprise passe par l'appel.
    update public.offload_reprises set motif = left(format('Message retenu par votre règle « %s » : la reprise passe par l''appel.', v_msg ->> 'retenu'), 500),
           maj_le = now() where id = r.id;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_retenu', 'offload_reprises', r.id::text,
      jsonb_build_object('rang', p_rang, 'regle', v_msg ->> 'retenu'), r.entite_id);
    return null;
  end if;
  v_envoi := private.offload_envoyer(r.client_id, 'reprise', c.id, 'offload_reprises', r.id::text,
    jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                       'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
    v_msg, 'offload:reprise:' || r.id::text || ':' || p_rang, r.entite_id);
  return v_envoi;
end $function$;

-- Les échéances : même voie.
create or replace function private.offload_echeances_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  q record;
  k record;
  v_base date;
  v_ailleurs boolean;
  v_due date;
  v_id uuid;
  v_envoi uuid;
  e public.envois;
  c public.offload_comptes;
  v_msg jsonb;
  v_retenu text;
  v_raison text;
  v_n integer;
  n_nouvelles integer := 0; n_honorees integer := 0; n_depassees integer := 0; n_prevenues integer := 0; n_appels integer := 0;
  n_contrats integer := 0; n_ecartees integer := 0;
begin
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;

  -- 1. Chaque équipement actif : son échéance datée depuis la dernière intervention enregistrée.
  for q in select x.* from public.offload_equipements x where x.client_id = p_client and x.statut = 'actif' loop
    select i.le, i.ailleurs into v_base, v_ailleurs from public.offload_interventions i
    where i.equipement_id = q.id order by i.le desc, i.ailleurs limit 1;
    if q.derniere_intervention is not null and (v_base is null or q.derniere_intervention > v_base) then
      v_base := q.derniere_intervention;
      v_ailleurs := false;
    end if;
    continue when v_base is null;
    v_due := (v_base + make_interval(months => q.periodicite_mois))::date;
    -- Une intervention plus récente honore les échéances d'avant (ailleurs : « honorée ailleurs »).
    update public.offload_echeances h
       set statut = case when v_ailleurs then 'honoree_ailleurs' else 'honoree' end, honoree_le = v_base, maj_le = now(),
           motif = case when v_ailleurs then 'Intervention faite ailleurs le ' || private.offload_le(v_base) || ' : l''échéance sort du cycle.'
                        else 'Intervention du ' || private.offload_le(v_base) || '.' end
     where h.equipement_id = q.id and h.type = 'entretien' and h.due_le < v_due
       and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee');
    get diagnostics v_n = row_count;
    n_honorees := n_honorees + v_n;
    insert into public.offload_echeances (client_id, entite_id, compte_id, type, equipement_id, nature, due_le, base_le)
    values (q.client_id, q.entite_id, q.compte_id, 'entretien', q.id, q.nature, v_due, v_base)
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      n_nouvelles := n_nouvelles + 1;
    end if;
  end loop;

  -- 2. Tombée sans intervention connue : en attente, jamais relancée une seconde fois.
  update public.offload_echeances h set statut = 'depassee', maj_le = now(),
         motif = 'Échéance du ' || private.offload_le(h.due_le) || ' tombée sans intervention connue : en attente, sans seconde relance.'
   where h.client_id = p_client and h.type = 'entretien' and h.due_le < v_jour and h.statut in ('a_venir', 'prevenue', 'appel');
  get diagnostics n_depassees = row_count;

  -- 3. Les contrats : leur fin est une échéance ; sans reconduction tacite, à 60 jours ou passée, il s'éteint.
  for k in select x.* from public.offload_contrats x where x.client_id = p_client and x.statut = 'actif' loop
    insert into public.offload_echeances (client_id, entite_id, compte_id, type, equipement_id, contrat_id, nature, due_le, base_le)
    values (k.client_id, k.entite_id, k.compte_id, 'contrat', k.equipement_id, k.id, 'commerciale', k.fin, k.debut)
    on conflict do nothing;
    if k.reconduction <> 'tacite' and k.fin <= v_jour + 60
       and not exists (select 1 from public.offload_contrats y where y.compte_id = k.compte_id and y.id <> k.id
                       and y.statut = 'actif' and y.fin > k.fin and coalesce(y.equipement_id, k.equipement_id) is not distinct from k.equipement_id) then
      update public.offload_echeances h set s_eteint = true, maj_le = now(),
             motif = format('Le contrat %s %s le %s sans reconduction %s.', k.numero,
                            case when k.fin < v_jour then 's''est éteint' else 's''éteint' end, private.offload_le(k.fin),
                            case k.reconduction when 'aucune' then 'prévue' else 'tacite : il faut le renouveler' end)
       where h.contrat_id = k.id and h.type = 'contrat' and h.due_le = k.fin and not h.s_eteint
      returning h.id into v_id;
      if found then
        n_contrats := n_contrats + 1;
        select * into c from public.offload_comptes where id = k.compte_id;
        insert into public.offload_taches (client_id, entite_id, compte_id, echeance_id, type, titre, detail, commercial, echeance)
        values (k.client_id, k.entite_id, k.compte_id, v_id, 'appel', left('Proposer le renouvellement du contrat ' || k.numero || ' — ' || c.nom, 200),
                left(format('Le contrat %s%s prend fin le %s, sans reconduction tacite.%s', k.numero, coalesce(' (' || k.libelle || ')', ''),
                            private.offload_le(k.fin), coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
                c.commercial, least(greatest(v_jour, k.fin - 30), v_jour + 3))
        on conflict do nothing;
        perform private.journaliser_module(k.client_id, 'offload', 'offload.contrat_s_eteint', 'offload_contrats', k.id::text,
          jsonb_build_object('numero', k.numero, 'fin', k.fin, 'reconduction', k.reconduction), k.entite_id);
      end if;
    end if;
    if k.fin < v_jour and k.reconduction <> 'tacite' then
      update public.offload_contrats set statut = 'echu', maj_le = now() where id = k.id;
    elsif k.fin < v_jour and k.reconduction = 'tacite' then
      update public.offload_contrats set statut = 'reconduit', maj_le = now() where id = k.id;
    end if;
  end loop;

  -- 4. Prévenir la semaine qui précède (J-7 à J-1, jamais le jour même), une fois.
  if not private.offload_essai_contre_reel(p_client) and not private.offload_suspendu(p_client) then
    for k in
      select h.* from public.offload_echeances h
      where h.client_id = p_client and h.type = 'entretien' and h.statut = 'a_venir'
        and h.due_le between v_jour + 1 and v_jour + 7
      order by h.due_le, h.nature desc, h.id
    loop
      v_raison := private.offload_ecarte_echeance(k.compte_id, v_jour);
      if v_raison is not null then
        n_ecartees := n_ecartees + 1;
        continue;
      end if;
      select * into c from public.offload_comptes where id = k.compte_id;
      begin
        v_envoi := null;
        v_retenu := null;
        if nullif(btrim(c.email), '') is not null then
          perform private.offload_assurer_consentement(c.id);
          v_msg := private.offload_regles_appliquer(k.client_id, private.offload_message_echeance(k.id));
          v_retenu := v_msg ->> 'retenu';
        end if;
        if v_retenu is null and nullif(btrim(c.email), '') is not null then
          v_envoi := private.offload_envoyer(k.client_id, 'echeance', c.id, 'offload_echeances', k.id::text,
            jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                               'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
            v_msg, 'offload:echeance:' || k.id::text, k.entite_id);
          select * into e from public.envois where id = v_envoi;
        end if;
        if v_envoi is not null and e.statut <> 'bloque' then
          update public.offload_echeances set statut = 'a_valider', envoi_id = v_envoi, maj_le = now() where id = k.id;
          n_prevenues := n_prevenues + 1;
        else
          update public.offload_echeances set statut = 'appel', envoi_id = v_envoi, maj_le = now(),
                 motif = case when v_retenu is not null then left(format('Message retenu par votre règle « %s » : le commercial prévient le client.', v_retenu), 500)
                              when v_envoi is null then 'Pas de courriel connu : le commercial prévient le client.'
                              else left(format('Message retenu par le socle (%s) : le commercial prévient le client.', e.verrou), 500) end
           where id = k.id;
          insert into public.offload_taches (client_id, entite_id, compte_id, echeance_id, type, titre, detail, commercial, echeance)
          select k.client_id, k.entite_id, k.compte_id, k.id, 'appel',
                 left(format('Prévenir %s : %s le %s', c.nom, case when k.nature = 'reglementaire' then 'contrôle réglementaire' else 'entretien' end,
                             private.offload_le(k.due_le)), 200),
                 left(format('%s (n° %s%s), dernière intervention le %s.%s', q2.designation, q2.ref, coalesce(', site ' || q2.site, ''),
                             private.offload_le(k.base_le), coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
                 c.commercial, v_jour
          from public.offload_equipements q2 where q2.id = k.equipement_id
          on conflict do nothing;
          n_appels := n_appels + 1;
        end if;
      exception when others then
        n_ecartees := n_ecartees + 1;
      end;
    end loop;
  end if;

  if n_nouvelles + n_honorees + n_depassees + n_prevenues + n_appels + n_contrats > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.echeances', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'nouvelles', n_nouvelles, 'honorees', n_honorees, 'depassees', n_depassees,
                         'prevenues', n_prevenues, 'appels', n_appels, 'contrats_s_eteignent', n_contrats, 'ecartees', n_ecartees), null);
  end if;
  return jsonb_build_object('nouvelles', n_nouvelles, 'honorees', n_honorees, 'depassees', n_depassees, 'prevenues', n_prevenues,
                            'appels', n_appels, 'contrats_s_eteignent', n_contrats, 'ecartees', n_ecartees);
end $function$;

-- Les commandes en attente de retrait : même voie.
create or replace function private.offload_relancer_affaire(p_affaire uuid, p_rang integer, p_appel text default null)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_affaires;
  c public.offload_comptes;
  v_envoi uuid;
  e public.envois;
  v_msg jsonb;
begin
  select * into a from public.offload_affaires where id = p_affaire for update;
  select * into c from public.offload_comptes where id = a.compte_id;
  -- p_appel : la raison pour laquelle on passe par une personne (compte suivi en direct, liste d'exclusion).
  if p_appel is null and nullif(btrim(c.email), '') is not null and c.statut <> 'arrete' then
    perform private.offload_assurer_consentement(c.id);
    v_msg := private.offload_regles_appliquer(a.client_id, private.offload_message_retrait(a.id, p_rang));
    if v_msg ->> 'retenu' is not null then
      p_appel := format('message retenu par votre règle « %s »', v_msg ->> 'retenu');
    else
    v_envoi := private.offload_envoyer(a.client_id, 'affaire', c.id, 'offload_affaires', a.id::text,
      jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                         'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
      v_msg, 'offload:affaire:' || a.id::text || ':' || p_rang, a.entite_id);
    select * into e from public.envois where id = v_envoi;
    end if;
  end if;
  if v_envoi is null or e.statut = 'bloque' then
    -- Sans message (pas de courriel, règle, compte suivi en direct ou à vérifier) : une personne prévient le client.
    insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
    values (a.client_id, a.entite_id, a.compte_id, 'appel',
            left(format('Prévenir %s : %s %s en attente de retrait', c.nom, case a.type when 'intervention' then 'intervention' else 'commande' end, a.reference), 200),
            left(format('%s disponible depuis le %s%s.%s', coalesce(a.libelle, a.reference), private.offload_le(a.disponible_le),
                        case when p_appel is not null then ' (' || p_appel || ')'
                             when v_envoi is not null then ' (message retenu : ' || coalesce(e.verrou, e.statut) || ')' else ' (pas de courriel)' end,
                        coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
            c.commercial, (now() at time zone 'Europe/Paris')::date);
  end if;
  if p_rang = 1 then
    update public.offload_affaires set statut = 'relancee_1', relance1_le = clock_timestamp(), envoi1_id = v_envoi, maj_le = now() where id = a.id;
  else
    update public.offload_affaires set statut = 'relancee_2', relance2_le = clock_timestamp(), envoi2_id = v_envoi, maj_le = now() where id = a.id;
  end if;
  perform private.journaliser_module(a.client_id, 'offload', 'offload.affaire_relancee', 'offload_affaires', a.id::text,
    jsonb_build_object('rang', p_rang, 'envoi', v_envoi, 'appel', v_envoi is null or e.statut = 'bloque'), a.entite_id);
  return case when v_envoi is null or e.statut = 'bloque' then 'appel' else 'message' end;
end $function$;

-- Les réglages : l'envoi automatique (allumé par défaut) et les sujets qu'il couvre.
create or replace function private.offload_regler(p_client uuid, p_reglages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_inconnus text;
  p jsonb := coalesce(p_reglages, '{}'::jsonb);
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'régler les seuils');
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Les réglages se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k
  where k not in ('delai_silence_jours', 'montant_min', 'jour_cloture', 'alerte_avant_cloture_jours', 'signature',
                  'delai_relance_jours', 'quarantaine_jours', 'plafond_reprises_jour', 'delai_retrait_jours', 'delai_relance_retrait_jours',
                  'arrete_jour', 'seuil_non_remis_pct', 'vague_jour', 'relance_ecrite',
                  'envoi_auto', 'sujets_auto');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  select * into g from public.offload_reglages where client_id = p_client for update;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if p ? 'envoi_auto' and jsonb_typeof(p -> 'envoi_auto') <> 'boolean' then
    raise exception 'envoi_auto vaut true ou false.' using errcode = '22023';
  end if;
  if p ? 'sujets_auto' and jsonb_typeof(p -> 'sujets_auto') <> 'array' then
    raise exception 'sujets_auto est une liste : reprise, echeance, affaire.' using errcode = '22023';
  end if;
  update public.offload_reglages set
    delai_silence_jours = case when p ? 'delai_silence_jours' then (p ->> 'delai_silence_jours')::integer else delai_silence_jours end,
    montant_min = case when p ? 'montant_min' then (p ->> 'montant_min')::numeric else montant_min end,
    jour_cloture = case when p ? 'jour_cloture' then (p ->> 'jour_cloture')::smallint else jour_cloture end,
    alerte_avant_cloture_jours = case when p ? 'alerte_avant_cloture_jours' then (p ->> 'alerte_avant_cloture_jours')::smallint
                                      else alerte_avant_cloture_jours end,
    signature = case when p ? 'signature' then private.offload_texte(p ->> 'signature', 500) else signature end,
    delai_relance_jours = case when p ? 'delai_relance_jours' then (p ->> 'delai_relance_jours')::smallint else delai_relance_jours end,
    quarantaine_jours = case when p ? 'quarantaine_jours' then (p ->> 'quarantaine_jours')::smallint else quarantaine_jours end,
    plafond_reprises_jour = case when p ? 'plafond_reprises_jour' then (p ->> 'plafond_reprises_jour')::smallint else plafond_reprises_jour end,
    delai_retrait_jours = case when p ? 'delai_retrait_jours' then (p ->> 'delai_retrait_jours')::smallint else delai_retrait_jours end,
    delai_relance_retrait_jours = case when p ? 'delai_relance_retrait_jours' then (p ->> 'delai_relance_retrait_jours')::smallint
                                       else delai_relance_retrait_jours end,
    relance_ecrite = case when p ? 'relance_ecrite' then coalesce((p ->> 'relance_ecrite')::boolean, false) else relance_ecrite end,
    envoi_auto = case when p ? 'envoi_auto' then (p ->> 'envoi_auto')::boolean else envoi_auto end,
    sujets_auto = case when p ? 'sujets_auto' then array(select distinct x from jsonb_array_elements_text(p -> 'sujets_auto') x order by x)
                       else sujets_auto end,
    vague_jour = case when p ? 'vague_jour' then (p ->> 'vague_jour')::smallint else vague_jour end,
    seuil_non_remis_pct = case when p ? 'seuil_non_remis_pct' then (p ->> 'seuil_non_remis_pct')::smallint else seuil_non_remis_pct end,
    arrete_jour = case when p ? 'arrete_jour' then (p ->> 'arrete_jour')::smallint else arrete_jour end,
    maj_le = now()
  where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('avant', to_jsonb(g) - 'branchement_id' - 'installe_par', 'demande', p), null);
  -- L'envoi automatique éteint : l'accord permanent d'OFFLOAD est révoqué, chaque message repasse par une personne.
  if g.envoi_auto and p ? 'envoi_auto' and not (p ->> 'envoi_auto')::boolean then
    perform private.offload_revoquer_accord(p_client, 'Envoi automatique éteint dans les réglages d''OFFLOAD.');
  end if;
  return (select to_jsonb(x) from public.offload_reglages x where x.client_id = p_client);
end $function$;

-- Pourquoi un message ne part pas seul (une phrase), ou null s'il peut partir sans validation.
create or replace function private.offload_retenue(p_client uuid, p_compte uuid, p_sujet text, p_adresse text)
 returns text
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  c public.offload_comptes;
  s public.offload_signaux;
  v_local text := split_part(lower(btrim(coalesce(p_adresse, ''))), '@', 1);
begin
  select * into g from public.offload_reglages where client_id = p_client;
  select * into c from public.offload_comptes where id = p_compte;
  if not coalesce(g.envoi_auto, false) then
    return 'envoi automatique éteint dans les réglages';
  end if;
  if not (p_sujet = any (g.sujets_auto)) then
    return format('sujet non autorisé pour l''envoi automatique (%s)',
                  case p_sujet when 'reprise' then 'reprise d''un compte silencieux' when 'echeance' then 'échéance qui revient'
                               when 'affaire' then 'commande en attente de retrait' else p_sujet end);
  end if;
  if c.verification is not null then
    return 'doute : compte ' || case when c.verification = 'reattribuer' then 'à réattribuer' else 'à vérifier' end
           || coalesce(' (' || c.verification_motif || ')', '');
  end if;
  if v_local ~ '^(contact|info|infos|accueil|bonjour|hello|admin|administration|secretariat|standard|noreply|no-reply|ne-pas-repondre|nepasrepondre)$' then
    return format('doute : adresse générique (%s@…), le message risque de ne pas atteindre la bonne personne', v_local);
  end if;
  if p_sujet = 'reprise' then
    select * into s from public.offload_signaux where compte_id = p_compte;
    if s.compte_id is null or s.nb_achats < 3 then
      return 'doute : moins de trois achats connus, le silence du compte n''est pas établi';
    end if;
  end if;
  return null;
end $function$;

-- Le message d'OFFLOAD part par ici : seul quand l'accord permanent d'OFFLOAD le couvre, ou retenu pour une personne
-- (demande « offload.message_retenu », à laquelle l'envoi s'adosse). Rejouer rend l'envoi déjà préparé.
create or replace function private.offload_envoyer(p_client uuid, p_sujet text, p_compte uuid, p_objet_type text, p_objet_id text,
                                                   p_destinataire jsonb, p_msg jsonb, p_cle text, p_entite uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_envoi uuid;
  v_raison text;
  v_dem public.demandes_validation;
  e public.envois;
begin
  select x.id into v_envoi from public.envois x where x.client_id = p_client and x.cle_idempotence = p_cle;
  if v_envoi is not null then
    return v_envoi;
  end if;
  v_raison := private.offload_retenue(p_client, p_compte, p_sujet, p_destinataire ->> 'adresse');
  if v_raison is not null then
    select * into v_dem from public.demandes_validation d where d.client_id = p_client and d.cle_idempotence = 'offload:retenu:' || p_cle;
    if v_dem.id is null then
      insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload, cle_idempotence)
      values (p_client, p_entite, 'offload', 'offload.message_retenu', p_objet_type, p_objet_id,
              left(format('Message retenu — %s. Courriel à %s : %s', v_raison, coalesce(p_destinataire ->> 'nom', p_destinataire ->> 'adresse'),
                          coalesce(p_msg ->> 'sujet', 'sans objet')), 500),
              jsonb_build_object('raison', v_raison, 'sujet_offload', p_sujet, 'canal', 'email',
                                 'destinataire', jsonb_build_object('nom', p_destinataire ->> 'nom', 'adresse', p_destinataire ->> 'adresse'),
                                 'sujet', p_msg ->> 'sujet', 'corps', p_msg ->> 'corps'),
              'offload:retenu:' || p_cle)
      returning * into v_dem;
    end if;
    if v_dem.statut <> 'en_attente' then
      -- Un accord permanent ne couvre jamais un message retenu : une personne décide chaque fois.
      raise exception 'Un accord permanent couvre les messages retenus d''OFFLOAD : révoquez-le, une personne doit les lire.'
        using errcode = '42501';
    end if;
  end if;
  v_envoi := private.preparer_envoi(p_client, 'offload', p_objet_type, p_objet_id, 'email', p_destinataire,
    null, '{}'::jsonb, p_msg ->> 'sujet', p_msg ->> 'corps', null::uuid[], p_cle, p_entite, false, false, null::timestamptz,
    case when v_dem.id is null then '{}'::jsonb else jsonb_build_object('demande', v_dem.id) end);
  if v_dem.id is not null then
    select * into e from public.envois where id = v_envoi;
    if e.statut = 'bloque' or e.demande_id is distinct from v_dem.id then
      -- Arrêté par le socle (opposition, consentement…) : la demande de lecture n'a plus d'objet.
      update public.demandes_validation set statut = 'annulee' where id = v_dem.id and statut = 'en_attente';
    end if;
    perform private.journaliser_module(p_client, 'offload', 'offload.message_retenu', p_objet_type, p_objet_id,
      jsonb_build_object('raison', v_raison, 'sujet', p_sujet, 'envoi', v_envoi, 'demande', v_dem.id), p_entite);
  end if;
  return v_envoi;
end $function$;

-- L'état de l'envoi automatique d'une organisation : réglage, accord permanent du socle, messages retenus en attente.
create or replace function private.offload_accord_etat(p_client uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'envoi_auto', g.envoi_auto,
    'sujets_auto', to_jsonb(g.sujets_auto),
    'accord', case when exists (select 1 from public.politiques p where p.client_id = p_client and p.module = 'offload'
                                  and p.type_action = 'envoi.email' and p.statut = 'active' and p.fin > now()) then 'actif'
                   when exists (select 1 from public.politiques p where p.client_id = p_client and p.module = 'offload'
                                  and p.type_action = 'envoi.email' and p.statut = 'a_valider') then 'a_valider'
                   else 'absent' end,
    'politiques', (select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'statut', p.statut, 'nombre_mensuel', p.nombre_mensuel,
                                                                'debut', p.debut, 'fin', p.fin, 'donne_par', p.cree_par,
                                                                'demande', p.demande_id) order by p.cree_le desc), '[]'::jsonb)
                   from public.politiques p where p.client_id = p_client and p.module = 'offload' and p.type_action = 'envoi.email'
                     and p.statut in ('a_valider', 'active')),
    'retenus_en_attente', (select count(*) from public.demandes_validation d where d.client_id = p_client and d.module = 'offload'
                             and d.type_action = 'offload.message_retenu' and d.statut = 'en_attente'))
  from public.offload_reglages g where g.client_id = p_client
$function$;

-- Révoque l'accord permanent d'OFFLOAD (à valider ou actif) ; rend le nombre d'accords révoqués.
create or replace function private.offload_revoquer_accord(p_client uuid, p_motif text)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  n integer := 0;
begin
  for r in select p.id from public.politiques p
           where p.client_id = p_client and p.module = 'offload' and p.type_action = 'envoi.email' and p.statut in ('a_valider', 'active')
  loop
    perform private.revoquer_politique(r.id, left(coalesce(nullif(btrim(p_motif), ''), 'Envoi automatique d''OFFLOAD révoqué'), 500));
    n := n + 1;
  end loop;
  if n > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.accord_auto_revoque', 'offload_reglages', p_client::text,
      jsonb_build_object('politiques', n, 'motif', p_motif), null);
  end if;
  return n;
end $function$;

create or replace function public.offload_envoi_auto(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'lire l''envoi automatique');
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  return private.offload_accord_etat(p_client);
end $function$;

-- Le gérant ou un administrateur donne l'accord permanent : une décision d'une personne, jamais du serveur.
create or replace function public.offload_donner_accord_auto(p_client uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  g public.offload_reglages;
  v_id uuid;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''accord de l''envoi automatique se donne par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  select * into g from public.offload_reglages where client_id = p_client;
  if g.client_id is null then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if not g.envoi_auto then
    raise exception 'L''envoi automatique est éteint dans les réglages : rallumez-le avant de donner l''accord.' using errcode = '55000';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('offload.accord_auto:' || p_client::text, 0));
  if not exists (select 1 from public.politiques p where p.client_id = p_client and p.module = 'offload' and p.type_action = 'envoi.email'
                   and (p.statut = 'a_valider' or (p.statut = 'active' and p.fin > now() + interval '30 days'))) then
    insert into public.politiques (client_id, entite_id, module, type_action, libelle, nombre_mensuel, debut, fin)
    values (p_client, null, 'offload', 'envoi.email',
            'OFFLOAD : messages partis sans validation, un par compte et par trimestre, sauf doute ou sujet non autorisé',
            greatest(100, g.plafond_reprises_jour * 31), now(), now() + interval '365 days')
    returning id into v_id;
    perform private.journaliser_module(p_client, 'offload', 'offload.accord_auto_donne', 'offload_reglages', p_client::text,
      jsonb_build_object('politique', v_id, 'par', v_uid), null);
  end if;
  return private.offload_accord_etat(p_client) || jsonb_build_object('proposee', v_id);
end $function$;

create or replace function public.offload_revoquer_accord_auto(p_client uuid, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n integer;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'révoquer l''envoi automatique');
  n := private.offload_revoquer_accord(p_client, p_motif);
  return private.offload_accord_etat(p_client) || jsonb_build_object('revoquees', n);
end $function$;

revoke execute on function private.offload_retenue(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function private.offload_retenue(uuid, uuid, text, text) to service_role;
revoke execute on function private.offload_envoyer(uuid, text, uuid, text, text, jsonb, jsonb, text, uuid) from public, anon, authenticated;
grant execute on function private.offload_envoyer(uuid, text, uuid, text, text, jsonb, jsonb, text, uuid) to service_role;
revoke execute on function private.offload_accord_etat(uuid) from public, anon, authenticated;
grant execute on function private.offload_accord_etat(uuid) to service_role;
revoke execute on function private.offload_revoquer_accord(uuid, text) from public, anon, authenticated;
grant execute on function private.offload_revoquer_accord(uuid, text) to service_role;
revoke execute on function public.offload_envoi_auto(uuid) from public, anon;
grant execute on function public.offload_envoi_auto(uuid) to authenticated, service_role;
revoke execute on function public.offload_donner_accord_auto(uuid) from public, anon;
grant execute on function public.offload_donner_accord_auto(uuid) to authenticated;
revoke execute on function public.offload_revoquer_accord_auto(uuid, text) from public, anon;
grant execute on function public.offload_revoquer_accord_auto(uuid, text) to authenticated, service_role;
revoke execute on function private.offload_preparer_message(uuid, integer) from public, anon, authenticated;
grant execute on function private.offload_preparer_message(uuid, integer) to service_role;
revoke execute on function private.offload_echeances_cycle(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_echeances_cycle(uuid, date) to service_role;
revoke execute on function private.offload_relancer_affaire(uuid, integer, text) from public, anon, authenticated;
grant execute on function private.offload_relancer_affaire(uuid, integer, text) to service_role;
revoke execute on function private.offload_regler(uuid, jsonb) from public, anon;
grant execute on function private.offload_regler(uuid, jsonb) to authenticated, service_role;
