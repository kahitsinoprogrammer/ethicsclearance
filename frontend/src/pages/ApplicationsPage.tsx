import { ClipboardCheck, Eye, ShieldCheck } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchApplications,
  fetchApplicationsForSignature,
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

export default function ApplicationsPage() {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<FormApplicationSummary[]>([]);
  const [scope, setScope] = useState("");
  const [pageError, setPageError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
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
    : ["GSREC_GSREO_OFFICER", "GSRO_OFFICER", "GSRO"].some((roleCode) =>
        user?.role_codes?.includes(roleCode)
      ));

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
              ? "See every application where you are the assigned signatory and mark it as signed after GSRO has completed all answers."
              : isGsroScope
              ? "Review submitted applications, complete the form answers, and move them forward for signatory approval."
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
                              {application.current_user_pending_signatory_count > 0
                                ? "Open the answered form to review it and mark the remaining signature steps as signed."
                                : application.current_user_signed_signatory_count > 0
                                  ? "You already signed your assigned signatory steps on this application."
                                  : application.current_user_signatory_status === "signed"
                                ? "You already signed this application."
                                : application.application_status === "under_review"
                                  ? "Open the answered form to review it and mark it as signed."
                                  : "Waiting for GSRO to finish all answers before signing."}
                            </span>
                          ) : isGsroScope ? (
                            <span className="flex items-center gap-2">
                              <ClipboardCheck
                                className="h-4 w-4 text-pup-maroon"
                                aria-hidden="true"
                              />
                              GSRO completes answers first.
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
                No applications are available for your current role yet.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </PageContainer>
    </>
  );
}
