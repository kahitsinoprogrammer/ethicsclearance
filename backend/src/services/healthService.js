const healthModel = require("../models/healthModel");
const databaseService = require("./databaseService");
const { buildApiResponse } = require("../utils/response");

const getHealthStatus = async () => {
  const database = await databaseService.getDatabaseHealth();
  const healthRecord = healthModel.buildHealthRecord({ database });

  return buildApiResponse({
    ...healthRecord,
    uptimeInSeconds: Number(process.uptime().toFixed(2)),
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  getHealthStatus
};
