"use client";

import { createContext, useContext } from "react";
import type { Portail } from "./portail";

/* l'espace « DALIRO seul » (voir ./portail.ts), posé par la coquille */
export const PortailContexte = createContext<Portail | null>(null);
export const usePortail = () => useContext(PortailContexte);
