"""offload_omega_personnes_morales — le script de filtre et d'import des comptes d'Omega dans OFFLOAD (session C4, 19/10/2026).

Décision du bureau (19/10, délégation de Teo), point 7 : « Import des comptes d'Omega : personnes morales SEULEMENT.
Les 1 933 entrepreneurs individuels restent exclus. Mode essai, aucun envoi. Tu écris le script de filtre et d'import ;
c'est moi qui l'exécute sur la recette. »

Ce fichier ne contient AUCUNE donnée : il lit la liste de prospection publiée sur la branche prospection-guadeloupe
(omega/prospection/guadeloupe.csv) et écrit un fichier SQL, à jouer par le coordinateur sur la RECETTE seulement.

  git show origin/prospection-guadeloupe:omega/prospection/guadeloupe.csv > /tmp/guadeloupe.csv
  python3 -I omega/modules/offload/outils/offload_omega_personnes_morales.py /tmp/guadeloupe.csv /tmp/offload_omega_pm.sql
  (le script affiche les comptes : lus, gardés, écartés et pourquoi ; puis jouer /tmp/offload_omega_pm.sql sur la recette)

LE FILTRE :
  · gardées : les lignes dont la colonne personne_physique vaut exactement « non » (personnes morales) ;
  · écartées : « oui » (entrepreneurs individuels : le RGPD s'applique pleinement) ET les lignes sans valeur (on ne
    sait pas : on n'importe pas) ;
  · minimisation : ni dirigeant, ni adresse, ni site ; un courriel dont la partie locale ressemble à un prénom.nom
    (et pas à une boîte de service : contact@, accueil@, devis@…) n'est pas repris ;
  · une ligne par SIRET (à défaut, une clé « GP- » stable sur raison sociale, commune et adresse).

CE QUE LE SQL POSE (rejouable, rien n'est effacé, aucun envoi) :
  · OFFLOAD installé pour Omega (slug « omega »), en mode essai ; une ligne de réglage d'envoi offload déjà en réel est
    remise en essai ; aucun réglage d'envoi n'est créé (sans réglage, le socle retient tout : CONFIG_ABSENTE) ;
  · les comptes en « exclu » du cycle, avec le motif écrit, AUCUN achat inventé : sans achat, OFFLOAD ne présume aucun
    consentement et n'ouvre aucune reprise ;
  · un contrôle final : comptes, exclus, achats = 0, reprises = 0, envois = 0, mode = essai, entrepreneurs individuels = 0.
"""
import csv
import hashlib
import re
import sys

GENERIQUES = re.compile(r'^(contact|info|infos|accueil|bonjour|hello|admin|administration|secretariat|standard|direction|compta|'
                        r'comptabilite|commercial|commandes?|devis|sav|service|serviceclient|reservations?|reception|atelier|'
                        r'boutique|magasin|agence|cabinet|office|mail|courrier|rh|recrutement|facturation|ventes?)')
NOMINATIF = re.compile(r'^[a-zà-ÿ]+[._-][a-zà-ÿ]+\d*$')
MOTIF = ("Prospect de la liste Guadeloupe (collecte publique du 06/10/2026), personne morale, jamais client : "
         "aucune sollicitation sans accord écrit de Teo.")
CIBLE = """(select c.id as client_id, e.id as entite_id from public.clients c
       join public.entites e on e.client_id = c.id and e.principale
       where c.config ->> 'slug' = 'omega')"""


def q(v, n):
    v = (v or '').strip()
    if not v:
        return 'null'
    return "'" + v[:n].replace("'", "''") + "'"


def main(src, dest):
    lignes = list(csv.DictReader(open(src, encoding='utf-8-sig'), delimiter=';'))
    vus, valeurs = set(), []
    ecartes = {'entrepreneur_individuel': 0, 'forme_inconnue': 0, 'doublon': 0, 'courriel_nominatif_retire': 0}
    for x in lignes:
        pp = (x.get('personne_physique') or '').strip().lower()
        if pp == 'oui':
            ecartes['entrepreneur_individuel'] += 1
            continue
        if pp != 'non':
            ecartes['forme_inconnue'] += 1
            continue
        ref = (x.get('siret') or '').strip()
        if not ref:
            ref = 'GP-' + hashlib.sha1((x['raison_sociale'] + '|' + x['commune'] + '|' + x['adresse']).encode()).hexdigest()[:12]
        if ref in vus:
            ecartes['doublon'] += 1
            continue
        vus.add(ref)
        courriel = (x.get('courriel') or '').strip().lower()
        local = courriel.split('@')[0]
        if courriel and NOMINATIF.match(local) and not GENERIQUES.match(local):
            courriel = ''
            ecartes['courriel_nominatif_retire'] += 1
        nom = (x.get('enseigne') or '').strip() or (x.get('raison_sociale') or '').strip()
        secteur = ((x.get('module') or '') + ' · ' + (x.get('naf') or '')).strip(' ·')
        valeurs.append(f"({q(ref, 120)},{q(nom, 200)},{q(courriel, 320)},{q(x.get('telephone'), 40)},{q(x.get('commune'), 120)},{q(secteur, 120)})")

    n = len(valeurs)
    out = [f"""-- offload_omega_pm — Omega, son propre client OFFLOAD, sur la RECETTE : personnes morales seulement.
-- Écrit par omega/modules/offload/outils/offload_omega_personnes_morales.py (session C4, 19/10/2026, décision du bureau).
-- PAS un test : rien n'est annulé. Rejouable. Rien n'est effacé. Aucun envoi. RECETTE SEULEMENT.
-- Lignes lues : {len(lignes)} ; comptes gardés : {n} ; écartés : {ecartes['entrepreneur_individuel']} entrepreneurs individuels,
-- {ecartes['forme_inconnue']} sans forme connue, {ecartes['doublon']} doublons ; {ecartes['courriel_nominatif_retire']} courriels nominatifs non repris.

-- ═══ A. Le client Omega existe, une seule fois
do $$
declare n integer;
begin
  select count(*) into n from public.clients c where c.config ->> 'slug' = 'omega';
  if n <> 1 then
    raise exception 'Client « omega » introuvable ou en double (%). Rien n''est posé.', n;
  end if;
end $$;

-- ═══ B. Jamais de réel depuis ce fichier
update public.reglages_envois r set mode = 'essai'
 where r.module = 'offload' and r.mode is distinct from 'essai'
   and r.client_id in (select client_id from {CIBLE} k);

-- ═══ C. OFFLOAD installé pour Omega (mode essai)
select public.offload_installer(k.client_id, null) from {CIBLE} k
 where not exists (select 1 from public.offload_reglages g where g.client_id = k.client_id);
update public.offload_reglages g set mode = 'essai', maj_le = now()
 where g.mode is distinct from 'essai' and g.client_id in (select client_id from {CIBLE} k);
"""]
    for i in range(0, n, 1500):
        part = valeurs[i:i + 1500]
        out.append(f"""-- ═══ D{i // 1500 + 1}. Comptes {i + 1} à {i + len(part)} (personnes morales, exclus du cycle)
insert into public.offload_comptes (client_id, entite_id, ref, nom, email, telephone, ville, secteur, source, statut, statut_motif, statut_le)
select k.client_id, k.entite_id, v.ref, v.nom, v.email, v.telephone, v.ville, v.secteur, 'import', 'exclu',
       '{MOTIF.replace("'", "''")}', now()
from (values
{(',' + chr(10)).join(part)}
) v(ref, nom, email, telephone, ville, secteur)
cross join {CIBLE} k
on conflict (client_id, entite_id, ref) do nothing;
""")
    out.append(f"""-- ═══ E. Contrôle
select (select count(*) from public.offload_comptes c where c.client_id = k.client_id) as comptes,
       (select count(*) from public.offload_comptes c where c.client_id = k.client_id and c.statut = 'exclu') as exclus,
       (select count(*) from public.offload_achats a where a.client_id = k.client_id) as achats,
       (select count(*) from public.offload_reprises r where r.client_id = k.client_id) as reprises,
       (select count(*) from public.envois e where e.client_id = k.client_id and e.module = 'offload') as envois,
       (select g.mode from public.offload_reglages g where g.client_id = k.client_id) as mode
from {CIBLE} k;
-- Attendu : comptes = {n} (si rien n'était importé avant), exclus = comptes, achats = 0, reprises = 0, envois = 0, mode = essai.
""")
    open(dest, 'w', encoding='utf-8').write('\n'.join(out))
    print(f"lues {len(lignes)} ; gardées {n} ; écartées : {ecartes}")


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit('usage : offload_omega_personnes_morales.py <guadeloupe.csv> <sortie.sql>')
    main(sys.argv[1], sys.argv[2])
