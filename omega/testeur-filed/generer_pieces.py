"""T-FILED — génère le jeu d'essai de départ (série 1), un PDF par cas.
Tous les fournisseurs, personnes et IBAN sont FICTIFS (code banque 99999,
qui n'existe pas). Même gabarit partout : seule l'erreur change.
usage : python3 -I generer_pieces.py <dossier_sortie>"""
import sys, os
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

SORTIE = sys.argv[1]
os.makedirs(SORTIE, exist_ok=True)

def cle_luhn(base8):
    s = 0
    for i, c in enumerate(reversed(base8)):
        d = int(c) * (2 if i % 2 == 0 else 1)
        s += d - 9 if d > 9 else d
    return str((10 - s % 10) % 10)

def siren(base8, fausse=False):
    k = cle_luhn(base8)
    if fausse: k = str((int(k) + 3) % 10)
    return base8 + k

def tva_intra(sir):
    return "FR%02d%s" % ((12 + 3 * (int(sir) % 97)) % 97, sir)

def iban(compte11):
    banque, guichet = "99999", "00001"
    cle = 97 - ((89 * int(banque) + 15 * int(guichet) + 3 * int(compte11)) % 97)
    bban = f"{banque}{guichet}{compte11}{cle:02d}"
    n = int(bban + "152700")  # FR00 -> F=15 R=27
    ib = f"FR{98 - n % 97:02d}{bban}"
    return " ".join(ib[i:i+4] for i in range(0, len(ib), 4))

FOURN = {
    "MCD": dict(nom="MATÉRIAUX CARAÏBES DISTRIBUTION SARL", adr="ZI de Jarry, rue des Fictifs", ville="97122 Baie-Mahault",
                siren=siren("91234561"), iban=iban("00012345601")),
    "QDM": dict(nom="QUINCAILLERIE DU MOULE SARL", adr="12 rue de l'Essai", ville="97160 Le Moule",
                siren=siren("91234562", fausse=True), iban=iban("00012345602")),
    "BAR": dict(nom="BÉTON ARCHIPEL SAS", adr="Chemin du Banc", ville="97180 Sainte-Anne",
                siren=siren("91234563"), iban=iban("00012345603")),
    "IST": dict(nom="INTÉRIM SOLEIL TRAVAIL TEMPORAIRE SAS", adr="5 allée Témoin", ville="97110 Pointe-à-Pitre",
                siren=siren("91234564"), iban=iban("00012345604")),
}
IBAN_BAR_2 = iban("00098765403")
CLIENT = ("BANC TEST FILED SAS", "Zone d'essai, lot 0", "97122 Baie-Mahault")
TIERS = ("SOCIÉTÉ TIERCE BTP SARL", "3 impasse Ailleurs", "97200 Fort-de-France")
CHANTIER = "Chantier : Résidence Les Flamboyants, Le Gosier"

def eur(x):
    s = f"{abs(x):,.2f}".replace(",", " ").replace(".", ",")
    return ("-" if x < 0 else "") + s + " €"

def page(c, f, titre, numero, date, echeance, lignes, client=CLIENT, iban_txt=None,
         ttc_force=None, mention=None, taux_titre="TVA"):
    W, H = A4
    y = H - 50
    c.setFont("Helvetica-Bold", 13); c.drawString(40, y, f["nom"])
    c.setFont("Helvetica", 9)
    for t in (f["adr"], f["ville"], f"SIREN {f['siren']} — TVA intracom. {tva_intra(f['siren'])}"):
        y -= 13; c.drawString(40, y, t)
    c.setFont("Helvetica-Bold", 16); c.drawRightString(W - 40, H - 50, titre)
    c.setFont("Helvetica", 10)
    c.drawRightString(W - 40, H - 68, f"N° {numero}")
    c.drawRightString(W - 40, H - 82, f"Date : {date}")
    if echeance: c.drawRightString(W - 40, H - 96, f"Échéance : {echeance}")
    y = H - 150
    c.setFont("Helvetica-Bold", 10); c.drawString(330, y, "Facturé à :")
    c.setFont("Helvetica", 10)
    for t in client: y -= 13; c.drawString(330, y, t)
    y -= 30; c.drawString(40, y, CHANTIER)
    y -= 25
    c.setFont("Helvetica-Bold", 9)
    for x, t in ((40, "Désignation"), (290, "Qté"), (340, "P.U. HT"), (410, "Taux TVA"), (480, "Total HT")):
        c.drawString(x, y, t)
    c.line(40, y - 4, W - 40, y - 4)
    c.setFont("Helvetica", 9)
    ht_par_taux = {}
    for (lib, q, pu, taux) in lignes:
        y -= 16
        tot = round(q * pu, 2)
        ht_par_taux[taux] = ht_par_taux.get(taux, 0) + tot
        c.drawString(40, y, lib); c.drawRightString(315, y, f"{q:g}")
        c.drawRightString(395, y, eur(pu))
        c.drawRightString(455, y, "Exonéré" if taux == 0 else f"{taux:g} %".replace(".", ","))
        c.drawRightString(W - 40, y, eur(tot))
    y -= 30
    ht = round(sum(ht_par_taux.values()), 2)
    tva_tot = 0
    rows = [("Total HT", ht)]
    for taux, base in sorted(ht_par_taux.items()):
        if taux == 0:
            rows.append(("Base exonérée (art. 295 du CGI)", base)); continue
        m = round(base * taux / 100 + 1e-9, 2); tva_tot += m
        rows.append((f"{taux_titre} {taux:g} % sur {eur(base)}".replace(".", ","), m))
    ttc = round(ht + tva_tot, 2) if ttc_force is None else ttc_force
    rows += [("Total TVA", round(tva_tot, 2)), ("Total TTC", ttc), ("Net à payer", ttc)]
    for lib, v in rows:
        c.setFont("Helvetica-Bold" if lib.startswith(("Total TTC", "Net")) else "Helvetica", 10)
        c.drawRightString(440, y, lib); c.drawRightString(W - 40, y, eur(v)); y -= 15
    y -= 15
    c.setFont("Helvetica", 8)
    c.drawString(40, y, "Prix incluant l'octroi de mer et l'octroi de mer régional. Paiement à 30 jours, par virement.")
    y -= 11
    c.drawString(40, y, "Pénalités de retard : 3 fois le taux d'intérêt légal. Indemnité forfaitaire pour frais de recouvrement : 40 €.")
    if mention: y -= 11; c.drawString(40, y, mention)
    y -= 18
    c.setFont("Helvetica-Bold", 9)
    c.drawString(40, y, f"IBAN : {iban_txt or f['iban']}   BIC : FICTFRP1XXX")
    c.showPage()

STD = [("Ciment CEM II 42,5 — sac 35 kg", 50, 9.80, 8.5), ("Fer à béton HA10 — barre 6 m", 20, 14.50, 8.5)]
D, E = "14/10/2026", "13/11/2026"

def piece(nom, *pages):
    c = canvas.Canvas(os.path.join(SORTIE, nom), pagesize=A4)
    c.setTitle(nom); c.setAuthor("T-FILED jeu d'essai")
    for kw in pages: page(c, **kw)
    c.save()

M, Q, B, I = FOURN["MCD"], FOURN["QDM"], FOURN["BAR"], FOURN["IST"]
base = dict(f=M, titre="FACTURE", date=D, echeance=E, lignes=STD)
piece("F0_temoin.pdf", dict(base, numero="MCD-2026-1001"))
piece("F1_siren_cle_fausse.pdf", dict(base, f=Q, numero="QDM-2026-1001"))
piece("F2a_iban_pose.pdf", dict(base, f=B, numero="BAR-2026-0501"))
piece("F2b_iban_change.pdf", dict(base, f=B, numero="BAR-2026-0502", iban_txt=IBAN_BAR_2))
piece("F3_tva_19.pdf", dict(base, numero="MCD-2026-1003", lignes=[(l, q, p, 19) for (l, q, p, _) in STD]))
piece("F4a_doublon_exact_rescanne.pdf", dict(base, numero="MCD-2026-1001"))
piece("F4b_meme_numero_2eur.pdf", dict(base, numero="MCD-2026-1001",
      lignes=[("Ciment CEM II 42,5 — sac 35 kg", 50, 9.84, 8.5), STD[1]]))
piece("F5_ttc_faux.pdf", dict(base, numero="MCD-2026-1005", ttc_force=856.30))
piece("F6_avoir_sans_origine.pdf", dict(base, titre="AVOIR", numero="MCD-AV-2026-0042",
      lignes=[("Remise commerciale", 1, -100.00, 8.5)]))
piece("F8_trois_taux.pdf", dict(base, numero="MCD-2026-1008", lignes=[
      ("Tôle bac acier 0,75 — exonérée art. 295", 10, 30.00, 0),
      ("Ciment CEM II 42,5 — sac 35 kg", 50, 9.80, 8.5),
      ("Manuel de pose DTU (ouvrage imprimé)", 4, 50.00, 2.1)]))
piece("F9_autre_destinataire.pdf", dict(base, numero="MCD-2026-1009", client=TIERS))
piece("F10_date_future.pdf", dict(base, numero="MCD-2026-1010", date="30/11/2026", echeance="30/12/2026"))
piece("F11_deux_factures.pdf", dict(base, numero="MCD-2026-1011"),
      dict(base, numero="MCD-2026-1012", lignes=[STD[0][:1] + (25, 9.80, 8.5)]))
masque = "FR76 **** **** " + M["iban"].replace(" ", "")[-4:]
piece("F12_iban_masque.pdf", dict(base, numero="MCD-2026-1013", iban_txt=masque))

# F7 : un relevé d'heures, pas une facture
c = canvas.Canvas(os.path.join(SORTIE, "F7_releve_heures_interim.pdf"), pagesize=A4)
W, H = A4
c.setFont("Helvetica-Bold", 13); c.drawString(40, H - 50, I["nom"])
c.setFont("Helvetica", 9); c.drawString(40, H - 63, f"{I['adr']} — {I['ville']} — SIREN {I['siren']}")
c.setFont("Helvetica-Bold", 16); c.drawRightString(W - 40, H - 50, "RELEVÉ D'HEURES")
c.setFont("Helvetica", 10)
c.drawRightString(W - 40, H - 68, "N° RH-2026-41-007"); c.drawRightString(W - 40, H - 82, "Semaine 41 — du 05/10/2026 au 11/10/2026")
c.drawString(330, H - 150, "Entreprise utilisatrice : " + CLIENT[0]); c.drawString(40, H - 180, CHANTIER)
c.drawString(40, H - 200, "Intérimaire : DUPONT-ESSAI Jean (fictif) — Maçon N2 — contrat de mission n° CM-0000")
y = H - 230
for j, h in (("Lundi 05/10", 8), ("Mardi 06/10", 8), ("Mercredi 07/10", 8), ("Jeudi 08/10", 8), ("Vendredi 09/10", 7)):
    c.drawString(60, y, j); c.drawRightString(300, y, f"{h} h"); y -= 15
c.setFont("Helvetica-Bold", 10); c.drawString(60, y - 5, "Total semaine"); c.drawRightString(300, y - 5, "39 h")
c.setFont("Helvetica", 9); c.drawString(40, y - 40, "Visa du chef de chantier : ________   Visa de l'intérimaire : ________")
c.drawString(40, y - 55, "Document de pointage. La facture correspondante sera émise en fin de mois.")
c.showPage(); c.save()

for k, f in FOURN.items(): print(k, f["siren"], tva_intra(f["siren"]), f["iban"])
print("BAR iban 2", IBAN_BAR_2, "| masque F12", masque)
