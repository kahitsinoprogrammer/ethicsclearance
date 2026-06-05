const buildApiResponse = (data, message = "Request successful") => {
  return {
    success: true,
    message,
    data
  };
};

module.exports = {
  buildApiResponse
};
