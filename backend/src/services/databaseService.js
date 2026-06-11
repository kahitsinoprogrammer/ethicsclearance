const fs = require("fs/promises");
const path = require("path");

const {
  connectDatabase,
  getPool,
  isDatabaseConfigured,
  query
} = require("../config/database");

const schemaFileNames = [
  "create_forms_schema.sql",
  "create_form_applications_schema.sql",
  "drop_timestamp_defaults.sql"
];

const readSchemaFile = async (fileName) => {
  const filePath = path.resolve(__dirname, "../../sql", fileName);

  return fs.readFile(filePath, "utf8");
};

const runSchemaMigrations = async () => {
  const client = await getPool().connect();

  try {
    for (const fileName of schemaFileNames) {
      const sql = await readSchemaFile(fileName);

      if (!sql.trim()) {
        continue;
      }

      await client.query(sql);
    }
  } finally {
    client.release();
  }
};

const initializeDatabase = async () => {
  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      status: "not_configured"
    };
  }

  await connectDatabase();
  await runSchemaMigrations();

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
  initializeDatabase,
  runSchemaMigrations
};
