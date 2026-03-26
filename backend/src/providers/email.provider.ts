import nodemailer from "nodemailer";
import { TemplateParamsMap } from "../types/message-template";
import { MessageTemplate } from "../types/message-template.enum";
import { MessageTemplateResolver } from "../templates/message-template-resolver";

export interface IEmailProvider {
    send<T extends MessageTemplate>(
        template: T,
        destination: string,
        params: TemplateParamsMap[T]
    ): Promise<any>;
}

export class EmailProvider {

    // Transporter is created lazily inside the constructor, not at module load time.
    // Creating it as a top-level constant caused it to read env vars before dotenv.config()
    // had run on the VPS, resulting in undefined credentials and 535 auth errors.
    private transporter: nodemailer.Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: (process.env.SMTP_HOST ?? "").trim(),
            port: Number((process.env.SMTP_PORT ?? "587").trim()),
            secure: (process.env.SMTP_PORT ?? "").trim() === "465",
            auth: {
                user: (process.env.SMTP_USER ?? "").trim(),
                pass: (process.env.SMTP_PASS ?? "").trim(),
            },
        });
    }

    async send<T extends MessageTemplate>(
        template: T, 
        destination: string, 
        params: TemplateParamsMap[T]
    ): Promise<any> {
        
        if(!destination) {
            throw new Error("Destination is required");
        }

        const templateConfig = MessageTemplateResolver.getEmail(template);

        if(!templateConfig) {
            throw new Error(`Email template not implemented: ${template}`);
        }

        const { subject, html } = templateConfig.build(params as any);

        const info = await this.transporter.sendMail({
            from: `YSM Info Solution <${process.env.SMTP_USER}>`,
            to: destination,
            subject,
            html,
        });

        return info;
    }
}