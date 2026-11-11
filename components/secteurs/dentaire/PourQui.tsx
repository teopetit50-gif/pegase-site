/* ══════════════════════════════════════════════════════════════════════
   « Pour quels cabinets ? » — la section « How it works » de la référence
   (sourcil mono, titre et chapô côte à côte, trois cartes dans un cadre
   commun, chacune avec sa petite scène d'interface), recopiée classe par
   classe. Les trois cartes sont les trois cabinets de la page du 24/09
   (textes.ts, CABINETS) : titre, texte, et les cinq points dans la scène.
   ══════════════════════════════════════════════════════════════════════ */
import Apparition, { GroupeApparition, MotsApparition } from "@/components/accueil/Apparition";

export default function PourQui() {
  return (
    <section data-monde="clair" className="py-16 sm:py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <GroupeApparition retard={700}>
          <Apparition as="p" className="font-mono text-[11px] text-tir-muted-foreground uppercase tracking-[0.2em]">
            {"Pour qui"}
          </Apparition>
          <div className="mt-6 grid items-end gap-6 md:grid-cols-2 md:gap-12">
            <h2 className="text-balance font-bold text-3xl text-tir-foreground tracking-tight sm:text-4xl md:text-5xl">
              <MotsApparition texte="Pour quels cabinets ?" depart={80} />
            </h2>
            <Apparition as="p" delai={450} className="max-w-md text-base text-tir-muted-foreground leading-relaxed">
              {"Tiroma lit ce que votre logiciel de cabinet sait déjà, et suit chaque patient de sa demande au dernier soin : trois décisions par matin, et rien qui s'arrête en route."}
            </Apparition>
          </div>
        </GroupeApparition>
        <Apparition delai={150}>
        <div className="mx-auto mt-10 overflow-hidden rounded-2xl border border-transparent bg-tir-card/50 shadow-black/5 shadow-md ring-1 ring-tir-border sm:mt-14">
          <div className="grid divide-tir-border max-md:divide-y md:grid-cols-3 md:divide-x md:divide-y-0">
            <div className="row-span-2 grid grid-rows-subgrid gap-6 p-6 sm:gap-8 sm:p-8">
              <div className="w-full self-center">
                <div aria-hidden="true" className="pointer-events-none relative flex h-40 w-full select-none items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-tir-muted/20 via-blue-50/20 to-tir-muted/20 dark:from-tir-muted/10 dark:via-blue-950/10 dark:to-tir-muted/10">
                  <div className="relative flex w-full max-w-[270px] flex-col items-center" style={{ height: "145px" }}>
                    <div className="-translate-x-1/2 absolute top-0 left-1/2 z-[3] flex w-[265px] items-center gap-2 rounded-lg border border-tir-border/40 bg-white px-2.5 py-2 shadow-lg dark:bg-tir-card">
                      <div className="relative shrink-0">
                        <div className="size-7 overflow-hidden rounded-full bg-gradient-to-br from-neutral-300 to-neutral-400 dark:from-neutral-500 dark:to-neutral-600">
                          <svg aria-hidden="true" className="size-full p-1 text-neutral-100" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
                          </svg>
                        </div>
                        <div className="-top-0.5 -right-0.5 absolute flex size-3.5 items-center justify-center rounded-full bg-blue-500 text-white">
                          <svg aria-hidden="true" width={7} height={7} viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.8 4.8 2.4-7.2-6-4.8h7.6z" />
                          </svg>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-tir-foreground leading-tight">
                          <span className="font-semibold">
                            {"Créneaux libérés"}
                          </span>
                          {" avec leurs patients"}
                          {" "}
                          <span className="font-semibold" />
                        </p>
                        <p className="mt-0.5 truncate text-[9px] text-tir-muted-foreground">
                          {"Prêt chaque jour à 7 h"}
                        </p>
                      </div>
                    </div>
                    <div className="-translate-x-1/2 absolute top-[32px] left-1/2 z-[2] flex w-[240px] items-center gap-2 rounded-lg border border-tir-border/40 bg-white px-2.5 py-2 shadow-md dark:bg-tir-card">
                      <div className="relative shrink-0">
                        <div className="size-7 overflow-hidden rounded-full bg-gradient-to-br from-neutral-600 to-neutral-800 dark:from-neutral-400 dark:to-neutral-500">
                          <svg aria-hidden="true" className="size-full p-1 text-neutral-300" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v1.2c0 .7.5 1.2 1.2 1.2h16.8c.7 0 1.2-.5 1.2-1.2v-1.2c0-3.2-6.4-4.8-9.6-4.8z" />
                          </svg>
                        </div>
                        <div className="-right-0.5 -bottom-0.5 absolute flex size-3.5 items-center justify-center rounded-full bg-green-500 ring-[1.5px] ring-white dark:ring-tir-card">
                          <svg aria-hidden="true" width={6} height={6} viewBox="0 0 24 24" fill="white">
                            <path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" />
                          </svg>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[11px] text-tir-foreground leading-tight">
                          {"Plans signés sans rendez-vous"}
                        </p>
                        <p className="mt-0.5 truncate text-[9px] text-tir-muted-foreground">
                          {"Contrôles dus rapprochés de l'agenda"}
                        </p>
                      </div>
                      <div className="shrink-0 text-tir-muted-foreground/40">
                        <svg aria-hidden="true" width={12} height={12} viewBox="0 0 24 24" fill="currentColor">
                          <circle cx="12" cy="5" r="1.5" />
                          <circle cx="12" cy="12" r="1.5" />
                          <circle cx="12" cy="19" r="1.5" />
                        </svg>
                      </div>
                    </div>
                    <div className="-translate-x-1/2 absolute top-[66px] left-1/2 z-[1] flex w-[215px] items-center gap-2 rounded-lg border border-tir-border/40 bg-white px-2.5 py-2 shadow-sm dark:bg-tir-card">
                      <div className="relative shrink-0">
                        <div className="flex size-7 items-center justify-center rounded-full bg-white ring-1 ring-tir-border/40 dark:bg-tir-card">
                          <svg aria-hidden="true" width={15} height={11} viewBox="0 0 24 18" fill="none">
                            <rect x="0.5" y="0.5" width={23} height={17} rx="2" fill="white" stroke="#E5E7EB" />
                            <path d="M2 2l10 7 10-7" stroke="#EA4335" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M2 2v14" stroke="#4285F4" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M22 2v14" stroke="#34A853" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M2 16h4" stroke="#FBBC05" strokeWidth="1.8" strokeLinecap="round" />
                            <path d="M18 16h4" stroke="#FBBC05" strokeWidth="1.8" strokeLinecap="round" />
                          </svg>
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[11px] text-tir-foreground leading-tight">
                          {"Retours du laboratoire vérifiés avant la pose"}
                        </p>
                        <p className="mt-0.5 truncate text-[9px] text-tir-muted-foreground">
                          {"Point du matin dans votre espace sécurisé"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mx-auto max-w-sm text-center">
                <h3 className="text-balance font-semibold">
                  {"Cabinet de 2 à 3 fauteuils"}
                </h3>
                <p className="mt-3 text-balance text-tir-muted-foreground">
                  {"Le titulaire soigne toute la journée. Chaque matin, Tiroma prépare ce qu'il n'a pas le temps de regarder : les créneaux vides, les plans signés sans rendez-vous et les contrôles dus."}
                </p>
              </div>
            </div>
            <div className="row-span-2 grid grid-rows-subgrid gap-6 p-6 sm:gap-8 sm:p-8">
              <div className="self-center">
                <div aria-hidden="true" className="pointer-events-none relative flex h-40 w-full select-none items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-tir-muted/20 via-blue-50/20 to-tir-muted/20 dark:from-tir-muted/10 dark:via-blue-950/10 dark:to-tir-muted/10">
                  <div className="relative w-full max-w-[340px]" style={{ height: "160px" }}>
                    <div className="absolute top-2.5 left-0 z-[1] w-[185px] rounded-xl border border-tir-border/40 bg-white p-3 shadow-md dark:bg-tir-card">
                      <div className="flex items-center justify-between">
                        <svg aria-hidden="true" width={22} height={22} viewBox="0 0 28 28" fill="none">
                          <g stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round">
                            <circle cx="14" cy="14" r="2.6" fill="#7C3AED" />
                            <line x1="14" y1="3.5" x2="14" y2="7.5" />
                            <line x1="14" y1="20.5" x2="14" y2="24.5" />
                            <line x1="3.5" y1="14" x2="7.5" y2="14" />
                            <line x1="20.5" y1="14" x2="24.5" y2="14" />
                            <line x1="6.5" y1="6.5" x2="9.5" y2="9.5" />
                            <line x1="18.5" y1="18.5" x2="21.5" y2="21.5" />
                            <line x1="6.5" y1="21.5" x2="9.5" y2="18.5" />
                            <line x1="18.5" y1="9.5" x2="21.5" y2="6.5" />
                          </g>
                        </svg>
                        <div className="relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors bg-blue-500">
                          <span className="inline-block size-2.5 rounded-full bg-white shadow-sm transition-transform translate-x-3" />
                        </div>
                      </div>
                      <p className="mt-1.5 truncate font-semibold text-[11px] text-tir-foreground leading-tight">
                        {"Charge par fauteuil et par demi-journée"}
                      </p>
                      <p className="mt-0.5 text-[9.5px] text-tir-muted-foreground leading-snug">
                        {"Assistante absente : soins à basculer"}
                      </p>
                      <div className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-tir-border/60 px-2 py-1 font-medium text-[10px] text-tir-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings size-2.5" aria-hidden="true">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {"Suivi par fauteuil"}
                      </div>
                    </div>
                    <div className="absolute top-2.5 right-0 z-[1] w-[185px] rounded-xl border border-tir-border/40 bg-white p-3 shadow-md dark:bg-tir-card">
                      <div className="flex items-center justify-between">
                        <div aria-hidden="true" className="flex h-[22px] w-[22px] items-center justify-center font-bold font-serif text-[18px] text-tir-foreground leading-none">
                          {"T"}
                        </div>
                        <div className="relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors bg-zinc-300 dark:bg-zinc-700">
                          <span className="inline-block size-2.5 rounded-full bg-white shadow-sm transition-transform translate-x-0.5" />
                        </div>
                      </div>
                      <p className="mt-1.5 truncate font-semibold text-[11px] text-tir-foreground leading-tight">
                        {"Demi-journées vides des collaborateurs"}
                      </p>
                      <p className="mt-0.5 text-[9.5px] text-tir-muted-foreground leading-snug">
                        {"Une liste d'attente commune"}
                      </p>
                      <div className="mt-2 flex w-full items-center justify-center gap-1 rounded-md border border-tir-border/60 px-2 py-1 font-medium text-[10px] text-tir-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings size-2.5" aria-hidden="true">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {"Fauteuils"}
                      </div>
                    </div>
                    <div className="-translate-x-1/2 absolute top-0 left-1/2 z-[3] flex h-[150px] w-[195px] flex-col rounded-xl border border-tir-border/40 bg-white p-3 shadow-lg dark:bg-tir-card">
                      <div className="flex items-center justify-between">
                        <svg aria-hidden="true" width={22} height={22} viewBox="0 0 28 28" fill="none">
                          <path d="M6.5 11a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5zm0 0h5v2.5a2.5 2.5 0 1 1-5 0V11z" fill="#36C5F0" />
                          <path d="M17 6.5a2.5 2.5 0 1 1 5 0 2.5 2.5 0 0 1-5 0zm0 0v5h-2.5a2.5 2.5 0 1 1 0-5H17z" fill="#2EB67D" />
                          <path d="M21.5 17a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zm0 0h-5v-2.5a2.5 2.5 0 1 1 5 0V17z" fill="#ECB22E" />
                          <path d="M11 21.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zm0 0v-5h2.5a2.5 2.5 0 1 1 0 5H11z" fill="#E01E5A" />
                        </svg>
                        <div className="relative inline-flex h-3.5 w-6 shrink-0 items-center rounded-full transition-colors bg-blue-500">
                          <span className="inline-block size-2.5 rounded-full bg-white shadow-sm transition-transform translate-x-3" />
                        </div>
                      </div>
                      <p className="mt-1.5 truncate font-semibold text-[12px] text-tir-foreground leading-tight">
                        {"Implants des chirurgies rapprochés du stock"}
                      </p>
                      <p className="mt-0.5 text-[10px] text-tir-muted-foreground leading-snug">
                        {"Stock d'implants"}
                      </p>
                      <div className="mt-auto flex w-full items-center justify-center gap-1 rounded-md border border-tir-border/60 px-2 py-1 font-medium text-[10.5px] text-tir-foreground">
                        <svg xmlns="http://www.w3.org/2000/svg" width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings size-3" aria-hidden="true">
                          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                        {"Présences"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mx-auto max-w-sm text-center">
                <h3 className="text-balance font-semibold">
                  {"Cabinet de groupe"}
                </h3>
                <p className="mt-3 text-balance text-tir-muted-foreground">
                  {"Avec plusieurs praticiens et plusieurs assistantes, l'agenda change toute la journée. Tiroma indique quel fauteuil tourne à vide et quels soins déplacer."}
                </p>
              </div>
            </div>
            <div className="row-span-2 grid grid-rows-subgrid gap-6 p-6 sm:gap-8 sm:p-8">
              <div className="mx-auto w-full self-center">
                <div aria-hidden="true" className="pointer-events-none relative flex h-52 w-full select-none items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-tir-muted/20 via-blue-50/20 to-tir-muted/20 p-4 dark:from-tir-muted/10 dark:via-blue-950/10 dark:to-tir-muted/10">
                  <div className="relative w-full max-w-[260px] space-y-2.5">
                    <div className="flex justify-end">
                      <div className="rounded-l-xl rounded-tr-xl rounded-br-sm bg-tir-muted px-3 py-1.5 text-[11px] text-tir-foreground leading-snug shadow-sm ring-1 ring-tir-border/50">
                        {"Un point du matin par centre"}
                      </div>
                    </div>
                    <p className="text-[11px] text-tir-foreground leading-snug">
                      {"Synthèse de la semaine pour la direction"}
                      <br />
                      {"Mêmes règles de priorité partout"}
                    </p>
                    <div className="max-w-[92%] rounded-lg border border-tir-border/50 bg-tir-card shadow-sm">
                      <div className="px-2.5 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[9px] text-tir-muted-foreground">
                            {"Droits d'accès par rôle"}
                          </span>
                          <div className="-space-x-1 flex items-center">
                            <span aria-hidden="true" className="size-4 rounded-full  ring-2 ring-tir-card inline-block bg-gradient-to-br from-neutral-300 to-neutral-500" />
                            <span aria-hidden="true" className="size-4 rounded-full  ring-2 ring-tir-card inline-block bg-gradient-to-br from-neutral-300 to-neutral-500" />
                            <span aria-hidden="true" className="size-4 rounded-full  ring-2 ring-tir-card inline-block bg-gradient-to-br from-neutral-300 to-neutral-500" />
                            <div className="flex size-4 items-center justify-center rounded-full bg-tir-muted font-medium text-[8px] text-tir-muted-foreground ring-2 ring-tir-card">
                              {"+2"}
                            </div>
                          </div>
                        </div>
                        <p className="mt-1 truncate font-semibold text-[11px] text-tir-foreground leading-tight">
                          {"Taux de réinscription et d'acceptation des devis"}
                        </p>
                        <p className="mt-0.5 truncate text-[9px] text-tir-muted-foreground leading-tight">
                          {"Synthèse pour la direction"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="font-medium text-[9px] text-tir-muted-foreground">
                        {"Un point par centre"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <svg aria-hidden="true" width={10} height={10} viewBox="0 0 14 14" fill="none" className="size-2.5 shrink-0 text-tir-muted-foreground">
                          <path d="M2.5 2.5C2.22386 2.5 2 2.72386 2 3V6.5C2 7.88071 3.11929 9 4.5 9H9.29297L7.64648 10.6465L7.58203 10.7246C7.45387 10.9187 7.47562 11.1827 7.64648 11.3535C7.81735 11.5244 8.08131 11.5461 8.27539 11.418L8.35352 11.3535L10.8535 8.85352C10.9473 8.75975 11 8.63261 11 8.5C11 8.40056 10.9704 8.30419 10.916 8.22266L10.8535 8.14648L8.35352 5.64648C8.15825 5.45122 7.84175 5.45122 7.64648 5.64648C7.45122 5.84175 7.45122 6.15825 7.64648 6.35352L9.29297 8H4.5C3.67157 8 3 7.32843 3 6.5V3C3 2.72391 2.77607 2.50009 2.5 2.5Z" fill="currentColor" />
                        </svg>
                        <span className="font-medium text-[10px] text-tir-muted-foreground">
                          {"Un point du matin par site"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative z-10 mx-auto max-w-sm text-center">
                <h3 className="text-balance font-semibold">
                  {"Centre dentaire"}
                </h3>
                <p className="mt-3 text-balance text-tir-muted-foreground">
                  {"Quand plusieurs sites dépendent d'une même direction, chaque centre reçoit son point du matin et la direction reçoit la synthèse de la semaine."}
                </p>
              </div>
            </div>
          </div>
        </div>
        </Apparition>
      </div>
    </section>
  );
}
