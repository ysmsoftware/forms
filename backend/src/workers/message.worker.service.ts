import logger from "../config/logger";
import { MessageProvider } from "../providers/message-provider";
import { MessageRepository } from "../repositories/message.repo";
import { TemplateParamsMap } from "../types/message-template";
import { MessageTemplate } from "../types/message-template.enum";

export class MessageWorkerService {

    constructor(private messageRepo: MessageRepository) { }

    async process(messageLogId: string) {

        const log = await this.messageRepo.findById(messageLogId);

        if (!log) {
            throw new Error("Message log not found");
        }

        if (log.status === "SENT") {
            return;
        }

        const provider = MessageProvider.getProvider(log.type);

        const destintaion = log.type === "EMAIL" ? log.contact?.email! : log.contact?.phone!;
        if (!destintaion) {
            throw new Error("Destination missing");
        }

        try {
            await this.messageRepo.updateStatus(log.id, "PROCESSING");

            logger.info("Sending message", {
                messageLogId: log.id,
                type: log.type,
                template: log.template,
                destination: destintaion,
                params: log.params
            });
            const response = await provider.send(
                log.template as MessageTemplate,
                destintaion,
                log.params as TemplateParamsMap[MessageTemplate]
            );

            await this.messageRepo.updateStatus(log.id, "SENT", { providerResponse: response });

        } catch (error) {
            await this.messageRepo.incrementAttempt(log.id);

            if (log.attemptCount + 1 >= 3) {
                await this.messageRepo.updateStatus(log.id, "FAILED", { errorMessage: (error as Error).message });
            }

            throw error;
        }
    }
}