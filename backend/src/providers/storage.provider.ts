import { S3StorageProvider } from './s3.provider';
import { LocalStorageProvider } from './local.provider';

export interface FileStorageProvider {
    upload(params: {
        buffer: Buffer;
        mimeType: string;
        filename: string;
        folder: string;
    }): Promise<{
        url: string;
        storageKey: string;
    }>;

    delete(storageKey: string): Promise<void>;
}


export function getStorageProvider(): FileStorageProvider {

    const driver = process.env.FILE_STORAGE_DRIVER || "local";

    switch (driver) {
        case "s3":
            return new S3StorageProvider();
        case "local":
        default:
            return new LocalStorageProvider();
    }
}