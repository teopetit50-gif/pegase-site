-- b6_06 — DALIRO : la demande de confirmation J-2 part vraiment (session B6, 06/10/2026)
--
-- CE QUE ÇA CORRIGE. b6_02 passe les passages en « demandee » et publie
-- daliro.confirmation_demandee, mais aucun module n'y est abonné : le
-- message au sous-traitant ne part jamais.
--
-- CE QUI EST POSÉ.
--   · private.abonnements : daliro.confirmation_demandee → travail
--     daliro.confirmation (module daliro).
--   · private.btp_texte_confirmation(charge) : le sujet et le corps du message.
--   · private.btp_ouvrier(p_nombre) : l'ouvrier de base (comme loc_ouvrier de
--     Tavaro) prend les travaux daliro.confirmation et prépare l'envoi par
--     private.preparer_envoi (réglages, verrous, mode essai et validation du
--     socle ; clé idempotente daliro:j2:<passage>:v<version>). Fin de
--     passage : battre_ouvrier.
--   · cron daliro-ouvrier, chaque minute.
--
-- CE QUI N'EST PAS POSÉ ICI : la ligne reglages_envois du module (elle est
-- par organisation, posée par Omega : pour le banc, omega/recette-b6/banc_j2_reel.sql).
-- Sans elle, l'envoi est verrouillé CONFIG_ABSENTE : rien ne part.
--
-- Règles de pose : create or replace / where not exists ; rien n'est retiré ni effacé.

insert into private.abonnements (evenement, module, genre)
select 'daliro.confirmation_demandee', 'daliro', 'daliro.confirmation'
where not exists (select 1 from private.abonnements a
                  where a.evenement = 'daliro.confirmation_demandee' and a.module = 'daliro' and a.genre = 'daliro.confirmation');

-- Le message : court, lisible sur un téléphone, sans lien.
create or replace function private.btp_texte_confirmation(p_client uuid, p_charge jsonb)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_org text;
  v_ch public.btp_chantiers;
  v_debut date := (p_charge ->> 'debut')::date;
  v_fin date := nullif(p_charge ->> 'fin', '')::date;
  v_jours text[] := array['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  v_mois text[] := array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  v_date text;
  v_lieu text;
begin
  select coalesce(to_jsonb(c) ->> 'nom_commercial', to_jsonb(c) ->> 'nom', to_jsonb(c) ->> 'raison_sociale', 'Votre donneur d''ordre')
    into v_org from public.clients c where c.id = p_client;
  select * into v_ch from public.btp_chantiers c where c.client_id = p_client and c.id = (p_charge ->> 'chantier')::uuid;
  v_date := v_jours[extract(dow from v_debut)::int + 1] || ' ' || extract(day from v_debut)::int || ' ' || v_mois[extract(month from v_debut)::int];
  if v_fin is not null and v_fin > v_debut then
    v_date := 'du ' || v_date || ' au ' || v_jours[extract(dow from v_fin)::int + 1] || ' ' || extract(day from v_fin)::int || ' ' || v_mois[extract(month from v_fin)::int];
  else
    v_date := 'le ' || v_date;
  end if;
  v_lieu := concat_ws(', ', nullif(btrim(v_ch.adresse), ''), nullif(btrim(concat_ws(' ', v_ch.code_postal, v_ch.commune)), ''));
  return jsonb_build_object(
    'sujet', left(format('Confirmez votre passage %s — %s', v_date, coalesce(p_charge ->> 'chantier_nom', v_ch.nom)), 300),
    'corps', format(E'Bonjour %s,\n\n%s vous attend sur le chantier %s%s %s%s.\n\nMerci de confirmer votre venue en répondant OUI, ou NON si vous ne pouvez pas venir : nous chercherons une solution.\n\n%s',
                    coalesce(p_charge ->> 'tiers_nom', ''), v_org, coalesce(p_charge ->> 'chantier_nom', v_ch.nom),
                    case when v_lieu <> '' then ' (' || v_lieu || ')' else '' end, v_date,
                    case when nullif(btrim(p_charge ->> 'tache'), '') is not null then ', pour : ' || btrim(p_charge ->> 'tache') else '' end,
                    v_org));
end $function$;

-- L'ouvrier de base : un passage prend au plus p_nombre demandes.
create or replace function private.btp_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  v_canal text;
  v_adresse text;
  v_texte jsonb;
  v_envoi uuid;
  v_passage public.btp_passages;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_ignores integer := 0;
begin
  for t in
    select * from private.prendre_travaux(array['daliro.confirmation'], p_nombre, interval '5 minutes', 'daliro-base')
  loop
    begin
      select * into v_passage from public.btp_passages p
      where p.client_id = t.client_id and p.id = (t.charge ->> 'passage')::uuid;
      v_canal := t.charge ->> 'canal';
      if v_passage.id is null or v_passage.statut <> 'prevu' or v_passage.confirmation <> 'demandee' then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', 'passage absent, plus prévu ou plus en attente de réponse'));
        v_ignores := v_ignores + 1;
      elsif v_canal not in ('email', 'whatsapp', 'sms') then
        perform private.finir_travail(t.id, jsonb_build_object('ignore', format('canal %s : le bureau appelle lui-même', coalesce(v_canal, 'vide'))));
        v_ignores := v_ignores + 1;
      else
        v_adresse := case when v_canal = 'email' then t.charge ->> 'email' else t.charge ->> 'telephone' end;
        v_texte := private.btp_texte_confirmation(t.client_id, t.charge);
        v_envoi := private.preparer_envoi(t.client_id, 'daliro', 'btp_passages', v_passage.id::text, v_canal,
          jsonb_build_object('adresse', v_adresse, 'nom', t.charge ->> 'tiers_nom', 'ref', t.charge ->> 'tiers',
                             'professionnel', true, 'langue', 'fr'),
          null, '{}'::jsonb,
          case when v_canal = 'email' then v_texte ->> 'sujet' end,
          case when v_canal = 'email' then v_texte ->> 'corps' else (v_texte ->> 'sujet') || E'\n\n' || (v_texte ->> 'corps') end,
          null::uuid[], 'daliro:j2:' || v_passage.id::text || ':v' || coalesce(t.charge ->> 'version', v_passage.version::text),
          v_passage.entite_id, true, false, null::timestamptz, '{}'::jsonb);
        perform private.journaliser(t.client_id, 'daliro.confirmation_envoyee', 'btp_passages', v_passage.id::text,
          jsonb_build_object('envoi', v_envoi, 'canal', v_canal, 'tiers', t.charge ->> 'tiers', 'debut', t.charge ->> 'debut'),
          v_passage.entite_id);
        perform private.finir_travail(t.id, jsonb_build_object('envoi', v_envoi, 'canal', v_canal,
          'statut', (select e.statut from public.envois e where e.id = v_envoi),
          'verrou', (select e.verrou from public.envois e where e.id = v_envoi)));
        v_faits := v_faits + 1;
      end if;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  begin
    perform private.battre_ouvrier('daliro', array['daliro.confirmation'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores);
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt) : le serveur seul.
revoke execute on function private.btp_texte_confirmation(uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.btp_ouvrier(integer) from public, anon, authenticated;
grant execute on function private.btp_texte_confirmation(uuid, jsonb) to service_role;
grant execute on function private.btp_ouvrier(integer) to service_role;

-- Le cron : chaque minute, comme tavaro-ouvrier.
select cron.schedule('daliro-ouvrier', '* * * * *', $cron$select private.btp_ouvrier(20)$cron$)
where not exists (select 1 from cron.job where jobname = 'daliro-ouvrier');
