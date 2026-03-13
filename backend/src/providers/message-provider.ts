import { MessageType } from "@prisma/client";
import { EmailProvider } from "./email.provider";
import { WhatsAppProvider } from "./whatsapp.provider";

const emailProvider = new EmailProvider();
const whatsappProvider = new WhatsAppProvider();

export class MessageProvider {
    static getProvider(type: MessageType) {
        switch (type) {
            case "EMAIL":
                return emailProvider;
            case "WHATSAPP":
                return whatsappProvider;

            default:
                throw new Error(`Unsupported message type: ${type}`);
        }
    }
}