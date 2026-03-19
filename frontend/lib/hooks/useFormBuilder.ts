import { useState } from "react"
import { toast } from "sonner"
import type { DropResult } from "@hello-pangea/dnd"
import {
    Type,
    Hash,
    Mail,
    Calendar,
    FileText,
    CheckSquare,
    Circle,
    ChevronDown,
    Upload,
} from "lucide-react"

export interface LocalField {
    id: string
    type: "text" | "textarea" | "number" | "email" | "radio" | "checkbox" | "select" | "date" | "file" | "range"
    label: string
    placeholder?: string
    required: boolean
    options?: string[]
    backendKey?: string
    validation?: {
        minLength?: number
        maxLength?: number
        min?: number
        max?: number
        pattern?: string
    }
}

export interface LocalStep {
    id: string
    stepNumber: number
    title: string
    description: string
    fields: LocalField[]
}

export const FIELD_TYPES = [
    { type: "text", label: "Text Input", icon: Type },
    { type: "textarea", label: "Textarea", icon: FileText },
    { type: "number", label: "Number", icon: Hash },
    { type: "range", label: "Range Slider", icon: Hash },
    { type: "email", label: "Email", icon: Mail },
    { type: "radio", label: "Radio Buttons", icon: Circle },
    { type: "checkbox", label: "Checkboxes", icon: CheckSquare },
    { type: "select", label: "Dropdown", icon: ChevronDown },
    { type: "date", label: "Date Picker", icon: Calendar },
    { type: "file", label: "File Upload", icon: Upload },
] as const

export function useFormBuilder(initialFields: LocalField[] = [], initialSteps: LocalStep[] = []) {
    const [formFields, setFormFields] = useState<LocalField[]>(initialFields)
    const [selectedField, setSelectedField] = useState<LocalField | null>(null)
    const [isMultiStep, setIsMultiStep] = useState(initialSteps.length > 0)
    const [steps, setSteps] = useState<LocalStep[]>(initialSteps)
    const [activeStepId, setActiveStepId] = useState<string | null>(initialSteps[0]?.id || null)
    const [editingStepId, setEditingStepId] = useState<string | null>(null)

    const handleToggleMultiStep = (multi: boolean) => {
        if (multi === isMultiStep) return
        if (multi) {
            setIsMultiStep(true)
            const initialStep: LocalStep = {
                id: `step-${Date.now()}`,
                stepNumber: 1,
                title: "Step 1",
                description: "",
                fields: [...formFields]
            }
            setSteps([initialStep])
            setActiveStepId(initialStep.id)
            setFormFields([])
            setSelectedField(null)
        } else {
            setIsMultiStep(false)
            const allFields = steps.flatMap(s => s.fields)
            setFormFields(allFields)
            setSteps([])
            setActiveStepId(null)
            setSelectedField(null)
            toast("Single-step Mode", { description: "Switched to single step. All fields merged." })
        }
    }

    const addStep = () => {
        const newStep: LocalStep = {
            id: `step-${Date.now()}`,
            stepNumber: steps.length + 1,
            title: `Step ${steps.length + 1}`,
            description: "",
            fields: []
        }
        setSteps(prev => [...prev, newStep])
        setActiveStepId(newStep.id)
        setSelectedField(null)
    }

    const removeStep = (stepId: string) => {
        setSteps(prev => {
            const newSteps = prev.filter(s => s.id !== stepId).map((s, i) => ({ ...s, stepNumber: i + 1 }))
            return newSteps
        })
        if (activeStepId === stepId) {
            const remainingSteps = steps.filter(s => s.id !== stepId)
            setActiveStepId(remainingSteps[0]?.id || null)
            setSelectedField(null)
        }
    }

    const updateStep = (stepId: string, updates: Partial<LocalStep>) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s))
    }

    const activeStepIndex = isMultiStep ? steps.findIndex(s => s.id === activeStepId) : -1

    const addField = (type: LocalField["type"]) => {
        const newField: LocalField = {
            id: `field-${Date.now()}`,
            type,
            label: `${FIELD_TYPES.find((f) => f.type === type)?.label} Field`,
            placeholder: "",
            required: false,
            options: ["radio", "checkbox", "select"].includes(type) ? ["Option 1", "Option 2"] : undefined,
        }
        if (isMultiStep) {
            if (activeStepIndex === -1) {
                toast.error("Error", { description: "Select a step first." })
                return
            }
            const newSteps = [...steps]
            newSteps[activeStepIndex].fields = [...newSteps[activeStepIndex].fields, newField]
            setSteps(newSteps)
        } else {
            setFormFields((prev) => [...prev, newField])
        }
        setSelectedField(newField)
    }

    const updateField = (fieldId: string, updates: Partial<LocalField>) => {
        if (isMultiStep) {
            setSteps(prev => prev.map(step => ({
                ...step,
                fields: step.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f)
            })))
        } else {
            setFormFields((fields) => fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)))
        }
        if (selectedField?.id === fieldId) setSelectedField((prev) => prev ? { ...prev, ...updates } : prev)
    }

    const removeField = (fieldId: string) => {
        if (isMultiStep) {
            setSteps(prev => prev.map(step => ({
                ...step,
                fields: step.fields.filter(f => f.id !== fieldId)
            })))
        } else {
            setFormFields((fields) => fields.filter((f) => f.id !== fieldId))
        }
        if (selectedField?.id === fieldId) setSelectedField(null)
    }

    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return

        if (result.type === "step") {
            const items = Array.from(steps)
            const [moved] = items.splice(result.source.index, 1)
            items.splice(result.destination.index, 0, moved)
            setSteps(items.map((s, i) => ({ ...s, stepNumber: i + 1 })))
            return
        }

        if (isMultiStep) {
            const stepId = result.source.droppableId
            const stepIndex = steps.findIndex(s => s.id === stepId)
            if (stepIndex === -1) return
            const items = Array.from(steps[stepIndex].fields)
            const [moved] = items.splice(result.source.index, 1)
            items.splice(result.destination.index, 0, moved)
            const newSteps = [...steps]
            newSteps[stepIndex].fields = items
            setSteps(newSteps)
        } else {
            const items = Array.from(formFields)
            const [moved] = items.splice(result.source.index, 1)
            items.splice(result.destination.index, 0, moved)
            setFormFields(items)
        }
    }

    const toBackendPayload = (): any => {
        if (!isMultiStep) {
            return {
                isMultiStep: false,
                fields: formFields.map((f, index) => ({
                    key: f.backendKey ?? f.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                    type: f.type.toUpperCase() as any,
                    label: f.label,
                    required: f.required,
                    order: index,
                    options: ["radio", "checkbox", "select"].includes(f.type) && f.options?.length
                        ? { choices: f.options }
                        : {},
                    validation: f.validation && Object.keys(f.validation).length > 0 && Object.values(f.validation).some(v => v !== undefined && v !== "")
                        ? f.validation
                        : {},
                }))
            }
        }
        return {
            isMultiStep: true,
            steps: steps.map((step) => ({
                stepNumber: step.stepNumber,
                title: step.title,
                description: step.description || undefined,
                fields: step.fields.map((f, index) => ({
                    key: f.backendKey ?? f.label.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""),
                    type: f.type.toUpperCase() as any,
                    label: f.label,
                    required: f.required,
                    order: index,
                    options: ["radio", "checkbox", "select"].includes(f.type) && f.options?.length
                        ? { choices: f.options }
                        : {},
                    validation: f.validation && Object.keys(f.validation).length > 0 && Object.values(f.validation).some(v => v !== undefined && v !== "")
                        ? f.validation
                        : {},
                }))
            }))
        }
    }

    const mapField = (f: any): LocalField => {
        return {
            id: `field-${f.id ?? f.key}`,
            type: f.type.toLowerCase() as LocalField["type"],
            label: f.label,
            placeholder: f.placeholder ?? "",
            required: f.required ?? false,
            options: f.options
                ? (Array.isArray(f.options) ? f.options : (f.options?.choices ?? []))
                : undefined,
            validation: f.validation && Object.keys(f.validation).length > 0
                ? f.validation : undefined,
            backendKey: f.key,
        }
    }

    const loadFromBackend = (formData: any) => {
        if (formData.isMultiStep && formData.steps && formData.steps.length > 0) {
            setIsMultiStep(true)
            const mappedSteps = formData.steps.map((step: any) => ({
                id: `step-${step.id ?? step.stepNumber}`,
                stepNumber: step.stepNumber,
                title: step.title,
                description: step.description ?? "",
                fields: (step.fields ?? []).map(mapField)
            }))
            setSteps(mappedSteps)
            setActiveStepId(mappedSteps[0].id)
        } else {
            setIsMultiStep(false)
            setFormFields((formData.fields ?? []).map(mapField))
        }
    }

    return {
        // state
        formFields, selectedField, isMultiStep, steps, activeStepId, editingStepId,
        // setters
        setFormFields, setSelectedField, setActiveStepId, setEditingStepId, setIsMultiStep, setSteps,
        // actions
        handleToggleMultiStep, addStep, removeStep, updateStep,
        addField, updateField, removeField, onDragEnd,
        // serialization
        toBackendPayload, loadFromBackend,
        // derived
        activeStepIndex,
        currentFields: isMultiStep
            ? (steps.find(s => s.id === activeStepId)?.fields ?? [])
            : formFields,
    }
}
