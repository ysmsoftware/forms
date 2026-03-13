import { MessageTemplate } from "../types/message-template.enum";
import { TemplateParamsMap } from "../types/message-template";

export const EmailTemplates: {
    [K in MessageTemplate]?: {
        build: (params: TemplateParamsMap[K]) => {
            subject: string;
            html: string;
        };
    };
} = {
    [MessageTemplate.OTP_VERIFICATION_CODE]: {
        build: (params) => ({
            subject: `Your OTP for YSM Info Solution`,
            html: `
                <p>Your One-Time Password (OTP) is: <strong>${params.otp}</strong></p>
                <p>This OTP is valid for the next 10 minutes. Please do not share it with anyone.</p>
                <p>If you did not request this OTP, please ignore this email.</p>
                <p>Thank You!<br/> - Team YSM Info Solution</p>
            `,
        }),
    },
    [MessageTemplate.YSM_ONBOARDING_MESSAGE]: {
        build: (params) => ({
            subject: `Welcome to YSM Info Solution`,
            html: `
                <p>Hello ${params.name},</p>
                <p>You have been successfully onboarded to <strong>YSM Info Solution</strong>.</p>
                <p>You will now receive official updates regarding our programs, activities, and opportunities.</p>
                <p>Thank You!<br/> - Team YSM Info Solution</p>
            `,
        }),
    },

    [MessageTemplate.BIRTHDAY_WISHES_YSM]: {
        build: (params) => ({
            subject: `Happy Birthday from YSM Info Solution! 🎂`,
            html: `
                <p>Hello ${params.name},</p>
                <p>Team <strong>YSM Info Solution</strong> wishes you a very <strong>Happy Birthday!</strong> 🎉</p>
                <p>May this year bring you success, growth and new opportunities.</p>
                <p>Keep shining and keep learning!<br/> - Team YSM Info Solution</p>
            `,
        }),
    },

    [MessageTemplate.FEEDBACK_COLLECTION_MESSAGE]: {
        build: (params) => ({
            subject: `We Value Your Feedback - ${params.name}`,
            html: `
                <p>Dear ${params.name},</p>
                <p>Thank you for being part of <strong>${params.eventName}</strong>.</p>
                <p>Please share your feedback: <a href="https://g.page/r/CbW3sg1807sqEBM/review">Click here</a></p>
                <p>Your input helps us improve and serve students better.<br/> - Team YSM Info Solution</p>
            `,
        }),
    },

    [MessageTemplate.THANK_YOU_FOR_ATTENDING_WORKSHOP]: {
        build: (params) => ({
            subject: `Thank You for Attending - ${params.eventName}`,
            html: `
                <p>Dear ${params.name},</p>
                <p>Thank you for attending the <strong>${params.eventName}</strong> conducted by YSM Info Solution.</p>
                <p>We hope the session added value to your learning journey.</p>
                <p>Your feedback matters to us: <a href="https://g.page/r/CbW3sg1807sqEBM/review">Share Feedback</a></p>
                <p>Stay connected for upcoming programs & opportunities!<br/> - Team YSM Info Solution</p>
            `,
        }),
    },

    [MessageTemplate.CERTIFICATE_ISSUED]: {
        build: (params) => ({
            subject: `Certificate Issued - ${params.eventName}`,
            html: `
                <p>Hello ${params.name},</p>
                <p>Your certificate for <strong>${params.eventName}</strong> has been issued.</p>
                <p><a href="${params.link}">Download Certificate</a></p>
                <p>Keep learning & growing!<br/> - YSM Info Solution</p>
            `,
        }),
    },

    [MessageTemplate.WORKSHOP_OR_INTERNSHIP_COMPLETION_MESSAGE]: {
        build: (params) => ({
            subject: `Congratulations on Completing - ${params.eventName}`,
            html: `
                <p>Dear ${params.name},</p>
                <p>You have successfully completed the <strong>${params.eventName}</strong> at YSM Info Solution.</p>
                <p>We appreciate your dedication and active participation.</p>
                <p>Your certificate has been issued: <a href="${params.link}">Download Certificate</a></p>
                <p>Wishing you success in your career ahead!<br/> - Team YSM Info Solution</p>
            `,
        }),
    },

    [MessageTemplate.INTERNSHIP_REGISTRATION_CONFIRMATION]: {
        build: (params) => ({
            subject: `Internship Registration Confirmed - ${params.eventName}`,
            html: `
                <p>Dear ${params.name},</p>
                <p>Congratulations! Your registration for the <strong>${params.eventName}</strong> Internship Program at YSM Info Solution has been successfully completed.</p>
                <p>📅 <strong>Start Date:</strong> ${params.startDate}</p>
                <p>📍 <strong>Mode:</strong> ${params.mode}</p>
                <p>⏰ <strong>Reporting Time:</strong> ${params.reportingTime}</p>
                <p>Further instructions will be shared shortly. Welcome aboard! 🚀<br/> - Team YSM Info Solution</p>
            `,
        }),
    },

    [MessageTemplate.REGISTRATION_SUCCESSFUL]: {
        build: (params) => ({
            subject: `Registration Successful - ${params.eventName}`,
            html: `
                <p>Dear ${params.name},</p>
                <p>Thank you for registering for <strong>${params.eventName}</strong> at YSM Info Solution.</p>
                <p>📅 <strong>Date:</strong> ${params.date}</p>
                <p>⏰ <strong>Time:</strong> ${params.time}</p>
                <p>📍 <strong>Location/Link:</strong> <a href="${params.link}">${params.link}</a></p>
                <p>We look forward to your participation. For queries, contact: +91 898 308 3698<br/> - Team YSM Info Solution</p>
            `,
        }),
    },

    [MessageTemplate.WORKSHOP_REMINDER_MESSAGE]: {
        build: (params) => ({
            subject: `Reminder: ${params.eventName} is Coming Up!`,
            html: `
                <p>Dear ${params.name},</p>
                <p>This is a reminder for your registered program: <strong>${params.eventName}</strong></p>
                <p>📅 <strong>Date:</strong> ${params.date}</p>
                <p>⏰ <strong>Time:</strong> ${params.time}</p>
                <p>📍 <strong>Venue/Link:</strong> <a href="${params.link}">${params.link}</a></p>
                <p>Kindly be available 10 minutes before the scheduled time.</p>
                <p>We look forward to your participation.<br/> - Team YSM Info Solution</p>
            `,
        }),
    },
};