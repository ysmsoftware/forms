import logger from "../config/logger";
import { redis } from "../config/redis";
import { PublicFormResponseDTO } from "../dtos/submissions/publicForm-response.dto";
import { AdminSubmissionListResponseDTO, AdminSubmissionResponseDTO, SubmissionListItemDTO, SubmissionResponseDTO } from "../dtos/submissions/submission-response.dto";
import { BadRequestError, ForbiddenError, NotFoundError } from "../errors/http-errors";
import { toPublicFormResponseDTO } from "../mappers/publicForm.mapper";
import { IEventRepository } from "../repositories/event.repo";
import { IFormRepository } from "../repositories/form.repo";
import { ISubmissionRepository } from "../repositories/submission.repo";
import { StartSubmissionInput, SubmissionFilterInput, SubmissionFormInput } from "../validators/submission.schema";
import { VisitorInput } from "../validators/visitor.schema";
import { validateSubmissionAgainstForm } from "../validators/formSubmission.validator";
import { IContactRepository } from "../repositories/contact.repo";
import { IFileRepository } from "../repositories/file.repo";

export class SubmissionService {
    constructor(
        private submissionRepo: ISubmissionRepository,
        private formRepo: IFormRepository,
        private eventRepo: IEventRepository,
        private contactRepo: IContactRepository,
        private fileRepo: IFileRepository,
    ) { }


    // helper
    private async incrWithTTL(key: string, ttlSeconds: number) {
        const value = await redis.incr(key);
        // if first increment -> set TTL
        if (value === 1) {
            await redis.expire(key, ttlSeconds);
        }
    }

    /** Public: GET /api/forms/:slug 
     * 1. Validate event exists & isActive
     * 2. Validate form exists & isPublisted
     * 3. Map form -> PublicFormResponseDTO 
    */
    async getPublicForm(slug: string): Promise<PublicFormResponseDTO> {
        const cacheKey = `public:form:${slug}`
        const cached = await redis.get(cacheKey);
        if (cached) {
            return JSON.parse(cached);
        }

        // Cache miss - fetch from database
        const event = await this.eventRepo.findBySlug(slug);
        if (!event || event.status !== "ACTIVE") {
            throw new NotFoundError("Event not found or inactive");
        }

        const form = await this.formRepo.findByEventId(event.id);
        if (!form || !form.publishedAt) {
            throw new NotFoundError("Form not found or not published");
        }

        const dto = toPublicFormResponseDTO({ event, form });

        // cache for future
        await redis.set(cacheKey, JSON.stringify(dto), "EX", 60 * 60);

        return dto

    };

    /** Public: POST /api/forms/:slug/visit 
     * 1. Upsert Visitor
     * 2. create VISITED session
     * 
     * Redis:
     * - INCR event:{eventId}:visits
    */
    async recordVisit(input: VisitorInput): Promise<void> {
        const { slug, visitor } = input

        const event = await this.eventRepo.findBySlug(slug);
        if (!event || event.status !== "ACTIVE") {
            throw new NotFoundError("Event not found or inactive");
        }

        const dbVisitor = await this.submissionRepo.upsertVisitor(visitor);

        /** 
         * Future enchancement
        * Add Redis first logic here if scale is more then 50K visit/day
       */
        await this.submissionRepo.createVisitSession({
            visitorId: dbVisitor.id,
            eventId: event.id,
            status: "VISITED",
        });

        try {
            const visitKey = `analytics:event:${event.id}:visitor:${dbVisitor.id}`;
            const isNewVisit = await redis.set(visitKey, "1", "EX", 24 * 60 * 60, "NX");

            if (isNewVisit === "OK") {
                const visitsKey = `analytics:event:${event.id}:visits:delta`;
                await this.incrWithTTL(visitsKey, 7 * 24 * 60 * 60); // 7 days TTL
                await redis.sadd("analytics:activeEvents", event.id);
            }
        } catch (err) {
            logger.warn("Redis analytics failed", err);
        }
    };

    /** Public: POST /api/forms/:slug/start 
     * 1. Ensure VISITED session exits
     * 2. Update session -> STARTED
     * 
     * Redis:
     * = INCR event:{eventId}:started
    */
    async startSubmission(input: StartSubmissionInput): Promise<void> {
        const { slug, visitor } = input;

        const event = await this.eventRepo.findBySlug(slug);
        if (!event || event.status !== "ACTIVE") {
            throw new NotFoundError("Event not found or inactive");
        }

        const form = await this.formRepo.findByEventId(event.id);
        if (!form || !form.publishedAt) {
            throw new NotFoundError("Form not available");
        }

        const dbVisitor = await this.submissionRepo.upsertVisitor({ uuid: visitor.uuid });

        await this.submissionRepo.createVisitSession({
            visitorId: dbVisitor.id,
            eventId: event.id,
            status: "STARTED",
        });

        try {
            const startKey = `analytics:event:${event.id}:visitor:${dbVisitor.id}:started`;
            const isNew = await redis.set(startKey, "1", "EX", 86400, "NX");

            if (isNew === "OK") {
                const startedKey = `analytics:event:${event.id}:started:delta`;
                await this.incrWithTTL(startedKey, 7 * 24 * 60 * 60);
                await redis.sadd("analytics:activeEvents", event.id);
            }

        } catch (err) {
            logger.warn("Redis analytics failed", err);
        }
    };

    /** Public: POST /api/forms/:slug/submit 
     * 
     * Atomic Flow:
     * 1. Validate event & publised form
     * 2. Validate answers against form fields
     * 3. Upsert visitor
     * 4. Deduplicate or create Contact
     * 5. create submission + answers (transaction)
     * 6. update visitsesssion -> submitted
     * 
     * Redis: - INCR event:{eventId}:submitted 
    */
    async submitForm(input: SubmissionFormInput): Promise<SubmissionResponseDTO> {

        const { slug, visitor, contact, answers } = input;
        // - Resolve event + form
        const event = await this.eventRepo.findBySlug(slug);
        if (!event || event.status !== "ACTIVE") {
            throw new NotFoundError("Event not found or inactive");
        }
        const form = await this.formRepo.findByEventId(event.id);
        if (!form || !form.publishedAt) {
            throw new NotFoundError("Form not available");
        }

        const allFields = form.isMultiStep && form.steps
            ? form.steps.flatMap(step => step.fields || [])
            : form.fields || [];

        if (allFields.length === 0) {
            throw new BadRequestError("Form has no fields");
        }

        const verifyAnswers = answers.map((a) => ({
            fieldId: a.fieldId,
            fieldKey: a.fieldKey,

            ...(a.valueText !== undefined && { valueText: a.valueText }),
            ...(a.valueNumber !== undefined && { valueNumber: a.valueNumber }),
            ...(a.valueBoolean !== undefined && { valueBoolean: a.valueBoolean }),
            ...(a.valueDate !== undefined && { valueDate: new Date(a.valueDate) }),
            ...(a.valueJson !== undefined && { valueJson: a.valueJson }),
            ...(a.fileUrl !== undefined && { fileUrl: a.fileUrl }),
        }));

        validateSubmissionAgainstForm(
            allFields.map((f) => ({
                id: f.id,
                key: f.key,
                type: f.type,
                required: f.required,
            })),
            verifyAnswers
        );

        // - Upsert visitor + contact lookup in parallel (neither depends on the other)
        const [dbVisitor, existingContact] = await Promise.all([
            this.submissionRepo.upsertVisitor(visitor),
            (contact?.email || contact?.phone)
                ? this.contactRepo.findContactByEmailOrPhone(event.organizationId, contact.email, contact.phone)
                : Promise.resolve(null),
        ]);

        // - Resolve contactId: reuse existing or create new
        let contactId: string | undefined;

        if (contact?.email || contact?.phone) {
            if (existingContact) {
                contactId = existingContact.id;
            } else {
                const created = await this.contactRepo.createContact({
                    organizationId: event.organizationId,
                    ...(contact.name && { name: contact.name }),
                    ...(contact.email && { email: contact.email }),
                    ...(contact.phone && { phone: contact.phone }),
                });
                contactId = created.id;
            }
        }


        // - Backfill contactId on any file assets uploaded during this session.
        //   Files are uploaded before the form is submitted (no contactId yet at
        //   that point), so we patch all of them in one updateMany call now that
        //   the contact is known. The guard inside the repo (contactId: null)
        //   ensures we never overwrite a pre-existing link.
        if (contactId) {
            const fileUrls = answers
                .filter(a => a.fileUrl)
                .map(a => a.fileUrl as string);

            if (fileUrls.length > 0) {
                await this.fileRepo.updateContactIdByUrls(fileUrls, contactId);
            }
        }

        // - Create full submission
        const submission = await this.submissionRepo.createFullSubmission({
            organizationId: event.organizationId,
            formId: form.id,
            eventId: event.id,
            visitorId: dbVisitor.id,
            ...(contactId ? { contactId } : {}),
            status: "SUBMITTED",
            answers: answers.map((a) => ({
                fieldId: a.fieldId,
                fieldKey: a.fieldKey,
                ...(a.valueText !== undefined && { valueText: a.valueText }),
                ...(a.valueNumber !== undefined && { valueNumber: a.valueNumber }),
                ...(a.valueBoolean !== undefined && { valueBoolean: a.valueBoolean }),
                ...(a.valueDate && { valueDate: new Date(a.valueDate) }),
                ...(a.valueJson !== undefined && { valueJson: a.valueJson }),
                ...(a.fileUrl !== undefined && { fileUrl: a.fileUrl }),
            }))

        })
        // - Redis increment
        try {
            const submittedKey = `analytics:event:${event.id}:submitted:delta`;
            await this.incrWithTTL(submittedKey, 7 * 24 * 60 * 60); // 7 days TTL
            await redis.sadd("analytics:activeEvents", event.id);

            await redis.del(`draft:form:${form.id}:visitor:${dbVisitor.id}`);
        } catch (err) {
            logger.warn("Redis analytics failed", err);
        }
        // - Return SubmissionResponseDTO

        return {
            submissionId: submission.id,
            status: submission.status,
            submittedAt: submission.submittedAt,
        }
    };

    /**
    * Admin: GET /api/admin/submissions/:id
    */
    async getSubmissionById(id: string, organizationId: string): Promise<AdminSubmissionResponseDTO> {
        const submission = await this.submissionRepo.findSubmissionById(id);
        if (!submission) throw new NotFoundError("Submission not found");
        if(submission.organizationId !== organizationId) throw new ForbiddenError("Unauthorized");

        const response: AdminSubmissionResponseDTO = {
            id: submission.id,
            eventId: submission.eventId,
            formId: submission.formId,
            status: submission.status,
            submittedAt: submission.submittedAt,
            answers: submission.answers.map((a) => ({
                fieldId: a.fieldId,
                fieldKey: a.fieldKey,
                ...(a.valueText !== null && { valueText: a.valueText }),
                ...(a.valueNumber !== null && { valueNumber: a.valueNumber }),
                ...(a.valueBoolean !== null && { valueBoolean: a.valueBoolean }),
                ...(a.valueDate !== null && { valueDate: a.valueDate }),
                ...(a.valueJson !== null && { valueJson: a.valueJson }),
                ...(a.fileUrl !== null && { fileUrl: a.fileUrl }),
            })),
        };

        if (submission.contact) {
            response.contact = {
                id: submission.contact.id,
                ...(submission.contact.name !== null && { name: submission.contact.name }),
                ...(submission.contact.email !== null && { email: submission.contact.email }),
                ...(submission.contact.phone !== null && { phone: submission.contact.phone }),
            };
        }

        if (submission.payment) {
            response.payment = {
                id: submission.payment.id,
                status: submission.payment.status,
                amount: submission.payment.amount,
                currency: submission.payment.currency,
                razorpayPaymentId: submission.payment.razorpayPaymentId,
                paidAt: submission.payment.paidAt,
                webhookConfirmed: submission.payment.webhookConfirmed,
                attempts: submission.payment.attempts,
            };
        }

        return response;
    }


    /**
   * Admin: GET /api/admin/events/:eventId/submissions
   */
    async getSubmissionsByEvent(
        eventId: string,
        organizationId: string,
        filters: {
            status: 'ALL' | 'VISITED' | 'STARTED' | 'SUBMITTED',
            limit: number,
            offset: number,
            fromDate?: Date,
            toDate?: Date
        }): Promise<AdminSubmissionListResponseDTO> {


        const event = await this.eventRepo.findById(eventId);
        if(!event) throw new NotFoundError("Event not found");
        if(event.organizationId !== organizationId) throw new ForbiddenError("Unauthorized");

        const { items: submissions, totalCount } = await this.submissionRepo.findSubmissionsByEvent(
            eventId,
            {
                ...(filters.status !== "ALL" && { status: filters.status }),
                limit: filters.limit,
                offset: filters.offset,
                ...(filters.fromDate && { formDate: new Date(filters.fromDate) }),
                ...(filters.toDate && { toDate: new Date(filters.toDate) }),
            }
        );

        const items: SubmissionListItemDTO[] = submissions.map((s) => {
            const dto: SubmissionListItemDTO = {
                id: s.id,
                eventId: s.eventId,
                formId: s.formId,
                status: s.status,
                submittedAt: s.submittedAt,
            };

            if (s.contact) {
                dto.contact = {
                    id: s.contact.id,
                    ...(s.contact.name && { name: s.contact.name }),
                    ...(s.contact.email && { email: s.contact.email }),
                    ...(s.contact.phone && { phone: s.contact.phone }),
                };
            }

            if (s.payment) {
                dto.payment = {
                    id: s.payment.id,
                    status: s.payment.status,
                    amount: s.payment.amount,
                };
            }

            return dto;
        });

        return { total: totalCount, items };
    }



    async saveDraft(slug: string, visitorUuid: string, draft: any): Promise<void> {
        const event = await this.eventRepo.findBySlug(slug);
        if (!event) throw new NotFoundError("Event not found");

        const form = await this.formRepo.findByEventId(event.id);
        if (!form || !form.publishedAt) {
            throw new NotFoundError("Form not available");
        }

        const visitor = await this.submissionRepo.upsertVisitor({ uuid: visitorUuid });

        const key = `draft:form:${form.id}:visitor:${visitor.id}`;
        try {
            await redis.set(key, JSON.stringify(draft), "EX", 60 * 60 * 24); // 24hr
        } catch (err) {
            logger.warn("Redis save draft failed", err);
        }
    }

    async getDraft(slug: string, visitorUuid: string): Promise<any | null> {
        const event = await this.eventRepo.findBySlug(slug);
        if (!event) throw new NotFoundError("Form not available");

        const form = await this.formRepo.findByEventId(event.id);
        if (!form || !form.publishedAt) {
            throw new NotFoundError("Form not available");
        }

        const visitor = await this.submissionRepo.upsertVisitor({ uuid: visitorUuid });

        const key = `draft:form:${form.id}:visitor:${visitor.id}`;
        const cached = await redis.get(key);

        return cached ? JSON.parse(cached) : null;

    }
}
