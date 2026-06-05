const programService = require("../services/programService");

const getPrograms = async (_req, res, next) => {
  try {
    const payload = await programService.getActivePrograms();

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const getAllPrograms = async (req, res, next) => {
  try {
    const payload = await programService.getAllPrograms(req.query);

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

const createProgram = async (req, res, next) => {
  try {
    const payload = await programService.createProgram(req.body);

    res.status(201).json(payload);
  } catch (error) {
    next(error);
  }
};

const updateProgram = async (req, res, next) => {
  try {
    const payload = await programService.updateProgram(
      req.params.programId,
      req.body
    );

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createProgram,
  getAllPrograms,
  getPrograms,
  updateProgram
};
