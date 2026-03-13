import { z } from 'zod';
import { formStepSchema } from './formStep.schema';
import { formFieldSchema } from './formField.schema';

export const createFormSchema = z.object({
    body: z.object({
        isMultiStep: z.boolean().optional().default(false),
        settings: z.record(z.string(), z.any()).optional(),
        steps: z.array(formStepSchema).optional(),
        fields: z.array(formFieldSchema).optional(),

    }).refine(
        (data) => 
        (data.isMultiStep && data.steps?.length ) ||
        (!data.isMultiStep && data.fields?.length),
        {
            message: "Multi-step forms require steps, Single-step forms require fields",
        }
    ),
});

export const updateFormSchema = z.object({
    body: z.object({
        isMultiStep: z.boolean().optional(),
        settings: z.record(z.string(), z.any()).optional(),
        steps: z.array(formStepSchema).optional(),
        fields: z.array(formFieldSchema).optional(),
    }).refine(
        (data) =>
            (data.isMultiStep && data.steps?.length) ||
            (!data.isMultiStep && data.fields?.length),
        {
            message: "Multi-step forms require steps, Single-step forms require fields",
        }
    ),

});

export type FormInput = z.infer<typeof createFormSchema>['body'];
export type FormUpdate = z.infer<typeof updateFormSchema>['body'];