const { Pool } = require("pg");

const env = require("./env");

let pool;

const isDatabaseConfigured = () => {
  return Boolean(
    env.databaseUrl ||
      (env.dbHost && env.dbName && env.dbUser && env.dbPassword)
  );
};

const buildPoolConfig = () => {
  const ssl = env.dbSsl ? { rejectUnauthorized: false } : false;

  if (env.databaseUrl) {
    return {
      connectionString: env.databaseUrl,
      ssl
    };
  }

  return {
    host: env.dbHost,
    port: env.dbPort,
    database: env.dbName,
    user: env.dbUser,
    password: env.dbPassword,
    ssl
  };
};

const getPool = () => {
  if (!pool) {
    if (!isDatabaseConfigured()) {
      throw new Error(
        "PostgreSQL is not configured. Add your database settings to backend/.env."
      );
    }

    pool = new Pool(buildPoolConfig());
  }

  return pool;
};

const query = (text, params = []) => {
  return getPool().query(text, params);
};

const connectDatabase = async () => {
  const client = await getPool().connect();

  try {
    await client.query("SELECT 1");
  } finally {
    client.release();
  }
};

const closeDatabaseConnection = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};

module.exports = {
  closeDatabaseConnection,
  connectDatabase,
  getPool,
  isDatabaseConfigured,
  query
};
