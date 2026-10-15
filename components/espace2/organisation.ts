"use client";

/* Le nom de l'organisation affichée, posé par la coquille (le compte
   connecté, sinon l'entreprise d'exemple) et lu par les pages. */

import { createContext, useContext } from "react";

export const OrganisationContexte = createContext<{ nom: string; connecte: boolean; prenom?: string | null }>({ nom: "CAMA", connecte: false, prenom: null });

export const useOrganisation = () => useContext(OrganisationContexte);
