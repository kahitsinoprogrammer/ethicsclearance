const { query } = require("../config/database");
const {
  getCreateAndUpdateTimestamps,
  getCurrentTimestamp
} = require("../utils/time");

const findActivePrograms = async () => {
  const result = await query(
    `
      SELECT
        program_id,
        program_code,
        program_name
      FROM programs
      WHERE is_active = TRUE
      ORDER BY program_name ASC
    `
  );

  return result.rows;
};

const findAllPrograms = async ({ limit, offset, search, status }) => {
  const whereClauses = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    whereClauses.push(`
      (
        program_code ILIKE $${params.length}
        OR program_name ILIKE $${params.length}
      )
    `);
  }

  if (status !== "") {
    params.push(status === "active");
    whereClauses.push(`is_active = $${params.length}`);
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM programs
      ${whereSql}
    `,
    params
  );

  const result = await query(
    `
      SELECT
        program_id,
        program_code,
        program_name,
        is_active
      FROM programs
      ${whereSql}
      ORDER BY program_name ASC
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

const createProgram = async ({ isActive, programCode, programName }) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await query(
    `
      INSERT INTO programs (
        program_code,
        program_name,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        program_id,
        program_code,
        program_name,
        is_active,
        created_at,
        updated_at
    `,
    [programCode, programName, isActive, createdAt, updatedAt]
  );

  return result.rows[0] || null;
};

const updateProgram = async ({ isActive, programCode, programName, programId }) => {
  const updatedAt = getCurrentTimestamp();

  const result = await query(
    `
      UPDATE programs
      SET
        program_code = $1,
        program_name = $2,
        is_active = $3,
        updated_at = $4
      WHERE program_id = $5
      RETURNING
        program_id,
        program_code,
        program_name,
        is_active,
        created_at,
        updated_at
    `,
    [programCode, programName, isActive, updatedAt, programId]
  );

  return result.rows[0] || null;
};

const findProgramById = async (programId) => {
  const result = await query(
    `
      SELECT
        program_id,
        program_code,
        program_name,
        is_active
      FROM programs
      WHERE program_id = $1
      LIMIT 1
    `,
    [programId]
  );

  return result.rows[0] || null;
};

const findProgramByCode = async (programCode) => {
  const result = await query(
    `
      SELECT
        program_id,
        program_code,
        program_name,
        is_active
      FROM programs
      WHERE program_code = $1
      LIMIT 1
    `,
    [programCode]
  );

  return result.rows[0] || null;
};

const findProgramByName = async (programName) => {
  const result = await query(
    `
      SELECT
        program_id,
        program_code,
        program_name,
        is_active
      FROM programs
      WHERE program_name = $1
      LIMIT 1
    `,
    [programName]
  );

  return result.rows[0] || null;
};

module.exports = {
  createProgram,
  findAllPrograms,
  findActivePrograms,
  findProgramByCode,
  findProgramById,
  findProgramByName,
  updateProgram
};
