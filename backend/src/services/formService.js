const { getPool } = require("../config/database");
const formModel = require("../models/formModel");
const { buildApiResponse } = require("../utils/response");

const allowedStatuses = ["active", "inactive"];
const allowedQuestionTypes = [
  "RADIO",
  "CHECKBOX",
  "SELECT",
  "TEXT",
  "TEXTAREA",
  "NUMBER",
  "DATE"
];
const questionTypesWithOptions = new Set(["RADIO", "CHECKBOX", "SELECT"]);

const normalizeString = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeWhitespace = (value) => {
  return normalizeString(value).replace(/\s+/g, " ");
};

const normalizeNullableText = (value) => {
  const normalizedValue = normalizeWhitespace(value);

  return normalizedValue || null;
};

const normalizeBoolean = (value, defaultValue = true) => {
  return typeof value === "boolean" ? value : defaultValue;
};

const normalizeSortOrder = (value, fallbackValue = 0) => {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue)) {
    return fallbackValue;
  }

  return parsedValue;
};

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
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

const validateOptionPayload = (option, sectionIndex, questionIndex, optionIndex) => {
  const optionLabel = normalizeWhitespace(option?.optionLabel);
  const optionValue = normalizeWhitespace(option?.optionValue) || optionLabel;

  if (!optionLabel) {
    throw createValidationError(
      `Option ${optionIndex + 1} in question ${questionIndex + 1} of section ${sectionIndex + 1} requires a label.`
    );
  }

  if (!optionValue) {
    throw createValidationError(
      `Option ${optionIndex + 1} in question ${questionIndex + 1} of section ${sectionIndex + 1} requires a value.`
    );
  }

  return {
    isActive: normalizeBoolean(option?.isActive, true),
    optionLabel,
    optionValue,
    sortOrder: normalizeSortOrder(option?.sortOrder, optionIndex)
  };
};

const validateQuestionPayload = (question, sectionIndex, questionIndex, createdBy) => {
  const questionText = normalizeWhitespace(question?.questionText);
  const questionType = normalizeString(question?.questionType).toUpperCase() || "RADIO";

  if (!questionText) {
    throw createValidationError(
      `Question ${questionIndex + 1} in section ${sectionIndex + 1} requires text.`
    );
  }

  if (!allowedQuestionTypes.includes(questionType)) {
    throw createValidationError(
      `Question ${questionIndex + 1} in section ${sectionIndex + 1} has an invalid question type.`
    );
  }

  const rawOptions = Array.isArray(question?.options) ? question.options : [];
  const options = questionTypesWithOptions.has(questionType)
    ? rawOptions.map((option, optionIndex) =>
        validateOptionPayload(option, sectionIndex, questionIndex, optionIndex)
      )
    : [];

  if (questionTypesWithOptions.has(questionType) && options.length === 0) {
    throw createValidationError(
      `Question ${questionIndex + 1} in section ${sectionIndex + 1} requires at least one option.`
    );
  }

  return {
    createdBy,
    hasComment: normalizeBoolean(question?.hasComment, true),
    isActive: normalizeBoolean(question?.isActive, true),
    isRequired: normalizeBoolean(question?.isRequired, true),
    options,
    questionText,
    questionType,
    sortOrder: normalizeSortOrder(question?.sortOrder, questionIndex)
  };
};

const validateSectionPayload = (section, sectionIndex, createdBy) => {
  const sectionName = normalizeWhitespace(section?.sectionName);

  if (!sectionName) {
    throw createValidationError(`Section ${sectionIndex + 1} requires a section name.`);
  }

  const rawQuestions = Array.isArray(section?.questions) ? section.questions : [];

  if (rawQuestions.length === 0) {
    throw createValidationError(
      `Section ${sectionIndex + 1} requires at least one question.`
    );
  }

  return {
    description: normalizeNullableText(section?.description),
    isActive: normalizeBoolean(section?.isActive, true),
    questions: rawQuestions.map((question, questionIndex) =>
      validateQuestionPayload(question, sectionIndex, questionIndex, createdBy)
    ),
    sectionName,
    sortOrder: normalizeSortOrder(section?.sortOrder, sectionIndex)
  };
};

const validateSignatoryPayload = (signatory, signatoryIndex) => {
  const positionName = normalizeWhitespace(signatory?.positionName);

  if (!positionName) {
    throw createValidationError(
      `Signatory ${signatoryIndex + 1} requires a position name.`
    );
  }

  return {
    description: normalizeNullableText(signatory?.description),
    isActive: normalizeBoolean(signatory?.isActive, true),
    isRequired: normalizeBoolean(signatory?.isRequired, true),
    positionName,
    sortOrder: normalizeSortOrder(signatory?.sortOrder, signatoryIndex)
  };
};

const validateFormPayload = (payload, user) => {
  const formName = normalizeWhitespace(payload?.formName);
  const description = normalizeNullableText(payload?.description);
  const status = normalizeString(payload?.status).toLowerCase() || "active";
  const createdBy = normalizeString(user?.user_id);
  const rawSections = Array.isArray(payload?.sections) ? payload.sections : [];
  const rawSignatories = Array.isArray(payload?.signatories)
    ? payload.signatories
    : [];

  if (!createdBy) {
    throw createUnauthorizedError("You must be signed in to save a form.");
  }

  if (!formName) {
    throw createValidationError("Form name is required.");
  }

  if (!allowedStatuses.includes(status)) {
    throw createValidationError("A valid form status is required.");
  }

  if (rawSections.length === 0) {
    throw createValidationError("At least one section is required.");
  }

  return {
    createdBy,
    description,
    formName,
    isActive: status === "active",
    sections: rawSections.map((section, sectionIndex) =>
      validateSectionPayload(section, sectionIndex, createdBy)
    ),
    signatories: rawSignatories.map((signatory, signatoryIndex) =>
      validateSignatoryPayload(signatory, signatoryIndex)
    )
  };
};

const saveFormStructure = async (formId, sections, dbClient) => {
  for (const section of sections) {
    const createdSection = await formModel.createSection(
      {
        description: section.description,
        formId,
        isActive: section.isActive,
        sectionName: section.sectionName,
        sortOrder: section.sortOrder
      },
      dbClient
    );

    for (const question of section.questions) {
      const createdQuestion = await formModel.createQuestion(
        {
          createdBy: question.createdBy,
          hasComment: question.hasComment,
          isActive: question.isActive,
          isRequired: question.isRequired,
          questionText: question.questionText,
          questionType: question.questionType,
          sectionId: createdSection.section_id,
          sortOrder: question.sortOrder
        },
        dbClient
      );

      for (const option of question.options) {
        await formModel.createQuestionOption(
          {
            isActive: option.isActive,
            optionLabel: option.optionLabel,
            optionValue: option.optionValue,
            questionId: createdQuestion.question_id,
            sortOrder: option.sortOrder
          },
          dbClient
        );
      }
    }
  }
};

const saveFormSignatories = async (formId, signatories, dbClient) => {
  for (const signatory of signatories) {
    await formModel.createSignatory(
      {
        description: signatory.description,
        formId,
        isActive: signatory.isActive,
        isRequired: signatory.isRequired,
        positionName: signatory.positionName,
        sortOrder: signatory.sortOrder
      },
      dbClient
    );
  }
};

const buildFormDetails = async (formId, dbClient) => {
  const form = await formModel.findFormById(formId, dbClient);

  if (!form) {
    return null;
  }

  const sections = await formModel.findFormSections(formId, dbClient);
  const questions = await formModel.findFormQuestions(formId, dbClient);
  const options = await formModel.findQuestionOptionsByFormId(formId, dbClient);
  const signatories = await formModel.findFormSignatories(formId, dbClient);

  const optionsByQuestionId = options.reduce((accumulator, option) => {
    if (!accumulator[option.question_id]) {
      accumulator[option.question_id] = [];
    }

    accumulator[option.question_id].push(option);

    return accumulator;
  }, {});

  const questionsBySectionId = questions.reduce((accumulator, question) => {
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
    question_count: questions.length,
    section_count: sections.length,
    sections: sections.map((section) => ({
      ...section,
      questions: questionsBySectionId[section.section_id] || []
    })),
    signatories
  };
};

const getAllForms = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 10);
  const search = normalizeString(query.search);
  const status = normalizeString(query.status).toLowerCase();
  const validStatus = ["", "active", "inactive"].includes(status) ? status : "";
  const offset = (page - 1) * limit;
  const { rows, total } = await formModel.findAllForms({
    limit,
    offset,
    search,
    status: validStatus
  });

  return buildApiResponse({
    forms: rows,
    pagination: {
      limit,
      page,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    }
  });
};

const getFormById = async (formId) => {
  const normalizedFormId = normalizeString(formId);

  if (!normalizedFormId) {
    throw createValidationError("Form ID is required.");
  }

  const form = await buildFormDetails(normalizedFormId);

  if (!form) {
    throw createNotFoundError("Form not found.");
  }

  return buildApiResponse(form);
};

const createForm = async (payload, user) => {
  const validatedPayload = validateFormPayload(payload, user);
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const createdForm = await formModel.createForm(validatedPayload, client);

    await saveFormStructure(createdForm.form_id, validatedPayload.sections, client);
    await saveFormSignatories(
      createdForm.form_id,
      validatedPayload.signatories,
      client
    );

    const createdFormDetails = await buildFormDetails(createdForm.form_id, client);

    await client.query("COMMIT");

    return buildApiResponse(createdFormDetails, "Form created successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

const updateForm = async (formId, payload, user) => {
  const normalizedFormId = normalizeString(formId);

  if (!normalizedFormId) {
    throw createValidationError("Form ID is required.");
  }

  const validatedPayload = validateFormPayload(payload, user);
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existingForm = await formModel.findFormById(normalizedFormId, client);

    if (!existingForm) {
      throw createNotFoundError("Form not found.");
    }

    const updatedForm = await formModel.updateForm(
      {
        description: validatedPayload.description,
        formId: normalizedFormId,
        formName: validatedPayload.formName,
        isActive: validatedPayload.isActive
      },
      client
    );

    if (!updatedForm) {
      throw createNotFoundError("Form not found.");
    }

    await formModel.deleteSectionsByFormId(updatedForm.form_id, client);
    await formModel.deleteSignatoriesByFormId(updatedForm.form_id, client);
    await saveFormStructure(updatedForm.form_id, validatedPayload.sections, client);
    await saveFormSignatories(
      updatedForm.form_id,
      validatedPayload.signatories,
      client
    );

    const updatedFormDetails = await buildFormDetails(updatedForm.form_id, client);

    await client.query("COMMIT");

    return buildApiResponse(updatedFormDetails, "Form updated successfully");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  createForm,
  getAllForms,
  getFormById,
  updateForm
};
