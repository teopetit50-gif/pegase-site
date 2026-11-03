import type { PageFormation, SectionFormation } from "../pages";

/* les gestes d'une page : les sections qui portent une vidéo (lu côté serveur et côté client) */
export const gestesDe = (page: PageFormation) => page.sections.filter((s): s is SectionFormation & { video: NonNullable<SectionFormation["video"]> } => !!s.video);
