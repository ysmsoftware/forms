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

const mailTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_PORT == "465",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        }
    });

export class EmailProvider {

    private transporter = mailTransporter;

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