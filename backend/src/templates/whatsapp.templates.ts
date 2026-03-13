import { MessageTemplate } from "../types/message-template.enum";
import { TemplateParamsMap } from "../types/message-template";

export const WhatsAppTemplates: {
    [K in MessageTemplate ]?: {
        campaignName: string;
        build: (params: TemplateParamsMap[K]) => {
            templateParams: string[];
            buttons?: any[];
        };
    };
} = {
     [MessageTemplate.OTP_VERIFICATION_CODE]: {
        campaignName: "otp verification code",
        build: (params) => ({
            templateParams: [
                params.otp,
            ]
        })
    },
    [MessageTemplate.YSM_ONBOARDING_MESSAGE]: {
        campaignName: "ysm_onboarding_message",
        build: (params) => ({
            templateParams: [
                params.name,
            ]
        })
    },
    [MessageTemplate.BIRTHDAY_WISHES_YSM]: {
        campaignName: "birthday_wishes_ysm",
        build: (params) => ({
            templateParams: [
                params.name,
            ]
        })
    },
    [MessageTemplate.FEEDBACK_COLLECTION_MESSAGE]: {
        campaignName: "feedback_collection_message",
        build: (params) => ({
            templateParams: [
                params.name,
                params.eventName,
            ]
        })
    },
    [MessageTemplate.THANK_YOU_FOR_ATTENDING_WORKSHOP]: {
        campaignName: "thank_you_for_attending_workshop",
        build: (params) => ({
            templateParams: [
                params.name,
                params.eventName,
            ]
        })
    },
    [MessageTemplate.CERTIFICATE_ISSUED]: {
        campaignName: "certificate_issued",
        build: (params) => ({
            templateParams: [
                params.name,
                params.eventName,
                params.link
            ]
        })
    },
    [MessageTemplate.WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE]: {
        campaignName: "workshop_or_internship_completion_message",
        build: (params) => ({
            templateParams: [
                params.name,
                params.eventName,
                params.link,
            ]
        })
    },
    [MessageTemplate.INTERNSHIP_REGISTRATION_CONFIRMATION]: {
        campaignName: "internship_registration_confirmation",
        build: (params) => ({
            templateParams: [
                params.name,
                params.eventName,
                params.startDate,
                params.mode,
                params.reportingTime,
            ]
        })
    },
    [MessageTemplate.REGISTRATION_SUCCESSFUL]: {
        campaignName: "registration_successful",
        build: (params) => ({
            templateParams: [
                params.name,
                params.eventName,
                params.date,
                params.time,
                params.link,
            ]
        })
    },
    [MessageTemplate.WORKSHOP_REMINDER_MESSAGE]: {
        campaignName: "workshop_reminder_message",
        build: (params) => ({
            templateParams: [
                params.name,
                params.eventName,
                params.date,
                params.time,
                params.link,
            ]
        })
    },
}