import { FormFieldType } from "@prisma/client";
import { BadRequestError } from "../errors/http-errors";


type FormField = {
    id: string;
    key: string;
    type: FormFieldType;
    required: boolean;
};

type SubmissionAnswerInput = {
    fieldId: string;
    fieldKey: string;
    valueText?: string;
    valueNumber?: number;
    valueBoolean?: boolean;
    valueDate?: Date;
    valueJson?: any;
    fileUrl?: string;
};

export function validateSubmissionAgainstForm(
  fields: FormField[],
  answers: SubmissionAnswerInput[]
) {
  const fieldMap = new Map(fields.map(f => [f.id, f]));
  const answeredFieldIds = new Set<string>();

  for (const answer of answers) {
    const field = fieldMap.get(answer.fieldId);

    if (!field) {
      throw new BadRequestError(`Invalid fieldId: ${answer.fieldId}`);
    }

    if (field.key !== answer.fieldKey) {
      throw new BadRequestError(
        `Field key mismatch for fieldId ${answer.fieldId}`
      );
    }

    switch (field.type) {
      // ---------- TEXT INPUTS ----------
      case "TEXT":
      case "TEXTAREA":
      case "EMAIL":
        if (answer.valueText === undefined) {
          throw new BadRequestError(`Field '${field.key}' expects text`);
        }
        break;

      // ---------- NUMERIC ----------
      case "NUMBER":
      case "RANGE":
        if (answer.valueNumber === undefined) {
          throw new BadRequestError(`Field '${field.key}' expects number`);
        }
        break;

      // ---------- DATE ----------
      case "DATE":
        if (answer.valueDate === undefined) {
          throw new BadRequestError(`Field '${field.key}' expects date`);
        }
        break;

      // ---------- SELECTION ----------
      case "SELECT":
      case "RADIO":
        if (answer.valueText === undefined) {
          throw new BadRequestError(`Field '${field.key}' expects selection`);
        }
        break;

      case "CHECKBOX":
        if(answer.valueBoolean !== undefined) {
            // single checkbox
            if (typeof answer.valueBoolean !== 'boolean') {
                throw new BadRequestError(`Field '${field.key}' expects boolean value`);
            }
        } else if(answer.valueJson !== undefined) {
            if (!Array.isArray(answer.valueJson)) {
                throw new BadRequestError(`Field '${field.key}' expects checkbox values`);
            }
        } else {
            throw new BadRequestError(`Field '${field.key}' expects checkbox value (boolean or array)`);
        }
        break;

      // ---------- FILE ----------
      case "FILE":
        if (!answer.fileUrl) {
          throw new BadRequestError(`Field '${field.key}' expects file`);
        }
        break;

      // ---------- EXHAUSTIVE ----------
      default: {
        const _exhaustive: never = field.type;
        throw new BadRequestError(
          `Unsupported field type '${field.type}'`
        );
      }
    }

    answeredFieldIds.add(field.id);
  }

  // ---------- REQUIRED FIELDS ----------
  for (const field of fields) {
    if (field.required && !answeredFieldIds.has(field.id)) {
      throw new BadRequestError(`Missing required field: ${field.key}`);
    }
  }
}
