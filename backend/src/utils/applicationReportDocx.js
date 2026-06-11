const fs = require("fs/promises");
const path = require("path");

const AdmZip = require("adm-zip");

const REPORT_TEMPLATE_FILE_NAME = "2026-000-GSREC-Form-3-DELA-CRUZ-PROGRAM.docx";
const REPORT_TEMPLATE_PATH = path.resolve(
  __dirname,
  "../../templates",
  REPORT_TEMPLATE_FILE_NAME
);
const REPORT_TITLE_PLACEHOLDER = "THESIS / DISSERTATION TITLE";
const DEFAULT_REPORT_TITLE = "Not provided";

const escapeXmlText = (value) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

const normalizeReportTitle = (value) => {
  if (typeof value !== "string") {
    return DEFAULT_REPORT_TITLE;
  }

  const normalizedValue = value.replace(/\s+/g, " ").trim();

  return normalizedValue || DEFAULT_REPORT_TITLE;
};

const createApplicationReportDocx = async (researchTitle) => {
  const templateBuffer = await fs.readFile(REPORT_TEMPLATE_PATH);
  const zip = new AdmZip(templateBuffer);
  const documentEntry = zip.getEntry("word/document.xml");

  if (!documentEntry) {
    throw new Error("The report template is missing word/document.xml.");
  }

  const documentXml = zip.readAsText(documentEntry);

  if (!documentXml.includes(REPORT_TITLE_PLACEHOLDER)) {
    throw new Error("The report template is missing the thesis title placeholder.");
  }

  const updatedDocumentXml = documentXml.replace(
    REPORT_TITLE_PLACEHOLDER,
    escapeXmlText(normalizeReportTitle(researchTitle))
  );

  zip.updateFile(documentEntry.entryName, Buffer.from(updatedDocumentXml, "utf8"));

  return zip.toBuffer();
};

module.exports = {
  createApplicationReportDocx,
  REPORT_TEMPLATE_FILE_NAME
};
