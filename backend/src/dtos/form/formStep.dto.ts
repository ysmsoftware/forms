import { FormFieldDTO } from "./formField.dto";

export interface FormStepDTO {
    id: string;
    stepNumber: number;
    title: string;
    description?: string;
    fields: FormFieldDTO[];
}

