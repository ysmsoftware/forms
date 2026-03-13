import { z } from "zod";
import { formFieldSchema } from "./formField.schema";


export const formStepSchema = z.object({
    stepNumber: z.number().int().min(1),
    title: z.string().min(1),
    description: z.string().optional(),
    fields: z.array(formFieldSchema).min(1)
})

