-- Lorani b5_24 — référentiel « libelles », lot 1/1 (49 lignes). Généré par omega/recette-b5/risques/generer.mjs.
-- Source : https://files.georisques.fr/GASPAR/gaspar.zip (ddrm_risq_gaspar_2026-10-05.csv) (2026-10-05). Licence ouverte Etalab.
select private.lorani_ref_charger('libelles', $l$
11;Inondation
12;Mouvement de terrain
13;Séisme
14;Avalanche
15;Eruption volcanique
16;Feu de forêt
17;Phénomène lié à l'atmosphère
18;Radon
21;Risque industriel
22;Nucléaire
23;Rupture de barrage
24;Transport de marchandises dangereuses
25;Engins de guerre
31;Affaissement minier
32;Inondations de terrains miniers
33;Emissions en surface de gaz de mine
34;Echauffement des terrains de dépôts
112;Par une crue à débordement lent de cours d'eau
113;Par une crue torrentielle ou à montée rapide de cours d'eau
114;Par ruissellement et coulée de boue
115;Par lave torrentielle (torrent et talweg)
116;Par remontées de nappes naturelles
117;Par submersion marine
121;Affaissements et effondrements d'origine anthropique (anciennes carrières souterraines, hors mines)
122;Affaissements et effondrements d'origine naturelle (cavités souterraines)
123;Eboulement ou chutes de pierres et de blocs
124;Glissement de terrain
125;Avancée dunaire
126;Recul du trait de côte et de falaises
127;Tassements différentiels
171;Cyclone / Ouragan (vent)
172;Tempête et grains (vent)
174;Foudre
175;Grêle
176;Neige et pluies verglaçantes
211;Effet thermique
212;Effet de surpression
213;Effet toxique
214;Effet de projection
311;Effondrements généralisés
312;Effondrements localisés
313;Affaissements progressifs
314;Tassements
315;Glissements ou mouvements de pente
316;Coulées
317;Ecroulements rocheux
321;Pollution des eaux souterraines et de surface
322;Pollution des sédiments et sols
AUTRE;Autre risque
$l$, 'https://files.georisques.fr/GASPAR/gaspar.zip (ddrm_risq_gaspar_2026-10-05.csv)', '2026-10-05');
