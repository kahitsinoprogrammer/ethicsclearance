import {
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Eye,
  Filter,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

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
  downloadApplicationReport,
  fetchMyApplications,
  type FormApplicationSummary
} from "@/lib/api";

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

const getApplicantWorkflowNote = (application: FormApplicationSummary) => {
  if (application.application_status === "submitted") {
    return "GSRO will assign the signatories and complete the review.";
  }

  if (application.application_status === "under_review") {
    return "GSRO has finished the answers and the assigned signatories are now reviewing the application.";
  }

  if (application.application_status === "withdrawn") {
    return "You withdrew this application, so no further review or signatory action will happen.";
  }

  return "Signatory assignments for this application are managed by GSRO.";
};

export default function MyApplicationsPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<FormApplicationSummary[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [downloadingApplicationId, setDownloadingApplicationId] = useState<string | null>(
    null
  );
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const pageSize = 5;

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
        const result = await fetchMyApplications(token);

        if (!isMounted) {
          return;
        }

        setApplications(result.applications);
        setPageError("");
      } catch (error) {
        if (isMounted) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load your applications."
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
  }, [token]);

  const normalizedAppliedSearch = appliedSearch.trim().toLowerCase();
  const filteredApplications = applications.filter((application) => {
    const matchesSearch = !normalizedAppliedSearch
      ? true
      : [
          application.form_name_snapshot,
          application.reference_no,
          application.research_title
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

  const handleDownloadReport = async (application: FormApplicationSummary) => {
    if (!token) {
      return;
    }

    try {
      setDownloadingApplicationId(application.application_id);
      setPageError("");

      const { blob, filename } = await downloadApplicationReport(
        token,
        application.application_id
      );
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 0);
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to download the report."
      );
    } finally {
      setDownloadingApplicationId(null);
    }
  };

  return (
    <>
      <LoadingModal
        open={isLoading}
        title="Loading my applications"
        description="We are preparing the applications you have started."
      />

      <PageContainer>
        <SectionHeader
          eyebrow="Applications"
          title="My Applications"
          description="Review every application you have started, whether it is still pending or already complete. GSRO manages the signatory assignments after you submit the application."
        />

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Started applications</CardTitle>
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
                  placeholder="Search form, reference no., or title"
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
                    <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:items-start">
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
                        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                          <span>Answers saved: {application.answer_count}</span>
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
                            navigate(`/applications/my/${application.application_id}`, {
                              state: { backTo: "/applications/my" }
                            })
                          }
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          Open Application
                        </Button>
                        {application.application_status === "approved" ? (
                          <Button
                            type="button"
                            variant="outline"
                            disabled={downloadingApplicationId === application.application_id}
                            onClick={() => handleDownloadReport(application)}
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            {downloadingApplicationId === application.application_id
                              ? "Downloading..."
                              : "Download Report"}
                          </Button>
                        ) : null}
                        <div className="rounded-md bg-muted-100/60 px-3 py-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <ClipboardCheck
                              className="h-4 w-4 text-pup-maroon"
                              aria-hidden="true"
                            />
                            {getApplicantWorkflowNote(application)}
                          </span>
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
                  : "You have not started any applications yet."}
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
