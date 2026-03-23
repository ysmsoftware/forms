import { SubmissionStatus } from "@prisma/client";

// DTO for submission response (User)
export interface SubmissionResponseDTO {
  submissionId: string;
  status: SubmissionStatus;
  submittedAt: Date;
}


export interface AdminSubmissionResponseDTO {
  id: string;
  eventId: string;
  formId: string;
  status: SubmissionStatus;
  submittedAt: Date;

  contact?: {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
  };

  payment?: {
    id: string;
    status: string;
    amount: number;
    currency: string;
    razorpayPaymentId: string | null;
    paidAt: Date | null;
    webhookConfirmed: boolean;
    attempts: number;
  };

  answers: Array<{
    fieldId: string;
    fieldKey: string;
    valueText?: string;
    valueNumber?: number;
    valueBoolean?: boolean;
    valueDate?: Date;
    valueJson?: any;
    fileUrl?: string;
  }>;
}

export interface AdminSubmissionListResponseDTO {
    total: number;
    items: AdminSubmissionResponseDTO[];
}