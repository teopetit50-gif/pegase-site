-- reput_omega.sql — RECETTE : Omega devient son propre client REPUT (session C3, 18/10/2026, demande de Teo).
--
-- Client : celui dont le slug est « omega » (créé par A3). Rien n'est fait s'il est introuvable.
-- Ce que ça pose, rejouable, sans rien effacer :
--   · REPUT installé (réglages, sujets par défaut) ; signature « Omega.AI » ; module d'envoi en mode ESSAI ;
--   · la base de connaissances d'Omega, tirée MOT POUR MOT de lib/content.ts et des pages /offres de main
--     (source citée sur chaque fiche) : aucune phrase qui n'y figure pas, aucun prix.
--   · AUCUN accord permanent : toute réponse attend la validation.
-- Les fiches sont posées en BROUILLON : une fiche n'entre dans la base en vigueur que validée par une personne
-- d'Omega (écran REPUT → Base de connaissances → Valider). Les valider ici, au nom de quelqu'un, mentirait au journal.
-- Délibérément laissé hors de la base (phrases du site que Teo a tranchées le 17/10 ou qui engagent un chiffre) :
--   « Une demande reçue à 21 h reçoit sa réponse à 21 h » (vrai seulement sur sujet autorisé) ; le plafond du
--   Chèque TIC ; « aucun compte à créer » (la validation se fait dans l'espace). Une question sur un prix est
--   donc hors base : elle est transférée.

do $$
declare
  v_client uuid := (select c.id from public.clients c
                    where coalesce(to_jsonb(c) ->> 'slug', c.config ->> 'slug') = 'omega' limit 1);
  v_n int := 0;
  f record;
begin
  if v_client is null then
    raise notice 'Aucun client de slug « omega » : rien n''est posé.';
    return;
  end if;
  perform public.reput_installer(v_client);
  update public.reput_reglages set signature = 'Omega.AI' where client_id = v_client and entite_id is null and signature is null;
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, canaux)
  select v_client, 'reput', 'essai',
         coalesce((select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module is null), 'essais@omegaai.fr'),
         array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'reput');

  for f in select * from (values
    ('information', 'information', 'Que propose Omega.AI ?',
     $t$Sécuriser les encaissements, réactiver le chiffre qui dort dans votre historique, répondre à toute heure, structurer les flux documentaires. Quatre systèmes, intégrés aux outils que vos équipes utilisent déjà.$t$,
     'lib/content.ts — FAMILLES « Ce qui se déploie », desc'),
    ('information', 'information', 'CASHD · encaissements',
     $t$Les devis restés sans réponse et les factures échues font l'objet d'une relance graduée, rédigée au cas par cas selon le montant en jeu, l'ancienneté du retard et l'historique du compte. Le recouvrement cesse de dépendre de la vigilance et de la disponibilité d'une seule personne. Relance à J+3, J+7, J+21, aucun envoi sans votre validation.$t$,
     'lib/content.ts — CASHD, job + benefit (/offres/relances-impayes)'),
    ('information', 'information', 'OFFLOAD · réactivation commerciale',
     $t$Les clients inactifs sont identifiés dans votre historique de ventes, classés par valeur et par récence, puis recontactés un par un avec un message ancré dans ce qu'ils ont réellement acheté. Les entretiens qui redeviennent dus et les commandes que personne n'est venu reprendre entrent dans la même liste. Les clients inactifs classés par valeur, un message par compte et par trimestre.$t$,
     'lib/content.ts — OFFLOAD, job + benefit (/offres/nouvelles-affaires)'),
    ('information', 'information', 'REPUT · demandes entrantes & avis',
     $t$Les demandes reçues par e-mail et par WhatsApp (horaires, tarifs, disponibilités, prise de rendez-vous) obtiennent une réponse à toute heure, tirée de la base de connaissances validée par vos équipes et jamais inventée. Chaque client satisfait se voit ensuite demander un avis au moment où il est le plus enclin à le laisser.$t$,
     'lib/content.ts — REPUT, job (/offres/demandes-clients)'),
    ('information', 'information', 'FILED · flux documentaires',
     $t$Chaque document reçu est lu, quels qu'en soient le type et le format — facture, bon de livraison, contrat, courrier —, ses informations extraites puis contrôlées, la pièce classée au bon dossier et la réponse qu'elle appelle rédigée. Aucune ressaisie, aucune pièce recherchée en urgence. Tout document reçu, lu et contrôlé, classé au bon dossier, la réponse rédigée.$t$,
     'lib/content.ts — FILED, job + benefit (/offres/factures-fournisseurs)'),
    ('information', 'information', 'Ce qui est inclus dans chaque déploiement',
     $t$Un état de l'activité chaque matin, et la garantie que rien ne part sans validation. Ce ne sont pas des options : ils accompagnent chaque installation dès le premier jour.$t$,
     'lib/content.ts — FAMILLES « Inclus », desc'),
    ('information', 'information', 'PULSE · le point du matin',
     $t$Chaque matin, un message unique rassemble ce qui est parti la veille, ce qui attend validation, ce qui a été bloqué et l'état de l'encours. Chaque semaine, le système vous propose ce qu'il a compris de vos corrections : vous validez ou refusez, et il ne retient que ce que vous avez accepté. L'état réel de l'activité en un message, lu en deux minutes.$t$,
     'lib/content.ts — PULSE, job + benefit'),
    ('information', 'information', 'VAULT · validation et verrous',
     $t$Rien ne part sans validation. La demande d'arrêt d'un client interrompt tout, définitivement et sur tous les canaux. Douze contrôles inscrits dans la base de données elle-même refusent ce qui ne doit pas partir : relancer un compte qui a réglé, écrire un dimanche soir, envoyer deux messages coup sur coup au même interlocuteur. Douze contrôles avant chaque envoi, et un journal de tout ce qui est parti.$t$,
     'lib/content.ts — VAULT, job + benefit'),
    ('information', 'information', 'Intégration, contrôle et sécurité',
     $t$Vos outils restent les vôtres. Les systèmes s'y branchent, sans interface de plus. Les règles s'écrivent avec vous. Les actions sensibles attendent votre accord. Un environnement cloisonné par client, des données chiffrées, des accès tracés.$t$,
     'app/offres/page.tsx — ARGUMENTS (Intégration, Contrôle, Sécurité)'),
    ('tarifs', 'information', 'Financement : le Chèque TIC',
     $t$Une partie de l'investissement peut relever du Chèque TIC, aide de la Région Guadeloupe aux entreprises qui y sont immatriculées.$t$,
     'app/offres/page.tsx — ARGUMENTS (Financement)'),
    ('information', 'information', 'Un système sur mesure',
     $t$Quand aucun des quatre systèmes ne couvre le besoin, Omega.AI conçoit celui qui manque : cadré, chiffré, puis construit sur vos règles et intégré à votre environnement. Aucun secteur n'est exclu : un système sur mesure se justifie dès qu'une tâche se répète selon des règles qui peuvent s'écrire, quel que soit le métier.$t$,
     'app/offres/sur-mesure/page.tsx — description, pourqui'),
    ('information', 'question', 'Y a-t-il des besoins que vous refusez ?',
     $t$Oui, deux cas. Ceux dont les règles ne peuvent pas s'écrire : si chaque situation demande un jugement humain, l'automatisation n'apporte rien de fiable. Et ceux dont le gain ne couvre pas le coût de construction : nous le disons au cadrage, avant tout devis.$t$,
     'app/offres/sur-mesure/page.tsx — FAQ'),
    ('information', 'question', 'Travaillez-vous dans mon secteur ?',
     $t$La question porte moins sur le secteur que sur le processus. Une extraction de données depuis des documents fonctionne de la même façon chez un transporteur et dans un groupe de distribution : seuls les règles métier et le vocabulaire changent, et c'est précisément ce que le cadrage écrit avec vos équipes.$t$,
     'app/offres/sur-mesure/page.tsx — FAQ'),
    ('devis', 'question', 'Quels sont les délais et le coût ?',
     $t$Ils dépendent entièrement du périmètre, et c'est la raison pour laquelle le cadrage précède le devis. Un pont entre deux outils se compte en jours, un logiciel métier complet en semaines. Vous recevez un montant ferme et un périmètre écrit avant de vous engager.$t$,
     'app/offres/sur-mesure/page.tsx — FAQ'),
    ('information', 'question', 'À qui appartient ce qui est construit ?',
     $t$Les données restent les vôtres dans tous les cas, comme pour les systèmes du catalogue : hébergement dans l'Union européenne, export et suppression sur demande. Les conditions de propriété et de reprise du système lui-même sont fixées au devis, avant la construction.$t$,
     'app/offres/sur-mesure/page.tsx — FAQ'),
    ('rendez_vous', 'information', 'L''audit',
     $t$Un audit de trente minutes suffit à mesurer où vous en êtes. L'installation se fait sur les outils existants, sans changer de méthode de travail. Elle commence par une mesure, pas par une promesse. Si le chiffre ne justifie pas un système, la recommandation est de ne rien installer.$t$,
     'lib/content.ts — articles (facturation-electronique-2026, btp-devis-jamais-relances, garage-fichier-clients)')
  ) as x(sujet, genre, titre, contenu, source)
  loop
    if not exists (select 1 from public.reput_connaissances k where k.client_id = v_client and k.titre = f.titre) then
      insert into public.reput_connaissances (id, client_id, origine_id, sujet, genre, titre, contenu, source, statut)
      select g.id, v_client, g.id, f.sujet, f.genre, f.titre, f.contenu, f.source, 'brouillon' from (select gen_random_uuid() as id) g;
      v_n := v_n + 1;
    end if;
  end loop;
  raise notice 'REPUT Omega : % fiche(s) posée(s) en brouillon ; accords permanents actifs : %.', v_n,
    (select count(*) from public.politiques p where p.client_id = v_client and p.module = 'reput' and p.statut = 'active');
end $$;
