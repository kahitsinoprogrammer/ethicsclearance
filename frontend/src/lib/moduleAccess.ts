import type { AuthUser } from "@/lib/api";

export const ADMIN_ROLE_CODES = [
  "ADMIN",
  "SUPER_ADMIN",
  "SUPERADMIN",
  "SYSTEM_ADMIN",
  "SYSTEM_ADMINISTRATOR",
  "ADMINISTRATOR"
] as const;

export const GSRO_ROLE_CODES = [
  "GSREC_GSREO_OFFICER",
  "GSRO_OFFICER",
  "GSRO"
] as const;

export const PROGRAM_REVIEWER_ROLE_CODE = "PROGRAM_REVIEWER";
export const APPLICANT_ROLE_CODE = "APPLICANT";

export type ModuleAccessKey = "admin" | "applicant" | "gsro" | "reviewer";
export type DashboardOption = {
  description: string;
  label: string;
  module: ModuleAccessKey;
};

const DASHBOARD_OPTIONS: Record<ModuleAccessKey, DashboardOption> = {
  admin: {
    description: "Monitor users, forms, programs, and overall system readiness.",
    label: "Admin",
    module: "admin"
  },
  applicant: {
    description: "Track your applications, available forms, and approval progress.",
    label: "Applicant",
    module: "applicant"
  },
  gsro: {
    description: "Watch the active application queue and move reviews forward.",
    label: "GSRO",
    module: "gsro"
  },
  reviewer: {
    description: "Focus on the signatory decisions that need your attention.",
    label: "Reviewer",
    module: "reviewer"
  }
};

const hasRoleCode = (
  user: AuthUser | null | undefined,
  roleCode: string
) => {
  return Array.isArray(user?.role_codes) && user.role_codes.includes(roleCode);
};

const hasAnyRoleCode = (
  user: AuthUser | null | undefined,
  roleCodes: readonly string[]
) => {
  return roleCodes.some((roleCode) => hasRoleCode(user, roleCode));
};

const hasExplicitAdminRole = (user: AuthUser | null | undefined) => {
  return hasAnyRoleCode(user, ADMIN_ROLE_CODES);
};

const hasExplicitGsroRole = (user: AuthUser | null | undefined) => {
  return hasAnyRoleCode(user, GSRO_ROLE_CODES);
};

const hasExplicitReviewerRole = (user: AuthUser | null | undefined) => {
  return hasRoleCode(user, PROGRAM_REVIEWER_ROLE_CODE);
};

const hasExplicitApplicantRole = (user: AuthUser | null | undefined) => {
  return hasRoleCode(user, APPLICANT_ROLE_CODE);
};

export const hasAdminModuleAccess = (user: AuthUser | null | undefined) => {
  return hasExplicitAdminRole(user);
};

export const hasGsroModuleAccess = (user: AuthUser | null | undefined) => {
  return hasAdminModuleAccess(user) || hasExplicitGsroRole(user);
};

export const hasReviewerModuleAccess = (user: AuthUser | null | undefined) => {
  return hasAdminModuleAccess(user) || hasExplicitReviewerRole(user);
};

export const hasApplicantModuleAccess = (user: AuthUser | null | undefined) => {
  if (hasAdminModuleAccess(user) || hasExplicitApplicantRole(user)) {
    return true;
  }

  return !hasAnyRoleCode(user, [
    ...ADMIN_ROLE_CODES,
    ...GSRO_ROLE_CODES,
    PROGRAM_REVIEWER_ROLE_CODE
  ]);
};

export const canAccessModule = (
  user: AuthUser | null | undefined,
  module: ModuleAccessKey
) => {
  if (module === "admin") {
    return hasAdminModuleAccess(user);
  }

  if (module === "gsro") {
    return hasGsroModuleAccess(user);
  }

  if (module === "reviewer") {
    return hasReviewerModuleAccess(user);
  }

  return hasApplicantModuleAccess(user);
};

export const getAvailableDashboardModules = (
  user: AuthUser | null | undefined
) => {
  const modules: ModuleAccessKey[] = [];

  if (hasExplicitAdminRole(user)) {
    modules.push("admin");
  }

  if (hasExplicitGsroRole(user)) {
    modules.push("gsro");
  }

  if (hasExplicitReviewerRole(user)) {
    modules.push("reviewer");
  }

  if (hasExplicitApplicantRole(user) || modules.length === 0) {
    modules.push("applicant");
  }

  return modules;
};

export const getDashboardOptions = (user: AuthUser | null | undefined) => {
  return getAvailableDashboardModules(user).map(
    (module) => DASHBOARD_OPTIONS[module]
  );
};

export const getPrimaryDashboardModule = (
  user: AuthUser | null | undefined
) => {
  return getAvailableDashboardModules(user)[0] ?? "applicant";
};

export const getDefaultAuthenticatedRoute = (
  user: AuthUser | null | undefined
) => {
  if (user) {
    return "/dashboard";
  }

  return "/login";
};
