// Types partages FRONTEND, derives des types Prisma (source de verite du
// backend). Import type-only : aucun code Prisma n'est embarque dans le
// bundle client.
export type {
  Employe,
  OrdreMission,
  HistoriqueAction,
  Trajet,
  BaremeMission,
  BaremeKilometrique,
  JourFerie,
  CadreEchelleMapping,
  TypePersonnel,
  MoyenTransport,
  StatutOM,
  TypeAction,
} from "@prisma/client";

import type { Employe, OrdreMission, HistoriqueAction } from "@prisma/client";

export type OrdreMissionAvecEmploye = OrdreMission & { employe: Employe };

export type OrdreMissionDetail = OrdreMission & {
  employe: Employe;
  historique: HistoriqueAction[];
};

export type EmployeAvecMissions = Employe & { ordresMission: OrdreMission[] };

export interface ErreurApi {
  code: string;
  message: string;
  details?: unknown;
}

export interface ResultatImportPersonnel {
  total: number;
  crees: number;
  misAJour: number;
  erreurs: { ligne: number; feuille: string; message: string }[];
}

export interface ConflitResume {
  id: string;
  numero: string | null;
  numeroSequence: number;
  dateHeureDepart: string;
  dateHeureRetour: string;
  objetMission?: string;
}

export interface ResultatVerificationConflit {
  enConflit: boolean;
  conflits: ConflitResume[];
}
