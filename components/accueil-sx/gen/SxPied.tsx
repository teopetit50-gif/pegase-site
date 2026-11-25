/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxPied ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
import type { CSSProperties } from "react";
import Link from "next/link";
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
                <Link href={"/offres"} data-gutter-guide={"bottom"} className={"group flex items-center justify-between border-b border-current/10 px-3 py-2.5 text-sm transition-colors hover:bg-current/5"}>
                  <span className={"font-medium"}>
                    {"Logiciel"}
                  </span>
                  <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-arrow-right size-4 opacity-55 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:opacity-100"} aria-hidden={"true"}>
                    <path d={"M5 12h14"} />
                    <path d={"m12 5 7 7-7 7"} />
                  </svg>
                </Link>
                <div className={"px-3 pt-2 pb-8"}>
                  <h3 className={"mt-2 mb-4 text-xs font-medium tracking-wider uppercase opacity-75"}>
                    {"Agents"}
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
                <Link href={"/secteurs"} data-gutter-guide={"bottom"} className={"group flex items-center justify-between border-b border-current/10 px-3 py-2.5 text-sm transition-colors hover:bg-current/5"}>
                  <span className={"font-medium"}>
                    {"Métiers"}
                  </span>
                  <svg xmlns={"http://www.w3.org/2000/svg"} width={"24"} height={"24"} viewBox={"0 0 24 24"} fill={"none"} stroke={"currentColor"} strokeWidth={"2"} strokeLinecap={"round"} strokeLinejoin={"round"} className={"lucide lucide-arrow-right size-4 opacity-55 transition-[opacity,translate] group-hover:translate-x-0.5 group-hover:opacity-100"} aria-hidden={"true"}>
                    <path d={"M5 12h14"} />
                    <path d={"m12 5 7 7-7 7"} />
                  </svg>
                </Link>
                <div className={"px-3 pt-2 pb-8"}>
                  <h3 className={"mt-2 mb-4 text-xs font-medium tracking-wider uppercase opacity-75"}>
                    {"Modules métier"}
                  </h3>
                  <ul className={"flex flex-col gap-1.5"}>
                    <li>
                      <Link href={"/secteurs/btp"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"BTP"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/secteurs/avocats"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Avocats"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/secteurs/architectes"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Architectes"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/secteurs/location-automobile"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Loueurs automobiles"}
                      </Link>
                    </li>
                    <li>
                      <Link href={"/secteurs/dentaire"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Cabinets dentaires"}
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
                      <Link href={"/gestion"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Gestion"}
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
                      <Link href={"/vos-donnees"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Où vont vos données"}
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
                      <Link href={"/secteurs"} className={"text-xs opacity-55 transition-opacity hover:opacity-100"}>
                        {"Tous les métiers"}
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
            <Link href={"/reserver-un-audit"} className={"relative inline-flex h-[46px] min-h-11 cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap leading-none [&>svg]:block [&>svg]:shrink-0 font-lato font-bold tracking-[-0.03em] transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 gap-[8px] rounded-[10px] border border-solid border-[rgba(0,0,0,0.1)] pt-0 pr-[24px] pb-0 pl-[24px] text-[16px] text-[#121212]  bg-white text-center"}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17 20" fill="currentColor" aria-hidden="true" className={"h-[20px] w-[17px] shrink-0"}><path fillRule="evenodd" clipRule="evenodd" d="M4.6 1a1 1 0 0 1 1 1v.9h5.8V2a1 1 0 1 1 2 0v.9h.5A3.1 3.1 0 0 1 17 6v9.9A3.1 3.1 0 0 1 13.9 19H3.1A3.1 3.1 0 0 1 0 15.9V6a3.1 3.1 0 0 1 3.1-3.1h.5V2a1 1 0 0 1 1-1ZM2 8.6v7.3c0 .6.5 1.1 1.1 1.1h10.8c.6 0 1.1-.5 1.1-1.1V8.6H2Zm9.6 2.2a1 1 0 0 1 .1 1.4l-3.2 3.6a1 1 0 0 1-1.5 0l-1.6-1.7a1 1 0 0 1 1.5-1.4l.8.9 2.5-2.7a1 1 0 0 1 1.4-.1Z" /></svg>
              {"Réserver un audit"}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
