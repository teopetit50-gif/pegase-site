/** Icônes des outils du loueur dans la carte du réseau — à la place des logos
 *  tiers (Gmail, HubSpot…) de la référence : règle maison, aucun logo tiers. */
const TRACES: Record<string, React.ReactNode> = {
  reservation: <><rect x="3" y="4.5" width="16" height="15" rx="2" /><path d="M3 9.5h16M7.5 2.8v3.4M14.5 2.8v3.4" /><path d="m8.2 14 2.2 2.2 3.6-3.8" /></>,
  telematique: <><path d="M11 20V11" /><circle cx="11" cy="9" r="2.2" /><path d="M6.2 13.8a6.6 6.6 0 0 1 0-9.6M15.8 4.2a6.6 6.6 0 0 1 0 9.6M3.6 16.4a10.2 10.2 0 0 1 0-14.8M18.4 1.6a10.2 10.2 0 0 1 0 14.8" /></>,
  planning: <><rect x="3" y="4" width="16" height="15" rx="2" /><path d="M3 9h16M8 13h3M8 16h6" /></>,
  crm: <><circle cx="8" cy="8" r="3" /><path d="M2.5 19c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5" /><circle cx="16" cy="9" r="2.4" /><path d="M14.6 13.6c2.7 0 4.9 2 4.9 5" /></>,
  facturation: <><path d="M5 3h12v18l-2.2-1.5L12.6 21l-2.2-1.5L8.2 21 6 19.5 5 21V3Z" /><path d="M8.5 8h6M8.5 11.5h6M8.5 15h3.5" /></>,
  paiements: <><rect x="2.5" y="5.5" width="17" height="12" rx="2" /><path d="M2.5 10h17M6 14.5h3" /></>,
};
export function Glyphe({ nom }: { nom: string }) {
  return (
    <svg viewBox="0 0 22 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRACES[nom] ?? TRACES.planning}
    </svg>
  );
}
