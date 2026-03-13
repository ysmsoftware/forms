import { FormFieldDTO } from "./formField.dto";
import { FormStepDTO } from "./formStep.dto";

export interface FormResponseDTO {
    id: string;
    eventId: string;
    isMultiStep: boolean;
    settings?: any;
    publishedAt?: Date | null;
    steps?: FormStepDTO[];
    fields?: FormFieldDTO[];
}