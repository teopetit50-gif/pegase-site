-- c3_08 — REPUT : les réponses écrites par vos équipes nourrissent la base de connaissances (session C3, 06/10/2026)
--
-- CE QUE ÇA TIENT : « Les sujets qui reviennent sont remontés, et ils nourrissent la base de connaissances. »
-- Une demande hors de la base (couverte = faux) à laquelle une personne a répondu elle-même (reput_corriger :
-- reput_reponses.redigee_par) et dont la réponse est partie (statut envoyee) devient une FICHE PROPOSÉE : un
-- brouillon de reput_connaissances (sujet de la demande, question = objet ou début du message reçu, contenu = la
-- réponse écrite par la personne, source « Réponse de <courriel> du <date> »), rédigé au nom de cette personne.
-- Un brouillon n'entre pas dans la base en vigueur : un gérant, un administrateur ou un valideur le relit, le
-- corrige au besoin (signature, nom du client) et le valide (reput_valider_connaissance, c3_01). Une seule fiche
-- par réponse (reput_reponses.fiche_proposee). L'ouvrier de base le fait chaque minute.
--
-- Règles de pose : alter … if not exists / create or replace ; ni DROP ni DELETE.

alter table public.reput_reponses add column if not exists fiche_proposee uuid references public.reput_connaissances(id) on delete set null;

create or replace function private.reput_proposer_fiches()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v_id uuid;
  v_titre text;
  v_n integer := 0;
begin
  for x in
    select p.id, p.client_id, p.entite_id, p.sujet, p.langue, p.brouillon, p.redigee_par, p.maj_le,
           r.sujet as objet, r.corps as question, r.canal,
           (select u.email from auth.users u where u.id = p.redigee_par) as auteur
    from public.reput_reponses p
    join public.reput_demandes d on d.id = p.demande_id
    join public.receptions r on r.id = d.reception_id
    where p.statut = 'envoyee' and p.redigee_par is not null and not p.couverte and p.fiche_proposee is null
      and p.sujet <> all (private.reput_sujets_proteges())
      and exists (select 1 from public.reput_sujets s where s.client_id = p.client_id and s.code = p.sujet and s.actif)
    order by p.maj_le limit 50
  loop
    v_titre := left(btrim(regexp_replace(coalesce(case when x.canal = 'email' and nullif(btrim(x.objet), '') is not null
                                                          and length(btrim(x.objet)) >= 15 then x.objet end,
                                                     x.question, 'Question reçue'), '\s+', ' ', 'g')), 300);
    insert into public.reput_connaissances (client_id, entite_id, origine_id, sujet, genre, titre, contenu, langue, source, statut, cree_par)
    values (x.client_id, x.entite_id, gen_random_uuid(), x.sujet, 'question', v_titre, left(btrim(x.brouillon), 4000),
            case when x.langue ~ '^[a-z]{2}$' then x.langue else 'fr' end,
            left(format('Réponse de %s du %s (fiche proposée, à relire)', coalesce(x.auteur, 'votre équipe'),
                        to_char(x.maj_le at time zone 'Europe/Paris', 'DD/MM/YYYY')), 300),
            'brouillon', x.redigee_par)
    returning id into v_id;
    update public.reput_connaissances c set origine_id = c.id where c.id = v_id;
    update public.reput_reponses p set fiche_proposee = v_id where p.id = x.id;
    perform private.journaliser_module(x.client_id, 'reput', 'reput.fiche_proposee', 'reput_connaissances', v_id::text,
      jsonb_build_object('reponse', x.id, 'sujet', x.sujet, 'redigee_par', x.redigee_par), x.entite_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;

create or replace function private.reput_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  x record;
  v_r jsonb;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_accuses integer := 0;
  v_avis integer := 0;
  v_erreurs integer := 0;
  v_synchro integer;
  v_avis_reglement integer := 0;
  v_escalades integer := 0;
begin
  for t in select * from private.prendre_travaux(array['reput.redeposer'], p_nombre, interval '5 minutes', 'reput-base') loop
    begin
      v_r := private.reput_redeposer((t.charge ->> 'reponse')::uuid);
      perform private.finir_travail(t.id, v_r);
      v_faits := v_faits + 1;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  -- Les accusés de réception des demandes qui attendent (déposées depuis moins d'un jour).
  for x in select d.id, d.client_id from public.reput_demandes d
           where d.statut in ('a_valider', 'a_traiter') and d.accuse_le is null and d.canal_reponse is not null
             and d.preparee_le > now() - interval '1 day'
           order by d.recu_le limit 50 loop
    begin
      v_r := private.reput_accuser(x.id);
      if v_r ? 'envoi' then v_accuses := v_accuses + 1; end if;
    exception when others then
      v_erreurs := v_erreurs + 1;
      update public.reput_demandes d set accuse_le = now() where d.id = x.id;   -- jamais deux fois, jamais en boucle
      perform private.lever_alerte_module(x.client_id, 'reput', 'info', 'Un accusé de réception n''a pas pu être préparé.',
        jsonb_build_object('demande', x.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'accuse:' || x.id::text, false, null);
    end;
  end loop;
  -- Les demandes d'avis arrivées à échéance.
  for x in select a.id, a.client_id from public.reput_avis a
           where a.statut in ('programme', 'sollicite') and a.prochain_le <= now()
           order by a.prochain_le limit 50 loop
    begin
      v_r := private.reput_solliciter_avis(x.id);
      if v_r ? 'envoi' then v_avis := v_avis + 1; end if;
    exception when others then
      v_erreurs := v_erreurs + 1;
      update public.reput_avis a set statut = 'termine', motif = left('Envoi impossible : ' || sqlerrm, 300), prochain_le = null where a.id = x.id;
    end;
  end loop;
  -- c3_06 : les règlements lettrés publiés par CASHD (cashd.facture_reglee) → demande d'avis, si le client l'a voulu.
  for t in select * from private.prendre_travaux(array['reput.avis_reglement'], p_nombre, interval '5 minutes', 'reput-base') loop
    begin
      v_r := private.reput_avis_depuis_reglement(t.client_id, t.charge);
      perform private.finir_travail(t.id, v_r);
      if v_r ? 'avis' then v_avis_reglement := v_avis_reglement + 1; end if;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  -- c3_06 : le délai de traitement dépassé fait remonter la demande au responsable.
  v_escalades := private.reput_escalader(now());
  -- c3_07 : un dossier, une réponse : les réponses plus anciennes encore en attente sont annulées.
  perform private.reput_regrouper();
  -- c3_08 : une réponse hors base écrite par une personne et partie devient une fiche proposée.
  perform private.reput_proposer_fiches();
  v_synchro := private.reput_synchroniser(null);
  begin
    perform private.battre_ouvrier('reput', array['reput.redeposer', 'reput.avis_reglement'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'accuses', v_accuses, 'avis', v_avis, 'erreurs', v_erreurs,
                         'avis_reglement', v_avis_reglement, 'escalades', v_escalades, 'synchronisees', v_synchro), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'accuses', v_accuses, 'avis', v_avis, 'erreurs', v_erreurs,
                            'avis_reglement', v_avis_reglement, 'escalades', v_escalades, 'synchronisees', v_synchro);
end $function$;

revoke execute on function private.reput_proposer_fiches() from public, anon, authenticated;
grant execute on function private.reput_proposer_fiches() to service_role;
