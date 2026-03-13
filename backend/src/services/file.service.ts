import { IFileRepository } from "../repositories/file.repo";
import { FileStorageProvider } from "../providers/storage.provider";
import { FileContext } from "../types/file-context.enum";
import { BadRequestError, NotFoundError } from "../errors/http-errors";
import logger from "../config/logger";


export class FileService {

    constructor(
        private fileRepo: IFileRepository,
        private storage: FileStorageProvider
    ) {}

    private resolveFolder(context: FileContext, eventSlug?: string) {
        switch (context) {
            case FileContext.FORM_SUBMISSION:
            return `events/${eventSlug}/submissions`;

            case FileContext.FORM_CERTIFICATE:
            return `events/${eventSlug}/certificates`;

            case FileContext.EVENT_ASSET:
            return `events/${eventSlug}/assets`;

            case FileContext.USER_AVATAR:
            return `users/avatars`;

            default:
            return `misc`;
        }
    }


    /**
     * Future: add idempotency for uploads 
     *
     */
    async upload(params: {
        file: Express.Multer.File;
        context: FileContext;
        contactId?: string,
        fieldKey?: string,
        eventSlug?: string,
        eventId?: string,
        visitorId?: string;
        expiresInSeconds?: number;
    }) {

        if(
            params.context !== FileContext.USER_AVATAR && 
            !params.eventId
        ) {
            throw new BadRequestError('eventId is required for this context');
        }

       const folder = this.resolveFolder(params.context,  params.eventSlug || params.eventId);

     
        const uploaded = await this.storage.upload({
            buffer: params.file.buffer,
            mimeType: params.file.mimetype,
            filename: params.file.originalname,
            folder,
        });

        const expiresAt = params.expiresInSeconds
            ? new Date(Date.now() + params.expiresInSeconds * 1000 )
            : undefined;


        const file = await this.fileRepo.create({
            url: uploaded.url,
            storageKey: uploaded.storageKey,
            mimeType: params.file.mimetype,
            name: params.file.originalname,
            size: params.file.size,
            context: params.context,
            ...(params.context !== FileContext.USER_AVATAR && { eventId: params.eventId as string }),
            ...(params.contactId !== undefined && { contactId: params.contactId }),
             ...(params.fieldKey !== undefined && { fieldKey: params.fieldKey }),
            ...(params.visitorId !== undefined && { visitorId: params.visitorId }),
            ...(expiresAt !== undefined && { expiresAt }),
        });

        return {
            id: file.id,
            url: file.url,
            name: file.name,
            mimeType: file.mimeType,
            size: file.size,
            fieldKey: file.fieldKey,
            expiresAt: file.expiresAt,
            createdAt: file.createdAt,
        };
    }


    async getById(id: string) {
        const file = await this.fileRepo.findById(id);
        if(!file) {
            throw new NotFoundError("File not found");
        }
        return file;
    }


    async getByContactId(contactId: string) {
        return this.fileRepo.findByContactId(contactId);
    }

    async getByEventId(eventId: string) {
        return this.fileRepo.findByEventId(eventId);
    }


    // Delete file (DB + storage)
    async deleteById(id: string): Promise<void> {
        const file = await this.fileRepo.findById(id);
        
        // TODO: owenship check

        if(!file) {
            throw new NotFoundError("File not found");
        }
        // storage
        try {
            await this.storage.delete(file.storageKey);
        } catch(error) {
            logger.warn("Storage delete failed", error);
        }

        // DB
        await this.fileRepo.deleteById(id);
    }
}