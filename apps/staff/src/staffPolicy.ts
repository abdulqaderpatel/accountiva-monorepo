export type StaffGate =
  | "loading"
  | "signed_out"
  | "denied"
  | "unavailable"
  | "enroll_mfa"
  | "verify_mfa"
  | "ready";

type StaffGateInput = {
  hasSession: boolean;
  staffStatus?: number;
  twoFactorEnabled?: boolean;
  mfaVerified?: boolean;
};

export const getStaffGate = ({
  hasSession,
  staffStatus,
  twoFactorEnabled,
  mfaVerified,
}: StaffGateInput): StaffGate => {
  if (!hasSession) return "signed_out";
  if (staffStatus === 401) return "signed_out";
  if (staffStatus === 403) return "denied";
  if (staffStatus === undefined) return "loading";
  if (staffStatus !== 200) return "unavailable";
  if (!twoFactorEnabled) return "enroll_mfa";
  return mfaVerified ? "ready" : "verify_mfa";
};

export const normalizeSearchQuery = (value: string) => {
  const query = value.trim();
  if (query.length < 3) throw new Error("Search must contain at least 3 characters.");
  if (query.length > 120) throw new Error("Search cannot exceed 120 characters.");
  return query;
};

export const isTwoFactorRedirect = (value: unknown) =>
  typeof value === "object" &&
  value !== null &&
  "twoFactorRedirect" in value &&
  value.twoFactorRedirect === true;
