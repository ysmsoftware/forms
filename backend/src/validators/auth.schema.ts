import { z } from "zod";

export const signupSchema = z.object({
    body: z.object({
        name: z.string().min(3, "Name must be at least 3 characters long"),
        email: z.string().email("Invalid email"),
        password: z.string().min(8, "Password must be at least 8 characters"),
    }),
});


export const loginSchema = z.object({
    body: z.object({
        email: z.string().email("Invalid"),
        password: z.string().min(1, "Password is required"),
    })
})


export type SignupInput = z.infer<typeof signupSchema>["body"];
export type LoginInput = z.infer<typeof loginSchema>["body"];