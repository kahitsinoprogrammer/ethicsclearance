const { query } = require("../config/database");
const { getCurrentTimestamp } = require("../utils/time");

const ACTIVE_STATUS = "active";
const INACTIVE_STATUS = "inactive";

const executeQuery = (dbClient, text, params = []) => {
  if (dbClient) {
    return dbClient.query(text, params);
  }

  return query(text, params);
};

const findRoleIdsByUserId = async (userId) => {
  const result = await query(
    `
      SELECT role_id
      FROM user_roles
      WHERE user_id = $1
        AND status = $2
      ORDER BY assigned_at ASC, user_role_id ASC
    `,
    [userId, ACTIVE_STATUS]
  );

  return result.rows.map((row) => row.role_id);
};

const syncUserRoles = async ({ assignedBy, roleIds, userId }, dbClient) => {
  const normalizedRoleIds = Array.from(new Set(roleIds));
  const assignedAt = getCurrentTimestamp();

  if (normalizedRoleIds.length === 0) {
    await executeQuery(
      dbClient,
      `
        UPDATE user_roles
        SET status = $2
        WHERE user_id = $1
          AND status = $3
      `,
      [userId, INACTIVE_STATUS, ACTIVE_STATUS]
    );

    return;
  }

  await executeQuery(
    dbClient,
    `
      UPDATE user_roles
      SET
        status = $3,
        assigned_by = $4,
        assigned_at = $5
      WHERE user_id = $1
        AND role_id = ANY($2::uuid[])
        AND status <> $3
    `,
    [
      userId,
      normalizedRoleIds,
      ACTIVE_STATUS,
      assignedBy || null,
      assignedAt
    ]
  );

  await executeQuery(
    dbClient,
    `
      INSERT INTO user_roles (
        user_id,
        role_id,
        assigned_by,
        assigned_at,
        status
      )
      SELECT
        $1,
        role_id,
        $3,
        $4,
        $5
      FROM unnest($2::uuid[]) AS role_id
      ON CONFLICT (user_id, role_id) DO NOTHING
    `,
    [
      userId,
      normalizedRoleIds,
      assignedBy || null,
      assignedAt,
      ACTIVE_STATUS
    ]
  );

  await executeQuery(
    dbClient,
    `
      UPDATE user_roles
      SET status = $3
      WHERE user_id = $1
        AND NOT (role_id = ANY($2::uuid[]))
        AND status = $4
    `,
    [userId, normalizedRoleIds, INACTIVE_STATUS, ACTIVE_STATUS]
  );
};

module.exports = {
  findRoleIdsByUserId,
  syncUserRoles
};
