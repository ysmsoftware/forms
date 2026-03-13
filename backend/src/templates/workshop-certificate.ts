import PDFDocument from 'pdfkit';
import path from 'path';

// ===== TYPE DEFINITIONS =====

interface WorkshopCertificateData {
  name?: string;
  workshopTitle?: string;
  date?: string;
  certificateId?: string;
}

interface DocumentSettings {
  size: string | [number, number];
  layout: 'landscape' | 'portrait';
  margin: number;
}

interface TextRun {
  t: string; // text content
  b: boolean; // is bold
}

interface WorkshopCertificateModule {
  drawWorkshopCertificate: typeof drawWorkshopCertificate;
  settings: DocumentSettings;
}

// ===== ASSETS & CONSTANTS =====

const BG_PATH  = path.join(__dirname, '..', 'assets', 'Participation_Certi_Backgrounnd.png');
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'ysm_logo.png');
const SIGNATURE_PATH = path.join(__dirname, '..', 'assets', 'ysm_signature.png');

const COLORS = {
  navyTitle: '#1F3864',
  nameBlue: '#2E548A',
  bodyDark: '#132030',
  black: '#000000',
};

// ===== CERTIFICATE DRAWING FUNCTION =====

/**
 * YSM Info Solution - Certificate of Participation
 * @param doc - The PDFKit document instance
 * @param data - Certificate data
 */
function drawWorkshopCertificate(doc: typeof PDFDocument, data: WorkshopCertificateData, qrBuffer?: Buffer ): void {
  const PAGE_W = 792;
  const PAGE_H = 612;

  const name = data.name || 'Name';
  const workshopTitle = data.workshopTitle || '[Workshop_Title]';
  const date = data.date || '[Date]';
  const certificateId = data.certificateId || 'xyz-xyz-xyx-xyz';

  // 1. FULL PAGE BACKGROUND
  doc.image(BG_PATH, 0, 0, {
    width: PAGE_W,
    height: PAGE_H
  });

  // 2. LOGO - Centered
  const LOGO_W = 110;
  doc.image(LOGO_PATH, (PAGE_W / 2) - (LOGO_W / 2), 40, { width: LOGO_W });

  // 3. TITLE
  doc.font('Helvetica-Bold')
    .fontSize(36)
    .fillColor(COLORS.navyTitle)
    .text('CERTIFICATE OF PARTICIPATION', 0, 155, {
      width: PAGE_W,
      align: 'center',
    });

  // 4. SUBTITLE
  doc.font('Helvetica')
    .fontSize(16)
    .fillColor(COLORS.black)
    .text('Is hereby granted to', 0, 215, { width: PAGE_W, align: 'center' });

  // 5. NAME
  doc.font('Helvetica-Bold')
    .fontSize(42)
    .fillColor(COLORS.nameBlue)
    .text(`\u201c${name}\u201d`, 0, 245, { width: PAGE_W, align: 'center' });

  // 6. PARTICIPATION STATEMENT
  const BODY_Y = 325;
  _mixedCentered(doc, 100, BODY_Y, PAGE_W - 200, 15, [
    { t: 'has successfully participated in the ', b: false },
    { t: `\u201c${workshopTitle}\u201d`, b: true },
    { t: ' organized by ', b: false },
    { t: 'YSM INFO SOLUTION', b: true },
    { t: ' on ', b: false },
    { t: date, b: true },
    { t: '.', b: false },
  ], COLORS.bodyDark);

  if (qrBuffer) {
    const qrSize = 60;
    const qrX    = PAGE_W - qrSize - 40;
    const qrY    = PAGE_H - qrSize - 40;

    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    doc.fontSize(6)
      .font('Helvetica')
      .fillColor('#888888')
      .text(`Certificate ID: ${certificateId}`, qrX, qrY + qrSize + 2, {
        width: qrSize,
        align: 'center',
      });
  }


  // 7. SIGNATURE (Centered under text)
  const SIG_W = 180;
  doc.image(SIGNATURE_PATH, (PAGE_W / 2) - (SIG_W / 2), 440, { width: SIG_W });


  // 8. QR CODE / CERT ID AREA
  
  if (qrBuffer) {
    const qrSize = 70;
    const qrX    = PAGE_W - qrSize - 40;
    const qrY    = PAGE_H - qrSize - 40;

    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize });

    doc.fontSize(6)
      .font('Helvetica')
      .fillColor('#888888')
      .text(`certficate ID: ${certificateId}`, qrX, qrY + qrSize + 2, {
        width: qrSize,
        align: 'center',
      });
  }
}

/**
 * Helper: Mixed bold/normal text center alignment
 */
function _mixedCentered(
  doc: typeof PDFDocument,
  x: number,
  startY: number,
  maxW: number,
  fs: number,
  runs: TextRun[],
  color: string
): void {
  const LH = fs * 1.5;
  const tokens: { w: string; b: boolean }[] = [];

  runs.forEach(({ t, b }) =>
    t.split(' ').forEach((w, i, a) =>
      tokens.push({ w: w + (i < a.length - 1 ? ' ' : ''), b })
    )
  );

  const lines: { w: string; b: boolean; tw: number }[][] = [];
  let line: { w: string; b: boolean; tw: number }[] = [];
  let lw = 0;

  tokens.forEach(tok => {
    doc.font(tok.b ? 'Helvetica-Bold' : 'Helvetica').fontSize(fs);
    const tw = doc.widthOfString(tok.w);
    if (lw + tw > maxW && line.length) {
      lines.push(line);
      line = [];
      lw = 0;
    }
    line.push({ ...tok, tw });
    lw += tw;
  });
  if (line.length) lines.push(line);

  let cy = startY;
  lines.forEach(ln => {
    const total = ln.reduce((s, t) => s + t.tw, 0);
    let cx = x + (maxW - total) / 2;
    ln.forEach(tok => {
      doc.font(tok.b ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fs)
        .fillColor(color)
        .text(tok.w, cx, cy, { lineBreak: false });
      cx += tok.tw;
    });
    cy += LH;
  });
}

// ===== TEMPLATE SETTINGS =====

const settings: DocumentSettings = {
  size: 'Letter',
  layout: 'landscape',
  margin: 0
};

drawWorkshopCertificate.settings = settings;

const workshopCertificateModule: WorkshopCertificateModule = {
  drawWorkshopCertificate,
  settings
};

export default workshopCertificateModule;
export { drawWorkshopCertificate, settings };
export type { WorkshopCertificateData, DocumentSettings };