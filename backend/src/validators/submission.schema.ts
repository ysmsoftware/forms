import { z } from "zod";

export const startSubmission = z.object({
    body: z.object({
        slug: z.string(),
        visitor: z.object({
            uuid: z.string().uuid("Invalid UUID"),
        })
    }),
});


export const submissionFilter = z.object({
  query: z.object({
    status: z.enum(["ALL", "VISITED", "STARTED", "SUBMITTED"]).default("ALL"),
    limit: z.coerce.number().min(1).max(100).default(20),
    offset: z.coerce.number().min(0).default(0),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
  }),
});


export const submissionForm = z.object({
  body: z.object({
    slug: z.string(),

    visitor: z.object({
      uuid: z.string().uuid("Invalid UUID"),
      ipAddress: z.string(),
      userAgent: z.string(),
    }),

    contact: z.object({
      email: z.string().email("Invalid email").optional(),
      phone: z.string().optional(),
      name: z.string().optional(),
    }).optional(),

    answers: z.array(
      z.object({
        fieldId: z.string(),
        fieldKey: z.string(),

        valueText: z.string().optional(),
        valueNumber: z.number().optional(),
        valueBoolean: z.boolean().optional(),
        valueDate: z.coerce.date().optional(),
        valueJson: z.any().optional(),
        fileUrl: z.string().optional(),
      }).refine(
        (a) =>
          a.valueText !== undefined ||
          a.valueNumber !== undefined ||
          a.valueBoolean !== undefined ||
          a.valueDate !== undefined ||
          a.valueJson !== undefined ||
          a.fileUrl !== undefined,
        {
          message: "At least one value must be provided for each answer",
        }
      )
    ).min(1, "At least one answer is required"),
  }),
});



export type StartSubmissionInput = z.infer<typeof startSubmission>["body"];
export type SubmissionFilterInput = z.infer<typeof submissionFilter>;
export type SubmissionFormInput = z.infer<typeof submissionForm>["body"];