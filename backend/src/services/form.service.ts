import { FormResponseDTO } from "../dtos/form/form-response.dto";
import { PublicFormResponseDTO } from "../dtos/submissions/publicForm-response.dto";
import { BadRequestError, NotFoundError, ForbiddenError } from "../errors/http-errors";
import { toFormResponseDTO } from "../mappers/form.mapper";
import { toPublicFormResponseDTO } from "../mappers/publicForm.mapper";
import { IEventRepository } from "../repositories/event.repo";
import { IFormRepository } from "../repositories/form.repo";
import { FormInput } from "../validators/form.schema";

export class FormService {

    constructor(
        private formRepo: IFormRepository,
        private eventRepo: IEventRepository
    ) { }

    async createForm(userId: string, eventId: string, data: FormInput): Promise<FormResponseDTO> {

        // Check if event exits
        const event = await this.eventRepo.findById(eventId);

        if (!event) {
            throw new NotFoundError("Event not found");
        }

        if (event.userId != userId) {
            throw new ForbiddenError("You are not authorized to create this form");
        }

        if (event.status === "CLOSED") {
            throw new BadRequestError("Event is closed");
        }

        const form = await this.formRepo.createForm(eventId, data);

        return toFormResponseDTO(form)

    }

    async upsertForm(userId: string, eventId: string, data: FormInput): Promise<FormResponseDTO> {
        const event = await this.eventRepo.findById(eventId);

        if (!event) {
            throw new NotFoundError("Event not found");
        }
        if (event.userId != userId) {
            throw new ForbiddenError("You are not authorized to update this form");
        }
        if (event.status === "ACTIVE") {
            throw new BadRequestError("Event is active");
        }

        if (event.status === "CLOSED") {
            throw new BadRequestError("Event is closed");
        }
        const form = await this.formRepo.findByEventId(eventId);
        if (form!.publishedAt) {
            throw new BadRequestError("Published form cannot be modified");
        }

        if (form?.isMultiStep && !data.isMultiStep) {
            throw new BadRequestError("Cannot convert multi-step form to single-step");
        }


        const updatedForm = await this.formRepo.upsertForm(eventId, data);

        return toFormResponseDTO(updatedForm);
    }

    async getFormByEvent(userId: string, eventId: string): Promise<FormResponseDTO> {
        const form = await this.formRepo.findByEventId(eventId);

        if (!form) throw new NotFoundError("Form not found");

        const event = await this.eventRepo.findById(form.eventId);
        if (event!.userId !== userId) throw new ForbiddenError("You are not authorized to view this form");

        return toFormResponseDTO(form)
    }

    async getFormById(userId: string, formId: string): Promise<FormResponseDTO> {
        const form = await this.formRepo.findById(formId);
        if (!form) throw new NotFoundError("Form not found");

        const event = await this.eventRepo.findById(form.eventId);
        if (event!.userId !== userId) {
            throw new ForbiddenError("You are not authorized to view this form");
        }

        return toFormResponseDTO(form);
    }


    async getFormBySlug(slug: string): Promise<PublicFormResponseDTO> {
        const result = await this.formRepo.findBySlug(slug);

        if (!result) throw new NotFoundError("Form not found");

        return toPublicFormResponseDTO({
            event: result.event,
            form: result.form,
        });
    }

    async publishForm(userId: string, formId: string): Promise<FormResponseDTO> {
        const form = await this.formRepo.findById(formId);
        if (!form) throw new NotFoundError("Form not found");

        const event = await this.eventRepo.findById(form.eventId);
        if (!event || event.userId !== userId) {
            throw new ForbiddenError("You are not authorized to publish this form");
        }

        if (event.status !== "ACTIVE") {
            throw new BadRequestError("Can't publish a form whose Event is not Active");
        }

        if (!form.steps.length && !form.fields?.length) {
            throw new BadRequestError("Cannot publish empty form");
        }

        const publishedForm = await this.formRepo.publishForm(formId);
        return toFormResponseDTO(publishedForm);
    }

    async deleteForm(userId: string, formId: string): Promise<void> {
        const form = await this.formRepo.findById(formId);
        if (!form) throw new NotFoundError("Form not found");

        const event = await this.eventRepo.findById(form.eventId);
        if (event!.userId !== userId) throw new ForbiddenError("You are not authorized to delete this form");

        await this.formRepo.deleteForm(formId);

        return
    }

}
