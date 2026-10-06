-- c4_08 — OFFLOAD : les affaires restées en plan (session C4, 06/10/2026)
--
-- CE QUE ÇA POSE (lib/produits/capacites/reprise.ts, famille « Affaires restées en plan ») :
--   · public.offload_affaires : une affaire qui attend son client — une COMMANDE arrivée que personne n'est venu
--     reprendre, ou une INTERVENTION terminée et non retirée (un appareil réparé à l'atelier). Sa référence, son
--     libellé, la date depuis laquelle elle est disponible, la VALEUR IMMOBILISÉE (stock HT), et son statut :
--     en_attente → relancee_1 → relancee_2 → decision (décision manuelle), ou retiree, ou close_sans_suite.
--     Importée (jeu « affaires » : la liste de ce qui attend son retrait) ou saisie.
--   · la relance de retrait : après le délai fixé (offload_reglages.delai_retrait_jours, 7 j), un message ; puis UNE
--     seule autre après delai_relance_retrait_jours (7 j) ; puis, sans réponse, « décision manuelle », avec le montant
--     immobilisé en regard (cas limite du site). Le message ne porte AUCUNE mention de paiement, de prix ni de montant :
--     cela relève de CASHD. Par preparer_envoi (validation, verrous, mode du socle) ; sans courriel : tâche d'appel.
--   · une réponse du client arrête les relances de retrait (la conversation revient au magasin) ; « stop » : arrêt.
--   · « Une pièce commandée pour un compte inactif est rattachée à sa fiche » : chaque affaire porte son compte ;
--     public.offload_affaires_compte(compte) la montre dans la fiche, avec le signal du compte.
--   · « Les affaires closes sans suite sont distinguées de celles qui attendent encore » : statut close_sans_suite (par
--     décision) distinct de en_attente / relancée / decision ; une affaire absente du dernier export est signalée
--     (« plus vue depuis le … »), jamais close d'office.
--   · « Le magasin voit en une liste ce qui dort et depuis combien de temps » et « le stock immobilisé par une commande
--     non reprise est chiffré » : public.offload_affaires_liste(client) — jours d'attente, valeur immobilisée, total.
--   · portes : offload_saisir_affaire, offload_retirer_affaire, offload_decider_affaire ; offload_regler accepte les deux
--     délais. Cycle private.offload_affaires_cycle, enchaîné à la nuit et après chaque import.
--
-- Règles de pose : create … if not exists, alter … add column if not exists, create or replace, insert … where not
-- exists. Aucun DROP, aucun DELETE.

alter table public.offload_reglages add column if not exists delai_retrait_jours smallint not null default 7;
alter table public.offload_reglages add column if not exists delai_relance_retrait_jours smallint not null default 7;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offload_reglages_retrait_check') then
    alter table public.offload_reglages add constraint offload_reglages_retrait_check
      check (delai_retrait_jours between 1 and 180 and delai_relance_retrait_jours between 3 and 90);
  end if;
end $$;

create table if not exists public.offload_affaires (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  type text not null default 'commande',
  reference text not null,
  libelle text,
  disponible_le date not null,
  valeur_ht numeric(14,2),
  statut text not null default 'en_attente',
  relance1_le timestamptz,
  relance2_le timestamptz,
  envoi1_id uuid,
  envoi2_id uuid,
  retire_le date,
  decision text,
  decide_par uuid,
  decide_le timestamptz,
  motif text,
  vu_le date,
  source text not null,
  jeu_id uuid,
  cle text,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint offload_affaires_client_id_id_key unique (client_id, id),
  constraint offload_affaires_une_ref unique (client_id, compte_id, reference),
  constraint offload_affaires_compte_fkey foreign key (client_id, compte_id) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_affaires_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint offload_affaires_envoi1_fkey foreign key (client_id, envoi1_id) references public.envois(client_id, id) on delete set null (envoi1_id),
  constraint offload_affaires_envoi2_fkey foreign key (client_id, envoi2_id) references public.envois(client_id, id) on delete set null (envoi2_id),
  constraint offload_affaires_type_check check (type in ('commande', 'intervention')),
  constraint offload_affaires_reference_check check (char_length(btrim(reference)) between 1 and 120),
  constraint offload_affaires_libelle_check check (char_length(libelle) <= 300),
  constraint offload_affaires_valeur_check check (valeur_ht is null or valeur_ht >= 0),
  constraint offload_affaires_statut_check check (statut in ('en_attente', 'relancee_1', 'relancee_2', 'decision', 'repondue', 'retiree', 'close_sans_suite')),
  constraint offload_affaires_decision_check check (decision in ('relancer', 'garder', 'retour_stock', 'sans_suite')),
  constraint offload_affaires_motif_check check (char_length(motif) <= 500),
  constraint offload_affaires_source_check check (source in ('import', 'saisie'))
);
comment on table public.offload_affaires is 'OFFLOAD — une affaire restée en plan : commande arrivée ou intervention terminée, non retirée ; valeur immobilisée ; deux relances de retrait au plus, puis décision manuelle.';
create index if not exists offload_affaires_client_idx on public.offload_affaires (client_id, statut, disponible_le);

alter table public.offload_affaires enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_affaires' and policyname = 'on lit dans son perimetre') then
    create policy "on lit dans son perimetre" on public.offload_affaires for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
end $$;
revoke all on public.offload_affaires from anon, authenticated;
grant select on public.offload_affaires to authenticated;
grant all on public.offload_affaires to service_role;

-- Le modèle d'export : la liste de ce qui attend son retrait.
insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, seuil_anomalies, source)
select 'offload', 'tableur', 'affaires', 1, 'Commandes et interventions en attente de retrait',
       '^(attente|en[_ -]?attente|a[_ -]?retirer|commandes?[_ -]?arrivees?|retraits?)',
       array['Code client', 'N° commande'],
       $j${
         "compte_ref":    {"type": "texte", "obligatoire": true, "entetes": ["Code client", "N° client", "Code tiers", "Compte client"]},
         "reference":     {"type": "texte", "obligatoire": true, "entetes": ["N° commande", "N° OR", "N° bon", "N° réparation", "Référence"]},
         "disponible_le": {"type": "date", "obligatoire": true, "entetes": ["Arrivée", "Date d'arrivée", "Disponible le", "Terminé le", "Date de fin"]},
         "type":          {"type": "texte", "facultative": true, "entetes": ["Type", "Nature"]},
         "libelle":       {"type": "texte", "facultative": true, "entetes": ["Libellé", "Désignation", "Article", "Appareil"]},
         "valeur":        {"type": "decimal", "facultative": true, "entetes": ["Valeur", "Valeur stock", "Montant HT", "Prix d'achat"]},
         "retire_le":     {"type": "date", "facultative": true, "entetes": ["Retiré le", "Livré le", "Date de retrait"]}
       }$j$::jsonb,
       array['compte_ref', 'reference'], false, 1.000,
       'Modèle générique OFFLOAD (C4, 06/10/2026) : ce qui attend son retrait, une affaire par ligne. En-têtes à confirmer sur un vrai export.'
where not exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'affaires' and m.version = 1);

do $$
declare b record;
begin
  for b in select x.id from public.branchements x where x.module = 'offload' and x.logiciel = 'tableur' loop
    if not exists (select 1 from public.branchements_jeux j where j.branchement_id = b.id and j.code = 'affaires') then
      perform private.declarer_jeu(b.id, 'affaires', '{}'::jsonb);
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le message de retrait : aucune mention de paiement, de prix ni de montant (cela relève de CASHD)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_message_retrait(p_affaire uuid, p_rang integer)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_affaires;
  c public.offload_comptes;
  g public.offload_reglages;
  v_org text;
  v_quoi text;
  v_jours integer;
  v_stop constant text := 'Si vous ne souhaitez plus recevoir nos messages, répondez simplement « stop » : nous ne vous écrirons plus.';
begin
  select * into a from public.offload_affaires where id = p_affaire;
  select * into c from public.offload_comptes where id = a.compte_id;
  select * into g from public.offload_reglages where client_id = a.client_id;
  select x.nom into v_org from public.clients x where x.id = a.client_id;
  v_jours := (now() at time zone 'Europe/Paris')::date - a.disponible_le;
  v_quoi := case a.type when 'intervention' then 'votre ' || coalesce(a.libelle, 'appareil') || ' (réf. ' || a.reference || ')'
                        else 'votre commande' || coalesce(' « ' || a.libelle || ' »', '') || ' (réf. ' || a.reference || ')' end;
  -- Phrases sans accord : on ne connaît pas le genre de l'objet réparé.
  return jsonb_build_object(
    'sujet', left(case when p_rang = 2 then 'Rappel : ' else '' end || v_org || ' — '
                  || case a.type when 'intervention' then 'votre appareil est prêt' else 'votre commande est arrivée' end, 300),
    'corps', 'Bonjour' || coalesce(' ' || c.contact, '') || ',' || E'\n\n'
      || case when p_rang = 2
              then format('Je me permets de revenir vers vous : %s vous attend toujours, depuis le %s.', v_quoi, private.offload_date_longue(a.disponible_le))
              when a.type = 'intervention'
              then format('L''intervention sur %s est terminée depuis le %s : tout est prêt.', v_quoi, private.offload_date_longue(a.disponible_le))
              else format('%s est arrivée le %s et vous attend.', 'V' || substr(v_quoi, 2), private.offload_date_longue(a.disponible_le)) end
      || E'\n\n' || 'Vous pouvez passer au magasin aux heures d''ouverture. Si vous préférez convenir d''un moment, répondez simplement à ce message.'
      || E'\n\n' || 'Bien cordialement,' || E'\n' || coalesce(nullif(btrim(g.signature), ''), v_org) || E'\n\n' || v_stop);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le cycle des affaires
-- ─────────────────────────────────────────────────────────────────────────
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
    v_msg := private.offload_message_retrait(a.id, p_rang);
    v_envoi := private.preparer_envoi(a.client_id, 'offload', 'offload_affaires', a.id::text, 'email',
      jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                         'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
      null, '{}'::jsonb, v_msg ->> 'sujet', v_msg ->> 'corps', null::uuid[],
      'offload:affaire:' || a.id::text || ':' || p_rang, a.entite_id, false, false, null::timestamptz, '{}'::jsonb);
    select * into e from public.envois where id = v_envoi;
  end if;
  if v_envoi is null or e.statut = 'bloque' then
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

create or replace function private.offload_affaires_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  k record;
  n1 integer := 0; n2 integer := 0; nd integer := 0; ne integer := 0;
  -- Une affaire relancée pendant ce passage attend le suivant : jamais deux étapes d'un coup.
  v_debut timestamptz := clock_timestamp();
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if private.offload_essai_contre_reel(p_client) then
    return jsonb_build_object('bloque', 'essai_contre_reel');
  end if;
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
        case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' then k.raison end);
      n1 := n1 + 1;
    exception when others then
      ne := ne + 1;
    end;
  end loop;
  -- 2. Une seule autre, après le délai de relance.
  for k in select a.id, private.offload_ecarte(a.compte_id) as raison from public.offload_affaires a
           where a.client_id = p_client and a.statut = 'relancee_1'
             and (a.relance1_le at time zone 'Europe/Paris')::date <= v_jour - g.delai_relance_retrait_jours and a.relance1_le < v_debut loop
    begin
      perform private.offload_relancer_affaire(k.id, 2,
        case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' or k.raison like 'Retiré à sa demande%'
             or k.raison like 'Fiche fusionnée%' then k.raison end);
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
     and (a.relance2_le at time zone 'Europe/Paris')::date <= v_jour - g.delai_relance_retrait_jours and a.relance2_le < v_debut;
  get diagnostics nd = row_count;
  if n1 + n2 + nd > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.affaires', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne), null);
  end if;
  return jsonb_build_object('relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne);
end $function$;

-- Le suivi d'un message de retrait et la réponse du client.
create or replace function private.offload_suivre_envoi_affaire(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_affaires;
  e public.envois;
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
begin
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  select * into a from public.offload_affaires where id = (p_charge ->> 'objet_id')::uuid for update;
  if e.id is null or a.id is null or a.client_id <> e.client_id then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  if v_issue = 'envoye' then
    perform private.journaliser_module(a.client_id, 'offload', 'offload.message_retrait_envoye', 'offload_affaires', a.id::text,
      jsonb_build_object('envoi', e.id, 'rang', case when a.envoi2_id = e.id then 2 else 1 end, 'mode', e.mode), a.entite_id);
    return jsonb_build_object('statut', 'envoye');
  elsif v_issue = 'refuse' then
    update public.offload_affaires set statut = 'decision', maj_le = now(), motif = 'Relance de retrait refusée en validation : à décider.'
     where id = a.id and statut in ('relancee_1', 'relancee_2');
    return jsonb_build_object('statut', 'decision');
  elsif v_issue in ('bloque', 'annule', 'expire', 'echec', 'non_remis') and a.statut in ('relancee_1', 'relancee_2') then
    -- Le message n'est pas parti : une personne prévient le client.
    insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
    select a.client_id, a.entite_id, a.compte_id, 'appel',
           left(format('Prévenir %s : %s %s en attente de retrait', c.nom, a.type, a.reference), 200),
           left(format('Le message de retrait n''est pas parti (%s%s).%s', v_issue, coalesce(', ' || e.verrou, ''),
                       coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
           c.commercial, (now() at time zone 'Europe/Paris')::date
    from public.offload_comptes c where c.id = a.compte_id;
    return jsonb_build_object('statut', v_issue);
  end if;
  return jsonb_build_object('statut', 'ignore');
end $function$;

create or replace function private.offload_reponse_affaire(p_reception bigint, p_affaire uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.receptions;
  a public.offload_affaires;
  c public.offload_comptes;
  v_arret boolean;
begin
  select * into x from public.receptions where id = p_reception;
  select * into a from public.offload_affaires where id = p_affaire for update;
  if a.id is null or a.statut not in ('relancee_1', 'relancee_2', 'decision') then
    return jsonb_build_object('statut', 'sans_effet');
  end if;
  select * into c from public.offload_comptes where id = a.compte_id;
  v_arret := private.offload_demande_arret(x.corps);
  -- La relance encore en validation ne part pas.
  if a.envoi2_id is not null and exists (select 1 from public.envois e where e.id = a.envoi2_id and e.statut in ('a_valider', 'pret')) then
    perform private.annuler_envoi(a.envoi2_id, 'Le client a répondu à la relance de retrait.');
  end if;
  update public.offload_affaires set statut = 'repondue', maj_le = now(),
         motif = case when v_arret then 'Le client a demandé l''arrêt des messages : à traiter au magasin.'
                      else 'Le client a répondu le ' || private.offload_le((x.recu_le at time zone 'Europe/Paris')::date) || ' : la conversation revient au magasin.' end
   where id = a.id;
  if v_arret then
    perform private.opposer(c.client_id, 'desinscription', coalesce(c.email, x.de_adresse), null, c.ref, null,
                            'Demande d''arrêt reçue en réponse à une relance de retrait OFFLOAD.', 'message', null);
    update public.offload_comptes set statut = 'arrete', statut_motif = 'Demande d''arrêt reçue', statut_le = now(), maj_le = now() where id = c.id;
  else
    insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
    values (a.client_id, a.entite_id, a.compte_id, 'repondre', left('Répondre à ' || c.nom || ' (retrait ' || a.reference || ')', 200),
            left(format('%s a répondu à la relance de retrait de %s.', coalesce(c.contact, c.nom), a.reference), 4000),
            c.commercial, (now() at time zone 'Europe/Paris')::date + 1);
  end if;
  perform private.journaliser_module(a.client_id, 'offload', 'offload.reponse_retrait', 'offload_affaires', a.id::text,
    jsonb_build_object('reception', x.id, 'arret', v_arret), a.entite_id);
  return jsonb_build_object('statut', case when v_arret then 'arret' else 'reponse' end, 'affaire', a.id);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les portes
-- ─────────────────────────────────────────────────────────────────────────
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
  select string_agg(x, ', ') into v_inconnus from jsonb_object_keys(p) x where x not in ('type', 'libelle', 'valeur_ht');
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
          private.offload_texte(p ->> 'libelle', 300), p_disponible_le, (p ->> 'valeur_ht')::numeric, 'saisie', current_date)
  on conflict (client_id, compte_id, reference) do update
    set libelle = coalesce(excluded.libelle, a.libelle), valeur_ht = coalesce(excluded.valeur_ht, a.valeur_ht), maj_le = now()
  returning id into v_id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.affaire_saisie', 'offload_affaires', v_id::text,
    jsonb_build_object('compte', c.id, 'reference', p_reference, 'disponible_le', p_disponible_le, 'champs', p), c.entite_id);
  return v_id;
end $function$;

create or replace function private.offload_retirer_affaire(p_affaire uuid, p_retire_le date default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare a public.offload_affaires;
begin
  select * into a from public.offload_affaires where id = p_affaire for update;
  if not found then
    raise exception 'Affaire introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(a.client_id, a.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'noter un retrait');
  if a.statut in ('retiree', 'close_sans_suite') then
    return;
  end if;
  update public.offload_affaires set statut = 'retiree', retire_le = coalesce(p_retire_le, (now() at time zone 'Europe/Paris')::date), maj_le = now()
  where id = a.id;
  perform private.journaliser_module(a.client_id, 'offload', 'offload.affaire_retiree', 'offload_affaires', a.id::text,
    jsonb_build_object('reference', a.reference, 'retire_le', coalesce(p_retire_le, current_date), 'avant', a.statut), a.entite_id);
end $function$;

-- La décision manuelle : relancer encore (une fois, par une personne), garder, remettre en stock, clore sans suite.
create or replace function private.offload_decider_affaire(p_affaire uuid, p_decision text, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_affaires;
  v_motif text := private.offload_texte(p_motif, 500);
begin
  select * into a from public.offload_affaires where id = p_affaire for update;
  if not found then
    raise exception 'Affaire introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(a.client_id, a.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'décider d''une affaire');
  if p_decision not in ('relancer', 'garder', 'retour_stock', 'sans_suite') then
    raise exception 'Décision : relancer, garder, retour_stock ou sans_suite.' using errcode = '22023';
  end if;
  if v_motif is null then
    raise exception 'Une décision dit pourquoi.' using errcode = '22023';
  end if;
  if a.statut in ('retiree', 'close_sans_suite') then
    raise exception 'Cette affaire est déjà close.' using errcode = '55000';
  end if;
  update public.offload_affaires set
    decision = p_decision, decide_par = (select auth.uid()), decide_le = now(), motif = v_motif, maj_le = now(),
    statut = case p_decision when 'relancer' then 'en_attente' when 'garder' then 'decision' else 'close_sans_suite' end,
    relance1_le = case when p_decision = 'relancer' then null else relance1_le end,
    relance2_le = case when p_decision = 'relancer' then null else relance2_le end
  where id = a.id;
  -- « relancer » : une personne a décidé de reprendre le cycle ; la date de disponibilité étant passée, la première
  -- relance repart au prochain passage (un nouveau message, en validation comme les autres).
  perform private.journaliser_module(a.client_id, 'offload', 'offload.affaire_decidee', 'offload_affaires', a.id::text,
    jsonb_build_object('decision', p_decision, 'motif', v_motif, 'avant', a.statut, 'valeur_ht', a.valeur_ht), a.entite_id);
end $function$;

create or replace function public.offload_saisir_affaire(p_compte uuid, p_reference text, p_disponible_le date, p_champs jsonb default '{}'::jsonb)
 returns uuid language sql set search_path to ''
as $function$ select private.offload_saisir_affaire(p_compte, p_reference, p_disponible_le, p_champs) $function$;
create or replace function public.offload_retirer_affaire(p_affaire uuid, p_retire_le date default null)
 returns void language sql set search_path to ''
as $function$ select private.offload_retirer_affaire(p_affaire, p_retire_le) $function$;
create or replace function public.offload_decider_affaire(p_affaire uuid, p_decision text, p_motif text)
 returns void language sql set search_path to ''
as $function$ select private.offload_decider_affaire(p_affaire, p_decision, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Les lectures : ce qui dort, et depuis combien de temps ; les affaires d'un compte
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.offload_affaires_liste(p_client uuid default null)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  with moi as (
    select coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid()) order by c.client_id limit 1)) as client_id
  ), dort as (
    select a.*, k.nom as compte_nom, s.niveau as compte_niveau, current_date - a.disponible_le as jours,
           (select max(x.vu_le) from public.offload_affaires x where x.client_id = a.client_id and x.source = 'import') as dernier_export
    from public.offload_affaires a
    join public.offload_comptes k on k.id = a.compte_id
    left join public.offload_signaux s on s.compte_id = a.compte_id
    where a.client_id = (select client_id from moi) and a.statut in ('en_attente', 'relancee_1', 'relancee_2', 'decision', 'repondue')
  )
  select jsonb_build_object(
    'total', jsonb_build_object('affaires', (select count(*) from dort), 'valeur_ht', (select coalesce(sum(valeur_ht), 0) from dort),
                                'a_decider', (select count(*) from dort where statut = 'decision'),
                                'closes_sans_suite', (select count(*) from public.offload_affaires a where a.client_id = (select client_id from moi)
                                                      and a.statut = 'close_sans_suite')),
    'affaires', coalesce((select jsonb_agg(jsonb_build_object(
        'id', d.id, 'type', d.type, 'reference', d.reference, 'libelle', d.libelle, 'compte_id', d.compte_id, 'compte_nom', d.compte_nom,
        'compte_niveau', d.compte_niveau, 'disponible_le', d.disponible_le, 'jours', d.jours, 'valeur_ht', d.valeur_ht, 'statut', d.statut,
        'motif', d.motif, 'plus_vue', d.source = 'import' and d.vu_le < d.dernier_export) order by d.jours desc, d.valeur_ht desc nulls last)
      from dort d), '[]'::jsonb))
$function$;

create or replace function public.offload_affaires_compte(p_compte uuid)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  select coalesce(jsonb_agg((to_jsonb(a) - 'client_id' - 'cle') || jsonb_build_object('jours', current_date - a.disponible_le)
                            order by a.statut in ('retiree', 'close_sans_suite'), a.disponible_le), '[]'::jsonb)
  from public.offload_affaires a where a.compte_id = p_compte
$function$;



-- ─────────────────────────────────────────────────────────────────────────
-- Les fonctions du module qui apprennent les affaires (recopiées de leur dernière version, puis étendues)
-- ─────────────────────────────────────────────────────────────────────────

-- L'import lit aussi le jeu « affaires ».
create or replace function private.offload_appliquer_releve(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  b public.branchements;
  rl public.releves;
  i record;
  v_entite uuid;
  v_total integer;
  v_ok integer;
  v_raison text;
  v_comptes_nouveaux integer;
  v_achats_nouveaux integer;
  v_achats_modifies integer;
  v_jeux jsonb := '{}'::jsonb;
  v_douteux boolean := false;
begin
  select * into b from public.branchements where id = (p_charge ->> 'branchement')::uuid;
  if not found or b.module <> 'offload' then
    raise exception 'Branchement introuvable ou étranger à OFFLOAD.' using errcode = 'P0002';
  end if;
  select * into rl from public.releves where id = (p_charge ->> 'releve')::uuid and branchement_id = b.id;
  if not found then
    raise exception 'Relevé introuvable.' using errcode = 'P0002';
  end if;
  if not exists (select 1 from public.offload_reglages g where g.client_id = b.client_id) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  v_entite := private.offload_entite(b.client_id, b.entite_id);

  if not exists (select 1 from public.instantanes x where x.releve_id = rl.id and x.statut = 'a_appliquer') then
    return jsonb_build_object('releve', rl.id, 'deja_applique', true);
  end if;

  -- Le référentiel d'abord, pour que les ventes trouvent leurs comptes avec leur vrai nom.
  for i in
    select x.id, j.code, j.id as jeu_id
    from public.instantanes x join public.branchements_jeux j on j.id = x.jeu_id
    where x.releve_id = rl.id and x.statut = 'a_appliquer'
    order by case j.code when 'clients' then 0 when 'ventes' then 1 when 'equipements' then 2 when 'contrats' then 3
                          when 'interventions' then 4 when 'affaires' then 5 else 6 end, x.recu_le, x.id
  loop
    v_comptes_nouveaux := 0;
    v_achats_nouveaux := 0;
    v_achats_modifies := 0;

    if i.code = 'clients' then
      select count(*) into v_total from public.instantanes_lignes l where l.instantane_id = i.id;
      with lus as (
        select distinct on (ref) *
        from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref, l.valeurs as v, l.n
              from public.instantanes_lignes l where l.instantane_id = i.id) z
        where ref is not null
        order by ref, n desc
      ), ecrits as (
        insert into public.offload_comptes as c (client_id, entite_id, ref, nom, contact, email, telephone, commercial, groupe,
                                                 ville, secteur, source, jeu_id)
        select b.client_id, v_entite, lus.ref, coalesce(private.offload_texte(v ->> 'nom', 200), lus.ref),
               private.offload_texte(v ->> 'contact', 200), private.offload_texte(v ->> 'email', 320),
               private.offload_texte(v ->> 'telephone', 40), private.offload_texte(v ->> 'commercial', 120),
               private.offload_texte(v ->> 'groupe', 200), private.offload_texte(v ->> 'ville', 120),
               private.offload_texte(v ->> 'secteur', 120), 'import', i.jeu_id
        from lus
        on conflict (client_id, entite_id, ref) do update
          set nom = excluded.nom,
              contact = coalesce(excluded.contact, c.contact),
              email = coalesce(excluded.email, c.email),
              telephone = coalesce(excluded.telephone, c.telephone),
              commercial = coalesce(excluded.commercial, c.commercial),
              groupe = coalesce(excluded.groupe, c.groupe),
              ville = coalesce(excluded.ville, c.ville),
              secteur = coalesce(excluded.secteur, c.secteur),
              maj_le = now()
          where (c.nom, c.contact, c.email, c.telephone, c.commercial, c.groupe, c.ville, c.secteur)
                is distinct from (excluded.nom, coalesce(excluded.contact, c.contact), coalesce(excluded.email, c.email),
                                  coalesce(excluded.telephone, c.telephone), coalesce(excluded.commercial, c.commercial),
                                  coalesce(excluded.groupe, c.groupe), coalesce(excluded.ville, c.ville),
                                  coalesce(excluded.secteur, c.secteur))
        returning (xmax = 0) as nouveau
      )
      select count(*) filter (where nouveau), count(*) filter (where not nouveau)
        into v_comptes_nouveaux, v_achats_modifies from ecrits;
      perform private.acquitter_instantane(i.id, 'applique');
      v_jeux := v_jeux || jsonb_build_object('clients', jsonb_build_object(
        'lignes', v_total, 'comptes_nouveaux', v_comptes_nouveaux, 'comptes_modifies', v_achats_modifies));

    elsif i.code = 'ventes' then
      select count(*), count(*) filter (where private.offload_ligne_vente_ok(l.valeurs))
        into v_total, v_ok
      from public.instantanes_lignes l where l.instantane_id = i.id;

      -- Le garde-fou : un export dont plus de la moitié des lignes est illisible n'est pas appliqué.
      if v_total > 0 and v_ok * 2 < v_total then
        v_raison := format('Sur %s lignes, %s seulement ont un code client, une date et un montant lisibles : '
                           'l''export n''est pas appliqué. Vérifiez les colonnes du fichier.', v_total, v_ok);
        perform private.acquitter_instantane(i.id, 'douteux', v_raison);
        perform private.journaliser_module(b.client_id, 'offload', 'offload.import_douteux', 'releves', rl.id::text,
          jsonb_build_object('releve', rl.id, 'instantane', i.id, 'jeu', 'ventes', 'lignes', v_total, 'exploitables', v_ok),
          v_entite);
        v_douteux := true;
        v_jeux := v_jeux || jsonb_build_object('ventes', jsonb_build_object('douteux', v_raison, 'lignes', v_total));
        continue;
      end if;

      -- Les comptes que les ventes citent et que le référentiel ne connaît pas encore.
      with lus as (
        select distinct on (ref) *
        from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref, l.valeurs as v, l.n
              from public.instantanes_lignes l
              where l.instantane_id = i.id and private.offload_ligne_vente_ok(l.valeurs)) z
        order by ref, (private.offload_texte(v ->> 'compte_nom', 200) is not null) desc, n desc
      ), ecrits as (
        insert into public.offload_comptes as c (client_id, entite_id, ref, nom, email, telephone, commercial, groupe, source, jeu_id)
        select b.client_id, v_entite, lus.ref, coalesce(private.offload_texte(v ->> 'compte_nom', 200), lus.ref),
               private.offload_texte(v ->> 'email', 320), private.offload_texte(v ->> 'telephone', 40),
               private.offload_texte(v ->> 'commercial', 120), private.offload_texte(v ->> 'groupe', 200), 'import', i.jeu_id
        from lus
        on conflict (client_id, entite_id, ref) do update
          set nom = case when c.nom = c.ref and excluded.nom <> excluded.ref then excluded.nom else c.nom end,
              email = coalesce(c.email, excluded.email),
              telephone = coalesce(c.telephone, excluded.telephone),
              commercial = coalesce(c.commercial, excluded.commercial),
              groupe = coalesce(c.groupe, excluded.groupe),
              maj_le = now()
          where (c.nom = c.ref and excluded.nom <> excluded.ref)
             or (c.email is null and excluded.email is not null)
             or (c.telephone is null and excluded.telephone is not null)
             or (c.commercial is null and excluded.commercial is not null)
             or (c.groupe is null and excluded.groupe is not null)
        returning (xmax = 0) as nouveau
      )
      select count(*) filter (where nouveau) into v_comptes_nouveaux from ecrits;

      -- Les achats. Un achat est une PIÈCE : un client, une date, un numéro de pièce. Un export ligne à ligne
      -- (plusieurs lignes par facture) est additionné pièce par pièce. La clé est relue (date normalisée), elle
      -- ne dépend ni de l'ordre du fichier ni de la façon dont le logiciel écrit ses dates : un export rejoué,
      -- trié autrement ou corrigé met à jour la même pièce, il ne la double jamais.
      with lignes as (
        select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref,
               private.offload_lire_date(l.valeurs ->> 'date') as d,
               private.offload_texte(l.valeurs ->> 'reference', 120) as piece,
               private.offload_nature(l.valeurs ->> 'nature') as nat,
               private.offload_lire_montant(l.valeurs ->> 'montant') as m,
               private.offload_texte(l.valeurs ->> 'libelle', 500) as lib,
               l.n
        from public.instantanes_lignes l
        where l.instantane_id = i.id and private.offload_ligne_vente_ok(l.valeurs)
      ), lus as (
        select 'p1:' || ref || '|' || d::text || '|' || coalesce(piece, '') as k, ref, d, piece,
               sum(case when nat = 'avoir' then -abs(m) else m end) as montant,
               case when bool_and(nat = 'avoir') then 'avoir'
                    when bool_and(nat in ('commande', 'avoir')) and bool_or(nat = 'commande') then 'commande'
                    else 'facture' end as nature,
               left(string_agg(distinct lib, ' · '), 500) as lib
        from lignes
        group by ref, d, piece
      ), ecrits as (
        insert into public.offload_achats as a (client_id, entite_id, compte_id, date_achat, montant_ht, reference, libelle,
                                                nature, source, jeu_id, cle)
        select b.client_id, v_entite, c.id, lus.d, round(lus.montant, 2), lus.piece, lus.lib, lus.nature, 'import', i.jeu_id, lus.k
        from lus
        join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = lus.ref
        on conflict (jeu_id, cle) do update
          set compte_id = excluded.compte_id, date_achat = excluded.date_achat, montant_ht = excluded.montant_ht,
              reference = excluded.reference, libelle = excluded.libelle, nature = excluded.nature, maj_le = now()
          where (a.compte_id, a.date_achat, a.montant_ht, a.reference, a.libelle, a.nature)
                is distinct from (excluded.compte_id, excluded.date_achat, excluded.montant_ht, excluded.reference,
                                  excluded.libelle, excluded.nature)
        returning (xmax = 0) as nouveau
      )
      select count(*) filter (where nouveau), count(*) filter (where not nouveau)
        into v_achats_nouveaux, v_achats_modifies from ecrits;

      perform private.acquitter_instantane(i.id, 'applique');
      v_jeux := v_jeux || jsonb_build_object('ventes', jsonb_build_object(
        'lignes', v_total, 'ecartees', v_total - v_ok, 'comptes_nouveaux', v_comptes_nouveaux,
        'achats_nouveaux', v_achats_nouveaux, 'achats_modifies', v_achats_modifies));

    elsif i.code in ('equipements', 'contrats', 'interventions', 'affaires') then
      select count(*) into v_total from public.instantanes_lignes l where l.instantane_id = i.id;
      -- Les comptes cités et pas encore connus (le référentiel viendra les nommer).
      insert into public.offload_comptes (client_id, entite_id, ref, nom, source, jeu_id)
      select distinct b.client_id, v_entite, z.ref, z.ref, 'import', i.jeu_id
      from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as ref from public.instantanes_lignes l where l.instantane_id = i.id) z
      where z.ref is not null
      on conflict (client_id, entite_id, ref) do nothing;
      get diagnostics v_comptes_nouveaux = row_count;

      if i.code = 'equipements' then
        with lus as (
          select distinct on (c.id, z.eref) c.id as compte_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_texte(l.valeurs ->> 'ref', 120) as eref,
                       l.valeurs as v, l.cle, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.eref is not null and private.offload_texte(z.v ->> 'designation', 200) is not null
          order by c.id, z.eref, z.n desc
        ), ecrits as (
          insert into public.offload_equipements as q (client_id, entite_id, compte_id, ref, designation, site, type_entretien, periodicite_mois,
                                                       nature, derniere_intervention, mise_en_service, source, jeu_id, cle)
          select b.client_id, v_entite, lus.compte_id, lus.eref, private.offload_texte(lus.v ->> 'designation', 200),
                 private.offload_texte(lus.v ->> 'site', 200), private.offload_texte(lus.v ->> 'type_entretien', 200),
                 coalesce(private.offload_lire_periodicite(lus.v ->> 'periodicite_mois'), 12), private.offload_lire_nature(lus.v ->> 'nature'),
                 private.offload_lire_date(lus.v ->> 'derniere_intervention'), private.offload_lire_date(lus.v ->> 'mise_en_service'),
                 'import', i.jeu_id, lus.cle
          from lus
          on conflict (client_id, compte_id, ref) do update
            set designation = excluded.designation, site = coalesce(excluded.site, q.site),
                type_entretien = coalesce(excluded.type_entretien, q.type_entretien), periodicite_mois = excluded.periodicite_mois,
                nature = excluded.nature, derniere_intervention = greatest(q.derniere_intervention, excluded.derniere_intervention),
                mise_en_service = coalesce(excluded.mise_en_service, q.mise_en_service), maj_le = now()
            where (q.designation, q.site, q.type_entretien, q.periodicite_mois, q.nature, q.derniere_intervention)
                  is distinct from (excluded.designation, coalesce(excluded.site, q.site), coalesce(excluded.type_entretien, q.type_entretien),
                                    excluded.periodicite_mois, excluded.nature, greatest(q.derniere_intervention, excluded.derniere_intervention))
          returning (xmax = 0) as nouveau
        )
        select count(*) filter (where nouveau), count(*) filter (where not nouveau) into v_achats_nouveaux, v_achats_modifies from ecrits;
      elsif i.code = 'contrats' then
        with lus as (
          select distinct on (z.num) c.id as compte_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_texte(l.valeurs ->> 'numero', 120) as num,
                       l.valeurs as v, l.cle, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.num is not null and private.offload_lire_date(z.v ->> 'fin') is not null
          order by z.num, z.n desc
        ), ecrits as (
          insert into public.offload_contrats as k (client_id, entite_id, compte_id, equipement_id, numero, libelle, debut, fin, reconduction,
                                                    source, jeu_id, cle)
          select b.client_id, v_entite, lus.compte_id,
                 (select q.id from public.offload_equipements q where q.compte_id = lus.compte_id
                    and q.ref = private.offload_texte(lus.v ->> 'equipement_ref', 120)),
                 lus.num, private.offload_texte(lus.v ->> 'libelle', 300), private.offload_lire_date(lus.v ->> 'debut'),
                 private.offload_lire_date(lus.v ->> 'fin'), private.offload_lire_reconduction(lus.v ->> 'reconduction'), 'import', i.jeu_id, lus.cle
          from lus
          on conflict (client_id, numero) do update
            set fin = excluded.fin, libelle = coalesce(excluded.libelle, k.libelle), debut = coalesce(excluded.debut, k.debut),
                reconduction = excluded.reconduction, equipement_id = coalesce(excluded.equipement_id, k.equipement_id),
                statut = case when excluded.fin > k.fin then 'actif' else k.statut end, maj_le = now()
            where (k.fin, k.libelle, k.debut, k.reconduction) is distinct from (excluded.fin, coalesce(excluded.libelle, k.libelle),
                                                                                coalesce(excluded.debut, k.debut), excluded.reconduction)
          returning (xmax = 0) as nouveau
        )
        select count(*) filter (where nouveau), count(*) filter (where not nouveau) into v_achats_nouveaux, v_achats_modifies from ecrits;
      elsif i.code = 'affaires' then
        -- Ce qui attend son retrait : une affaire par compte et référence ; vu_le dit qu'elle figure au dernier export.
        -- Une affaire absente d'un export n'est jamais close d'office : la liste la signale « plus vue ».
        with lus as (
          select distinct on (c.id, z.ref) c.id as compte_id, c.entite_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_texte(l.valeurs ->> 'reference', 120) as ref,
                       private.offload_lire_date(l.valeurs ->> 'disponible_le') as d, private.offload_lire_date(l.valeurs ->> 'retire_le') as r,
                       l.valeurs as v, l.cle, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.ref is not null and z.d between date '1990-01-01' and current_date
          order by c.id, z.ref, z.n desc
        ), ecrits as (
          insert into public.offload_affaires as a (client_id, entite_id, compte_id, type, reference, libelle, disponible_le, valeur_ht,
                                                    statut, retire_le, vu_le, source, jeu_id, cle)
          select b.client_id, lus.entite_id, lus.compte_id,
                 case when lus.v ->> 'type' ~* '(r[ée]par|interv|atelier|sav)' then 'intervention' else 'commande' end,
                 lus.ref, private.offload_texte(lus.v ->> 'libelle', 300), lus.d, private.offload_lire_montant(lus.v ->> 'valeur'),
                 case when lus.r is not null then 'retiree' else 'en_attente' end, lus.r, current_date, 'import', i.jeu_id, lus.cle
          from lus
          on conflict (client_id, compte_id, reference) do update
            set libelle = coalesce(excluded.libelle, a.libelle), valeur_ht = coalesce(excluded.valeur_ht, a.valeur_ht),
                disponible_le = case when a.statut = 'en_attente' then excluded.disponible_le else a.disponible_le end,
                retire_le = coalesce(a.retire_le, excluded.retire_le),
                statut = case when excluded.retire_le is not null and a.statut not in ('retiree', 'close_sans_suite') then 'retiree' else a.statut end,
                vu_le = current_date, jeu_id = excluded.jeu_id, cle = excluded.cle, maj_le = now()
          returning (xmax = 0) as nouveau
        )
        select count(*) filter (where nouveau), count(*) filter (where not nouveau) into v_achats_nouveaux, v_achats_modifies from ecrits;
      else
        -- Une intervention se rattache à son équipement par le n° de série (et le code client s'il est donné).
        with lus as (
          select distinct on (q.id, z.d) q.id as equipement_id, q.compte_id, q.entite_id, z.*
          from (select private.offload_texte(l.valeurs ->> 'equipement_ref', 120) as eref, private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref,
                       private.offload_lire_date(l.valeurs ->> 'date') as d, l.valeurs as v, l.n
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_equipements q on q.client_id = b.client_id and q.ref = z.eref
          join public.offload_comptes c on c.id = q.compte_id and (z.cref is null or c.ref = z.cref)
          where z.d between date '1990-01-01' and current_date
          order by q.id, z.d, z.n desc
        ), ecrits as (
          insert into public.offload_interventions (client_id, entite_id, compte_id, equipement_id, le, nature, reference, source, jeu_id, cle)
          select b.client_id, lus.entite_id, lus.compte_id, lus.equipement_id, lus.d,
                 case when lus.v ->> 'nature' ~* 'contr[ôo]le' then 'controle' when lus.v ->> 'nature' ~* '(r[ée]par|d[ée]pann)' then 'reparation'
                      when lus.v ->> 'nature' ~* '(install|mise en service)' then 'installation' else 'entretien' end,
                 private.offload_texte(lus.v ->> 'reference', 120), 'import', i.jeu_id, 'i:' || lus.equipement_id::text || '|' || lus.d::text
          from lus
          on conflict (jeu_id, cle) do nothing
          returning 1
        )
        select count(*), 0 into v_achats_nouveaux, v_achats_modifies from ecrits;
      end if;
      perform private.acquitter_instantane(i.id, 'applique');
      v_jeux := v_jeux || jsonb_build_object(i.code, jsonb_build_object('lignes', v_total, 'comptes_nouveaux', v_comptes_nouveaux,
                                                                         'nouveaux', v_achats_nouveaux, 'modifies', v_achats_modifies));

    else
      -- Un jeu que le module ne lit pas : appliqué tel quel, sans effet.
      perform private.acquitter_instantane(i.id, 'applique');
    end if;
  end loop;

  perform private.journaliser_module(b.client_id, 'offload', 'offload.import_applique', 'releves', rl.id::text,
    jsonb_build_object('releve', rl.id, 'jeux', v_jeux, 'douteux', v_douteux), v_entite);
  return jsonb_build_object('releve', rl.id, 'jeux', v_jeux, 'douteux', v_douteux);
end $function$;

-- Le passage du module : après un import, détection, échéances, puis affaires.
create or replace function private.offload_traiter_travaux(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  r jsonb;
  n_ok integer := 0;
  n_ko integer := 0;
begin
  for t in
    select * from private.prendre_travaux(array['offload.appliquer_releve', 'offload.envoi', 'offload.reception'], p_nombre,
                                          interval '10 minutes', 'offload-sql')
  loop
    begin
      r := case t.genre
             when 'offload.appliquer_releve' then private.offload_appliquer_releve(t.charge)
             when 'offload.envoi' then private.offload_suivre_envoi(t.charge)
             when 'offload.reception' then private.offload_lire_reponse(t.charge)
           end;
      if t.genre = 'offload.appliquer_releve' and t.client_id is not null and not coalesce((r ->> 'deja_applique')::boolean, false) then
        r := r || jsonb_build_object('detection', private.offload_detecter(t.client_id, null),
                                     'echeances', private.offload_echeances_cycle(t.client_id, null),
                                     'affaires', private.offload_affaires_cycle(t.client_id, null));
      end if;
      perform private.finir_travail(t.id, r);
      n_ok := n_ok + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 2000), true);
      n_ko := n_ko + 1;
    end;
  end loop;
  return jsonb_build_object('faits', n_ok, 'echecs', n_ko);
end $function$;

-- Le suivi des envois : un message de retrait a son propre suivi.
create or replace function private.offload_suivre_envoi(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
  e public.envois;
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
  v_rang integer;
begin
  if p_charge ->> 'objet_type' = 'offload_affaires' and p_charge ->> 'envoi' is not null then
    return private.offload_suivre_envoi_affaire(p_charge);
  end if;
  if p_charge ->> 'objet_type' = 'offload_echeances' and p_charge ->> 'envoi' is not null then
    return private.offload_suivre_envoi_echeance(p_charge);
  end if;
  if p_charge ->> 'objet_type' is distinct from 'offload_reprises' or p_charge ->> 'envoi' is null then
    return jsonb_build_object('statut', 'ignore');
  end if;
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  select * into r from public.offload_reprises where id = (p_charge ->> 'objet_id')::uuid for update;
  if e.id is null or r.id is null or r.client_id <> e.client_id then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  v_rang := case when r.envoi1_id = e.id then 1 when r.envoi2_id = e.id then 2 end;
  if v_rang is null or r.statut in ('repondue', 'close') then
    return jsonb_build_object('statut', 'sans_effet', 'reprise', r.statut);
  end if;

  if v_issue = 'envoye' then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'envoyee', envoye1_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut in ('a_valider', 'appel');
    else
      update public.offload_reprises set statut = 'relancee', envoye2_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut = 'relance_a_valider';
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_envoye', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'mode', e.mode), r.entite_id);
    return jsonb_build_object('statut', 'envoye', 'rang', v_rang);
  elsif v_issue = 'refuse' then
    -- Refusé en validation : une personne a dit non, la reprise s'arrête là.
    perform private.offload_clore(r.id, 'refusee', 'Le message de rang ' || v_rang || ' a été refusé en validation.');
    return jsonb_build_object('statut', 'refusee', 'rang', v_rang);
  elsif v_issue in ('bloque', 'annule', 'expire', 'echec', 'non_remis') then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'appel', maj_le = now(),
             motif = left(format('Le message n''est pas parti (%s%s) : la reprise passe par l''appel.', v_issue,
                                 coalesce(', ' || e.verrou, '')), 500)
       where id = r.id;
    else
      -- La relance ne part pas : le compte sort du cycle, l'appel reste.
      perform private.offload_clore(r.id, 'sans_reponse', format('La relance n''est pas partie (%s%s).', v_issue, coalesce(', ' || e.verrou, '')));
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_non_parti', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'issue', v_issue, 'verrou', e.verrou), r.entite_id);
    return jsonb_build_object('statut', v_issue, 'rang', v_rang);
  end if;
  return jsonb_build_object('statut', 'ignore');
end $function$;

-- La lecture des réponses : une réponse à un message de retrait arrête les relances de retrait.
create or replace function private.offload_lire_reponse(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.receptions;
  r public.offload_reprises;
  c public.offload_comptes;
  e public.envois;
  v_arret boolean;
begin
  if (p_charge ->> 'reception') !~ '^[0-9]+$' then
    return jsonb_build_object('statut', 'ignore');
  end if;
  select * into x from public.receptions where id = (p_charge ->> 'reception')::bigint;
  if x.id is null or not exists (select 1 from public.offload_reglages g where g.client_id = x.client_id) then
    return jsonb_build_object('statut', 'ignore');
  end if;
  -- 0. La réponse à un message de retrait (c4_08).
  if x.en_reponse_a is not null then
    select * into e from public.envois where id = x.en_reponse_a and client_id = x.client_id and module = 'offload'
                                         and objet_type = 'offload_affaires';
    if e.id is not null then
      return private.offload_reponse_affaire(x.id, e.objet_id::uuid);
    end if;
  end if;
  -- 1. La réponse à un envoi d'OFFLOAD.
  if x.en_reponse_a is not null then
    select * into e from public.envois where id = x.en_reponse_a and client_id = x.client_id and module = 'offload'
                                         and objet_type = 'offload_reprises';
    if e.id is not null then
      select * into r from public.offload_reprises where id = e.objet_id::uuid for update;
    end if;
  end if;
  -- 2. À défaut, l'adresse d'un compte dont une reprise attend.
  if r.id is null and x.canal = 'email' and nullif(btrim(x.de_adresse), '') is not null then
    select p.* into r from public.offload_reprises p join public.offload_comptes k on k.id = p.compte_id
    where p.client_id = x.client_id and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
      and lower(btrim(k.email)) = lower(btrim(x.de_adresse))
    order by p.cree_le desc limit 1;
  end if;
  if r.id is null then
    -- À défaut encore, l'adresse d'un compte dont une affaire a été relancée (c4_08).
    if x.canal = 'email' and nullif(btrim(x.de_adresse), '') is not null then
      return coalesce((select private.offload_reponse_affaire(x.id, a.id)
                       from public.offload_affaires a join public.offload_comptes k on k.id = a.compte_id
                       where a.client_id = x.client_id and a.statut in ('relancee_1', 'relancee_2', 'decision')
                         and lower(btrim(k.email)) = lower(btrim(x.de_adresse))
                       order by a.maj_le desc limit 1), jsonb_build_object('statut', 'ignore'));
    end if;
    return jsonb_build_object('statut', 'ignore');
  end if;
  if r.reception_id is not null then
    return jsonb_build_object('statut', 'deja_lue', 'reprise', r.id);
  end if;
  select * into c from public.offload_comptes where id = r.compte_id for update;
  v_arret := private.offload_demande_arret(x.corps);

  update public.offload_reprises set reception_id = x.id, repondu_le = x.recu_le, maj_le = now() where id = r.id;
  perform private.offload_clore(r.id, case when v_arret then 'arret' else 'reponse' end,
    case when v_arret then 'Le client a demandé à ne plus être sollicité.' else 'Le client a répondu : la conversation revient à votre équipe.' end);

  if v_arret then
    update public.offload_comptes set statut = 'arrete', statut_motif = 'Demande d''arrêt reçue le ' || private.offload_le((x.recu_le at time zone 'Europe/Paris')::date),
           statut_le = now(), maj_le = now() where id = c.id;
    perform private.opposer(c.client_id, 'desinscription', coalesce(c.email, x.de_adresse), null, c.ref, null,
                            'Demande d''arrêt reçue en réponse à une reprise OFFLOAD.', 'message', null);
  else
    -- La relance en attente ne part pas : le socle bloque les envois en attente vers cette adresse.
    perform private.opposer(c.client_id, 'pause', coalesce(c.email, x.de_adresse), 'email', null, now() + interval '30 days',
                            'Le client a répondu à une reprise OFFLOAD : la conversation revient à l''équipe.', 'message', null);
    insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
    values (c.client_id, c.entite_id, c.id, r.id, 'repondre', left('Répondre à ' || c.nom, 200),
            left(format('%s a répondu le %s%s.', coalesce(c.contact, c.nom), private.offload_le((x.recu_le at time zone 'Europe/Paris')::date),
                        coalesce(' : « ' || left(regexp_replace(coalesce(x.sujet, ''), '\s+', ' ', 'g'), 120) || ' »', '')), 4000),
            c.commercial, (now() at time zone 'Europe/Paris')::date + 1)
    on conflict do nothing;
  end if;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.reponse_recue', 'offload_reprises', r.id::text,
    jsonb_build_object('compte', c.id, 'reception', x.id, 'arret', v_arret), c.entite_id);
  return jsonb_build_object('statut', case when v_arret then 'arret' else 'reponse' end, 'reprise', r.id);
end $function$;

-- Le point du matin : avec les affaires à décider et le stock immobilisé.
create or replace function private.offload_point_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer;
begin
  -- 1. Les réponses à traiter.
  for r in
    select t.titre, t.detail, t.compte_id from public.offload_taches t
    where t.client_id = p_client and t.type = 'repondre' and t.statut = 'a_faire'
    order by t.echeance, t.cree_le limit 10
  loop
    v_items := v_items || jsonb_build_object('texte', left(r.detail, 300), 'gravite', 'attention', 'lien', '/espace/offload',
                                             'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 2. Avant la clôture : les comptes à risque dont la commande devait tomber ce mois-ci.
  for r in
    select c.nom, s.compte_id, s.cloture_le, s.raisons, s.priorite from public.offload_signaux s join public.offload_comptes c on c.id = s.compte_id
    where s.client_id = p_client and s.avant_cloture and c.statut = 'suivi'
    order by s.priorite desc limit 10
  loop
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : à joindre avant la clôture du %s. %s', r.nom, private.offload_le(r.cloture_le), r.raisons -> 0 ->> 'phrase'), 300),
      'gravite', 'attention', 'lien', '/espace/offload', 'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 3. Les comptes entrés à risque ces dernières 24 heures.
  for r in
    select c.nom, s.compte_id, s.raisons from public.offload_signaux s join public.offload_comptes c on c.id = s.compte_id
    where s.client_id = p_client and s.niveau in ('eteint', 'decroche', 'saison', 'ralentit') and s.depuis_le >= p_jour - 1
      and not s.avant_cloture and c.statut = 'suivi'
    order by s.priorite desc limit 10
  loop
    v_items := v_items || jsonb_build_object('texte', left(r.nom || ' : ' || (r.raisons -> 0 ->> 'phrase'), 300), 'gravite', 'info',
                                             'lien', '/espace/offload', 'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 4. Les appels du jour et en retard.
  select count(*) into v_n from public.offload_taches t
  where t.client_id = p_client and t.type = 'appel' and t.statut = 'a_faire' and t.echeance <= p_jour;
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s appel%s de reprise à passer aujourd''hui ou en retard.', v_n,
                                                             case when v_n > 1 then 's' else '' end),
                                             'gravite', 'info', 'lien', '/espace/offload');
  end if;
  -- 5. Les messages qui attendent une validation.
  select count(*) into v_n from public.offload_reprises p
  where p.client_id = p_client and p.statut in ('a_valider', 'relance_a_valider');
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s message%s de reprise attend%s votre validation.', v_n,
                                                             case when v_n > 1 then 's' else '' end, case when v_n > 1 then 'ent' else '' end),
                                             'gravite', 'info', 'lien', '/espace/validations');
  end if;
  -- 6. Les échéances de la semaine (réglementaires d'abord) et les contrats qui s'éteignent (c4_07).
  for r in
    select h.*, k.nom, q.designation, q.site from public.offload_echeances h
    join public.offload_comptes k on k.id = h.compte_id
    left join public.offload_equipements q on q.id = h.equipement_id
    where h.client_id = p_client
      and ((h.type = 'entretien' and h.statut in ('a_venir', 'a_valider', 'appel') and h.due_le between p_jour and p_jour + 7)
           or (h.type = 'contrat' and h.s_eteint and h.statut <> 'close' and h.due_le >= p_jour - 30))
    order by h.type desc, (h.nature = 'reglementaire') desc, h.due_le limit 10
  loop
    v_items := v_items || jsonb_build_object(
      'texte', left(case when r.type = 'contrat' then coalesce(r.motif, 'Contrat qui s''éteint.') || ' — ' || r.nom
                         else format('%s : %s de %s%s le %s', r.nom,
                                     case when r.nature = 'reglementaire' then 'contrôle réglementaire' else 'entretien' end,
                                     r.designation, coalesce(' (' || r.site || ')', ''), private.offload_le(r.due_le)) end, 300),
      'gravite', case when r.type = 'contrat' or r.nature = 'reglementaire' then 'attention' else 'info' end,
      'lien', '/espace/offload', 'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 7. Les affaires restées en plan : les décisions à prendre et le stock immobilisé (c4_08).
  for r in
    select a.reference, a.type, a.compte_id, a.valeur_ht, a.disponible_le, k.nom from public.offload_affaires a
    join public.offload_comptes k on k.id = a.compte_id
    where a.client_id = p_client and a.statut = 'decision'
    order by a.valeur_ht desc nulls last, a.disponible_le limit 5
  loop
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s %s relancée deux fois, en attente depuis le %s%s — à décider.', r.nom,
                           case r.type when 'intervention' then 'intervention' else 'commande' end, r.reference,
                           private.offload_le(r.disponible_le), coalesce(' (' || private.offload_euros(r.valeur_ht) || ' immobilisés)', '')), 300),
      'gravite', 'attention', 'lien', '/espace/offload', 'objet_type', 'offload_comptes', 'objet_id', r.compte_id::text);
  end loop;
  select count(*) into v_n from public.offload_affaires a
  where a.client_id = p_client and a.statut in ('en_attente', 'relancee_1', 'relancee_2', 'decision', 'repondue');
  if v_n > 0 then
    v_items := v_items || jsonb_build_object('texte', left(format('%s affaire%s attend%s %s retrait%s.', v_n, case when v_n > 1 then 's' else '' end,
        case when v_n > 1 then 'ent' else '' end, case when v_n > 1 then 'leur' else 'son' end,
        coalesce(' : ' || private.offload_euros((select sum(a.valeur_ht) from public.offload_affaires a where a.client_id = p_client
                   and a.statut in ('en_attente', 'relancee_1', 'relancee_2', 'decision', 'repondue'))) || ' de stock immobilisé', '')), 300),
      'gravite', 'info', 'lien', '/espace/offload');
  end if;
  return v_items;
end $function$;

-- La nuit : détection, doublons, reprises, échéances, puis affaires.
create or replace function private.offload_detecter_tout(p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  n integer := 0;
  e integer := 0;
begin
  for k in select g.client_id from public.offload_reglages g order by g.client_id loop
    begin
      perform private.offload_detecter(k.client_id, p_jour);
      perform private.offload_proposer_rapprochements(k.client_id);
      perform private.offload_cycle(k.client_id, p_jour);
      perform private.offload_echeances_cycle(k.client_id, p_jour);
      perform private.offload_affaires_cycle(k.client_id, p_jour);
      n := n + 1;
    exception when others then
      e := e + 1;
      perform private.lever_alerte_module(k.client_id, 'offload', 'attention',
        'La détection des clients qui décrochent n''a pas pu être calculée.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'offload:detection', false, null);
    end;
  end loop;
  return jsonb_build_object('organisations', n, 'echecs', e);
end $function$;

-- Les réglages : les deux délais de retrait.
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
                  'delai_relance_jours', 'quarantaine_jours', 'plafond_reprises_jour', 'delai_retrait_jours', 'delai_relance_retrait_jours');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  select * into g from public.offload_reglages where client_id = p_client for update;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
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
    maj_le = now()
  where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('avant', to_jsonb(g) - 'branchement_id' - 'installe_par', 'demande', p), null);
  return (select to_jsonb(x) from public.offload_reglages x where x.client_id = p_client);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (à inscrire dans a5_01 : offload_saisir_affaire, offload_retirer_affaire, offload_decider_affaire)
-- ─────────────────────────────────────────────────────────────────────────

revoke all on function public.offload_saisir_affaire(uuid, text, date, jsonb) from public, anon;

revoke all on function public.offload_retirer_affaire(uuid, date) from public, anon;

revoke all on function public.offload_decider_affaire(uuid, text, text) from public, anon;

revoke all on function public.offload_affaires_liste(uuid) from public, anon;

revoke all on function public.offload_affaires_compte(uuid) from public, anon;

grant execute on function public.offload_saisir_affaire(uuid, text, date, jsonb) to authenticated, service_role;

grant execute on function public.offload_retirer_affaire(uuid, date) to authenticated, service_role;

grant execute on function public.offload_decider_affaire(uuid, text, text) to authenticated, service_role;

grant execute on function public.offload_affaires_liste(uuid) to authenticated, service_role;

grant execute on function public.offload_affaires_compte(uuid) to authenticated, service_role;

revoke execute on function private.offload_saisir_affaire(uuid, text, date, jsonb) from public, anon;

revoke execute on function private.offload_retirer_affaire(uuid, date) from public, anon;

revoke execute on function private.offload_decider_affaire(uuid, text, text) from public, anon;

grant execute on function private.offload_saisir_affaire(uuid, text, date, jsonb) to authenticated, service_role;

grant execute on function private.offload_retirer_affaire(uuid, date) to authenticated, service_role;

grant execute on function private.offload_decider_affaire(uuid, text, text) to authenticated, service_role;

revoke execute on function private.offload_message_retrait(uuid, integer) from public, anon, authenticated;

grant execute on function private.offload_message_retrait(uuid, integer) to service_role;

revoke execute on function private.offload_relancer_affaire(uuid, integer, text) from public, anon, authenticated;

grant execute on function private.offload_relancer_affaire(uuid, integer, text) to service_role;

revoke execute on function private.offload_affaires_cycle(uuid, date) from public, anon, authenticated;

grant execute on function private.offload_affaires_cycle(uuid, date) to service_role;

revoke execute on function private.offload_suivre_envoi_affaire(jsonb) from public, anon, authenticated;

grant execute on function private.offload_suivre_envoi_affaire(jsonb) to service_role;

revoke execute on function private.offload_reponse_affaire(bigint, uuid) from public, anon, authenticated;

grant execute on function private.offload_reponse_affaire(bigint, uuid) to service_role;

revoke execute on function private.offload_appliquer_releve(jsonb) from public, anon, authenticated;

grant execute on function private.offload_appliquer_releve(jsonb) to service_role;

revoke execute on function private.offload_traiter_travaux(integer) from public, anon, authenticated;

grant execute on function private.offload_traiter_travaux(integer) to service_role;

revoke execute on function private.offload_suivre_envoi(jsonb) from public, anon, authenticated;

grant execute on function private.offload_suivre_envoi(jsonb) to service_role;

revoke execute on function private.offload_lire_reponse(jsonb) from public, anon, authenticated;

grant execute on function private.offload_lire_reponse(jsonb) to service_role;

revoke execute on function private.offload_point_lignes(uuid, date) from public, anon, authenticated;

grant execute on function private.offload_point_lignes(uuid, date) to service_role;

revoke execute on function private.offload_detecter_tout(date) from public, anon, authenticated;

grant execute on function private.offload_detecter_tout(date) to service_role;

revoke execute on function private.offload_regler(uuid, jsonb) from public, anon;

grant execute on function private.offload_regler(uuid, jsonb) to authenticated, service_role;
