import { PassThrough } from 'node:stream';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import logger from '../config/logger';
export interface CertificateTemplate  {
    (
    doc: typeof PDFDocument,
    data: Record<string, unknown>,
    qrBuffer: Buffer,
):  void;

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


export class CertificateGeneratorService { 

    private defaultSettings = {
        size: "A4",
        layout: "landscape" as const,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
    };

    async generate(params: {
        data: any,
        template: CertificateTemplate;
        certificateId: string;
        baseUrl: string;
    }): Promise<Buffer> {

        const { data, template, certificateId, baseUrl } = params;

        const verifyUrl = `${baseUrl}/certificates/verify?certificateId=${certificateId}`;
        const qrBuffer = await QRCode.toBuffer(verifyUrl, { type: 'png', width: 200, margin: 1 });

        const settings = template.settings || this.defaultSettings;

        const doc = new PDFDocument({
            size: settings.size || this.defaultSettings.size,
            layout: settings.layout || this.defaultSettings.layout,
            margins: settings.margins || this.defaultSettings.margins
        });
        

        return new Promise<Buffer>((resolve, reject) => {
            try{    
                const stream = new PassThrough();
                const chunks: Buffer[] = [];

                stream.on("data", (chunk) => chunks.push(chunk));

                stream.on("end", () => {
                    resolve(Buffer.concat(chunks));
                });

                stream.on("error", reject);

                doc.pipe(stream);

                logger.debug(`Data: ${JSON.stringify(data)}`);
                template(doc, data, qrBuffer);

                doc.end();

            } catch (err) {
                reject(err);
            }
        })

    }

}