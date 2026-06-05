const buildHealthRecord = ({ database }) => {
  const status = database.status === "connected" ? "ok" : "degraded";

  return {
    service: "ethics-clearance-backend",
    status,
    database
  };
};

module.exports = {
  buildHealthRecord
};
