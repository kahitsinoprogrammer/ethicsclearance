const {
  closeDatabaseConnection,
  isDatabaseConfigured
} = require("../src/config/database");
const { runSchemaMigrations } = require("../src/services/databaseService");

const migrate = async () => {
  try {
    if (!isDatabaseConfigured()) {
      throw new Error(
        "PostgreSQL is not configured. Set DATABASE_URL or the DB_* environment variables first."
      );
    }

    await runSchemaMigrations();
    console.log("Database schema is up to date.");
  } catch (error) {
    console.error("Database migration failed.");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await closeDatabaseConnection();
  }
};

migrate();
