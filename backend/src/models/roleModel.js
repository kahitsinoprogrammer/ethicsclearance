const { query } = require("../config/database");

const findActiveRoles = async () => {
  const result = await query(
    `
      SELECT
        role_id,
        role_code,
        role_name,
        description,
        is_active
      FROM roles
      WHERE is_active = TRUE
      ORDER BY role_name ASC
    `
  );

  return result.rows;
};

const findRolesByIds = async (roleIds) => {
  const result = await query(
    `
      SELECT
        role_id,
        role_code,
        role_name,
        description,
        is_active
      FROM roles
      WHERE role_id = ANY($1::uuid[])
        AND is_active = TRUE
    `,
    [roleIds]
  );

  return result.rows;
};

const findRoleByCode = async (roleCode) => {
  const result = await query(
    `
      SELECT
        role_id,
        role_code,
        role_name,
        description,
        is_active
      FROM roles
      WHERE role_code = $1
        AND is_active = TRUE
      LIMIT 1
    `,
    [roleCode]
  );

  return result.rows[0] || null;
};

module.exports = {
  findActiveRoles,
  findRoleByCode,
  findRolesByIds
};
