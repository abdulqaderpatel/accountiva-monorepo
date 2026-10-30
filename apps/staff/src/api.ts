export type StaffStatus = {
  staff: {
    role: string;
    email: string;
    environment: string;
    twoFactorEnabled: boolean;
    mfaVerified: boolean;
  };
};

export type StaffProfile = {
  id: string;
  email: string;
  role: string;
  environment: string;
  permissions: string[];
};

export type StaffUser = {
  id: string;
  name: string | null;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  deletedAt: string | null;
  organizations: Array<{
    id: string;
    name: string;
    role: string;
    membershipStatus: string;
    organizationStatus: string | null;
    deletedAt: string | null;
  }>;
};

export type OrganizationDetail = {
  id: string;
  name: string;
  country: string | null;
  region: string | null;
  subscription_status: string | null;
  plan_expires_at: string | null;
  created_at: string;
  deleted_at: string | null;
  subscription_plan: { id: string; name: string } | null;
  organization_members: Array<{
    user_id: string;
    role: string;
    status: string;
    created_at: string;
    profiles: { full_name: string | null; email: string | null } | null;
  }>;
  _count: Record<string, number>;
};

export type StaffAuditLog = {
  id: string;
  action: string;
  target_user_id: string | null;
  organization_id: string | null;
  reason: string | null;
  request_id: string;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  staff: {
    role: string;
    user: { name: string | null; email: string };
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {},
): Promise<T> => {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) {
    throw new ApiError(body.error || "Request failed", response.status);
  }
  return body;
};
