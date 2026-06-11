import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Eye,
  Filter,
  Search,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import LoadingModal from "@/components/common/LoadingModal";
import PageContainer from "@/components/common/PageContainer";
import SectionHeader from "@/components/common/SectionHeader";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchApplications,
  fetchApplicationsForSignature,
  type FormApplicationSummary
} from "@/lib/api";
import { hasGsroModuleAccess } from "@/lib/moduleAccess";

const statusOptions: ComboboxItem[] = [
  { label: "Waiting for GSRO", value: "submitted" },
  { label: "Awaiting Signatories", value: "under_review" },
  { label: "Complete", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Withdrawn", value: "withdrawn" }
];

const getStatusLabel = (status: string) => {
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

  return status.replace(/_/g, " ");
};

export default function ApplicationsPage() {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<FormApplicationSummary[]>([]);
  const [scope, setScope] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 5;
  const isSignatureRoute = location.pathname.startsWith("/applications/for-signature");

  useEffect(() => {
    let isMounted = true;

    const loadApplications = async () => {
      if (!token) {
        if (isMounted) {
          setApplications([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const result = isSignatureRoute
          ? await fetchApplicationsForSignature(token)
          : await fetchApplications(token);

        if (!isMounted) {
          return;
        }

        setApplications(result.applications);
        setScope(result.scope);
        setPageError("");
      } catch (error) {
        if (isMounted) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load applications."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadApplications();

    return () => {
      isMounted = false;
    };
  }, [isSignatureRoute, token]);

  const isGsroScope = !isSignatureRoute && (scope
    ? scope !== "PROGRAM_REVIEWER"
    : hasGsroModuleAccess(user));
  const normalizedAppliedSearch = appliedSearch.trim().toLowerCase();
  const filteredApplications = applications.filter((application) => {
    const matchesSearch = !normalizedAppliedSearch
      ? true
      : [
          application.form_name_snapshot,
          application.reference_no,
          application.research_title,
          application.applicant_name,
          application.applicant_email
        ]
          .filter(Boolean)
          .some((value) =>
            value?.toLowerCase().includes(normalizedAppliedSearch)
          );
    const matchesStatus = !appliedStatus
      ? true
      : application.application_status === appliedStatus;

    return matchesSearch && matchesStatus;
  });
  const totalPages = Math.max(
    Math.ceil(filteredApplications.length / pageSize),
    1
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedApplications = filteredApplications.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const applyFilters = () => {
    setAppliedSearch(search.trim());
    setAppliedStatus(statusFilter);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearch("");
    setAppliedSearch("");
    setStatusFilter("");
    setAppliedStatus("");
    setCurrentPage(1);
  };

  const goToPreviousPage = () => {
    setCurrentPage((currentValue) => Math.max(currentValue - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage((currentValue) =>
      Math.min(currentValue + 1, totalPages)
    );
  };

  return (
    <>
      <LoadingModal
        open={isLoading}
        title="Loading applications"
        description="We are preparing the application queue for your role."
      />

      <PageContainer>
        <SectionHeader
          eyebrow="Applications"
          title={
            isSignatureRoute
              ? "For Signature"
              : isGsroScope
                ? "GSRO Application Queue"
                : "My Signatory Queue"
          }
          description={
            isSignatureRoute
              ? "See every application where you are the assigned signatory and either approve it or request revision after GSRO has completed all answers."
              : isGsroScope
              ? "Review submitted applications, assign signatories, complete the form answers, and move them forward for signatory approval."
              : "Review the applications assigned to you as a signatory and record your approval decisions after GSRO completes the answers."
          }
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>
              {isSignatureRoute
                ? "Applications awaiting your signature"
                : isGsroScope
                  ? "Pending and completed applications"
                  : "Assigned applications"}
            </CardTitle>
            <CardDescription>
              Signed in as{" "}
              {[user?.firstname, user?.middlename, user?.lastname]
                .filter(Boolean)
                .join(" ") || "current user"}
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 lg:grid-cols-[1fr_220px_auto_auto]">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  className="pl-9"
                  placeholder="Search form, reference no., title, or applicant"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <Combobox
                items={statusOptions}
                placeholder="All statuses"
                searchPlaceholder="Search status"
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
              <Button type="button" onClick={applyFilters}>
                <Filter className="h-4 w-4" aria-hidden="true" />
                Filter
              </Button>
              <Button type="button" variant="outline" onClick={clearFilters}>
                Clear
              </Button>
            </div>

            {pageError ? (
              <p className="mt-4 text-sm font-medium text-destructive">{pageError}</p>
            ) : null}

            {filteredApplications.length ? (
              <div className="mt-6 space-y-4">
                {paginatedApplications.map((application) => (
                  <div
                    key={application.application_id}
                    className="rounded-lg border bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-ink-900">
                            {application.form_name_snapshot}
                          </p>
                          <span className="rounded-full bg-pup-maroon/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pup-maroon">
                            {getStatusLabel(application.application_status)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Reference no.: {application.reference_no || "Not assigned"}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Research Title: {application.research_title || "Not provided"}
                        </p>
                        <p className="mt-2 text-sm text-muted-foreground">
                          Applicant: {application.applicant_name || "Unknown applicant"}
                          {application.applicant_email
                            ? ` | ${application.applicant_email}`
                            : ""}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>
                            Answers saved: {application.answer_count}
                          </span>
                          <span>
                            Required signatories: {application.required_signatory_count}
                          </span>
                          <span>
                            Approved signatories: {application.signed_signatory_count}
                          </span>
                          <span>
                            Pending signatories: {application.pending_signatory_count}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <Button
                          type="button"
                          onClick={() =>
                            navigate(
                              isSignatureRoute
                                ? `/applications/for-signature/${application.application_id}`
                                : `/applications/${application.application_id}`,
                              {
                                state: {
                                  backTo: isSignatureRoute
                                    ? "/applications/for-signature"
                                    : "/applications"
                                }
                              }
                            )
                          }
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Open Application
                        </Button>
                        <div className="rounded-md bg-muted-100/60 px-3 py-2 text-xs text-muted-foreground">
                          {isSignatureRoute ? (
                            <span className="flex items-center gap-2">
                              <ShieldCheck
                                className="h-4 w-4 text-pup-maroon"
                                aria-hidden="true"
                              />
                              {application.application_status === "withdrawn"
                                ? "The applicant withdrew this application. No signature action is needed anymore."
                                : application.current_user_pending_signatory_count > 0
                                ? "Open the answered form to review it, leave question comments if needed, and record your decision."
                                : application.current_user_signatory_status === "rejected"
                                  ? "You requested revision on this application. Open it again to update your comment or complete your signature."
                                : application.current_user_signed_signatory_count > 0
                                  ? "You already signed your assigned signatory steps on this application."
                                  : application.current_user_signatory_status === "signed"
                                ? "You already signed this application."
                                : application.application_status === "under_review"
                                  ? "Open the answered form to review it and record your decision."
                                  : "Waiting for GSRO to finish all answers before signing."}
                            </span>
                          ) : isGsroScope ? (
                            <span className="flex items-center gap-2">
                              <ClipboardCheck
                                className="h-4 w-4 text-pup-maroon"
                                aria-hidden="true"
                              />
                              {application.application_status === "withdrawn"
                                ? "The applicant withdrew this application. It is now read-only in the GSRO queue."
                                : "GSRO assigns signatories and completes the review here."}
                            </span>
                          ) : (
                            <span className="flex items-center gap-2">
                              <ShieldCheck
                                className="h-4 w-4 text-pup-maroon"
                                aria-hidden="true"
                              />
                              Signatory decisions happen after GSRO review.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !isLoading && !pageError ? (
              <div className="rounded-lg border border-dashed bg-muted-100/20 px-4 py-8 text-center text-sm text-muted-foreground">
                {applications.length
                  ? "No applications match your current search or status filter."
                  : "No applications are available for your current role yet."}
              </div>
            ) : null}

            {applications.length && !pageError ? (
              <div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing page {safeCurrentPage} of {totalPages} (
                  {filteredApplications.length} applications)
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={safeCurrentPage <= 1 || isLoading}
                    onClick={goToPreviousPage}
                  >
                    <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={safeCurrentPage >= totalPages || isLoading}
                    onClick={goToNextPage}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
