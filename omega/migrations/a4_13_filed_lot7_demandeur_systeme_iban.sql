-- FILED, lot 7 (correctif a4_13) — deux remontées d'A3 en réel (recette, 06/10, 01:53–01:55 UTC).
--
-- (a) Quand une personne confirme un fournisseur, le recontrôle qui suit dépose la demande « filed.valider_facture »
--     de ses factures sous l'identité de cette personne (private.preparer_demande lit auth.uid()). Le demandeur ne
--     décidant pas de sa propre demande, elle ne pouvait plus valider une facture qu'elle n'avait pas saisie.
--     Règle : une demande FILED de validation de facture ou d'IBAN est déposée par le SYSTÈME. La séparation des
--     tâches passe par payload.saisi_par (private.preparer_approbation, lot 19c) : pour une facture, ceux qui ont
--     déposé, corrigé ou confirmé la pièce (private.filed_saisisseurs) ; pour un IBAN, celui qui l'a proposé
--     (filed_fournisseurs_ibans.propose_par), ajouté ici.
--     Même cause, second effet : le recontrôle écrit au fil (étape « controlee », « identite_completee »…) sous
--     l'identité de la personne qui l'a déclenché, et private.filed_saisisseurs la comptait alors comme saisisseur.
--     filed_saisisseurs ne retient plus les étapes que FILED écrit lui-même (contrôle, intégration, rapprochements,
--     imputation, décisions) : seuls le dépôt et les gestes de saisie ou de correction d'une personne comptent.
--     Garde posée par un déclencheur BEFORE INSERT qui passe après demandes_validation_preparer (ordre des noms) :
--     aucun corps du socle ni de FILED n'est recopié.
-- (b) Une demande « filed.valider_iban » annulée laissait l'IBAN « propose » sans demande ouverte : ni validé, ni
--     refusé, ni reproposé. Désormais, à l'annulation, si l'IBAN est encore proposé chez un fournisseur actif et
--     qu'aucune autre demande ne l'attend, une nouvelle demande est déposée (par le système, donc non annulable par
--     un membre). Les IBAN déjà dans ce cas sur la base sont repris une fois, à la pose.
-- Migration idempotente (create or replace function, create or replace trigger ; la reprise ne dépose qu'une fois).

-- ── (a) Le demandeur d'une validation de facture ou d'IBAN est le système ──
create or replace function private.filed_demandeur_systeme()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_propose_par uuid;
begin
  if new.module = 'filed' and (new.type_action like 'filed.valider_facture%' or new.type_action = 'filed.valider_iban') then
    new.demandeur_type := 'systeme';
    new.demandeur_id := null;
    if new.type_action = 'filed.valider_iban' then
      select i.propose_par into v_propose_par from public.filed_fournisseurs_ibans i
       where i.client_id = new.client_id and i.id::text = new.objet_id;
      if v_propose_par is not null then
        new.payload := coalesce(new.payload, '{}'::jsonb) || jsonb_build_object('saisi_par',
          case when jsonb_typeof(new.payload -> 'saisi_par') = 'array'
               then case when new.payload -> 'saisi_par' ? v_propose_par::text then new.payload -> 'saisi_par'
                         else (new.payload -> 'saisi_par') || to_jsonb(v_propose_par::text) end
               else jsonb_build_array(v_propose_par::text) end);
      end if;
    end if;
  end if;
  return new;
end $$;
comment on function private.filed_demandeur_systeme() is
  'Lot 7 (a4_13) : une demande FILED de validation de facture ou d''IBAN est déposée par le système ; la séparation passe par payload.saisi_par (le proposant de l''IBAN y est ajouté).';
revoke all on function private.filed_demandeur_systeme() from public, anon, authenticated;

-- Les étapes écrites par FILED lui-même ne font pas d'une personne un saisisseur (a4_07 + étapes du système).
create or replace function private.filed_saisisseurs(p_facture uuid)
returns uuid[] language sql stable set search_path to '' as $$
  select coalesce(array_agg(distinct u), '{}')
    from (
      select d.depose_par as u from public.filed_factures f join public.filed_documents d on d.id = f.document_id where f.id = p_facture and d.depose_par is not null
      union
      select h.acteur_id from public.filed_factures f join public.filed_historique h on h.document_id = f.document_id
       where f.id = p_facture and h.acteur_type = 'utilisateur' and h.acteur_id is not null
         and h.etape not in ('validee', 'refusee', 'archivee', 'litige_ouvert', 'litige_clos', 'reglee', 'validation_demandee', 'relancee', 'remontee', 'annexe',
                             -- Lot 7 (a4_13) : ce que FILED écrit en contrôlant, même quand une personne a déclenché le contrôle.
                             'controlee', 'integree', 'identite_completee', 'identite_verifiee', 'reorientee', 'doublon', 'charge_reconnue',
                             'imputation_proposee', 'imputation_tranchee', 'imputee', 'relue_sans_effet', 'decision_perimee', 'comptabilisee')
    ) s
$$;
comment on function private.filed_saisisseurs(uuid) is
  'Les personnes qui ont déposé, corrigé ou confirmé la pièce : elles ne l''approuvent pas. Les étapes écrites par FILED (contrôle, intégration, imputation, décisions) ne comptent pas (a4_13).';

-- Le nom trie après « demandes_validation_preparer » : ce déclencheur passe après celui du socle.
create or replace trigger demandes_validation_preparer_filed
  before insert on public.demandes_validation
  for each row execute function private.filed_demandeur_systeme();

-- Reprise des demandes de facture déjà ouvertes au nom d'une personne (ex. FAC-2026-10-0471 sur la recette) :
-- annulées et redéposées par le système (suffixe « :systeme » sur la clé), une seule fois.
create or replace function private.filed_reprendre_demandes_facture(p_client uuid default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare r record; v_n integer := 0; v_d uuid;
begin
  for r in select d.id, v.facture_id, coalesce(v.niveau, 1) as niveau
             from public.demandes_validation d
             join public.filed_validations v on v.demande_id = d.id
             join public.filed_factures f on f.id = v.facture_id and f.statut = 'a_valider'
            where d.module = 'filed' and d.type_action like 'filed.valider_facture%' and d.statut = 'en_attente'
              and d.demandeur_type = 'utilisateur' and (p_client is null or d.client_id = p_client)
  loop
    v_d := private.filed_deposer_validation(r.facture_id, r.niveau, ':systeme');
    if v_d is not null and v_d <> r.id then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;
comment on function private.filed_reprendre_demandes_facture(uuid) is
  'Lot 7 (a4_13) : redépose par le système les demandes de validation de facture ouvertes au nom d''une personne ; rend le nombre redéposé.';
revoke all on function private.filed_reprendre_demandes_facture(uuid) from public, anon, authenticated;

select private.filed_reprendre_demandes_facture();

-- ── (b) Un IBAN encore proposé sans demande ouverte repart à la file ──
create or replace function private.filed_reproposer_iban(p_iban uuid, p_cle text)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_ib public.filed_fournisseurs_ibans; v_four public.filed_fournisseurs; v_id uuid;
begin
  select * into v_ib from public.filed_fournisseurs_ibans where id = p_iban;
  if not found or v_ib.statut <> 'propose' then return null; end if;
  select * into v_four from public.filed_fournisseurs where id = v_ib.fournisseur_id;
  if not found or v_four.statut <> 'actif' then return null; end if;
  if exists (select 1 from public.demandes_validation d
              where d.client_id = v_ib.client_id and d.module = 'filed' and d.type_action = 'filed.valider_iban'
                and d.objet_id = v_ib.id::text and d.statut = 'en_attente') then
    return null;
  end if;
  v_id := private.filed_deposer_demande(v_ib.client_id, null, 'filed.valider_iban', 'filed_iban', v_ib.id::text,
    format('Nouvel IBAN pour %s : %s', private.filed_libelle_fournisseur(v_four), v_ib.iban_masque), null,
    jsonb_build_object('fournisseur', v_four.id, 'iban', v_ib.iban_masque, 'empreinte', v_ib.empreinte,
                       'document', v_ib.document_id, 'source', v_ib.source, 'repropose', true),
    left(p_cle, 200));
  if v_id is null or not exists (select 1 from public.demandes_validation d where d.id = v_id and d.statut = 'en_attente') then
    return null;
  end if;
  perform private.filed_historiser(v_ib.client_id, null, 'filed_fournisseur', v_four.id::text, 'iban_repropose',
    format('IBAN %s toujours à vérifier : la demande est reposée à la file.', v_ib.iban_masque),
    jsonb_build_object('iban', v_ib.iban_masque, 'demande', v_id));
  return v_id;
end $$;
comment on function private.filed_reproposer_iban(uuid, text) is
  'Lot 7 (a4_13) : redépose la demande filed.valider_iban d''un IBAN encore proposé chez un fournisseur actif, quand aucune demande ne l''attend.';
revoke all on function private.filed_reproposer_iban(uuid, text) from public, anon, authenticated;

create or replace function private.filed_iban_demande_annulee()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_iban uuid;
begin
  if new.module = 'filed' and new.type_action = 'filed.valider_iban' and new.statut = 'annulee'
     and old.statut is distinct from 'annulee' then
    begin
      v_iban := new.objet_id::uuid;
    exception when invalid_text_representation then
      return null;
    end;
    perform private.filed_reproposer_iban(v_iban, 'filed:iban:' || new.objet_id || ':apres:' || new.id::text);
  end if;
  return null;
end $$;
comment on function private.filed_iban_demande_annulee() is
  'Lot 7 (a4_13) : une demande filed.valider_iban annulée ne laisse pas l''IBAN proposé sans demande.';
revoke all on function private.filed_iban_demande_annulee() from public, anon, authenticated;

create or replace trigger demandes_validation_filed_iban_annulee
  after update of statut on public.demandes_validation
  for each row execute function private.filed_iban_demande_annulee();

-- Les IBAN déjà proposés sans demande ouverte (fournisseur actif) : une reprise, une seule fois (clé fixe).
create or replace function private.filed_reprendre_ibans_sans_demande(p_client uuid default null)
returns integer language plpgsql security definer set search_path to '' as $$
declare r record; v_n integer := 0;
begin
  for r in select i.id from public.filed_fournisseurs_ibans i
             join public.filed_fournisseurs f on f.id = i.fournisseur_id
            where i.statut = 'propose' and f.statut = 'actif' and (p_client is null or i.client_id = p_client)
              and not exists (select 1 from public.demandes_validation d
                               where d.client_id = i.client_id and d.module = 'filed' and d.type_action = 'filed.valider_iban'
                                 and d.objet_id = i.id::text and d.statut = 'en_attente')
  loop
    if private.filed_reproposer_iban(r.id, 'filed:iban:' || r.id::text || ':reprise') is not null then v_n := v_n + 1; end if;
  end loop;
  return v_n;
end $$;
comment on function private.filed_reprendre_ibans_sans_demande(uuid) is
  'Lot 7 (a4_13) : reprise des IBAN proposés chez un fournisseur actif sans demande ouverte ; rend le nombre de demandes en attente touchées.';
revoke all on function private.filed_reprendre_ibans_sans_demande(uuid) from public, anon, authenticated;

select private.filed_reprendre_ibans_sans_demande();
