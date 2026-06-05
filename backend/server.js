const app = require("./src/app");
const env = require("./src/config/env");
const databaseService = require("./src/services/databaseService");

const startServer = async () => {
  try {
    const databaseState = await databaseService.initializeDatabase();

    if (databaseState.configured) {
      console.log("PostgreSQL connected successfully.");
    } else {
      console.log(
        "PostgreSQL is not configured yet. Update backend/.env to enable the database connection."
      );
    }

    app.listen(env.port, () => {
      console.log(`Backend server running on port ${env.port}`);
    });
  } catch (error) {
    console.error("Failed to connect to PostgreSQL.");
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
