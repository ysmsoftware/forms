import { Form, FormField, FormStep, Event } from "@prisma/client";
import { FormInput } from "../validators/form.schema";
import { prisma } from "../config/db";

export type FormWithDetails = Form & {
    steps: (FormStep & {
        fields: FormField[];
    })[];
    fields?: FormField[];
};

export type PublicFormResult = {
    event: Event;
    form: FormWithDetails;
};



export interface IFormRepository {
    createForm(eventId: string, data: FormInput): Promise<FormWithDetails>;
    upsertForm(eventId: string, data: FormInput): Promise<FormWithDetails>;
    findById(id: string): Promise<FormWithDetails | null>;
    findByEventId(eventId: string): Promise<FormWithDetails | null>;
    findBySlug(slug: string): Promise<PublicFormResult | null>;
    deleteForm(id: string): Promise<void>;
    publishForm(id: string): Promise<FormWithDetails>;
}


export class FormRepositories implements IFormRepository {
    private readonly includeDetails = {
        steps: {
            include: {
                fields: { orderBy: { order: "asc" as const } },
            },
            orderBy: { stepNumber: "asc" as const },
        },
        fields: {
            where: { stepId: null },
            orderBy: { order: "asc" as const },
        },
    };

    private mapFieldData(fields: any[]) {
        return fields.map((field) => ({
            key: field.key,
            type: field.type,
            label: field.label,
            required: field.required ?? false,
            order: field.order,
            validation: field.validation ?? {},
            options: field.options ?? {},
        }));
    }

    async createForm(eventId: string, data: FormInput): Promise<FormWithDetails> {
        const form = await prisma.form.create({
            data: {
                eventId,
                isMultiStep: data.isMultiStep ?? false,
                settings: data.settings ?? {},

                ...(data.isMultiStep && data.steps && {
                    steps: {
                        create: data.steps.map((step) => ({
                            stepNumber: step.stepNumber,
                            title: step.title,
                            description: step.description ?? null,
                            fields: {
                                create: step.fields.map((field) => ({
                                    key: field.key,
                                    type: field.type,
                                    label: field.label,
                                    required: field.required ?? false,
                                    order: field.order,
                                    validation: field.validation ?? {},
                                    options: field.options ?? {},

                                    form: {
                                        connect: { eventId }
                                    }
                                })),
                            },
                        })),
                    },
                }),
                ...(!data.isMultiStep && data.fields && {
                    fields: { create: this.mapFieldData(data.fields) },
                }),
            },
            include: this.includeDetails,
        });
        return form as FormWithDetails;
    }

    async upsertForm(eventId: string, data: FormInput): Promise<FormWithDetails> {
        return prisma.$transaction(async (tx) => {
            const form = await tx.form.upsert({
                where: { eventId },
                update: {
                    isMultiStep: data.isMultiStep,
                    settings: data.settings ?? {},
                },
                create: {
                    eventId,
                    isMultiStep: data.isMultiStep,
                    settings: data.settings ?? {},
                },
            });

            // clean slate
            await tx.formField.deleteMany({ where: { formId: form.id } });
            await tx.formStep.deleteMany({ where: { formId: form.id } });

            if (data.isMultiStep) {
                for (const step of data.steps!) {
                    const createdStep = await tx.formStep.create({
                        data: {
                            formId: form.id,
                            stepNumber: step.stepNumber,
                            title: step.title,
                            description: step.description ?? null,
                        },
                    });

                    await tx.formField.createMany({
                        data: step.fields.map((field) => ({
                            formId: form.id,
                            stepId: createdStep.id,
                            key: field.key,
                            type: field.type,
                            label: field.label,
                            required: field.required ?? false,
                            order: field.order,
                            options: field.options ?? {},
                            validation: field.validation ?? {},
                        })),
                    });
                }
            } else {
                await tx.formField.createMany({
                    data: data.fields!.map((field) => ({
                        formId: form.id,
                        key: field.key,
                        type: field.type,
                        label: field.label,
                        required: field.required ?? false,
                        order: field.order,
                        options: field.options ?? {},
                        validation: field.validation ?? {},
                    })),
                });
            }

            return tx.form.findUnique({
                where: { id: form.id },
                include: this.includeDetails,
            }) as Promise<FormWithDetails>;
        });
    }


    async findById(id: string): Promise<FormWithDetails | null> {
        const form = await prisma.form.findUnique({
            where: { id },
            include: this.includeDetails,
        });

        return form as FormWithDetails | null;
    }

    async findByEventId(eventId: string): Promise<FormWithDetails | null> {
        const form = await prisma.form.findUnique({
            where: { eventId },
            include: this.includeDetails,
        });

        return form as FormWithDetails | null;
    }

    async findBySlug(slug: string): Promise<PublicFormResult | null> {
        const event = await prisma.event.findUnique({
            where: { slug },
            include: { form: { include: this.includeDetails } },
        });

        if (!event || !event.form) return null;

        const { form, ...eventData } = event;
        return {
            event: eventData as Event,
            form: form as FormWithDetails,
        };
    }
    async publishForm(id: string): Promise<FormWithDetails> {

        const form = await prisma.form.update({
            where: { id },
            data: { publishedAt: new Date() },
            include: this.includeDetails,
        });

        return form as FormWithDetails;
    }

    async deleteForm(id: string): Promise<void> {
        await prisma.form.update({
            where: { id },
            data: { isDeleted: true },
        });
    }
}
