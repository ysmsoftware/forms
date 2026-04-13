import { MessageTemplate } from "./message-template.enum"

export type TemplateParamsMap = {

    [MessageTemplate.OTP_VERIFICATION_CODE]: {
        otp: string,
        name: string,
    },
    [MessageTemplate.YSM_ONBOARDING_MESSAGE]: {
        name: string,
    },
    [MessageTemplate.BIRTHDAY_WISHES_YSM]: {
        name: string,
    },
    [MessageTemplate.FEEDBACK_COLLECTION_MESSAGE]: {
        name: string,
        eventName: string,
    },
    [MessageTemplate.THANK_YOU_FOR_ATTENDING_WORKSHOP]: {
        name: string,
        eventName: string,
    },
    [MessageTemplate.CERTIFICATE_ISSUED]: {
        name: string,
        eventName: string,
        link: string,
    },
    [MessageTemplate.WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE]: {
        name: string,
        eventName: string,
        link: string,
    },
    [MessageTemplate.INTERNSHIP_REGISTRATION_CONFIRMATION]: {
        name: string,
        eventName: string,
        startDate: string,
        mode: string,
        reportingTime: string,
    },
    [MessageTemplate.REGISTRATION_SUCCESSFUL]: {
        name: string,
        eventName: string,
        date: string,
        time: string,
        link: string,
    },
    [MessageTemplate.WORKSHOP_REMINDER_MESSAGE]: {
        name: string,
        eventName: string,
        date: string,
        time: string,
        link: string,
    },
    [MessageTemplate.PAYMENT_CONFIRMATION_MESSAGE]: {
        name: string,
        amount: string,
        eventName: string,
    }
}