import PDFDocument from 'pdfkit';
import path from 'path';

// ===== TYPE DEFINITIONS =====

interface CompletionCertificateData {
  name: string;
  eventTitle: string;
  date: string;
  certificateId: string;
}

interface DocumentSettings {
  size: string | [number, number];
  layout: 'landscape' | 'portrait';
  margin: number;
}

interface TextRun {
  t: string; // text
  b: boolean; // isBold
}

interface CompletionCertificateModule {
  drawCompletionCertificate: typeof drawCompletionCertificate;
  settings: DocumentSettings;
}

// ===== CONSTANTS & ASSETS =====

const BG_PATH = path.join(__dirname, '..', 'assets', 'Completion_Certi_Background.png');
const DECORATION_PATH = path.join(__dirname, '..', 'assets', 'Certification_Certi_Title_Decoration.png');
const LOGO_PATH = path.join(__dirname, '..', 'assets', 'ysm_logo.png');
const SIGNATURE_PATH = path.join(__dirname, '..', 'assets', 'ysm_signature.png');


const COLORS = {
  white: '#FFFFFF',
  navyTitle: '#213966',
  goldName: '#F4BF58',
  bodyText: '#333333',
  black: '#000000',
};

// ===== CERTIFICATE DRAWING FUNCTION =====

/**
 * Completion Certificate Template
 * @param doc - The PDFKit document instance
 * @param data - Certificate data
 */
function drawCompletionCertificate(doc: typeof PDFDocument, data: CompletionCertificateData, qrBuffer?: Buffer): void {
  const PAGE_W = 792;
  const PAGE_H = 612;

  const name = data.name || 'Name';
  const workshopTitle = data.eventTitle || '[Workshop_Title]';
  const date = data.date || '[Date]';
  const certificateId = data.certificateId || 'xyz-xyz-xyx-xyz';

  // 1. WHITE BASE
  doc.rect(0, 0, PAGE_W, PAGE_H).fill(COLORS.white);

  // 2. LEFT PANEL (Combined Background + Badge)
  const PANEL_W = 180;
  doc.image(BG_PATH, 0, 0, { width: PANEL_W, height: PAGE_H });

  // 3. CONTENT COLUMN CONSTANTS
  const COL_X = PANEL_W;
  const COL_W = PAGE_W - COL_X;
  const COL_CX = COL_X + (COL_W / 2);

  // 4. YSM LOGO
  const LOGO_W = 100;
  doc.image(LOGO_PATH, COL_CX - (LOGO_W / 2), 35, { width: LOGO_W });

  // 5. MAIN TITLE
  doc.font('Helvetica-Bold')
    .fontSize(34)
    .fillColor(COLORS.navyTitle)
    .text('CERTIFICATE OF COMPLETION', COL_X, 115, {
      width: COL_W,
      align: 'center',
    });

  // 6. DECORATION LINE
  const DECO_W = 350;
  doc.image(DECORATION_PATH, COL_CX - (DECO_W / 2), 160, { width: DECO_W });

  // 7. "This is to certify that"
  doc.font('Helvetica')
    .fontSize(14)
    .fillColor(COLORS.black)
    .text('This is to certify that', COL_X, 220, { width: COL_W, align: 'center' });

  // 8. PARTICIPANT NAME
  doc.font('Helvetica-Bold')
    .fontSize(44)
    .fillColor(COLORS.goldName)
    .text(`${name}`, COL_X, 255, { width: COL_W, align: 'center' });

  // 9. PARTICIPATION BLOCK
  const BODY_Y = 325;
  _mixedCentered(doc, COL_X, BODY_Y, COL_W, 14, [
    { t: 'has successfully participated in the ', b: false },
    { t: `\u201c${workshopTitle}\u201d`, b: true },
    { t: ' organized by ', b: false },
    { t: 'YSM INFO SOLUTION', b: true },
    { t: ' on ', b: false },
    { t: date, b: true },
    { t: '.', b: false },
  ], COLORS.bodyText);

  // 10. DESCRIPTION TEXT
  doc.font('Helvetica')
    .fontSize(13)
    .fillColor(COLORS.bodyText)
    .text(
      'The workshop focused on enhancing domain knowledge, practical understanding, and professional skills. The participant demonstrated active involvement and dedication throughout the session.',
      COL_X + 40, 400, { width: COL_W - 80, align: 'center', lineGap: 3 }
    );

  // 11. SIGNATURE SECTION
  const SIG_W = 180;
  const SIG_X = COL_X + 50;
  const SIG_Y = 480;
  doc.image(SIGNATURE_PATH, SIG_X, SIG_Y, { width: SIG_W });


  // 12. QR CODE / CERT ID AREA
 // ===== QR CODE (bottom-right, optional) =====

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
 * Helper for rendering mixed bold/regular text centered in a block
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


drawCompletionCertificate.settings = settings;

const completionCertificateModule: CompletionCertificateModule = {
  drawCompletionCertificate,
  settings,
};


export default completionCertificateModule;
export { drawCompletionCertificate, settings };
export type { CompletionCertificateData, DocumentSettings };