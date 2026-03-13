import { FormField } from "@prisma/client";
import { FormFieldDTO } from "../dtos/form/formField.dto";


export const toFormFieldDTO = (field: FormField): FormFieldDTO => ({
    id: field.id,
    key: field.key,
    type: field.type,
    label: field.label,
    required: field.required,
    order: field.order,
    options: field.options,
    validation: field.validation
})