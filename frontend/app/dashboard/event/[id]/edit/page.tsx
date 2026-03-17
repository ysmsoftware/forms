"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
    Plus,
    GripVertical,
    Type,
    Hash,
    Mail,
    Calendar,
    FileText,
    CheckSquare,
    Circle,
    ChevronDown,
    Upload,
    Trash2,
    Save,
    ArrowLeft,
    Globe,
    Lock,
    XCircle,
    AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { getEventById, updateEvent, publishEvent, closeEvent } from "@/lib/api/events"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import { getFormByEventId, updateForm, publishForm, createForm } from "@/lib/api/forms"
import type { Event, Form, FormFieldInput } from "@/lib/types/api"

interface LocalField {
    id: string
    type: "text" | "textarea" | "number" | "email" | "radio" | "checkbox" | "select" | "date" | "file" | "range"
    label: string
    placeholder?: string
    required: boolean
    options?: string[]          // internal UI representation — always string[]
    backendKey?: string
    validation?: {
        minLength?: number
        maxLength?: number
        min?: number
        max?: number
        pattern?: string
    }
}

interface LocalStep {
    id: string
    stepNumber: number
    title: string
    description: string
    fields: LocalField[]
}

const fieldTypes = [
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

const TEMPLATE_TYPES = ["COMPLETION", "ACHIEVEMENT", "WORKSHOP", "INTERNSHIP", "APPOINTMENT"] as const

export default function EditEventPage() {
    const qc = useQueryClient()
    const params = useParams()
    const router = useRouter()
    const id = params.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isPublishing, setIsPublishing] = useState(false)
    const [isClosing, setIsClosing] = useState(false)
    const [showCloseConfirm, setShowCloseConfirm] = useState(false)

    const [event, setEvent] = useState<Event | null>(null)
    const [eventForm, setEventForm] = useState({
        title: "",
        description: "",
        templateType: "COMPLETION" as typeof TEMPLATE_TYPES[number],
        enablePayment: false,
        paymentAmount: "",
        paymentCurrency: "INR",
        paymentDescription: "",
    })

    const [form, setForm] = useState<Form | null>(null)
    const [formFields, setFormFields] = useState<LocalField[]>([])
    const [selectedField, setSelectedField] = useState<LocalField | null>(null)

    const [isMultiStep, setIsMultiStep] = useState(false)
    const [steps, setSteps] = useState<LocalStep[]>([])
    const [activeStepId, setActiveStepId] = useState<string | null>(null)
    const [editingStepId, setEditingStepId] = useState<string | null>(null)

    useEffect(() => {
        Promise.all([
            getEventById(id),
            getFormByEventId(id).catch(() => null),
        ])
            .then(([eventData, formData]) => {
                setEvent(eventData)
                setEventForm({
                    title: eventData.title,
                    description: eventData.description ?? "",
                    templateType: eventData.templateType ?? "COMPLETION",
                    enablePayment: eventData.paymentEnabled ?? false,
                    paymentAmount: String(eventData.paymentConfig?.amount ?? ""),
                    paymentCurrency: eventData.paymentConfig?.currency ?? "INR",
                    paymentDescription: eventData.paymentConfig?.description ?? "",
                })
                if (formData) {
                    setForm(formData)
                    if (formData.isMultiStep && formData.steps && formData.steps.length > 0) {
                        setIsMultiStep(true)
                        setSteps(formData.steps.map((step: any) => ({
                            id: `step-${step.id ?? step.stepNumber}`,
                            stepNumber: step.stepNumber,
                            title: step.title,
                            description: step.description ?? "",
                            fields: (step.fields ?? []).map((f: any) => ({
                                id: `field-${f.id ?? f.key}`,
                                type: f.type.toLowerCase() as LocalField["type"],
                                label: f.label,
                                placeholder: (f as any).placeholder ?? "", // placeholder is not strictly in FormField API types yet
                                required: f.required ?? false,
                                options: f.options
                                    ? (Array.isArray(f.options)
                                        ? f.options                          // legacy flat array
                                        : (f.options as any).choices ?? [])  // backend shape { choices: [...] }
                                    : undefined,
                                validation: (f as any).validation && Object.keys((f as any).validation).length > 0
                                    ? (f as any).validation
                                    : undefined,
                                backendKey: f.key,
                            }))
                        })))
                        setActiveStepId(`step-${formData.steps[0].id ?? formData.steps[0].stepNumber}`)
                    } else {
                        const mapped: LocalField[] = (formData.fields ?? []).map((f) => ({
                            id: `field-${f.id ?? f.key}`,
                            type: f.type.toLowerCase() as LocalField["type"],
                            label: f.label,
                            placeholder: (f as any).placeholder ?? "", // placeholder is not strictly in FormField API types yet
                            required: f.required ?? false,
                            options: f.options
                                ? (Array.isArray(f.options)
                                    ? f.options                          // legacy flat array
                                    : (f.options as any).choices ?? [])  // backend shape { choices: [...] }
                                : undefined,
                            validation: (f as any).validation && Object.keys((f as any).validation).length > 0
                                ? (f as any).validation
                                : undefined,
                            backendKey: f.key,
                        }))
                        setFormFields(mapped)
                    }
                }
            })
            .catch((err) => toast.error(err.message))
            .finally(() => setIsLoading(false))
    }, [id])

    const activeStepIndex = steps.findIndex(s => s.id === activeStepId)

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
            toast.warning("Switched to single step. All fields merged into one step.")
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
            setActiveStepId(steps[0]?.id === stepId ? steps[1]?.id : steps[0]?.id)
            setSelectedField(null)
        }
    }

    const updateStep = (stepId: string, updates: Partial<LocalStep>) => {
        setSteps(prev => prev.map(s => s.id === stepId ? { ...s, ...updates } : s))
    }

    const addField = (type: LocalField["type"]) => {
        const newField: LocalField = {
            id: `field-${Date.now()}`,
            type,
            label: `${fieldTypes.find((f) => f.type === type)?.label} Field`,
            placeholder: "",
            required: false,
            options: ["radio", "checkbox", "select"].includes(type) ? ["Option 1", "Option 2"] : undefined,
        }
        if (isMultiStep) {
            if (activeStepIndex === -1) { toast.error("Select a step first."); return }
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
                    // Wrap choices array into backend-expected shape for choice fields
                    options: ["radio", "checkbox", "select"].includes(f.type) && f.options?.length
                        ? { choices: f.options }
                        : {},
                    // Only send validation if at least one key has a value
                    validation: f.validation && Object.values(f.validation).some(v => v !== undefined && v !== "")
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
                    // Wrap choices array into backend-expected shape for choice fields
                    options: ["radio", "checkbox", "select"].includes(f.type) && f.options?.length
                        ? { choices: f.options }
                        : {},
                    // Only send validation if at least one key has a value
                    validation: f.validation && Object.values(f.validation).some(v => v !== undefined && v !== "")
                        ? f.validation
                        : {},
                }))
            }))
        }
    }

    const handleSaveEvent = async () => {
        if (!eventForm.title.trim()) { toast.error("Event title is required."); return }
        setIsSaving(true)
        try {
            const payload: any = {
                title: eventForm.title,
                description: eventForm.description,
                templateType: eventForm.templateType,
                paymentEnabled: eventForm.enablePayment,
            }
            if (eventForm.enablePayment && eventForm.paymentAmount) {
                payload.paymentConfig = {
                    amount: Number(eventForm.paymentAmount),
                    currency: eventForm.paymentCurrency,
                    description: eventForm.paymentDescription || undefined,
                }
            }
            const updated = await updateEvent(id, payload)
            setEvent(updated)
            qc.invalidateQueries({ queryKey: queryKeys.events.detail(id) })
            qc.invalidateQueries({ queryKey: queryKeys.events.list() })
            toast.success("Event details saved.")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handleSaveForm = async () => {
        // Guard: form fields cannot be edited on an Active event
        if (event?.status === "ACTIVE") {
            toast.error("Form fields cannot be edited while the event is Active. Close the event first to make changes.")
            return
        }

        if (!isMultiStep && formFields.length === 0) { toast.error("Add at least one field."); return }
        if (isMultiStep) {
            if (steps.length === 0) { toast.error("Add at least one step."); return }
            if (steps.some(s => s.fields.length === 0)) { toast.error("Each step must have at least one field."); return }
        }
        setIsSaving(true)
        try {
            const payload = toBackendPayload()
            if (form) {
                const updated = await updateForm(id, payload)
                setForm(updated)
            } else {
                const created = await createForm(id, payload)
                setForm(created)
            }
            toast.success("Form fields saved.")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsSaving(false)
        }
    }

    const handlePublish = async () => {
        if (event?.status === "ACTIVE") {
            toast.error("This event is already Active and published.")
            return
        }

        if (!isMultiStep && formFields.length === 0) { toast.error("Add at least one form field before publishing."); return }
        if (isMultiStep) {
            if (steps.length === 0) { toast.error("Add at least one step before publishing."); return }
            if (steps.some(s => s.fields.length === 0)) { toast.error("Each step must have at least one field."); return }
        }
        setIsPublishing(true)
        try {
            const payload = toBackendPayload()
            let currentForm = form
            if (!currentForm) {
                currentForm = await createForm(id, payload)
                setForm(currentForm)
            } else {
                currentForm = await updateForm(id, payload)
                setForm(currentForm)
            }
            // Publish event first — backend requires event ACTIVE before form can be published
            const updatedEvent = await publishEvent(id)
            setEvent(updatedEvent)
            // Now publish form
            await publishForm(currentForm.id)
            qc.invalidateQueries({ queryKey: queryKeys.events.detail(id) })
            qc.invalidateQueries({ queryKey: queryKeys.events.list() })
            toast.success("Event is now live!")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsPublishing(false)
        }
    }

    const handleClose = async () => {
        setIsClosing(true)
        try {
            const updated = await closeEvent(id)
            setEvent(updated)
            qc.invalidateQueries({ queryKey: queryKeys.events.detail(id) })
            qc.invalidateQueries({ queryKey: queryKeys.events.list() })
            toast.success("Event closed.")
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsClosing(false)
            setShowCloseConfirm(false)
        }
    }

    const statusColor = (s: string) => {
        if (s === "ACTIVE") return "bg-green-100 text-green-800 border-green-200"
        if (s === "DRAFT") return "bg-yellow-100 text-yellow-800 border-yellow-200"
        return "bg-gray-100 text-gray-800 border-gray-200"
    }

    if (isLoading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <Skeleton className="h-10 w-64" />
                <Skeleton className="h-[300px] rounded-xl" />
                <Skeleton className="h-[400px] rounded-xl" />
            </div>
        )
    }

    return (
        <>
            <div className="max-w-5xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/dashboard/events"><ArrowLeft className="h-4 w-4" /></Link>
                        </Button>
                        <div>
                            <h1 className="text-2xl font-bold">{event?.title ?? "Edit Event"}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge className={statusColor(event?.status ?? "DRAFT")}>
                                    {event?.status ? event.status.charAt(0) + event.status.slice(1).toLowerCase() : "Draft"}
                                </Badge>
                                <span className="text-sm text-muted-foreground">/form/{event?.slug}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {event?.status === "DRAFT" && (
                            <Button onClick={handlePublish} disabled={isPublishing} className="bg-green-600 hover:bg-green-700 text-white">
                                <Globe className="mr-2 h-4 w-4" />
                                {isPublishing ? "Publishing..." : "Publish Event"}
                            </Button>
                        )}
                        {event?.status === "ACTIVE" && (
                            <Button variant="outline" onClick={() => setShowCloseConfirm(true)} disabled={isClosing} className="border-orange-300 text-orange-600 hover:bg-orange-50">
                                <Lock className="mr-2 h-4 w-4" />
                                Close Event
                            </Button>
                        )}
                        {event?.status === "CLOSED" && (
                            <div className="flex items-center gap-1.5 text-sm text-gray-500 border border-gray-300 rounded-md px-3 py-1.5">
                                <XCircle className="h-4 w-4" /> Event Closed
                            </div>
                        )}
                        <Button variant="outline" asChild>
                            <Link href={`/dashboard/event/${id}`}>View Analytics</Link>
                        </Button>
                    </div>
                </div>

                {/* Event Details Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>Event Details</CardTitle>
                        <CardDescription>Update title, description, certificate template and payment.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label>Event Title</Label>
                            <Input value={eventForm.title} onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })} placeholder="e.g., Workshop on AI Trends" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={eventForm.description} onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })} rows={3} placeholder="Brief description..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Certificate Template</Label>
                            <Select value={eventForm.templateType} onValueChange={(v: any) => setEventForm({ ...eventForm, templateType: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {TEMPLATE_TYPES.map((t) => (
                                        <SelectItem key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Checkbox id="payment" checked={eventForm.enablePayment} onCheckedChange={(c) => setEventForm({ ...eventForm, enablePayment: c as boolean })} />
                                <Label htmlFor="payment">Enable Payment Collection</Label>
                            </div>
                            {eventForm.enablePayment && (
                                <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Amount</Label>
                                            <Input type="number" value={eventForm.paymentAmount} onChange={(e) => setEventForm({ ...eventForm, paymentAmount: e.target.value })} placeholder="500" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Currency</Label>
                                            <Select value={eventForm.paymentCurrency} onValueChange={(v) => setEventForm({ ...eventForm, paymentCurrency: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="INR">INR</SelectItem>
                                                    <SelectItem value="USD">USD</SelectItem>
                                                    <SelectItem value="EUR">EUR</SelectItem>
                                                    <SelectItem value="GBP">GBP</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Payment Description</Label>
                                        <Input value={eventForm.paymentDescription} onChange={(e) => setEventForm({ ...eventForm, paymentDescription: e.target.value })} placeholder="e.g., Registration fee" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSaveEvent} disabled={isSaving}>
                                <Save className="mr-2 h-4 w-4" />
                                {isSaving ? "Saving..." : "Save Event Details"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Form Builder Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle>Form Fields</CardTitle>
                            <CardDescription>
                                {event?.status === "CLOSED"
                                    ? "Event is closed. Fields are read-only."
                                    : event?.status === "ACTIVE"
                                        ? "Event is live. Form fields are locked to prevent mismatched submissions."
                                        : "Add, reorder or remove fields. Save when done."}
                            </CardDescription>
                        </div>
                        {event?.status !== "CLOSED" && (
                            <div className="flex items-center space-x-2">
                                <Label htmlFor="multi-step-mode" className="text-sm text-muted-foreground">Single-step</Label>
                                <Switch
                                    id="multi-step-mode"
                                    checked={isMultiStep}
                                    onCheckedChange={handleToggleMultiStep}
                                />
                                <Label htmlFor="multi-step-mode" className="text-sm font-medium">Multi-step</Label>
                            </div>
                        )}
                    </CardHeader>

                    {event?.status === "ACTIVE" && (
                        <div className="mx-6 mb-2 flex items-start gap-3 rounded-lg border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30 px-4 py-3">
                            <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                            <div className="text-sm text-yellow-800 dark:text-yellow-300">
                                <span className="font-semibold">Form locked.</span> Fields cannot be modified while the event is Active.
                                To edit the form, close the event first using the "Close Event" button above.
                            </div>
                        </div>
                    )}

                    <CardContent className="space-y-6">
                        {event?.status !== "CLOSED" && (
                            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                                {fieldTypes.map((ft) => (
                                    <Button key={ft.type} variant="outline" size="sm" className="flex flex-col items-center gap-1 h-auto py-3 bg-transparent" onClick={() => addField(ft.type)}>
                                        <ft.icon className="h-4 w-4" />
                                        <span className="text-xs">{ft.label}</span>
                                    </Button>
                                ))}
                            </div>
                        )}

                        <div className={`grid gap-6 ${isMultiStep ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1 lg:grid-cols-2"}`}>
                            {isMultiStep && (
                                <div className="space-y-4 border-r pr-4">
                                    <h3 className="font-medium text-sm text-muted-foreground mb-3">Form Steps</h3>
                                    <DragDropContext onDragEnd={onDragEnd}>
                                        <Droppable droppableId="steps" type="step">
                                            {(provided) => (
                                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                                    {steps.map((step, index) => (
                                                        <Draggable key={step.id} draggableId={step.id} index={index} isDragDisabled={event?.status === "CLOSED"}>
                                                            {(provided) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    onClick={() => {
                                                                        setActiveStepId(step.id)
                                                                        setSelectedField(null)
                                                                    }}
                                                                    className={`p-3 rounded-lg border cursor-pointer hover:bg-accent/50 ${activeStepId === step.id ? "ring-2 ring-primary border-primary bg-accent/30" : "bg-card"}`}
                                                                >
                                                                    <div className="flex items-center gap-2 mb-2">
                                                                        <div {...provided.dragHandleProps} className="mt-1"><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            {editingStepId === step.id && event?.status !== "CLOSED" ? (
                                                                                <Input autoFocus value={step.title} onChange={(e) => updateStep(step.id, { title: e.target.value })} onBlur={() => setEditingStepId(null)} onKeyDown={(e) => e.key === "Enter" && setEditingStepId(null)} className="h-7 text-sm font-medium px-2 py-1 mb-1" />
                                                                            ) : (
                                                                                <div className="font-medium text-sm truncate" onClick={(e) => {
                                                                                    if (event?.status === "CLOSED") return
                                                                                    e.stopPropagation()
                                                                                    setEditingStepId(step.id)
                                                                                }}>{step.title}</div>
                                                                            )}
                                                                        </div>
                                                                        {event?.status !== "CLOSED" && steps.length > 1 && (
                                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={(e) => { e.stopPropagation(); removeStep(step.id) }}>
                                                                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                    <div className="pl-6">
                                                                        {editingStepId === step.id && event?.status !== "CLOSED" ? (
                                                                            <Input value={step.description} onChange={(e) => updateStep(step.id, { description: e.target.value })} onBlur={() => setEditingStepId(null)} onKeyDown={(e) => e.key === "Enter" && setEditingStepId(null)} className="h-7 text-xs px-2 py-1 text-muted-foreground" placeholder="Optional description..." />
                                                                        ) : (
                                                                            <div className="text-xs text-muted-foreground truncate" onClick={(e) => {
                                                                                if (event?.status === "CLOSED") return
                                                                                e.stopPropagation()
                                                                                setEditingStepId(step.id)
                                                                            }}>
                                                                                {step.description || <span className="italic opacity-50">Add description...</span>}
                                                                            </div>
                                                                        )}
                                                                        <div className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider">{step.fields.length} field{step.fields.length !== 1 ? 's' : ''}</div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>
                                    </DragDropContext>
                                    {event?.status !== "CLOSED" && (
                                        <Button variant="outline" size="sm" className="w-full mt-2" onClick={addStep}>
                                            <Plus className="mr-2 h-4 w-4" /> Add Step
                                        </Button>
                                    )}
                                </div>
                            )}

                            <div className={isMultiStep ? "col-span-2 grid grid-cols-1 lg:grid-cols-2 gap-6" : ""}>
                                <DragDropContext onDragEnd={onDragEnd}>
                                    <Droppable droppableId={isMultiStep ? (activeStepId || "empty-step") : "edit-fields"} type="field">
                                        {(provided) => {
                                            const activeStepIndex = isMultiStep ? steps.findIndex(s => s.id === activeStepId) : -1
                                            const currentFields = isMultiStep ? (activeStepIndex !== -1 ? steps[activeStepIndex].fields : []) : formFields

                                            return (
                                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2 min-h-[200px] border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 bg-muted/5">
                                                    {isMultiStep && activeStepIndex === -1 ? (
                                                        <div className="text-center text-muted-foreground py-8">
                                                            <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                                            <p className="text-sm">Select a step to see its fields.</p>
                                                        </div>
                                                    ) : currentFields.length === 0 ? (
                                                        <div className="text-center text-muted-foreground py-8">
                                                            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                                            <p className="text-sm">No fields yet. Add one above.</p>
                                                        </div>
                                                    ) : (
                                                        currentFields.map((field: LocalField, index: number) => (
                                                            <Draggable key={field.id} draggableId={field.id} index={index} isDragDisabled={event?.status === "CLOSED"}>
                                                                {(provided) => (
                                                                    <div
                                                                        ref={provided.innerRef}
                                                                        {...provided.draggableProps}
                                                                        className={`flex items-center space-x-3 p-3 bg-card border rounded-lg cursor-pointer hover:bg-accent/50 ${selectedField?.id === field.id ? "ring-2 ring-primary" : ""}`}
                                                                        onClick={() => setSelectedField(field)}
                                                                    >
                                                                        <div {...provided.dragHandleProps}><GripVertical className="h-4 w-4 text-muted-foreground" /></div>
                                                                        {fieldTypes.find(f => f.type === field.type) && (() => { const Icon = fieldTypes.find(f => f.type === field.type)!.icon; return <Icon className="h-4 w-4" /> })()}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-medium text-sm truncate">{field.label}</div>
                                                                            <div className="text-xs text-muted-foreground">
                                                                                {field.type}
                                                                                {field.required ? " · Required" : ""}
                                                                                {field.validation?.minLength !== undefined && ` · min ${field.validation.minLength}`}
                                                                                {field.validation?.maxLength !== undefined && ` · max ${field.validation.maxLength}`}
                                                                                {field.validation?.min !== undefined && ` · ≥${field.validation.min}`}
                                                                                {field.validation?.max !== undefined && ` · ≤${field.validation.max}`}
                                                                                {field.validation?.pattern && ` · pattern`}
                                                                                {["radio", "checkbox", "select"].includes(field.type) && field.options?.length
                                                                                    ? ` · ${field.options.length} option${field.options.length !== 1 ? "s" : ""}`
                                                                                    : ""}
                                                                            </div>
                                                                        </div>
                                                                        {event?.status !== "CLOSED" && (
                                                                            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeField(field.id) }}>
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </Draggable>
                                                        ))
                                                    )}
                                                    {provided.placeholder}
                                                </div>
                                            )
                                        }}
                                    </Droppable>
                                </DragDropContext>
                            </div>

                            {/* Field settings */}
                            <div>
                                {selectedField ? (
                                    <Card className="border-primary/20">
                                        <CardHeader className="pb-3"><CardTitle className="text-base">Field Settings</CardTitle></CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label>Label</Label>
                                                <Input value={selectedField.label} onChange={(e) => updateField(selectedField.id, { label: e.target.value })} disabled={event?.status === "CLOSED"} />
                                            </div>
                                            {["text", "textarea", "number", "email"].includes(selectedField.type) && (
                                                <div className="space-y-2">
                                                    <Label>Placeholder</Label>
                                                    <Input value={selectedField.placeholder ?? ""} onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })} disabled={event?.status === "CLOSED"} />
                                                </div>
                                            )}
                                            <div className="flex items-center space-x-2">
                                                <Checkbox id="req" checked={selectedField.required} onCheckedChange={(c) => updateField(selectedField.id, { required: c as boolean })} disabled={event?.status === "CLOSED"} />
                                                <Label htmlFor="req">Required field</Label>
                                            </div>

                                            {/* ── Validation section ────────────────────────────────── */}
                                            {["text", "textarea", "email"].includes(selectedField.type) && (
                                                <div className="space-y-3 pt-2 border-t">
                                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                        Validation
                                                    </Label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Min Length</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                placeholder="e.g. 3"
                                                                value={selectedField.validation?.minLength ?? ""}
                                                                onChange={(e) => updateField(selectedField.id, {
                                                                    validation: {
                                                                        ...selectedField.validation,
                                                                        minLength: e.target.value ? Number(e.target.value) : undefined
                                                                    }
                                                                })}
                                                                disabled={event?.status === "CLOSED"}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Max Length</Label>
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                placeholder="e.g. 100"
                                                                value={selectedField.validation?.maxLength ?? ""}
                                                                onChange={(e) => updateField(selectedField.id, {
                                                                    validation: {
                                                                        ...selectedField.validation,
                                                                        maxLength: e.target.value ? Number(e.target.value) : undefined
                                                                    }
                                                                })}
                                                                disabled={event?.status === "CLOSED"}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <Label className="text-xs">Pattern (regex)</Label>
                                                        <Input
                                                            placeholder="e.g. ^[A-Za-z]+$"
                                                            value={selectedField.validation?.pattern ?? ""}
                                                            onChange={(e) => updateField(selectedField.id, {
                                                                validation: {
                                                                    ...selectedField.validation,
                                                                    pattern: e.target.value || undefined
                                                                }
                                                            })}
                                                            disabled={event?.status === "CLOSED"}
                                                            className="h-8 text-sm font-mono"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {["number", "range"].includes(selectedField.type) && (
                                                <div className="space-y-3 pt-2 border-t">
                                                    <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                        Validation
                                                    </Label>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Min Value</Label>
                                                            <Input
                                                                type="number"
                                                                placeholder="e.g. 0"
                                                                value={selectedField.validation?.min ?? ""}
                                                                onChange={(e) => updateField(selectedField.id, {
                                                                    validation: {
                                                                        ...selectedField.validation,
                                                                        min: e.target.value ? Number(e.target.value) : undefined
                                                                    }
                                                                })}
                                                                disabled={event?.status === "CLOSED"}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                        <div className="space-y-1">
                                                            <Label className="text-xs">Max Value</Label>
                                                            <Input
                                                                type="number"
                                                                placeholder="e.g. 100"
                                                                value={selectedField.validation?.max ?? ""}
                                                                onChange={(e) => updateField(selectedField.id, {
                                                                    validation: {
                                                                        ...selectedField.validation,
                                                                        max: e.target.value ? Number(e.target.value) : undefined
                                                                    }
                                                                })}
                                                                disabled={event?.status === "CLOSED"}
                                                                className="h-8 text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                            {["radio", "checkbox", "select"].includes(selectedField.type) && (
                                                <div className="space-y-2">
                                                    <Label>Options</Label>
                                                    {selectedField.options?.map((opt, i) => (
                                                        <div key={i} className="flex items-center gap-2">
                                                            <Input value={opt} onChange={(e) => { const o = [...(selectedField.options ?? [])]; o[i] = e.target.value; updateField(selectedField.id, { options: o }) }} disabled={event?.status === "CLOSED"} />
                                                            {event?.status !== "CLOSED" && (
                                                                <Button variant="ghost" size="sm" onClick={() => { const o = selectedField.options?.filter((_, idx) => idx !== i); updateField(selectedField.id, { options: o }) }}><Trash2 className="h-4 w-4" /></Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {event?.status !== "CLOSED" && (
                                                        <Button variant="outline" size="sm" onClick={() => { const o = [...(selectedField.options ?? []), `Option ${(selectedField.options?.length ?? 0) + 1}`]; updateField(selectedField.id, { options: o }) }}>
                                                            <Plus className="mr-2 h-4 w-4" />Add Option
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="flex items-center justify-center h-full min-h-[200px] border-2 border-dashed border-muted-foreground/20 rounded-lg text-muted-foreground text-sm">
                                        Click a field to edit its settings
                                    </div>
                                )}
                            </div>
                        </div>

                        {event?.status !== "CLOSED" && (
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="outline" onClick={handleSaveForm} disabled={isSaving}>
                                    <Save className="mr-2 h-4 w-4" />
                                    {isSaving ? "Saving..." : "Save Form Fields"}
                                </Button>
                                {event?.status === "DRAFT" && (
                                    <Button onClick={handlePublish} disabled={isPublishing} className="bg-green-600 hover:bg-green-700 text-white">
                                        <Globe className="mr-2 h-4 w-4" />
                                        {isPublishing ? "Publishing..." : "Save & Publish"}
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            <AlertDialog open={showCloseConfirm} onOpenChange={setShowCloseConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Close this event?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Closing stops new submissions. Existing data is preserved. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClose} className="bg-orange-600 text-white hover:bg-orange-700">
                            Close Event
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
