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

const activeRoleAssignmentsJoin = `
  LEFT JOIN (
    SELECT
      ur.user_id,
      array_agg(ur.role_id ORDER BY ur.assigned_at ASC, ur.user_role_id ASC) AS role_ids,
      array_agg(r.role_code ORDER BY ur.assigned_at ASC, ur.user_role_id ASC) AS role_codes
    FROM user_roles ur
    INNER JOIN roles r
      ON r.role_id = ur.role_id
    WHERE ur.status = 'active'
      AND r.is_active = TRUE
    GROUP BY ur.user_id
  ) AS active_role_assignments
    ON active_role_assignments.user_id = u.user_id
`;

const createUser = async ({
  contactNo,
  email,
  firstname,
  honorifics,
  isVerified = false,
  lastname,
  middlename,
  password,
  program,
  studentNo,
  userType,
  username
},
dbClient) => {
  const { createdAt, updatedAt } = getCreateAndUpdateTimestamps();

  const result = await executeQuery(
    dbClient,
    `
      INSERT INTO users (
        firstname,
        middlename,
        lastname,
        contact_no,
        student_no,
        email,
        honorifics,
        program,
        user_type,
        is_verified,
        password,
        username,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING
        user_id,
        firstname,
        middlename,
        lastname,
        contact_no,
        student_no,
        email,
        is_active,
        is_verified,
        honorifics,
        program,
        user_type,
        username,
        created_at,
        updated_at
    `,
    [
      firstname,
      middlename || null,
      lastname,
      contactNo,
      studentNo || null,
      email,
      honorifics,
      program,
      userType,
      isVerified,
      password,
      username,
      createdAt,
      updatedAt
    ]
  );

  return result.rows[0];
};

const findUserByUsername = async (username) => {
  const result = await query(
    `
      SELECT
        u.user_id,
        u.firstname,
        u.middlename,
        u.lastname,
        u.contact_no,
        u.student_no,
        u.email,
        u.is_active,
        u.is_verified,
        u.honorifics,
        u.program,
        u.user_type,
        u.password,
        u.username,
        COALESCE(active_role_assignments.role_ids, ARRAY[]::uuid[]) AS role_ids,
        COALESCE(active_role_assignments.role_codes, ARRAY[]::text[]) AS role_codes,
        u.created_at,
        u.updated_at
      FROM users u
      ${activeRoleAssignmentsJoin}
      WHERE u.username = $1
      LIMIT 1
    `,
    [username]
  );

  return result.rows[0] || null;
};

const findUserById = async (userId) => {
  const result = await query(
    `
      SELECT
        u.user_id,
        u.firstname,
        u.middlename,
        u.lastname,
        u.contact_no,
        u.student_no,
        u.email,
        u.is_active,
        u.is_verified,
        u.honorifics,
        u.program,
        u.user_type,
        u.username,
        COALESCE(active_role_assignments.role_ids, ARRAY[]::uuid[]) AS role_ids,
        COALESCE(active_role_assignments.role_codes, ARRAY[]::text[]) AS role_codes,
        u.created_at,
        u.updated_at
      FROM users u
      ${activeRoleAssignmentsJoin}
      WHERE u.user_id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const findUserByStudentNo = async (studentNo) => {
  const result = await query(
    `
      SELECT
        user_id,
        student_no
      FROM users
      WHERE student_no = $1
      LIMIT 1
    `,
    [studentNo]
  );

  return result.rows[0] || null;
};

const findUserByEmail = async (email) => {
  const result = await query(
    `
      SELECT
        user_id,
        email
      FROM users
      WHERE email = $1
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] || null;
};

const findUsers = async ({ classification, limit, offset, search, status }) => {
  const whereClauses = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    whereClauses.push(`
      (
        u.firstname ILIKE $${params.length}
        OR u.middlename ILIKE $${params.length}
        OR u.lastname ILIKE $${params.length}
        OR u.email ILIKE $${params.length}
        OR u.username ILIKE $${params.length}
        OR u.student_no ILIKE $${params.length}
        OR u.program ILIKE $${params.length}
      )
    `);
  }

  if (classification) {
    params.push(classification);
    whereClauses.push(`u.user_type = $${params.length}`);
  }

  if (status !== "") {
    params.push(status === "active");
    whereClauses.push(`u.is_active = $${params.length}`);
  }

  const whereSql = whereClauses.length
    ? `WHERE ${whereClauses.join(" AND ")}`
    : "";

  const countResult = await query(
    `
      SELECT COUNT(*)::int AS total
      FROM users u
      ${whereSql}
    `,
    params
  );

  const result = await query(
    `
      SELECT
        u.user_id,
        u.firstname,
        u.middlename,
        u.lastname,
        u.contact_no,
        u.student_no,
        u.email,
        u.is_active,
        u.is_verified,
        u.honorifics,
        u.program,
        u.user_type,
        u.username,
        COALESCE(user_role_assignments.role_ids, ARRAY[]::uuid[]) AS role_ids,
        COALESCE(user_role_assignments.role_codes, ARRAY[]::text[]) AS role_codes,
        u.created_at,
        u.updated_at
      FROM users u
      LEFT JOIN (
        SELECT
          ur.user_id,
          array_agg(ur.role_id ORDER BY ur.assigned_at ASC, ur.user_role_id ASC) AS role_ids,
          array_agg(r.role_code ORDER BY ur.assigned_at ASC, ur.user_role_id ASC) AS role_codes
        FROM user_roles ur
        INNER JOIN roles r
          ON r.role_id = ur.role_id
        WHERE ur.status = 'active'
          AND r.is_active = TRUE
        GROUP BY ur.user_id
      ) AS user_role_assignments
        ON user_role_assignments.user_id = u.user_id
      ${whereSql}
      ORDER BY u.created_at DESC
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

const findActiveUsersByRoleCode = async (roleCode) => {
  const result = await query(
    `
      SELECT DISTINCT
        u.user_id,
        u.firstname,
        u.middlename,
        u.lastname,
        u.email,
        u.program,
        u.user_type,
        u.username,
        NULLIF(
          TRIM(
            CONCAT_WS(
              ' ',
              u.firstname,
              u.middlename,
              u.lastname
            )
          ),
          ''
        ) AS display_name
      FROM users u
      INNER JOIN user_roles ur
        ON ur.user_id = u.user_id
      INNER JOIN roles r
        ON r.role_id = ur.role_id
      WHERE u.is_active = TRUE
        AND u.is_verified = TRUE
        AND ur.status = 'active'
        AND r.is_active = TRUE
        AND r.role_code = $1
      ORDER BY display_name ASC, u.email ASC
    `,
    [roleCode]
  );

  return result.rows;
};

const updateUser = async ({
  contactNo,
  email,
  firstname,
  honorifics,
  isActive,
  lastname,
  middlename,
  program,
  studentNo,
  userId,
  userType,
  username
}, dbClient) => {
  const updatedAt = getCurrentTimestamp();

  const result = await executeQuery(
    dbClient,
    `
      UPDATE users
      SET
        firstname = $1,
        middlename = $2,
        lastname = $3,
        contact_no = $4,
        student_no = $5,
        email = $6,
        honorifics = $7,
        program = $8,
        user_type = $9,
        username = $10,
        is_active = $11,
        updated_at = $12
      WHERE user_id = $13
      RETURNING
        user_id,
        firstname,
        middlename,
        lastname,
        contact_no,
        student_no,
        email,
        is_active,
        is_verified,
        honorifics,
        program,
        user_type,
        username,
        created_at,
        updated_at
    `,
    [
      firstname,
      middlename || null,
      lastname,
      contactNo,
      studentNo,
      email,
      honorifics,
      program,
      userType,
      username,
      isActive,
      updatedAt,
      userId
    ]
  );

  return result.rows[0] || null;
};

const setUserEmailVerified = async (userId) => {
  const updatedAt = getCurrentTimestamp();

  const result = await query(
    `
      UPDATE users
      SET
        is_verified = TRUE,
        updated_at = $1
      WHERE user_id = $2
      RETURNING
        user_id,
        firstname,
        middlename,
        lastname,
        contact_no,
        student_no,
        email,
        is_active,
        is_verified,
        honorifics,
        program,
        user_type,
        username,
        created_at,
        updated_at
    `,
    [updatedAt, userId]
  );

  return result.rows[0] || null;
};

module.exports = {
  createUser,
  findActiveUsersByRoleCode,
  findUserByEmail,
  findUserById,
  findUserByStudentNo,
  findUserByUsername,
  findUsers,
  setUserEmailVerified,
  updateUser
};
