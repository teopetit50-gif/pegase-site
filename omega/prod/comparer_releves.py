#!/usr/bin/env python3
"""Compare deux relevés de omega/prod/releve.sql (categorie<TAB>objet<TAB>md5) et écrit les écarts en Markdown.

    python3 omega/prod/comparer_releves.py A.tsv B.tsv [--noms A B] [--sans-site] [--detail]

--sans-site : retire les objets propres au site omegaai.fr qui n'existent qu'en production (liste SITE_PRODUCTION
              ci-dessous, relevée le 25/10) et l'outillage de la recette (depot_*, tests_*) ; les migrations sont
              toujours comptées à part (les historiques diffèrent par construction).
"""
import re, sys

OUTILLAGE_RECETTE = re.compile(r'^private\.(depot_demander|depot_executer|tests_en_tache|tester_sans_trace|sorties_tests)\b|^tests\.|pgtap')
# Objets du site (v1 à v3, comptes, Stripe, audits, prospects, veille) : en production seulement, à garder tels quels.
SITE_PRODUCTION = re.compile(r'^(public\.)?(achats|affectations|agenda_|anomalies|appels|articles_publies|attentes|commandes_site|config_moteurs|connaissances|contacts|debiteurs|demandes_abonnement|documents|dossiers|ecarts|echeances_|evenements_planning|factures|indisponibilites|interventions|journal_reglages|lignes_vocal|marches_publics|mises_en_demeure|modeles|notifications_relai|obligations|observations_reseau|omega_|paliers_entreprise|parametres|politiques_envoi|prerequis_moteur|rapports|rapprochements|reception|recettes|recherches|relances|reservations|ressaisies|sources_veille|specs|stripe_evenements|tentatives_securite|usage_ia|validations|veille_|versions_fonctions|activite_mensuelle|couts_ia_mensuels|encours_clients|sante_clients|validations_en_retard|agenda_public|annuler_demande|commander_site|confirmer_paiements|demande_pour_confirmation|demander_abonnement|f_checklist_collecte|f_cle_fournisseur|f_cloisons_|f_elargir_check_liste|f_installation_prete|f_journal_append_only|f_journal_immuable|f_prerequis_|f_verifier_signature_|f_verrous_avant_envoi|finaliser_installation|limiter_contact|mes_commandes_site|mes_demandes|modifier_installation|poser_abonnement_stripe|reserver_audit)')

def lire(chemin):
    d = {}
    for ligne in open(chemin, encoding='utf-8'):
        morceaux = ligne.rstrip('\n').split('\t')
        if len(morceaux) == 3:
            d[(morceaux[0], morceaux[1])] = morceaux[2]
    return d

def principal():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    a, b = lire(args[0]), lire(args[1])
    na, nb = (args[2], args[3]) if len(args) >= 4 else ('A', 'B')
    sans_site = '--sans-site' in sys.argv
    def garde(k):
        c, o = k
        if OUTILLAGE_RECETTE.search(o): return False
        if sans_site and c != 'migration':
            nom = o.split('.')[1] if o.startswith(('public.', 'private.')) else o
            if c in ('contrainte', 'declencheur', 'politique') and o.count('.') >= 2:
                nom = o.split('.')[1]
            if SITE_PRODUCTION.match(nom) and k not in b: return False
        return True
    cats = sorted({c for c, _ in a} | {c for c, _ in b})
    print(f'| Catégorie | {na} | {nb} | seulement {nb} | seulement {na} | différents |')
    print('|---|---|---|---|---|---|')
    ecarts = {}
    for c in cats:
        pa = {o: e for (cc, o), e in a.items() if cc == c and garde((cc, o))}
        pb = {o: e for (cc, o), e in b.items() if cc == c and garde((cc, o))}
        manque, trop = sorted(pb.keys() - pa.keys()), sorted(pa.keys() - pb.keys())
        diff = sorted(o for o in pa.keys() & pb.keys() if pa[o] != pb[o])
        ecarts[c] = (manque, trop, diff)
        print(f'| {c} | {len(pa)} | {len(pb)} | {len(manque)} | {len(trop)} | {len(diff)} |')
    if '--detail' in sys.argv:
        for c, (manque, trop, diff) in ecarts.items():
            if c == 'migration': continue
            for titre, liste in ((f'seulement {nb}', manque), (f'seulement {na}', trop), ('différents', diff)):
                if liste:
                    print(f'\n### {c} — {titre} ({len(liste)})\n')
                    print(', '.join(f'`{o}`' for o in liste))

principal()
