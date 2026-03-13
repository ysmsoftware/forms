import { IEventRepository } from "../repositories/event.repo";
import { EventInput, EventUpdate } from "../validators/event.schema";
import { createSlug, generateRandomString } from "../utils/slug";
import { EventResponseDTO } from "../dtos/event/event-response.dto";
import { toEventResponseDTO } from "../mappers/event.mapper";
import { ForbiddenError, NotFoundError } from "../errors/http-errors";

export class EventService {

    constructor(private eventRepositor: IEventRepository) {}

    async createEvent(data: EventInput, userId: string): Promise<EventResponseDTO> {
        let slug = createSlug(data.title);
        const isExisting = await this.eventRepositor.findBySlug(slug);
        if (isExisting) {
            slug = `${slug}-${generateRandomString(4)}`;
        }

        const event = await this.eventRepositor.createEvent({
            userId,
            title: data.title,
            slug,
            description: data.description ?? undefined,
            status: data.status,
            ...(data.templateType && { templateType: data.templateType }),
            date: data.date ? new Date(data.date) : null,
            link: data.link ?? `${process.env.DOMAIN}/event/${slug}`,
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

    async updateEvent(id: string, userId: string, data: EventUpdate): Promise<EventResponseDTO> {
        const event = await this.eventRepositor.findById(id);
        if (!event) throw new NotFoundError(`No Event found`);
        if (event.userId !== userId) throw new ForbiddenError("Unauthorized access");

        const updatedEvent = await this.eventRepositor.update(id, {
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

    async findbySlug(slug: string): Promise<EventResponseDTO | null> {
        const event = await this.eventRepositor.findBySlug(slug);
        if (!event) throw new NotFoundError(`No Event found by ${slug}`);
        return toEventResponseDTO(event);
    }

    async findbyId(id: string): Promise<EventResponseDTO | null> {
        const event = await this.eventRepositor.findById(id);
        if (!event) throw new NotFoundError(`No Event found by ${id}`);
        return toEventResponseDTO(event);
    }

    async findByUser(userId: string): Promise<EventResponseDTO[]> {
        const events = await this.eventRepositor.findByUser(userId);
        if (!events) return [];
        return events.map(toEventResponseDTO);
    }

    async publishEvent(id: string, userId: string): Promise<EventResponseDTO> {
        const event = await this.eventRepositor.findById(id);
        if (!event) throw new NotFoundError("No Event found");
        if (event.userId !== userId) throw new ForbiddenError("You are not authorized to publish this event");
        return toEventResponseDTO(await this.eventRepositor.publish(id));
    }

    async closeEvent(id: string, userId: string): Promise<EventResponseDTO> {
        const event = await this.eventRepositor.findById(id);
        if (!event) throw new NotFoundError("No Event found");
        if (event.userId !== userId) throw new ForbiddenError("You are not authorized to close this event");
        return toEventResponseDTO(await this.eventRepositor.close(id));
    }

    async deleteEvent(id: string, userId: string): Promise<EventResponseDTO> {
        const event = await this.eventRepositor.findById(id);
        if (!event) throw new NotFoundError("No Event found");
        if (event.userId !== userId) throw new ForbiddenError("You are not authorized to delete this event");
        return toEventResponseDTO(await this.eventRepositor.markAsDeleted(id));
    }
}
