import { z } from "zod";

export const createEventSchema = z.object({
    body: z.object({
        title: z.string().min(1, "Title is required").max(200, "Title too long"),
        description: z.string().min(1, "Description is required"),
        status: z.enum(['DRAFT', 'ACTIVE'],),
        date: z.string().optional(),
        link: z.string().optional(),
        templateType: z.enum(["COMPLETION", "ACHIEVEMENT", "WORKSHOP", "INTERNSHIP", "APPOINTMENT"]),
        bannerUrl: z.string().optional(),
        paymentEnabled: z.boolean(),
        paymentConfig: z.object({
            amount: z.number().int().positive(),
            currency: z.string().default("INR"),
            description: z.string().optional(),
        }).optional(),
    })
})

export const updateEventSchema = z.object({
    body: z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["DRAFT", "ACTIVE", "CLOSED"]).optional(),
        date: z.string().optional(),
        link: z.string().optional(),
        templateType: z.enum(["COMPLETION", "ACHIEVEMENT", "WORKSHOP", "INTERNSHIP", "APPOINTMENT"]).optional(),
        bannerUrl: z.string().optional(),
        paymentEnabled: z.boolean().optional(),
        paymentConfig: z.object({
            amount: z.number().int().positive(),
            currency: z.string().default("INR"),
            description: z.string().optional(),
        }).optional()
    }),
});


export type EventInput = z.infer<typeof createEventSchema>["body"];
export type EventUpdate = z.infer<typeof updateEventSchema>["body"];

