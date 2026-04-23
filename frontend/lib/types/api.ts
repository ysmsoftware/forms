export type UserRole = "ADMIN" | "USER";

export interface User {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
    createdAt: string;
}

export type EventStatus = "DRAFT" | "ACTIVE" | "CLOSED";
export type CertificateTemplateType = "ACHIEVEMENT" | "APPOINTMENT" | "COMPLETION" | "INTERNSHIP" | "WORKSHOP";

export interface PaymentConfig {
    id: string;
    eventId: string;
    amount: number;
    currency: string;
    description?: string;
}

export interface Event {
    id: string;
    organizationId: string;
    title: string;
    slug: string;
    description?: string;
    status: EventStatus;
    paymentEnabled: boolean;
    paymentConfig?: PaymentConfig;
    templateType: CertificateTemplateType;
    date?: string;
    link?: string;
    bannerUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export type FormFieldType = "TEXT" | "NUMBER" | "EMAIL" | "DATE" | "TEXTAREA" | "RANGE" | "CHECKBOX" | "RADIO" | "FILE" | "SELECT";

export interface FormField {
    id: string;
    formId: string;
    stepId?: string;
    key: string;
    type: FormFieldType;
    label: string;
    required: boolean;
    order: number;
    options?: { choices: string[] } | string[];
    validation?: {
        minLength?: number;
        maxLength?: number;
        min?: number;
        max?: number;
        pattern?: string;
    };
}

export interface FormStep {
    id: string;
    formId: string;
    stepNumber: number;
    title: string;
    description?: string;
    fields: FormField[];
}

export interface Form {
    id: string;
    eventId: string;
    isMultiStep: boolean;
    publishedAt?: string;
    isDeleted: boolean;
    fields: FormField[];
    steps?: FormStep[];
}

export type SubmissionStatus = "VISITED" | "STARTED" | "SUBMITTED";

export interface SubmissionAnswer {
    id: string;
    submissionId: string;
    fieldId: string;
    fieldKey: string;
    valueText?: string;
    valueNumber?: number;
    valueBoolean?: boolean;
    valueJson?: unknown[];
    valueDate?: string;
    fileUrl?: string;
    valueFile?: string;
}

export interface Contact {
    id: string;
    name?: string;
    email?: string;
    phone?: string;
}

export interface FormSubmission {
    id: string;
    formId: string;
    eventId: string;
    visitorId: string;
    contactId?: string;
    status: SubmissionStatus;
    submittedAt: string;
    answers: SubmissionAnswer[];
    contact?: Contact;
    payment?: { status: string; amount?: number };
}

export interface FileAsset {
    id: string;
    url: string;
    name: string;
    mimeType: string;
    size: number;
    context: string;
    fieldKey?: string;
    createdAt:string;
}

export type CertificateStatus = "QUEUED" | "PROCESSING" | "GENERATED" | "UPLOADED" | "FAILED";

export interface Certificate {
    id: string;
    submissionId: string;
    contactId?: string;
    eventId: string;
    status: CertificateStatus;
    templateType: CertificateTemplateType;
    issuedAt?: string;
}

export type MessageType = "EMAIL" | "WHATSAPP" | "SMS";
export type MessageStatus = "QUEUED" | "PROCESSING" | "SENT" | "FAILED";

export interface MessageLog {
    id: string;
    contactId: string;
    eventId?: string;
    type: MessageType;
    template: string;
    status: MessageStatus;
    sentAt?: string;
    createdAt: string;
}

// ========== Contact Detail Types ==========

export interface ContactDetail extends Contact {
    createdAt: string;
    updatedAt: string;
    isDeleted: boolean;
    tags?: Tag[];
    contactEvents?: ContactEvent[];
}

export interface Tag {
    id: string;
    name: string;
}

export interface ContactEvent {
    eventId: string;
    source: string; // e.g., "FORM_SUBMISSION"
}

export interface ContactEventsResponse {
    events: Event[];
    total: number;
}

export interface ContactCertificate extends Certificate {
    contact?: Contact;
    event?: Event;
    fileAsset?: FileAsset;
}

export interface ContactCertificatesResponse {
    certificates: ContactCertificate[];
    total: number;
}

export type PaymentStatus = "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";

export interface Payment {
    id: string;
    eventId: string;
    submissionId?: string;
    contactId: string;
    amount: number;
    currency: string;
    status: PaymentStatus;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    paidAt?: string;
    metadata?: Record<string, any>;
    attempts?: number;
    failureReason?: string;
    webhookConfirmed?: boolean;
    createdAt: string;
    isDeleted: boolean;
}

export interface ContactPaymentsResponse {
    payments: {
        items: Payment[];
        nextCursor?: string | null;
    };
    total: number;
}

export type MessageTemplate = "CERTIFICATE_ISSUED" | "PAYMENT_RECEIVED" | "FORM_SUBMITTED" | string;

export interface ContactMessage extends MessageLog {
    contact?: Contact;
    event?: { id: string; title: string };
    template: MessageTemplate;
    params?: Record<string, any>;
    providerResponse?: Record<string, any>;
    errorMessage?: string | null;
    attemptCount: number;
}

export interface ContactMessagesResponse {
    messages: ContactMessage[];
    total: number;
}

export interface ContactTagsResponse {
    tags: ContactTagRelation[];
    total: number;
}

export interface ContactTagRelation {
    contactId: string;
    tagId: string;
    tag: Tag;
}

export interface ContactFilesResponse {
    files: FileAsset[];
    total: number;
}

export interface EventAnalytics {
    totalVisits: number;
    totalStarted: number;
    totalSubmitted: number;
    conversionRate: number;
    lastUpdated: string;
}

// ── API response wrappers ──────────────────────────

export interface AuthLoginResponse {
    accessToken: string;
    refreshToken?: string;
    user: User;
}

export interface EventListResponse {
    events: Event[];
}

export interface SubmissionListResponse {
    total: number;
    items: FormSubmission[];
}


// ── Request input types ───────────────────────────

export interface CreateEventInput {
    title: string;
    description?: string;
    status?: EventStatus;
    date?: string;
    link?: string;
    bannerUrl?: string;
    paymentEnabled?: boolean;
    templateType?: CertificateTemplateType;
    paymentConfig?: {
        amount: number;
        currency: string;
        description?: string;
    };
}

export interface FormFieldInput {
    key: string;
    type: FormFieldType;
    label: string;
    required: boolean;
    order: number;
    options?: string[];
    validation?: { minLength?: number; maxLength?: number; min?: number; max?: number };
}

export interface FormStepInput {
    stepNumber: number;
    title: string;
    description?: string;
    fields: FormFieldInput[];
}

export interface CreateFormInput {
    isMultiStep: boolean;
    fields?: FormFieldInput[];
    steps?: FormStepInput[];
}

export interface AnswerInput {
    fieldId: string;
    fieldKey: string;
    valueText?: string;
    valueNumber?: number;
    valueBoolean?: boolean;
    valueDate?: Date;
    valueJson?: any;
    valueFile?: string;
    fileUrl?: string;
}

export interface SubmitFormInput {
    visitor: { uuid: string };
    answers: AnswerInput[];
    contact?: { email?: string; name?: string; phone?: string };
}

export interface GlobalAnalytics {
    totalEvents: number;
    totalSubmissions: number;
    totalRevenue: number;
}

export interface DailyAnalyticsPoint {
    date: string;
    visits: number;
    started: number;
    submitted: number;
}

export interface EventAnalyticsDetail {
    eventId: string;
    totalVisits: number;
    totalStarted: number;
    totalSubmitted: number;
    conversionRate: number;
    lastUpdated: string | null;
}
