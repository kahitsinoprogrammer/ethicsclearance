const {
  connectDatabase,
  isDatabaseConfigured,
  query
} = require("../config/database");

const ensureApplicationSchemaCompatibility = async () => {
  await query(`
    ALTER TABLE IF EXISTS form_applications
    ADD COLUMN IF NOT EXISTS google_drive_link text
  `);
};

const initializeDatabase = async () => {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      status: "not_configured"
    };
  }

  await connectDatabase();
  await ensureApplicationSchemaCompatibility();

  return {
    configured: true,
    status: "connected"
  };
};

const getDatabaseHealth = async () => {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      status: "not_configured",
      message: "Add PostgreSQL credentials to backend/.env to enable the database."
    };
  }

  const result = await query("SELECT NOW() AS database_time");

  return {
    configured: true,
    status: "connected",
    databaseTime: result.rows[0].database_time
  };
};

module.exports = {
  getDatabaseHealth,
  initializeDatabase
};
