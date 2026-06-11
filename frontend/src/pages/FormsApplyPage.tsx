import {
  AlertCircle,
  ArrowLeft,
  ClipboardCheck,
  SendHorizontal
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createFormApplication,
  fetchFormApplicationTemplate,
  type FormApplicationTemplate
} from "@/lib/api";

type ValidationErrors = {
  googleDriveLink?: string;
  researchTitle?: string;
};

const GOOGLE_DRIVE_HOSTS = new Set([
  "docs.google.com",
  "drive.google.com",
  "drive.usercontent.google.com"
]);

const validateApplicationDetails = (
  googleDriveLink: string,
  researchTitle: string
): ValidationErrors => {
  const errors: ValidationErrors = {};

  if (!researchTitle.trim()) {
    errors.researchTitle = "Research Title is required.";
  }

  if (!googleDriveLink.trim()) {
    errors.googleDriveLink = "Thesis Google Drive Link is required.";
  } else {
    try {
      const parsedUrl = new URL(googleDriveLink.trim());

      if (
        !["http:", "https:"].includes(parsedUrl.protocol) ||
        !GOOGLE_DRIVE_HOSTS.has(parsedUrl.hostname.toLowerCase())
      ) {
        errors.googleDriveLink = "Enter a valid Google Drive link for the thesis.";
      }
    } catch {
      errors.googleDriveLink = "Enter a valid Google Drive link for the thesis.";
    }
  }

  return errors;
};

const hasValidationErrors = (validationErrors: ValidationErrors) => {
  return Boolean(
    validationErrors.googleDriveLink || validationErrors.researchTitle
  );
};

export default function FormsApplyPage() {
  const { formId } = useParams<{ formId: string }>();
  const { token, user } = useAuth();
  const { success } = useToast();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<FormApplicationTemplate | null>(null);
  const [googleDriveLink, setGoogleDriveLink] = useState("");
  const [researchTitle, setResearchTitle] = useState("");
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [pageError, setPageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTemplate = async () => {
      if (!token || !formId) {
        if (isMounted) {
          setPageError("You must be signed in to apply for a form.");
          setIsLoading(false);
        }
        return;
      }

      try {
        setIsLoading(true);
        const result = await fetchFormApplicationTemplate(token, formId);

        if (!isMounted) {
          return;
        }

        setTemplate(result);
        setGoogleDriveLink("");
        setResearchTitle("");
        setValidationErrors({});
        setPageError("");
        setSubmitError("");
      } catch (error) {
        if (isMounted) {
          setPageError(
            error instanceof Error
              ? error.message
              : "Failed to load the form application."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, [formId, token]);

  const updateGoogleDriveLink = (value: string) => {
    setGoogleDriveLink(value);
    setValidationErrors((currentErrors) => ({
      ...currentErrors,
      googleDriveLink: undefined
    }));
    setSubmitError("");
  };

  const updateResearchTitle = (value: string) => {
    setResearchTitle(value);
    setValidationErrors((currentErrors) => ({
      ...currentErrors,
      researchTitle: undefined
    }));
    setSubmitError("");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || !template) {
      setSubmitError("You must be signed in to submit an application.");
      return;
    }

    const nextValidationErrors = validateApplicationDetails(
      googleDriveLink,
      researchTitle
    );

    setValidationErrors(nextValidationErrors);

    if (hasValidationErrors(nextValidationErrors)) {
      setSubmitError("Complete the required application details before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      await createFormApplication(token, template.form.form_id, {
        googleDriveLink: googleDriveLink.trim(),
        researchTitle: researchTitle.trim()
      });
      success(
        "The application has been started. GSRO can now assign signatories and complete the form review.",
        "Application Started"
      );
      navigate("/forms/apply", { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : "Failed to submit the form application."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <LoadingModal
        open={isLoading || isSubmitting}
        title={isSubmitting ? "Starting application" : "Loading application form"}
        description={
          isSubmitting
            ? "We are saving the application details for GSRO review."
            : "We are preparing the application details step."
        }
      />

      <PageContainer className="pb-10">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader
            eyebrow="Forms"
            title={template?.form.form_name || "Apply for form"}
            description={
              template?.form.description ||
              "Provide the research title and thesis link so GSRO can review the application and assign the signatories."
            }
          />

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate("/forms/apply")}
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Forms
          </Button>
        </div>

        {pageError && !template ? (
          <Card className="mt-8 border-destructive/30">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                <p className="font-semibold">Unable to load this form.</p>
              </div>
              <p className="text-sm text-muted-foreground">{pageError}</p>
            </CardContent>
          </Card>
        ) : null}

        {template ? (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <Card className="border-pup-maroon/15">
              <CardHeader>
                <CardTitle>Application Details</CardTitle>
                <CardDescription>
                  Enter the research title and thesis link. GSRO will handle the
                  signatory assignments after the application is started.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="research-title">Research Title</Label>
                  <Input
                    id="research-title"
                    value={researchTitle}
                    onChange={(event) => updateResearchTitle(event.target.value)}
                    placeholder="Enter the research title"
                  />
                  {validationErrors.researchTitle ? (
                    <p className="text-xs font-medium text-destructive">
                      {validationErrors.researchTitle}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="thesis-google-drive-link">
                    Thesis Google Drive Link
                  </Label>
                  <Input
                    id="thesis-google-drive-link"
                    type="url"
                    value={googleDriveLink}
                    onChange={(event) => updateGoogleDriveLink(event.target.value)}
                    placeholder="https://drive.google.com/..."
                  />
                  <p className="text-xs text-muted-foreground">
                    Share the thesis file or document link here so the Ethics
                    Clearance Office can review it.
                  </p>
                  {validationErrors.googleDriveLink ? (
                    <p className="text-xs font-medium text-destructive">
                      {validationErrors.googleDriveLink}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            {submitError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                {submitError}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 rounded-lg border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-full bg-pup-maroon/10 p-2 text-pup-maroon">
                  <ClipboardCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    Applicant
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {user
                      ? [user.firstname, user.middlename, user.lastname]
                          .filter(Boolean)
                          .join(" ")
                      : "Signed-in user"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    This step only starts the application. GSRO will assign the
                    signatories and continue the review afterward.
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting || isLoading}>
                <SendHorizontal className="h-4 w-4" aria-hidden="true" />
                {isSubmitting ? "Starting..." : "Start Application"}
              </Button>
            </div>
          </form>
        ) : null}
      </PageContainer>
    </>
  );
}
