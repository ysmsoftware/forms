export enum MessageTemplate {
    OTP_VERIFICATION_CODE = "OTP_VERIFICATION_CODE",
    YSM_ONBOARDING_MESSAGE  = "YSM_ONBOARDING_MESSAGE",
    BIRTHDAY_WISHES_YSM     = "BIRTHDAY_WISHES_YSM",
    FEEDBACK_COLLECTION_MESSAGE     = "FEEDBACK_COLLECTION_MESSAGE",
    THANK_YOU_FOR_ATTENDING_WORKSHOP    = "THANK_YOU_FOR_ATTENDING_WORKSHOP",
    CERTIFICATE_ISSUED      = "CERTIFICATE_ISSUED",
    WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE   = "WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE",
    INTERNSHIP_REGISTRATION_CONFIRMATION    = "INTERNSHIP_REGISTRATION_CONFIRMATION",
    REGISTRATION_SUCCESSFUL     = "REGISTRATION_SUCCESSFUL",
    WORKSHOP_REMINDER_MESSAGE   = "WORKSHOP_REMINDER_MESSAGE",
    PAYMENT_CONFIRMATION_MESSAGE = "PAYMENT_CONFIRMATION_MESSAGE",
}

/**
 * Templates that do NOT require an eventId.
 * These can be sent directly from the Contacts tab.
 */
export const CONTACT_ONLY_TEMPLATES = new Set<MessageTemplate>([
    MessageTemplate.OTP_VERIFICATION_CODE,
    MessageTemplate.YSM_ONBOARDING_MESSAGE,
    MessageTemplate.BIRTHDAY_WISHES_YSM,
]);

/**
 * Templates that require event context (eventName, date, link, etc.)
 * If eventId is not supplied, we attempt to auto-resolve it from ContactEvent.
 * If the contact belongs to multiple events, the caller must supply eventId explicitly.
 */
export const EVENT_REQUIRED_TEMPLATES = new Set<MessageTemplate>([
    MessageTemplate.FEEDBACK_COLLECTION_MESSAGE,
    MessageTemplate.THANK_YOU_FOR_ATTENDING_WORKSHOP,
    MessageTemplate.CERTIFICATE_ISSUED,
    MessageTemplate.WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE,
    MessageTemplate.INTERNSHIP_REGISTRATION_CONFIRMATION,
    MessageTemplate.REGISTRATION_SUCCESSFUL,
    MessageTemplate.WORKSHOP_REMINDER_MESSAGE,
    MessageTemplate.PAYMENT_CONFIRMATION_MESSAGE,
]);
