# Capacités à valider avant tout partage du site

> Relevé produit par `node outils/capacites-a-valider.mjs`. Ne pas le tenir à la main :
> il se régénère depuis les quatre catalogues.

Chaque ligne cochée existe et se montre en démonstration. Chaque ligne **non cochée** est écrite sur la page sans être construite : elle doit être bâtie, retirée, ou marquée comme feuille de route datée avant que la page soit montrée à qui que ce soit.

| Module | Page | Capacités | Attestées | À trancher |
|---|---|---|---|---|
| FILED | `/offres/factures-fournisseurs` | 41 | 10 | **31** |
| CASHD | `/offres/relances-impayes` | 50 | 21 | **29** |
| RELOAD | `/offres/nouvelles-affaires` | 45 | 20 | **25** |
| FRONTD | `/offres/demandes-clients` | 44 | 16 | **28** |
| **Total** | | **180** | **67** | **113** |

## FILED — `/offres/factures-fournisseurs`

**Réception et lecture**

- [ ] Un fichier qui contient plusieurs factures est découpé pièce par pièce.
- [ ] Les factures manuscrites et les tickets de caisse sont lus et rattachés.
- [ ] Les formats structurés Factur-X, UBL et CII sont reçus et lus tels quels.
- [ ] Un dépôt par lot arrive depuis un dossier partagé ou un transfert de fichiers.
- [ ] Un historique de plusieurs exercices se reprend en une fois à l'installation.

**Ce qui est extrait**

- [ ] Les lignes de détail : désignation, quantité, prix unitaire et remise.
- [ ] La TVA multi-taux, l'autoliquidation, l'exonération et la TVA sur les débits.
- [ ] La devise, le taux de change et la contre-valeur en euros au jour d'émission.
- [ ] Les références de commande, de bon de livraison et de contrat citées sur la pièce.
- [ ] Les mentions d'escompte, de pénalité de retard et d'indemnité forfaitaire.

**Contrôles avant classement**

- [ ] Un changement de coordonnées bancaires chez un fournisseur connu déclenche une alerte.
- [ ] Le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement.
- [ ] La commande, la réception et la facture sont rapprochées avant toute validation.
- [ ] Un écart de prix ou de quantité par rapport à la commande est signalé, pas absorbé.
- [ ] Une pièce reçue après la clôture est orientée vers l'exercice suivant, avec sa mention.

**Circuit de validation**

- [ ] L'approbation suit le montant, le centre de coût et la société concernée.
- [ ] Au-delà d'un seuil que vous fixez, deux approbations distinctes sont exigées.
- [ ] Une délégation d'approbation se pose pour une absence, avec sa date de fin.
- [ ] L'approbateur qui n'a pas répondu est relancé, puis la pièce remonte d'un niveau.
- [ ] Le commentaire, la pièce jointe et le motif de refus restent attachés à la facture.
- [ ] Celui qui saisit et celui qui approuve ne peuvent pas être la même personne.

**Comptabilité et archivage**

- [ ] L'imputation analytique s'apprend sur vos écritures passées, fournisseur par fournisseur.
- [ ] Chaque pièce est affectée au plan comptable et au centre de coût qui la portent.
- [ ] Les charges récurrentes produisent leurs écritures d'abonnement sans ressaisie.
- [ ] L'archivage est à valeur probante, et la piste d'audit reste reconstituable.
- [ ] Le journal des pièces reçues est numéroté en continu et ne se modifie pas.

**Pilotage**

- [ ] L'engagé du mois se lit par fournisseur, par société et par centre de coût.
- [ ] L'échéancier fournisseur donne la prévision de décaissement à trente et soixante jours.
- [ ] Le délai moyen de traitement se mesure de la réception au classement.
- [ ] Les pièces bloquées, en litige ou en attente d'approbation sont comptées en continu.
- [ ] Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.

## CASHD — `/offres/relances-impayes`

**Suivi de l'encours**

- [ ] Un échéancier négocié remplace l'échéance d'origine, et le suivi épouse ses termes.

**Relance et escalade**

- [ ] Les envois respectent les jours ouvrés, les jours fériés locaux et vos fenêtres horaires.
- [ ] Les comptes export reçoivent leur relance dans leur langue de facturation.

**Litiges et exceptions**

- [ ] Une contestation écrite bascule la facture en litige et la sort du cycle.
- [ ] Le commercial en charge du compte est notifié dès l'ouverture du litige.
- [ ] Une facture contestée sur une seule ligne laisse le reste en relance.
- [ ] La reprise des relances demande une décision, jamais un simple délai écoulé.
- [ ] Le contact de facturation reçoit les relances, le contact commercial reçoit les alertes.
- [ ] Le dossier de litige réunit les pièces, les envois et les accusés de réception.
- [ ] Le courrier recommandé électronique est préparé quand la créance l'exige.

**Encaissement et rapprochement**

- [ ] Les règlements partiels sont imputés, et le solde dû continue d'être suivi.
- [ ] Le lettrage rapproche chaque encaissement de la facture qu'il solde.
- [ ] Les écritures bancaires sont rapprochées de l'encours, jour après jour.
- [ ] Un virement sans référence est proposé au rapprochement avec les factures probables.
- [ ] Les avoirs et les acomptes sont déduits avant tout calcul du solde dû.
- [ ] Les pénalités de retard et l'indemnité forfaitaire de recouvrement sont calculées.
- [ ] Un lien de paiement accompagne la relance et s'éteint dès le règlement.
- [ ] Les factures en devise étrangère sont suivies dans leur devise et en euros.

**Risque client**

- [ ] Un plafond d'encours se fixe par compte, à partir de son historique.
- [ ] Le dépassement du plafond déclenche une alerte avant toute nouvelle commande.
- [ ] Une commande au-delà du plafond est bloquée jusqu'à la décision d'un responsable.
- [ ] Un compte qui se dégrade est signalé avant que le retard s'installe.
- [ ] Le dossier destiné à l'assurance-crédit est constitué avec les pièces exigées.
- [ ] Le dossier de recouvrement judiciaire est remis complet à qui vous désignez.

**Pilotage**

- [ ] La prévision d'encaissement est établie à trente et à soixante jours.
- [ ] Le taux de réponse aux relances se suit palier par palier.
- [ ] Les créances en litige, en pause et en recouvrement sont comptées en continu.
- [ ] Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.
- [ ] Les seuils et les cadences se modifient, et chaque changement reste daté.

## RELOAD — `/offres/nouvelles-affaires`

**Lecture du fichier client**

- [ ] La fréquence d'achat habituelle d'un compte est mesurée, puis son décrochage détecté.
- [ ] Les comptes sont priorisés par valeur attendue, pas par ordre alphabétique.
- [ ] Les doublons de fiches sont rapprochés quand deux lignes désignent le même client.
- [ ] Les entités d'un même groupe client sont regroupées sous une raison sociale mère.
- [ ] Un tableur sans colonne de date est exploité à partir des dates de facture.
- [ ] Les contrats et les équipements installés sont suivis jusqu'à leur échéance.

**Campagnes et cadence**

- [ ] Un compte qui a refusé entre en quarantaine pour la durée que vous fixez.

**Veille des marchés publics**

- [ ] Le journal de l'Union européenne est relevé au même rythme pour les seuils élevés.
- [ ] Les marchés en cours qui arrivent à renouvellement sont repérés avant leur publication.

**Analyse d'une consultation**

- [ ] Le dossier de consultation est téléchargé et lu dès la publication.
- [ ] Les pièces à produire sont listées, et les manquantes signalées.
- [ ] Les critères de jugement et leur pondération sont extraits du règlement.
- [ ] L'allotissement est détaillé, lot par lot, avec les montants estimés.
- [ ] Les dates limites entrent dans votre agenda, avec une alerte avant échéance.
- [ ] L'historique public des attributions donne les titulaires sortants et leurs prix.
- [ ] Une co-traitance est suggérée quand un lot dépasse vos capacités seules.

**Garde-fous commerciaux**

- [ ] Un compte suivi en direct par un commercial est exclu du cycle automatique.
- [ ] Le commercial en charge reprend la main sur un compte d'un seul geste.
- [ ] Les listes d'exclusion se tiennent par compte, par secteur et par commercial.

**Pilotage**

- [ ] Le chiffre d'affaires remis en jeu se lit vague par vague.
- [ ] Les comptes réactivés sont suivis jusqu'à leur première commande.
- [ ] Le taux de réponse se compare par segment, par canal et par message.
- [ ] Les consultations retenues, déposées et gagnées alimentent un tableau de suivi.
- [ ] Les résultats se lisent par entité, par site et en consolidé.
- [ ] Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.

## FRONTD — `/offres/demandes-clients`

**Canaux et réception**

- [ ] La messagerie instantanée du site est tenue aux mêmes règles que le reste.
- [ ] Les messages reçus sur les réseaux sociaux rejoignent la même file.
- [ ] Un appel non décroché est transcrit, puis traité comme une demande écrite.
- [ ] Les pièces jointes sont conservées et rattachées à la demande.

**Compréhension et qualification**

- [ ] Le client est reconnu à partir de son numéro ou de son adresse avant toute réponse.
- [ ] Son contrat, son historique et ses interventions passées sont lus en même temps.
- [ ] Une demande qui relève de deux services est orientée vers le premier concerné.
- [ ] Une même demande reçue sur deux canaux est reconnue comme un seul dossier.
- [ ] La langue du client est identifiée dès le premier message.

**Réponse et connaissances**

- [ ] La base est versionnée : chaque règle porte sa date et son auteur.
- [ ] Une modification de tarif ou d'horaire s'applique à la réponse suivante.
- [ ] Le ton, la signature et les formules se règlent entité par entité.
- [ ] Les réponses se font en plusieurs langues, avec le même périmètre de contenu.

**Rendez-vous et agenda**

- [ ] Le client replanifie ou annule par le même canal, sans appeler personne.
- [ ] La durée proposée dépend du type d'intervention demandé.
- [ ] Les ressources et les personnes indisponibles sont exclues des créneaux proposés.

**Escalade et astreinte**

- [ ] Chaque type de demande porte un délai de traitement que vous fixez.
- [ ] Le délai dépassé fait remonter la demande au responsable du service.
- [ ] Une urgence déclenche l'appel de l'astreinte, selon le tour de garde en cours.
- [ ] Une réclamation est identifiée comme telle et sort du traitement courant.
- [ ] Un client en litige ouvert ne reçoit aucune réponse automatisée.
- [ ] La demande de parler à une personne est honorée sans discussion.

**Pilotage**

- [ ] Le volume de demandes se lit par canal, par service et par heure de la journée.
- [ ] Le délai de première réponse est mesuré, demande par demande.
- [ ] La part des demandes traitées sans intervention humaine est suivie dans le temps.
- [ ] Les sujets qui reviennent sont remontés, et ils nourrissent la base de connaissances.
- [ ] Les avis obtenus après intervention sont comptés par service et par site.
- [ ] Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe.

