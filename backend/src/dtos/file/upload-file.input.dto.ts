import { FileContext } from "../../types/file-context.enum";

export interface UploadFileInputDTO {
    file: Express.Multer.File;
    context: FileContext;

    fieldKey?: string;    // form field key
    eventId?: string;
    visitorId?: string;
    expiresInSeconds?: number;  // drafts
}