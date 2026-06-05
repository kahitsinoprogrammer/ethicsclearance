const { query } = require("../config/database");
const {
  getCreateAndUpdateTimestamps,
  getCurrentTimestamp
} = require("../utils/time");

const executeQuery = (dbClient, text, params = []) => {
  if (dbClient) {
    return dbClient.query(text, params);
  }

  return query(text, params);
};

const serializeJsonValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  return typeof value === "string" ? value : JSON.stringify(value);
};

const createFormApplication = async (
  {
    applicantId,
    applicationStatus,
    formId,
    formNameSnapshot,
    formSnapshot,
    googleDriveLink,
    researchTitle,
    referenceNo,
    submittedAt
  },
  dbClient
) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO form_applications (
        form_id,
        applicant_id,
        application_status,
        research_title,
        google_drive_link,
        reference_no,
        form_name_snapshot,
        form_snapshot,
        submitted_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
      RETURNING
        application_id,
        form_id,
        applicant_id,
        application_status,
        research_title,
        google_drive_link,
        reference_no,
        form_name_snapshot,
        form_snapshot,
        submitted_at,
        created_at,
        updated_at
    `,
    [
      formId,
      applicantId,
      applicationStatus,
      researchTitle,
      googleDriveLink,
      referenceNo,
      formNameSnapshot,
      serializeJsonValue(formSnapshot),
      submittedAt,
      createdAt,
      updatedAt
    ]
  );

  return result.rows[0] || null;
};

const createApplicationAnswer = async (
  {
    answerDate,
    answerJson,
    answerNumber,
    answerText,
    applicationId,
    commentText,
    questionId,
    questionTextSnapshot,
    questionTypeSnapshot,
    sectionId,
    sectionNameSnapshot
  },
  dbClient
) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO form_application_answers (
        application_id,
        question_id,
        section_id,
        section_name_snapshot,
        question_text_snapshot,
        question_type_snapshot,
        answer_text,
        answer_number,
        answer_date,
        answer_json,
        comment_text,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13)
      RETURNING
        application_answer_id,
        application_id,
        question_id,
        section_id,
        section_name_snapshot,
        question_text_snapshot,
        question_type_snapshot,
        answer_text,
        answer_number,
        answer_date,
        answer_json,
        comment_text,
        created_at,
        updated_at
    `,
    [
      applicationId,
      questionId,
      sectionId,
      sectionNameSnapshot,
      questionTextSnapshot,
      questionTypeSnapshot,
      answerText,
      answerNumber,
      answerDate,
      serializeJsonValue(answerJson),
      commentText,
      createdAt,
      updatedAt
    ]
  );

  return result.rows[0] || null;
};

const createApplicationAnswerOption = async (
  {
    applicationAnswerId,
    optionId,
    optionLabelSnapshot,
    optionValueSnapshot
  },
  dbClient
) => {
  const createdAt = getCurrentTimestamp();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO form_application_answer_options (
        application_answer_id,
        option_id,
        option_label_snapshot,
        option_value_snapshot,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        application_answer_option_id,
        application_answer_id,
        option_id,
        option_label_snapshot,
        option_value_snapshot,
        created_at
    `,
    [
      applicationAnswerId,
      optionId,
      optionLabelSnapshot,
      optionValueSnapshot,
      createdAt
    ]
  );

  return result.rows[0] || null;
};

const createApplicationSignatory = async (
  {
    applicationId,
    isRequired,
    positionNameSnapshot,
    remarks,
    signedAt,
    signerUserId,
    signatoryId,
    signatoryStatus
  },
  dbClient
) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO form_application_signatories (
        application_id,
        signatory_id,
        position_name_snapshot,
        is_required,
        signer_user_id,
        signatory_status,
        remarks,
        signed_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        application_signatory_id,
        application_id,
        signatory_id,
        position_name_snapshot,
        is_required,
        signer_user_id,
        signatory_status,
        remarks,
        signed_at,
        created_at,
        updated_at
    `,
    [
      applicationId,
      signatoryId,
      positionNameSnapshot,
      isRequired,
      signerUserId,
      signatoryStatus,
      remarks,
      signedAt,
      createdAt,
      updatedAt
    ]
  );

  return result.rows[0] || null;
};

const deleteApplicationSignatories = async (applicationId, dbClient) => {
  await executeQuery(
    dbClient,
    `
      DELETE FROM form_application_signatories
      WHERE application_id = $1
    `,
    [applicationId]
  );
};

const deleteApplicationAnswers = async (applicationId, dbClient) => {
  await executeQuery(
    dbClient,
    `
      DELETE FROM form_application_answers
      WHERE application_id = $1
    `,
    [applicationId]
  );
};

const updateApplicationStatus = async (
  { applicationId, applicationStatus },
  dbClient
) => {
  const updatedAt = getCurrentTimestamp();

  const result = await executeQuery(
    dbClient,
    `
      UPDATE form_applications
      SET
        application_status = $1,
        updated_at = $2
      WHERE application_id = $3
      RETURNING
        application_id,
        form_id,
        applicant_id,
        application_status,
        research_title,
        google_drive_link,
        reference_no,
        form_name_snapshot,
        form_snapshot,
        submitted_at,
        created_at,
        updated_at
    `,
    [applicationStatus, updatedAt, applicationId]
  );

  return result.rows[0] || null;
};

const findApplicationById = async (applicationId, dbClient) => {
  const result = await executeQuery(
    dbClient,
    `
      SELECT
        fa.application_id,
        fa.form_id,
        fa.applicant_id,
        fa.application_status,
        fa.research_title,
        fa.google_drive_link,
        fa.reference_no,
        fa.form_name_snapshot,
        fa.form_snapshot,
        fa.submitted_at,
        fa.created_at,
        fa.updated_at,
        applicant.firstname AS applicant_firstname,
        applicant.middlename AS applicant_middlename,
        applicant.lastname AS applicant_lastname,
        applicant.email AS applicant_email,
        NULLIF(
          TRIM(
            CONCAT_WS(
              ' ',
              applicant.firstname,
              applicant.middlename,
              applicant.lastname
            )
          ),
          ''
        ) AS applicant_name
      FROM form_applications fa
      LEFT JOIN users applicant
        ON applicant.user_id = fa.applicant_id
      WHERE fa.application_id = $1
      LIMIT 1
    `,
    [applicationId]
  );

  return result.rows[0] || null;
};

const findApplicationAnswers = async (applicationId, dbClient) => {
  const result = await executeQuery(
    dbClient,
    `
      SELECT
        application_answer_id,
        application_id,
        question_id,
        section_id,
        section_name_snapshot,
        question_text_snapshot,
        question_type_snapshot,
        answer_text,
        answer_number,
        answer_date,
        answer_json,
        comment_text,
        created_at,
        updated_at
      FROM form_application_answers
      WHERE application_id = $1
      ORDER BY created_at ASC, application_answer_id ASC
    `,
    [applicationId]
  );

  return result.rows;
};

const findApplicationAnswerOptions = async (applicationId, dbClient) => {
  const result = await executeQuery(
    dbClient,
    `
      SELECT
        faao.application_answer_option_id,
        faao.application_answer_id,
        faao.option_id,
        faao.option_label_snapshot,
        faao.option_value_snapshot,
        faao.created_at
      FROM form_application_answer_options faao
      INNER JOIN form_application_answers faa
        ON faa.application_answer_id = faao.application_answer_id
      WHERE faa.application_id = $1
      ORDER BY faao.created_at ASC, faao.application_answer_option_id ASC
    `,
    [applicationId]
  );

  return result.rows;
};

const findApplicationSignatories = async (applicationId, dbClient) => {
  const result = await executeQuery(
    dbClient,
    `
      SELECT
        fas.application_signatory_id,
        fas.application_id,
        fas.signatory_id,
        fas.position_name_snapshot,
        fas.is_required,
        fas.signer_user_id,
        fas.signatory_status,
        fas.remarks,
        fas.signed_at,
        fas.created_at,
        fas.updated_at,
        signer.firstname AS signer_firstname,
        signer.middlename AS signer_middlename,
        signer.lastname AS signer_lastname,
        signer.email AS signer_email,
        NULLIF(
          TRIM(
            CONCAT_WS(
              ' ',
              signer.firstname,
              signer.middlename,
              signer.lastname
            )
          ),
          ''
        ) AS signer_name
      FROM form_application_signatories fas
      LEFT JOIN users signer
        ON signer.user_id = fas.signer_user_id
      WHERE fas.application_id = $1
      ORDER BY fas.created_at ASC, fas.application_signatory_id ASC
    `,
    [applicationId]
  );

  return result.rows;
};

const updateApplicationSignatoryStatus = async (
  {
    applicationSignatoryId,
    remarks,
    signedAt,
    signatoryStatus
  },
  dbClient
) => {
  const updatedAt = getCurrentTimestamp();

  const result = await executeQuery(
    dbClient,
    `
      UPDATE form_application_signatories
      SET
        signatory_status = $1,
        remarks = $2,
        signed_at = $3,
        updated_at = $4
      WHERE application_signatory_id = $5
      RETURNING
        application_signatory_id,
        application_id,
        signatory_id,
        position_name_snapshot,
        is_required,
        signer_user_id,
        signatory_status,
        remarks,
        signed_at,
        created_at,
        updated_at
    `,
    [signatoryStatus, remarks, signedAt, updatedAt, applicationSignatoryId]
  );

  return result.rows[0] || null;
};

const findApplicationsForUser = async ({ roleCode, userId }, dbClient) => {
  const reviewerSelectClause =
    roleCode === "PROGRAM_REVIEWER"
      ? `
        NULL::uuid AS current_user_application_signatory_id,
        CASE
          WHEN reviewer_assignments.current_user_pending_signatory_count > 0 THEN 'pending'
          WHEN reviewer_assignments.current_user_signed_signatory_count > 0 THEN 'signed'
          ELSE NULL
        END AS current_user_signatory_status,
        reviewer_assignments.current_user_pending_signatory_count,
        reviewer_assignments.current_user_signed_signatory_count,
      `
      : `
        NULL::uuid AS current_user_application_signatory_id,
        NULL::text AS current_user_signatory_status,
        0::int AS current_user_pending_signatory_count,
        0::int AS current_user_signed_signatory_count,
      `;
  const whereClause =
    roleCode === "PROGRAM_REVIEWER"
      ? `
        INNER JOIN (
          SELECT
            application_id,
            COUNT(*) FILTER (WHERE signatory_status = 'pending')::int AS current_user_pending_signatory_count,
            COUNT(*) FILTER (WHERE signatory_status = 'signed')::int AS current_user_signed_signatory_count
          FROM form_application_signatories
          WHERE signer_user_id = $1
            AND is_required = TRUE
          GROUP BY application_id
        ) AS reviewer_assignments
          ON reviewer_assignments.application_id = fa.application_id
      `
      : roleCode === "APPLICANT"
        ? `
        WHERE fa.applicant_id = $1
      `
      : "";
  const params =
    roleCode === "PROGRAM_REVIEWER" || roleCode === "APPLICANT"
      ? [userId]
      : [];

  const result = await executeQuery(
    dbClient,
    `
      SELECT
        fa.application_id,
        fa.form_id,
        fa.applicant_id,
        fa.application_status,
        fa.research_title,
        fa.google_drive_link,
        fa.reference_no,
        fa.form_name_snapshot,
        fa.submitted_at,
        fa.created_at,
        fa.updated_at,
        ${reviewerSelectClause}
        NULLIF(
          TRIM(
            CONCAT_WS(
              ' ',
              applicant.firstname,
              applicant.middlename,
              applicant.lastname
            )
          ),
          ''
        ) AS applicant_name,
        applicant.email AS applicant_email,
        COALESCE(answer_totals.answer_count, 0) AS answer_count,
        COALESCE(signatory_totals.required_signatory_count, 0) AS required_signatory_count,
        COALESCE(signatory_totals.signed_signatory_count, 0) AS signed_signatory_count,
        COALESCE(signatory_totals.pending_signatory_count, 0) AS pending_signatory_count
      FROM form_applications fa
      LEFT JOIN users applicant
        ON applicant.user_id = fa.applicant_id
      LEFT JOIN (
        SELECT
          application_id,
          COUNT(*)::int AS answer_count
        FROM form_application_answers
        GROUP BY application_id
      ) AS answer_totals
        ON answer_totals.application_id = fa.application_id
      LEFT JOIN (
        SELECT
          application_id,
          COUNT(*) FILTER (WHERE is_required = TRUE)::int AS required_signatory_count,
          COUNT(*) FILTER (
            WHERE is_required = TRUE
              AND signatory_status = 'signed'
          )::int AS signed_signatory_count,
          COUNT(*) FILTER (
            WHERE is_required = TRUE
              AND signatory_status = 'pending'
          )::int AS pending_signatory_count
        FROM form_application_signatories
        GROUP BY application_id
      ) AS signatory_totals
        ON signatory_totals.application_id = fa.application_id
      ${whereClause}
      ORDER BY fa.created_at DESC, fa.reference_no DESC NULLS LAST
    `,
    params
  );

  return result.rows;
};

module.exports = {
  createApplicationAnswer,
  createApplicationAnswerOption,
  createApplicationSignatory,
  createFormApplication,
  deleteApplicationSignatories,
  deleteApplicationAnswers,
  findApplicationAnswerOptions,
  findApplicationAnswers,
  findApplicationById,
  findApplicationSignatories,
  findApplicationsForUser,
  updateApplicationSignatoryStatus,
  updateApplicationStatus
};
