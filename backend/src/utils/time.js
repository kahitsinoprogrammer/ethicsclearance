const getCurrentTimestamp = () => {
  return new Date();
};

const getCreateAndUpdateTimestamps = () => {
  const timestamp = getCurrentTimestamp();

  return {
    createdAt: timestamp,
    updatedAt: timestamp
  };
};

module.exports = {
  getCreateAndUpdateTimestamps,
  getCurrentTimestamp
};
