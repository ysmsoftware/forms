import { PublicFormFieldDTO } from './publicFormField.dto';

export interface PublicFormResponseDTO {
    event: {
        id: string;
        title: string;
        slug: string;
        status: string;
        description?: string | undefined;
        bannerUrl?: string | null;
        paymentEnabled?: boolean;
        paymentConfig?: any;
    };

    form: {
        id: string;
        isMultiStep: boolean;
        settings?: any;
        publishedAt: Date;

        steps?: Array<{
            id: string;
            stepNumber: number;
            title?: string;
            description?: string;
            fields: PublicFormFieldDTO[];
        }>;

        fields?: PublicFormFieldDTO[];
    };
}