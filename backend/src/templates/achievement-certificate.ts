import PDFDocument from 'pdfkit';

// ===== TYPE DEFINITIONS =====

interface CertificateData {
  name: string;
  achievementTitle: string;
  description?: string;
  date?: string;
  signatoryName?: string;
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

interface CertificateModule {
  drawAchievementCertificate: typeof drawAchievementCertificate;
  settings: DocumentSettings;
}

// ===== CERTIFICATE DRAWING FUNCTION =====

/**
 * Certificate of Achievement Template
 * @param doc - The PDFKit document instance
 * @param data - Certificate data
 */
function drawAchievementCertificate(doc: typeof PDFDocument, data: CertificateData, qrBuffer?: Buffer): void {
  const pageWidth: number = 841.89;  // A4 landscape width
  const pageHeight: number = 595.28; // A4 landscape height
  const centerX: number = pageWidth / 2;

  // ===== DECORATIVE BORDER =====
  // Gold/Yellow theme for Achievement
  const goldColor: string = '#D4AC0D';
  const darkGoldColor: string = '#B7950B';

  // Outer border
  doc.rect(20, 20, pageWidth - 40, pageHeight - 40)
    .lineWidth(5)
    .strokeColor(goldColor)
    .stroke();

  // Inner detailed border
  doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
    .lineWidth(1)
    .strokeColor(darkGoldColor)
    .stroke();

  // Corner Ornaments
  const _cornerSize: number = 50; // reserved for future use

  // Top-Left
  doc.moveTo(20, 70)
    .lineTo(70, 20)
    .lineTo(20, 20)
    .fill(goldColor);

  // Top-Right
  doc.moveTo(pageWidth - 20, 70)
    .lineTo(pageWidth - 70, 20)
    .lineTo(pageWidth - 20, 20)
    .fill(goldColor);

  // Bottom-Left
  doc.moveTo(20, pageHeight - 70)
    .lineTo(70, pageHeight - 20)
    .lineTo(20, pageHeight - 20)
    .fill(goldColor);

  // Bottom-Right
  doc.moveTo(pageWidth - 20, pageHeight - 70)
    .lineTo(pageWidth - 70, pageHeight - 20)
    .lineTo(pageWidth - 20, pageHeight - 20)
    .fill(goldColor);


  // ===== HEADER =====
  doc.fontSize(44)
    .font('Helvetica-Bold')
    .fillColor(darkGoldColor)
    .text('CERTIFICATE OF ACHIEVEMENT', 0, 90, {
      width: pageWidth,
      align: 'center'
    });

  // ===== "PRESENTED TO" =====
  doc.fontSize(16)
    .font('Helvetica')
    .fillColor('#333333')
    .text('This certificate is proudly presented to', 0, 160, {
      width: pageWidth,
      align: 'center'
    });

  // ===== RECIPIENT NAME =====
  doc.fontSize(50)
    .font('Times-BoldItalic') // Elegant font for name
    .fillColor('#000000')
    .text(data.name, 0, 200, {
      width: pageWidth,
      align: 'center'
    });

  // Separator line
  doc.moveTo(centerX - 200, 260)
    .lineTo(centerX + 200, 260)
    .lineWidth(1)
    .strokeColor(goldColor)
    .stroke();

  // ===== ACHIEVEMENT TEXT =====
  doc.fontSize(16)
    .font('Helvetica')
    .fillColor('#333333')
    .text('For the outstanding achievement in', 0, 290, {
      width: pageWidth,
      align: 'center'
    });

  // ===== ACHIEVEMENT TITLE =====
  doc.fontSize(30)
    .font('Helvetica-Bold')
    .fillColor(darkGoldColor)
    .text(data.achievementTitle, 0, 325, {
      width: pageWidth,
      align: 'center'
    });

  // ===== DESCRIPTION =====
  if (data.description) {
    doc.fontSize(14)
      .font('Helvetica-Oblique')
      .fillColor('#555555')
      .text(data.description, centerX - 300, 380, {
        width: 600,
        align: 'center'
      });
  }

  // ===== FOOTER SECTION =====
  const footerY: number = pageHeight - 110;

  // Date
  doc.fontSize(12)
    .font('Helvetica')
    .fillColor('#000000')
    .text('Date', 150, footerY);

  const dateText: string = data.date
    ? data.date
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

  doc.fontSize(12)
    .font('Helvetica-Bold')
    .text(dateText, 150, footerY + 20);

  doc.moveTo(150, footerY + 40)
    .lineTo(300, footerY + 40)
    .lineWidth(1)
    .strokeColor('#000000')
    .stroke();

  // Signature
  doc.fontSize(12)
    .font('Helvetica')
    .fillColor('#000000')
    .text('Signature', pageWidth - 300, footerY);

  doc.moveTo(pageWidth - 300, footerY + 40)
    .lineTo(pageWidth - 150, footerY + 40)
    .lineWidth(1)
    .strokeColor('#000000')
    .stroke();

  if (data.signatoryName) {
    doc.fontSize(12)
      .font('Helvetica-Bold')
      .text(data.signatoryName, pageWidth - 300, footerY + 45);
  }

   // QR Code
   if(qrBuffer) {
     const qrSize = 60;
    const qrX = pageWidth - qrSize - 35;
    const qrY = pageHeight - qrSize - 35;

    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    doc.fontSize(6)
        .font('Helvetica')
        .fillColor('#888888')
        .text('Scan to verify', qrX, qrY + qrSize + 2 , { width: qrSize, align: 'center' });
   }



  // ===== BADGE/MEDAL =====
  // Draw a star shape for medal
  doc.save();
  doc.translate(centerX, footerY + 20);
  doc.scale(0.8);

  doc.path('M 0 -30 L 7 -9 L 29 -9 L 11 4 L 18 26 L 0 13 L -18 26 L -11 4 L -29 -9 L -7 -9 Z');
  doc.fill(goldColor);

  doc.restore();
}

// ===== TEMPLATE SETTINGS =====

const settings: DocumentSettings = {
  size: 'A4',
  layout: 'landscape',
  margins: { top: 0, bottom: 0, left: 0, right: 0 }
};

// Attach settings to the function
drawAchievementCertificate.settings = settings;

const certificateModule: CertificateModule = {
  drawAchievementCertificate,
  settings
};

export default certificateModule;
export { drawAchievementCertificate, settings };
export type { CertificateData, DocumentSettings };