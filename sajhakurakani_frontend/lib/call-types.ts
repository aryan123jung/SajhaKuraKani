export type CallType = "audio" | "video";

export type CallStatus =
  | "ringing"
  | "active"
  | "declined"
  | "missed"
  | "ended"
  | "cancelled";

export type CallParticipantProfile = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  profileUrl?: string | null;
};

export type CallSession = {
  _id: string;
  pairKey: string;
  callType: CallType;
  status: CallStatus;
  caller: CallParticipantProfile | { id: string };
  callee: CallParticipantProfile | { id: string };
  otherUser: CallParticipantProfile | { id: string };
  isCaller: boolean;
  acceptByExpiresAt: string;
  unansweredTimeoutAt: string;
  acceptedAt?: string | null;
  endedAt?: string | null;
  endedReason?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CallSignalType = "offer" | "answer" | "ice-candidate";
