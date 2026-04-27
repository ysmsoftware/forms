import { apiClient } from "./client";

export type MessageType = "EMAIL" | "WHATSAPP" | "SMS";
export type MessageStatus = "QUEUED" | "PROCESSING" | "SENT" | "FAILED";

export type MessageTemplate =
    | "OTP_VERIFICATION_CODE"
    | "YSM_ONBOARDING_MESSAGE"
    | "BIRTHDAY_WISHES_YSM"
    | "FEEDBACK_COLLECTION_MESSAGE"
    | "THANK_YOU_FOR_ATTENDING_WORKSHOP"
    | "CERTIFICATE_ISSUED"
    | "WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE"
    | "INTERNSHIP_REGISTRATION_CONFIRMATION"
    | "REGISTRATION_SUCCESSFUL"
    | "WORKSHOP_REMINDER_MESSAGE";

export interface MessageLog {
    id: string;
    contactId: string;
    eventId?: string;
    type: MessageType;
    template: MessageTemplate;
    params: Record<string, string>;
    status: MessageStatus;
    sentAt: string | null;
    providerResponse: any;
    errorMessage: string | null;
    attemptCount: number;
    createdAt: string;
    contact?: { id: string; name: string; email: string; phone: string };
    event?: { id: string; title: string };
}

export interface SendMessageInput {
    contactId: string;
    type: MessageType;
    template: MessageTemplate;
    eventId?: string;
    params?: Record<string, string>;
}

export interface GetMessagesParams {
    contactId?: string;
    eventId?: string;
    email?: string;
    phone?: string;
    limit?: number;
    offset?: number;
}

export async function sendMessage(body: SendMessageInput): Promise<MessageLog> {
    return apiClient<MessageLog>("/messages/send", {
        method: "POST",
        body: JSON.stringify(body),
    });
}

export interface ResolveParamsInput {
    contactId: string
    eventId?: string
    template: string
}

export interface ResolveParamsResult {
    resolved: Record<string, string>
    missing: string[]
}

export async function resolveMessageParams(
    input: ResolveParamsInput
): Promise<ResolveParamsResult> {
    return apiClient<ResolveParamsResult>(
        "/messages/resolve-params",
        {
            method: "POST",
            body: JSON.stringify(input)
        }
    )
}

export interface MessageListResponse {
    data: MessageLog[];
    pagination: { limit: number; offset: number; count: number };
}

export async function getMessages(params?: GetMessagesParams): Promise<{ data: MessageLog[]; pagination: { limit: number; offset: number; count: number } }> {
    const query = new URLSearchParams();
    if (params?.contactId) query.set("contactId", params.contactId);
    if (params?.eventId) query.set("eventId", params.eventId);
    if (params?.email) query.set("email", params.email);
    if (params?.phone) query.set("phone", params.phone);
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    const qs = query.toString();

    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "/api";

    // Use raw fetch with credentials:include so the httpOnly accessToken cookie
    // is sent automatically. Cannot use apiClient here because apiClient's unwrap
    // extracts json.data, which would drop the pagination field from this response.
    const res = await fetch(`${BASE_URL}/messages${qs ? `?${qs}` : ""}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
        const body = await res.json().catch(() => ({ message: "Request failed" }));
        throw new Error(body.message ?? "Failed to fetch messages");
    }

    const json = await res.json();
    return {
        data: json.data ?? [],
        pagination: json.pagination ?? { limit: 15, offset: 0, count: 0 },
    };
}

export interface RetryFailedResponse {
    success: boolean;
    message: string;
}

export async function retryFailedMessages(): Promise<RetryFailedResponse> {
    return apiClient<RetryFailedResponse>("/messages/retry-failed", {
        method: "POST",
    });
}