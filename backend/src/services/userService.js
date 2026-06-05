const { getPool } = require("../config/database");
const emailVerificationOtpModel = require("../models/emailVerificationOtpModel");
const programModel = require("../models/programModel");
const roleModel = require("../models/roleModel");
const userModel = require("../models/userModel");
const userRoleModel = require("../models/userRoleModel");
const { sendFreshEmailVerificationOtp } = require("./emailVerificationService");
const { buildApiResponse } = require("../utils/response");
const { hashPassword, verifyPassword } = require("../utils/password");

const allowedUserTypes = ["GS Student", "Faculty", "Researcher", "Staff"];
const allowedHonorifics = ["Mr.", "Ms.", "Dr.", "Prof.", "Mx."];
const allowedStatuses = ["active", "inactive"];
const otpPattern = /^\d{6}$/;

const normalizeString = (value) => {
  return typeof value === "string" ? value.trim() : "";
};

const capitalizeName = (value) => {
  return normalizeString(value)
    .toLowerCase()
    .replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
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

const createForbiddenError = (message) => {
  const error = new Error(message);
  error.statusCode = 403;
  return error;
};

const validateRegistrationPayload = (payload) => {
  const firstName = normalizeString(payload.firstName);
  const honorifics = normalizeString(payload.honorifics);
  const middleName = normalizeString(payload.middleName);
  const lastName = normalizeString(payload.lastName);
  const contactNo = normalizeString(payload.cellphoneNumber);
  const email = normalizeString(payload.email).toLowerCase();
  const password = normalizeString(payload.password);
  const programId = normalizeString(payload.programId);
  const studentNo = normalizeString(payload.studentNo);
  const userType = normalizeString(payload.classification);
  const username = normalizeString(payload.username);

  if (!firstName) {
    throw createValidationError("First name is required.");
  }

  if (!allowedHonorifics.includes(honorifics)) {
    throw createValidationError("A valid honorific is required.");
  }

  if (!lastName) {
    throw createValidationError("Last name is required.");
  }

  if (!contactNo) {
    throw createValidationError("Cellphone number is required.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createValidationError("A valid email is required.");
  }

  if (!username) {
    throw createValidationError("Username is required.");
  }

  if (!studentNo) {
    throw createValidationError("Student no. is required.");
  }

  if (!allowedUserTypes.includes(userType)) {
    throw createValidationError("A valid classification is required.");
  }

  if (!programId) {
    throw createValidationError("Program is required.");
  }

  if (!password || password.length < 8) {
    throw createValidationError("Password must be at least 8 characters.");
  }

  return {
    contactNo,
    email,
    firstName: capitalizeName(firstName),
    honorifics,
    lastName: capitalizeName(lastName),
    middleName: capitalizeName(middleName),
    password,
    programId,
    studentNo,
    userType,
    username
  };
};

const validateUserProfilePayload = (payload) => {
  const firstName = normalizeString(payload.firstName);
  const honorifics = normalizeString(payload.honorifics);
  const middleName = normalizeString(payload.middleName);
  const lastName = normalizeString(payload.lastName);
  const contactNo = normalizeString(payload.cellphoneNumber);
  const email = normalizeString(payload.email).toLowerCase();
  const program = normalizeString(payload.program);
  const status = normalizeString(payload.status).toLowerCase();
  const studentNo = normalizeString(payload.studentNo);
  const userType = normalizeString(payload.classification);
  const username = normalizeString(payload.username);
  const hasRoleIds = Array.isArray(payload.roleIds);
  const roleIds = hasRoleIds
    ? payload.roleIds.map((roleId) => normalizeString(roleId)).filter(Boolean)
    : null;

  if (!firstName) {
    throw createValidationError("First name is required.");
  }

  if (!allowedHonorifics.includes(honorifics)) {
    throw createValidationError("A valid honorific is required.");
  }

  if (!lastName) {
    throw createValidationError("Last name is required.");
  }

  if (!contactNo) {
    throw createValidationError("Cellphone number is required.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createValidationError("A valid email is required.");
  }

  if (!username) {
    throw createValidationError("Username is required.");
  }

  if (!studentNo) {
    throw createValidationError("Student no. is required.");
  }

  if (!allowedUserTypes.includes(userType)) {
    throw createValidationError("A valid classification is required.");
  }

  if (!program) {
    throw createValidationError("Program is required.");
  }

  if (!allowedStatuses.includes(status)) {
    throw createValidationError("A valid status is required.");
  }

  return {
    contactNo,
    email,
    firstName: capitalizeName(firstName),
    honorifics,
    isActive: status === "active",
    lastName: capitalizeName(lastName),
    middleName: capitalizeName(middleName),
    program,
    roleIds: roleIds ? Array.from(new Set(roleIds)) : null,
    studentNo,
    userType,
    username
  };
};

const ensureUniqueUserFields = async ({ email, studentNo, username }, userId) => {
  const [existingEmail, existingStudentNo, existingUsername] = await Promise.all([
    userModel.findUserByEmail(email),
    userModel.findUserByStudentNo(studentNo),
    userModel.findUserByUsername(username)
  ]);

  if (existingEmail && existingEmail.user_id !== userId) {
    throw createConflictError("Email already exists.");
  }

  if (existingStudentNo && existingStudentNo.user_id !== userId) {
    throw createConflictError("Student no. already exists.");
  }

  if (existingUsername && existingUsername.user_id !== userId) {
    throw createConflictError("Username already exists.");
  }
};

const registerUser = async (payload, actor) => {
  const validatedPayload = validateRegistrationPayload(payload);
  const program = await programModel.findProgramById(validatedPayload.programId);
  const isAdminRegistration = Boolean(actor);

  if (!program) {
    throw createValidationError("Selected program does not exist.");
  }

  if (validatedPayload.studentNo) {
    const existingStudentNo = await userModel.findUserByStudentNo(
      validatedPayload.studentNo
    );

    if (existingStudentNo) {
      throw createConflictError("Student no. already exists.");
    }
  }

  try {
    const user = await userModel.createUser({
      contactNo: validatedPayload.contactNo,
      email: validatedPayload.email,
      firstname: validatedPayload.firstName,
      honorifics: validatedPayload.honorifics,
      isVerified: isAdminRegistration,
      lastname: validatedPayload.lastName,
      middlename: validatedPayload.middleName,
      password: hashPassword(validatedPayload.password),
      program: program.program_name,
      studentNo: validatedPayload.studentNo,
      userType: validatedPayload.userType,
      username: validatedPayload.username
    });

    if (isAdminRegistration) {
      return buildApiResponse(
        {
          emailSent: false,
          requiresEmailVerification: false,
          user
        },
        "User registered successfully"
      );
    }

    const emailSent = await sendFreshEmailVerificationOtp(user);

    return buildApiResponse(
      {
        emailSent,
        requiresEmailVerification: true,
        user
      },
      emailSent
        ? "Registration successful. Check your email for the verification code."
        : "Registration successful, but we could not send the verification code. Please request a new OTP."
    );
  } catch (error) {
    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "Email, username, or student no. already exists.";
    }

    throw error;
  }
};

const getUsers = async (query = {}) => {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || 10, 1), 10);
  const search = normalizeString(query.search);
  const classification = normalizeString(query.classification);
  const status = normalizeString(query.status);
  const validStatus = ["", "active", "inactive"].includes(status) ? status : "";
  const offset = (page - 1) * limit;
  const [{ rows, total }, programs, roles] = await Promise.all([
    userModel.findUsers({
      classification,
      limit,
      offset,
      search,
      status: validStatus
    }),
    programModel.findActivePrograms(),
    roleModel.findActiveRoles()
  ]);

  return buildApiResponse({
    pagination: {
      limit,
      page,
      total,
      totalPages: Math.max(Math.ceil(total / limit), 1)
    },
    programs,
    roles,
    users: rows
  });
};

const getRoles = async () => {
  const roles = await roleModel.findActiveRoles();

  return buildApiResponse(roles);
};

const getUserRoles = async (userId) => {
  const normalizedUserId = normalizeString(userId);

  if (!normalizedUserId) {
    throw createValidationError("User ID is required.");
  }

  const user = await userModel.findUserById(normalizedUserId);

  if (!user) {
    throw createNotFoundError("User not found.");
  }

  const roleIds = await userRoleModel.findRoleIdsByUserId(normalizedUserId);

  return buildApiResponse({ roleIds });
};

const resendEmailVerificationOtp = async ({ userId }) => {
  const normalizedUserId = normalizeString(userId);

  if (!normalizedUserId) {
    throw createValidationError("User ID is required.");
  }

  const user = await userModel.findUserById(normalizedUserId);

  if (!user) {
    throw createNotFoundError("User not found.");
  }

  if (user.is_verified) {
    throw createForbiddenError("This account is already verified.");
  }

  const emailSent = await sendFreshEmailVerificationOtp(user);

  return buildApiResponse(
    {
      emailSent,
      userId: user.user_id
    },
    emailSent
      ? "A new verification code has been sent."
      : "A new OTP was generated, but the email could not be sent."
  );
};

const verifyEmailVerificationOtp = async ({ otp, userId }) => {
  const normalizedOtp = normalizeString(otp);
  const normalizedUserId = normalizeString(userId);

  if (!normalizedUserId) {
    throw createValidationError("User ID is required.");
  }

  if (!otpPattern.test(normalizedOtp)) {
    throw createValidationError("Enter a valid 6-digit OTP.");
  }

  const user = await userModel.findUserById(normalizedUserId);

  if (!user) {
    throw createNotFoundError("User not found.");
  }

  if (user.is_verified) {
    return buildApiResponse(user, "Email already verified.");
  }

  const activeOtp =
    await emailVerificationOtpModel.findLatestActiveEmailVerificationOtp(
      normalizedUserId
    );

  if (!activeOtp) {
    throw createForbiddenError(
      "No active verification code found. Please request a new OTP."
    );
  }

  if (new Date(activeOtp.expires_at).getTime() < Date.now()) {
    await emailVerificationOtpModel.invalidateActiveEmailVerificationOtps(
      normalizedUserId
    );
    throw createForbiddenError("OTP has expired. Please request a new code.");
  }

  if (!verifyPassword(normalizedOtp, activeOtp.otp_hash)) {
    await emailVerificationOtpModel.incrementEmailVerificationOtpAttempts(
      activeOtp.id
    );
    throw createValidationError("Incorrect OTP. Please try again.");
  }

  await emailVerificationOtpModel.markEmailVerificationOtpUsed(activeOtp.id);
  const verifiedUser = await userModel.setUserEmailVerified(normalizedUserId);

  return buildApiResponse(verifiedUser, "Email verified successfully.");
};

const updateUser = async (userId, payload, actor) => {
  const existingUser = await userModel.findUserById(userId);

  if (!existingUser) {
    const error = new Error("User not found.");
    error.statusCode = 404;
    throw error;
  }

  const validatedPayload = validateUserProfilePayload(payload);
  const program = await programModel.findProgramByName(validatedPayload.program);

  if (!program) {
    throw createValidationError("Selected program does not exist.");
  }

  if (validatedPayload.roleIds && validatedPayload.roleIds.length > 0) {
    const roles = await roleModel.findRolesByIds(validatedPayload.roleIds);

    if (roles.length !== validatedPayload.roleIds.length) {
      throw createValidationError("One or more selected roles are invalid.");
    }
  }

  await ensureUniqueUserFields(
    {
      email: validatedPayload.email,
      studentNo: validatedPayload.studentNo,
      username: validatedPayload.username
    },
    userId
  );

  const client = await getPool().connect();

  try {
    await client.query("BEGIN");

    const user = await userModel.updateUser(
      {
        contactNo: validatedPayload.contactNo,
        email: validatedPayload.email,
        firstname: validatedPayload.firstName,
        honorifics: validatedPayload.honorifics,
        isActive: validatedPayload.isActive,
        lastname: validatedPayload.lastName,
        middlename: validatedPayload.middleName,
        program: program.program_name,
        studentNo: validatedPayload.studentNo,
        userId,
        userType: validatedPayload.userType,
        username: validatedPayload.username
      },
      client
    );

    if (validatedPayload.roleIds) {
      await userRoleModel.syncUserRoles(
        {
          assignedBy: actor?.user_id ?? null,
          roleIds: validatedPayload.roleIds,
          userId
        },
        client
      );
    }

    await client.query("COMMIT");

    return buildApiResponse(
      {
        ...user,
        role_ids:
          validatedPayload.roleIds ??
          (await userRoleModel.findRoleIdsByUserId(userId))
      },
      "User updated successfully"
    );
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      error.statusCode = 409;
      error.message = "Email, username, or student no. already exists.";
    }

    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getRoles,
  getUserRoles,
  getUsers,
  registerUser,
  resendEmailVerificationOtp,
  updateUser,
  verifyEmailVerificationOtp
};
