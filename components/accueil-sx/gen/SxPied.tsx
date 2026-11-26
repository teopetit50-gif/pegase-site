/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxPied ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
import type { CSSProperties } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import SxMotSymbole from "../SxMotSymbole";
import SxRegles from "../SxRegles";

export default function SxPied() {
  return (
    <footer className={"sgf "} style={{ "--sgf-bg": "#0a0a0a", "--sgf-top": "#2a2a2a", "--sgf-ink": "#ffffff", "--sgf-mono": "var(--font-google-sans), Arial, sans-serif" } as CSSProperties} data-in={"false"}>
      <div className={"border-t border-current/10 normal-case tracking-normal"}>
        <div className={"relative isolate"}>
          <SxRegles couleur={"rgb(255 255 255 / 10%)"} repereHaut={false} repereBas={false} />
          <div className={"relative mx-auto w-full max-w-[1920px] border-b border-current/10 px-[32px] ipad:px-[52px] desktop-sm:px-[72px]"}>
            <div className={"grid grid-cols-1 divide-y divide-current/10 md:grid-cols-4 md:divide-x md:divide-y-0"}>
              <div className={"relative"}>
                <Link href={"/offres#catalogue"} data-gutter-guide={"bottom"} className={"group flex items-center justify-between border-b border-current/10 px-3 py-2.5 text-sm transition-colors hover:bg-current/5"}>
                  <span className={"font-medium"}>
                    {"Agents"}
                  </span>
                  <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-arrow-right size-4 opacity-55 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:opacity-100"} aria-hidden={"true"}>
                    <path d={"M5 12h14"} />
                    <path d={"m12 5 7 7-7 7"} />
                  </svg>
                </Link>
                <div className={"px-3 pt-2 pb-8"}>
                  <h3 className={"mt-2 mb-4 text-xs font-medium tracking-wider uppercase opacity-75"}>
                    {"Tâches récurrentes"}
                  </h3>
                  <ul className={"flex flex-col gap-1.5"}>
                    <li>
                      <Link href={"/offres/relances-impayes"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Relances"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/offres/demandes-clients"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Demandes clients"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/offres/nouvelles-affaires"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Clients inactifs"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/offres/factures-fournisseurs"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Factures fournisseurs"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/offres/sur-mesure"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Sur mesure"}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className={"relative"}>
                <span data-gutter-guide={"top"} aria-hidden={"true"} className={"absolute inset-x-0 top-0 h-px md:hidden"} />
                <Link href={"/gestion"} data-gutter-guide={"bottom"} className={"group flex items-center justify-between border-b border-current/10 px-3 py-2.5 text-sm transition-colors hover:bg-current/5"}>
                  <span className={"font-medium"}>
                    {"Gestion"}
                  </span>
                  <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-arrow-right size-4 opacity-55 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:opacity-100"} aria-hidden={"true"}>
                    <path d={"M5 12h14"} />
                    <path d={"m12 5 7 7-7 7"} />
                  </svg>
                </Link>
                <div className={"px-3 pt-2 pb-8"}>
                  <h3 className={"mt-2 mb-4 text-xs font-medium tracking-wider uppercase opacity-75"}>
                    {"L'ERX"}
                  </h3>
                  <ul className={"flex flex-col gap-1.5"}>
                    <li>
                      <Link href={"/gestion#modules"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Ventes"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/gestion#modules"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Achats"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/gestion#modules"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Stock"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/gestion#modules"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Banque"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/gestion#modules"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Comptabilité"}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className={"relative"}>
                <span data-gutter-guide={"top"} aria-hidden={"true"} className={"absolute inset-x-0 top-0 h-px md:hidden"} />
                <Link href={"/tarifs"} data-gutter-guide={"bottom"} className={"group flex items-center justify-between border-b border-current/10 px-3 py-2.5 text-sm transition-colors hover:bg-current/5"}>
                  <span className={"font-medium"}>
                    {"Tarifs"}
                  </span>
                  <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-arrow-right size-4 opacity-55 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:opacity-100"} aria-hidden={"true"}>
                    <path d={"M5 12h14"} />
                    <path d={"m12 5 7 7-7 7"} />
                  </svg>
                </Link>
                <div className={"px-3 pt-2 pb-8"}>
                  <h3 className={"mt-2 mb-4 text-xs font-medium tracking-wider uppercase opacity-75"}>
                    {"Ressources"}
                  </h3>
                  <ul className={"flex flex-col gap-1.5"}>
                    <li>
                      <Link href={"/offres"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Toute l'offre"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/integrations"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Intégrations"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/modeles"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Modèles de site"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/blog"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Blog"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/tarifs#automatisations"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Automatisations"}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
              <div className={"relative"}>
                <span data-gutter-guide={"top"} aria-hidden={"true"} className={"absolute inset-x-0 top-0 h-px md:hidden"} />
                <Link href={"/reserver-un-audit"} data-gutter-guide={"bottom"} className={"group flex items-center justify-between border-b border-current/10 px-3 py-2.5 text-sm transition-colors hover:bg-current/5"}>
                  <span className={"font-medium"}>
                    {"Audit offert"}
                  </span>
                  <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-arrow-right size-4 opacity-55 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:opacity-100"} aria-hidden={"true"}>
                    <path d={"M5 12h14"} />
                    <path d={"m12 5 7 7-7 7"} />
                  </svg>
                </Link>
                <div className={"px-3 pt-2 pb-8"}>
                  <h3 className={"mt-2 mb-4 text-xs font-medium tracking-wider uppercase opacity-75"}>
                    {"Omega"}
                  </h3>
                  <ul className={"flex flex-col gap-1.5"}>
                    <li>
                      <Link href={"/reserver-un-audit"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Réserver un audit"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/espace2"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Espace client"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/contact"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Service client"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/mentions-legales"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Mentions légales"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/vos-donnees"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Où vont vos données"}
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className={"flex justify-center p-3"}>
          <p className={"text-xs opacity-55"}>
            {"© 2026 Omega. Tous droits réservés."}
          </p>
        </div>
      </div>
      <div className={"sgf-mark"}>
        <p className={"sr-only"}>
          {"OMEGA"}
        </p>
        <div className={"sgf-art"}>
          <SxMotSymbole texte={"OMEGA"} largeur={604} />
          <div className={"sgf-action"}>
            <Button asChild variant={"link"}>
              <Link href={"/reserver-un-audit"}>
                {"Réserver un audit"}
                <ChevronRight className={"ms-1 opacity-60"} size={16} strokeWidth={2} aria-hidden={"true"} />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </footer>
  );
}
