/* GÉNÉRÉ par outils/sx/convertir.py — bloc « SxTarifs ».
   Balisage porté tel quel depuis le relevé de la référence : ne pas
   « corriger » une classe à la main sans repasser outils/sx/compare.mjs. */
import type { CSSProperties } from "react";

export default function SxTarifs() {
  return (
    <section className={"relative mx-auto w-full max-w-[1920px] px-[32px] ipad:px-[52px] desktop-sm:px-[72px] py-0"}>
      <div id={"pricing"} className={"platform-section pr-section"}>
        <header className={"platform-intro pr-intro"} data-gutter-guide={"bottom"}>
          <div>
            <span className={"platform-eyebrow"}>
              {"Pricing"}
            </span>
            <h2>
              {"One price per employee."}
              <br />
              <span>
                {"Move up a plan as your team grows."}
              </span>
            </h2>
            <p className={"platform-lede"}>
              {"Every plan includes pay runs, payslips and tax filings, with the payroll agent preparing each run. Higher plans add the HR around it and the rest of the agents."}
            </p>
          </div>
          <div className={"pr-controls"}>
            <div className={"pr-billing"} role={"group"} aria-label={"Billing period"}>
              <button type={"button"} aria-pressed={"false"}>
                {"Monthly"}
              </button>
              <button type={"button"} aria-pressed={"true"}>
                {"Yearly "}
                <em>
                  {"Save up to 25%"}
                </em>
              </button>
            </div>
            <label className={"pr-team"}>
              <span className={"pr-team-row"}>
                <span>
                  {"Team size"}
                </span>
                <b>
                  {"50 people"}
                </b>
              </span>
              <input type={"range"} className={"pr-range"} min={"0"} max={"18"} step={"1"} aria-valuetext={"50 people"} style={{ "--fill": "44.44444444444444%" } as CSSProperties} defaultValue={"8"} />
            </label>
          </div>
        </header>
        <div className={"pr-grid"}>
          <article className={"pr-tier"} data-gutter-guide={"bottom"}>
            <div className={"pr-name"}>
              <h3>
                {"Payroll"}
              </h3>
            </div>
            <p className={"pr-desc"}>
              {"Pay runs, payslips and tax filings for one country, right every month."}
            </p>
            <div className={"pr-price"}>
              <p className={"pr-amount"}>
                <strong>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"$6"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"$6"}
                    </span>
                    <span className={"sr-only"}>
                      {"$6"}
                    </span>
                  </span>
                </strong>
                <span>
                  {"per employee"}
                  <br />
                  {"a month"}
                </span>
              </p>
              <p className={"pr-total"}>
                <b>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"$300"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"$300"}
                    </span>
                    <span className={"sr-only"}>
                      {"$300"}
                    </span>
                  </span>
                </b>
                {" a month for 50 people, billed yearly"}
              </p>
            </div>
            <div className={"pr-cta"} data-gutter-guide={"bottom"}>
              <button type={"button"} className={"relative inline-flex h-[46px] min-h-11 cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap leading-none [&>svg]:block [&>svg]:shrink-0 font-lato font-bold tracking-[-0.03em] transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 gap-[10px] rounded-[10px] border border-solid border-[rgba(0,0,0,0.1)] bg-[rgba(0,0,0,0.02)] pt-0 pr-[14px] pb-0 pl-[24px] text-[16px] text-[#121212] w-full"}>
                {"Choose Payroll"}
                <svg width={"22"} height={"22"} viewBox={"0 0 22 22"} fill={"none"} aria-hidden={"true"} focusable={"false"} className={"block shrink-0"}>
                  <path d={"M8.16385 16.4621C7.75528 16.0535 7.75528 15.3903 8.16385 14.9802L11.6147 11.5309L8.16385 8.08005C7.76785 7.66991 7.77256 7.01619 8.17799 6.61234C8.58185 6.20691 9.23556 6.20219 9.64571 6.59819L13.8367 10.7892C14.2453 11.1993 14.2453 11.8625 13.8367 12.2711L9.64571 16.4621C9.23714 16.8706 8.57399 16.8706 8.16385 16.4621Z"} fill={"currentColor"} />
                </svg>
              </button>
            </div>
            <div className={"pr-features"}>
              <h4>
                {"What's included"}
              </h4>
              <ul>
                <li className={"is-ai"}>
                  <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                    <defs>
                      <linearGradient id={"_R_2d9ktavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                        <stop offset={"0"} stopColor={"#2D00F7"} />
                        <stop offset={"0.2"} stopColor={"#F4001D"} />
                        <stop offset={"0.4"} stopColor={"#F21A00"} />
                        <stop offset={"0.6"} stopColor={"#DD3700"} />
                        <stop offset={"0.8"} stopColor={"#F06A00"} />
                        <stop offset={"1"} stopColor={"#F28900"} />
                      </linearGradient>
                    </defs>
                    <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_2d9ktavb_)"} />
                  </svg>
                  <span>
                    {"Payroll agent that prepares each run"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Payslips and the employee app"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Tax filings and year-end certificates"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Direct deposit to local banks"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Expenses and reimbursements"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"One entity in one country"}
                  </span>
                </li>
              </ul>
            </div>
          </article>
          <article className={"pr-tier is-featured"} data-gutter-guide={"bottom"}>
            <div className={"pr-name"}>
              <h3>
                {"People"}
              </h3>
              <span className={"pr-tag"}>
                {"Most teams start here"}
              </span>
            </div>
            <p className={"pr-desc"}>
              {"Payroll plus the HR around it, from someone's first day to their last."}
            </p>
            <div className={"pr-price"}>
              <p className={"pr-amount"}>
                <strong>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"$10"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"$10"}
                    </span>
                    <span className={"sr-only"}>
                      {"$10"}
                    </span>
                  </span>
                </strong>
                <span>
                  {"per employee"}
                  <br />
                  {"a month"}
                </span>
              </p>
              <p className={"pr-total"}>
                <b>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"$500"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"$500"}
                    </span>
                    <span className={"sr-only"}>
                      {"$500"}
                    </span>
                  </span>
                </b>
                {" a month for 50 people, billed yearly"}
              </p>
            </div>
            <div className={"pr-cta"} data-gutter-guide={"bottom"}>
              <button type={"button"} className={"relative inline-flex h-[46px] min-h-11 cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap leading-none [&>svg]:block [&>svg]:shrink-0 font-lato font-bold tracking-[-0.03em] transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 gap-[8px] rounded-[12px] border border-solid border-transparent border-t-[rgba(255,255,255,0.15)] pt-0 pr-[24px] pb-0 pl-[24px] text-[16px] text-white [text-shadow:0px_1px_1px_rgba(0,0,0,0.15),0px_3px_3px_rgba(0,0,0,0.05)] w-full"} style={{ "backgroundImage": "linear-gradient(180deg, rgba(255,255,255,0.2) 4.0988%, rgba(255,255,255,0) 43.902%), linear-gradient(90deg, #292929 0%, #292929 100%)", "boxShadow": "inset 0px 1px 1px 0px rgba(255,255,255,0.3), 0px 63px 18px 0px rgba(16,16,16,0), 0px 40px 16px 0px rgba(11,11,11,0.01), 0px 23px 14px 0px rgba(8,8,8,0.05), 0px 10px 10px 0px rgba(5,5,5,0.09), 0px 3px 6px 0px rgba(0,0,0,0.1)" } as CSSProperties}>
                {"Choose People"}
              </button>
            </div>
            <div className={"pr-features"}>
              <h4>
                {"On top of Payroll"}
              </h4>
              <ul>
                <li className={"is-ai"}>
                  <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                    <defs>
                      <linearGradient id={"_R_2daktavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                        <stop offset={"0"} stopColor={"#2D00F7"} />
                        <stop offset={"0.2"} stopColor={"#F4001D"} />
                        <stop offset={"0.4"} stopColor={"#F21A00"} />
                        <stop offset={"0.6"} stopColor={"#DD3700"} />
                        <stop offset={"0.8"} stopColor={"#F06A00"} />
                        <stop offset={"1"} stopColor={"#F28900"} />
                      </linearGradient>
                    </defs>
                    <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_2daktavb_)"} />
                  </svg>
                  <span>
                    {"Approvals agent and Ask Synnax"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Onboarding with e-signatures"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Time off and leave policies"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Documents on every record"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Org chart and reporting lines"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Slack and Teams notifications"}
                  </span>
                </li>
              </ul>
            </div>
          </article>
          <article className={"pr-tier"} data-gutter-guide={"bottom"}>
            <div className={"pr-name"}>
              <h3>
                {"Autopilot"}
              </h3>
            </div>
            <p className={"pr-desc"}>
              {"Every agent switched on, for teams across entities and countries."}
            </p>
            <div className={"pr-price"}>
              <p className={"pr-amount"}>
                <strong>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"$16"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"$16"}
                    </span>
                    <span className={"sr-only"}>
                      {"$16"}
                    </span>
                  </span>
                </strong>
                <span>
                  {"per employee"}
                  <br />
                  {"a month"}
                </span>
              </p>
              <p className={"pr-total"}>
                <b>
                  <span style={{ "display": "inline-grid", "fontVariantNumeric": "tabular-nums" } as CSSProperties}>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1", "visibility": "hidden" } as CSSProperties}>
                      {"$800"}
                    </span>
                    <span aria-hidden={"true"} style={{ "gridArea": "1 / 1" } as CSSProperties}>
                      {"$800"}
                    </span>
                    <span className={"sr-only"}>
                      {"$800"}
                    </span>
                  </span>
                </b>
                {" a month for 50 people, billed yearly"}
              </p>
            </div>
            <div className={"pr-cta"} data-gutter-guide={"bottom"}>
              <button type={"button"} className={"relative inline-flex h-[46px] min-h-11 cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap leading-none [&>svg]:block [&>svg]:shrink-0 font-lato font-bold tracking-[-0.03em] transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 gap-[10px] rounded-[10px] border border-solid border-[rgba(0,0,0,0.1)] bg-[rgba(0,0,0,0.02)] pt-0 pr-[14px] pb-0 pl-[24px] text-[16px] text-[#121212] w-full"}>
                {"Choose Autopilot"}
                <svg width={"22"} height={"22"} viewBox={"0 0 22 22"} fill={"none"} aria-hidden={"true"} focusable={"false"} className={"block shrink-0"}>
                  <path d={"M8.16385 16.4621C7.75528 16.0535 7.75528 15.3903 8.16385 14.9802L11.6147 11.5309L8.16385 8.08005C7.76785 7.66991 7.77256 7.01619 8.17799 6.61234C8.58185 6.20691 9.23556 6.20219 9.64571 6.59819L13.8367 10.7892C14.2453 11.1993 14.2453 11.8625 13.8367 12.2711L9.64571 16.4621C9.23714 16.8706 8.57399 16.8706 8.16385 16.4621Z"} fill={"currentColor"} />
                </svg>
              </button>
            </div>
            <div className={"pr-features"}>
              <h4>
                {"On top of People"}
              </h4>
              <ul>
                <li className={"is-ai"}>
                  <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                    <defs>
                      <linearGradient id={"_R_2dbktavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                        <stop offset={"0"} stopColor={"#2D00F7"} />
                        <stop offset={"0.2"} stopColor={"#F4001D"} />
                        <stop offset={"0.4"} stopColor={"#F21A00"} />
                        <stop offset={"0.6"} stopColor={"#DD3700"} />
                        <stop offset={"0.8"} stopColor={"#F06A00"} />
                        <stop offset={"1"} stopColor={"#F28900"} />
                      </linearGradient>
                    </defs>
                    <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_2dbktavb_)"} />
                  </svg>
                  <span>
                    {"Document intelligence and the helpdesk agent"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Compliance checks and filing reminders"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Insights and custom reports"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Several entities and countries"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Approval chains you design"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"API access and webhooks"}
                  </span>
                </li>
              </ul>
            </div>
          </article>
          <article className={"pr-tier"} data-gutter-guide={"bottom"}>
            <div className={"pr-name"}>
              <h3>
                {"Enterprise"}
              </h3>
            </div>
            <p className={"pr-desc"}>
              {"For large organisations and partners that need their own setup."}
            </p>
            <div className={"pr-price"}>
              <p className={"pr-amount"}>
                <strong>
                  {"Custom"}
                </strong>
              </p>
              <p className={"pr-total"}>
                {"Volume pricing from "}
                <b>
                  {"250 people"}
                </b>
              </p>
            </div>
            <div className={"pr-cta"} data-gutter-guide={"bottom"}>
              <button type={"button"} className={"relative inline-flex h-[46px] min-h-11 cursor-pointer touch-manipulation items-center justify-center whitespace-nowrap leading-none [&>svg]:block [&>svg]:shrink-0 font-lato font-bold tracking-[-0.03em] transition-[opacity,transform] duration-200 ease-out [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#121212] active:scale-[0.97] motion-reduce:active:scale-100 [@media(hover:hover)_and_(pointer:fine)]:hover:opacity-90 gap-[10px] rounded-[10px] border border-solid border-[rgba(0,0,0,0.1)] bg-[rgba(0,0,0,0.02)] pt-0 pr-[14px] pb-0 pl-[24px] text-[16px] text-[#121212] w-full"}>
                {"Talk to sales"}
                <svg width={"22"} height={"22"} viewBox={"0 0 22 22"} fill={"none"} aria-hidden={"true"} focusable={"false"} className={"block shrink-0"}>
                  <path d={"M8.16385 16.4621C7.75528 16.0535 7.75528 15.3903 8.16385 14.9802L11.6147 11.5309L8.16385 8.08005C7.76785 7.66991 7.77256 7.01619 8.17799 6.61234C8.58185 6.20691 9.23556 6.20219 9.64571 6.59819L13.8367 10.7892C14.2453 11.1993 14.2453 11.8625 13.8367 12.2711L9.64571 16.4621C9.23714 16.8706 8.57399 16.8706 8.16385 16.4621Z"} fill={"currentColor"} />
                </svg>
              </button>
            </div>
            <div className={"pr-features"}>
              <h4>
                {"On top of Autopilot"}
              </h4>
              <ul>
                <li className={"is-ai"}>
                  <svg viewBox={"0 0 20 20"} fill={"none"} aria-hidden={"true"}>
                    <defs>
                      <linearGradient id={"_R_2dcktavb_"} x1={"0"} y1={"0"} x2={"1"} y2={"1"}>
                        <stop offset={"0"} stopColor={"#2D00F7"} />
                        <stop offset={"0.2"} stopColor={"#F4001D"} />
                        <stop offset={"0.4"} stopColor={"#F21A00"} />
                        <stop offset={"0.6"} stopColor={"#DD3700"} />
                        <stop offset={"0.8"} stopColor={"#F06A00"} />
                        <stop offset={"1"} stopColor={"#F28900"} />
                      </linearGradient>
                    </defs>
                    <path d={"M10 2c0 5-3 8-8 8 5 0 8 3 8 8 0-5 3-8 8-8-5 0-8-3-8-8Z"} fill={"url(#_R_2dcktavb_)"} />
                  </svg>
                  <span>
                    {"Agents tuned to your own policies"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"White labeling in your brand"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"Data residency in South Africa, the EU or the US"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"SSO, SCIM and audit evidence exports"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"99.99% uptime SLA"}
                  </span>
                </li>
                <li>
                  <svg xmlns={"http://www.w3.org/2000/svg"} fill={"none"} viewBox={"0 0 24 24"} aria-hidden={"true"} className={"solar solar-check-outline"} style={{ "width": "16px", "height": "16px" } as CSSProperties} color={"var(--solar-color, currentColor)"} strokeWidth={"var(--solar-stroke-width, 1.5)"}>
                    <path d={"M18.4697 6.46973C18.7626 6.17684 19.2373 6.17684 19.5302 6.46973C19.8231 6.76262 19.8231 7.23738 19.5302 7.53028L9.53022 17.5303C9.23732 17.8232 8.76256 17.8232 8.46967 17.5303L4.46967 13.5303C4.17678 13.2374 4.17678 12.7626 4.46967 12.4697C4.76256 12.1768 5.23732 12.1768 5.53022 12.4697L8.99994 15.9395L18.4697 6.46973Z"} fill={"currentColor"} />
                  </svg>
                  <span>
                    {"A named success manager"}
                  </span>
                </li>
              </ul>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
