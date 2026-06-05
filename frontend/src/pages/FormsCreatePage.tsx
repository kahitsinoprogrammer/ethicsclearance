import {
  ChevronRight,
  CircleHelp,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import {
  Controller,
  useFieldArray,
  useForm,
  useWatch,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormRegister,
  type UseFormSetValue,
} from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import FormField from "@/components/common/FormField";
import LoadingModal from "@/components/common/LoadingModal";
import PageContainer from "@/components/common/PageContainer";
import { Button } from "@/components/ui/button";
import { Combobox, type ComboboxItem } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createForm as createFormRequest,
  fetchFormDetails,
  updateForm as updateFormRequest,
  type CreateFormPayload,
  type ManagedFormDetails,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const statusOptions: ComboboxItem[] = [
  { label: "Active", value: "active" },
  { label: "Inactive", value: "inactive" },
];

const questionTypeOptions: ComboboxItem[] = [
  { label: "Radio", value: "RADIO" },
  { label: "Checkbox", value: "CHECKBOX" },
  { label: "Dropdown", value: "SELECT" },
  { label: "Short text", value: "TEXT" },
  { label: "Long text", value: "TEXTAREA" },
  { label: "Number", value: "NUMBER" },
  { label: "Date", value: "DATE" },
];

const questionTypeLabels = Object.fromEntries(
  questionTypeOptions.map((option) => [option.value, option.label]),
) as Record<string, string>;

const questionTypesWithOptions = new Set(["RADIO", "CHECKBOX", "SELECT"]);

type CreateFormOptionValues = {
  optionLabel: string;
  optionValue: string;
  sortOrder: number;
  isActive: boolean;
};

type CreateFormQuestionValues = {
  questionText: string;
  questionType: string;
  hasComment: boolean;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  options: CreateFormOptionValues[];
};

type CreateFormSectionValues = {
  sectionName: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  questions: CreateFormQuestionValues[];
};

type CreateFormSignatoryValues = {
  positionName: string;
  description: string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
};

type CreateFormValues = {
  formName: string;
  description: string;
  status: string;
  sections: CreateFormSectionValues[];
  signatories: CreateFormSignatoryValues[];
};

const createDefaultOption = (sortOrder = 0): CreateFormOptionValues => ({
  optionLabel: "",
  optionValue: "",
  sortOrder,
  isActive: true,
});

const createDefaultQuestion = (sortOrder = 0): CreateFormQuestionValues => ({
  questionText: "",
  questionType: "RADIO",
  hasComment: true,
  isRequired: true,
  isActive: true,
  sortOrder,
  options: [createDefaultOption(0)],
});

const createDefaultSection = (sortOrder = 0): CreateFormSectionValues => ({
  sectionName: "",
  description: "",
  sortOrder,
  isActive: true,
  questions: [createDefaultQuestion(0)],
});

const createDefaultSignatory = (sortOrder = 0): CreateFormSignatoryValues => ({
  positionName: "",
  description: "",
  sortOrder,
  isRequired: true,
  isActive: true,
});

const buildDefaultValues = (): CreateFormValues => ({
  formName: "",
  description: "",
  status: "active",
  sections: [createDefaultSection(0)],
  signatories: [],
});

const readSortOrder = (value: number | null | undefined, fallback: number) => {
  return typeof value === "number" && Number.isInteger(value) ? value : fallback;
};

const mapQuestionOptionToValues = (
  option: ManagedFormDetails["sections"][number]["questions"][number]["options"][number],
  optionIndex: number,
): CreateFormOptionValues => ({
  optionLabel: option.option_label,
  optionValue: option.option_value,
  sortOrder: readSortOrder(option.sort_order, optionIndex),
  isActive: option.is_active ?? true,
});

const mapQuestionToValues = (
  question: ManagedFormDetails["sections"][number]["questions"][number],
  questionIndex: number,
): CreateFormQuestionValues => {
  const questionType = (question.question_type || "RADIO").toUpperCase();
  const options = question.options.map(mapQuestionOptionToValues);

  return {
    questionText: question.question_text,
    questionType,
    hasComment: question.has_comment ?? true,
    isRequired: question.is_required ?? true,
    isActive: question.is_active ?? true,
    sortOrder: readSortOrder(question.sort_order, questionIndex),
    options:
      questionTypesWithOptions.has(questionType) && options.length === 0
        ? [createDefaultOption(0)]
        : options,
  };
};

const mapSectionToValues = (
  section: ManagedFormDetails["sections"][number],
  sectionIndex: number,
): CreateFormSectionValues => ({
  sectionName: section.section_name,
  description: section.description || "",
  sortOrder: readSortOrder(section.sort_order, sectionIndex),
  isActive: section.is_active ?? true,
  questions: section.questions.length
    ? section.questions.map(mapQuestionToValues)
    : [createDefaultQuestion(0)],
});

const mapSignatoryToValues = (
  signatory: ManagedFormDetails["signatories"][number],
  signatoryIndex: number,
): CreateFormSignatoryValues => ({
  positionName: signatory.position_name,
  description: signatory.description || "",
  sortOrder: readSortOrder(signatory.sort_order, signatoryIndex),
  isRequired: signatory.is_required ?? true,
  isActive: signatory.is_active ?? true,
});

const mapFormDetailsToValues = (form: ManagedFormDetails): CreateFormValues => ({
  formName: form.form_name,
  description: form.description || "",
  status: form.is_active ? "active" : "inactive",
  sections: form.sections.length
    ? form.sections.map(mapSectionToValues)
    : [createDefaultSection(0)],
  signatories: (form.signatories || []).map(mapSignatoryToValues),
});

const readErrorMessage = (error: unknown) => {
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return undefined;
};

const countQuestions = (sections: CreateFormSectionValues[] | undefined) => {
  return (
    sections?.reduce(
      (total, section) => total + (section?.questions?.length || 0),
      0,
    ) || 0
  );
};

type PanelProps = {
  children: ReactNode;
  className?: string;
};

function Panel({ children, className }: PanelProps) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border border-border/80 bg-white shadow-sm",
        className,
      )}
    >
      {children}
    </section>
  );
}

type ToggleFieldProps = {
  helper?: string;
  id: string;
  label: string;
  name:
    | `sections.${number}.isActive`
    | `sections.${number}.questions.${number}.hasComment`
    | `sections.${number}.questions.${number}.isRequired`
    | `sections.${number}.questions.${number}.isActive`
    | `signatories.${number}.isRequired`
    | `signatories.${number}.isActive`;
  register: UseFormRegister<CreateFormValues>;
};

function ToggleField({ helper, id, label, name, register }: ToggleFieldProps) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-14 items-start gap-3 rounded-md border bg-white px-3 py-3 shadow-sm"
    >
      <input
        id={id}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border border-input text-pup-maroon focus:ring-2 focus:ring-pup-maroon/20"
        {...register(name)}
      />
      <span>
        <span className="block text-sm font-medium text-ink-900">{label}</span>
        {helper ? (
          <span className="mt-1 block text-xs leading-5 text-muted-foreground">
            {helper}
          </span>
        ) : null}
      </span>
    </label>
  );
}

type QuestionEditorProps = {
  control: Control<CreateFormValues>;
  errors: FieldErrors<CreateFormValues>;
  getValues: UseFormGetValues<CreateFormValues>;
  questionIndex: number;
  register: UseFormRegister<CreateFormValues>;
  sectionIndex: number;
  setValue: UseFormSetValue<CreateFormValues>;
};

function QuestionEditor({
  control,
  errors,
  getValues,
  questionIndex,
  register,
  sectionIndex,
  setValue,
}: QuestionEditorProps) {
  const optionsPath =
    `sections.${sectionIndex}.questions.${questionIndex}.options` as const;
  const questionTextPath =
    `sections.${sectionIndex}.questions.${questionIndex}.questionText` as const;
  const questionTypePath =
    `sections.${sectionIndex}.questions.${questionIndex}.questionType` as const;

  const {
    append: appendOption,
    fields: optionFields,
    remove: removeOption,
  } = useFieldArray({
    control,
    name: optionsPath,
  });

  const questionText = useWatch({
    control,
    name: questionTextPath,
  });

  const questionType = useWatch({
    control,
    name: questionTypePath,
  });

  const questionErrors =
    errors.sections?.[sectionIndex]?.questions?.[questionIndex];

  const showOptions = questionTypesWithOptions.has(questionType || "RADIO");

  useEffect(() => {
    if (showOptions && optionFields.length === 0) {
      appendOption(createDefaultOption(0));
    }
  }, [appendOption, optionFields.length, showOptions]);

  const handleOptionLabelBlur = (optionIndex: number) => {
    const optionLabelPath =
      `sections.${sectionIndex}.questions.${questionIndex}.options.${optionIndex}.optionLabel` as const;
    const optionValuePath =
      `sections.${sectionIndex}.questions.${questionIndex}.options.${optionIndex}.optionValue` as const;
    const currentValue = getValues(optionValuePath)?.trim();

    if (currentValue) {
      return;
    }

    const labelValue = getValues(optionLabelPath)?.trim();

    if (!labelValue) {
      return;
    }

    setValue(optionValuePath, labelValue, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="space-y-5 rounded-lg border bg-white p-5 text-ink-900 shadow-sm">
      <div className="border-l-4 border-pup-maroon pl-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-pup-maroon">
          Question {questionIndex + 1}
        </p>
        <h3 className="mt-1 text-lg font-semibold text-ink-900">
          {questionText?.trim() || "Untitled question"}
        </h3>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_220px_120px]">
        <div className="md:col-span-3">
          <div className="space-y-2">
            <Label htmlFor={`question-text-${sectionIndex}-${questionIndex}`}>
              Question text
            </Label>
            <Textarea
              id={`question-text-${sectionIndex}-${questionIndex}`}
              placeholder="Type the question shown to respondents"
              aria-invalid={Boolean(questionErrors?.questionText)}
              className={
                questionErrors?.questionText
                  ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                  : undefined
              }
              {...register(
                `sections.${sectionIndex}.questions.${questionIndex}.questionText`,
                {
                  required: "Question text is required",
                },
              )}
            />
            {questionErrors?.questionText ? (
              <p className="text-xs font-medium text-destructive">
                {readErrorMessage(questionErrors.questionText)}
              </p>
            ) : null}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Question type</Label>
          <Controller
            control={control}
            name={questionTypePath}
            rules={{ required: "Question type is required" }}
            render={({ field }) => (
              <Combobox
                items={questionTypeOptions}
                placeholder="Select type"
                searchPlaceholder="Search question type"
                value={field.value}
                onValueChange={field.onChange}
              />
            )}
          />
          {questionErrors?.questionType ? (
            <p className="text-xs font-medium text-destructive">
              {readErrorMessage(questionErrors.questionType)}
            </p>
          ) : null}
        </div>

        <FormField
          id={`question-order-${sectionIndex}-${questionIndex}`}
          type="number"
          label="Order"
          error={readErrorMessage(questionErrors?.sortOrder)}
          {...register(
            `sections.${sectionIndex}.questions.${questionIndex}.sortOrder`,
            {
              required: "Sort order is required",
              valueAsNumber: true,
            },
          )}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <ToggleField
          id={`required-${sectionIndex}-${questionIndex}`}
          label="Required answer"
          helper="Respondents must answer."
          name={`sections.${sectionIndex}.questions.${questionIndex}.isRequired`}
          register={register}
        />
        <ToggleField
          id={`comment-${sectionIndex}-${questionIndex}`}
          label="Allow comment"
          helper="Adds a comment field."
          name={`sections.${sectionIndex}.questions.${questionIndex}.hasComment`}
          register={register}
        />
        <ToggleField
          id={`active-q-${sectionIndex}-${questionIndex}`}
          label="Active question"
          helper="Available in active forms."
          name={`sections.${sectionIndex}.questions.${questionIndex}.isActive`}
          register={register}
        />
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink-900">Options</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Used by radio, checkbox, and dropdown questions.
            </p>
          </div>

          {showOptions ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                appendOption(createDefaultOption(optionFields.length))
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Option
            </Button>
          ) : null}
        </div>

        {showOptions ? (
          <div className="space-y-3">
            {optionFields.map((optionField, optionIndex) => {
              const optionErrors = questionErrors?.options?.[optionIndex];

              return (
                <div
                  key={optionField.id}
                  className="rounded-md border bg-muted-100/25 px-3 py-3"
                >
                  <div className="grid gap-3 md:grid-cols-[1fr_1fr_90px_auto] md:items-end">
                    <FormField
                      id={`option-label-${sectionIndex}-${questionIndex}-${optionIndex}`}
                      label={`Option ${optionIndex + 1}`}
                      placeholder="Yes"
                      error={readErrorMessage(optionErrors?.optionLabel)}
                      {...register(
                        `sections.${sectionIndex}.questions.${questionIndex}.options.${optionIndex}.optionLabel`,
                        {
                          required: "Option label is required",
                          onBlur: () => handleOptionLabelBlur(optionIndex),
                        },
                      )}
                    />

                    <FormField
                      id={`option-value-${sectionIndex}-${questionIndex}-${optionIndex}`}
                      label="Stored value"
                      placeholder="YES"
                      error={readErrorMessage(optionErrors?.optionValue)}
                      {...register(
                        `sections.${sectionIndex}.questions.${questionIndex}.options.${optionIndex}.optionValue`,
                      )}
                    />

                    <FormField
                      id={`option-order-${sectionIndex}-${questionIndex}-${optionIndex}`}
                      type="number"
                      label="Order"
                      error={readErrorMessage(optionErrors?.sortOrder)}
                      {...register(
                        `sections.${sectionIndex}.questions.${questionIndex}.options.${optionIndex}.sortOrder`,
                        {
                          required: "Sort order is required",
                          valueAsNumber: true,
                        },
                      )}
                    />

                    <div className="flex items-center justify-between gap-3 pb-1 md:flex-col md:items-end">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border border-input text-pup-maroon focus:ring-2 focus:ring-pup-maroon/20"
                          {...register(
                            `sections.${sectionIndex}.questions.${questionIndex}.options.${optionIndex}.isActive`,
                          )}
                        />
                        Active
                      </label>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={optionFields.length <= 1}
                        onClick={() => removeOption(optionIndex)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border bg-white px-4 py-3 text-sm text-muted-foreground">
            This question type does not require options.
          </div>
        )}
      </div>
    </div>
  );
}

type SectionDetailsProps = {
  activeQuestionIndex: number;
  control: Control<CreateFormValues>;
  errors: FieldErrors<CreateFormValues>;
  getValues: UseFormGetValues<CreateFormValues>;
  onAddQuestion: (sectionIndex: number) => void;
  onEditSection: (sectionIndex: number) => void;
  onRemoveQuestion: (sectionIndex: number, questionIndex: number) => void;
  onRemoveSection: (sectionIndex: number) => void;
  register: UseFormRegister<CreateFormValues>;
  sectionCount: number;
  sectionIndex: number;
  setValue: UseFormSetValue<CreateFormValues>;
};

function SectionDetails({
  activeQuestionIndex,
  control,
  errors,
  getValues,
  onAddQuestion,
  onEditSection,
  onRemoveQuestion,
  onRemoveSection,
  register,
  sectionCount,
  sectionIndex,
  setValue,
}: SectionDetailsProps) {
  const questionsPath = `sections.${sectionIndex}.questions` as const;
  const sectionNamePath = `sections.${sectionIndex}.sectionName` as const;

  const questions = useWatch({
    control,
    name: questionsPath,
  });

  const sectionName = useWatch({
    control,
    name: sectionNamePath,
  });

  const activeQuestion = questions?.[activeQuestionIndex] || null;

  return (
    <Panel className="min-h-[650px] lg:col-start-2 lg:row-start-2">
      <div className="border-b bg-[linear-gradient(135deg,#800000,#9a2424)] px-6 py-6 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pup-gold">
              Question details
            </p>
            <h2 className="mt-1 text-2xl font-semibold text-white sm:text-3xl">
              {sectionName?.trim() || "Untitled section"}
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/35 bg-white/10 text-white hover:bg-white/20"
              onClick={() => onEditSection(sectionIndex)}
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Edit Section
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onAddQuestion(sectionIndex)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Question
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-white/35 bg-white/10 text-white hover:bg-white/20"
              disabled={sectionCount <= 1}
              onClick={() => onRemoveSection(sectionIndex)}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              Remove Section
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-5 bg-[#fffdf8] px-6 py-6 text-ink-900">
        <div className="flex items-center gap-3 rounded-lg border bg-white p-4 shadow-sm">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-pup-maroon/10 text-pup-maroon">
            <CircleHelp className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-semibold text-ink-900">
              Question details
            </p>
            <p className="text-xs text-muted-foreground">
              Select or add a question from the side panel.
            </p>
          </div>
        </div>

        {activeQuestion ? (
          <div>
            <QuestionEditor
              key={`${sectionIndex}-${activeQuestionIndex}`}
              control={control}
              errors={errors}
              getValues={getValues}
              questionIndex={activeQuestionIndex}
              register={register}
              sectionIndex={sectionIndex}
              setValue={setValue}
            />

            {(questions?.length || 0) > 1 ? (
              <div className="mt-3 flex justify-end">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    onRemoveQuestion(sectionIndex, activeQuestionIndex)
                  }
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Remove Question
                </Button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed bg-white p-6 text-center">
            <p className="text-sm font-medium text-ink-900">
              No question selected.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              onClick={() => onAddQuestion(sectionIndex)}
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Question
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}

type SectionDetailsModalProps = {
  errors: FieldErrors<CreateFormValues>;
  onClose: () => void;
  register: UseFormRegister<CreateFormValues>;
  sectionIndex: number;
};

function SectionDetailsModal({
  errors,
  onClose,
  register,
  sectionIndex,
}: SectionDetailsModalProps) {
  const sectionErrors = errors.sections?.[sectionIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/45 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-full w-full max-w-2xl overflow-y-auto rounded-lg border bg-white shadow-xl">
        <div className="flex items-center justify-between border-b bg-[linear-gradient(135deg,#800000,#9a2424)] px-5 py-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-pup-gold">
              Section details
            </p>
            <h2 className="mt-1 text-xl font-semibold">
              Section {sectionIndex + 1}
            </h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/15"
            onClick={onClose}
          >
            <X className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Close section details</span>
          </Button>
        </div>

        <div className="space-y-4 bg-[#fffdf8] p-5">
          <div className="grid gap-4 md:grid-cols-[1fr_120px]">
            <FormField
              id={`section-name-${sectionIndex}`}
              label="Section name"
              placeholder="Scientific Importance and Validity"
              error={readErrorMessage(sectionErrors?.sectionName)}
              {...register(`sections.${sectionIndex}.sectionName`, {
                required: "Section name is required",
              })}
            />

            <FormField
              id={`section-order-${sectionIndex}`}
              type="number"
              label="Order"
              error={readErrorMessage(sectionErrors?.sortOrder)}
              {...register(`sections.${sectionIndex}.sortOrder`, {
                required: "Sort order is required",
                valueAsNumber: true,
              })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor={`section-description-${sectionIndex}`}>
              Section description
            </Label>
            <Textarea
              id={`section-description-${sectionIndex}`}
              placeholder="Give context for this section"
              aria-invalid={Boolean(sectionErrors?.description)}
              className={
                sectionErrors?.description
                  ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                  : undefined
              }
              {...register(`sections.${sectionIndex}.description`)}
            />
          </div>

          <ToggleField
            id={`section-active-${sectionIndex}`}
            label="Active section"
            helper="Show this section when the form is active."
            name={`sections.${sectionIndex}.isActive`}
            register={register}
          />

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FormsCreatePage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { formId } = useParams<{ formId: string }>();
  const toast = useToast();
  const isEditMode = Boolean(formId);

  const [submitError, setSubmitError] = useState("");
  const [isLoadingForm, setIsLoadingForm] = useState(false);
  const [loadedFormValues, setLoadedFormValues] =
    useState<CreateFormValues | null>(null);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [editingSectionIndex, setEditingSectionIndex] = useState<number | null>(
    null,
  );

  const {
    control,
    formState: { errors, isSubmitting },
    getValues,
    handleSubmit,
    register,
    reset,
    setValue,
  } = useForm<CreateFormValues>({
    defaultValues: buildDefaultValues(),
    mode: "onBlur",
  });

  const {
    append: appendSection,
    fields: sectionFields,
    remove: removeSection,
  } = useFieldArray({
    control,
    name: "sections",
  });

  const {
    append: appendSignatory,
    fields: signatoryFields,
    remove: removeSignatory,
  } = useFieldArray({
    control,
    name: "signatories",
  });

  const watchedSections = useWatch({
    control,
    name: "sections",
  });

  useEffect(() => {
    if (!formId) {
      setLoadedFormValues(null);
      return undefined;
    }

    if (!token) {
      return undefined;
    }

    let isMounted = true;

    const loadForm = async () => {
      try {
        setIsLoadingForm(true);
        setSubmitError("");

        const formDetails = await fetchFormDetails(token, formId);
        const nextValues = mapFormDetailsToValues(formDetails);

        if (!isMounted) {
          return;
        }

        reset(nextValues);
        setLoadedFormValues(nextValues);
        setActiveSectionIndex(0);
        setActiveQuestionIndex(0);
        setEditingSectionIndex(null);
      } catch (error) {
        if (isMounted) {
          setSubmitError(
            error instanceof Error
              ? error.message
              : "Failed to load form details.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingForm(false);
        }
      }
    };

    loadForm();

    return () => {
      isMounted = false;
    };
  }, [formId, reset, token]);

  const totalQuestions = countQuestions(watchedSections);
  const activeSectionQuestionCount =
    watchedSections?.[activeSectionIndex]?.questions?.length || 0;

  useEffect(() => {
    setActiveSectionIndex((currentIndex) => {
      if (!sectionFields.length) {
        return 0;
      }

      return Math.min(currentIndex, sectionFields.length - 1);
    });
  }, [sectionFields.length]);

  useEffect(() => {
    setActiveQuestionIndex((currentIndex) => {
      if (!activeSectionQuestionCount) {
        return 0;
      }

      return Math.min(currentIndex, activeSectionQuestionCount - 1);
    });
  }, [activeSectionIndex, activeSectionQuestionCount]);

  const resetBuilder = () => {
    reset(isEditMode && loadedFormValues ? loadedFormValues : buildDefaultValues());
    setActiveSectionIndex(0);
    setActiveQuestionIndex(0);
    setEditingSectionIndex(null);
  };

  const addSignatory = () => {
    appendSignatory(createDefaultSignatory(signatoryFields.length));
  };

  const addSection = () => {
    appendSection(createDefaultSection(sectionFields.length));
    setActiveSectionIndex(sectionFields.length);
    setActiveQuestionIndex(0);
    setEditingSectionIndex(sectionFields.length);
  };

  const removeSectionAt = (sectionIndex: number) => {
    if (sectionFields.length <= 1) {
      return;
    }

    removeSection(sectionIndex);
    setActiveQuestionIndex(0);
    setEditingSectionIndex((currentIndex) => {
      if (currentIndex === null) {
        return null;
      }

      if (currentIndex === sectionIndex) {
        return null;
      }

      return currentIndex > sectionIndex ? currentIndex - 1 : currentIndex;
    });
    setActiveSectionIndex((currentIndex) => {
      if (currentIndex > sectionIndex) {
        return currentIndex - 1;
      }

      if (currentIndex === sectionIndex) {
        return Math.max(sectionIndex - 1, 0);
      }

      return currentIndex;
    });
  };

  const addQuestionToSection = (sectionIndex: number) => {
    const questionsPath = `sections.${sectionIndex}.questions` as const;
    const currentQuestions = getValues(questionsPath) || [];

    setValue(
      questionsPath,
      [...currentQuestions, createDefaultQuestion(currentQuestions.length)],
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );

    setActiveSectionIndex(sectionIndex);
    setActiveQuestionIndex(currentQuestions.length);
  };

  const removeQuestionAt = (sectionIndex: number, questionIndex: number) => {
    const questionsPath = `sections.${sectionIndex}.questions` as const;
    const currentQuestions = getValues(questionsPath) || [];

    if (currentQuestions.length <= 1) {
      return;
    }

    setValue(
      questionsPath,
      currentQuestions.filter((_, index) => index !== questionIndex),
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );

    setActiveSectionIndex(sectionIndex);
    setActiveQuestionIndex((currentIndex) => {
      if (currentIndex > questionIndex) {
        return currentIndex - 1;
      }

      if (currentIndex === questionIndex) {
        return Math.max(questionIndex - 1, 0);
      }

      return currentIndex;
    });
  };

  const onSubmit = async (values: CreateFormValues) => {
    if (!token) {
      setSubmitError("You must be signed in to save a form.");
      return;
    }

    const payload: CreateFormPayload = {
      description: values.description,
      formName: values.formName,
      sections: values.sections.map((section, sectionIndex) => ({
        description: section.description,
        isActive: section.isActive,
        questions: section.questions.map((question, questionIndex) => ({
          hasComment: question.hasComment,
          isActive: question.isActive,
          isRequired: question.isRequired,
          options: questionTypesWithOptions.has(question.questionType)
            ? question.options.map((option, optionIndex) => ({
                isActive: option.isActive,
                optionLabel: option.optionLabel,
                optionValue: option.optionValue,
                sortOrder: Number.isInteger(option.sortOrder)
                  ? option.sortOrder
                  : optionIndex,
              }))
            : [],
          questionText: question.questionText,
          questionType: question.questionType,
          sortOrder: Number.isInteger(question.sortOrder)
            ? question.sortOrder
            : questionIndex,
        })),
        sectionName: section.sectionName,
        sortOrder: Number.isInteger(section.sortOrder)
          ? section.sortOrder
          : sectionIndex,
      })),
      signatories: values.signatories.map((signatory, signatoryIndex) => ({
        description: signatory.description,
        isActive: signatory.isActive,
        isRequired: signatory.isRequired,
        positionName: signatory.positionName,
        sortOrder: Number.isInteger(signatory.sortOrder)
          ? signatory.sortOrder
          : signatoryIndex,
      })),
      status: values.status,
    };

    try {
      setSubmitError("");
      if (isEditMode && formId) {
        await updateFormRequest(token, formId, payload);
      } else {
        await createFormRequest(token, payload);
      }

      if (!isEditMode) {
        resetBuilder();
      }

      toast.success(
        isEditMode
          ? "The saved form structure was updated successfully."
          : "The form, sections, questions, and options were saved successfully.",
        isEditMode ? "Form updated" : "Form saved",
      );

      navigate("/forms/view", { replace: true });
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : isEditMode
            ? "Failed to update form."
            : "Failed to create form.",
      );
    }
  };

  const activeSection = sectionFields[activeSectionIndex];

  return (
    <>
      <LoadingModal
        open={isSubmitting || isLoadingForm}
        title={
          isLoadingForm
            ? "Loading form"
            : isEditMode
              ? "Updating form"
              : "Saving form"
        }
        description={
          isLoadingForm
            ? "We are filling the builder with the saved sections, questions, and options."
            : "We are saving the form header, sections, questions, and options."
        }
      />

      <PageContainer className="pb-12">
        <form
          className="mx-auto grid min-h-[calc(100vh-120px)] max-w-7xl gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:grid-rows-[auto_1fr]"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Panel className="lg:col-start-2 lg:row-start-1">
            <div className="bg-[linear-gradient(135deg,#800000,#9a2424)] px-6 py-6 text-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-center sm:text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-pup-gold">
                    {isEditMode ? "Edit Form" : "Form Builder"}
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">
                    {isEditMode ? "Update Form Details" : "Form Details"}
                  </h1>
                </div>

                <div className="flex flex-wrap justify-center gap-2 sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="border-white/35 bg-white/10 text-white hover:bg-white/20"
                    disabled={isSubmitting || isLoadingForm}
                    onClick={resetBuilder}
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    {isEditMode ? "Reset Changes" : "Reset"}
                  </Button>

                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={isSubmitting || isLoadingForm}
                  >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    {isSubmitting
                      ? isEditMode
                        ? "Updating..."
                        : "Saving..."
                      : isEditMode
                        ? "Update Form"
                        : "Save Form"}
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid gap-4 bg-[#fffdf8] px-6 py-5 md:grid-cols-[1fr_220px]">
              <FormField
                id="form-name"
                label="Form name"
                placeholder="GSREC Form 01 - Ethics Review Application Form"
                error={readErrorMessage(errors.formName)}
                {...register("formName", {
                  required: "Form name is required",
                })}
              />

              <div className="space-y-2">
                <Label>Status</Label>
                <Controller
                  control={control}
                  name="status"
                  rules={{ required: "Status is required" }}
                  render={({ field }) => (
                    <Combobox
                      items={statusOptions}
                      placeholder="Select status"
                      searchPlaceholder="Search status"
                      value={field.value}
                      onValueChange={field.onChange}
                    />
                  )}
                />
                {errors.status ? (
                  <p className="text-xs font-medium text-destructive">
                    {readErrorMessage(errors.status)}
                  </p>
                ) : null}
              </div>

              <div className="md:col-span-2">
                <div className="space-y-2">
                  <Label htmlFor="form-description">Description</Label>
                  <Textarea
                    id="form-description"
                    placeholder="Write short instructions for the ethics officer or respondent"
                    aria-invalid={Boolean(errors.description)}
                    className={
                      errors.description
                        ? "border-destructive focus:border-destructive focus:ring-destructive/20"
                        : undefined
                    }
                    {...register("description")}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-lg border bg-white p-4 shadow-sm md:col-span-2">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink-900">
                      Signatories
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add signing positions only. The specific person will be
                      assigned when an application starts.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSignatory}
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Signatory
                  </Button>
                </div>

                {signatoryFields.length ? (
                  <div className="space-y-3">
                    {signatoryFields.map((signatoryField, signatoryIndex) => {
                      const signatoryErrors =
                        errors.signatories?.[signatoryIndex];

                      return (
                        <div
                          key={signatoryField.id}
                          className="rounded-md border bg-muted-100/25 p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_120px_auto] md:items-end">
                            <FormField
                              id={`signatory-position-${signatoryIndex}`}
                              label={`Position ${signatoryIndex + 1}`}
                              placeholder="Ethics Review Chairperson"
                              error={readErrorMessage(
                                signatoryErrors?.positionName,
                              )}
                              {...register(
                                `signatories.${signatoryIndex}.positionName`,
                                {
                                  required: "Position name is required",
                                },
                              )}
                            />

                            <FormField
                              id={`signatory-order-${signatoryIndex}`}
                              type="number"
                              label="Order"
                              error={readErrorMessage(
                                signatoryErrors?.sortOrder,
                              )}
                              {...register(
                                `signatories.${signatoryIndex}.sortOrder`,
                                {
                                  required: "Sort order is required",
                                  valueAsNumber: true,
                                },
                              )}
                            />

                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeSignatory(signatoryIndex)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Remove
                            </Button>
                          </div>

                          <div className="mt-3 grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                            <div className="space-y-2">
                              <Label
                                htmlFor={`signatory-description-${signatoryIndex}`}
                              >
                                Description
                              </Label>
                              <Textarea
                                id={`signatory-description-${signatoryIndex}`}
                                placeholder="Optional instructions for this signing step"
                                {...register(
                                  `signatories.${signatoryIndex}.description`,
                                )}
                              />
                            </div>

                            <ToggleField
                              id={`signatory-required-${signatoryIndex}`}
                              label="Required signature"
                              helper="This position must sign."
                              name={`signatories.${signatoryIndex}.isRequired`}
                              register={register}
                            />

                            <ToggleField
                              id={`signatory-active-${signatoryIndex}`}
                              label="Active signatory"
                              helper="Available for applications."
                              name={`signatories.${signatoryIndex}.isActive`}
                              register={register}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-dashed bg-muted-100/20 px-4 py-5 text-sm text-muted-foreground">
                    No signatory positions added yet.
                  </div>
                )}
              </div>

              {submitError ? (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive md:col-span-2">
                  {submitError}
                </p>
              ) : null}

              <p className="text-xs text-muted-foreground md:col-span-2">
                {sectionFields.length} section
                {sectionFields.length === 1 ? "" : "s"} and {totalQuestions}{" "}
                question{totalQuestions === 1 ? "" : "s"} plus{" "}
                {signatoryFields.length} signator
                {signatoryFields.length === 1 ? "y" : "ies"} will be{" "}
                {isEditMode ? "updated" : "saved"}.
              </p>
            </div>
          </Panel>

          <Panel className="min-h-[650px] bg-[linear-gradient(180deg,#720000,#8d1818)] text-white lg:col-start-1 lg:row-start-2 lg:self-stretch">
            <div className="px-4 py-5">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full shadow-sm"
                onClick={addSection}
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add Section
              </Button>
            </div>

            <div className="space-y-4 px-3 pb-5">
              {sectionFields.map((sectionField, sectionIndex) => {
                const section = watchedSections?.[sectionIndex];
                const questions = section?.questions || [];
                const sectionIsActive = sectionIndex === activeSectionIndex;

                return (
                  <div
                    key={sectionField.id}
                    className={cn(
                      "rounded-lg border p-2 transition-colors",
                      sectionIsActive
                        ? "border-white/45 bg-white/95 text-pup-maroon shadow-sm"
                        : "border-white/10 bg-white/5 text-white hover:bg-white/10",
                    )}
                  >
                    <div className="flex items-start gap-1">
                      <button
                        type="button"
                        className="min-w-0 flex-1 px-2 py-2 text-left"
                        onClick={() => {
                          setActiveSectionIndex(sectionIndex);
                          setActiveQuestionIndex(0);
                        }}
                      >
                        <p
                          className={cn(
                            "text-lg font-semibold",
                            sectionIsActive ? "text-pup-maroon" : "text-white",
                          )}
                        >
                          Section {sectionIndex + 1}
                        </p>
                        <p
                          className={cn(
                            "mt-1 truncate text-xs",
                            sectionIsActive
                              ? "text-pup-maroon/70"
                              : "text-white/80",
                          )}
                        >
                          {section?.sectionName?.trim() || "Untitled section"}
                        </p>
                      </button>

                      <button
                        type="button"
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md",
                          sectionIsActive
                            ? "text-pup-maroon hover:bg-pup-maroon/10"
                            : "text-white hover:bg-white/10",
                        )}
                        onClick={() => {
                          setActiveSectionIndex(sectionIndex);
                          setEditingSectionIndex(sectionIndex);
                        }}
                        aria-label={`Edit section ${sectionIndex + 1}`}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md",
                          sectionIsActive
                            ? "text-pup-maroon hover:bg-pup-maroon/10"
                            : "text-white hover:bg-white/10",
                        )}
                        onClick={() => addQuestionToSection(sectionIndex)}
                        aria-label={`Add question to section ${sectionIndex + 1}`}
                      >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="mt-1 space-y-1 pl-3">
                      {questions.map((question, questionIndex) => {
                        const questionIsActive =
                          sectionIsActive &&
                          questionIndex === activeQuestionIndex;

                        return (
                          <div
                            key={`${sectionField.id}-question-${questionIndex}`}
                            className="flex items-center gap-1"
                          >
                            <button
                              type="button"
                              className={cn(
                                "min-w-0 flex-1 px-2 py-2 text-left text-sm transition-colors",
                                questionIsActive
                                  ? "rounded-md bg-pup-maroon font-semibold text-white shadow-sm"
                                  : sectionIsActive
                                    ? "rounded-md text-pup-maroon hover:bg-pup-maroon/10"
                                    : "rounded-md text-white hover:bg-white/10",
                              )}
                              onClick={() => {
                                setActiveSectionIndex(sectionIndex);
                                setActiveQuestionIndex(questionIndex);
                              }}
                            >
                              <span className="flex items-center justify-between gap-2">
                                <span className="truncate">
                                  Question {questionIndex + 1}
                                </span>
                                <ChevronRight
                                  className={cn(
                                    "h-4 w-4 shrink-0",
                                    questionIsActive
                                      ? "text-white"
                                      : sectionIsActive
                                        ? "text-pup-maroon/60"
                                        : "text-white/70",
                                  )}
                                  aria-hidden="true"
                                />
                              </span>

                              <span
                                className={cn(
                                  "mt-1 block truncate text-xs font-normal",
                                  questionIsActive
                                    ? "text-white/75"
                                    : sectionIsActive
                                      ? "text-pup-maroon/65"
                                      : "text-white/70",
                                )}
                              >
                                {question?.questionText?.trim() ||
                                  questionTypeLabels[
                                    question?.questionType || "RADIO"
                                  ]}
                              </span>
                            </button>

                            {questions.length > 1 ? (
                              <button
                                type="button"
                                className={cn(
                                  "flex h-8 w-8 items-center justify-center rounded-md",
                                  sectionIsActive
                                    ? "text-pup-maroon/60 hover:bg-pup-maroon/10 hover:text-destructive"
                                    : "text-white/70 hover:bg-white/10 hover:text-white",
                                )}
                                onClick={() =>
                                  removeQuestionAt(sectionIndex, questionIndex)
                                }
                                aria-label={`Remove question ${questionIndex + 1}`}
                              >
                                <Trash2
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                />
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>

          {activeSection ? (
            <SectionDetails
              activeQuestionIndex={activeQuestionIndex}
              control={control}
              errors={errors}
              getValues={getValues}
              onAddQuestion={addQuestionToSection}
              onEditSection={setEditingSectionIndex}
              onRemoveQuestion={removeQuestionAt}
              onRemoveSection={removeSectionAt}
              register={register}
              sectionCount={sectionFields.length}
              sectionIndex={activeSectionIndex}
              setValue={setValue}
            />
          ) : null}
        </form>

        {editingSectionIndex !== null && sectionFields[editingSectionIndex] ? (
          <SectionDetailsModal
            errors={errors}
            onClose={() => setEditingSectionIndex(null)}
            register={register}
            sectionIndex={editingSectionIndex}
          />
        ) : null}
      </PageContainer>
    </>
  );
}
