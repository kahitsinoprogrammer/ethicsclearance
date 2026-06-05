const programModel = require("../models/programModel");
const { buildApiResponse } = require("../utils/response");

const allowedStatuses = ["active", "inactive"];

const normalizeString = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const normalizeWhitespace = (value) => {
  return normalizeString(value).replace(/\s+/g, " ");
};

const createValidationError = (message) => {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
};

const createConflictError = (message) => {
  const error = new Error(message);
  error.statusCode = 409;
  return error;
};

const createNotFoundError = (message) => {
  const error = new Error(message);
  error.statusCode = 404;
  return error;
};

const validateProgramPayload = (payload) => {
  const programCode = normalizeWhitespace(payload.programCode).toUpperCase();
  const programName = normalizeWhitespace(payload.programName);
  const status = normalizeString(payload.status).toLowerCase();

  if (!programCode) {
    throw createValidationError("Program code is required.");
  }

  if (!programName) {
    throw createValidationError("Program name is required.");
  }

  if (!allowedStatuses.includes(status)) {
    throw createValidationError("A valid status is required.");
  }

  return {
    isActive: status === "active",
    programCode,
    programName
  };
};

const getActivePrograms = async () => {
  const programs = await programModel.findActivePrograms();

  return buildApiResponse(programs);
};

const getAllPrograms = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 10);
  const search = normalizeString(query.search);
  const status = normalizeString(query.status);
  const validStatus = ["", "active", "inactive"].includes(status) ? status : "";
  const offset = (page - 1) * limit;
  const { rows, total } = await programModel.findAllPrograms({
    limit,
    offset,
    search,
    status: validStatus
  });

  return buildApiResponse({
    pagination: {
      limit,
      page,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    },
    programs: rows
  });
};

const createProgram = async (payload) => {
  const validatedPayload = validateProgramPayload(payload);

  const [existingProgramCode, existingProgramName] = await Promise.all([
    programModel.findProgramByCode(validatedPayload.programCode),
    programModel.findProgramByName(validatedPayload.programName)
  ]);

  if (existingProgramCode) {
    throw createConflictError("Program code already exists.");
  }

  if (existingProgramName) {
    throw createConflictError("Program name already exists.");
  }

  try {
    const program = await programModel.createProgram(validatedPayload);

    return buildApiResponse(program, "Program created successfully");
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "Program code or program name already exists.";
    }

    throw error;
  }
};

const updateProgram = async (programId, payload) => {
  const normalizedProgramId = normalizeString(programId);

  if (!normalizedProgramId) {
    throw createValidationError("Program ID is required.");
  }

  const existingProgram = await programModel.findProgramById(normalizedProgramId);

  if (!existingProgram) {
    throw createNotFoundError("Program not found.");
  }

  const validatedPayload = validateProgramPayload(payload);

  const [existingProgramCode, existingProgramName] = await Promise.all([
    programModel.findProgramByCode(validatedPayload.programCode),
    programModel.findProgramByName(validatedPayload.programName)
  ]);

  if (
    existingProgramCode &&
    existingProgramCode.program_id !== normalizedProgramId
  ) {
    throw createConflictError("Program code already exists.");
  }

  if (
    existingProgramName &&
    existingProgramName.program_id !== normalizedProgramId
  ) {
    throw createConflictError("Program name already exists.");
  }

  try {
    const program = await programModel.updateProgram({
      ...validatedPayload,
      programId: normalizedProgramId
    });

    return buildApiResponse(program, "Program updated successfully");
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "Program code or program name already exists.";
    }

    throw error;
  }
};

module.exports = {
  createProgram,
  getActivePrograms,
  getAllPrograms,
  updateProgram
};
