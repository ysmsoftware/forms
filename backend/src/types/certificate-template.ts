import * as PDFKit from 'pdfkit';
type CertificateTemplate = (
    doc: PDFKit.PDFDocument,
    data: any
) => void & {
    settings?: {
        size?: string;
        layout?: "portrait" | "landscape";
        margins?: {
            top: number;
            bottom: number;
            left: number;
            right: number;
        };
    };
};