import { IEventRepository } from "../repositories/event.repo";
import { EventInput, EventUpdate } from "../validators/event.schema";
import { createSlug, generateRandomString } from "../utils/slug";
import { EventResponseDTO } from "../dtos/event/event-response.dto";
import { toEventResponseDTO } from "../mappers/event.mapper";
import { ForbiddenError, NotFoundError } from "../errors/http-errors";

export class EventService {

    constructor(private eventRepository: IEventRepository) { }

    async createEvent(data: EventInput, userId: string, organizationId: string): Promise<EventResponseDTO> {
        let slug = createSlug(data.title);
        const isExisting = await this.eventRepository.findBySlug(slug);
        if (isExisting) {
            slug = `${slug}-${generateRandomString(4)}`;
        }

        const event = await this.eventRepository.createEvent({
            userId,
            organizationId,
            title: data.title,
            slug,
            description: data.description ?? undefined,
            status: data.status,
            ...(data.templateType && { templateType: data.templateType }),
            date: data.date ? new Date(data.date) : null,
            link: data.link ?? `${process.env.DOMAIN}/form/${slug}`,
            bannerUrl: data.bannerUrl ?? null,
            paymentEnabled: data.paymentEnabled,
            paymentConfig: data.paymentConfig ? {
                amount: data.paymentConfig.amount,
                currency: data.paymentConfig.currency,
                description: data.paymentConfig.description ?? null
            } : null
        });

        return toEventResponseDTO(event);
    }

    async updateEvent(id: string, organizationId: string, data: EventUpdate): Promise<EventResponseDTO> {
        const event = await this.eventRepository.findById(id);
        if (!event) throw new NotFoundError(`No Event found`);
        if (event.organizationId !== organizationId) throw new ForbiddenError("Unauthorized access");

        const updatedEvent = await this.eventRepository.update(id, {
            title: data.title ?? undefined,
            description: data.description ?? undefined,
            status: data.status ?? undefined,
            link: data.link ?? `${process.env.DOMAIN}/event/${event.slug}`,
            bannerUrl: data.bannerUrl ?? null,
            paymentEnabled: data.paymentEnabled ?? undefined,
            paymentConfig: data.paymentConfig ? {
                amount: data.paymentConfig.amount ?? undefined,
                currency: data.paymentConfig.currency ?? undefined,
                description: data.paymentConfig.description ?? undefined
            } : undefined
        });

        return toEventResponseDTO(updatedEvent);
    }

    async findbySlug(slug: string): Promise<EventResponseDTO> {
        const event = await this.eventRepository.findBySlug(slug);
        if (!event) throw new NotFoundError(`No Event found by ${slug}`);
        return toEventResponseDTO(event);
    }

    async findbyId(id: string, organizationId: string): Promise<EventResponseDTO> {
        const event = await this.eventRepository.findById(id);
        if (!event) throw new NotFoundError(`No Event found by ${id}`);
        if (event.organizationId !== organizationId) throw new ForbiddenError("Unauthorized access");
        return toEventResponseDTO(event);
    }

    async findByOrganization(organizationId: string): Promise<EventResponseDTO[]> {
        const events = await this.eventRepository.findByOrganization(organizationId);
        return events.map(toEventResponseDTO);
    }

    async findByUser(userId: string): Promise<EventResponseDTO[]> {
        const events = await this.eventRepository.findByUser(userId);
        if (!events) return [];
        return events.map(toEventResponseDTO);
    }


    async publishEvent(id: string, organizationId: string): Promise<EventResponseDTO> {
        const event = await this.eventRepository.findById(id);
        if (!event) throw new NotFoundError("No Event found");
        if (event.organizationId !== organizationId) throw new ForbiddenError("Unauthorized access");
        return toEventResponseDTO(await this.eventRepository.publish(id));
    }

    async closeEvent(id: string, organizationId: string): Promise<EventResponseDTO> {
        const event = await this.eventRepository.findById(id);
        if (!event) throw new NotFoundError("No Event found");
        if (event.organizationId !== organizationId) throw new ForbiddenError("Unauthorized access");
        return toEventResponseDTO(await this.eventRepository.close(id));
    }

    async deleteEvent(id: string, organizationId: string): Promise<EventResponseDTO> {
        const event = await this.eventRepository.findById(id);
        if (!event) throw new NotFoundError("No Event found");
        if (event.organizationId !== organizationId) throw new ForbiddenError("Unauthorized access");
        return toEventResponseDTO(await this.eventRepository.markAsDeleted(id));
    }
}