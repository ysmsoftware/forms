import { z } from "zod";

export const visitorSchema = z.object({
    body: z.object({
        slug: z.string(),
        visitor: z.object({
            uuid: z.string().uuid("Invalid UUID"),
            ipAddress: z.string(),
            userAgent: z.string(),
        })
    }),
});


export type VisitorInput = z.infer<typeof visitorSchema>["body"];
