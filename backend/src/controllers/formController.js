const formService = require("../services/formService");

const getAllForms = async (req, res, next) => {
  try {
    const payload = await formService.getAllForms(req.query);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const getFormById = async (req, res, next) => {
  try {
    const payload = await formService.getFormById(req.params.formId);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const createForm = async (req, res, next) => {
  try {
    const payload = await formService.createForm(req.body, req.user);

    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};

const updateForm = async (req, res, next) => {
  try {
    const payload = await formService.updateForm(
      req.params.formId,
      req.body,
      req.user
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createForm,
  getAllForms,
  getFormById,
  updateForm
};
