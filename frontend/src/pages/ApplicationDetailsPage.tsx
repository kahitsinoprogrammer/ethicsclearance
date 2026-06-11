import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Save,
  ShieldCheck
} from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  approveApplicationSignatory,
  fetchApplicationDetails,
  rejectApplicationSignatory,
  updateApplicationSignatories,
  updateApplicationAnswers,
  withdrawApplication,
  type ApplicationSignatoryRecord,
  type ApplicationQuestionCommentRecord,
  type FormApplicationDetails,
  type FormApplicationQuestionSnapshot,
  type ReviewerUserRecord
} from "@/lib/api";
import { cn } from "@/lib/utils";

type QuestionDraft = {
  answerDate: string;
  answerNumber: string;
  answerText: string;
  commentText: string;
  optionIds: string[];
};

type SignatoryQuestionCommentDrafts = Record<string, Record<string, string>>;
type SignatoryQuestionCommentErrors = Record<string, Record<string, string>>;
type ValidationErrors = Record<string, string>;
type SignatoryValidationErrors = Record<string, string>;
type SignatoryDecisionType = "approve" | "reject";

const questionTypeLabels: Record<string, string> = {
  CHECKBOX: "Checkbox",
  DATE: "Date",
  NUMBER: "Number",
  RADIO: "Radio",
  SELECT: "Dropdown",
  TEXT: "Short text",
  TEXTAREA: "Long text"
};

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

const createQuestionDraft = (question: FormApplicationQuestionSnapshot): QuestionDraft => {
  const answer = question.answer;

  return {
    answerDate: answer?.answer_date || "",
    answerNumber:
      answer?.answer_number === null || answer?.answer_number === undefined
        ? ""
        : String(answer.answer_number),
    answerText: answer?.answer_text || "",
    commentText: answer?.comment_text || "",
    optionIds: (answer?.selected_options || []).map((option) => option.option_id || "")
      .filter(Boolean)
  };
};

const buildDrafts = (details: FormApplicationDetails) => {
  const drafts: Record<string, QuestionDraft> = {};

  details.form.sections.forEach((section) => {
    section.questions.forEach((question) => {
      drafts[question.question_id] = createQuestionDraft(question);
    });
  });

  return drafts;
};

const buildSignatoryQuestionCommentDrafts = (details: FormApplicationDetails) => {
  const drafts: SignatoryQuestionCommentDrafts = {};

  details.form.sections.forEach((section) => {
    section.questions.forEach((question) => {
      question.question_comments.forEach((questionComment) => {
        if (!drafts[questionComment.application_signatory_id]) {
          drafts[questionComment.application_signatory_id] = {};
        }

        drafts[questionComment.application_signatory_id][question.question_id] =
          questionComment.comment_text;
      });
    });
  });

  return drafts;
};

const buildSignatorySelections = (details: FormApplicationDetails) => {
  const selections: Record<string, string> = {};

  details.form.signatories.forEach((signatory) => {
    const assignment = details.signatories.find(
      (applicationSignatory) =>
        applicationSignatory.signatory_id === signatory.signatory_id
    );

    selections[signatory.signatory_id] = assignment?.signer_user_id || "";
  });

  return selections;
};

const getSignatoryStatusLabel = (
  signatoryStatus: string | null | undefined,
  signerUserId: string | null | undefined
) => {
  if (signatoryStatus === "signed") {
    return "Approved";
  }

  if (signatoryStatus === "rejected") {
    return "Revision Requested";
  }

  if (signatoryStatus === "pending" && !signerUserId) {
    return "Unassigned";
  }

  if (signatoryStatus === "pending") {
    return "Pending";
  }

  if (signatoryStatus === "skipped") {
    return "Skipped";
  }

  return "Pending";
};

const getQuestionCommentAuthorLabel = (
  questionComment: ApplicationQuestionCommentRecord
) => {
  const signerName = questionComment.commenter_name || questionComment.commenter_email;

  if (questionComment.position_name_snapshot && signerName) {
    return `${questionComment.position_name_snapshot} | ${signerName}`;
  }

  return (
    questionComment.position_name_snapshot ||
    signerName ||
    "Recorded signatory comment"
  );
};

const getInvalidSignatoryDecisionMessage = (
  decision: SignatoryDecisionType,
  questionCommentCount: number
) => {
  if (decision === "reject" && questionCommentCount === 0) {
    return "Add at least one question comment before requesting revision for this application.";
  }

  return "";
};

const validateSignatorySelections = (
  details: FormApplicationDetails,
  signatorySelections: Record<string, string>
): SignatoryValidationErrors => {
  const errors: SignatoryValidationErrors = {};

  details.form.signatories.forEach((signatory) => {
    if (signatory.is_required && !signatorySelections[signatory.signatory_id]) {
      errors[signatory.signatory_id] =
        "Select a PROGRAM_REVIEWER user for this signatory.";
    }
  });

  return errors;
};

const validateQuestionDrafts = (
  details: FormApplicationDetails,
  drafts: Record<string, QuestionDraft>
): ValidationErrors => {
  const errors: ValidationErrors = {};

  details.form.sections.forEach((section) => {
    section.questions.forEach((question) => {
      const draft = drafts[question.question_id];

      if (!draft) {
        if (question.is_required) {
          errors[question.question_id] = "This question requires an answer.";
        }
        return;
      }

      if (question.question_type === "RADIO" || question.question_type === "SELECT") {
        if (question.is_required && draft.optionIds.length !== 1) {
          errors[question.question_id] = "Select one option.";
        }
        return;
      }

      if (question.question_type === "CHECKBOX") {
        if (question.is_required && draft.optionIds.length === 0) {
          errors[question.question_id] = "Select at least one option.";
        }
        return;
      }

      if (
        question.question_type === "TEXT" ||
        question.question_type === "TEXTAREA"
      ) {
        if (question.is_required && !draft.answerText.trim()) {
          errors[question.question_id] = "This question requires an answer.";
        }
        return;
      }

      if (question.question_type === "NUMBER") {
        if (!draft.answerNumber.trim()) {
          if (question.is_required) {
            errors[question.question_id] = "Enter a valid number.";
          }
          return;
        }

        if (!Number.isFinite(Number(draft.answerNumber))) {
          errors[question.question_id] = "Enter a valid number.";
        }
        return;
      }

      if (question.question_type === "DATE" && question.is_required && !draft.answerDate) {
        errors[question.question_id] = "Choose a date.";
      }
    });
  });

  return errors;
};

export default function ApplicationDetailsPage() {
  const { applicationId } = useParams<{ applicationId: string }>();
  const { token, user } = useAuth();
  const { success } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [details, setDetails] = useState<FormApplicationDetails | null>(null);
  const [drafts, setDrafts] = useState<Record<string, QuestionDraft>>({});
  const [questionErrors, setQuestionErrors] = useState<ValidationErrors>({});
  const [signatorySelections, setSignatorySelections] = useState<
    Record<string, string>
  >({});
  const [signatoryQuestionCommentDrafts, setSignatoryQuestionCommentDrafts] =
    useState<SignatoryQuestionCommentDrafts>({});
  const [signatoryQuestionCommentErrors, setSignatoryQuestionCommentErrors] =
    useState<SignatoryQuestionCommentErrors>({});
  const [signatoryErrors, setSignatoryErrors] = useState<SignatoryValidationErrors>(
    {}
  );
  const [pageError, setPageError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingAnswers, setIsSavingAnswers] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [activeSignatoryId, setActiveSignatoryId] = useState("");
  const [savingDecision, setSavingDecision] = useState<{
    applicationSignatoryId: string;
    decision: SignatoryDecisionType;
  } | null>(null);
  const [isRevisionMode, setIsRevisionMode] = useState(false);
  const isApplicantRoute = location.pathname.startsWith("/applications/my/");
  const isSignatureRoute = location.pathname.startsWith(
    "/applications/for-signature/"
  );

  const loadDetails = async () => {
    if (!token || !applicationId) {
      setPageError("You must be signed in to view this application.");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const result = await fetchApplicationDetails(token, applicationId);
      const nextAssignedPendingSignatory =
        result.signatories.find(
          (signatory) =>
            signatory.signer_user_id === user?.user_id &&
            signatory.signatory_status === "pending"
        ) || null;

      setDetails(result);
      setDrafts(buildDrafts(result));
      setQuestionErrors({});
      setSignatorySelections(buildSignatorySelections(result));
      setSignatoryQuestionCommentDrafts(buildSignatoryQuestionCommentDrafts(result));
      setSignatoryQuestionCommentErrors({});
      setSignatoryErrors({});
      setActiveSignatoryId(
        nextAssignedPendingSignatory?.application_signatory_id || ""
      );
      setIsRevisionMode(false);
      setPageError("");
      setSubmitError("");
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to load application details."
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [applicationId, token, user?.user_id]);

  const assignedActionableSignatories = useMemo(() => {
    if (!details || !user) {
      return [];
    }

    return details.signatories.filter(
      (signatory) =>
        signatory.signer_user_id === user.user_id &&
        ((details.application_status === "under_review" &&
          signatory.signatory_status === "pending") ||
          (["submitted", "under_review"].includes(details.application_status) &&
            signatory.signatory_status === "rejected"))
    );
  }, [details, user]);

  const assignedActionableSignatoryIds = useMemo(
    () =>
      new Set(
        assignedActionableSignatories.map(
          (signatory) => signatory.application_signatory_id
        )
      ),
    [assignedActionableSignatories]
  );
  const activePendingSignatory = useMemo(() => {
    if (!assignedActionableSignatories.length) {
      return null;
    }

    return (
      assignedActionableSignatories.find(
        (signatory) =>
          signatory.application_signatory_id === activeSignatoryId
      ) || assignedActionableSignatories[0]
    );
  }, [activeSignatoryId, assignedActionableSignatories]);

  const canApproveAsSignatory = Boolean(
    isSignatureRoute &&
      details?.current_user_permissions.can_approve &&
      assignedActionableSignatories.length
  );
  const isReopenedRejectedSignatory =
    activePendingSignatory?.signatory_status === "rejected";

  useEffect(() => {
    setIsRevisionMode(false);
  }, [activePendingSignatory?.application_signatory_id]);

  useEffect(() => {
    if (!assignedActionableSignatories.length) {
      if (activeSignatoryId) {
        setActiveSignatoryId("");
      }
      return;
    }

    if (
      !activeSignatoryId ||
      !assignedActionableSignatoryIds.has(activeSignatoryId)
    ) {
      setActiveSignatoryId(
        assignedActionableSignatories[0].application_signatory_id
      );
    }
  }, [
    activeSignatoryId,
    assignedActionableSignatories,
    assignedActionableSignatoryIds
  ]);

  const isActionablePendingSignatory = (signatory: ApplicationSignatoryRecord) => {
    return (
      canApproveAsSignatory &&
      assignedActionableSignatoryIds.has(signatory.application_signatory_id)
    );
  };

  const canEditAnswers = Boolean(
    !isApplicantRoute &&
      !isSignatureRoute &&
      details?.current_user_permissions.can_answer &&
      details.application_status !== "approved" &&
      details.application_status !== "rejected" &&
      details.application_status !== "withdrawn"
  );
  const canEditSignatories = Boolean(
    !isSignatureRoute && details?.current_user_permissions.can_edit_signatories
  );
  const canWithdrawApplication = Boolean(
    details?.current_user_permissions.can_withdraw
  );
  const shouldSaveSignatoriesWithGsroSettings = Boolean(
    canEditSignatories && details?.reviewers.length
  );
  const canSaveGsroSettings = Boolean(
    canEditAnswers || shouldSaveSignatoriesWithGsroSettings
  );
  const gsroSaveButtonLabel = canEditSignatories
    ? "Save Settings"
    : "Save GSRO Answers";
  const reviewerItems = details ? buildReviewerItems(details.reviewers) : [];
  const backTo =
    typeof location.state === "object" &&
    location.state !== null &&
    "backTo" in location.state &&
    typeof (location.state as { backTo?: unknown }).backTo === "string"
      ? (location.state as { backTo: string }).backTo
      : isApplicantRoute || details?.current_user_permissions.is_applicant
        ? "/applications/my"
        : isSignatureRoute
          ? "/applications/for-signature"
        : "/applications";
  const backLabel =
    backTo === "/applications/my"
      ? "Back to My Applications"
      : backTo === "/applications/for-signature"
        ? "Back to For Signature"
      : "Back to Applications";

  const updateDraft = (
    questionId: string,
    updater: (currentDraft: QuestionDraft) => QuestionDraft
  ) => {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [questionId]: updater(
        currentDrafts[questionId] || {
          answerDate: "",
          answerNumber: "",
          answerText: "",
          commentText: "",
          optionIds: []
        }
      )
    }));
    setQuestionErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[questionId];
      return nextErrors;
    });
    setSubmitError("");
  };

  const updateSignatoryQuestionComment = (
    applicationSignatoryId: string,
    questionId: string,
    commentText: string
  ) => {
    setSignatoryQuestionCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [applicationSignatoryId]: {
        ...(currentDrafts[applicationSignatoryId] || {}),
        [questionId]: commentText
      }
    }));
    setSignatoryQuestionCommentErrors((currentErrors) => {
      if (!currentErrors[applicationSignatoryId]?.[questionId]) {
        return currentErrors;
      }

      const nextSignatoryErrors = {
        ...currentErrors[applicationSignatoryId]
      };
      delete nextSignatoryErrors[questionId];

      const nextErrors = { ...currentErrors };
      if (Object.keys(nextSignatoryErrors).length === 0) {
        delete nextErrors[applicationSignatoryId];
      } else {
        nextErrors[applicationSignatoryId] = nextSignatoryErrors;
      }

      return nextErrors;
    });
    setSubmitError("");
  };

  const updateSignatorySelection = (signatoryId: string, signerUserId: string) => {
    setSignatorySelections((currentSelections) => ({
      ...currentSelections,
      [signatoryId]: signerUserId
    }));
    setSignatoryErrors((currentErrors) => {
      const nextErrors = { ...currentErrors };
      delete nextErrors[signatoryId];
      return nextErrors;
    });
    setSubmitError("");
  };

  const buildSignatoryDecisionQuestionComments = (
    applicationSignatoryId: string
  ) => {
    if (!details) {
      return [];
    }

    return details.form.sections.flatMap((section) =>
      section.questions.flatMap((question) => {
        const commentText =
          signatoryQuestionCommentDrafts[applicationSignatoryId]?.[
            question.question_id
          ]?.trim() || "";

        if (!commentText) {
          return [];
        }

        return [
          {
            commentText,
            questionId: question.question_id
          }
        ];
      })
    );
  };

  const clearSignatoryQuestionCommentErrors = (
    applicationSignatoryId: string
  ) => {
    setSignatoryQuestionCommentErrors((currentErrors) => {
      if (!currentErrors[applicationSignatoryId]) {
        return currentErrors;
      }

      const nextErrors = { ...currentErrors };
      delete nextErrors[applicationSignatoryId];
      return nextErrors;
    });
  };

  const handleSaveGsroSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!token || !details) {
      return;
    }

    if (canEditAnswers) {
      const nextErrors = validateQuestionDrafts(details, drafts);
      setQuestionErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        setSubmitError("Complete the required GSRO answers before saving.");
        return;
      }
    }

    if (shouldSaveSignatoriesWithGsroSettings) {
      const nextErrors = validateSignatorySelections(details, signatorySelections);
      setSignatoryErrors(nextErrors);

      if (Object.keys(nextErrors).length > 0) {
        setSubmitError(
          "Complete the required signatory assignments before saving."
        );
        return;
      }
    }

    try {
      setIsSavingAnswers(true);
      setSubmitError("");

      if (shouldSaveSignatoriesWithGsroSettings) {
        await updateApplicationSignatories(token, details.application_id, {
          signatories: details.form.signatories.map((signatory) => ({
            signatoryId: signatory.signatory_id,
            signerUserId: signatorySelections[signatory.signatory_id] || undefined
          }))
        });
      }

      if (canEditAnswers) {
        await updateApplicationAnswers(token, details.application_id, {
          answers: details.form.sections.flatMap((section) =>
            section.questions.map((question) => {
              const draft = drafts[question.question_id];

              return {
                answerDate: draft.answerDate || undefined,
                answerNumber: draft.answerNumber
                  ? Number(draft.answerNumber)
                  : undefined,
                answerText: draft.answerText.trim() || undefined,
                commentText: draft.commentText.trim() || undefined,
                optionIds: draft.optionIds.length ? draft.optionIds : undefined,
                questionId: question.question_id
              };
            })
          )
        });
      }

      if (canEditAnswers && shouldSaveSignatoriesWithGsroSettings) {
        success(
          "GSRO answers and signatory assignments saved successfully. The application is now ready for signatory approval.",
          "Settings Saved"
        );
      } else if (canEditAnswers) {
        success(
          "GSRO answers saved successfully. The application is now ready for signatory approval.",
          "Answers Saved"
        );
      } else if (shouldSaveSignatoriesWithGsroSettings) {
        success(
          "The signatory assignments have been updated.",
          "Signatories Updated"
        );
      }

      await loadDetails();
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Failed to save settings."
      );
    } finally {
      setIsSavingAnswers(false);
    }
  };

  const handleWithdrawApplication = async () => {
    if (!token || !details || !canWithdrawApplication) {
      return;
    }

    const shouldWithdraw = window.confirm(
      "Withdraw this application? It will become read-only and no further review or signature action will happen."
    );

    if (!shouldWithdraw) {
      return;
    }

    try {
      setIsWithdrawing(true);
      setPageError("");
      setSubmitError("");

      await withdrawApplication(token, details.application_id);
      success("Your application has been withdrawn.", "Application Withdrawn");
      await loadDetails();
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : "Failed to withdraw this application."
      );
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleSubmitSignatoryDecision = async (
    applicationSignatoryId: string,
    decision: SignatoryDecisionType
  ) => {
    if (!token || !details) {
      return;
    }

    const questionComments =
      decision === "reject" || isRevisionMode
        ? buildSignatoryDecisionQuestionComments(applicationSignatoryId)
        : [];
    const targetSignatory = details.signatories.find(
      (signatory) =>
        signatory.application_signatory_id === applicationSignatoryId
    );

    if (decision === "approve" && isRevisionMode && questionComments.length > 0) {
      setSignatoryQuestionCommentErrors((currentErrors) => ({
        ...currentErrors,
        [applicationSignatoryId]: Object.fromEntries(
          questionComments.map((questionComment) => [
            questionComment.questionId,
            "Clear this comment before approving."
          ])
        )
      }));
      setSubmitError("Clear all question comments before approving this application.");
      setActiveSignatoryId(applicationSignatoryId);
      setIsRevisionMode(true);
      return;
    }

    const invalidDecisionMessage = getInvalidSignatoryDecisionMessage(
      decision,
      decision === "reject" ? questionComments.length : 0
    );

    if (invalidDecisionMessage) {
      setSubmitError(invalidDecisionMessage);
      setActiveSignatoryId(applicationSignatoryId);
      setIsRevisionMode(true);
      return;
    }

    try {
      setSavingDecision({
        applicationSignatoryId,
        decision
      });
      clearSignatoryQuestionCommentErrors(applicationSignatoryId);
      setSubmitError("");
      setActiveSignatoryId(applicationSignatoryId);

      if (decision === "approve") {
        await approveApplicationSignatory(
          token,
          details.application_id,
          applicationSignatoryId
        );
        success("Your signature has been recorded.", "Application Signed");
      } else {
        await rejectApplicationSignatory(
          token,
          details.application_id,
          applicationSignatoryId,
          {
            questionComments
          }
        );
        success(
          "Your revision request has been recorded.",
          "Revision Requested"
        );
      }

      await loadDetails();
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : decision === "approve"
            ? "Failed to save signature."
            : "Failed to request revision for this application."
      );
    } finally {
      setSavingDecision(null);
    }
  };

  const renderEditableInput = (question: FormApplicationQuestionSnapshot) => {
    const draft = drafts[question.question_id];
    const questionError = questionErrors[question.question_id];

    if (question.question_type === "TEXT") {
      return (
        <Input
          value={draft.answerText}
          onChange={(event) =>
            updateDraft(question.question_id, (currentDraft) => ({
              ...currentDraft,
              answerText: event.target.value
            }))
          }
          className={cn(
            questionError
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : undefined
          )}
          placeholder="Type the GSRO answer"
        />
      );
    }

    if (question.question_type === "TEXTAREA") {
      return (
        <Textarea
          value={draft.answerText}
          onChange={(event) =>
            updateDraft(question.question_id, (currentDraft) => ({
              ...currentDraft,
              answerText: event.target.value
            }))
          }
          className={cn(
            questionError
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : undefined
          )}
          placeholder="Write the GSRO answer"
        />
      );
    }

    if (question.question_type === "NUMBER") {
      return (
        <Input
          type="number"
          value={draft.answerNumber}
          onChange={(event) =>
            updateDraft(question.question_id, (currentDraft) => ({
              ...currentDraft,
              answerNumber: event.target.value
            }))
          }
          className={cn(
            questionError
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : undefined
          )}
        />
      );
    }

    if (question.question_type === "DATE") {
      return (
        <Input
          type="date"
          value={draft.answerDate}
          onChange={(event) =>
            updateDraft(question.question_id, (currentDraft) => ({
              ...currentDraft,
              answerDate: event.target.value
            }))
          }
          className={cn(
            questionError
              ? "border-destructive focus:border-destructive focus:ring-destructive/20"
              : undefined
          )}
        />
      );
    }

    if (question.question_type === "SELECT") {
      const optionItems: ComboboxItem[] = question.options.map((option) => ({
        label: option.option_label,
        searchText: `${option.option_label} ${option.option_value}`,
        value: option.option_id
      }));

      return (
        <Combobox
          items={optionItems}
          placeholder="Select an option"
          searchPlaceholder="Search options"
          value={draft.optionIds[0] || ""}
          onValueChange={(value) =>
            updateDraft(question.question_id, (currentDraft) => ({
              ...currentDraft,
              optionIds: value ? [value] : []
            }))
          }
        />
      );
    }

    if (question.question_type === "RADIO" || question.question_type === "CHECKBOX") {
      return (
        <div className="space-y-2">
          {question.options.map((option) => {
            const isChecked = draft.optionIds.includes(option.option_id);
            const inputType = question.question_type === "RADIO" ? "radio" : "checkbox";

            return (
              <label
                key={option.option_id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-sm",
                  isChecked
                    ? "border-pup-maroon bg-pup-maroon/5"
                    : "border-border hover:bg-muted-100/50"
                )}
              >
                <input
                  type={inputType}
                  name={`question-${question.question_id}`}
                  checked={isChecked}
                  onChange={(event) =>
                    updateDraft(question.question_id, (currentDraft) => ({
                      ...currentDraft,
                      optionIds:
                        question.question_type === "RADIO"
                          ? [option.option_id]
                          : event.target.checked
                            ? Array.from(
                                new Set([...currentDraft.optionIds, option.option_id])
                              )
                            : currentDraft.optionIds.filter(
                                (optionId) => optionId !== option.option_id
                              )
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-input text-pup-maroon focus:ring-pup-maroon/20"
                />
                <span className="font-medium text-ink-900">{option.option_label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    return (
      <p className="rounded-md border border-dashed px-3 py-3 text-sm text-muted-foreground">
        Unsupported question type.
      </p>
    );
  };

  const renderReadOnlyAnswer = (question: FormApplicationQuestionSnapshot) => {
    const answer = question.answer;

    if (!answer) {
      return (
        <p className="text-sm text-muted-foreground">No answer saved yet.</p>
      );
    }

    if (question.question_type === "CHECKBOX") {
      return (
        <div className="space-y-1 text-sm text-ink-900">
          {answer.selected_options.length ? (
            answer.selected_options.map((option) => (
              <p key={option.application_answer_option_id}>
                {option.option_label_snapshot}
              </p>
            ))
          ) : (
            <p>No options selected.</p>
          )}
        </div>
      );
    }

    if (question.question_type === "RADIO" || question.question_type === "SELECT") {
      return (
        <p className="text-sm text-ink-900">
          {answer.selected_options[0]?.option_label_snapshot || answer.answer_text || "No option selected."}
        </p>
      );
    }

    if (question.question_type === "NUMBER") {
      return <p className="text-sm text-ink-900">{answer.answer_number ?? "No answer"}</p>;
    }

    if (question.question_type === "DATE") {
      return <p className="text-sm text-ink-900">{answer.answer_date || "No answer"}</p>;
    }

    return (
      <p className="text-sm text-ink-900">{answer.answer_text || "No answer"}</p>
    );
  };

  const renderSignatoryQuestionComments = (
    question: FormApplicationQuestionSnapshot
  ) => {
    const activePendingSignatoryId =
      activePendingSignatory?.application_signatory_id || "";
    const canEditCommentsAsActiveSignatory = Boolean(
      isSignatureRoute && activePendingSignatory && isRevisionMode
    );
    const visibleQuestionComments = question.question_comments.filter(
      (questionComment) =>
        !canEditCommentsAsActiveSignatory ||
        questionComment.application_signatory_id !==
          activePendingSignatoryId
    );
    const activeDraftValue =
      activePendingSignatoryId &&
      signatoryQuestionCommentDrafts[activePendingSignatoryId]?.[
        question.question_id
      ]
        ? signatoryQuestionCommentDrafts[
            activePendingSignatoryId
          ][question.question_id]
        : "";
    const activeCommentError =
      activePendingSignatoryId &&
      signatoryQuestionCommentErrors[activePendingSignatoryId]?.[
        question.question_id
      ]
        ? signatoryQuestionCommentErrors[activePendingSignatoryId][
            question.question_id
          ]
        : "";

    if (!visibleQuestionComments.length && !canEditCommentsAsActiveSignatory) {
      return null;
    }

    return (
      <div className="space-y-3 rounded-lg border border-dashed bg-muted-100/20 p-4">
        <div className="space-y-2">
          <Label>Signatory Comments</Label>
          {visibleQuestionComments.length ? (
            <div className="space-y-2">
              {visibleQuestionComments.map((questionComment) => (
                <div
                  key={questionComment.application_question_comment_id}
                  className="rounded-md border bg-white px-3 py-3"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-pup-maroon">
                    {getQuestionCommentAuthorLabel(questionComment)}
                  </p>
                  <p className="mt-2 text-sm text-ink-900">
                    {questionComment.comment_text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No signatory comments yet.
            </p>
          )}
        </div>

        {canEditCommentsAsActiveSignatory ? (
          <div className="space-y-2">
            <Label
              htmlFor={`signatory-comment-${activePendingSignatoryId}-${question.question_id}`}
            >
              Revision Comment
            </Label>
            <Textarea
              id={`signatory-comment-${activePendingSignatoryId}-${question.question_id}`}
              placeholder="Add the revision needed for this question"
              value={activeDraftValue}
              onChange={(event) =>
                updateSignatoryQuestionComment(
                  activePendingSignatoryId,
                  question.question_id,
                  event.target.value
                )
              }
              disabled={Boolean(savingDecision)}
            />
            {activeCommentError ? (
              <p className="text-xs font-medium text-destructive">
                {activeCommentError}
              </p>
            ) : null}
            <p className="text-xs text-muted-foreground">
              This comment will be visible to the other signatories and saved only if you request revision.
            </p>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <LoadingModal
        open={
          isLoading ||
          isSavingAnswers ||
          isWithdrawing ||
          Boolean(savingDecision)
        }
        title={
          isWithdrawing
            ? "Withdrawing application"
            : isSavingAnswers
            ? shouldSaveSignatoriesWithGsroSettings
              ? "Saving settings"
              : "Saving answers"
            : savingDecision
                ? savingDecision.decision === "approve"
                  ? "Saving signature"
                  : "Saving revision request"
                : "Loading application"
        }
        description={
          isWithdrawing
            ? "We are withdrawing this application and closing the review workflow."
            : isSavingAnswers
            ? shouldSaveSignatoriesWithGsroSettings
              ? "We are saving the GSRO answers and signatory assignments for this application."
              : "We are saving the GSRO answers for this application."
            : savingDecision
                ? savingDecision.decision === "approve"
                  ? "We are recording your signature for this signatory step."
                  : "We are saving your signatory comments and revision request."
                : "We are preparing the full application workflow details."
        }
      />

      <PageContainer className="pb-10">
        <div className="flex items-start justify-between gap-3">
          <SectionHeader
            eyebrow="Applications"
            title={details?.form_name_snapshot || "Application Details"}
            description={
              isApplicantRoute
                ? details?.application_status === "withdrawn"
                  ? "This application has been withdrawn. The GSRO answers and signatory assignments are now read-only."
                  : "This applicant view shows the current GSRO answers and the signatory assignments managed by GSRO."
                : isSignatureRoute
                  ? "Review the answered form, add any question comments, and either approve it or request revision once GSRO has completed all questions."
                  : "This screen lets GSRO complete the review answers and assign the signatories before approval."
            }
          />

          <div className="flex flex-wrap justify-end gap-3">
            {canWithdrawApplication ? (
              <Button
                type="button"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={
                  isWithdrawing || isSavingAnswers || Boolean(savingDecision)
                }
                onClick={() => void handleWithdrawApplication()}
              >
                {isWithdrawing ? "Withdrawing..." : "Withdraw Application"}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(backTo)}
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              {backLabel}
            </Button>
          </div>
        </div>

        {pageError ? (
          <Card className="mt-8 border-destructive/30">
            <CardContent className="flex flex-col gap-3 p-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
                <p className="font-semibold">
                  {details
                    ? "We could not complete that request."
                    : "Unable to load this application."}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">{pageError}</p>
            </CardContent>
          </Card>
        ) : null}

        {details ? (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText
                    className="h-5 w-5 text-pup-maroon"
                    aria-hidden="true"
                  />
                  Workflow Summary
                </CardTitle>
                <CardDescription>
                  Reference no.: {details.reference_no || "Not assigned"}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Applicant
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink-900">
                    {details.applicant.name || "Unknown applicant"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {details.applicant.email || "No email"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Research Title
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink-900">
                    {details.research_title || "Not provided"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Thesis Link
                  </p>
                  {details.google_drive_link ? (
                    <a
                      href={details.google_drive_link}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-pup-maroon underline-offset-4 hover:underline"
                    >
                      Open Google Drive Link
                      <ExternalLink
                        className="h-3.5 w-3.5"
                        aria-hidden="true"
                      />
                    </a>
                  ) : (
                    <p className="mt-1 text-sm font-medium text-ink-900">
                      Not provided
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Status
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink-900">
                    {getStatusLabel(details.application_status)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Answers saved
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink-900">
                    {details.answer_count}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Signatories
                  </p>
                  <p className="mt-1 text-sm font-medium text-ink-900">
                    {details.signatories.length}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Assigned Signatories</CardTitle>
                <CardDescription>
                  {canEditSignatories
                    ? "GSRO assigns the reviewers who will sign this application while approval is still pending. These assignments are saved with the button below."
                    : isApplicantRoute
                      ? "GSRO manages the reviewer assignments for this application."
                      : "Assigned reviewers who will approve after GSRO completes the answers."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {canEditSignatories && !details.reviewers.length ? (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    No active PROGRAM_REVIEWER users are available right now, so
                    GSRO cannot assign signatories yet.
                  </div>
                ) : null}

                {canEditSignatories
                  ? details.form.signatories.map(
                      (signatory, signatoryIndex) => {
                        const assignment =
                          details.signatories.find(
                            (applicationSignatory) =>
                              applicationSignatory.signatory_id ===
                              signatory.signatory_id,
                          ) || null;
                        const selectedReviewer =
                          details.reviewers.find(
                            (reviewer) =>
                              reviewer.user_id ===
                              signatorySelections[signatory.signatory_id],
                          ) || null;
                        const signatoryError =
                          signatoryErrors[signatory.signatory_id];

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
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <p className="text-xs font-medium uppercase tracking-wide text-pup-maroon">
                                    {signatory.is_required
                                      ? "Required"
                                      : "Optional"}
                                  </p>
                                  <span className="rounded-full bg-muted-100 px-3 py-1 text-xs font-medium text-muted-foreground">
                                    {getSignatoryStatusLabel(
                                      assignment?.signatory_status,
                                      assignment?.signer_user_id,
                                    )}
                                  </span>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <Label>Select reviewer</Label>
                                <Combobox
                                  items={reviewerItems}
                                  placeholder="Choose a PROGRAM_REVIEWER"
                                  searchPlaceholder="Search reviewer"
                                  value={
                                    signatorySelections[
                                      signatory.signatory_id
                                    ] || ""
                                  }
                                  onValueChange={(value) =>
                                    updateSignatorySelection(
                                      signatory.signatory_id,
                                      value,
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
                      },
                    )
                  : details.signatories.map((signatory) => (
                      <div
                        key={signatory.application_signatory_id}
                        className="rounded-lg border bg-white p-4 shadow-sm"
                      >
                        <div className="flex flex-col gap-2 lg:grid lg:grid-cols-[minmax(0,1fr)_220px]">
                          <div>
                            <p className="text-sm font-semibold text-ink-900">
                              {signatory.position_name_snapshot}
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {signatory.signer_name || "No reviewer assigned"}
                              {signatory.signer_email
                                ? ` | ${signatory.signer_email}`
                                : ""}
                            </p>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p className="font-medium text-ink-900">
                              {getSignatoryStatusLabel(
                                signatory.signatory_status,
                                signatory.signer_user_id,
                              )}
                            </p>
                            {signatory.remarks ? (
                              <p className="mt-1 text-muted-foreground">
                                {signatory.remarks}
                              </p>
                            ) : null}
                            {isActionablePendingSignatory(signatory) ? (
                              <div className="space-y-2">
                                {assignedActionableSignatories.length > 1 ? (
                                  <Button
                                    type="button"
                                    variant={
                                      activePendingSignatory?.application_signatory_id ===
                                      signatory.application_signatory_id
                                        ? "secondary"
                                        : "outline"
                                    }
                                    onClick={() =>
                                      setActiveSignatoryId(
                                        signatory.application_signatory_id,
                                      )
                                    }
                                  >
                                    {activePendingSignatory?.application_signatory_id ===
                                    signatory.application_signatory_id
                                      ? "Reviewing Below"
                                      : "Review Questions"}
                                  </Button>
                                ) : (
                                  <p className="text-xs text-muted-foreground">
                                    Use the review section below to approve or
                                    reject this step.
                                  </p>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}

              </CardContent>
            </Card>

            {isApplicantRoute || isSignatureRoute ? (
              <Card className="border-pup-maroon/15 bg-[#fff7ef]">
                <CardContent className="flex items-center gap-3 p-4 text-sm text-ink-900">
                  <FileText
                    className="h-5 w-5 text-pup-maroon"
                    aria-hidden="true"
                  />
                  <p>
                    {isApplicantRoute
                      ? details.application_status === "withdrawn"
                        ? "You withdrew this application. The answers remain visible for reference only."
                        : "You are viewing the current answers provided by GSRO. This part is read-only for applicants."
                      : "You are reviewing the current answers provided by GSRO. Signatories cannot change form answers here. Per-question comments are available only when requesting revision."}
                  </p>
                </CardContent>
              </Card>
            ) : null}

            <form className="space-y-6" onSubmit={handleSaveGsroSettings}>
              {canApproveAsSignatory && activePendingSignatory ? (
                <Card className="border-pup-maroon/15 bg-[#fff7ef]">
                  <CardContent className="flex flex-col gap-2 p-4 text-sm text-ink-900">
                    <p className="font-semibold">
                      Reviewing signatory step:{" "}
                      {activePendingSignatory.position_name_snapshot}
                    </p>
                    <p>
                      {isRevisionMode
                        ? isReopenedRejectedSignatory
                          ? "Review or update your saved question comments. At least one comment is required if this application should stay in revision."
                          : "Add question comments where needed. Comments are visible to the other signatories. At least one question comment is required if you request revision on this application."
                        : isReopenedRejectedSignatory
                          ? "You can sign this reopened application now. If more changes are needed, switch to revision mode to review or update your question comments."
                          : "You can sign this application now. If changes are needed, switch to revision mode and add question comments before requesting revision."}
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              {details.form.sections.map((section, sectionIndex) => (
                <Card key={section.section_id} className="overflow-visible">
                  <CardHeader className="rounded-t-lg bg-[linear-gradient(135deg,#800000,#9a2424)] text-white">
                    <CardTitle className="text-xl">
                      Section {sectionIndex + 1}: {section.section_name}
                    </CardTitle>
                    <CardDescription className="text-white/80">
                      {section.description ||
                        "Application questions for GSRO review."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5 bg-[#fffdf8] pt-6">
                    {section.questions.map((question, questionIndex) => (
                      <div
                        key={question.question_id}
                        className="rounded-lg border bg-white p-5 shadow-sm"
                      >
                        <div className="flex flex-col gap-3 border-l-4 border-pup-maroon pl-4 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-pup-maroon">
                              Question {questionIndex + 1}
                            </p>
                            <h3 className="mt-1 text-lg font-semibold text-ink-900">
                              {question.question_text}
                            </h3>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-full bg-muted-100 px-3 py-1 text-xs font-medium text-muted-foreground">
                              {questionTypeLabels[question.question_type] ||
                                question.question_type}
                            </span>
                            {question.is_required ? (
                              <span className="rounded-full bg-pup-maroon/10 px-3 py-1 text-xs font-semibold text-pup-maroon">
                                Required
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-5 space-y-4">
                          {canEditAnswers
                            ? renderEditableInput(question)
                            : renderReadOnlyAnswer(question)}

                          {questionErrors[question.question_id] ? (
                            <p className="text-sm font-medium text-destructive">
                              {questionErrors[question.question_id]}
                            </p>
                          ) : null}

                          {canEditAnswers && question.has_comment ? (
                            <div className="space-y-2">
                              <Label
                                htmlFor={`comment-${question.question_id}`}
                              >
                                Comment
                              </Label>
                              <Textarea
                                id={`comment-${question.question_id}`}
                                placeholder="Optional GSRO note"
                                value={
                                  drafts[question.question_id]?.commentText ||
                                  ""
                                }
                                onChange={(event) =>
                                  updateDraft(
                                    question.question_id,
                                    (currentDraft) => ({
                                      ...currentDraft,
                                      commentText: event.target.value,
                                    }),
                                  )
                                }
                              />
                            </div>
                          ) : question.answer?.comment_text ? (
                            <div className="space-y-2">
                              <Label>Comment</Label>
                              <p className="rounded-md border bg-muted-100/40 px-3 py-3 text-sm text-ink-900">
                                {question.answer.comment_text}
                              </p>
                            </div>
                          ) : null}

                          {renderSignatoryQuestionComments(question)}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              {submitError ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
                  {submitError}
                </div>
              ) : null}

              {canSaveGsroSettings ? (
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSavingAnswers}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {isSavingAnswers ? "Saving..." : gsroSaveButtonLabel}
                  </Button>
                </div>
              ) : null}

              {canApproveAsSignatory && activePendingSignatory ? (
                <div className="flex flex-col gap-4 rounded-lg border bg-white p-4 shadow-sm">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-ink-900">
                      Signatory Decision
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isRevisionMode
                        ? isReopenedRejectedSignatory
                          ? `Choosing Still for Revision will update the saved question comments for ${activePendingSignatory.position_name_snapshot}.`
                          : `Comments entered above will be saved for ${activePendingSignatory.position_name_snapshot} only if you request revision.`
                        : isReopenedRejectedSignatory
                          ? `Signing now will clear any earlier question comments for ${activePendingSignatory.position_name_snapshot}.`
                          : "Signing now does not allow per-question comments. Use revision mode if you need to request changes."}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <Button
                      type="button"
                      className="w-full sm:w-auto"
                      disabled={Boolean(savingDecision)}
                      onClick={() =>
                        void handleSubmitSignatoryDecision(
                          activePendingSignatory.application_signatory_id,
                          "approve",
                        )
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                      {savingDecision?.applicationSignatoryId ===
                        activePendingSignatory.application_signatory_id &&
                      savingDecision.decision === "approve"
                        ? isReopenedRejectedSignatory
                          ? "Signing Now..."
                          : "Signing..."
                        : isReopenedRejectedSignatory
                          ? "Sign Now"
                          : "Approve"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full sm:w-auto"
                      disabled={Boolean(savingDecision)}
                      onClick={() => {
                        if (isRevisionMode) {
                          void handleSubmitSignatoryDecision(
                            activePendingSignatory.application_signatory_id,
                            "reject",
                          );
                          return;
                        }

                        setActiveSignatoryId(
                          activePendingSignatory.application_signatory_id,
                        );
                        clearSignatoryQuestionCommentErrors(
                          activePendingSignatory.application_signatory_id,
                        );
                        setIsRevisionMode(true);
                        setSubmitError("");
                      }}
                    >
                      {isRevisionMode
                        ? savingDecision?.applicationSignatoryId ===
                              activePendingSignatory.application_signatory_id &&
                            savingDecision.decision === "reject"
                          ? isReopenedRejectedSignatory
                            ? "Updating Revision..."
                            : "Requesting Revision..."
                          : isReopenedRejectedSignatory
                            ? "Still for Revision"
                            : "Request Revision"
                        : isReopenedRejectedSignatory
                          ? "Review Revision Comments"
                          : "Start Revision Request"}
                    </Button>
                    {isRevisionMode ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full sm:w-auto"
                        disabled={Boolean(savingDecision)}
                        onClick={() => {
                          clearSignatoryQuestionCommentErrors(
                            activePendingSignatory.application_signatory_id,
                          );
                          setIsRevisionMode(false);
                          setSubmitError("");
                        }}
                      >
                        Cancel Revision
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </form>
          </div>
        ) : null}
      </PageContainer>
    </>
  );
}
