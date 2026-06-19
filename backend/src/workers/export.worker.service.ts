import { SubmissionsRepository, SubmissionForExport } from "../repositories/submission.repo";
import { FormRepositories } from "../repositories/form.repo";
import { ExportLogRepository } from "../repositories/export-log.repo";
import { ExportJobData } from "../queues/message.queue";
import { redis } from "../config/redis";
import logger from "../config/logger";

export class ExportWorkerService {
    constructor(
        private submissionRepo: SubmissionsRepository,
        private formRepo: FormRepositories,
        private exportLogRepo: ExportLogRepository,
    ) { }

    async process(data: ExportJobData): Promise<void> {
        const { exportLogId, eventId, userName, eventTitle, paymentEnabled } = data;
        await this.exportLogRepo.markProcessing(exportLogId, `export-${exportLogId}`);

        try {
            // 1. Load form fields (ordered) to define dynamic columns
            const form = await this.formRepo.findByEventId(eventId);
            const formFields = this.extractOrderedFields(form);

            // 2. Load all submitted submissions with their answers
            const submissions = await this.submissionRepo.findSubmissionsWithAnswersByEvent(
                eventId,
                { status: "SUBMITTED", limit: 100_000, offset: 0 }
            );

            // 3. Build CSV
            const csv = this.buildCsv(submissions, formFields, paymentEnabled);

            const slug = this.slugify(eventTitle);
            const ts = this.formatTimestamp(new Date());
            const userSlug = this.slugify(userName);
            const fileName = `${slug}-${ts}-${userSlug}.csv`;

            await redis.set(`csv:${exportLogId}`, csv, "EX", 86400);
            await this.exportLogRepo.markDone(exportLogId, submissions.length, fileName);
            logger.info(`Export done: ${fileName} (${submissions.length} rows)`);
        } catch (err) {
            await this.exportLogRepo.markFailed(exportLogId, (err as Error).message);
            throw err;
        }
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Flatten steps → fields into a single ordered array.
     * Multi-step forms: sorted by stepNumber then field order.
     * Single-step forms: sorted by field order only.
     */
    private extractOrderedFields(form: any): { key: string; label: string; type: string }[] {
        if (!form) return [];

        const fields: { key: string; label: string; type: string; _order: [number, number] }[] = [];

        if (form.steps && form.steps.length > 0) {
            for (const step of form.steps) {
                for (const field of step.fields ?? []) {
                    fields.push({
                        key: field.key,
                        label: field.label,
                        type: field.type,
                        _order: [step.stepNumber, field.order],
                    });
                }
            }
        }

        // Flat fields (non-multi-step or orphaned fields)
        for (const field of form.fields ?? []) {
            fields.push({
                key: field.key,
                label: field.label,
                type: field.type,
                _order: [0, field.order],
            });
        }

        // Sort: stepNumber ASC, then field.order ASC
        fields.sort((a, b) => {
            if (a._order[0] !== b._order[0]) return a._order[0] - b._order[0];
            return a._order[1] - b._order[1];
        });

        // Deduplicate by key (in case a key appears in both steps[] and fields[])
        const seen = new Set<string>();
        return fields
            .filter((f) => {
                if (seen.has(f.key)) return false;
                seen.add(f.key);
                return true;
            })
            .map(({ key, label, type }) => ({ key, label, type }));
    }

    /**
     * Build the full CSV string.
     *
     * Column layout:
     *   [Meta columns] | [Payment columns — only if paymentEnabled] | [One column per form field]
     *
     * Meta columns (always present):
     *   Submission ID | Submitted At | Status | Contact Name | Contact Email | Contact Phone
     *
     * Payment columns (only when event.paymentEnabled = true):
     *   Payment Status | Payment Amount (INR)
     *
     * Form-field columns:
     *   - Header = field.label
     *   - Value   = resolved answer value (see resolveValue)
     */
    private buildCsv(
        submissions: SubmissionForExport[],
        formFields: { key: string; label: string; type: string }[],
        paymentEnabled: boolean
    ): string {
        const escape = (v: unknown): string => {
            if (v === null || v === undefined) return "";
            const s = String(v);
            return s.includes(",") || s.includes('"') || s.includes("\n")
                ? `"${s.replace(/"/g, '""')}"`
                : s;
        };

        const META_HEADERS = [
            "Submission ID",
            "Submitted At",
            "Status",
            "Contact Name",
            "Contact Email",
            "Contact Phone",
            ...(paymentEnabled ? ["Payment Status", "Payment Amount (INR)"] : []),
        ];

        const FIELD_HEADERS = formFields.map((f) => f.label);
        const HEADERS = [...META_HEADERS, ...FIELD_HEADERS];

        const rows = submissions.map((sub) => {
            // Build a lookup map: fieldKey → answer
            const answerMap = new Map(sub.answers.map((a) => [a.fieldKey, a]));

            const meta = [
                escape(sub.id),
                escape(sub.submittedAt ? new Date(sub.submittedAt).toISOString() : ""),
                escape(sub.status),
                escape(sub.contact?.name ?? ""),
                escape(sub.contact?.email ?? ""),
                escape(sub.contact?.phone ?? ""),
                ...(paymentEnabled
                    ? [
                        escape(sub.payment?.status ?? ""),
                        escape(sub.payment?.amount != null ? sub.payment.amount / 100 : ""),
                    ]
                    : []),
            ];

            const dynamicCols = formFields.map((field) => {
                const answer = answerMap.get(field.key);
                return escape(this.resolveValue(answer, field.type));
            });

            return [...meta, ...dynamicCols].join(",");
        });

        return [HEADERS.map(escape).join(","), ...rows].join("\r\n");
    }

    /**
     * Pick the most meaningful scalar value from a SubmissionAnswer.
     *
     * FILE fields → emit the fileUrl so it's clickable in Excel/Sheets.
     * CHECKBOX / RADIO with valueJson → serialise as comma-separated labels.
     * DATE fields → ISO date string.
     * Everything else → valueText or valueNumber.
     */
    private resolveValue(
        answer: SubmissionForExport["answers"][number] | undefined,
        fieldType: string
    ): string {
        if (!answer) return "";

        if (fieldType === "FILE") {
            return answer.fileUrl ?? "";
        }

        if (answer.valueText !== null && answer.valueText !== undefined) {
            return answer.valueText;
        }

        if (answer.valueNumber !== null && answer.valueNumber !== undefined) {
            return String(answer.valueNumber);
        }

        if (answer.valueBoolean !== null && answer.valueBoolean !== undefined) {
            return answer.valueBoolean ? "Yes" : "No";
        }

        if (answer.valueDate !== null && answer.valueDate !== undefined) {
            return new Date(answer.valueDate).toISOString().slice(0, 10);
        }

        if (answer.valueJson !== null && answer.valueJson !== undefined) {
            // Arrays (multi-select / checkbox): join labels with semicolon
            if (Array.isArray(answer.valueJson)) {
                return answer.valueJson.join("; ");
            }
            return JSON.stringify(answer.valueJson);
        }

        return "";
    }

    private slugify(text: string): string {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");
    }

    private formatTimestamp(date: Date): string {
        return date
            .toISOString()
            .replace(/[-T:]/g, "")
            .slice(0, 14);
    }
}