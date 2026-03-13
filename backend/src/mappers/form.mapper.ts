import { FormResponseDTO } from "../dtos/form/form-response.dto";
import { FormWithDetails } from "../repositories/form.repo";
import { toFormStepDTO } from "./formStep.mapper";
import { toFormFieldDTO } from "./formField.mapper";

export const toFormResponseDTO = ( form: FormWithDetails ): FormResponseDTO => {
  return {
    id: form.id,
    eventId: form.eventId,
    isMultiStep: form.isMultiStep,
    settings: form.settings,
    publishedAt: form.publishedAt ?? null,

    ...(form.isMultiStep && {
        steps: form.steps.map(toFormStepDTO)
    }),

    ...(!form.isMultiStep && {
        fields: (form.fields ?? []).map(toFormFieldDTO),
    }),
  };
};
