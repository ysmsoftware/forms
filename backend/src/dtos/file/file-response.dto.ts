export interface FileResponseDTO {
    fileId: string;
    url: string;
    mimeType: string;
    size: number;
    fieldKey?: number;
    expriesAt?: Date;   
}