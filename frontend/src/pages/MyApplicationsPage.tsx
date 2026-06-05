import { ClipboardCheck, Download, Eye } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  downloadApplicationCertificate,
  fetchMyApplications,
  type FormApplicationSummary
} from "@/lib/api";

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

  return status.replace(/_/g, " ");
};

const canStillEditSignatories = (application: FormApplicationSummary) => {
  if (["approved", "cancelled", "rejected"].includes(application.application_status)) {
    return false;
  }

  return application.signed_signatory_count === 0;
};

export default function MyApplicationsPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<FormApplicationSummary[]>([]);
  const [downloadingApplicationId, setDownloadingApplicationId] = useState<string | null>(
    null
  );
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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

  const handleDownloadCertificate = async (application: FormApplicationSummary) => {
    if (!token) {
      return;
    }

    try {
      setDownloadingApplicationId(application.application_id);
      setPageError("");

      const { blob, filename } = await downloadApplicationCertificate(
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
          : "Failed to download the ethics certificate."
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
          description="Review every application you have started, whether it is still pending or already complete. Pending applications can still have their signatories updated before approvals begin."
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
            {pageError ? (
              <p className="text-sm font-medium text-destructive">{pageError}</p>
            ) : null}

            {applications.length ? (
              <div className="space-y-4">
                {applications.map((application) => (
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
                            onClick={() => handleDownloadCertificate(application)}
                          >
                            <Download className="h-4 w-4" aria-hidden="true" />
                            {downloadingApplicationId === application.application_id
                              ? "Downloading..."
                              : "Download Certificate"}
                          </Button>
                        ) : null}
                        <div className="rounded-md bg-muted-100/60 px-3 py-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-2">
                            <ClipboardCheck
                              className="h-4 w-4 text-pup-maroon"
                              aria-hidden="true"
                            />
                            {canStillEditSignatories(application)
                              ? "You can still edit signatories while this stays pending."
                              : "Signatory assignments are now locked for this application."}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : !isLoading && !pageError ? (
              <div className="rounded-lg border border-dashed bg-muted-100/20 px-4 py-8 text-center text-sm text-muted-foreground">
                You have not started any applications yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
