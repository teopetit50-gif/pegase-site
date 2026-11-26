/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxMarque ».
   Balisage porté depuis le relevé de la référence, contenu posé par
   outils/sx/textes-fr.json. Pour changer un TEXTE : le dictionnaire, puis
   régénérer. Ne pas retoucher une classe sans repasser outils/sx/compare.mjs. */
/* eslint-disable @next/next/no-img-element */
/* 26/11/2026 — ÉDITÉ À LA MAIN malgré l'en-tête « généré » : la maquette de
   téléphone de la carte « kit » est remplacée par <RoueDocuments />, et les
   cartes « sociétés » et « proposition » par <InkOrbitFeatures /> (Teo).
   Régénérer ce bloc avec convertir.py la ferait revenir. */
import type { CSSProperties } from "react";
import RoueDocuments from "../RoueDocuments";
import InkOrbitFeatures from "@/components/ui/ink-orbit-features";

export default function SxMarque() {
  return (
    <section className={"relative mx-auto w-full max-w-[1920px] px-[32px] ipad:px-[52px] desktop-sm:px-[72px] py-0"}>
      <div id={"white-label"} className={"platform-section wl-section"}>
        <header className={"platform-intro platform-intro-split wl-intro"} data-gutter-guide={"bottom"}>
          <div>
            <span className={"platform-eyebrow"}>
              {"Documents"}
            </span>
            <h2>
              {"Votre nom sur chaque document."}
              <br />
              <span>
                {"Votre marque sur chaque devis, facture et relance."}
              </span>
            </h2>
          </div>
          <p className={"platform-lede"}>
            {"Gérez chaque société sous son propre nom. Chacune garde ses clients, sa numérotation et ses mentions légales, et ses documents partent sous son en-tête."}
          </p>
        </header>
        <div className={"wl-grid"} style={{ "--wl-brand": "#0f766e", "--wl-radius": "12px" } as CSSProperties}>
          <article className={"wl-card is-kit"} data-gutter-guide={"bottom"}>
            <div className={"ft-stage"}>
              <div className={"wl-kit"}>
                <div className={"wl-kit-head"}>
                  <strong>
                    {"Votre société"}
                  </strong>
                  <span className={"wl-live"}>
                    <i />
                    {"Aperçu"}
                  </span>
                </div>
                <p className={"wl-kit-label"} id={"wl-kit-brands"}>
                  {"Choisir une société"}
                </p>
                <div className={"wl-kit-brands"} role={"group"} aria-labelledby={"wl-kit-brands"}>
                  <button type={"button"} className={"wl-kit-brand"} aria-pressed={"true"}>
                    <span className={"wl-mark "} aria-hidden={"true"}>
                      {"M"}
                    </span>
                    <span>
                      <strong>
                        {"Maison Laurent"}
                      </strong>
                      <small>
                        {"Société principale"}
                      </small>
                    </span>
                    <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-circle-bold"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                      <path d={"M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L12.7348 11.2045L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z"} fillRule={"evenodd"} clipRule={"evenodd"} fill={"currentColor"} />
                    </svg>
                  </button>
                  <button type={"button"} className={"wl-kit-brand"} aria-pressed={"false"}>
                    <span className={"wl-mark "} style={{ "background": "#1e3a8a" } as CSSProperties} aria-hidden={"true"}>
                      {"A"}
                    </span>
                    <span>
                      <strong>
                        {"Alpes Distribution"}
                      </strong>
                      <small>
                        {"Filiale"}
                      </small>
                    </span>
                  </button>
                  <button type={"button"} className={"wl-kit-brand"} aria-pressed={"false"}>
                    <span className={"wl-mark "} style={{ "background": "#9d174d" } as CSSProperties} aria-hidden={"true"}>
                      {"J"}
                    </span>
                    <span>
                      <strong>
                        {"Jura Services"}
                      </strong>
                      <small>
                        {"Filiale"}
                      </small>
                    </span>
                  </button>
                  <button type={"button"} className={"wl-kit-brand"} aria-pressed={"false"}>
                    <span className={"wl-mark "} style={{ "background": "#4d7c0f" } as CSSProperties} aria-hidden={"true"}>
                      {"H"}
                    </span>
                    <span>
                      <strong>
                        {"Holding Laurent"}
                      </strong>
                      <small>
                        {"Holding"}
                      </small>
                    </span>
                  </button>
                </div>
                <div className={"wl-kit-row"}>
                  <span id={"wl-kit-colour"}>
                    {"Couleur"}
                  </span>
                  <div className={"wl-swatches"} role={"group"} aria-labelledby={"wl-kit-colour"}>
                    <button type={"button"} aria-label={"Sarcelle"} aria-pressed={"true"} style={{ "--c": "#0f766e" } as CSSProperties} />
                    <button type={"button"} aria-label={"Marine"} aria-pressed={"false"} style={{ "--c": "#1e3a8a" } as CSSProperties} />
                    <button type={"button"} aria-label={"Framboise"} aria-pressed={"false"} style={{ "--c": "#9d174d" } as CSSProperties} />
                    <button type={"button"} aria-label={"Olive"} aria-pressed={"false"} style={{ "--c": "#4d7c0f" } as CSSProperties} />
                    <button type={"button"} aria-label={"Ardoise"} aria-pressed={"false"} style={{ "--c": "#475569" } as CSSProperties} />
                    <button type={"button"} aria-label={"Anthracite"} aria-pressed={"false"} style={{ "--c": "#202322" } as CSSProperties} />
                  </div>
                </div>
                <div className={"wl-kit-row"}>
                  <span id={"wl-kit-corners"}>
                    {"Angles"}
                  </span>
                  <div className={"wl-seg"} role={"group"} aria-labelledby={"wl-kit-corners"}>
                    <button type={"button"} aria-pressed={"true"}>
                      {"Doux"}
                    </button>
                    <button type={"button"} aria-pressed={"false"}>
                      {"Vifs"}
                    </button>
                  </div>
                </div>
              </div>
              <div className={"wl-preview"} aria-hidden={"true"}>
                <RoueDocuments />
                <div className={"wl-payslip"}>
                  <div className={"wl-slip-head"}>
                    <span className={"wl-mark "} aria-hidden={"true"}>
                      {"M"}
                    </span>
                    <strong>
                      {"Maison Laurent"}
                    </strong>
                    <p>
                      <b>
                        {"Devis"}
                      </b>
                      <span>
                        {"Novembre 2026"}
                      </span>
                    </p>
                  </div>
                  <dl className={"wl-slip-meta"}>
                    <div>
                      <dt>
                        {"Client"}
                      </dt>
                      <dd>
                        {"Maya Martin"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {"Date du devis"}
                      </dt>
                      <dd>
                        {"12 nov. 2026"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {"Objet"}
                      </dt>
                      <dd>
                        {"Équipement des bureaux"}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {"Validité"}
                      </dt>
                      <dd>
                        {"30 jours"}
                      </dd>
                    </div>
                  </dl>
                  <div className={"wl-slip-lines"}>
                    <div>
                      <h5>
                        {"Prestations"}
                      </h5>
                      <p>
                        <span>
                          {"Fourniture et livraison"}
                        </span>
                        <b>
                          <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                              {"5 450,00 €"}
                            </span>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                              {"5 450,00 €"}
                            </span>
                            <span className={"sr-only"}>
                              {"5 450,00 €"}
                            </span>
                          </span>
                        </b>
                      </p>
                      <p>
                        <span>
                          {"Installation, 6 h"}
                        </span>
                        <b>
                          <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                              {"186,00 €"}
                            </span>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                              {"186,00 €"}
                            </span>
                            <span className={"sr-only"}>
                              {"186,00 €"}
                            </span>
                          </span>
                        </b>
                      </p>
                    </div>
                    <div>
                      <h5>
                        {"Déductions"}
                      </h5>
                      <p>
                        <span>
                          {"Acompte versé"}
                        </span>
                        <b>
                          <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                              {"−1 021,40 €"}
                            </span>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                              {"−1 021,40 €"}
                            </span>
                            <span className={"sr-only"}>
                              {"−1 021,40 €"}
                            </span>
                          </span>
                        </b>
                      </p>
                      <p>
                        <span>
                          {"Remise, 5 %"}
                        </span>
                        <b>
                          <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                              {"−272,50 €"}
                            </span>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                              {"−272,50 €"}
                            </span>
                            <span className={"sr-only"}>
                              {"−272,50 €"}
                            </span>
                          </span>
                        </b>
                      </p>
                      <p>
                        <span>
                          {"Reprise de l'ancien matériel"}
                        </span>
                        <b>
                          <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                              {"−123,50 €"}
                            </span>
                            <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                              {"−123,50 €"}
                            </span>
                            <span className={"sr-only"}>
                              {"−123,50 €"}
                            </span>
                          </span>
                        </b>
                      </p>
                    </div>
                  </div>
                  <div className={"wl-slip-net"}>
                    <span>
                      {"Reste à payer"}
                    </span>
                    <strong>
                      <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                        <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                          {"4 218,60 €"}
                        </span>
                        <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                          {"4 218,60 €"}
                        </span>
                        <span className={"sr-only"}>
                          {"4 218,60 €"}
                        </span>
                      </span>
                    </strong>
                  </div>
                  <p className={"wl-slip-foot"}>
                    {"Émis avec Omega. Une question sur ce devis ? Répondez simplement à ce mail."}
                  </p>
                </div>
              </div>
            </div>
            <div className={"ft-copy"}>
              <h3>
                {"Réglez votre marque une fois."}
              </h3>
              <p>
                {"Ajoutez votre logo, vos couleurs et vos mentions légales, et vos devis, factures et relances suivent aussitôt."}
              </p>
            </div>
          </article>
          <article className={"wl-card"} style={{ gridColumn: "1 / -1", padding: "40px clamp(16px,4vw,48px) 44px" } as CSSProperties} data-gutter-guide={"bottom"}>
            <InkOrbitFeatures />
          </article>
        </div>
      </div>
    </section>
  );
}
