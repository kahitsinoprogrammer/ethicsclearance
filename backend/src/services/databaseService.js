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

  await query(`
    ALTER TABLE IF EXISTS form_applications
    DROP CONSTRAINT IF EXISTS chk_form_applications_status
  `);

  await query(`
    ALTER TABLE IF EXISTS form_applications
    ADD CONSTRAINT chk_form_applications_status CHECK (
      application_status IN (
        'draft',
        'submitted',
        'under_review',
        'approved',
        'rejected',
        'cancelled',
        'withdrawn'
      )
    )
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
