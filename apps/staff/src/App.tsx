import {
  type FormEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Activity,
  ArrowRight,
  Building2,
  Check,
  Clipboard,
  FileClock,
  KeyRound,
  LifeBuoy,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  UserRound,
  Users,
  X,
} from "lucide-react";
import {
  ApiError,
  apiRequest,
  type OrganizationDetail,
  type StaffAuditLog,
  type StaffProfile,
  type StaffStatus,
  type StaffUser,
} from "./api";
import { authClient, STAFF_TWO_FACTOR_EVENT } from "./auth-client";
import {
  getStaffGate,
  isTwoFactorRedirect,
  normalizeSearchQuery,
  type StaffGate,
} from "./staffPolicy";

type Enrollment = { totpURI: string; backupCodes: string[] };
type Tab = "directory" | "audit";

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatDate = (value?: string | null) =>
  value ? dateFormatter.format(new Date(value)) : "—";

const roleLabel = (role: string) =>
  role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const readableError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
      .replaceAll("_", " ")
      .toLowerCase()
      .replace(/^./, (character) => character.toUpperCase());
  }
  return "Something went wrong. Please try again.";
};

const Brand = () => (
  <div className="brand" aria-label="Accountiva Staff">
    <span className="brand-mark" aria-hidden="true">A</span>
    <span>
      <strong>Accountiva</strong>
      <small>Staff operations</small>
    </span>
  </div>
);

const SecureShell = ({ children }: { children: ReactNode }) => (
  <main className="secure-shell">
    <div className="ambient ambient-one" />
    <div className="ambient ambient-two" />
    <section className="auth-card">
      <Brand />
      {children}
      <p className="security-footnote">
        <LockKeyhole size={13} /> Authorized Accountiva personnel only. Access is logged.
      </p>
    </section>
  </main>
);

const LoadingView = () => (
  <SecureShell>
    <div className="loading-block">
      <RefreshCw className="spin" size={24} />
      <p>Checking your staff access…</p>
    </div>
  </SecureShell>
);

const UnavailableView = ({ onRetry }: { onRetry: () => Promise<void> }) => (
  <SecureShell>
    <div className="loading-block">
      <TriangleAlert size={24} />
      <h1>Staff access is unavailable</h1>
      <p>We could not verify your access securely. No customer data was loaded.</p>
      <button className="primary-button" onClick={() => void onRetry()} type="button">
        Try again
      </button>
    </div>
  </SecureShell>
);

const SignInView = ({
  onComplete,
  onTwoFactorRequired,
}: {
  onComplete: () => Promise<void>;
  onTwoFactorRequired: () => void;
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
        rememberMe: false,
      });
      if (result.error) throw new Error(result.error.message || "Sign in failed");
      setPassword("");
      if (isTwoFactorRedirect(result.data)) {
        onTwoFactorRequired();
        return;
      }
      await onComplete();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SecureShell>
      <div className="auth-heading">
        <span className="eyebrow"><ShieldCheck size={14} /> Protected workspace</span>
        <h1>Staff sign in</h1>
        <p>Use your approved Accountiva account. Customer accounts cannot enter this portal.</p>
      </div>
      <form className="stack" onSubmit={submit}>
        <label>
          Work email
          <input
            autoComplete="username"
            inputMode="email"
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@accountiva.ai"
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            minLength={8}
            required
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {error && <div className="inline-alert danger"><ShieldAlert size={16} />{error}</div>}
        <button className="button primary" disabled={busy} type="submit">
          {busy ? <RefreshCw className="spin" size={16} /> : <KeyRound size={16} />}
          {busy ? "Signing in…" : "Continue securely"}
        </button>
      </form>
    </SecureShell>
  );
};

const DeniedView = ({ onSignOut }: { onSignOut: () => Promise<void> }) => (
  <SecureShell>
    <div className="state-icon danger"><ShieldAlert size={28} /></div>
    <div className="auth-heading centered">
      <h1>Staff access not assigned</h1>
      <p>Your account is valid, but it does not have an active platform staff role. Ask a platform administrator to provision access.</p>
    </div>
    <button className="button secondary" onClick={() => void onSignOut()} type="button">
      <LogOut size={16} /> Sign out
    </button>
  </SecureShell>
);

const MfaView = ({
  mode,
  enrollment,
  onEnrollment,
  onVerified,
  onSignOut,
}: {
  mode: "enroll" | "verify";
  enrollment: Enrollment | null;
  onEnrollment: (value: Enrollment) => void;
  onVerified: () => Promise<void>;
  onSignOut: () => Promise<void>;
}) => {
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [method, setMethod] = useState<"totp" | "backup">("totp");
  const [savedCodes, setSavedCodes] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const beginEnrollment = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const result = await authClient.twoFactor.enable({
        password,
        method: "totp",
        issuer: "Accountiva Staff",
      });
      if (result.error) throw new Error(result.error.message || "MFA enrollment failed");
      if (!result.data || !("totpURI" in result.data)) {
        throw new Error("Authenticator setup was not returned");
      }
      setPassword("");
      onEnrollment({
        totpURI: result.data.totpURI,
        backupCodes: result.data.backupCodes,
      });
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === "enroll" && !savedCodes) {
      setError("Save the recovery codes before verifying your authenticator.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = method === "totp"
        ? await authClient.twoFactor.verifyTotp({ code: code.trim(), trustDevice: false })
        : await authClient.twoFactor.verifyBackupCode({
            code: code.trim(),
            trustDevice: false,
            disableSession: false,
          });
      if (result.error) throw new Error(result.error.message || "Verification failed");
      setCode("");
      await onVerified();
    } catch (caught) {
      setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  const secret = enrollment
    ? new URL(enrollment.totpURI).searchParams.get("secret")
    : null;

  return (
    <SecureShell>
      <div className="auth-heading">
        <span className="eyebrow"><LockKeyhole size={14} /> Required security check</span>
        <h1>{mode === "enroll" ? "Set up an authenticator" : "Verify it’s you"}</h1>
        <p>
          {mode === "enroll"
            ? "Staff access requires time-based one-time passwords. Trusted-device bypass is disabled."
            : "Enter a current authenticator code. Staff verification expires after 15 minutes."}
        </p>
      </div>

      {mode === "enroll" && !enrollment ? (
        <form className="stack" onSubmit={beginEnrollment}>
          <label>
            Confirm your password
            <input
              autoComplete="current-password"
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && <div className="inline-alert danger"><ShieldAlert size={16} />{error}</div>}
          <button className="button primary" disabled={busy} type="submit">
            {busy ? <RefreshCw className="spin" size={16} /> : <ArrowRight size={16} />}
            Create authenticator setup
          </button>
        </form>
      ) : (
        <form className="stack" onSubmit={verify}>
          {enrollment && (
            <div className="enrollment-box">
              <div>
                <span className="field-caption">Authenticator secret</span>
                <code>{secret || enrollment.totpURI}</code>
              </div>
              <div>
                <span className="field-caption">One-time recovery codes</span>
                <div className="recovery-grid">
                  {enrollment.backupCodes.map((backupCode) => <code key={backupCode}>{backupCode}</code>)}
                </div>
              </div>
              <label className="check-row">
                <input
                  checked={savedCodes}
                  onChange={(event) => setSavedCodes(event.target.checked)}
                  type="checkbox"
                />
                I stored these codes in an approved password manager.
              </label>
            </div>
          )}
          {!enrollment && (
            <div className="segmented" role="group" aria-label="Verification method">
              <button className={method === "totp" ? "active" : ""} onClick={() => setMethod("totp")} type="button">Authenticator</button>
              <button className={method === "backup" ? "active" : ""} onClick={() => setMethod("backup")} type="button">Recovery code</button>
            </div>
          )}
          <label>
            {method === "totp" ? "6-digit code" : "Recovery code"}
            <input
              autoComplete="one-time-code"
              inputMode={method === "totp" ? "numeric" : "text"}
              maxLength={method === "totp" ? 6 : 64}
              minLength={method === "totp" ? 6 : 8}
              pattern={method === "totp" ? "[0-9]{6}" : undefined}
              required
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder={method === "totp" ? "000000" : "Enter one unused code"}
            />
          </label>
          {error && <div className="inline-alert danger"><ShieldAlert size={16} />{error}</div>}
          <button className="button primary" disabled={busy} type="submit">
            {busy ? <RefreshCw className="spin" size={16} /> : <ShieldCheck size={16} />}
            Verify staff access
          </button>
        </form>
      )}
      <button className="text-button" onClick={() => void onSignOut()} type="button">Sign out of this account</button>
    </SecureShell>
  );
};

const StatusPill = ({ active, children }: { active?: boolean; children: ReactNode }) => (
  <span className={`status-pill ${active ? "active" : ""}`}>{children}</span>
);

const Directory = ({ onAuthError }: { onAuthError: (error: unknown) => void }) => {
  const [query, setQuery] = useState("");
  const [reason, setReason] = useState("");
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailBusy, setDetailBusy] = useState(false);
  const [error, setError] = useState("");

  const search = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setOrganization(null);
    try {
      const normalized = normalizeSearchQuery(query);
      if (reason.trim().length < 3) {
        throw new Error("Add a support ticket or access reason before searching.");
      }
      setBusy(true);
      const response = await apiRequest<{ users: StaffUser[] }>(
        `/internal/users/search?q=${encodeURIComponent(normalized)}`,
        { headers: { "X-Support-Reason": reason.trim() } },
      );
      setUsers(response.users);
    } catch (caught) {
      if (caught instanceof ApiError && [401, 428].includes(caught.status)) onAuthError(caught);
      else setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  };

  const openOrganization = async (organizationId: string) => {
    if (reason.trim().length < 3) {
      setError("Add a support ticket or access reason before opening an organization.");
      return;
    }
    setError("");
    setDetailBusy(true);
    try {
      const response = await apiRequest<{ organization: OrganizationDetail }>(
        `/internal/organizations/${encodeURIComponent(organizationId)}`,
        { headers: { "X-Support-Reason": reason.trim() } },
      );
      setOrganization(response.organization);
    } catch (caught) {
      if (caught instanceof ApiError && [401, 428].includes(caught.status)) onAuthError(caught);
      else setError(readableError(caught));
    } finally {
      setDetailBusy(false);
    }
  };

  return (
    <div className="page-grid">
      <section className="panel directory-panel">
        <div className="panel-heading">
          <div>
            <span className="eyebrow">Support directory</span>
            <h1>Customer account lookup</h1>
            <p>Find a user by email, name, or exact ID. Results are redacted and every lookup is audited.</p>
          </div>
          <StatusPill active><ShieldCheck size={13} /> Read only</StatusPill>
        </div>
        <form className="search-form" onSubmit={search}>
          <label className="search-input">
            <Search size={17} />
            <input
              aria-label="Search users"
              maxLength={120}
              placeholder="Email, name, or user ID"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <button className="button primary" disabled={busy} type="submit">
            {busy ? <RefreshCw className="spin" size={16} /> : <Search size={16} />}
            Search
          </button>
        </form>
        <label className="reason-field">
          Support reason or ticket (required)
          <input
            maxLength={500}
            placeholder="Ticket ID or a concise access reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {error && <div className="inline-alert danger"><ShieldAlert size={16} />{error}</div>}

        <div className="result-list">
          {!busy && users.length === 0 && (
            <div className="empty-state"><Users size={24} /><strong>No results loaded</strong><span>Use a specific email, name, or ID to begin.</span></div>
          )}
          {users.map((user) => (
            <article className="user-card" key={user.id}>
              <div className="user-avatar"><UserRound size={19} /></div>
              <div className="user-main">
                <div className="user-title">
                  <div><strong>{user.name || "Unnamed user"}</strong><span>{user.email}</span></div>
                  <StatusPill active={user.emailVerified}>{user.emailVerified ? "Verified" : "Unverified"}</StatusPill>
                </div>
                <div className="meta-row"><span>Created {formatDate(user.createdAt)}</span><code>{user.id}</code></div>
                <div className="org-chips">
                  {user.organizations.length === 0 && <span className="muted">No organizations</span>}
                  {user.organizations.map((org) => (
                    <button key={org.id} onClick={() => void openOrganization(org.id)} type="button">
                      <Building2 size={13} />
                      <span>{org.name}<small>{org.role} · {org.membershipStatus}</small></span>
                      <ArrowRight size={13} />
                    </button>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <aside className="panel detail-panel">
        <div className="panel-heading compact">
          <div><span className="eyebrow">Organization diagnostics</span><h2>Workspace snapshot</h2></div>
          {organization && <button className="icon-button" aria-label="Close details" onClick={() => setOrganization(null)} type="button"><X size={17} /></button>}
        </div>
        {detailBusy ? (
          <div className="empty-state"><RefreshCw className="spin" size={22} /><span>Loading audited snapshot…</span></div>
        ) : !organization ? (
          <div className="empty-state tall"><Building2 size={26} /><strong>Select an organization</strong><span>Only plan, membership, and entity counts are available. No invoice values or customer records are exposed.</span></div>
        ) : (
          <div className="org-detail">
            <div className="org-detail-title"><div className="building-icon"><Building2 size={21} /></div><div><h3>{organization.name}</h3><span>{organization.country || "Country not set"}{organization.region ? ` · ${organization.region}` : ""}</span></div></div>
            <div className="fact-grid">
              <div><span>Plan</span><strong>{organization.subscription_plan?.name || "No plan"}</strong></div>
              <div><span>Status</span><strong>{organization.subscription_status || "Unknown"}</strong></div>
              <div><span>Created</span><strong>{formatDate(organization.created_at)}</strong></div>
              <div><span>Plan expiry</span><strong>{formatDate(organization.plan_expires_at)}</strong></div>
            </div>
            <div>
              <span className="section-label">Active-module counts</span>
              <div className="count-grid">
                {Object.entries(organization._count).map(([name, count]) => <div key={name}><strong>{count}</strong><span>{name.replaceAll("_", " ")}</span></div>)}
              </div>
            </div>
            <div>
              <span className="section-label">Members</span>
              <div className="member-list">
                {organization.organization_members.map((member) => (
                  <div key={`${member.user_id}-${member.role}`}>
                    <UserRound size={15} />
                    <span><strong>{member.profiles?.full_name || member.profiles?.email || "Member"}</strong><small>{member.role} · {member.status}</small></span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
};

const AuditLog = ({ onAuthError }: { onAuthError: (error: unknown) => void }) => {
  const [logs, setLogs] = useState<StaffAuditLog[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const response = await apiRequest<{ logs: StaffAuditLog[] }>("/internal/audit-logs?limit=50");
      setLogs(response.logs);
    } catch (caught) {
      if (caught instanceof ApiError && [401, 428].includes(caught.status)) onAuthError(caught);
      else setError(readableError(caught));
    } finally {
      setBusy(false);
    }
  }, [onAuthError]);

  useEffect(() => { void load(); }, [load]);

  return (
    <section className="panel audit-panel">
      <div className="panel-heading">
        <div><span className="eyebrow">Immutable activity trail</span><h1>Staff audit log</h1><p>Recent access events. Database controls prevent updates or deletions.</p></div>
        <button className="button secondary" disabled={busy} onClick={() => void load()} type="button"><RefreshCw className={busy ? "spin" : ""} size={15} />Refresh</button>
      </div>
      {error && <div className="inline-alert danger"><ShieldAlert size={16} />{error}</div>}
      <div className="audit-list">
        {busy && logs.length === 0 && <div className="empty-state"><RefreshCw className="spin" size={22} />Loading audit events…</div>}
        {!busy && logs.length === 0 && <div className="empty-state"><FileClock size={22} />No audit events yet.</div>}
        {logs.map((log) => (
          <article className="audit-row" key={log.id}>
            <div className="audit-icon"><Activity size={16} /></div>
            <div><div className="audit-title"><strong>{log.action.replaceAll(".", " ")}</strong><span>{formatDate(log.created_at)}</span></div><p>{log.staff.user.name || log.staff.user.email} · {roleLabel(log.staff.role)}</p><div className="meta-row"><code>{log.request_id}</code>{log.organization_id && <span>Org {log.organization_id}</span>}{log.ip_address && <span>IP {log.ip_address}</span>}</div>{log.reason && <blockquote>{log.reason}</blockquote>}</div>
          </article>
        ))}
      </div>
    </section>
  );
};

const RecoveryNotice = ({ enrollment, onDismiss }: { enrollment: Enrollment; onDismiss: () => void }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(enrollment.backupCodes.join("\n"));
    setCopied(true);
  };
  return (
    <div className="recovery-notice">
      <ShieldAlert size={20} />
      <div><strong>Store your recovery codes now</strong><p>They will disappear when this page reloads. Keep them in an approved password manager.</p><div className="recovery-grid">{enrollment.backupCodes.map((code) => <code key={code}>{code}</code>)}</div><button className="button secondary small" onClick={() => void copy()} type="button">{copied ? <Check size={14} /> : <Clipboard size={14} />}{copied ? "Copied" : "Copy codes"}</button></div>
      <button className="icon-button" aria-label="Dismiss recovery codes" onClick={onDismiss} type="button"><X size={17} /></button>
    </div>
  );
};

const Portal = ({
  profile,
  enrollment,
  onDismissEnrollment,
  onSignOut,
  onAuthError,
}: {
  profile: StaffProfile;
  enrollment: Enrollment | null;
  onDismissEnrollment: () => void;
  onSignOut: () => Promise<void>;
  onAuthError: (error: unknown) => void;
}) => {
  const canViewAudit = profile.permissions.includes("audit:read");
  const [tab, setTab] = useState<Tab>("directory");

  return (
    <div className="portal-shell">
      <header className="topbar">
        <Brand />
        <div className="session-summary"><span><strong>{profile.email}</strong><small>{roleLabel(profile.role)} · {profile.environment}</small></span><StatusPill active><ShieldCheck size={13} /> MFA verified</StatusPill><button className="icon-button" aria-label="Sign out" onClick={() => void onSignOut()} type="button"><LogOut size={17} /></button></div>
      </header>
      <div className="portal-body">
        <nav className="sidebar" aria-label="Staff portal">
          <button className={tab === "directory" ? "active" : ""} onClick={() => setTab("directory")} type="button"><LifeBuoy size={17} /><span>Support</span></button>
          {canViewAudit && <button className={tab === "audit" ? "active" : ""} onClick={() => setTab("audit")} type="button"><FileClock size={17} /><span>Audit log</span></button>}
          <div className="sidebar-note"><LockKeyhole size={15} /><span>Read-only mode<small>Changes and exports disabled</small></span></div>
        </nav>
        <main className="workspace">
          {enrollment && <RecoveryNotice enrollment={enrollment} onDismiss={onDismissEnrollment} />}
          {tab === "directory" ? <Directory onAuthError={onAuthError} /> : <AuditLog onAuthError={onAuthError} />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  const [gate, setGate] = useState<StaffGate>("loading");
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);

  const refreshAccess = useCallback(async () => {
    setGate("loading");
    try {
      const session = await authClient.getSession();
      if (session.error) {
        setProfile(null);
        setGate("unavailable");
        return;
      }
      if (!session.data?.session) {
        setProfile(null);
        setGate("signed_out");
        return;
      }

      let statusCode = 200;
      let status: StaffStatus | null = null;
      try {
        status = await apiRequest<StaffStatus>("/internal/auth/status");
      } catch (caught) {
        if (!(caught instanceof ApiError)) throw caught;
        statusCode = caught.status;
      }

      const nextGate = getStaffGate({
        hasSession: true,
        staffStatus: statusCode,
        twoFactorEnabled: status?.staff.twoFactorEnabled,
        mfaVerified: status?.staff.mfaVerified,
      });
      setGate(nextGate);
      if (nextGate === "ready") {
        setProfile(await apiRequest<StaffProfile>("/internal/me"));
      } else {
        setProfile(null);
      }
    } catch {
      setProfile(null);
      setGate("unavailable");
    }
  }, []);

  useEffect(() => {
    void refreshAccess();
    const showTwoFactor = () => setGate("verify_mfa");
    window.addEventListener(STAFF_TWO_FACTOR_EVENT, showTwoFactor);
    return () => window.removeEventListener(STAFF_TWO_FACTOR_EVENT, showTwoFactor);
  }, [refreshAccess]);

  const signOut = useCallback(async () => {
    await authClient.signOut();
    setEnrollment(null);
    setProfile(null);
    setGate("signed_out");
  }, []);

  const handleAuthError = useCallback((error: unknown) => {
    if (error instanceof ApiError && error.status === 428) setGate("verify_mfa");
    else if (error instanceof ApiError && error.status === 401) setGate("signed_out");
  }, []);

  const content = useMemo(() => {
    if (gate === "loading") return <LoadingView />;
    if (gate === "unavailable") return <UnavailableView onRetry={refreshAccess} />;
    if (gate === "signed_out") {
      return (
        <SignInView
          onComplete={refreshAccess}
          onTwoFactorRequired={() => setGate("verify_mfa")}
        />
      );
    }
    if (gate === "denied") return <DeniedView onSignOut={signOut} />;
    if (gate === "enroll_mfa" || gate === "verify_mfa") {
      return (
        <MfaView
          mode={gate === "enroll_mfa" ? "enroll" : "verify"}
          enrollment={gate === "enroll_mfa" ? enrollment : null}
          onEnrollment={setEnrollment}
          onSignOut={signOut}
          onVerified={refreshAccess}
        />
      );
    }
    if (profile) {
      return (
        <Portal
          enrollment={enrollment}
          onAuthError={handleAuthError}
          onDismissEnrollment={() => setEnrollment(null)}
          onSignOut={signOut}
          profile={profile}
        />
      );
    }
    return <LoadingView />;
  }, [enrollment, gate, handleAuthError, profile, refreshAccess, signOut]);

  return content;
}
