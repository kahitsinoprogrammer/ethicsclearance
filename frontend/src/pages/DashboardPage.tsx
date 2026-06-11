import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Eye,
  FileCheck2,
  FileText,
  SendHorizontal,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";

import LoadingModal from "@/components/common/LoadingModal";
import PageContainer from "@/components/common/PageContainer";
import StatCard from "@/components/common/StatCard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchApplications,
  fetchApplicationsForSignature,
  fetchManagedForms,
  fetchManagedPrograms,
  fetchMyApplications,
  fetchUsers,
  type FormApplicationSummary,
  type ManagedFormSummary,
  type ManagedProgram,
  type UserRecord
} from "@/lib/api";
import {
  ADMIN_ROLE_CODES,
  APPLICANT_ROLE_CODE,
  GSRO_ROLE_CODES,
  PROGRAM_REVIEWER_ROLE_CODE,
  getDashboardOptions,
  getPrimaryDashboardModule,
  type ModuleAccessKey
} from "@/lib/moduleAccess";
import { cn } from "@/lib/utils";

const DASHBOARD_PREFERENCE_KEY = "ethics_clearance_dashboard_view";

const dashboardHeroContent: Record<
  ModuleAccessKey,
  {
    description: string;
    eyebrow: string;
    title: string;
  }
> = {
  admin: {
    description:
      "Track platform health, spot bottlenecks quickly, and jump straight into the areas that need maintenance.",
    eyebrow: "System Operations",
    title: "Keep the ethics clearance platform in shape."
  },
  applicant: {
    description:
      "See where each submission stands, how many active forms are open, and what to start next without hunting across pages.",
    eyebrow: "Applicant Workspace",
    title: "Stay on top of your ethics clearance progress."
  },
  gsro: {
    description:
      "Watch the incoming queue, see which reviews are still moving through the workflow, and open the right case immediately.",
    eyebrow: "GSRO Queue",
    title: "Move active applications through review with less guesswork."
  },
  reviewer: {
    description:
      "Focus on signatory work that still needs your decision and keep completed reviews from getting mixed into the backlog.",
    eyebrow: "Reviewer Desk",
    title: "See exactly which applications need your signature."
  }
};

type DashboardStat = {
  icon: LucideIcon;
  label: string;
  tone?: "gold" | "maroon";
  value: string;
};

type BreakdownItem = {
  label: string;
  note: string;
  value: string;
};

type DashboardActionItem = {
  description: string;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "secondary";
};

type ActivityListItem = {
  actionLabel?: string;
  badge?: string;
  meta?: string;
  onAction?: () => void;
  subtitle?: string;
  title: string;
};

type ApplicantDashboardData = {
  activeForms: number;
  applications: FormApplicationSummary[];
  kind: "applicant";
};

type ReviewerDashboardData = {
  applications: FormApplicationSummary[];
  kind: "reviewer";
};

type GsroDashboardData = {
  applications: FormApplicationSummary[];
  kind: "gsro";
};

type AdminDashboardData = {
  activeForms: number;
  activePrograms: number;
  activeUsers: number;
  inactiveForms: number;
  inactivePrograms: number;
  inactiveUsers: number;
  kind: "admin";
  recentForms: ManagedFormSummary[];
  recentPrograms: ManagedProgram[];
  recentUsers: UserRecord[];
  totalUsers: number;
};

type DashboardData =
  | AdminDashboardData
  | ApplicantDashboardData
  | GsroDashboardData
  | ReviewerDashboardData;

const formatCount = (value: number) => {
  return new Intl.NumberFormat("en-PH").format(value);
};

const formatDateTime = (value: string | null | undefined) => {
  if (!value) {
    return "Not available";
  }

  const parsedValue = new Date(value);

  if (Number.isNaN(parsedValue.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-PH", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(parsedValue);
};

const getTimestamp = (value: string | null | undefined) => {
  if (!value) {
    return 0;
  }

  const parsedValue = Date.parse(value);

  return Number.isNaN(parsedValue) ? 0 : parsedValue;
};

const sortApplicationsByRecentActivity = (applications: FormApplicationSummary[]) => {
  return [...applications].sort((left, right) => {
    const leftTimestamp = Math.max(
      getTimestamp(left.updated_at),
      getTimestamp(left.submitted_at),
      getTimestamp(left.created_at)
    );
    const rightTimestamp = Math.max(
      getTimestamp(right.updated_at),
      getTimestamp(right.submitted_at),
      getTimestamp(right.created_at)
    );

    return rightTimestamp - leftTimestamp;
  });
};

const toSentenceCase = (value: string) => {
  return value
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
};

const getApplicationStatusLabel = (status: string) => {
  if (status === "approved") {
    return "Complete";
  }

  if (status === "under_review") {
    return "Awaiting Signatories";
  }

  if (status === "submitted") {
    return "Waiting for GSRO";
  }

  if (status === "withdrawn") {
    return "Withdrawn";
  }

  return toSentenceCase(status);
};

const formatDisplayName = ({
  firstname,
  honorifics,
  lastname,
  middlename
}: {
  firstname?: string | null;
  honorifics?: string | null;
  lastname?: string | null;
  middlename?: string | null;
}) => {
  return [honorifics, firstname, middlename, lastname].filter(Boolean).join(" ");
};

const formatRoleCode = (roleCode: string) => {
  if (ADMIN_ROLE_CODES.some((currentRoleCode) => currentRoleCode === roleCode)) {
    return "Admin";
  }

  if (GSRO_ROLE_CODES.some((currentRoleCode) => currentRoleCode === roleCode)) {
    return "GSRO";
  }

  if (roleCode === PROGRAM_REVIEWER_ROLE_CODE) {
    return "Reviewer";
  }

  if (roleCode === APPLICANT_ROLE_CODE) {
    return "Applicant";
  }

  return toSentenceCase(roleCode);
};

const formatRoleList = (roleCodes: string[]) => {
  const uniqueRoles = Array.from(
    new Set(roleCodes.map((roleCode) => formatRoleCode(roleCode)))
  );

  return uniqueRoles.join(", ");
};

const getDashboardStorageKey = (userId: string) => {
  return `${DASHBOARD_PREFERENCE_KEY}:${userId}`;
};

function ActionGrid({ actions }: { actions: DashboardActionItem[] }) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <div className={cn("grid gap-4", actions.length > 1 && "sm:grid-cols-2")}>
      {actions.map((action) => (
        <Card key={action.label} className="border-pup-maroon/10">
          <CardHeader>
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-pup-maroon/10 text-pup-maroon">
              <action.icon className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="pt-2 text-lg text-ink-900">{action.label}</CardTitle>
            <CardDescription>{action.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              type="button"
              variant={action.variant ?? "default"}
              onClick={action.onClick}
            >
              Open
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function BreakdownCard({
  description,
  items,
  title
}: {
  description: string;
  items: BreakdownItem[];
  title: string;
}) {
  return (
    <Card className="border-pup-maroon/10">
      <CardHeader>
        <CardTitle className="text-lg text-ink-900">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-xl border border-border/80 bg-muted-100/30 px-4 py-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-ink-900">{item.label}</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-pup-maroon shadow-sm">
                {item.value}
              </span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{item.note}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ActivityListCard({
  ctaLabel,
  description,
  emptyMessage,
  items,
  onCta,
  title
}: {
  ctaLabel?: string;
  description: string;
  emptyMessage: string;
  items: ActivityListItem[];
  onCta?: () => void;
  title: string;
}) {
  return (
    <Card className="border-pup-maroon/10">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <CardTitle className="text-lg text-ink-900">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {ctaLabel && onCta ? (
          <Button type="button" variant="outline" onClick={onCta}>
            {ctaLabel}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {items.length ? (
          <div className="space-y-3">
            {items.map((item) => (
              <div
                key={`${item.title}-${item.meta ?? item.subtitle ?? item.badge ?? ""}`}
                className="rounded-xl border border-border/80 bg-white px-4 py-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-ink-900">
                        {item.title}
                      </p>
                      {item.badge ? (
                        <span className="rounded-full bg-pup-maroon/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pup-maroon">
                          {item.badge}
                        </span>
                      ) : null}
                    </div>
                    {item.subtitle ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.subtitle}
                      </p>
                    ) : null}
                    {item.meta ? (
                      <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                        {item.meta}
                      </p>
                    ) : null}
                  </div>

                  {item.actionLabel && item.onAction ? (
                    <Button type="button" variant="outline" onClick={item.onAction}>
                      {item.actionLabel}
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed bg-muted-100/20 px-4 py-8 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

async function loadApplicantDashboard(token: string): Promise<ApplicantDashboardData> {
  const [applicationsResult, formsResult] = await Promise.all([
    fetchMyApplications(token),
    fetchManagedForms(token, {
      status: "active"
    })
  ]);

  return {
    activeForms: formsResult.pagination.total,
    applications: sortApplicationsByRecentActivity(applicationsResult.applications),
    kind: "applicant"
  };
}

async function loadReviewerDashboard(token: string): Promise<ReviewerDashboardData> {
  const applicationsResult = await fetchApplicationsForSignature(token);

  return {
    applications: sortApplicationsByRecentActivity(applicationsResult.applications),
    kind: "reviewer"
  };
}

async function loadGsroDashboard(token: string): Promise<GsroDashboardData> {
  const applicationsResult = await fetchApplications(token);

  return {
    applications: sortApplicationsByRecentActivity(applicationsResult.applications),
    kind: "gsro"
  };
}

async function loadAdminDashboard(token: string): Promise<AdminDashboardData> {
  const [
    usersResult,
    activeUsersResult,
    formsResult,
    activeFormsResult,
    programsResult,
    activeProgramsResult
  ] = await Promise.all([
    fetchUsers(token),
    fetchUsers(token, {
      status: "active"
    }),
    fetchManagedForms(token),
    fetchManagedForms(token, {
      status: "active"
    }),
    fetchManagedPrograms(token),
    fetchManagedPrograms(token, {
      status: "active"
    })
  ]);

  const totalUsers = usersResult.pagination.total;
  const activeUsers = activeUsersResult.pagination.total;
  const totalForms = formsResult.pagination.total;
  const activeForms = activeFormsResult.pagination.total;
  const totalPrograms = programsResult.pagination.total;
  const activePrograms = activeProgramsResult.pagination.total;

  return {
    activeForms,
    activePrograms,
    activeUsers,
    inactiveForms: Math.max(totalForms - activeForms, 0),
    inactivePrograms: Math.max(totalPrograms - activePrograms, 0),
    inactiveUsers: Math.max(totalUsers - activeUsers, 0),
    kind: "admin",
    recentForms: formsResult.forms.slice(0, 4),
    recentPrograms: programsResult.programs.slice(0, 4),
    recentUsers: usersResult.users.slice(0, 5),
    totalUsers
  };
}

export default function DashboardPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const dashboardOptions = getDashboardOptions(user);
  const availableDashboardModules = dashboardOptions.map((option) => option.module);
  const [selectedDashboard, setSelectedDashboard] = useState<ModuleAccessKey | null>(
    null
  );
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const fullName = formatDisplayName(user ?? {}) || "User";
  const dashboardSelectionSignature = availableDashboardModules.join("|");

  useEffect(() => {
    if (!user) {
      setSelectedDashboard(null);
      return;
    }

    const storedDashboard = window.localStorage.getItem(
      getDashboardStorageKey(user.user_id)
    );
    const fallbackDashboard = getPrimaryDashboardModule(user);

    if (
      storedDashboard &&
      availableDashboardModules.includes(storedDashboard as ModuleAccessKey)
    ) {
      setSelectedDashboard(storedDashboard as ModuleAccessKey);
      return;
    }

    setSelectedDashboard((currentDashboard) => {
      if (
        currentDashboard &&
        availableDashboardModules.includes(currentDashboard)
      ) {
        return currentDashboard;
      }

      return fallbackDashboard;
    });
  }, [dashboardSelectionSignature, user?.user_id]);

  useEffect(() => {
    if (!user || !selectedDashboard) {
      return;
    }

    if (!availableDashboardModules.includes(selectedDashboard)) {
      return;
    }

    window.localStorage.setItem(
      getDashboardStorageKey(user.user_id),
      selectedDashboard
    );
  }, [dashboardSelectionSignature, selectedDashboard, user?.user_id]);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      if (!token || !selectedDashboard) {
        if (isMounted) {
          setDashboardData(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        setPageError("");

        let nextDashboardData: DashboardData;

        if (selectedDashboard === "admin") {
          nextDashboardData = await loadAdminDashboard(token);
        } else if (selectedDashboard === "gsro") {
          nextDashboardData = await loadGsroDashboard(token);
        } else if (selectedDashboard === "reviewer") {
          nextDashboardData = await loadReviewerDashboard(token);
        } else {
          nextDashboardData = await loadApplicantDashboard(token);
        }

        if (!isMounted) {
          return;
        }

        setDashboardData(nextDashboardData);
      } catch (error) {
        if (isMounted) {
          setDashboardData(null);
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load the selected dashboard."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [selectedDashboard, token]);

  const activeDashboard =
    selectedDashboard ?? getPrimaryDashboardModule(user);
  const activeDashboardOption = dashboardOptions.find(
    (option) => option.module === activeDashboard
  );
  const heroContent = dashboardHeroContent[activeDashboard];
  const showLoadingModal = isLoading || !selectedDashboard;
  const hasMultipleDashboards = dashboardOptions.length > 1;

  let stats: DashboardStat[] = [];
  let mainContent: ReactNode = null;
  let sideContent: ReactNode = null;
  let actions: DashboardActionItem[] = [];

  if (dashboardData?.kind === "applicant") {
    const waitingForGsroCount = dashboardData.applications.filter(
      (application) => application.application_status === "submitted"
    ).length;
    const awaitingSignatoriesCount = dashboardData.applications.filter(
      (application) => application.application_status === "under_review"
    ).length;
    const completedCount = dashboardData.applications.filter(
      (application) => application.application_status === "approved"
    ).length;

    stats = [
      {
        icon: ClipboardList,
        label: "My applications",
        value: formatCount(dashboardData.applications.length)
      },
      {
        icon: Clock3,
        label: "Waiting for GSRO",
        tone: "gold",
        value: formatCount(waitingForGsroCount)
      },
      {
        icon: FileCheck2,
        label: "Awaiting signatories",
        value: formatCount(awaitingSignatoriesCount)
      },
      {
        icon: FileText,
        label: "Active forms",
        tone: "gold",
        value: formatCount(dashboardData.activeForms)
      }
    ];

    actions = [
      {
        description:
          "Browse the active ethics forms and start a fresh application.",
        icon: SendHorizontal,
        label: "Start application",
        onClick: () => navigate("/forms/apply")
      },
      {
        description:
          "Open your application history and revisit anything already submitted.",
        icon: Eye,
        label: "View my applications",
        onClick: () => navigate("/applications/my"),
        variant: "outline"
      }
    ];

    mainContent = (
      <ActivityListCard
        ctaLabel="View all"
        description="Your most recent submissions and where they currently sit in the workflow."
        emptyMessage="You have not started any applications yet."
        items={dashboardData.applications.slice(0, 4).map((application) => ({
          actionLabel: "Open",
          badge: getApplicationStatusLabel(application.application_status),
          meta: `Reference ${application.reference_no || "Not assigned"} · Updated ${formatDateTime(application.updated_at)}`,
          onAction: () =>
            navigate(`/applications/my/${application.application_id}`, {
              state: { backTo: "/applications/my" }
            }),
          subtitle:
            application.research_title || "Research title has not been provided yet.",
          title: application.form_name_snapshot
        }))}
        onCta={() => navigate("/applications/my")}
        title="Recent applications"
      />
    );

    sideContent = (
      <div className="space-y-6">
        <ActionGrid actions={actions} />
        <BreakdownCard
          description="A simple read on what is waiting, moving, or already cleared."
          items={[
            {
              label: "Waiting for GSRO",
              note: "Submitted applications that are still queued for GSRO review.",
              value: formatCount(waitingForGsroCount)
            },
            {
              label: "Awaiting signatories",
              note: "Applications that GSRO already advanced to the signatory stage.",
              value: formatCount(awaitingSignatoriesCount)
            },
            {
              label: "Completed",
              note: "Applications that already reached an approved outcome.",
              value: formatCount(completedCount)
            }
          ]}
          title="Application pulse"
        />
      </div>
    );
  }

  if (dashboardData?.kind === "reviewer") {
    const needsSignatureCount = dashboardData.applications.filter(
      (application) => application.current_user_pending_signatory_count > 0
    ).length;
    const revisionRequestedCount = dashboardData.applications.filter(
      (application) => application.current_user_signatory_status === "rejected"
    ).length;
    const signedCount = dashboardData.applications.filter(
      (application) =>
        application.current_user_signatory_status === "signed" ||
        application.current_user_signed_signatory_count > 0
    ).length;

    stats = [
      {
        icon: ShieldCheck,
        label: "Assigned applications",
        value: formatCount(dashboardData.applications.length)
      },
      {
        icon: Clock3,
        label: "Needs signature",
        tone: "gold",
        value: formatCount(needsSignatureCount)
      },
      {
        icon: ClipboardCheck,
        label: "Signed",
        value: formatCount(signedCount)
      },
      {
        icon: FileText,
        label: "Revision requested",
        tone: "gold",
        value: formatCount(revisionRequestedCount)
      }
    ];

    actions = [
      {
        description:
          "Open the signatory queue and record your decisions on pending applications.",
        icon: ShieldCheck,
        label: "Open signatory queue",
        onClick: () => navigate("/applications/for-signature")
      }
    ];

    mainContent = (
      <ActivityListCard
        ctaLabel="Open queue"
        description="Applications already assigned to you as a signatory, sorted by recent activity."
        emptyMessage="No applications are waiting in your signatory queue right now."
        items={dashboardData.applications.slice(0, 5).map((application) => ({
          actionLabel: "Open",
          badge: getApplicationStatusLabel(application.application_status),
          meta: `Applicant ${application.applicant_name || "Unknown"} · Updated ${formatDateTime(application.updated_at)}`,
          onAction: () =>
            navigate(
              `/applications/for-signature/${application.application_id}`,
              {
                state: { backTo: "/applications/for-signature" }
              }
            ),
          subtitle:
            application.research_title || "Research title has not been provided yet.",
          title: application.form_name_snapshot
        }))}
        onCta={() => navigate("/applications/for-signature")}
        title="Signatory queue"
      />
    );

    sideContent = (
      <div className="space-y-6">
        <ActionGrid actions={actions} />
        <BreakdownCard
          description="Use this to tell what still needs a decision versus what you already finished."
          items={[
            {
              label: "Needs signature",
              note: "Assigned steps where your signatory action is still pending.",
              value: formatCount(needsSignatureCount)
            },
            {
              label: "Revision requested",
              note: "Applications where you already requested changes or rejected the current version.",
              value: formatCount(revisionRequestedCount)
            },
            {
              label: "Signed",
              note: "Applications where your assigned signatory step is already complete.",
              value: formatCount(signedCount)
            }
          ]}
          title="Decision summary"
        />
      </div>
    );
  }

  if (dashboardData?.kind === "gsro") {
    const submittedCount = dashboardData.applications.filter(
      (application) => application.application_status === "submitted"
    ).length;
    const underReviewCount = dashboardData.applications.filter(
      (application) => application.application_status === "under_review"
    ).length;
    const completedCount = dashboardData.applications.filter(
      (application) => application.application_status === "approved"
    ).length;

    stats = [
      {
        icon: ClipboardList,
        label: "Total queue",
        value: formatCount(dashboardData.applications.length)
      },
      {
        icon: Clock3,
        label: "Ready for GSRO",
        tone: "gold",
        value: formatCount(submittedCount)
      },
      {
        icon: ClipboardCheck,
        label: "Under review",
        value: formatCount(underReviewCount)
      },
      {
        icon: FileCheck2,
        label: "Completed",
        tone: "gold",
        value: formatCount(completedCount)
      }
    ];

    actions = [
      {
        description:
          "Open the GSRO queue to assign signatories, answer forms, and continue active reviews.",
        icon: ClipboardCheck,
        label: "Open GSRO queue",
        onClick: () => navigate("/applications")
      }
    ];

    mainContent = (
      <ActivityListCard
        ctaLabel="Open queue"
        description="The applications that most recently changed state inside the GSRO workflow."
        emptyMessage="No applications are in the GSRO queue right now."
        items={dashboardData.applications.slice(0, 5).map((application) => ({
          actionLabel: "Open",
          badge: getApplicationStatusLabel(application.application_status),
          meta: `Applicant ${application.applicant_name || "Unknown"} · Updated ${formatDateTime(application.updated_at)}`,
          onAction: () =>
            navigate(`/applications/${application.application_id}`, {
              state: { backTo: "/applications" }
            }),
          subtitle:
            application.research_title || "Research title has not been provided yet.",
          title: application.form_name_snapshot
        }))}
        onCta={() => navigate("/applications")}
        title="Queue activity"
      />
    );

    sideContent = (
      <div className="space-y-6">
        <ActionGrid actions={actions} />
        <BreakdownCard
          description="This makes it easier to separate intake work from active and completed reviews."
          items={[
            {
              label: "Ready for GSRO",
              note: "Newly submitted applications that still need GSRO attention.",
              value: formatCount(submittedCount)
            },
            {
              label: "Under review",
              note: "Applications already being worked on or waiting on the signatory stage.",
              value: formatCount(underReviewCount)
            },
            {
              label: "Completed",
              note: "Applications that already finished the workflow successfully.",
              value: formatCount(completedCount)
            }
          ]}
          title="Queue breakdown"
        />
      </div>
    );
  }

  if (dashboardData?.kind === "admin") {
    stats = [
      {
        icon: UsersRound,
        label: "Registered users",
        value: formatCount(dashboardData.totalUsers)
      },
      {
        icon: ClipboardCheck,
        label: "Active users",
        tone: "gold",
        value: formatCount(dashboardData.activeUsers)
      },
      {
        icon: FileText,
        label: "Active forms",
        value: formatCount(dashboardData.activeForms)
      },
      {
        icon: BookOpen,
        label: "Active programs",
        tone: "gold",
        value: formatCount(dashboardData.activePrograms)
      }
    ];

    actions = [
      {
        description:
          "Review the current user base, role assignments, and account status.",
        icon: UsersRound,
        label: "Manage users",
        onClick: () => navigate("/users/view")
      },
      {
        description:
          "Check the current form catalog and update anything that is out of date.",
        icon: FileText,
        label: "Manage forms",
        onClick: () => navigate("/forms/view"),
        variant: "outline"
      },
      {
        description:
          "Keep the program list current so registration and filtering stay accurate.",
        icon: BookOpen,
        label: "Manage programs",
        onClick: () => navigate("/programs/view"),
        variant: "outline"
      }
    ];

    mainContent = (
      <ActivityListCard
        ctaLabel="Manage users"
        description="The newest user accounts and the roles they currently carry."
        emptyMessage="No users have been created yet."
        items={dashboardData.recentUsers.map((currentUser) => ({
          badge: currentUser.is_active ? "Active" : "Inactive",
          meta: `Created ${formatDateTime(currentUser.created_at)}`,
          subtitle: `${currentUser.email} · ${formatRoleList(currentUser.role_codes) || "No roles assigned"}`,
          title:
            formatDisplayName(currentUser) ||
            currentUser.username ||
            "Unnamed user"
        }))}
        onCta={() => navigate("/users/view")}
        title="Recent users"
      />
    );

    sideContent = (
      <div className="space-y-6">
        <ActionGrid actions={actions} />
        <ActivityListCard
          ctaLabel="View forms"
          description="Recently updated forms in the catalog."
          emptyMessage="No forms are available yet."
          items={dashboardData.recentForms.map((form) => ({
            badge: form.is_active ? "Active" : "Inactive",
            meta: `${form.section_count} sections · ${form.question_count} questions`,
            subtitle: form.description || "No description provided.",
            title: form.form_name
          }))}
          onCta={() => navigate("/forms/view")}
          title="Recent forms"
        />
        <ActivityListCard
          ctaLabel="View programs"
          description="Programs currently configured in the system."
          emptyMessage="No programs are available yet."
          items={dashboardData.recentPrograms.map((program) => ({
            badge: program.is_active ? "Active" : "Inactive",
            meta: `Program code ${program.program_code}`,
            title: program.program_name
          }))}
          onCta={() => navigate("/programs/view")}
          title="Recent programs"
        />
        <BreakdownCard
          description="A quick way to spot paused records that may need cleanup."
          items={[
            {
              label: "Inactive users",
              note: "Accounts that are no longer active and may need review.",
              value: formatCount(dashboardData.inactiveUsers)
            },
            {
              label: "Inactive forms",
              note: "Forms that are currently unavailable to applicants.",
              value: formatCount(dashboardData.inactiveForms)
            },
            {
              label: "Inactive programs",
              note: "Programs not currently marked active in the system.",
              value: formatCount(dashboardData.inactivePrograms)
            }
          ]}
          title="Operational watchlist"
        />
      </div>
    );
  }

  return (
    <>
      <LoadingModal
        open={showLoadingModal}
        title="Loading dashboard"
        description="We are preparing the latest summary for this role."
      />

      <PageContainer className="space-y-8 pb-10">
        <section className="relative overflow-hidden rounded-[2rem] border bg-gradient-to-br from-pup-maroon-900 via-pup-maroon to-ink-900 px-6 py-8 text-white shadow-xl sm:px-8">
          <div className="absolute -right-12 top-6 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-32 w-32 rounded-full bg-pup-gold/20 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-pup-gold">
                {heroContent.eyebrow}
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-normal sm:text-4xl">
                {heroContent.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-white/85">
                {heroContent.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-medium text-white shadow-sm backdrop-blur">
                  Signed in as {fullName}
                </span>
                {activeDashboardOption ? (
                  <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 font-medium text-white shadow-sm backdrop-blur">
                    Viewing {activeDashboardOption.label} dashboard
                  </span>
                ) : null}
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-5 shadow-lg backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-pup-gold">
                Your active roles
              </p>
              <p className="mt-3 text-lg font-semibold text-white">
                {dashboardOptions.map((option) => option.label).join(", ") || "Applicant"}
              </p>
              <p className="mt-2 text-sm leading-6 text-white/80">
                {activeDashboardOption?.description ||
                  "Use the dashboard to check what needs your attention in the system."}
              </p>

              {hasMultipleDashboards ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    Choose dashboard
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {dashboardOptions.map((option) => {
                      const isSelected = selectedDashboard === option.module;

                      return (
                        <button
                          key={option.module}
                          type="button"
                          className={cn(
                            "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                            isSelected
                              ? "border-white bg-white text-pup-maroon shadow-sm"
                              : "border-white/20 bg-white/5 text-white hover:bg-white/10"
                          )}
                          onClick={() => setSelectedDashboard(option.module)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {pageError ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-5 text-sm font-medium text-destructive">
              {pageError}
            </CardContent>
          </Card>
        ) : null}

        {stats.length ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <StatCard
                key={stat.label}
                icon={stat.icon}
                label={stat.label}
                tone={stat.tone}
                value={stat.value}
              />
            ))}
          </section>
        ) : null}

        {mainContent || sideContent ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
            <div>{mainContent}</div>
            <div>{sideContent}</div>
          </section>
        ) : null}
      </PageContainer>
    </>
  );
}
