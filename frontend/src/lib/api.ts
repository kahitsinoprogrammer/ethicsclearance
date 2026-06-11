const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";
const AUTH_TOKEN_KEY = "ethics_clearance_token";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type ErrorResponse<T = unknown> = {
  data?: T;
  message?: string;
};

type ApiRequestOptions<TBody = unknown> = {
  body?: TBody;
  method?: string;
  query?: Record<string, boolean | number | string | null | undefined>;
  token?: string;
};

type DownloadedFile = {
  blob: Blob;
  filename: string;
};

export type Program = {
  program_id: string;
  program_code: string;
  program_name: string;
};

export type ManagedProgram = Program & {
  is_active: boolean;
};

export type FormQuestionOptionRecord = {
  option_id: string;
  question_id: string;
  option_label: string;
  option_value: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FormQuestionRecord = {
  question_id: string;
  section_id: string;
  question_text: string;
  question_type: string;
  has_comment: boolean;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  options: FormQuestionOptionRecord[];
};

export type FormSectionRecord = {
  section_id: string;
  form_id: string;
  section_name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  questions: FormQuestionRecord[];
};

export type FormSignatoryRecord = {
  signatory_id: string;
  form_id: string;
  position_name: string;
  description: string | null;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ManagedFormSummary = {
  form_id: string;
  form_name: string;
  description: string | null;
  is_active: boolean;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  section_count: number;
  question_count: number;
};

export type ManagedFormDetails = ManagedFormSummary & {
  sections: FormSectionRecord[];
  signatories: FormSignatoryRecord[];
};

export type ReviewerUserRecord = {
  display_name: string | null;
  email: string;
  firstname: string;
  lastname: string;
  middlename: string | null;
  program: string | null;
  user_id: string;
  user_type: string;
  username: string;
};

export type FormApplicationTemplate = {
  form: ManagedFormDetails;
};

export type Role = {
  description: string | null;
  is_active: boolean;
  role_code: string;
  role_id: string;
  role_name: string;
};

export type AuthUser = {
  user_id: string;
  firstname: string;
  middlename: string | null;
  lastname: string;
  email: string;
  honorifics: string | null;
  is_active: boolean;
  is_verified: boolean;
  program: string | null;
  role_codes: string[];
  role_ids: string[];
  user_type: string;
  username: string;
};

export type UserRecord = AuthUser & {
  contact_no: string | null;
  created_at: string;
  is_active: boolean;
  is_verified: boolean;
  role_ids: string[];
  student_no: string | null;
  updated_at: string;
};

export type UsersPagination = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type UsersResponse = {
  pagination: UsersPagination;
  programs: Program[];
  roles: Role[];
  users: UserRecord[];
};

export type ProgramsPagination = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type ManagedProgramsResponse = {
  pagination: ProgramsPagination;
  programs: ManagedProgram[];
};

export type FormsPagination = {
  limit: number;
  page: number;
  total: number;
  totalPages: number;
};

export type ManagedFormsResponse = {
  forms: ManagedFormSummary[];
  pagination: FormsPagination;
};

export type FetchUsersParams = {
  classification?: string;
  page?: number;
  search?: string;
  status?: string;
};

export type FetchManagedProgramsParams = {
  page?: number;
  search?: string;
  status?: string;
};

export type FetchManagedFormsParams = {
  page?: number;
  search?: string;
  status?: string;
};

export type LoginPayload = {
  password: string;
  username: string;
};

export type LoginResponse = {
  token: string;
  user: AuthUser;
};

export type EmailVerificationRequiredErrorData = {
  email: string;
  emailSent: boolean;
  requiresEmailVerification: true;
  userId: string;
};

export type RegisterResponse = {
  emailSent: boolean;
  requiresEmailVerification: boolean;
  user: UserRecord;
};

export type ResendEmailVerificationOtpPayload = {
  userId: string;
};

export type ResendEmailVerificationOtpResponse = {
  emailSent: boolean;
  userId: string;
};

export type RegisterUserPayload = {
  cellphoneNumber: string;
  classification: string;
  email: string;
  firstName: string;
  honorifics: string;
  lastName: string;
  middleName?: string;
  password: string;
  programId: string;
  studentNo: string;
  username: string;
};

export type CreateProgramPayload = {
  programCode: string;
  programName: string;
  status: string;
};

export type CreateFormOptionPayload = {
  optionLabel: string;
  optionValue: string;
  sortOrder: number;
  isActive: boolean;
};

export type CreateFormQuestionPayload = {
  questionText: string;
  questionType: string;
  hasComment: boolean;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
  options: CreateFormOptionPayload[];
};

export type CreateFormSectionPayload = {
  sectionName: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  questions: CreateFormQuestionPayload[];
};

export type CreateFormSignatoryPayload = {
  positionName: string;
  description: string;
  sortOrder: number;
  isRequired: boolean;
  isActive: boolean;
};

export type CreateFormPayload = {
  formName: string;
  description: string;
  status: string;
  sections: CreateFormSectionPayload[];
  signatories: CreateFormSignatoryPayload[];
};

export type UpdateFormPayload = CreateFormPayload;

export type CreateFormApplicationSignatoryPayload = {
  signatoryId: string;
  signerUserId?: string;
};

export type CreateFormApplicationAnswerPayload = {
  answerDate?: string;
  answerNumber?: number;
  answerText?: string;
  commentText?: string;
  optionIds?: string[];
  questionId: string;
};

export type CreateFormApplicationPayload = {
  googleDriveLink: string;
  researchTitle: string;
};

export type UpdateApplicationSignatoriesPayload = {
  signatories: CreateFormApplicationSignatoryPayload[];
};

export type UpdateApplicationAnswersPayload = {
  answers: CreateFormApplicationAnswerPayload[];
};

export type SignatoryQuestionCommentPayload = {
  commentText?: string;
  questionId: string;
};

export type SignatoryDecisionPayload = {
  questionComments?: SignatoryQuestionCommentPayload[];
  remarks?: string;
};

export type FormApplicationResponse = {
  answer_count: number;
  application_id: string;
  application_status: string;
  applicant_id: string;
  form_id: string;
  form_name_snapshot: string;
  google_drive_link: string | null;
  question_count: number;
  research_title: string | null;
  reference_no: string | null;
  section_count: number;
  signatory_count: number;
  submitted_at: string | null;
};

export type ApplicationAnswerOptionRecord = {
  application_answer_option_id: string;
  application_answer_id: string;
  option_id: string | null;
  option_label_snapshot: string;
  option_value_snapshot: string;
  created_at: string;
};

export type ApplicationAnswerRecord = {
  application_answer_id: string;
  application_id: string;
  question_id: string | null;
  section_id: string | null;
  section_name_snapshot: string;
  question_text_snapshot: string;
  question_type_snapshot: string;
  answer_text: string | null;
  answer_number: number | null;
  answer_date: string | null;
  answer_json: unknown;
  comment_text: string | null;
  created_at: string;
  updated_at: string;
  selected_options: ApplicationAnswerOptionRecord[];
};

export type ApplicationSignatoryRecord = {
  application_signatory_id: string;
  application_id: string;
  signatory_id: string | null;
  position_name_snapshot: string;
  is_required: boolean;
  signer_user_id: string | null;
  signatory_status: string;
  remarks: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  signer_firstname?: string | null;
  signer_middlename?: string | null;
  signer_lastname?: string | null;
  signer_email?: string | null;
  signer_name?: string | null;
};

export type ApplicationQuestionCommentRecord = {
  application_question_comment_id: string;
  application_id: string;
  application_signatory_id: string;
  commenter_user_id: string;
  question_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  position_name_snapshot?: string | null;
  commenter_firstname?: string | null;
  commenter_middlename?: string | null;
  commenter_lastname?: string | null;
  commenter_email?: string | null;
  commenter_name?: string | null;
};

export type FormApplicationSummary = {
  application_id: string;
  form_id: string;
  applicant_id: string | null;
  application_status: string;
  google_drive_link: string | null;
  research_title: string | null;
  reference_no: string | null;
  form_name_snapshot: string;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  current_user_application_signatory_id: string | null;
  current_user_signatory_status: string | null;
  current_user_pending_signatory_count: number;
  current_user_signed_signatory_count: number;
  applicant_name: string | null;
  applicant_email: string | null;
  answer_count: number;
  required_signatory_count: number;
  signed_signatory_count: number;
  pending_signatory_count: number;
};

export type FormApplicationOptionSnapshot = {
  option_id: string;
  option_label: string;
  option_value: string;
  sort_order: number;
};

export type FormApplicationQuestionSnapshot = {
  has_comment: boolean;
  is_required: boolean;
  options: FormApplicationOptionSnapshot[];
  question_id: string;
  question_text: string;
  question_type: string;
  sort_order: number;
  answer: ApplicationAnswerRecord | null;
  question_comments: ApplicationQuestionCommentRecord[];
};

export type FormApplicationSectionSnapshot = {
  description: string | null;
  questions: FormApplicationQuestionSnapshot[];
  section_id: string;
  section_name: string;
  sort_order: number;
};

export type FormApplicationSignatorySnapshot = {
  description: string | null;
  is_required: boolean;
  position_name: string;
  signatory_id: string;
  sort_order: number;
};

export type FormApplicationDetails = {
  answer_count: number;
  applicant: {
    applicant_id: string | null;
    email: string | null;
    name: string | null;
  };
  application_id: string;
  application_status: string;
  created_at: string;
  current_user_permissions: {
    can_edit_signatories: boolean;
    can_approve: boolean;
    can_answer: boolean;
    can_withdraw: boolean;
    is_applicant: boolean;
  };
  form: {
    description: string | null;
    form_id: string;
    form_name: string;
    question_count: number;
    section_count: number;
    sections: FormApplicationSectionSnapshot[];
    signatories: FormApplicationSignatorySnapshot[];
  };
  form_id: string;
  form_name_snapshot: string;
  google_drive_link: string | null;
  research_title: string | null;
  reference_no: string | null;
  reviewers: ReviewerUserRecord[];
  signatories: ApplicationSignatoryRecord[];
  submitted_at: string | null;
  updated_at: string;
};

export type FormApplicationsResponse = {
  applications: FormApplicationSummary[];
  scope: string;
};

export type UpdateProgramPayload = {
  programCode: string;
  programName: string;
  status: string;
};

export type UpdateUserPayload = {
  cellphoneNumber: string;
  classification: string;
  email: string;
  firstName: string;
  honorifics: string;
  lastName: string;
  middleName?: string;
  program: string;
  roleIds?: string[];
  status: string;
  studentNo: string;
  username: string;
};

export type VerifyEmailVerificationOtpPayload = {
  otp: string;
  userId: string;
};

const buildRequestUrl = (
  path: string,
  query?: Record<string, boolean | number | string | null | undefined>
) => {
  const url = new URL(`${API_BASE_URL}${path}`);

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    url.searchParams.set(key, String(value));
  });

  return url.toString();
};

const parseDownloadFilename = (contentDisposition: string | null) => {
  if (!contentDisposition) {
    return null;
  }

  const encodedFileNameMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (encodedFileNameMatch?.[1]) {
    try {
      return decodeURIComponent(encodedFileNameMatch[1]);
    } catch {
      return encodedFileNameMatch[1];
    }
  }

  const fileNameMatch = contentDisposition.match(/filename="?([^"]+)"?/i);

  return fileNameMatch?.[1] || null;
};

const buildFallbackDownloadFilename = (contentType: string | null) => {
  const normalizedContentType = (contentType || "").toLowerCase();

  if (normalizedContentType.includes("wordprocessingml.document")) {
    return "download.docx";
  }

  if (normalizedContentType.includes("pdf")) {
    return "download.pdf";
  }

  if (normalizedContentType.includes("json")) {
    return "download.json";
  }

  return "download";
};

async function apiRequest<TResponse, TError = unknown, TBody = unknown>(
  path: string,
  { body, method = "GET", query, token }: ApiRequestOptions<TBody> = {}
) {
  const response = await fetch(buildRequestUrl(path, query), {
    body: body !== undefined ? JSON.stringify(body) : undefined,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { "Content-Type": "application/json" } : {})
    },
    method
  });

  const responseText = await response.text();
  const responsePayload = responseText
    ? (JSON.parse(responseText) as ApiResponse<TResponse> | ErrorResponse<TError>)
    : null;

  if (!response.ok) {
    const errorPayload = responsePayload as ErrorResponse<TError> | null;
    const error = new Error(
      errorPayload?.message || "Request failed."
    ) as Error & {
      data?: TError;
      statusCode?: number;
    };

    error.data = errorPayload?.data;
    error.statusCode = response.status;

    throw error;
  }

  return (responsePayload as ApiResponse<TResponse>).data;
}

async function downloadFileRequest(path: string, token: string): Promise<DownloadedFile> {
  const response = await fetch(buildRequestUrl(path), {
    headers: {
      Authorization: `Bearer ${token}`
    },
    method: "GET"
  });

  if (!response.ok) {
    const responseText = await response.text();
    let responsePayload: ErrorResponse | null = null;

    if (responseText) {
      try {
        responsePayload = JSON.parse(responseText) as ErrorResponse;
      } catch {
        responsePayload = {
          message: responseText
        };
      }
    }

    const error = new Error(responsePayload?.message || "Request failed.") as Error & {
      statusCode?: number;
    };

    error.statusCode = response.status;

    throw error;
  }

  const blob = await response.blob();
  const contentDisposition = response.headers.get("Content-Disposition");
  const contentType = response.headers.get("Content-Type") || blob.type;

  return {
    blob,
    filename:
      parseDownloadFilename(contentDisposition) ||
      buildFallbackDownloadFilename(contentType)
  };
}

export async function fetchPrograms() {
  return apiRequest<Program[]>("/programs");
}

export async function fetchManagedPrograms(
  token: string,
  params: FetchManagedProgramsParams = {}
) {
  return apiRequest<ManagedProgramsResponse>("/programs/manage", {
    query: {
      limit: 10,
      page: params.page ?? 1,
      search: params.search,
      status: params.status
    },
    token
  });
}

export async function fetchManagedForms(
  token: string,
  params: FetchManagedFormsParams = {}
) {
  return apiRequest<ManagedFormsResponse>("/forms/manage", {
    query: {
      limit: 10,
      page: params.page ?? 1,
      search: params.search,
      status: params.status
    },
    token
  });
}

export async function fetchFormDetails(token: string, formId: string) {
  return apiRequest<ManagedFormDetails>(`/forms/${formId}`, { token });
}

export async function fetchFormApplicationTemplate(
  token: string,
  formId: string
) {
  return apiRequest<FormApplicationTemplate>(
    `/forms/${formId}/application-template`,
    { token }
  );
}

export async function createProgram(
  token: string,
  payload: CreateProgramPayload
) {
  return apiRequest<ManagedProgram, unknown, CreateProgramPayload>("/programs", {
    body: payload,
    method: "POST",
    token
  });
}

export async function createForm(token: string, payload: CreateFormPayload) {
  return apiRequest<ManagedFormDetails, unknown, CreateFormPayload>("/forms", {
    body: payload,
    method: "POST",
    token
  });
}

export async function createFormApplication(
  token: string,
  formId: string,
  payload: CreateFormApplicationPayload
) {
  return apiRequest<
    FormApplicationResponse,
    unknown,
    CreateFormApplicationPayload
  >(`/forms/${formId}/applications`, {
    body: payload,
    method: "POST",
    token
  });
}

export async function fetchApplications(token: string) {
  return apiRequest<FormApplicationsResponse>("/applications", { token });
}

export async function fetchApplicationsForSignature(token: string) {
  return apiRequest<FormApplicationsResponse>("/applications/for-signature", {
    token
  });
}

export async function fetchMyApplications(token: string) {
  return apiRequest<FormApplicationsResponse>("/applications/my", { token });
}

export async function downloadApplicationReport(
  token: string,
  applicationId: string
) {
  return downloadFileRequest(`/applications/${applicationId}/report`, token);
}

export async function fetchApplicationDetails(
  token: string,
  applicationId: string
) {
  return apiRequest<FormApplicationDetails>(`/applications/${applicationId}`, {
    token
  });
}

export async function withdrawApplication(token: string, applicationId: string) {
  return apiRequest<FormApplicationResponse>(`/applications/${applicationId}/withdraw`, {
    method: "POST",
    token
  });
}

export async function updateApplicationAnswers(
  token: string,
  applicationId: string,
  payload: UpdateApplicationAnswersPayload
) {
  return apiRequest<
    FormApplicationResponse,
    unknown,
    UpdateApplicationAnswersPayload
  >(`/applications/${applicationId}/answers`, {
    body: payload,
    method: "PUT",
    token
  });
}

export async function updateApplicationSignatories(
  token: string,
  applicationId: string,
  payload: UpdateApplicationSignatoriesPayload
) {
  return apiRequest<
    FormApplicationResponse,
    unknown,
    UpdateApplicationSignatoriesPayload
  >(`/applications/${applicationId}/signatories`, {
    body: payload,
    method: "PUT",
    token
  });
}

export async function approveApplicationSignatory(
  token: string,
  applicationId: string,
  applicationSignatoryId: string,
  payload: SignatoryDecisionPayload = {}
) {
  return apiRequest<FormApplicationResponse, unknown, SignatoryDecisionPayload>(
    `/applications/${applicationId}/signatories/${applicationSignatoryId}/approve`,
    {
      body: payload,
      method: "POST",
      token
    }
  );
}

export async function rejectApplicationSignatory(
  token: string,
  applicationId: string,
  applicationSignatoryId: string,
  payload: SignatoryDecisionPayload = {}
) {
  return apiRequest<FormApplicationResponse, unknown, SignatoryDecisionPayload>(
    `/applications/${applicationId}/signatories/${applicationSignatoryId}/reject`,
    {
      body: payload,
      method: "POST",
      token
    }
  );
}

export async function updateForm(
  token: string,
  formId: string,
  payload: UpdateFormPayload
) {
  return apiRequest<ManagedFormDetails, unknown, UpdateFormPayload>(
    `/forms/${formId}`,
    {
      body: payload,
      method: "PUT",
      token
    }
  );
}

export async function updateProgram(
  token: string,
  programId: string,
  payload: UpdateProgramPayload
) {
  return apiRequest<ManagedProgram, unknown, UpdateProgramPayload>(
    `/programs/${programId}`,
    {
      body: payload,
      method: "PUT",
      token
    }
  );
}

export async function registerUser(
  payload: RegisterUserPayload,
  token?: string
) {
  return apiRequest<RegisterResponse, unknown, RegisterUserPayload>(
    "/users/register",
    {
      body: payload,
      method: "POST",
      token
    }
  );
}

export function getStoredToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setStoredToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export async function loginUser(
  payload: LoginPayload
): Promise<LoginResponse> {
  return apiRequest<LoginResponse, EmailVerificationRequiredErrorData, LoginPayload>(
    "/auth/login",
    {
      body: payload,
      method: "POST"
    }
  );
}

export async function fetchCurrentUser(token: string) {
  return apiRequest<AuthUser>("/auth/me", { token });
}

export async function fetchUsers(token: string, params: FetchUsersParams = {}) {
  return apiRequest<UsersResponse>("/users", {
    query: {
      classification: params.classification,
      limit: 10,
      page: params.page ?? 1,
      search: params.search,
      status: params.status
    },
    token
  });
}

export async function updateUser(
  token: string,
  userId: string,
  payload: UpdateUserPayload
) {
  return apiRequest<UserRecord, unknown, UpdateUserPayload>(
    `/users/${userId}`,
    {
      body: payload,
      method: "PUT",
      token
    }
  );
}

export async function resendEmailVerificationOtp(
  payload: ResendEmailVerificationOtpPayload
) {
  return apiRequest<
    ResendEmailVerificationOtpResponse,
    unknown,
    ResendEmailVerificationOtpPayload
  >("/users/resend-email-verification-otp", {
    body: payload,
    method: "POST"
  });
}

export async function verifyEmailVerificationOtp(
  payload: VerifyEmailVerificationOtpPayload
) {
  return apiRequest<AuthUser, unknown, VerifyEmailVerificationOtpPayload>(
    "/users/verify-email-verification-otp",
    {
      body: payload,
      method: "POST"
    }
  );
}
