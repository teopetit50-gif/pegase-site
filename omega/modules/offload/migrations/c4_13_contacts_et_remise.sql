-- c4_13 — OFFLOAD : le dernier contact lu dans vos outils, et la remise dans le circuit en un geste (C4, 15/10/2026)
--
-- CE QUE ÇA POSE (chiffrage omega/CHIFFRAGE/offload.md, n° 62 et 73) :
--   · « Le dernier contact connu est lu avant toute sollicitation. Si un échange récent figure dans vos outils, le
--     compte sort de la vague en cours » : modèle d'export « contacts » (code client, date, canal, par, note), lu par
--     offload_appliquer_releve dans offload_contacts (sans doublon au réimport) ; offload_comptes.dernier_contact suit.
--     La quarantaine de c4_05 fait le reste (le compte contacté sort de la vague).
--   · « Seule une personne de votre équipe peut le remettre dans le circuit » : remettre en « suivi » un compte retiré à
--     sa demande (gérant ou admin, motif obligatoire, déjà en c4_05) lève aussi, dans le même geste, l'opposition posée
--     au socle sur son adresse (private.lever_opposition) ; avant, il fallait deux gestes.
--
-- Règles de pose : alter … add column if not exists, index if not exists, insert … where not exists, create or replace.
-- Aucun DROP, aucun DELETE.

alter table public.offload_contacts add column if not exists source text not null default 'saisie';
alter table public.offload_contacts add column if not exists jeu_id uuid;
alter table public.offload_contacts add column if not exists cle text;
create unique index if not exists offload_contacts_jeu_cle on public.offload_contacts (jeu_id, cle) where jeu_id is not null;

insert into public.modeles_jeux (module, logiciel, code, version, libelle, motif_fichier, entetes, colonnes, cle, complet, seuil_anomalies, source)
select 'offload', 'tableur', 'contacts', 1, 'Contacts commerciaux (appels, visites, rendez-vous)',
       '^(contacts?|activites?|appels?|visites?|historique[_ -]?commercial)',
       array['Code client', 'Date'],
       $j${
         "compte_ref": {"type": "texte", "obligatoire": true, "entetes": ["Code client", "N° client", "Code tiers", "Compte client"]},
         "date":       {"type": "date", "obligatoire": true, "entetes": ["Date", "Date du contact", "Date de l'activité", "Le"]},
         "canal":      {"type": "texte", "facultative": true, "entetes": ["Type", "Canal", "Nature", "Type d'activité"]},
         "par":        {"type": "texte", "facultative": true, "entetes": ["Commercial", "Par", "Auteur", "Responsable"]},
         "note":       {"type": "texte", "facultative": true, "entetes": ["Note", "Commentaire", "Objet", "Compte rendu"]}
       }$j$::jsonb,
       array['compte_ref', 'date'], false, 1.000,
       'Modèle générique OFFLOAD (C4, 15/10/2026) : les contacts tenus dans le CRM, un par ligne. En-têtes à confirmer sur un vrai export.'
where not exists (select 1 from public.modeles_jeux m where m.module = 'offload' and m.logiciel = 'tableur' and m.code = 'contacts' and m.version = 1);

do $$
declare b record;
begin
  for b in select x.id from public.branchements x where x.module = 'offload' and x.logiciel = 'tableur' loop
    if not exists (select 1 from public.branchements_jeux j where j.branchement_id = b.id and j.code = 'contacts') then
      perform private.declarer_jeu(b.id, 'contacts', '{}'::jsonb);
    end if;
  end loop;
end $$;

-- L'import lit aussi le jeu « contacts ».
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
                          when 'interventions' then 4 when 'affaires' then 5 when 'contacts' then 6 else 7 end, x.recu_le, x.id
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

    elsif i.code in ('equipements', 'contrats', 'interventions', 'affaires', 'contacts') then
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
      elsif i.code = 'contacts' then
        -- Les contacts tenus dans le CRM : un par compte, date et canal ; le réimport n'ajoute rien.
        with lus as (
          select c.id as compte_id, c.entite_id, z.d, z.v, z.cle,
                 case when z.v ->> 'canal' ~* '(appel|t[ée]l[ée]phon|phone)' then 'appel'
                      when z.v ->> 'canal' ~* '(visite|rdv|rendez|r[ée]union)' then 'visite'
                      when z.v ->> 'canal' ~* '(mail|courriel)' then 'courriel'
                      when z.v ->> 'canal' ~* 'salon' then 'salon' else 'autre' end as canal
          from (select private.offload_texte(l.valeurs ->> 'compte_ref', 120) as cref, private.offload_lire_date(l.valeurs ->> 'date') as d,
                       l.valeurs as v, l.cle
                from public.instantanes_lignes l where l.instantane_id = i.id) z
          join public.offload_comptes c on c.client_id = b.client_id and c.entite_id = v_entite and c.ref = z.cref
          where z.d between date '1990-01-01' and current_date
        ), ecrits as (
          insert into public.offload_contacts (client_id, entite_id, compte_id, le, canal, par, note, source, jeu_id, cle)
          select b.client_id, lus.entite_id, lus.compte_id, lus.d, lus.canal, private.offload_texte(lus.v ->> 'par', 120),
                 private.offload_texte(lus.v ->> 'note', 2000), 'import', i.jeu_id,
                 'c:' || lus.compte_id::text || '|' || lus.d::text || '|' || lus.canal
          from lus
          on conflict (jeu_id, cle) where jeu_id is not null do nothing
          returning compte_id, le
        ), maj as (
          update public.offload_comptes k set dernier_contact = greatest(coalesce(k.dernier_contact, e.le), e.le), maj_le = now()
          from (select compte_id, max(le) as le from ecrits group by compte_id) e
          where k.id = e.compte_id
          returning 1
        )
        select (select count(*) from ecrits), 0 into v_achats_nouveaux, v_achats_modifies;
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

-- La remise dans le circuit d'un compte retiré lève aussi l'opposition du socle.
create or replace function private.offload_changer_statut(p_compte uuid, p_statut text, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  r public.offload_reprises;
  v_motif text := private.offload_texte(p_motif, 500);
  v_envoi uuid;
  v_opposition uuid;
begin
  select * into c from public.offload_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  if p_statut not in ('suivi', 'exclu') then
    raise exception 'Un compte se met en « suivi » ou « exclu » ; le retrait (« stop ») vient du client.' using errcode = '22023';
  end if;
  if c.statut = 'arrete' then
    perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin'], 'remettre dans le circuit un compte retiré à sa demande');
  else
    perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'changer le suivi d''un compte');
  end if;
  if v_motif is null then
    raise exception 'Un changement de suivi dit pourquoi.' using errcode = '22023';
  end if;
  if c.statut = p_statut then
    return;
  end if;
  update public.offload_comptes set statut = p_statut, statut_motif = v_motif, statut_par = (select auth.uid()), statut_le = now(), maj_le = now()
  where id = c.id;
  if c.statut = 'arrete' and p_statut = 'suivi' and nullif(btrim(c.email), '') is not null then
    -- Remis dans le circuit par une personne : l'opposition du socle sur son adresse est levée dans le même geste.
    for v_opposition in select o.id from public.oppositions o
                        where o.client_id = c.client_id and lower(o.adresse) = lower(btrim(c.email)) and o.levee_le is null
                          and o.type in ('desinscription', 'pause') loop
      perform private.lever_opposition(v_opposition, left('Remis dans le circuit OFFLOAD : ' || v_motif, 500));
    end loop;
  end if;
  if p_statut = 'exclu' then
    -- Le commercial reprend la main : la reprise en cours est close, ses messages en attente annulés au socle.
    select * into r from public.offload_reprises p
    where p.compte_id = c.id and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee');
    if r.id is not null then
      foreach v_envoi in array array_remove(array[r.envoi1_id, r.envoi2_id], null) loop
        if exists (select 1 from public.envois e where e.id = v_envoi and e.statut in ('a_valider', 'differe', 'pret')) then
          perform private.annuler_envoi(v_envoi, 'Le commercial reprend la main sur ce compte.');
        end if;
      end loop;
      perform private.offload_clore(r.id, 'reprise_en_main', v_motif);
    end if;
  end if;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.compte_statut', 'offload_comptes', c.id::text,
    jsonb_build_object('avant', c.statut, 'apres', p_statut, 'motif', v_motif, 'reprise', r.id), c.entite_id);
end $function$;

revoke execute on function private.offload_appliquer_releve(jsonb) from public, anon, authenticated;
grant execute on function private.offload_appliquer_releve(jsonb) to service_role;
revoke execute on function private.offload_changer_statut(uuid, text, text) from public, anon;
grant execute on function private.offload_changer_statut(uuid, text, text) to authenticated, service_role;
