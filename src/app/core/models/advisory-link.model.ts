export type AdvisoryLinkStatus = 'PENDING' | 'ACCEPTED' | 'REVOKED';

/** Supervision agreement between an advisor and a farmer; the farmer accepts it. */
export interface AdvisoryLink {
  id: string;
  advisorId: string;
  farmerId: string;
  status: AdvisoryLinkStatus;
  requestedAt: string;
  respondedAt: string | null;
  advisorName: string;
  advisorEmail: string;
  farmerName: string;
  farmerEmail: string;
}
