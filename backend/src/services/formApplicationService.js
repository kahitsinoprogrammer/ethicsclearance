const { getPool } = require("../config/database");
const formApplicationModel = require("../models/formApplicationModel");
const formModel = require("../models/formModel");
const userModel = require("../models/userModel");
const { createPdfCertificate } = require("../utils/pdfCertificate");
const { buildApiResponse } = require("../utils/response");
const { getCurrentTimestamp } = require("../utils/time");

const GSRO_ROLE_CODES = [
  "GSREC_GSREO_OFFICER",
  "GSRO_OFFICER",
  "GSRO"
];
const APPLICANT_SCOPE_CODE = "APPLICANT";
const DEFAULT_CERTIFICATE_TEXT = "Not provided";
const GSRO_SCOPE_CODE = "GSRO";
const PROGRAM_REVIEWER_ROLE_CODE = "PROGRAM_REVIEWER";
const questionTypesWithOptions = new Set(["RADIO", "CHECKBOX", "SELECT"]);
const GOOGLE_DRIVE_HOSTS = new Set([
  "docs.google.com",
  "drive.google.com",
  "drive.usercontent.google.com"
]);

const normalizeString = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeNullableText = (value) => {
  const normalizedValue = normalizeString(value);

  return normalizedValue || null;
};

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const normalizeRequiredText = (value, message) => {
  const normalizedValue = normalizeString(value);

  if (!normalizedValue) {
    throw createValidationError(message);
  }

  return normalizedValue;
};

const normalizeGoogleDriveLink = (value) => {
  const normalizedValue = normalizeRequiredText(
    value,
    "Thesis Google Drive Link is required."
  );

  let parsedUrl = null;

  try {
    parsedUrl = new URL(normalizedValue);
  } catch (_error) {
    throw createValidationError("Enter a valid Google Drive link for the thesis.");
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    !GOOGLE_DRIVE_HOSTS.has(parsedUrl.hostname.toLowerCase())
  ) {
    throw createValidationError("Enter a valid Google Drive link for the thesis.");
  }

  return parsedUrl.toString();
};

const createForbiddenError = (message) => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

const createNotFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const createUnauthorizedError = (message) => {
  const error = new Error(message);
  error.statusCode = 401;
  return error;
};

const hasRoleCode = (user, roleCode) => {
  return Array.isArray(user?.role_codes) && user.role_codes.includes(roleCode);
};

const hasAnyRoleCode = (user, roleCodes) => {
  return roleCodes.some((roleCode) => hasRoleCode(user, roleCode));
};

const ensureUserId = (user) => {
  const userId = normalizeString(user?.user_id);

  if (!userId) {
    throw createUnauthorizedError("You must be signed in to continue.");
  }

  return userId;
};

const ensureRole = (user, roleCode, message) => {
  if (!hasRoleCode(user, roleCode)) {
    throw createForbiddenError(message);
  }
};

const ensureAnyRole = (user, roleCodes, message) => {
  if (!hasAnyRoleCode(user, roleCodes)) {
    throw createForbiddenError(message);
  }
};

const buildSelectedOptionSnapshot = (option) => ({
  option_id: option.option_id,
  option_label: option.option_label,
  option_value: option.option_value
});

const isTerminalApplicationStatus = (applicationStatus) => {
  return ["approved", "cancelled", "rejected"].includes(applicationStatus);
};

const canApplicantEditSignatories = (application, signatories, userId) => {
  const applicantId =
    application?.applicant_id || application?.applicant?.applicant_id || null;

  if (!application || !userId || applicantId !== userId) {
    return false;
  }

  if (isTerminalApplicationStatus(application.application_status)) {
    return false;
  }

  return signatories.every((signatory) =>
    ["pending", "skipped"].includes(signatory.signatory_status)
  );
};

const buildApplicationFormSnapshot = (form) => ({
  description: form.description,
  form_id: form.form_id,
  form_name: form.form_name,
  question_count: form.question_count,
  section_count: form.section_count,
  sections: form.sections.map((section) => ({
    description: section.description,
    questions: section.questions.map((question) => ({
      has_comment: question.has_comment,
      is_required: question.is_required,
      options: question.options.map((option) => ({
        option_id: option.option_id,
        option_label: option.option_label,
        option_value: option.option_value,
        sort_order: option.sort_order
      })),
      question_id: question.question_id,
      question_text: question.question_text,
      question_type: question.question_type,
      sort_order: question.sort_order
    })),
    section_id: section.section_id,
    section_name: section.section_name,
    sort_order: section.sort_order
  })),
  signatories: form.signatories.map((signatory) => ({
    description: signatory.description,
    is_required: signatory.is_required,
    position_name: signatory.position_name,
    signatory_id: signatory.signatory_id,
    sort_order: signatory.sort_order
  }))
});

const buildReferenceNumber = () => {
  const now = new Date();
  const datePart = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("");
  const timePart = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0")
  ].join("");
  const randomPart = Math.floor(1000 + Math.random() * 9000);

  return `APP-${datePart}-${timePart}-${randomPart}`;
};

const buildActiveFormDetails = async (formId, dbClient) => {
  const form = await formModel.findFormById(formId, dbClient);

  if (!form || !form.is_active) {
    return null;
  }

  const sections = await formModel.findFormSections(formId, dbClient);
  const questions = await formModel.findFormQuestions(formId, dbClient);
  const options = await formModel.findQuestionOptionsByFormId(formId, dbClient);
  const signatories = await formModel.findFormSignatories(formId, dbClient);

  const activeSections = sections.filter((section) => section.is_active);
  const activeSectionIds = new Set(
    activeSections.map((section) => section.section_id)
  );
  const activeQuestions = questions.filter(
    (question) =>
      question.is_active && activeSectionIds.has(question.section_id)
  );
  const activeQuestionIds = new Set(
    activeQuestions.map((question) => question.question_id)
  );
  const activeOptions = options.filter(
    (option) =>
      option.is_active && activeQuestionIds.has(option.question_id)
  );
  const activeSignatories = signatories.filter((signatory) => signatory.is_active);

  const optionsByQuestionId = activeOptions.reduce((accumulator, option) => {
    if (!accumulator[option.question_id]) {
      accumulator[option.question_id] = [];
    }

    accumulator[option.question_id].push(option);

    return accumulator;
  }, {});

  const questionsBySectionId = activeQuestions.reduce((accumulator, question) => {
    if (!accumulator[question.section_id]) {
      accumulator[question.section_id] = [];
    }

    accumulator[question.section_id].push({
      ...question,
      options: optionsByQuestionId[question.question_id] || []
    });

    return accumulator;
  }, {});

  return {
    ...form,
    question_count: activeQuestions.length,
    section_count: activeSections.length,
    sections: activeSections.map((section) => ({
      ...section,
      questions: questionsBySectionId[section.section_id] || []
    })),
    signatories: activeSignatories
  };
};

const getProgramReviewers = async () => {
  return userModel.findActiveUsersByRoleCode(PROGRAM_REVIEWER_ROLE_CODE);
};

const validateReviewerSelections = (form, reviewers, rawSignatories) => {
  const reviewerById = new Map(
    reviewers.map((reviewer) => [reviewer.user_id, reviewer])
  );
  const signatoryById = new Map(
    form.signatories.map((signatory) => [signatory.signatory_id, signatory])
  );
  const signatorySelections = new Map();

  for (const rawSignatory of rawSignatories) {
    const signatoryId = normalizeString(rawSignatory?.signatoryId);

    if (!signatoryId) {
      throw createValidationError(
        "Each signatory selection must include a signatory ID."
      );
    }

    if (!signatoryById.has(signatoryId)) {
      throw createValidationError("One or more selected signatories are invalid.");
    }

    if (signatorySelections.has(signatoryId)) {
      throw createValidationError("Duplicate signatory selections are not allowed.");
    }

    const signerUserId = normalizeString(rawSignatory?.signerUserId);

    if (signerUserId && !reviewerById.has(signerUserId)) {
      throw createValidationError(
        "Selected signatories must be active users with the PROGRAM_REVIEWER role."
      );
    }

    signatorySelections.set(signatoryId, signerUserId || null);
  }

  return form.signatories.map((signatory, signatoryIndex) => {
    const signerUserId =
      signatorySelections.get(signatory.signatory_id) || null;

    if (signatory.is_required && !signerUserId) {
      throw createValidationError(
        `Signatory ${signatoryIndex + 1} (${signatory.position_name}) requires a reviewer selection.`
      );
    }

    return {
      isRequired: signatory.is_required,
      positionNameSnapshot: signatory.position_name,
      signerUserId,
      signatoryId: signatory.signatory_id,
      signatoryStatus: signerUserId ? "pending" : "skipped"
    };
  });
};

const buildQuestionMapFromSnapshot = (application) => {
  const snapshotSections = Array.isArray(application?.form_snapshot?.sections)
    ? application.form_snapshot.sections
    : [];
  const questionMap = new Map();

  snapshotSections.forEach((section, sectionIndex) => {
    const sectionName = section?.section_name || `Section ${sectionIndex + 1}`;
    const questions = Array.isArray(section?.questions) ? section.questions : [];

    questions.forEach((question, questionIndex) => {
      const questionId = normalizeString(question?.question_id);

      if (!questionId) {
        return;
      }

      questionMap.set(questionId, {
        hasComment: Boolean(question?.has_comment),
        index: questionIndex,
        isRequired: Boolean(question?.is_required),
        options: Array.isArray(question?.options) ? question.options : [],
        questionId,
        questionText: question?.question_text || `Question ${questionIndex + 1}`,
        questionType: normalizeString(question?.question_type).toUpperCase(),
        sectionId: normalizeString(section?.section_id) || null,
        sectionName
      });
    });
  });

  return questionMap;
};

const normalizeOptionIds = (value) => {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.map((item) => normalizeString(item)).filter(Boolean))
    );
  }

  const normalizedValue = normalizeString(value);

  return normalizedValue ? [normalizedValue] : [];
};

const validateAnswerFromSnapshot = (question, rawAnswer) => {
  const baseAnswer = {
    answerDate: null,
    answerJson: null,
    answerNumber: null,
    answerText: null,
    commentText: question.hasComment
      ? normalizeNullableText(rawAnswer?.commentText)
      : null,
    questionId: question.questionId,
    questionTextSnapshot: question.questionText,
    questionTypeSnapshot: question.questionType,
    sectionId: question.sectionId,
    sectionNameSnapshot: question.sectionName,
    selectedOptions: []
  };

  if (questionTypesWithOptions.has(question.questionType)) {
    const optionIds = normalizeOptionIds(
      rawAnswer?.optionIds ?? rawAnswer?.optionId
    );
    const optionById = new Map(
      question.options.map((option) => [option.option_id, option])
    );

    if (optionIds.length === 0) {
      if (question.isRequired) {
        throw createValidationError(
          `${question.questionText} requires a selected option.`
        );
      }

      return baseAnswer;
    }

    if (
      (question.questionType === "RADIO" || question.questionType === "SELECT") &&
      optionIds.length !== 1
    ) {
      throw createValidationError(`${question.questionText} accepts only one option.`);
    }

    const selectedOptions = optionIds.map((optionId) => {
      const option = optionById.get(optionId);

      if (!option) {
        throw createValidationError(
          `${question.questionText} includes an invalid option selection.`
        );
      }

      return option;
    });

    return {
      ...baseAnswer,
      answerJson: selectedOptions.map(buildSelectedOptionSnapshot),
      answerText:
        question.questionType === "CHECKBOX"
          ? null
          : selectedOptions[0].option_value,
      selectedOptions
    };
  }

  if (question.questionType === "TEXT" || question.questionType === "TEXTAREA") {
    const answerText = normalizeNullableText(rawAnswer?.answerText);

    if (question.isRequired && !answerText) {
      throw createValidationError(`${question.questionText} requires a text answer.`);
    }

    return {
      ...baseAnswer,
      answerText
    };
  }

  if (question.questionType === "NUMBER") {
    const rawValue = rawAnswer?.answerNumber;

    if (
      rawValue === undefined ||
      rawValue === null ||
      normalizeString(String(rawValue)) === ""
    ) {
      if (question.isRequired) {
        throw createValidationError(
          `${question.questionText} requires a numeric answer.`
        );
      }

      return baseAnswer;
    }

    const answerNumber = Number(rawValue);

    if (!Number.isFinite(answerNumber)) {
      throw createValidationError(`${question.questionText} must contain a valid number.`);
    }

    return {
      ...baseAnswer,
      answerNumber
    };
  }

  if (question.questionType === "DATE") {
    const answerDate = normalizeString(rawAnswer?.answerDate);

    if (!answerDate) {
      if (question.isRequired) {
        throw createValidationError(`${question.questionText} requires a date answer.`);
      }

      return baseAnswer;
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(answerDate) ||
      Number.isNaN(new Date(`${answerDate}T00:00:00`).getTime())
    ) {
      throw createValidationError(`${question.questionText} must contain a valid date.`);
    }

    return {
      ...baseAnswer,
      answerDate
    };
  }

  throw createValidationError(
    `${question.questionText} uses an unsupported question type.`
  );
};

const buildApplicationDetails = async (applicationId, dbClient) => {
  const application = await formApplicationModel.findApplicationById(
    applicationId,
    dbClient
  );

  if (!application) {
    return null;
  }

  const answers = await formApplicationModel.findApplicationAnswers(
    applicationId,
    dbClient
  );
  const answerOptions = await formApplicationModel.findApplicationAnswerOptions(
    applicationId,
    dbClient
  );
  const signatories = await formApplicationModel.findApplicationSignatories(
    applicationId,
    dbClient
  );

  const optionsByAnswerId = answerOptions.reduce((accumulator, option) => {
    if (!accumulator[option.application_answer_id]) {
      accumulator[option.application_answer_id] = [];
    }

    accumulator[option.application_answer_id].push(option);

    return accumulator;
  }, {});

  const answersByQuestionId = answers.reduce((accumulator, answer) => {
    accumulator[answer.question_id] = {
      ...answer,
      selected_options: optionsByAnswerId[answer.application_answer_id] || []
    };

    return accumulator;
  }, {});

  const snapshot = application.form_snapshot || {};
  const sections = Array.isArray(snapshot.sections) ? snapshot.sections : [];

  return {
    answer_count: answers.length,
    applicant: {
      applicant_id: application.applicant_id,
      email: application.applicant_email,
      name: application.applicant_name
    },
    application_id: application.application_id,
    application_status: application.application_status,
    created_at: application.created_at,
    form: {
      description: snapshot.description || null,
      form_id: snapshot.form_id || application.form_id,
      form_name: snapshot.form_name || application.form_name_snapshot,
      question_count:
        snapshot.question_count ||
        sections.reduce(
          (total, section) => total + ((section.questions || []).length || 0),
          0
        ),
      signatories: Array.isArray(snapshot.signatories)
        ? snapshot.signatories
        : [],
      section_count: snapshot.section_count || sections.length,
      sections: sections.map((section) => ({
        ...section,
        questions: (Array.isArray(section.questions) ? section.questions : []).map(
          (question) => ({
            ...question,
            answer: answersByQuestionId[question.question_id] || null
          })
        )
      }))
    },
    form_id: application.form_id,
    form_name_snapshot: application.form_name_snapshot,
    google_drive_link: application.google_drive_link,
    research_title: application.research_title,
    reference_no: application.reference_no,
    signatories,
    submitted_at: application.submitted_at,
    updated_at: application.updated_at
  };
};

const buildCertificateFileName = (details) => {
  const rawSegment = normalizeString(details.reference_no || details.application_id)
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();

  return rawSegment
    ? `ethics-certificate-${rawSegment}.pdf`
    : "ethics-certificate.pdf";
};

const buildCertificatePayload = (details) => {
  const signedDates = details.signatories
    .map((signatory) => signatory.signed_at)
    .filter(Boolean)
    .map((value) => new Date(value))
    .filter((value) => !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime());

  return {
    applicantEmail: details.applicant.email || DEFAULT_CERTIFICATE_TEXT,
    applicantName: details.applicant.name || DEFAULT_CERTIFICATE_TEXT,
    approvedAt: signedDates.length ? signedDates[0].toISOString() : details.updated_at,
    formName:
      details.form?.form_name || details.form_name_snapshot || DEFAULT_CERTIFICATE_TEXT,
    generatedAt: getCurrentTimestamp(),
    referenceNo: details.reference_no || details.application_id,
    researchTitle: details.research_title || DEFAULT_CERTIFICATE_TEXT,
    signatories: details.signatories.map((signatory) => ({
      position_name_snapshot:
        signatory.position_name_snapshot || DEFAULT_CERTIFICATE_TEXT,
      signed_at: signatory.signed_at,
      signer_name: signatory.signer_name || null,
      signatory_status: signatory.signatory_status || "pending"
    })),
    submittedAt: details.submitted_at || details.created_at
  };
};

const getFormApplicationTemplate = async (formId) => {
  const normalizedFormId = normalizeString(formId);

  if (!normalizedFormId) {
    throw createValidationError("Form ID is required.");
  }

  const [form, reviewers] = await Promise.all([
    buildActiveFormDetails(normalizedFormId),
    getProgramReviewers()
  ]);

  if (!form) {
    throw createNotFoundError("Active form not found.");
  }

  return buildApiResponse({
    form,
    reviewers
  });
};

const createFormApplication = async (formId, payload, user) => {
  const applicantId = ensureUserId(user);
  const normalizedFormId = normalizeString(formId);

  if (!normalizedFormId) {
    throw createValidationError("Form ID is required.");
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const form = await buildActiveFormDetails(normalizedFormId, client);

    if (!form) {
      throw createNotFoundError("Active form not found.");
    }

    const reviewers = await getProgramReviewers();
    const rawSignatories = Array.isArray(payload?.signatories)
      ? payload.signatories
      : [];
    const googleDriveLink = normalizeGoogleDriveLink(payload?.googleDriveLink);
    const researchTitle = normalizeRequiredText(
      payload?.researchTitle,
      "Research Title is required."
    );
    const signatories = validateReviewerSelections(form, reviewers, rawSignatories);
    const submittedAt = getCurrentTimestamp();
    const createdApplication = await formApplicationModel.createFormApplication(
      {
        applicantId,
        applicationStatus: "submitted",
        formId: form.form_id,
        formNameSnapshot: form.form_name,
        formSnapshot: buildApplicationFormSnapshot(form),
        googleDriveLink,
        researchTitle,
        referenceNo: buildReferenceNumber(),
        submittedAt
      },
      client
    );

    for (const signatory of signatories) {
      await formApplicationModel.createApplicationSignatory(
        {
          applicationId: createdApplication.application_id,
          isRequired: signatory.isRequired,
          positionNameSnapshot: signatory.positionNameSnapshot,
          remarks: null,
          signedAt: null,
          signerUserId: signatory.signerUserId,
          signatoryId: signatory.signatoryId,
          signatoryStatus: signatory.signatoryStatus
        },
        client
      );
    }

    await client.query("COMMIT");

    return buildApiResponse(
      {
        answer_count: 0,
        application_id: createdApplication.application_id,
        application_status: createdApplication.application_status,
        applicant_id: createdApplication.applicant_id,
        form_id: createdApplication.form_id,
        form_name_snapshot: createdApplication.form_name_snapshot,
        google_drive_link: createdApplication.google_drive_link,
        question_count: form.question_count,
        research_title: createdApplication.research_title,
        reference_no: createdApplication.reference_no,
        section_count: form.section_count,
        signatory_count: signatories.length,
        submitted_at: createdApplication.submitted_at
      },
      "Application submitted successfully. GSRO can now complete the question answers."
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const listFormApplications = async (user) => {
  ensureUserId(user);

  let roleCode = null;

  if (hasAnyRoleCode(user, GSRO_ROLE_CODES)) {
    roleCode = GSRO_SCOPE_CODE;
  } else if (hasRoleCode(user, PROGRAM_REVIEWER_ROLE_CODE)) {
    roleCode = PROGRAM_REVIEWER_ROLE_CODE;
  } else {
    throw createForbiddenError(
      "Only GSRO users and assigned signatories can access applications."
    );
  }

  const applications = await formApplicationModel.findApplicationsForUser({
    roleCode,
    userId: user.user_id
  });

  return buildApiResponse({
    applications,
    scope: roleCode
  });
};

const listMyFormApplications = async (user) => {
  const userId = ensureUserId(user);
  const applications = await formApplicationModel.findApplicationsForUser({
    roleCode: APPLICANT_SCOPE_CODE,
    userId
  });

  return buildApiResponse({
    applications,
    scope: APPLICANT_SCOPE_CODE
  });
};

const listApplicationsForSignature = async (user) => {
  const userId = ensureUserId(user);

  ensureRole(
    user,
    PROGRAM_REVIEWER_ROLE_CODE,
    "Only assigned signatories can access applications for signature."
  );

  const applications = await formApplicationModel.findApplicationsForUser({
    roleCode: PROGRAM_REVIEWER_ROLE_CODE,
    userId
  });

  return buildApiResponse({
    applications,
    scope: PROGRAM_REVIEWER_ROLE_CODE
  });
};

const getFormApplicationDetails = async (applicationId, user) => {
  const normalizedApplicationId = normalizeString(applicationId);
  const userId = ensureUserId(user);

  if (!normalizedApplicationId) {
    throw createValidationError("Application ID is required.");
  }

  const details = await buildApplicationDetails(normalizedApplicationId);

  if (!details) {
    throw createNotFoundError("Application not found.");
  }

  const assignedSignatories = details.signatories.filter(
    (signatory) => signatory.signer_user_id === userId
  );
  const assignedPendingSignatory = assignedSignatories.find(
    (signatory) => signatory.signatory_status === "pending"
  );
  const isApplicant = details.applicant.applicant_id === userId;
  const canAnswer = hasAnyRoleCode(user, GSRO_ROLE_CODES);
  const canApprove =
    hasRoleCode(user, PROGRAM_REVIEWER_ROLE_CODE) &&
    Boolean(assignedPendingSignatory) &&
    details.application_status === "under_review" &&
    assignedPendingSignatory.signatory_status === "pending";
  const canEditSignatories = canApplicantEditSignatories(
    details,
    details.signatories,
    userId
  );

  if (!canAnswer && assignedSignatories.length === 0 && !isApplicant) {
    throw createForbiddenError("You do not have access to this application.");
  }

  const reviewers = canEditSignatories ? await getProgramReviewers() : [];

  return buildApiResponse({
    ...details,
    current_user_permissions: {
      can_edit_signatories: canEditSignatories,
      can_approve: canApprove,
      can_answer: canAnswer,
      is_applicant: isApplicant
    },
    reviewers
  });
};

const validateGsroAnswersPayload = (application, payload) => {
  const rawAnswers = Array.isArray(payload?.answers) ? payload.answers : [];
  const questionMap = buildQuestionMapFromSnapshot(application);
  const submittedAnswers = new Map();

  for (const rawAnswer of rawAnswers) {
    const questionId = normalizeString(rawAnswer?.questionId);

    if (!questionId) {
      throw createValidationError("Each answer must include a question ID.");
    }

    if (!questionMap.has(questionId)) {
      throw createValidationError("One or more submitted answers are invalid.");
    }

    if (submittedAnswers.has(questionId)) {
      throw createValidationError("Duplicate question answers are not allowed.");
    }

    submittedAnswers.set(questionId, rawAnswer);
  }

  return Array.from(questionMap.values()).map((question) =>
    validateAnswerFromSnapshot(question, submittedAnswers.get(question.questionId))
  );
};

const updateApplicationAnswers = async (applicationId, payload, user) => {
  ensureAnyRole(
    user,
    GSRO_ROLE_CODES,
    "Only GSRO users can complete the application answers."
  );
  const normalizedApplicationId = normalizeString(applicationId);

  if (!normalizedApplicationId) {
    throw createValidationError("Application ID is required.");
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const application = await formApplicationModel.findApplicationById(
      normalizedApplicationId,
      client
    );

    if (!application) {
      throw createNotFoundError("Application not found.");
    }

    if (application.application_status === "approved") {
      throw createValidationError("Completed applications can no longer be edited.");
    }

    if (application.application_status === "rejected") {
      throw createValidationError("Rejected applications can no longer be edited.");
    }

    const answers = validateGsroAnswersPayload(application, payload);

    await formApplicationModel.deleteApplicationAnswers(
      normalizedApplicationId,
      client
    );

    for (const answer of answers) {
      const createdAnswer = await formApplicationModel.createApplicationAnswer(
        {
          answerDate: answer.answerDate,
          answerJson: answer.answerJson,
          answerNumber: answer.answerNumber,
          answerText: answer.answerText,
          applicationId: normalizedApplicationId,
          commentText: answer.commentText,
          questionId: answer.questionId,
          questionTextSnapshot: answer.questionTextSnapshot,
          questionTypeSnapshot: answer.questionTypeSnapshot,
          sectionId: answer.sectionId,
          sectionNameSnapshot: answer.sectionNameSnapshot
        },
        client
      );

      for (const option of answer.selectedOptions) {
        await formApplicationModel.createApplicationAnswerOption(
          {
            applicationAnswerId: createdAnswer.application_answer_id,
            optionId: option.option_id,
            optionLabelSnapshot: option.option_label,
            optionValueSnapshot: option.option_value
          },
          client
        );
      }
    }

    const updatedApplication = await formApplicationModel.updateApplicationStatus(
      {
        applicationId: normalizedApplicationId,
        applicationStatus: "under_review"
      },
      client
    );

    await client.query("COMMIT");

    return buildApiResponse(
      {
        answer_count: answers.length,
        application_id: updatedApplication.application_id,
        application_status: updatedApplication.application_status
      },
      "GSRO answers saved successfully. The application is now ready for signatory approval."
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateApplicationSignatories = async (applicationId, payload, user) => {
  const userId = ensureUserId(user);
  const normalizedApplicationId = normalizeString(applicationId);

  if (!normalizedApplicationId) {
    throw createValidationError("Application ID is required.");
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const application = await formApplicationModel.findApplicationById(
      normalizedApplicationId,
      client
    );

    if (!application) {
      throw createNotFoundError("Application not found.");
    }

    const existingSignatories = await formApplicationModel.findApplicationSignatories(
      normalizedApplicationId,
      client
    );

    if (
      !canApplicantEditSignatories(application, existingSignatories, userId)
    ) {
      throw createValidationError(
        "Signatories can only be edited while the application is still pending."
      );
    }

    const signatorySnapshot = Array.isArray(application.form_snapshot?.signatories)
      ? application.form_snapshot.signatories
      : [];
    const reviewers = await getProgramReviewers();
    const signatories = validateReviewerSelections(
      { signatories: signatorySnapshot },
      reviewers,
      Array.isArray(payload?.signatories) ? payload.signatories : []
    );

    await formApplicationModel.deleteApplicationSignatories(
      normalizedApplicationId,
      client
    );

    for (const signatory of signatories) {
      await formApplicationModel.createApplicationSignatory(
        {
          applicationId: normalizedApplicationId,
          isRequired: signatory.isRequired,
          positionNameSnapshot: signatory.positionNameSnapshot,
          remarks: null,
          signedAt: null,
          signerUserId: signatory.signerUserId,
          signatoryId: signatory.signatoryId,
          signatoryStatus: signatory.signatoryStatus
        },
        client
      );
    }

    const updatedApplication = await formApplicationModel.updateApplicationStatus(
      {
        applicationId: normalizedApplicationId,
        applicationStatus: application.application_status
      },
      client
    );

    await client.query("COMMIT");

    return buildApiResponse(
      {
        application_id: updatedApplication.application_id,
        application_status: updatedApplication.application_status,
        signatory_count: signatories.length
      },
      "Application signatories updated successfully."
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateSignatoryDecision = async (
  applicationId,
  applicationSignatoryId,
  payload,
  user,
  decision
) => {
  ensureRole(
    user,
    PROGRAM_REVIEWER_ROLE_CODE,
    "Only assigned signatories can record approval decisions."
  );
  const normalizedApplicationId = normalizeString(applicationId);
  const normalizedApplicationSignatoryId = normalizeString(applicationSignatoryId);

  if (!normalizedApplicationId || !normalizedApplicationSignatoryId) {
    throw createValidationError("Application and signatory IDs are required.");
  }

  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const application = await formApplicationModel.findApplicationById(
      normalizedApplicationId,
      client
    );

    if (!application) {
      throw createNotFoundError("Application not found.");
    }

    if (application.application_status !== "under_review") {
      throw createValidationError(
        "Signatory decisions are allowed only after GSRO has completed the answers."
      );
    }

    const signatories = await formApplicationModel.findApplicationSignatories(
      normalizedApplicationId,
      client
    );
    const targetSignatory = signatories.find(
      (signatory) =>
        signatory.application_signatory_id === normalizedApplicationSignatoryId
    );

    if (!targetSignatory) {
      throw createNotFoundError("Assigned signatory not found.");
    }

    if (targetSignatory.signer_user_id !== user.user_id) {
      throw createForbiddenError(
        "You are not allowed to record a decision for this signatory step."
      );
    }

    if (targetSignatory.signatory_status !== "pending") {
      throw createValidationError("This signatory step has already been decided.");
    }

    await formApplicationModel.updateApplicationSignatoryStatus(
      {
        applicationSignatoryId: normalizedApplicationSignatoryId,
        remarks: normalizeNullableText(payload?.remarks),
        signedAt: getCurrentTimestamp(),
        signatoryStatus: decision === "approve" ? "signed" : "rejected"
      },
      client
    );

    const refreshedSignatories = await formApplicationModel.findApplicationSignatories(
      normalizedApplicationId,
      client
    );
    const hasRejectedRequiredSignatory = refreshedSignatories.some(
      (signatory) =>
        signatory.is_required && signatory.signatory_status === "rejected"
    );
    const allRequiredSignatoriesApproved = refreshedSignatories
      .filter((signatory) => signatory.is_required)
      .every((signatory) => signatory.signatory_status === "signed");

    const nextStatus = hasRejectedRequiredSignatory
      ? "rejected"
      : allRequiredSignatoriesApproved
        ? "approved"
        : "under_review";
    const updatedApplication = await formApplicationModel.updateApplicationStatus(
      {
        applicationId: normalizedApplicationId,
        applicationStatus: nextStatus
      },
      client
    );

    await client.query("COMMIT");

    return buildApiResponse(
      {
        application_id: updatedApplication.application_id,
        application_status: updatedApplication.application_status
      },
      decision === "approve"
        ? nextStatus === "approved"
          ? "Signatory approval recorded. The application is now complete."
          : "Signatory approval recorded successfully."
        : "Signatory rejection recorded successfully."
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const approveApplicationSignatory = (
  applicationId,
  applicationSignatoryId,
  payload,
  user
) => {
  return updateSignatoryDecision(
    applicationId,
    applicationSignatoryId,
    payload,
    user,
    "approve"
  );
};

const rejectApplicationSignatory = (
  applicationId,
  applicationSignatoryId,
  payload,
  user
) => {
  return updateSignatoryDecision(
    applicationId,
    applicationSignatoryId,
    payload,
    user,
    "reject"
  );
};

const downloadApplicationCertificate = async (applicationId, user) => {
  const normalizedApplicationId = normalizeString(applicationId);
  const userId = ensureUserId(user);

  if (!normalizedApplicationId) {
    throw createValidationError("Application ID is required.");
  }

  const details = await buildApplicationDetails(normalizedApplicationId);

  if (!details) {
    throw createNotFoundError("Application not found.");
  }

  const isApplicant = details.applicant.applicant_id === userId;
  const canAccess = isApplicant || hasAnyRoleCode(user, GSRO_ROLE_CODES);

  if (!canAccess) {
    throw createForbiddenError(
      "Only the applicant and GSRO users can download the certificate."
    );
  }

  if (details.application_status !== "approved") {
    throw createValidationError(
      "Certificates are available only for completed applications."
    );
  }

  return {
    buffer: createPdfCertificate(buildCertificatePayload(details)),
    fileName: buildCertificateFileName(details),
    mimeType: "application/pdf"
  };
};

module.exports = {
  approveApplicationSignatory,
  createFormApplication,
  downloadApplicationCertificate,
  getFormApplicationDetails,
  getFormApplicationTemplate,
  listApplicationsForSignature,
  listMyFormApplications,
  listFormApplications,
  rejectApplicationSignatory,
  updateApplicationSignatories,
  updateApplicationAnswers
};
