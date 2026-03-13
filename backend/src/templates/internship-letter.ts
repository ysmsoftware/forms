import PDFDocument from 'pdfkit';

// ===== TYPE DEFINITIONS =====

interface InternshipCertificateData {
  companyName?: string;
  companyLogoBuffer?: Buffer;       // image1.png – company logo / seal
  signatureBuffer?: Buffer;         // image2.png – authorised signatory signature
  date?: string;                    // Issue date
  name?: string;                    // Intern's name
  domain?: string;                  // Technology / domain worked on
  startDate?: string;               // Internship start date
  endDate?: string;                 // Internship end date  (same as issue date by default)
  signatoryName?: string;           // Name shown below signature
  signatoryTitle?: string;          // Title shown below name
}

interface DocumentSettings {
  size: string;
  layout: 'landscape' | 'portrait';
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

interface InternshipCertificateModule {
  drawInternshipCertificate: typeof drawInternshipCertificate;
  settings: DocumentSettings;
}

// ===== INTERNSHIP CERTIFICATE DRAWING FUNCTION =====

/**
 * Internship Certificate Template
 * Mirrors the layout of the INTERNSHIP_CERTIFICATE.docx produced by YSM Info Solution.
 *
 * @param doc        - The PDFKit document instance
 * @param data       - Certificate data (all fields optional; sensible defaults provided)
 * @param qrBuffer   - Optional QR-code buffer rendered at bottom-right for verification
 */
function drawInternshipCertificate(
  doc: typeof PDFDocument,
  data: InternshipCertificateData,
  qrBuffer?: Buffer
): void {
  const pageWidth: number  = 595.28;  // A4 portrait width  (pt)
  const pageHeight: number = 841.89;  // A4 portrait height (pt)
  const margin: number     = 60;
  const contentWidth: number = pageWidth - 2 * margin;

  // ===== RESOLVE DEFAULTS =====

  const companyName: string    = data.companyName    || 'YSM Info Solution';
  const internName: string     = data.name           || '{Name}';
  const domain: string         = data.domain         || '{Domain}';
  const startDate: string      = data.startDate      || 'January 02, 2026';
  const issueDate: string      = data.date           || new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  const endDate: string        = data.endDate        || issueDate;
  const signatoryName: string  = data.signatoryName  || 'Mr. Nilesh Sonawane';
  const signatoryTitle: string = data.signatoryTitle || 'Authorized Signatory';

  // ===== DECORATIVE BORDER =====

  doc.rect(margin / 2, margin / 2, pageWidth - margin, pageHeight - margin)
    .lineWidth(2)
    .strokeColor('#1a3a6b')
    .stroke();

  // Inner thin border
  doc.rect(margin / 2 + 4, margin / 2 + 4, pageWidth - margin - 8, pageHeight - margin - 8)
    .lineWidth(0.5)
    .strokeColor('#1a3a6b')
    .stroke();

  // ===== COMPANY LOGO (top-centre, if provided) =====

  let currentY: number = margin + 10;

  if (data.companyLogoBuffer) {
    const logoW = 120;
    const logoH = 120;
    const logoX = (pageWidth - logoW) / 2;
    doc.image(data.companyLogoBuffer, logoX, currentY, { width: logoW, height: logoH });
    currentY += logoH + 12;
  }

  // ===== TITLE =====

  doc.fontSize(26)
    .font('Helvetica-Bold')
    .fillColor('#1a3a6b')
    .text('INTERNSHIP CERTIFICATE', margin, currentY, {
      width: contentWidth,
      align: 'center',
      underline: true,
    });

  currentY = doc.y + 20;

  // ===== DATE LINE =====

  doc.fontSize(11)
    .font('Helvetica')
    .fillColor('#000000')
    .text(issueDate, margin, currentY, {
      width: contentWidth,
      align: 'left',
    });

  currentY = doc.y + 20;

  // ===== BODY PARAGRAPH =====

  const para: string =
    `This is to certify that ` +
    `${internName}` +
    ` has successfully completed an internship at ` +
    `${companyName}` +
    ` for the period from ` +
    `${startDate} to ${endDate}.`;

  // Render paragraph with inline bold runs using manual positioning
  // (PDFKit doesn't support mixed bold inline; we use separate text calls)
  doc.fontSize(12)
    .font('Helvetica')
    .fillColor('#000000')
    .text('This is to certify that ', margin, currentY, {
      continued: true,
      width: contentWidth,
      align: 'justify',
    })
    .font('Helvetica-Bold')
    .text(`${internName}`, { continued: true })
    .font('Helvetica')
    .text(` has successfully completed an internship at `, { continued: true })
    .font('Helvetica-Bold')
    .text(`${companyName}`, { continued: true })
    .font('Helvetica')
    .text(` for the period from `, { continued: true })
    .font('Helvetica-Bold')
    .text(`${startDate} to ${endDate}`, { continued: true })
    .font('Helvetica')
    .text('.', { continued: false });

  currentY = doc.y + 14;

  // ===== PERFORMANCE PARAGRAPH =====

  doc.fontSize(12)
    .font('Helvetica')
    .text('During the internship period, the individual was assigned to work on a project using ', margin, currentY, {
      continued: true,
      width: contentWidth,
      align: 'justify',
    })
    .font('Helvetica-Bold')
    .text(`${domain}`, { continued: true })
    .font('Helvetica')
    .text(
      '. Throughout the tenure, strong programming skills and a self-motivated approach toward learning new technologies were demonstrated. The performance exceeded our expectations, and the individual successfully completed the learning of ',
      { continued: true }
    )
    .font('Helvetica-Bold')
    .text('project development and management practices', { continued: true })
    .font('Helvetica')
    .text('.', { continued: false });

  currentY = doc.y + 14;

  // ===== CLOSING PARAGRAPH =====

  doc.fontSize(12)
    .font('Helvetica')
    .text(
      'The contribution made to the organization and its success is highly appreciable. We wish the individual all the very best for future endeavors.',
      margin,
      currentY,
      { width: contentWidth, align: 'justify' }
    );

  currentY = doc.y + 30;

  // ===== SIGNATURE BLOCK =====

  // "Regards,"
  doc.fontSize(12)
    .font('Helvetica')
    .fillColor('#000000')
    .text('Regards,', margin, currentY);

  currentY = doc.y + 8;

  // "For <Company>"
  doc.font('Helvetica-Bold')
    .text(`For ${companyName}`, margin, currentY);

  currentY = doc.y + 10;

  // Signature image (if provided)
  if (data.signatureBuffer) {
    const sigW = 75;
    const sigH = 45;
    doc.image(data.signatureBuffer, margin, currentY, { width: sigW, height: sigH });
    currentY += sigH + 6;
  } else {
    currentY += 40; // blank space for wet signature
  }

  // Signatory title & name
  doc.fontSize(12)
    .font('Helvetica-Bold')
    .text(signatoryTitle, margin, currentY);

  currentY = doc.y + 4;

  doc.fontSize(11)
    .font('Helvetica')
    .text(`(${signatoryName})`, margin, currentY);

  // ===== FOOTER =====

  const footerY: number = pageHeight - margin / 2 - 18;

  doc.fontSize(8)
    .font('Helvetica')
    .fillColor('#888888')
    .text('Generated by Certificate Generator System', margin, footerY, {
      align: 'center',
      width: contentWidth,
    });

  // ===== QR CODE (bottom-right, optional) =====

  if (qrBuffer) {
    const qrSize = 60;
    const qrX    = pageWidth  - qrSize - margin / 2 - 5;
    const qrY    = pageHeight - qrSize - margin / 2 - 5;

    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    doc.fontSize(6)
      .font('Helvetica')
      .fillColor('#888888')
      .text('Scan to verify', qrX, qrY + qrSize + 2, {
        width: qrSize,
        align: 'center',
      });
  }
}

// ===== TEMPLATE SETTINGS =====

const settings: DocumentSettings = {
  size: 'A4',
  layout: 'portrait',
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
};

// Attach settings to the function (mirrors appointment-letter pattern)
drawInternshipCertificate.settings = settings;

const internshipCertificateModule: InternshipCertificateModule = {
  drawInternshipCertificate,
  settings,
};

export default internshipCertificateModule;
export { drawInternshipCertificate, settings };
export type { InternshipCertificateData, DocumentSettings };

