import { z } from 'zod';

export const formFieldSchema = z.object({
    key: z.string().min(1),
    type: z.enum(["TEXT","NUMBER","EMAIL","DATE","TEXTAREA","RANGE","CHECKBOX","RADIO","FILE","SELECT"]),
    label: z.string().min(1),
    required: z.boolean().optional().default(false),
    order: z.number().int().min(0),
    options: z.any().optional(),
    validation: z.any().optional(),
})