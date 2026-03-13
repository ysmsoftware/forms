import { FormField, FormStep } from "@prisma/client";
import { FormStepDTO } from "../dtos/form/formStep.dto";
import { toFormFieldDTO } from "./formField.mapper";


type StepWithFields = FormStep & { fields: FormField[]}

export const toFormStepDTO = (step: StepWithFields): FormStepDTO => ({
    id: step.id,
    stepNumber: step.stepNumber,
    title: step.title,
    description: step.description || "",
    fields: step.fields.map(toFormFieldDTO), 
})