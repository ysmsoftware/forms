import PDFDocument from 'pdfkit';
import path from 'path';
import fs from 'fs';

// ===== TYPE DEFINITIONS =====

interface AppointmentLetterData {
    companyName?: string;
    companyAddress?: string;
    date: string;
    name: string;
    recipientAddress?: string;
    position: string;
    startDate: string;
    salary?: string;
    probation: string;
    location: string;
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

const LETTER_HEAD_PATH = path.join(__dirname, '..', 'assets', 'YSM-letter-head.png');
const STAMP_PATH = path.join(__dirname, '..', 'assets', 'YSM-stamp.png');
const SIGNATURE_PATH = path.join(__dirname, '..', 'assets', 'YSM-signature.png');

// ===== APPOINTMENT LETTER DRAWING FUNCTION =====

/**
 * Appointment Letter Template
 * @param doc - The PDFKit document instance
 * @param data - Letter data
 */
function drawAppointmentLetter(doc: typeof PDFDocument, data: AppointmentLetterData, qrBuffer?: Buffer): void {
    const pageWidth: number = 595.28; // A4 portrait width
    const pageHeight: number = 841.89; // A4 portrait height
    const margin: number = 60;
    const contentWidth: number = pageWidth - 2 * margin;

    // ===== LETTER HEAD =====
    if (fs.existsSync(LETTER_HEAD_PATH)) {
        doc.image(LETTER_HEAD_PATH, 0, 0, { width: pageWidth });
    }

    let currentY: number = 130;

    // ===== DATE (Left aligned) =====
    const currentDate: string = data.date || new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    doc.fontSize(11)
        .font('Helvetica-Bold')
        .fillColor('#000000')
        .text(currentDate, margin, currentY);

    currentY = doc.y + 20;

    // ===== RECIPIENT DETAILS (Left aligned) =====
    doc.font('Helvetica-Bold').text('To,', margin, currentY);
    currentY = doc.y;
    doc.font('Helvetica').text(data.name, margin, currentY);

    currentY = doc.y + 30;

    // ===== TITLE =====
    doc.fontSize(14)
        .font('Helvetica-Bold')
        .text('APPOINTMENT LETTER', margin, currentY, {
            width: contentWidth,
            align: 'center',
            underline: true
        });

    currentY = doc.y + 30;

    // ===== SALUTATION =====
    doc.fontSize(11)
        .font('Helvetica-Bold')
        .text(`Dear ${data.name},`, margin, currentY);

    currentY = doc.y + 15;

    // ===== BODY PARAGRAPH 1 =====
    const domain = data.position;
    const joinDate = data.startDate;

    doc.font('Helvetica')
        .text('This refers to the recent interviews you have had with us. We are pleased to appoint you as ', margin, currentY, {
            continued: true,
            width: contentWidth,
            align: 'justify'
        })
        .font('Helvetica-Bold')
        .text(`${domain}`, { continued: true })
        .font('Helvetica')
        .text(' with YSM Info Solution. You are expected to join the organization on or before ', { continued: true })
        .font('Helvetica-Bold')
        .text(`${joinDate}`, { continued: true })
        .font('Helvetica')
        .text('.', { continued: false });

    currentY = doc.y + 15;

    // ===== BODY PARAGRAPH 2 =====
    const duration = data.probation || '6 months';

    doc.font('Helvetica')
        .text(`You will undergo training in ${domain} at YSM for a period of `, margin, currentY, {
            continued: true,
            width: contentWidth,
            align: 'justify'
        })
        .font('Helvetica-Bold')
        .text(`${duration}`, { continued: true })
        .font('Helvetica')
        .text('.', { continued: false });

    currentY = doc.y + 15;

    // ===== BODY PARAGRAPH 3 =====
    doc.font('Helvetica')
        .text('All software programs, code, functions, data, business processes, encryption methods, algorithms, and systems worked upon during the course of your internship will remain the ', margin, currentY, {
            continued: true,
            width: contentWidth,
            align: 'justify'
        })
        .font('Helvetica-Bold')
        .text('exclusive intellectual property of YSM Info Solution.', { continued: true })
        .font('Helvetica')
        .text(' You are not permitted to share, copy, use, modify, or otherwise disclose such intellectual property outside the organization.', { continued: false });

    currentY = doc.y + 15;

    // ===== BODY PARAGRAPH 4 =====
    doc.font('Helvetica')
        .text('We look forward to your contributions and a long, mutually beneficial association.', margin, currentY, {
            width: contentWidth,
            align: 'justify'
        });

    currentY = doc.y + 40;

    // ===== SIGNATURES SECTION =====
    const companyName = data.companyName || 'YSM Info Solution';

    // "Regards,"
    doc.fontSize(11)
        .font('Helvetica')
        .text('Regards,', margin, currentY);

    currentY = doc.y + 4;

    // "For <Company>"
    doc.font('Helvetica-Bold')
        .text(`For ${companyName}`, margin, currentY);

    currentY = doc.y + 10;

    const signatureY = currentY;

    // Signature image
    let signatureAdded = false;
    if (fs.existsSync(SIGNATURE_PATH)) {
        const sigW = 75;
        const sigH = 45;
        doc.image(SIGNATURE_PATH, margin, currentY, { width: sigW, height: sigH });
        signatureAdded = true;
    }

    // Stamp image
    if (fs.existsSync(STAMP_PATH)) {
        const stampW = 100;
        const stampH = 100;
        const stampX = pageWidth - margin - stampW - 20;
        const stampY = signatureY - 20;
        doc.image(STAMP_PATH, stampX, stampY, { width: stampW, height: stampH });
    }

    if (signatureAdded) {
        currentY += 51;
    } else {
        currentY += 40;
    }

    // Signatory
    doc.fontSize(11)
        .font('Helvetica-Bold')
        .text('Authorized Signatory', margin, currentY);

    currentY = doc.y + 2;

    doc.fontSize(11)
        .font('Helvetica')
        .text('(Mr. Nilesh Sonawane)', margin, currentY);

    // ===== FOOTER =====
    const footerY: number = pageHeight - 60;

    doc.fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#8b9dc3') // A bluish/grey color based on the screenshot
        .text('Office No. 2, 1st floor, Dhanraj Apt., Ambad Police Station Road, Nashik - 422 009.', margin, footerY, {
            align: 'center',
            width: contentWidth
        });

    doc.fontSize(8)
        .font('Helvetica-Bold')
        .fillColor('#8b9dc3')
        .text('Phone: +91-898-308-3698 | E-mail: info@ysminfosolution.com | Website: www.ysminfosolution.com', margin, doc.y + 2, {
            align: 'center',
            width: contentWidth
        });

    // QR Code (optional)
    if (qrBuffer) {
        const qrSize = 50;
        const qrX = pageWidth - qrSize - 30;
        const qrY = footerY - qrSize - 15; // Placed above the footer with some space

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