-- 20261023001738 c4_33_affaires_relance_et_chiffrage
-- Source : dépôt : cc6b841261c0330d77ea7978003716befb2b432e omega/modules/offload/migrations/c4_33_affaires_relance_et_chiffrage.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_33_affaires_relance_et_chiffrage.sql @ cc6b841261c0330d77ea7978003716befb2b432e.
-- ═══ omega/modules/offload/migrations/c4_33_affaires_relance_et_chiffrage.sql @ cc6b841261c0330d77ea7978003716befb2b432e
-- c4_33 — OFFLOAD : affaires en plan, relance et chiffrage tenus même sans message (session C4, 23/10/2026)
--
-- Promesses (omega/CHIFFRAGE/offload.md, lignes C:86-88 et C:152) : les commandes arrivées et non reprises sont
-- listées ; le client est relancé après le délai, puis une seule autre fois, puis décision manuelle « avec le montant
-- immobilisé en regard » ; le stock immobilisé est chiffré. Relevé du testeur (O4, banc …c4) : affaire listée, mais
-- aucune relance ni tâche, et valeur inconnue.
--   · Relance : quand OFFLOAD ne peut préparer aucun message (envois du module pas réglés en essai, ou OFFLOAD
--     suspendu), le cycle des affaires ne s'arrête plus : chaque étape passe par une PERSONNE (tâche d'appel, avec la
--     raison), jamais par un message ; la seconde relance et la décision manuelle suivent les mêmes délais.
--   · Chiffrage : une affaire sans valeur prend le montant HT de la pièce du même compte et de même référence (commande
--     ou facture déjà connue d'OFFLOAD) ; la saisie accepte aussi « montant » et « montant_ht » pour la valeur.
-- Aucun envoi n'est préparé hors essai (c4_23 tient toujours).
--
-- Règles de pose : create or replace. Aucun DROP, aucun DELETE.

-- Chiffrer les affaires sans valeur par la pièce connue de même référence. Rend le nombre d'affaires chiffrées.
create or replace function private.offload_chiffrer_affaires(p_client uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n integer;
begin
  update public.offload_affaires a
     set valeur_ht = x.montant, maj_le = now()
    from (select a2.id, (select abs(h.montant_ht) from public.offload_achats h
                         where h.compte_id = a2.compte_id and h.annule_le is null and h.nature in ('commande', 'facture')
                           and lower(btrim(h.reference)) = lower(btrim(a2.reference))
                         order by h.date_achat desc limit 1) as montant
          from public.offload_affaires a2
          where a2.client_id = p_client and a2.valeur_ht is null) x
   where a.id = x.id and x.montant is not null;
  get diagnostics n = row_count;
  return n;
end $function$;

-- Le cycle des affaires : sans message possible, une personne relance ; la valeur se chiffre d'abord.
create or replace function private.offload_affaires_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone private.offload_fuseau(p_client))::date);
  k record;
  n1 integer := 0; n2 integer := 0; nd integer := 0; ne integer := 0;
  -- Une affaire relancée pendant ce passage attend le suivant : jamais deux étapes d'un coup.
  v_debut timestamptz := clock_timestamp();
  v_appel text;
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  -- Sans message possible, la relance passe par une personne (c4_33) : jamais d'envoi hors essai, jamais d'arrêt muet.
  v_appel := case when private.offload_essai_contre_reel(p_client)
                    then 'OFFLOAD ne prépare aucun message : les envois du module ne sont pas réglés en essai'
                  when private.offload_suspendu(p_client) then 'OFFLOAD est suspendu' end;
  perform private.offload_chiffrer_affaires(p_client);
  -- 1. Première relance, après le délai fixé.
  -- Un rappel de retrait n'est pas une sollicitation commerciale : un compte inactif, ou déjà contacté, est prévenu
  -- quand même. Seuls l'arrêt demandé et la fiche fusionnée l'écartent ; un compte suivi en direct par un commercial
  -- ou sur une liste d'exclusion est prévenu par une personne (tâche d'appel), jamais par un message automatique.
  for k in select a.id, a.compte_id, private.offload_ecarte(a.compte_id) as raison from public.offload_affaires a
           where a.client_id = p_client and a.statut = 'en_attente' and a.disponible_le <= v_jour - g.delai_retrait_jours
           order by a.disponible_le loop
    if k.raison like 'Fiche fusionnée%' or k.raison like 'Retiré à sa demande%' then
      ne := ne + 1;
      continue;
    end if;
    begin
      perform private.offload_relancer_affaire(k.id, 1,
        coalesce(case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' or k.raison like 'À vérifier%' then k.raison end, v_appel));
      n1 := n1 + 1;
    exception when others then
      ne := ne + 1;
    end;
  end loop;
  -- 2. Une seule autre, après le délai de relance.
  for k in select a.id, private.offload_ecarte(a.compte_id) as raison from public.offload_affaires a
           where a.client_id = p_client and a.statut = 'relancee_1'
             and (a.relance1_le at time zone private.offload_fuseau(p_client))::date <= v_jour - g.delai_relance_retrait_jours and a.relance1_le < v_debut loop
    begin
      perform private.offload_relancer_affaire(k.id, 2,
        coalesce(case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' or k.raison like 'Retiré à sa demande%'
             or k.raison like 'Fiche fusionnée%' or k.raison like 'À vérifier%' then k.raison end, v_appel));
      n2 := n2 + 1;
    exception when others then
      ne := ne + 1;
    end;
  end loop;
  -- 3. Deux relances sans réponse : décision manuelle, montant immobilisé en regard.
  update public.offload_affaires a set statut = 'decision', maj_le = now(),
         motif = format('Relancé deux fois sans réponse : à décider (%s immobilisés depuis le %s).',
                        coalesce(private.offload_euros(a.valeur_ht), 'valeur inconnue'), private.offload_le(a.disponible_le))
   where a.client_id = p_client and a.statut = 'relancee_2'
     and (a.relance2_le at time zone private.offload_fuseau(p_client))::date <= v_jour - g.delai_relance_retrait_jours and a.relance2_le < v_debut;
  get diagnostics nd = row_count;
  if n1 + n2 + nd > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.affaires', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne), null);
  end if;
  return jsonb_build_object('relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne);
end $function$;

-- La saisie d'une affaire : la valeur se donne aussi en « montant » ou « montant_ht ».
create or replace function private.offload_saisir_affaire(p_compte uuid, p_reference text, p_disponible_le date, p_champs jsonb default '{}'::jsonb)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  p jsonb := coalesce(p_champs, '{}'::jsonb);
  v_inconnus text;
  v_id uuid;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'saisir une affaire');
  select string_agg(x, ', ') into v_inconnus from jsonb_object_keys(p) x where x not in ('type', 'libelle', 'valeur_ht', 'montant', 'montant_ht');
  if v_inconnus is not null then
    raise exception 'Champ d''affaire inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  if private.offload_texte(p_reference, 120) is null or p_disponible_le is null or p_disponible_le > current_date then
    raise exception 'Une affaire a une référence et une date de disponibilité passée.' using errcode = '22023';
  end if;
  if coalesce(p ->> 'type', 'commande') not in ('commande', 'intervention') then
    raise exception 'Une affaire est une commande ou une intervention.' using errcode = '22023';
  end if;
  insert into public.offload_affaires as a (client_id, entite_id, compte_id, type, reference, libelle, disponible_le, valeur_ht, source, vu_le)
  values (c.client_id, c.entite_id, c.id, coalesce(p ->> 'type', 'commande'), private.offload_texte(p_reference, 120),
          private.offload_texte(p ->> 'libelle', 300), p_disponible_le, coalesce(p ->> 'valeur_ht', p ->> 'montant_ht', p ->> 'montant')::numeric, 'saisie', current_date)
  on conflict (client_id, compte_id, reference) do update
    set libelle = coalesce(excluded.libelle, a.libelle), valeur_ht = coalesce(excluded.valeur_ht, a.valeur_ht), maj_le = now()
  returning id into v_id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.affaire_saisie', 'offload_affaires', v_id::text,
    jsonb_build_object('compte', c.id, 'reference', p_reference, 'disponible_le', p_disponible_le, 'champs', p), c.entite_id);
  return v_id;
end $function$;

revoke execute on function private.offload_chiffrer_affaires(uuid) from public, anon, authenticated;
grant execute on function private.offload_chiffrer_affaires(uuid) to service_role;
revoke execute on function private.offload_affaires_cycle(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_affaires_cycle(uuid, date) to service_role;
