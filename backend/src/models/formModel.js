const { query } = require("../config/database");
const { getCreateAndUpdateTimestamps } = require("../utils/time");

const executeQuery = (dbClient, text, params = []) => {
  if (dbClient) {
    return dbClient.query(text, params);
  }

  return query(text, params);
};

const createForm = async (
  { createdBy, description, formName, isActive },
  dbClient
) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO forms (
        form_name,
        description,
        is_active,
        created_by,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING
        form_id,
        form_name,
        description,
        is_active,
        created_by,
        created_at,
        updated_at
    `,
    [formName, description, isActive, createdBy, createdAt, updatedAt]
  );

  return result.rows[0] || null;
};

const updateForm = async (
  { description, formId, formName, isActive },
  dbClient
) => {
  const { updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      UPDATE forms
      SET
        form_name = $1,
        description = $2,
        is_active = $3,
        updated_at = $4
      WHERE form_id = $5
      RETURNING
        form_id,
        form_name,
        description,
        is_active,
        created_by,
        created_at,
        updated_at
    `,
    [formName, description, isActive, updatedAt, formId]
  );

  return result.rows[0] || null;
};

const createSection = async (
  { description, formId, isActive, sectionName, sortOrder },
  dbClient
) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO form_sections (
        form_id,
        section_name,
        description,
        sort_order,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        section_id,
        form_id,
        section_name,
        description,
        sort_order,
        is_active,
        created_at,
        updated_at
    `,
    [formId, sectionName, description, sortOrder, isActive, createdAt, updatedAt]
  );

  return result.rows[0] || null;
};

const createQuestion = async (
  {
    createdBy,
    hasComment,
    isActive,
    isRequired,
    questionText,
    questionType,
    sectionId,
    sortOrder
  },
  dbClient
) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO form_questions (
        section_id,
        question_text,
        question_type,
        has_comment,
        is_required,
        is_active,
        sort_order,
        created_by,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING
        question_id,
        section_id,
        question_text,
        question_type,
        has_comment,
        is_required,
        is_active,
        sort_order,
        created_by,
        created_at,
        updated_at
    `,
    [
      sectionId,
      questionText,
      questionType,
      hasComment,
      isRequired,
      isActive,
      sortOrder,
      createdBy,
      createdAt,
      updatedAt
    ]
  );

  return result.rows[0] || null;
};

const createQuestionOption = async (
  { isActive, optionLabel, optionValue, questionId, sortOrder },
  dbClient
) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO form_question_options (
        question_id,
        option_label,
        option_value,
        sort_order,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING
        option_id,
        question_id,
        option_label,
        option_value,
        sort_order,
        is_active,
        created_at,
        updated_at
    `,
    [questionId, optionLabel, optionValue, sortOrder, isActive, createdAt, updatedAt]
  );

  return result.rows[0] || null;
};

const createSignatory = async (
  { description, formId, isActive, isRequired, positionName, sortOrder },
  dbClient
) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO form_signatories (
        form_id,
        position_name,
        description,
        sort_order,
        is_required,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        signatory_id,
        form_id,
        position_name,
        description,
        sort_order,
        is_required,
        is_active,
        created_at,
        updated_at
    `,
    [
      formId,
      positionName,
      description,
      sortOrder,
      isRequired,
      isActive,
      createdAt,
      updatedAt
    ]
  );

  return result.rows[0] || null;
};

const deleteSectionsByFormId = async (formId, dbClient) => {
  await executeQuery(
    dbClient,
    `
      DELETE FROM form_sections
      WHERE form_id = $1
    `,
    [formId]
  );
};

const deleteSignatoriesByFormId = async (formId, dbClient) => {
  await executeQuery(
    dbClient,
    `
      DELETE FROM form_signatories
      WHERE form_id = $1
    `,
    [formId]
  );
};

const findAllForms = async ({ limit, offset, search, status }) => {
  const whereClauses = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    whereClauses.push(`
      (
        f.form_name ILIKE $${params.length}
        OR COALESCE(f.description, '') ILIKE $${params.length}
      )
    `);
  }

  if (status !== "") {
    params.push(status === "active");
    whereClauses.push(`f.is_active = $${params.length}`);
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM forms f
      ${whereSql}
    `,
    params
  );

  const result = await query(
    `
      SELECT
        f.form_id,
        f.form_name,
        f.description,
        f.is_active,
        f.created_by,
        f.created_at,
        f.updated_at,
        NULLIF(
          TRIM(
            CONCAT_WS(
              ' ',
              creator.firstname,
              creator.middlename,
              creator.lastname
            )
          ),
          ''
        ) AS created_by_name,
        COALESCE(section_totals.section_count, 0) AS section_count,
        COALESCE(question_totals.question_count, 0) AS question_count
      FROM forms f
      LEFT JOIN users creator
        ON creator.user_id = f.created_by
      LEFT JOIN (
        SELECT
          fs.form_id,
          COUNT(*)::int AS section_count
        FROM form_sections fs
        GROUP BY fs.form_id
      ) AS section_totals
        ON section_totals.form_id = f.form_id
      LEFT JOIN (
        SELECT
          fs.form_id,
          COUNT(fq.question_id)::int AS question_count
        FROM form_sections fs
        LEFT JOIN form_questions fq
          ON fq.section_id = fs.section_id
        GROUP BY fs.form_id
      ) AS question_totals
        ON question_totals.form_id = f.form_id
      ${whereSql}
      ORDER BY f.created_at DESC, f.form_name ASC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    rows: result.rows,
    total: countResult.rows[0].total
  };
};

const findFormById = async (formId, dbClient) => {
  const result = await executeQuery(
    dbClient,
    `
      SELECT
        f.form_id,
        f.form_name,
        f.description,
        f.is_active,
        f.created_by,
        f.created_at,
        f.updated_at,
        NULLIF(
          TRIM(
            CONCAT_WS(
              ' ',
              creator.firstname,
              creator.middlename,
              creator.lastname
            )
          ),
          ''
        ) AS created_by_name
      FROM forms f
      LEFT JOIN users creator
        ON creator.user_id = f.created_by
      WHERE f.form_id = $1
      LIMIT 1
    `,
    [formId]
  );

  return result.rows[0] || null;
};

const findFormSections = async (formId, dbClient) => {
  const result = await executeQuery(
    dbClient,
    `
      SELECT
        section_id,
        form_id,
        section_name,
        description,
        sort_order,
        is_active,
        created_at,
        updated_at
      FROM form_sections
      WHERE form_id = $1
      ORDER BY sort_order ASC, created_at ASC, section_id ASC
    `,
    [formId]
  );

  return result.rows;
};

const findFormQuestions = async (formId, dbClient) => {
  const result = await executeQuery(
    dbClient,
    `
      SELECT
        fq.question_id,
        fq.section_id,
        fq.question_text,
        fq.question_type,
        fq.has_comment,
        fq.is_required,
        fq.is_active,
        fq.sort_order,
        fq.created_by,
        fq.created_at,
        fq.updated_at
      FROM form_questions fq
      INNER JOIN form_sections fs
        ON fs.section_id = fq.section_id
      WHERE fs.form_id = $1
      ORDER BY fq.sort_order ASC, fq.created_at ASC, fq.question_id ASC
    `,
    [formId]
  );

  return result.rows;
};

const findQuestionOptionsByFormId = async (formId, dbClient) => {
  const result = await executeQuery(
    dbClient,
    `
      SELECT
        fqo.option_id,
        fqo.question_id,
        fqo.option_label,
        fqo.option_value,
        fqo.sort_order,
        fqo.is_active,
        fqo.created_at,
        fqo.updated_at
      FROM form_question_options fqo
      INNER JOIN form_questions fq
        ON fq.question_id = fqo.question_id
      INNER JOIN form_sections fs
        ON fs.section_id = fq.section_id
      WHERE fs.form_id = $1
      ORDER BY fqo.sort_order ASC, fqo.created_at ASC, fqo.option_id ASC
    `,
    [formId]
  );

  return result.rows;
};

const findFormSignatories = async (formId, dbClient) => {
  const result = await executeQuery(
    dbClient,
    `
      SELECT
        signatory_id,
        form_id,
        position_name,
        description,
        sort_order,
        is_required,
        is_active,
        created_at,
        updated_at
      FROM form_signatories
      WHERE form_id = $1
      ORDER BY sort_order ASC, created_at ASC, signatory_id ASC
    `,
    [formId]
  );

  return result.rows;
};

module.exports = {
  createForm,
  createQuestion,
  createQuestionOption,
  createSection,
  createSignatory,
  deleteSectionsByFormId,
  deleteSignatoriesByFormId,
  findAllForms,
  findFormById,
  findFormQuestions,
  findFormSections,
  findFormSignatories,
  findQuestionOptionsByFormId,
  updateForm
};
