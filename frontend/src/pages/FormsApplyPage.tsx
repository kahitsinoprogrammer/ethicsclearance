import {
  AlertCircle,
  ArrowLeft,
  ClipboardCheck,
  SendHorizontal,
  UserRoundCheck
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
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createFormApplication,
  fetchFormApplicationTemplate,
  type FormApplicationTemplate,
  type ReviewerUserRecord
} from "@/lib/api";

type ValidationErrors = {
  googleDriveLink?: string;
  researchTitle?: string;
  signatories: Record<string, string>;
};

const GOOGLE_DRIVE_HOSTS = new Set([
  "docs.google.com",
  "drive.google.com",
  "drive.usercontent.google.com"
]);

const buildReviewerLabel = (reviewer: ReviewerUserRecord) => {
  return reviewer.display_name || reviewer.email;
};

const buildReviewerItems = (reviewers: ReviewerUserRecord[]): ComboboxItem[] => {
  return reviewers.map((reviewer) => ({
    label: buildReviewerLabel(reviewer),
    searchText: [
      reviewer.display_name,
      reviewer.email,
      reviewer.program,
      reviewer.username,
      reviewer.user_type
    ]
      .filter(Boolean)
      .join(" "),
    value: reviewer.user_id
  }));
};

const buildInitialSignatorySelections = (template: FormApplicationTemplate) => {
  const selections: Record<string, string> = {};

  template.form.signatories.forEach((signatory) => {
    selections[signatory.signatory_id] = "";
  });

  return selections;
};

const validateSignatories = (
  template: FormApplicationTemplate,
  googleDriveLink: string,
  researchTitle: string,
  signatorySelections: Record<string, string>
): ValidationErrors => {
  const errors: ValidationErrors = {
    signatories: {}
  };

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

  template.form.signatories.forEach((signatory) => {
    if (signatory.is_required && !signatorySelections[signatory.signatory_id]) {
      errors.signatories[signatory.signatory_id] =
        "Select a PROGRAM_REVIEWER user for this signatory.";
    }
  });

  return errors;
};

const hasValidationErrors = (validationErrors: ValidationErrors) => {
  return Boolean(
    validationErrors.googleDriveLink ||
    validationErrors.researchTitle ||
      Object.keys(validationErrors.signatories).length > 0
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
  const [signatorySelections, setSignatorySelections] = useState<
    Record<string, string>
  >({});
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    signatories: {}
  });
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
        setSignatorySelections(buildInitialSignatorySelections(result));
        setValidationErrors({
          signatories: {}
        });
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

  const reviewerItems = template ? buildReviewerItems(template.reviewers) : [];

  const updateSignatorySelection = (signatoryId: string, signerUserId: string) => {
    setSignatorySelections((currentSelections) => ({
      ...currentSelections,
      [signatoryId]: signerUserId
    }));
    setValidationErrors((currentErrors) => {
      const nextErrors = { ...currentErrors.signatories };
      delete nextErrors[signatoryId];

      return {
        ...currentErrors,
        signatories: nextErrors
      };
    });
    setSubmitError("");
  };

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

    const nextValidationErrors = validateSignatories(
      template,
      googleDriveLink,
      researchTitle,
      signatorySelections
    );

    setValidationErrors(nextValidationErrors);

    if (hasValidationErrors(nextValidationErrors)) {
      setSubmitError(
        "Complete the required application details and signatory selections before submitting."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError("");
      await createFormApplication(token, template.form.form_id, {
        googleDriveLink: googleDriveLink.trim(),
        researchTitle: researchTitle.trim(),
        signatories: template.form.signatories.map((signatory) => ({
          signatoryId: signatory.signatory_id,
          signerUserId: signatorySelections[signatory.signatory_id] || undefined
        }))
      });
      success(
        "The application has been started. GSRO can now complete the form answers before signatory approval begins.",
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
            ? "We are saving the signatory selections for this applicant."
            : "We are preparing the signatory assignment step."
        }
      />

      <PageContainer className="pb-10">
        <div className="flex items-center justify-between gap-3">
          <SectionHeader
            eyebrow="Forms"
            title={template?.form.form_name || "Apply for form"}
            description={
              template?.form.description ||
              "Choose the required signatories. The GSRO officer will answer the form questions after the application is started."
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
                <CardTitle>Research Title</CardTitle>
                <CardDescription>
                  Provide the research title for this application before assigning its signatories.
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
                    Share the thesis file or document link here so the Ethics Clearance Office can review it.
                  </p>
                  {validationErrors.googleDriveLink ? (
                    <p className="text-xs font-medium text-destructive">
                      {validationErrors.googleDriveLink}
                    </p>
                  ) : null}
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-visible border-pup-maroon/15">
              <CardHeader className="rounded-t-lg bg-[#fff7ef]">
                <CardTitle className="flex items-center gap-2 text-ink-900">
                  <UserRoundCheck
                    className="h-5 w-5 text-pup-maroon"
                    aria-hidden="true"
                  />
                  Reviewer Signatories
                </CardTitle>
                <CardDescription>
                  The applicant selects the reviewer signatories here. After this
                  step, the GSRO officer will complete the question answers and
                  then the selected signatories will approve the application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {!template.reviewers.length ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    No active PROGRAM_REVIEWER users are available right now, so
                    this application cannot be started until one is assigned.
                  </div>
                ) : null}

                {template.form.signatories.length ? (
                  template.form.signatories.map((signatory, signatoryIndex) => {
                    const selectedReviewer =
                      template.reviewers.find(
                        (reviewer) =>
                          reviewer.user_id ===
                          signatorySelections[signatory.signatory_id]
                      ) || null;
                    const signatoryError =
                      validationErrors.signatories[signatory.signatory_id];

                    return (
                      <div
                        key={signatory.signatory_id}
                        className="rounded-lg border bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
                          <div>
                            <p className="text-sm font-semibold text-ink-900">
                              Signatory {signatoryIndex + 1}:{" "}
                              {signatory.position_name}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {signatory.description ||
                                "Assign the reviewer who should approve this stage."}
                            </p>
                            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-pup-maroon">
                              {signatory.is_required ? "Required" : "Optional"}
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Select reviewer</Label>
                            <Combobox
                              items={reviewerItems}
                              placeholder="Choose a PROGRAM_REVIEWER"
                              searchPlaceholder="Search reviewer"
                              value={
                                signatorySelections[signatory.signatory_id] || ""
                              }
                              onValueChange={(value) =>
                                updateSignatorySelection(
                                  signatory.signatory_id,
                                  value
                                )
                              }
                            />
                            {signatoryError ? (
                              <p className="text-xs font-medium text-destructive">
                                {signatoryError}
                              </p>
                            ) : null}
                            {selectedReviewer ? (
                              <p className="text-xs text-muted-foreground">
                                {buildReviewerLabel(selectedReviewer)}
                                {selectedReviewer.program
                                  ? ` | ${selectedReviewer.program}`
                                  : ""}
                                {selectedReviewer.email
                                  ? ` | ${selectedReviewer.email}`
                                  : ""}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-md border border-dashed bg-muted-100/20 px-4 py-4 text-sm text-muted-foreground">
                    This form does not currently require signatories.
                  </div>
                )}
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
                    This step only starts the application and assigns its
                    signatories.
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
