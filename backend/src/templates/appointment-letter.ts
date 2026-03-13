import PDFDocument from 'pdfkit';

// ===== TYPE DEFINITIONS =====

interface AppointmentLetterData {
  companyName?: string;
  companyAddress?: string;
  date?: string;
  name?: string;
  recipientAddress?: string;
  position?: string;
  startDate?: string;
  salary?: string;
  probation?: string;
  location?: string;
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

interface AppointmentLetterModule {
  drawAppointmentLetter: typeof drawAppointmentLetter;
  settings: DocumentSettings;
}

// ===== APPOINTMENT LETTER DRAWING FUNCTION =====

/**
 * Appointment Letter Template - Fixed Alignment
 * @param doc - The PDFKit document instance
 * @param data - Letter data
 */
function drawAppointmentLetter(doc: typeof PDFDocument, data: AppointmentLetterData, qrBuffer?: Buffer): void {
  const pageWidth: number = 595.28; // A4 portrait width
  const pageHeight: number = 841.89; // A4 portrait height
  const margin: number = 50;
  const rightMargin: number = pageWidth - margin;

  // ===== HEADER - Company Info (Right aligned) =====
  const companyName: string = data.companyName || 'Fay - Brekke';
  const companyAddress: string = data.companyAddress || '38267 Deckow Crest';

  doc.fontSize(14)
    .font('Helvetica-Bold')
    .fillColor('#000000')
    .text(companyName, margin, margin, {
      width: pageWidth - (2 * margin),
      align: 'right'
    });

  doc.fontSize(9)
    .font('Helvetica')
    .fillColor('#000000')
    .text(companyAddress, margin, doc.y + 2, {
      width: pageWidth - (2 * margin),
      align: 'right'
    });

  // Horizontal line
  doc.moveDown(0.5);
  const lineY: number = doc.y;
  doc.moveTo(margin, lineY)
    .lineTo(rightMargin, lineY)
    .lineWidth(1)
    .strokeColor('#000000')
    .stroke();

  // ===== DATE (Left aligned) =====
  doc.moveDown(1);
  const currentDate: string = data.date || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  doc.fontSize(11)
    .font('Helvetica')
    .fillColor('#000000')
    .text(currentDate, margin, doc.y);

  // ===== RECIPIENT DETAILS (Left aligned) =====
  doc.moveDown(1.5);
  doc.text('To,', margin, doc.y);
  doc.moveDown(0.3);
  doc.font('Helvetica-Bold').text(data.name || 'Marjolaine Dickinson', margin, doc.y);
  doc.moveDown(0.3);

  if (data.recipientAddress) {
    doc.font('Helvetica').text(data.recipientAddress, margin, doc.y);
    doc.moveDown(0.3);
  } else {
    doc.font('Helvetica').text('8432 Hagenes Islands', margin, doc.y);
    doc.moveDown(0.3);
  }

  // ===== SUBJECT (Left aligned, underlined) =====
  doc.moveDown(1);
  const subjectText: string = `Subject: Appointment Letter for the position of ${data.position || 'Product Quality Producer'}`;
  doc.font('Helvetica-Bold')
    .fillColor('#000000')
    .text(subjectText, margin, doc.y, {
      underline: true
    });

  // ===== SALUTATION =====
  doc.moveDown(1.5);
  doc.font('Helvetica')
    .text(`Dear ${data.name || 'Marjolaine Dickinson'},`, margin, doc.y);

  // ===== BODY PARAGRAPH 1 =====
  doc.moveDown(1);
  const para1: string = `We are pleased to inform you that you have been selected for the position of ${data.position || 'Product Quality Producer'} at ${companyName}. We are excited about the potential you bring to our team.`;

  doc.text(para1, margin, doc.y, {
    align: 'justify',
    width: pageWidth - (2 * margin)
  });

  // ===== TERMS AND CONDITIONS =====
  doc.moveDown(1);
  doc.font('Helvetica-Bold').text('Terms and Conditions:', margin, doc.y);
  doc.moveDown(0.5);
  doc.font('Helvetica');

  const terms: string[] = [
    `Start Date: Your employment will commence on ${data.startDate || '6/4/2026'}.`,
    `Compensation: You will receive an annual CTC of ${data.salary || '$120722.51'}, subject to applicable taxes.`,
    `Probation Period: You will be on a probation period of ${data.probation || '6 months'}.`,
    `Work Location: Your primary work location will be ${data.location || 'Port Judyton'}.`
  ];

  terms.forEach((term: string) => {
    doc.text(`• ${term}`, margin, doc.y, {
      indent: 20,
      width: pageWidth - (2 * margin)
    });
    doc.moveDown(0.3);
  });

  // ===== BODY PARAGRAPH 2 =====
  doc.moveDown(0.5);
  const para2: string = `We look forward to a long and mutually beneficial association. Please sign and return the duplicate copy of this letter as a token of your acceptance.`;

  doc.text(para2, margin, doc.y, {
    align: 'justify',
    width: pageWidth - (2 * margin)
  });

  // ===== SIGNATURES SECTION =====
  doc.moveDown(3);
  const signatureY: number = doc.y;

  // Left side - Company signature
  doc.font('Helvetica')
    .text(`For ${companyName},`, margin, signatureY);

  doc.moveDown(3);
  doc.font('Helvetica-Bold')
    .text('Authorised Signatory', margin, doc.y);

  // Right side - Employee acceptance
  const rightSideX: number = pageWidth - 220;
  doc.font('Helvetica')
    .text('Accepted by:', rightSideX, signatureY);

  doc.moveDown(3);
  doc.font('Helvetica')
    .text(data.name || 'Marjolaine Dickinson', rightSideX, doc.y);

  doc.moveDown(0.5);
  doc.text('Date: _______________', rightSideX, doc.y);

  // ===== FOOTER =====
  const footerY: number = pageHeight - 30;
  doc.fontSize(8)
    .font('Helvetica')
    .fillColor('#888888')
    .text('Generated by Certificate Generator System', margin, footerY, {
      align: 'center',
      width: pageWidth - (2 * margin)
    });

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

}

// ===== TEMPLATE SETTINGS =====

const settings: DocumentSettings = {
  size: 'A4',
  layout: 'portrait',
  margins: { top: 0, bottom: 0, left: 0, right: 0 }
};

// Attach settings to the function
drawAppointmentLetter.settings = settings;

const appointmentLetterModule: AppointmentLetterModule = {
  drawAppointmentLetter,
  settings
};

export default appointmentLetterModule;
export { drawAppointmentLetter, settings };
export type { AppointmentLetterData, DocumentSettings };