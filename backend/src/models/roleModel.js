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

module.exports = {
  findActiveRoles,
  findRolesByIds
};
