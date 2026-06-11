const formApplicationService = require("../services/formApplicationService");

const listFormApplications = async (req, res, next) => {
  try {
    const payload = await formApplicationService.listFormApplications(req.user);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const listMyFormApplications = async (req, res, next) => {
  try {
    const payload = await formApplicationService.listMyFormApplications(req.user);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const listApplicationsForSignature = async (req, res, next) => {
  try {
    const payload = await formApplicationService.listApplicationsForSignature(
      req.user
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const getFormApplicationTemplate = async (req, res, next) => {
  try {
    const payload = await formApplicationService.getFormApplicationTemplate(
      req.params.formId
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const getFormApplicationDetails = async (req, res, next) => {
  try {
    const payload = await formApplicationService.getFormApplicationDetails(
      req.params.applicationId,
      req.user
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const downloadApplicationReport = async (req, res, next) => {
  try {
    const payload = await formApplicationService.downloadApplicationReport(
      req.params.applicationId,
      req.user
    );

    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition, Content-Type");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${payload.fileName}"; filename*=UTF-8''${encodeURIComponent(payload.fileName)}`
    );
    res.setHeader("Content-Type", payload.mimeType);
    res.status(200).send(payload.buffer);
  } catch (error) {
    next(error);
  }
};

const createFormApplication = async (req, res, next) => {
  try {
    const payload = await formApplicationService.createFormApplication(
      req.params.formId,
      req.body,
      req.user
    );

    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};

const updateApplicationAnswers = async (req, res, next) => {
  try {
    const payload = await formApplicationService.updateApplicationAnswers(
      req.params.applicationId,
      req.body,
      req.user
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const updateApplicationSignatories = async (req, res, next) => {
  try {
    const payload = await formApplicationService.updateApplicationSignatories(
      req.params.applicationId,
      req.body,
      req.user
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const approveApplicationSignatory = async (req, res, next) => {
  try {
    const payload = await formApplicationService.approveApplicationSignatory(
      req.params.applicationId,
      req.params.applicationSignatoryId,
      req.body,
      req.user
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const rejectApplicationSignatory = async (req, res, next) => {
  try {
    const payload = await formApplicationService.rejectApplicationSignatory(
      req.params.applicationId,
      req.params.applicationSignatoryId,
      req.body,
      req.user
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const withdrawApplication = async (req, res, next) => {
  try {
    const payload = await formApplicationService.withdrawApplication(
      req.params.applicationId,
      req.user
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  approveApplicationSignatory,
  createFormApplication,
  downloadApplicationReport,
  getFormApplicationDetails,
  getFormApplicationTemplate,
  listApplicationsForSignature,
  listMyFormApplications,
  listFormApplications,
  rejectApplicationSignatory,
  withdrawApplication,
  updateApplicationSignatories,
  updateApplicationAnswers
};
