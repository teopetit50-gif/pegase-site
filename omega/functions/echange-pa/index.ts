// Ouvrier ÉCHANGE-PA — fonction Edge appelée chaque minute (pg_cron → pg_net, clé de service),
// verify_jwt true. Dépose les statuts de cycle de vie à la plateforme agréée, relève ce qu'elle
// a reçu. Voir passage.ts.
// Sans PA_FLOW_URL / PA_TOKEN_URL / PA_CLIENT_ID / PA_CLIENT_SECRET : PA non branchée,
// les travaux sont reportés, rien n'est relevé, le battement le dit (pa_branchee false).
// Sur la recette, recette.ts branche le bac à sable sans secret.

import { configurationAfnorDepuisEnvironnement } from "./afnor.ts";
import { servirOuvrier } from "./edge.ts";

servirOuvrier(configurationAfnorDepuisEnvironnement(), "secrets");
