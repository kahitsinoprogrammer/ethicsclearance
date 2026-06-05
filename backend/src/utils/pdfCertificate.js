const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const PAGE_MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;
const DEFAULT_TEXT = "Not provided";

const COLORS = {
  border: [0.8, 0.8, 0.8],
  dark: [0.15, 0.15, 0.15],
  maroon: [0.5, 0, 0],
  muted: [0.38, 0.38, 0.38]
};

const clampToLatin1 = (value) => {
  return Array.from(String(value ?? ""))
    .map((character) => {
      const codePoint = character.codePointAt(0);

      if (codePoint === undefined) {
        return "";
      }

      return codePoint <= 255 ? character : "?";
    })
    .join("");
};

const normalizeWhitespace = (value, fallback = DEFAULT_TEXT) => {
  const normalizedValue = clampToLatin1(value)
    .replace(/\s+/g, " ")
    .trim();

  return normalizedValue || fallback;
};

const escapePdfText = (value) => {
  return normalizeWhitespace(value, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
};

const formatDate = (value, fallback = "Not recorded") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
};

const formatDateTime = (value, fallback = "Not recorded") => {
  if (!value) {
    return fallback;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
};

const measureCharacterWidth = (character) => {
  if (character === " ") {
    return 0.28;
  }

  if ("ilI1|".includes(character)) {
    return 0.28;
  }

  if ("MW@#%&".includes(character)) {
    return 0.92;
  }

  if ("fjrt".includes(character)) {
    return 0.36;
  }

  if (/[A-Z]/.test(character)) {
    return 0.68;
  }

  if (/[0-9]/.test(character)) {
    return 0.56;
  }

  if (/[.,:;'`]/.test(character)) {
    return 0.24;
  }

  if (/[-_/()]/.test(character)) {
    return 0.34;
  }

  if (/[a-z]/.test(character)) {
    return 0.5;
  }

  return 0.58;
};

const measureTextWidth = (text, fontSize, fontKey) => {
  const fontMultiplier =
    fontKey === "F2" ? 1.03 : fontKey === "F3" ? 0.97 : 1;

  return (
    Array.from(normalizeWhitespace(text, "")).reduce(
      (total, character) => total + measureCharacterWidth(character),
      0
    ) *
    fontSize *
    fontMultiplier
  );
};

const wrapText = (text, maxWidth, fontSize, fontKey) => {
  const normalizedText = normalizeWhitespace(text);
  const words = normalizedText.split(" ");
  const lines = [];
  let currentLine = "";

  words.forEach((word) => {
    const nextLine = currentLine ? `${currentLine} ${word}` : word;

    if (measureTextWidth(nextLine, fontSize, fontKey) <= maxWidth) {
      currentLine = nextLine;
      return;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    if (measureTextWidth(word, fontSize, fontKey) <= maxWidth) {
      currentLine = word;
      return;
    }

    let segment = "";

    Array.from(word).forEach((character) => {
      const nextSegment = `${segment}${character}`;

      if (measureTextWidth(nextSegment, fontSize, fontKey) <= maxWidth) {
        segment = nextSegment;
        return;
      }

      if (segment) {
        lines.push(segment);
      }

      segment = character;
    });

    currentLine = segment;
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length ? lines : [DEFAULT_TEXT];
};

const createPage = () => ({
  commands: []
});

const pushCommand = (page, command) => {
  page.commands.push(command);
};

const drawRect = (page, x, y, width, height, strokeColor, lineWidth = 1) => {
  const [red, green, blue] = strokeColor;
  pushCommand(
    page,
    `${red} ${green} ${blue} RG ${lineWidth} w ${x} ${y} ${width} ${height} re S`
  );
};

const drawLine = (page, startX, startY, endX, endY, strokeColor, lineWidth = 1) => {
  const [red, green, blue] = strokeColor;
  pushCommand(
    page,
    `${red} ${green} ${blue} RG ${lineWidth} w ${startX} ${startY} m ${endX} ${endY} l S`
  );
};

const drawText = (
  page,
  text,
  x,
  y,
  {
    align = "left",
    color = COLORS.dark,
    fontKey = "F1",
    fontSize = 12
  } = {}
) => {
  const lineText = normalizeWhitespace(text);
  let resolvedX = x;

  if (align === "center") {
    resolvedX = x - measureTextWidth(lineText, fontSize, fontKey) / 2;
  } else if (align === "right") {
    resolvedX = x - measureTextWidth(lineText, fontSize, fontKey);
  }

  const [red, green, blue] = color;
  pushCommand(
    page,
    `BT ${red} ${green} ${blue} rg /${fontKey} ${fontSize} Tf 1 0 0 1 ${resolvedX.toFixed(
      2
    )} ${y.toFixed(2)} Tm (${escapePdfText(lineText)}) Tj ET`
  );
};

const drawWrappedText = (
  page,
  text,
  x,
  startY,
  maxWidth,
  {
    align = "left",
    color = COLORS.dark,
    fontKey = "F1",
    fontSize = 12,
    lineHeight = 16
  } = {}
) => {
  const lines = wrapText(text, maxWidth, fontSize, fontKey);
  let currentY = startY;

  lines.forEach((line) => {
    const drawX = align === "center" ? x + maxWidth / 2 : x;
    drawText(page, line, drawX, currentY, {
      align,
      color,
      fontKey,
      fontSize
    });
    currentY -= lineHeight;
  });

  return {
    bottomY: currentY,
    height: lines.length * lineHeight,
    lines
  };
};

const drawLabelValue = (page, label, value, x, topY, width) => {
  const labelY = topY;
  const valueY = topY - 16;
  const { bottomY } = drawWrappedText(page, value, x, valueY, width, {
    color: COLORS.dark,
    fontKey: "F2",
    fontSize: 12,
    lineHeight: 15
  });

  drawText(page, label.toUpperCase(), x, labelY, {
    color: COLORS.muted,
    fontKey: "F1",
    fontSize: 9
  });

  return {
    bottomY,
    height: labelY - bottomY
  };
};

const buildStatusLabel = (signatory) => {
  if (signatory.signatory_status === "signed") {
    return `Digitally recorded on ${formatDate(signatory.signed_at)}`;
  }

  if (signatory.signatory_status === "skipped") {
    return "Optional signatory step not assigned";
  }

  if (signatory.signatory_status === "rejected") {
    return "Signatory step was marked as rejected";
  }

  if (signatory.signatory_status === "pending") {
    return "Signatory step is still pending";
  }

  return `Status: ${normalizeWhitespace(signatory.signatory_status, "Unknown")}`;
};

const drawPageFrame = (page) => {
  drawRect(
    page,
    PAGE_MARGIN - 16,
    PAGE_MARGIN - 16,
    CONTENT_WIDTH + 32,
    PAGE_HEIGHT - (PAGE_MARGIN - 16) * 2,
    COLORS.border,
    1.2
  );
  drawRect(
    page,
    PAGE_MARGIN - 6,
    PAGE_MARGIN - 6,
    CONTENT_WIDTH + 12,
    PAGE_HEIGHT - (PAGE_MARGIN - 6) * 2,
    COLORS.maroon,
    0.8
  );
  drawLine(
    page,
    PAGE_MARGIN,
    PAGE_HEIGHT - 118,
    PAGE_WIDTH - PAGE_MARGIN,
    PAGE_HEIGHT - 118,
    COLORS.maroon,
    1.4
  );
};

const drawFirstPageHeader = (page, certificate) => {
  drawPageFrame(page);
  drawText(page, "ETHICS CLEARANCE WORKSPACE", PAGE_WIDTH / 2, PAGE_HEIGHT - 74, {
    align: "center",
    color: COLORS.maroon,
    fontKey: "F1",
    fontSize: 11
  });
  drawText(page, "ETHICS CLEARANCE CERTIFICATE", PAGE_WIDTH / 2, PAGE_HEIGHT - 96, {
    align: "center",
    color: COLORS.dark,
    fontKey: "F2",
    fontSize: 24
  });
  drawText(page, "Recommendation and Certification", PAGE_WIDTH / 2, PAGE_HEIGHT - 114, {
    align: "center",
    color: COLORS.muted,
    fontKey: "F3",
    fontSize: 12
  });
  drawText(page, "Reference No.", PAGE_WIDTH - PAGE_MARGIN, PAGE_HEIGHT - 78, {
    align: "right",
    color: COLORS.muted,
    fontKey: "F1",
    fontSize: 9
  });
  drawText(
    page,
    certificate.referenceNo,
    PAGE_WIDTH - PAGE_MARGIN,
    PAGE_HEIGHT - 94,
    {
      align: "right",
      color: COLORS.dark,
      fontKey: "F2",
      fontSize: 11
    }
  );
};

const drawContinuationHeader = (page, certificate) => {
  drawPageFrame(page);
  drawText(page, "ETHICS CLEARANCE CERTIFICATE", PAGE_WIDTH / 2, PAGE_HEIGHT - 86, {
    align: "center",
    color: COLORS.dark,
    fontKey: "F2",
    fontSize: 19
  });
  drawText(page, "Recorded Signatories", PAGE_WIDTH / 2, PAGE_HEIGHT - 106, {
    align: "center",
    color: COLORS.muted,
    fontKey: "F3",
    fontSize: 11
  });
  drawText(
    page,
    `Reference No.: ${certificate.referenceNo}`,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 122,
    {
      align: "center",
      color: COLORS.muted,
      fontKey: "F1",
      fontSize: 9
    }
  );
};

const drawFooter = (page, certificate, pageNumber, pageCount) => {
  const footerY = PAGE_MARGIN - 4;
  drawLine(
    page,
    PAGE_MARGIN,
    footerY + 20,
    PAGE_WIDTH - PAGE_MARGIN,
    footerY + 20,
    COLORS.border,
    0.8
  );
  drawText(
    page,
    `Generated electronically on ${formatDateTime(certificate.generatedAt)}`,
    PAGE_MARGIN,
    footerY + 6,
    {
      color: COLORS.muted,
      fontKey: "F1",
      fontSize: 9
    }
  );
  drawText(page, `Page ${pageNumber} of ${pageCount}`, PAGE_WIDTH - PAGE_MARGIN, footerY + 6, {
    align: "right",
    color: COLORS.muted,
    fontKey: "F1",
    fontSize: 9
  });
};

const drawDetailsSection = (page, certificate) => {
  let currentY = PAGE_HEIGHT - 160;

  const intro = drawWrappedText(
    page,
    "This certifies that the ethics clearance application listed below has completed review and received the recorded signatory approvals required by the configured form workflow.",
    PAGE_MARGIN,
    currentY,
    CONTENT_WIDTH,
    {
      color: COLORS.dark,
      fontKey: "F1",
      fontSize: 11,
      lineHeight: 16
    }
  );

  currentY = intro.bottomY - 12;

  const columnGap = 28;
  const columnWidth = (CONTENT_WIDTH - columnGap) / 2;

  const applicantBlock = drawLabelValue(
    page,
    "Applicant",
    certificate.applicantName,
    PAGE_MARGIN,
    currentY,
    columnWidth
  );
  const referenceBlock = drawLabelValue(
    page,
    "Approved On",
    certificate.approvedAt,
    PAGE_MARGIN + columnWidth + columnGap,
    currentY,
    columnWidth
  );

  currentY -= Math.max(applicantBlock.height, referenceBlock.height) + 14;

  const emailBlock = drawLabelValue(
    page,
    "Applicant Email",
    certificate.applicantEmail,
    PAGE_MARGIN,
    currentY,
    columnWidth
  );
  const submittedBlock = drawLabelValue(
    page,
    "Submitted On",
    certificate.submittedAt,
    PAGE_MARGIN + columnWidth + columnGap,
    currentY,
    columnWidth
  );

  currentY -= Math.max(emailBlock.height, submittedBlock.height) + 14;

  const formBlock = drawLabelValue(
    page,
    "Form",
    certificate.formName,
    PAGE_MARGIN,
    currentY,
    CONTENT_WIDTH
  );

  currentY -= formBlock.height + 14;

  const titleBlock = drawLabelValue(
    page,
    "Research Title",
    certificate.researchTitle,
    PAGE_MARGIN,
    currentY,
    CONTENT_WIDTH
  );

  currentY -= titleBlock.height + 22;

  drawText(page, "Recorded Signatories", PAGE_MARGIN, currentY, {
    color: COLORS.maroon,
    fontKey: "F2",
    fontSize: 14
  });

  currentY -= 10;

  drawLine(page, PAGE_MARGIN, currentY, PAGE_WIDTH - PAGE_MARGIN, currentY, COLORS.border, 1);

  return currentY - 26;
};

const drawSignatoryBlock = (page, signatory, x, y, width, height) => {
  drawRect(page, x, y - height, width, height, COLORS.border, 0.9);
  drawText(page, signatory.position_name_snapshot, x + 14, y - 22, {
    color: COLORS.maroon,
    fontKey: "F2",
    fontSize: 11
  });
  drawLine(page, x + 16, y - 52, x + width - 16, y - 52, COLORS.muted, 0.9);
  drawText(
    page,
    signatory.signer_name || "No reviewer assigned",
    x + width / 2,
    y - 70,
    {
      align: "center",
      color: COLORS.dark,
      fontKey: "F2",
      fontSize: 11
    }
  );
  drawWrappedText(
    page,
    buildStatusLabel(signatory),
    x + 14,
    y - 88,
    width - 28,
    {
      align: "center",
      color: COLORS.muted,
      fontKey: "F1",
      fontSize: 9,
      lineHeight: 12
    }
  );
};

const buildPdfDocument = (pages) => {
  const objects = new Map();
  const pageObjectIds = [];

  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  objects.set(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.set(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.set(5, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>");

  let nextObjectId = 6;

  pages.forEach((page) => {
    const pageObjectId = nextObjectId++;
    const contentObjectId = nextObjectId++;
    const streamSource = `${page.commands.join("\n")}\n`;
    const streamLength = Buffer.byteLength(streamSource, "latin1");

    objects.set(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    );
    objects.set(
      contentObjectId,
      `<< /Length ${streamLength} >>\nstream\n${streamSource}endstream`
    );
    pageObjectIds.push(pageObjectId);
  });

  objects.set(
    2,
    `<< /Type /Pages /Count ${pageObjectIds.length} /Kids [${pageObjectIds
      .map((pageObjectId) => `${pageObjectId} 0 R`)
      .join(" ")}] >>`
  );

  const maxObjectId = nextObjectId - 1;
  const offsets = new Array(maxObjectId + 1).fill(0);
  const parts = ["%PDF-1.4\n"];

  for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
    const objectBody = objects.get(objectId);

    offsets[objectId] = Buffer.byteLength(parts.join(""), "latin1");
    parts.push(`${objectId} 0 obj\n${objectBody}\nendobj\n`);
  }

  const xrefOffset = Buffer.byteLength(parts.join(""), "latin1");
  const xrefRows = ["xref\n", `0 ${maxObjectId + 1}\n`, "0000000000 65535 f \n"];

  for (let objectId = 1; objectId <= maxObjectId; objectId += 1) {
    xrefRows.push(`${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`);
  }

  parts.push(...xrefRows);
  parts.push(
    `trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
  );

  return Buffer.from(parts.join(""), "latin1");
};

const createPdfCertificate = (certificate) => {
  const pages = [];
  const signatories = Array.isArray(certificate.signatories)
    ? certificate.signatories
    : [];

  const firstPage = createPage();
  drawFirstPageHeader(firstPage, certificate);
  let currentY = drawDetailsSection(firstPage, certificate);

  pages.push(firstPage);

  if (!signatories.length) {
    drawWrappedText(
      firstPage,
      "No signatory assignments were recorded for this application.",
      PAGE_MARGIN,
      currentY,
      CONTENT_WIDTH,
      {
        color: COLORS.muted,
        fontKey: "F1",
        fontSize: 11,
        lineHeight: 16
      }
    );
  } else {
    const columnCount = signatories.length === 1 ? 1 : 2;
    const columnGap = 22;
    const blockWidth =
      columnCount === 1
        ? CONTENT_WIDTH
        : (CONTENT_WIDTH - columnGap) / columnCount;
    const blockHeight = 110;
    const rowGap = 18;

    signatories.forEach((signatory, index) => {
      const columnIndex = index % columnCount;
      const requiresNewRow = columnIndex === 0 && index > 0;

      if (requiresNewRow) {
        currentY -= blockHeight + rowGap;
      }

      if (currentY - blockHeight < PAGE_MARGIN + 54) {
        const continuationPage = createPage();
        drawContinuationHeader(continuationPage, certificate);
        pages.push(continuationPage);
        currentY = PAGE_HEIGHT - 162;
      }

      const activePage = pages[pages.length - 1];
      const x =
        columnCount === 1
          ? PAGE_MARGIN
          : PAGE_MARGIN + columnIndex * (blockWidth + columnGap);

      drawSignatoryBlock(activePage, signatory, x, currentY, blockWidth, blockHeight);
    });
  }

  pages.forEach((page, pageIndex) => {
    drawFooter(page, certificate, pageIndex + 1, pages.length);
  });

  return buildPdfDocument(pages);
};

module.exports = {
  createPdfCertificate
};
