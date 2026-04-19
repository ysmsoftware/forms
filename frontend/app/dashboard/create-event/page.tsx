"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createEvent, publishEvent, updateEvent } from "@/lib/api/events"
import { useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query/keys"
import { useUploadFileAdmin } from "@/lib/query/hooks/useFiles"
import { createForm, publishForm } from "@/lib/api/forms"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd"
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
    Eye,
    Save,
    Image as ImageIcon,
    X,
    Loader2,
} from "lucide-react"
import { FormPreviewModal } from "@/components/form-preview-modal"
import { PublishSuccessModal } from "@/components/publish-success-modal"
import { PatternBuilder } from "@/components/pattern-builder"
import { toast } from "sonner"
import { useFormBuilder, FIELD_TYPES, type LocalField, type LocalStep } from "@/lib/hooks/useFormBuilder"


export default function CreateEvent() {
    const qc = useQueryClient()
    const [currentStep, setCurrentStep] = useState(1)
    const editRef = useRef<HTMLDivElement>(null)
    const [eventData, setEventData] = useState({
        title: "",
        description: "",
        banner: null as File | null,
        templateType: "COMPLETION" as "COMPLETION" | "ACHIEVEMENT" | "WORKSHOP" | "INTERNSHIP" | "APPOINTMENT",
        enablePayment: false,
        paymentAmount: "",
        paymentCurrency: "INR",
        paymentDescription: "",
    })
    const {
        formFields,
        selectedField,
        setSelectedField,
        isMultiStep,
        steps,
        activeStepId,
        setActiveStepId,
        editingStepId,
        setEditingStepId,
        handleToggleMultiStep,
        addStep,
        removeStep,
        updateStep,
        addField,
        updateField,
        removeField,
        onDragEnd,
        toBackendPayload,
        activeStepIndex,
        currentFields
    } = useFormBuilder()

    const [showPreview, setShowPreview] = useState(false)
    const [showPublishSuccess, setShowPublishSuccess] = useState(false)
    const [publishedFormUrl, setPublishedFormUrl] = useState("")
    const [isPublishing, setIsPublishing] = useState(false)
    const [createdEventId, setCreatedEventId] = useState<string | null>(null)
    const [createdEventSlug, setCreatedEventSlug] = useState<string | null>(null)
    const [createdFormId, setCreatedFormId] = useState<string | null>(null)
    const [isUploadingBanner, setIsUploadingBanner] = useState(false)
    const [isCreatingEvent, setIsCreatingEvent] = useState(false)
    const router = useRouter()

    const { mutateAsync: uploadAdmin } = useUploadFileAdmin()

    const renderFieldIcon = (type: LocalField["type"]) => {
        const fieldType = FIELD_TYPES.find((f) => f.type === type)
        if (!fieldType) return null
        const Icon = fieldType.icon
        return <Icon className="h-4 w-4" />
    }

    const handlePreview = () => {
        setShowPreview(true)
    }

    const handleStepOneNext = async () => {
        if (!eventData.title.trim()) {
            toast.error("Please enter an event title.")
            return
        }
        setIsCreatingEvent(true)
        try {
            const payload: any = {
                title: eventData.title,
                description: eventData.description || "",
                status: "DRAFT",
                templateType: eventData.templateType,
                paymentEnabled: eventData.enablePayment,
            }
            if (eventData.enablePayment && eventData.paymentAmount) {
                payload.paymentConfig = {
                    amount: Number(eventData.paymentAmount),
                    currency: eventData.paymentCurrency,
                    description: eventData.paymentDescription || undefined,
                }
            }
            const event = await createEvent(payload)
            qc.invalidateQueries({ queryKey: queryKeys.events.list() })
            setCreatedEventId(event.id)
            setCreatedEventSlug(event.slug)

            if (eventData.banner) {
                try {
                    setIsUploadingBanner(true)
                    const result = await uploadAdmin({
                        file: eventData.banner,
                        context: "EVENT_ASSET",
                        eventId: event.id,
                        eventSlug: event.slug,
                    })
                    await updateEvent(event.id, { bannerUrl: result.url })
                } catch (err: any) {
                    toast.error("Banner Upload Failed", { description: err.message || "Failed to upload banner." })
                } finally {
                    setIsUploadingBanner(false)
                }
            }

            setCurrentStep(2)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setIsCreatingEvent(false)
        }
    }

    const handleSaveAndPublish = async () => {
        if (!createdEventId) {
            toast.error("Event not created yet.")
            return
        }
        if (!isMultiStep && formFields.length === 0) {
            toast.error("Please add at least one form field.")
            return
        }
        if (isMultiStep && steps.length === 0) {
            toast.error("Please add at least one step.")
            return
        }
        if (isMultiStep && steps.some(s => s.fields.length === 0)) {
            toast.error("Each step must have at least one field.")
            return
        }

        setIsPublishing(true)
        try {
            const payload = toBackendPayload()

            // Publish event FIRST — form publish requires event to be ACTIVE
            await publishEvent(createdEventId)

            // Create form
            const form = await createForm(createdEventId, payload)
            setCreatedFormId(form.id)

            // Now publish the form (event is already ACTIVE)
            await publishForm(form.id)

            qc.invalidateQueries({ queryKey: queryKeys.events.list() })

            const formUrl = `${window.location.origin}/form/${createdEventSlug}`
            setPublishedFormUrl(formUrl)
            setShowPublishSuccess(true)
        } catch (err: any) {
            toast.error("Publishing Failed", { description: err.message })
        } finally {
            setIsPublishing(false)
        }
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Create New Event</h1>
                <p className="text-muted-foreground">
                    Set up your event and design a custom form to collect data from visitors.
                </p>
            </div>

            {/* Step Indicator */}
            <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-2 ${currentStep >= 1 ? "text-primary" : "text-muted-foreground"}`}>
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 1 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                        1
                    </div>
                    <span className="font-medium">Event Info</span>
                </div>
                <div className="w-12 h-px bg-border" />
                <div className={`flex items-center space-x-2 ${currentStep >= 2 ? "text-primary" : "text-muted-foreground"}`}>
                    <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${currentStep >= 2 ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                    >
                        2
                    </div>
                    <span className="font-medium">Form Builder</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {currentStep === 1 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Event Information</CardTitle>
                                <CardDescription>Basic details about your event and payment settings.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Event Title</Label>
                                    <Input
                                        id="title"
                                        placeholder="e.g., Expert Session at KKW"
                                        value={eventData.title}
                                        onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="description">Short Description</Label>
                                    <Textarea
                                        id="description"
                                        placeholder="Brief description of your event..."
                                        value={eventData.description}
                                        onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="templateType">Certificate Template</Label>
                                    <Select
                                        value={eventData.templateType}
                                        onValueChange={(value: any) => setEventData({ ...eventData, templateType: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="COMPLETION">Completion</SelectItem>
                                            <SelectItem value="ACHIEVEMENT">Achievement</SelectItem>
                                            <SelectItem value="WORKSHOP">Workshop</SelectItem>
                                            <SelectItem value="INTERNSHIP">Internship</SelectItem>
                                            <SelectItem value="APPOINTMENT">Appointment</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label>Event Banner (Optional)</Label>
                                    {!eventData.banner ? (
                                        <div className="relative border-2 border-dashed border-border rounded-lg p-6 hover:bg-muted/50 transition-colors flex flex-col items-center justify-center text-center">
                                            <input
                                                type="file"
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                accept="image/png, image/jpeg, image/jpg"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0]
                                                    if (file) {
                                                        if (file.size > 5 * 1024 * 1024) {
                                                            toast.error("File too large", { description: "Max size is 5MB." })
                                                            return
                                                        }
                                                        setEventData({ ...eventData, banner: file })
                                                    }
                                                }}
                                            />
                                            <div className="rounded-full bg-primary/10 p-3 mb-3">
                                                <ImageIcon className="h-6 w-6 text-primary" />
                                            </div>
                                            <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                                            <p className="text-xs text-muted-foreground">PNG, JPG, JPEG — max 5MB</p>
                                        </div>
                                    ) : (
                                        <div className="relative rounded-lg border bg-card p-2 flex items-center space-x-3 overflow-hidden">
                                            <div className="w-16 h-16 relative rounded overflow-hidden flex-shrink-0 bg-muted">
                                                <img
                                                    src={URL.createObjectURL(eventData.banner)}
                                                    alt="Banner Preview"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium truncate">{eventData.banner.name}</p>
                                                <p className="text-xs text-muted-foreground">{(eventData.banner.size / 1024 / 1024).toFixed(2)} MB</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => setEventData({ ...eventData, banner: null })}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                <Separator />

                                <div className="space-y-4">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="payment"
                                            checked={eventData.enablePayment}
                                            onCheckedChange={(checked) => setEventData({ ...eventData, enablePayment: checked as boolean })}
                                        />
                                        <Label htmlFor="payment">Enable Payment Collection</Label>
                                    </div>

                                    {eventData.enablePayment && (
                                        <div className="space-y-4 pl-6 border-l-2 border-primary/20">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="amount">Amount</Label>
                                                    <Input
                                                        id="amount"
                                                        type="number"
                                                        placeholder="50"
                                                        value={eventData.paymentAmount}
                                                        onChange={(e) => setEventData({ ...eventData, paymentAmount: e.target.value })}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="currency">Currency</Label>
                                                    <Select
                                                        value={eventData.paymentCurrency}
                                                        onValueChange={(value) => setEventData({ ...eventData, paymentCurrency: value })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="USD">USD</SelectItem>
                                                            <SelectItem value="EUR">EUR</SelectItem>
                                                            <SelectItem value="INR">INR</SelectItem>
                                                            <SelectItem value="GBP">GBP</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="payment-desc">Payment Description</Label>
                                                <Input
                                                    id="payment-desc"
                                                    placeholder="e.g., Registration fee for expert session"
                                                    value={eventData.paymentDescription}
                                                    onChange={(e) => setEventData({ ...eventData, paymentDescription: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex justify-end">
                                    <Button onClick={handleStepOneNext} disabled={isCreatingEvent}>
                                        {isCreatingEvent ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                {isUploadingBanner ? "Uploading banner..." : "Creating event..."}
                                            </>
                                        ) : "Next: Form Builder"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {currentStep === 2 && (
                        <div className="space-y-6">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <div className="space-y-1">
                                        <CardTitle>Form Builder</CardTitle>
                                        <CardDescription>Drag and drop fields to create your custom form.</CardDescription>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Label htmlFor="multi-step-mode" className="text-sm text-muted-foreground">Single-step</Label>
                                        <Switch
                                            id="multi-step-mode"
                                            checked={isMultiStep}
                                            onCheckedChange={handleToggleMultiStep}
                                        />
                                        <Label htmlFor="multi-step-mode" className="text-sm font-medium">Multi-step</Label>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-6">
                                        {FIELD_TYPES.map((fieldType) => (
                                            <Button
                                                key={fieldType.type}
                                                variant="outline"
                                                size="sm"
                                                className="flex flex-col items-center gap-1 h-auto py-3 bg-transparent"
                                                onClick={() => addField(fieldType.type)}
                                            >
                                                <fieldType.icon className="h-4 w-4" />
                                                <span className="text-xs">{fieldType.label}</span>
                                            </Button>
                                        ))}
                                    </div>

                                    <div className={`grid gap-6 ${isMultiStep ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1"}`}>
                                        {isMultiStep && (
                                            <div className="space-y-4 border-r pr-4">
                                                <h3 className="font-medium text-sm text-muted-foreground mb-3">Form Steps</h3>
                                                <DragDropContext onDragEnd={onDragEnd}>
                                                    <Droppable droppableId="steps" type="step">
                                                        {(provided) => (
                                                            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                                                                {steps.map((step, index) => (
                                                                    <Draggable key={step.id} draggableId={step.id} index={index}>
                                                                        {(provided) => {
                                                                            return (
                                                                                <div
                                                                                    ref={(el) => {
                                                                                        provided.innerRef(el);
                                                                                        (editRef.current as any) = el;
                                                                                    }}
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
                                                                                        {editingStepId === step.id ? (
                                                                                            <Input autoFocus value={step.title} onChange={(e) => updateStep(step.id, { title: e.target.value })} onBlur={(e) => {
                                                                                                if (editRef.current && editRef.current.contains(e.relatedTarget as Node)) return;
                                                                                                setEditingStepId(null);
                                                                                            }} onKeyDown={(e) => e.key === "Enter" && setEditingStepId(null)} className="h-7 text-sm font-medium px-2 py-1 mb-1" />
                                                                                        ) : (
                                                                                            <div className="font-medium text-sm truncate" onClick={(e) => {
                                                                                                e.stopPropagation()
                                                                                                setEditingStepId(step.id)
                                                                                            }}>{step.title}</div>
                                                                                        )}
                                                                                    </div>
                                                                                    {steps.length > 1 && (
                                                                                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" onClick={(e) => { e.stopPropagation(); removeStep(step.id) }}>
                                                                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                                                                                        </Button>
                                                                                    )}
                                                                                </div>
                                                                                <div className="pl-6">
                                                                                    {editingStepId === step.id ? (
                                                                                        <Input value={step.description} onChange={(e) => updateStep(step.id, { description: e.target.value })} onBlur={(e) => {
                                                                                            if (editRef.current && editRef.current.contains(e.relatedTarget as Node)) return;
                                                                                            setEditingStepId(null);
                                                                                        }} onKeyDown={(e) => e.key === "Enter" && setEditingStepId(null)} className="h-7 text-xs px-2 py-1 text-muted-foreground" placeholder="Optional description..." />
                                                                                    ) : (
                                                                                        <div className="text-xs text-muted-foreground truncate" onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            setEditingStepId(step.id)
                                                                                        }}>
                                                                                            {step.description || <span className="italic opacity-50">Add description...</span>}
                                                                                        </div>
                                                                                    )}
                                                                                    <div className="text-[10px] text-muted-foreground/70 mt-1 uppercase tracking-wider">{step.fields.length} field{step.fields.length !== 1 ? 's' : ''}</div>
                                                                                </div>
                                                                                </div>
                                                                            );
                                                                        }}
                                                                    </Draggable>
                                                                ))}
                                                                {provided.placeholder}
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </DragDropContext>
                                                <Button variant="outline" size="sm" className="w-full mt-2" onClick={addStep}>
                                                    <Plus className="mr-2 h-4 w-4" /> Add Step
                                                </Button>
                                            </div>
                                        )}

                                        <div className={isMultiStep ? "col-span-2" : ""}>
                                            <DragDropContext onDragEnd={onDragEnd}>
                                                <Droppable droppableId={isMultiStep ? (activeStepId || "empty-step") : "form-fields"} type="field">
                                                    {(provided) => {
                                                        return (
                                                            <div
                                                                {...provided.droppableProps}
                                                                ref={provided.innerRef}
                                                                className="space-y-2 min-h-[200px] border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 bg-muted/5"
                                                            >
                                                                {isMultiStep && activeStepIndex === -1 ? (
                                                                    <div className="text-center text-muted-foreground py-8">
                                                                        <CheckSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                                                        <p className="text-sm">Select a step to see its fields.</p>
                                                                    </div>
                                                                ) : currentFields.length === 0 ? (
                                                                    <div className="text-center text-muted-foreground py-8">
                                                                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                                                        <p>No fields added yet. Click on a field type above to get started.</p>
                                                                    </div>
                                                                ) : (
                                                                    currentFields.map((field, index) => (
                                                                        <Draggable key={field.id} draggableId={field.id} index={index}>
                                                                            {(provided) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    className={`flex items-center space-x-3 p-3 bg-card border rounded-lg cursor-pointer hover:bg-accent/50 ${selectedField?.id === field.id ? "ring-2 ring-primary" : ""}`}
                                                                                    onClick={() => setSelectedField(field)}
                                                                                >
                                                                                    <div {...provided.dragHandleProps}>
                                                                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                                                                    </div>
                                                                                    {renderFieldIcon(field.type)}
                                                                                    <div className="flex-1">
                                                                                        <div className="font-medium text-sm">{field.label}</div>
                                                                                        <div className="text-xs text-muted-foreground">
                                                                                            {field.type} {field.required && "(Required)"}
                                                                                        </div>
                                                                                    </div>
                                                                                    <Button
                                                                                        variant="ghost"
                                                                                        size="sm"
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation()
                                                                                            removeField(field.id)
                                                                                        }}
                                                                                    >
                                                                                        <Trash2 className="h-4 w-4" />
                                                                                    </Button>
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
                                    </div>

                                    <div className="flex justify-between mt-6">
                                        <Button variant="outline" onClick={() => setCurrentStep(1)}>
                                            Back
                                        </Button>
                                        <div className="space-x-2">
                                            <Button variant="outline" onClick={handlePreview}>
                                                <Eye className="mr-2 h-4 w-4" />
                                                Preview
                                            </Button>
                                            <Button onClick={handleSaveAndPublish} disabled={isPublishing}>
                                                <Save className="mr-2 h-4 w-4" />
                                                {isPublishing ? "Publishing..." : "Save & Publish"}
                                            </Button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {currentStep === 2 && selectedField && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Field Settings</CardTitle>
                                <CardDescription>Configure the selected field properties.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="field-label">Field Label</Label>
                                    <Input
                                        id="field-label"
                                        value={selectedField.label}
                                        onChange={(e) => updateField(selectedField.id, { label: e.target.value })}
                                    />
                                </div>

                                {["text", "textarea", "number", "email"].includes(selectedField.type) && (
                                    <div className="space-y-2">
                                        <Label htmlFor="field-placeholder">Placeholder</Label>
                                        <Input
                                            id="field-placeholder"
                                            value={selectedField.placeholder || ""}
                                            onChange={(e) => updateField(selectedField.id, { placeholder: e.target.value })}
                                        />
                                    </div>
                                )}

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="field-required"
                                        checked={selectedField.required}
                                        onCheckedChange={(checked) => updateField(selectedField.id, { required: checked as boolean })}
                                    />
                                    <Label htmlFor="field-required">Required field</Label>
                                </div>

                                {/* Validation — text/textarea/email */}
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
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <PatternBuilder
                                            value={selectedField.validation?.pattern}
                                            onChange={(pattern) => updateField(selectedField.id, {
                                                validation: {
                                                    ...selectedField.validation,
                                                    pattern,
                                                }
                                            })}
                                        />
                                    </div>
                                )}

                                {/* Validation — number/range */}
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
                                                    className="h-8 text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {["radio", "checkbox", "select"].includes(selectedField.type) && (
                                    <div className="space-y-2">
                                        <Label>Options</Label>
                                        <div className="space-y-2">
                                            {selectedField.options?.map((option, index) => (
                                                <div key={index} className="flex items-center space-x-2">
                                                    <Input
                                                        value={option}
                                                        onChange={(e) => {
                                                            const newOptions = [...(selectedField.options || [])]
                                                            newOptions[index] = e.target.value
                                                            updateField(selectedField.id, { options: newOptions })
                                                        }}
                                                    />
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const newOptions = selectedField.options?.filter((_, i) => i !== index)
                                                            updateField(selectedField.id, { options: newOptions })
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const newOptions = [
                                                        ...(selectedField.options || []),
                                                        `Option ${(selectedField.options?.length || 0) + 1}`,
                                                    ]
                                                    updateField(selectedField.id, { options: newOptions })
                                                }}
                                            >
                                                <Plus className="mr-2 h-4 w-4" />
                                                Add Option
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    <Card>
                        <CardHeader>
                            <CardTitle>Form Preview</CardTitle>
                            <CardDescription>See how your form will look to visitors.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                <div className="text-lg font-semibold">{eventData.title || "Event Title"}</div>
                                <div className="text-sm text-muted-foreground">
                                    {eventData.description || "Event description will appear here..."}
                                </div>

                                {(isMultiStep ? steps.flatMap(s => s.fields) : formFields).map((field) => (
                                    <div key={field.id} className="space-y-1">
                                        <Label className="text-sm">
                                            {field.label}
                                            {field.required && <span className="text-destructive ml-1">*</span>}
                                        </Label>
                                        {field.type === "text" && <Input placeholder={field.placeholder} disabled />}
                                        {field.type === "textarea" && <Textarea placeholder={field.placeholder} disabled />}
                                        {field.type === "select" && (
                                            <Select disabled>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select an option" />
                                                </SelectTrigger>
                                            </Select>
                                        )}
                                    </div>
                                ))}

                                {eventData.enablePayment && (
                                    <div className="border-t pt-4">
                                        <div className="text-sm font-medium">Payment Required</div>
                                        <div className="text-lg font-bold">
                                            {eventData.paymentCurrency} {eventData.paymentAmount}
                                        </div>
                                        <div className="text-sm text-muted-foreground">{eventData.paymentDescription}</div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
            <FormPreviewModal
                open={showPreview}
                onOpenChange={setShowPreview}
                eventData={eventData}
                formFields={formFields}
            />

            <PublishSuccessModal
                open={showPublishSuccess}
                onOpenChange={(open) => {
                    setShowPublishSuccess(open)
                    if (!open) router.push("/dashboard/events")
                }}
                formUrl={publishedFormUrl}
                eventTitle={eventData.title}
            />
        </div>
    )
}
