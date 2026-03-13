import {
    Form,
    FormField,
    FormStep,
    Event,
} from "@prisma/client";

import { PublicFormResponseDTO } from "../dtos/submissions/publicForm-response.dto";
import { PublicFormFieldDTO } from "../dtos/submissions/publicFormField.dto";
import { FormWithDetails } from "../repositories/form.repo";

const toPublicFormFieldDTO = (field: FormField): PublicFormFieldDTO => ({
    id: field.id,
    key: field.key,
    type: field.type,
    label: field.label,
    required: field.required,
    order: field.order,
    options: field.options ?? undefined,
    validation: field.validation ?? undefined,
});

export function toPublicFormResponseDTO(params: {
    event: Event;
    form: FormWithDetails
}): PublicFormResponseDTO {
    const { event, form } = params;

    const baseForm = {
        id: form.id,
        isMultiStep: form.isMultiStep,
        settings: form.settings ?? undefined,
        publishedAt: form.publishedAt!,
    };

    // ✅ MULTI STEP FORM
    if (form.isMultiStep) {
        return {
            event: {
                id: event.id,
                title: event.title,
                slug: event.slug,
                status: event.status,
                description: event.description ?? undefined,
                bannerUrl: event.bannerUrl ?? null,
                paymentEnabled: (event as any).paymentEnabled ?? false,
                paymentConfig: (event as any).paymentConfig ?? undefined,
            },
            form: {
                ...baseForm,
                steps: form.steps!.map((step) => ({
                    id: step.id,
                    stepNumber: step.stepNumber,
                    ...(step.title && { title: step.title }),
                    ...(step.description && { description: step.description }),
                    fields: step.fields.map(toPublicFormFieldDTO),
                })),
            },
        };
    }

    // ✅ NON MULTI STEP FORM
    return {
        event: {
            id: event.id,
            title: event.title,
            slug: event.slug,
            status: event.status,
            description: event.description ?? undefined,
            bannerUrl: event.bannerUrl ?? null,
            paymentEnabled: (event as any).paymentEnabled ?? false,
            paymentConfig: (event as any).paymentConfig ?? undefined,
        },
        form: {
            ...baseForm,
            ...(form.fields && { fields: form.fields.map(toPublicFormFieldDTO) }),
        },
    };
}
