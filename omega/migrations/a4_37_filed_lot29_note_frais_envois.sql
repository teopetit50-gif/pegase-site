-- FILED, lot 29 (a4_37) — la note de frais dans les envois comptables.
--
-- Depuis a4_35, une note de frais porte sa dette au compte du personnel (421 par défaut), au nom du salarié (auxiliaire
-- NDF…). Les fichiers d'import d'a4_25 la traitaient encore en fournisseur sur un point : l'en-tête de tiers Cegid
-- (***CAE) créait le salarié en nature FOU. private.filed_exporter_ecritures (texte d'a4_25, gen37.py) le crée
-- désormais en nature SAL quand son collectif commence par 42. Pennylane (401/421 + code) et Sage (compte et tiers)
-- n'avaient rien à changer. Côté API (fonction compta), QuickBooks porte le salarié en Employee (editeurs/quickbooks.ts).
-- Migration idempotente ; aucune suppression.

create or replace function private.filed_exporter_ecritures(p_client uuid, p_entite uuid, p_format text, p_exercice uuid default null,
                                                           p_du date default null, p_au date default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
declare
  v_acteur uuid; v_e public.entites; v_x public.filed_exercices; v_mode text; v_curseur bigint; v_du date; v_au date;
  v_fichiers jsonb := '[]'::jsonb; v_lignes text[]; v_nb integer := 0; v_ecr integer := 0; v_d numeric := 0; v_c numeric := 0;
  v_premiere bigint; v_derniere bigint; v_base text; v_rang bigint := 0; v_dans_fichier integer := 0; v_envoi uuid; v_empreinte text;
  v_entete text; r record; t record;
begin
  v_acteur := private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur'], p_entite);
  if p_format is null or p_format not in ('pennylane', 'sage', 'cegid', 'quickbooks') then
    raise exception 'Format inconnu : pennylane, sage, cegid ou quickbooks.' using errcode = '22023';
  end if;
  select * into v_e from public.entites where id = p_entite and client_id = p_client;
  if not found then raise exception 'Société introuvable dans cette organisation.' using errcode = '22023'; end if;
  if p_exercice is not null then
    select * into v_x from public.filed_exercices where id = p_exercice and client_id = p_client;
    if not found then raise exception 'Exercice introuvable.' using errcode = '22023'; end if;
    v_mode := 'periode'; v_du := v_x.debut; v_au := v_x.fin;
  elsif p_du is not null or p_au is not null then
    v_mode := 'periode'; v_du := coalesce(p_du, date '1900-01-01'); v_au := coalesce(p_au, date '2999-12-31');
    if v_au < v_du then raise exception 'La période finit avant de commencer.' using errcode = '22023'; end if;
  else
    v_mode := 'nouvelles';
    select coalesce(max(derniere_ecriture), 0) into v_curseur from public.filed_envois_comptables
     where client_id = p_client and entite_id = p_entite and format = p_format and mode = 'nouvelles';
  end if;

  select count(*), count(distinct (l.exercice_cle, l.ecriture_num)), coalesce(sum(l.debit), 0), coalesce(sum(l.credit), 0), min(l.id), max(l.id)
    into v_nb, v_ecr, v_d, v_c, v_premiere, v_derniere
    from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) l;
  if v_nb = 0 then
    return jsonb_build_object('format', p_format, 'mode', v_mode, 'fichiers', '[]'::jsonb, 'ecritures', 0, 'lignes', 0,
                              'total_debit', 0, 'total_credit', 0, 'envoi', null);
  end if;
  v_base := 'omega-ecritures-' || coalesce(nullif(v_e.siren, ''), left(p_entite::text, 8)) || '-'
            || case when v_mode = 'nouvelles' then to_char(now(), 'YYYYMMDD-HH24MISS') else to_char(v_du, 'YYYYMMDD') || '-' || to_char(v_au, 'YYYYMMDD') end;

  if p_format = 'pennylane' then
    v_lignes := array['Date;Code journal;Numéro de compte;Libellé;Débit;Crédit;Numéro de pièce;Devise;Débit_devise_origine;Crédit_devise_origine'];
    for r in select * from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) loop
      v_lignes := v_lignes || (to_char(r.ecriture_date, 'DD/MM/YYYY') || ';' || private.filed_csv(r.journal_code, ';') || ';'
        || private.filed_csv(case when r.comp_aux_num is not null
                                  then left(r.compte_num, 3) || upper(regexp_replace(r.comp_aux_num, '[^A-Za-z0-9]', '', 'g'))
                                  else r.compte_num end, ';') || ';'
        || private.filed_csv(left(r.ecriture_lib, 200), ';') || ';'
        || replace(to_char(r.debit, 'FM9999999999990.00'), '.', ',') || ';' || replace(to_char(r.credit, 'FM9999999999990.00'), '.', ',') || ';'
        || private.filed_csv(r.piece, ';') || ';' || coalesce(r.idevise, 'EUR') || ';'
        || case when r.montant_devise is not null and r.debit > 0 then replace(to_char(abs(r.montant_devise), 'FM9999999999990.00'), '.', ',') else '' end || ';'
        || case when r.montant_devise is not null and r.credit > 0 then replace(to_char(abs(r.montant_devise), 'FM9999999999990.00'), '.', ',') else '' end);
    end loop;
    v_fichiers := jsonb_build_array(jsonb_build_object('nom_fichier', v_base || '-pennylane.csv', 'encodage', 'UTF-8', 'separateur', ';',
      'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_nb));

  elsif p_format = 'sage' then
    v_lignes := array[private.filed_zone(v_e.nom, 30)];
    for r in select * from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) loop
      v_lignes := v_lignes || (private.filed_zone(r.journal_code, 3) || to_char(r.ecriture_date, 'DDMMYY') || r.nature
        || private.filed_zone(r.compte_num, 13) || case when r.comp_aux_num is not null then 'X' else ' ' end
        || private.filed_zone(r.comp_aux_num, 13) || private.filed_zone(r.piece, 13) || private.filed_zone(r.ecriture_lib, 25)
        || ' ' || repeat(' ', 6) || case when r.debit > 0 then 'D' else 'C' end
        || private.filed_zone_montant(greatest(r.debit, r.credit), 20, '.') || 'N' || private.filed_zone(right(r.ecriture_num::text, 7), 7)
        || repeat(' ', 26));
    end loop;
    v_fichiers := jsonb_build_array(jsonb_build_object('nom_fichier', v_base || '-sage.pnm', 'encodage', 'Windows-1252', 'separateur', 'positions',
      'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_nb));

  elsif p_format = 'cegid' then
    v_entete := '***S5CLIJRLSTD' || repeat(' ', 3) || '01011970' || '01011970' || '007' || repeat(' ', 5) || to_char(now(), 'DDMMYYYYHH24MI')
             || private.filed_zone('Omega', 35) || private.filed_zone(v_e.nom, 35) || repeat(' ', 4) || repeat(' ', 6) || repeat(' ', 3)
             || repeat(' ', 8) || '001';
    v_lignes := array[v_entete];
    -- Les comptes de tiers, pour qu'un fournisseur nouveau soit créé à l'import ; le bénéficiaire d'une note de frais
    -- (collectif 42x, a4_35) est créé en salarié (SAL), pas en fournisseur (a4_37).
    for t in select l.comp_aux_num, max(l.comp_aux_lib) lib, min(l.compte_num) collectif
               from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) l
              where l.comp_aux_num is not null group by l.comp_aux_num order by l.comp_aux_num loop
      v_lignes := v_lignes || ('***CAE' || private.filed_zone(t.comp_aux_num, 17) || private.filed_zone(t.lib, 35) || case when left(t.collectif, 2) = '42' then 'SAL' else 'FOU' end || 'X'
                               || private.filed_zone(t.collectif, 17));
    end loop;
    for r in select * from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) loop
      v_lignes := v_lignes || (private.filed_zone(r.journal_code, 3) || to_char(r.ecriture_date, 'DDMMYYYY') || r.nature
        || private.filed_zone(r.compte_num, 17) || case when r.comp_aux_num is not null then 'X' else ' ' end
        || private.filed_zone(r.comp_aux_num, 17) || private.filed_zone(r.piece, 35) || private.filed_zone(r.ecriture_lib, 35)
        || repeat(' ', 3) || repeat(' ', 8) || case when r.debit > 0 then 'D' else 'C' end
        || private.filed_zone_montant(greatest(r.debit, r.credit), 20, ',') || 'N' || lpad(right(r.ecriture_num::text, 8), 8, ' ')
        || repeat(' ', 3) || repeat(' ', 10) || 'E--' || repeat(' ', 20) || repeat(' ', 20) || repeat(' ', 3) || repeat(' ', 2) || repeat(' ', 2));
    end loop;
    v_fichiers := jsonb_build_array(jsonb_build_object('nom_fichier', v_base || '-cegid.tra', 'encodage', 'Windows-1252', 'separateur', 'positions',
      'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_nb));

  else   -- quickbooks : moins de 1 000 lignes par fichier, une écriture n'est jamais coupée
    v_entete := 'Numéro de journal,Date du journal,Nom du compte,Description,Débits,Crédits,Nom';
    v_lignes := array[v_entete];
    for r in select * from private.filed_envoi_lignes(p_client, p_entite, v_curseur, p_exercice, v_du, v_au) loop
      if r.rang <> v_rang then
        if v_dans_fichier > 0 and v_dans_fichier + r.n_lignes > 999 then
          v_fichiers := v_fichiers || jsonb_build_object('nom_fichier', v_base || '-quickbooks-' || (jsonb_array_length(v_fichiers) + 1) || '.csv',
            'encodage', 'UTF-8', 'separateur', ',', 'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_dans_fichier);
          v_lignes := array[v_entete]; v_dans_fichier := 0;
        end if;
        v_rang := r.rang;
      end if;
      v_lignes := v_lignes || (private.filed_csv(r.journal_code || '-' || regexp_replace(r.exercice_cle, '[^A-Za-z0-9]', '', 'g') || '-' || r.ecriture_num, ',') || ','
        || to_char(r.ecriture_date, 'DD/MM/YYYY') || ',' || private.filed_csv(coalesce(nullif(r.compte_lib, ''), r.compte_num), ',') || ','
        || private.filed_csv(r.ecriture_lib, ',') || ','
        || case when r.debit > 0 then to_char(r.debit, 'FM9999999999990.00') else '' end || ','
        || case when r.credit > 0 then to_char(r.credit, 'FM9999999999990.00') else '' end || ','
        || private.filed_csv(case when r.comp_aux_num is not null then r.comp_aux_lib end, ','));
      v_dans_fichier := v_dans_fichier + 1;
    end loop;
    v_fichiers := v_fichiers || jsonb_build_object('nom_fichier', v_base || '-quickbooks-' || (jsonb_array_length(v_fichiers) + 1) || '.csv',
      'encodage', 'UTF-8', 'separateur', ',', 'contenu', array_to_string(v_lignes, chr(13) || chr(10)) || chr(13) || chr(10), 'lignes', v_dans_fichier);
  end if;

  select encode(sha256(convert_to(string_agg(f ->> 'contenu', '' order by n), 'UTF8')), 'hex') into v_empreinte
    from jsonb_array_elements(v_fichiers) with ordinality x(f, n);
  insert into public.filed_envois_comptables (client_id, entite_id, format, mode, du, au, premiere_ecriture, derniere_ecriture, ecritures,
                                              lignes, total_debit, total_credit, fichiers, empreinte, envoye_par)
  values (p_client, p_entite, p_format, v_mode, v_du, v_au, v_premiere, v_derniere, v_ecr, v_nb, v_d, v_c,
          (select jsonb_agg(f ->> 'nom_fichier') from jsonb_array_elements(v_fichiers) f), v_empreinte, v_acteur)
  returning id into v_envoi;
  perform private.filed_journaliser(p_client, 'filed.envoi_comptable', 'entite', p_entite::text,
    jsonb_build_object('format', p_format, 'mode', v_mode, 'du', v_du, 'au', v_au, 'ecritures', v_ecr, 'lignes', v_nb,
                       'premiere', v_premiere, 'derniere', v_derniere, 'empreinte', v_empreinte, 'envoi', v_envoi), p_entite);
  return jsonb_build_object('format', p_format, 'mode', v_mode, 'fichiers', v_fichiers, 'ecritures', v_ecr, 'lignes', v_nb,
    'total_debit', v_d, 'total_credit', v_c, 'equilibre', v_d = v_c, 'envoi', v_envoi, 'empreinte', v_empreinte);
end $$;
