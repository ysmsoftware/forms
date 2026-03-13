"use client"

import { useState, useEffect, useRef } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/hooks/use-toast"
import { CreditCard, CheckCircle, Clock, Shield, FormInput, Loader2, AlertCircle, XCircle } from "lucide-react"
import {
    loadPublicForm,
    recordVisit,
    startSubmission,
    submitForm,
} from "@/lib/api/submissions"
import type { FormField, AnswerInput, SubmitFormInput } from "@/lib/types/api"
import { PublicFileUploadField } from "@/components/public-file-upload-field"

export default function PublicForm() {
    const params = useParams()
    const slug = params.slug as string

    const [pageState, setPageState] = useState<"LOADING" | "READY" | "CLOSED" | "SUBMITTED" | "ERROR">("LOADING")
    const [form, setForm] = useState<any>(null)
    const [visitorUuid, setVisitorUuid] = useState<string>("")
    const [formValues, setFormValues] = useState<Record<string, any>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [paymentStatus, setPaymentStatus] = useState<"pending" | "processing" | "completed" | "failed">("pending")
    const [currentStep, setCurrentStep] = useState(0)
    const { toast } = useToast()

    // Refs to guarantee visit and start only fire ONCE
    const visitFiredRef = useRef(false)
    const startFiredRef = useRef(false)


    function getOrCreateVisitorUuid(): string {
        let uuid = sessionStorage.getItem("visitor_uuid")
        if (!uuid) {
            uuid = crypto.randomUUID()
            sessionStorage.setItem("visitor_uuid", uuid)
        }
        return uuid
    }

    // Fire ONCE on mount
    useEffect(() => {
        if (visitFiredRef.current) return
        visitFiredRef.current = true

        const uuid = getOrCreateVisitorUuid()
        setVisitorUuid(uuid)

        loadPublicForm(slug)
            .then((data) => {
                setForm(data)
                // Check if event is accepting responses
                const status = data?.event?.status
                if (status && status !== "ACTIVE") {
                    setPageState("CLOSED")
                    return
                }

                setPageState("READY")

                // Fire-and-forget visit tracking
                recordVisit(slug, uuid).catch(() => { })
            })
            .catch(() => setPageState("ERROR"))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const eventTitle = form?.event?.title ?? ""
    const eventDescription = form?.event?.description ?? ""
    const enablePayment = form?.event?.paymentEnabled ?? false
    const paymentAmount = form?.event?.paymentConfig?.amount ?? ""
    const paymentCurrency = form?.event?.paymentConfig?.currency ?? ""
    const paymentDescription = form?.event?.paymentConfig?.description ?? ""

    const isMultiStep: boolean = form?.form?.isMultiStep ?? false
    const steps: any[] = form?.form?.steps ?? []
    // Single-step: fields are at form.form.fields (flat array, stepId=null)
    // Multi-step: fields are nested inside each step, form.form.fields may be empty
    const fields: FormField[] = isMultiStep
        ? []
        : (form?.form?.fields ?? form?.fields ?? [])


    const totalSteps = isMultiStep ? steps.length : 1
    const currentStepFields: FormField[] = isMultiStep
        ? (steps[currentStep]?.fields ?? [])
        : fields

    const handleFieldChange = (fieldKey: string, value: any) => {
        // Fire startSubmission exactly ONCE on first interaction
        if (!startFiredRef.current) {
            startFiredRef.current = true
            startSubmission(slug, visitorUuid).catch(() => { })
        }
        setFormValues((prev) => ({ ...prev, [fieldKey]: value }))
    }

    const handlePayment = async () => {
        setPaymentStatus("processing")

        // Simulate payment processing (will be replaced by real payment gateway)
        setTimeout(() => {
            setPaymentStatus("completed")
            toast({
                title: "Payment Successful",
                description: "Your payment has been processed successfully.",
            })
        }, 2000)
    }

    const handleNextStep = () => {
        // Re-derive fields fresh at call time — avoids stale closure
        const freshSteps: any[] = form?.form?.steps ?? []
        const freshCurrentFields: FormField[] = form?.form?.isMultiStep
            ? (freshSteps[currentStep]?.fields ?? [])
            : (form?.form?.fields ?? form?.fields ?? [])

        const requiredFields = freshCurrentFields.filter((field: FormField) => field.required)
        const missingFields = requiredFields.filter((field: FormField) => !formValues[field.key])

        if (missingFields.length > 0) {
            toast({
                title: "Missing Required Fields",
                description: "Please fill in all required fields before proceeding.",
                variant: "destructive",
            })
            return
        }

        if (!startFiredRef.current) {
            startFiredRef.current = true
            startSubmission(slug, visitorUuid).catch(() => { })
        }

        setCurrentStep(prev => prev + 1)
    }

    const handlePrevStep = () => {
        setCurrentStep(prev => prev - 1)
    }

    const handleSubmit = async () => {
        if (isSubmitting) return

        // Re-derive fields fresh at call time — avoids stale closure
        const freshSteps: any[] = form?.form?.steps ?? []
        const freshFields: FormField[] = form?.form?.isMultiStep
            ? (freshSteps[currentStep]?.fields ?? [])
            : (form?.form?.fields ?? form?.fields ?? [])

        // Validate current step
        const requiredFields = freshFields.filter((field: FormField) => field.required)
        const missingFields = requiredFields.filter((field: FormField) => !formValues[field.key])

        if (missingFields.length > 0) {
            const firstMissing = missingFields[0]
            toast({
                title: "Missing Required Fields",
                description: firstMissing.type === "FILE"
                    ? `Please upload a file for: ${firstMissing.label}`
                    : "Please fill in all required fields before submitting.",
                variant: "destructive",
            })
            return
        }

        setIsSubmitting(true)

        // Handle payment if required
        if (enablePayment && paymentStatus !== "completed") {
            await handlePayment()
        }

        try {
            const freshSteps2: any[] = form?.form?.steps ?? []
            const allFields = form?.form?.isMultiStep
                ? freshSteps2.flatMap((s: any) => s.fields)
                : (form?.form?.fields ?? form?.fields ?? [])

            // Build answers array from formValues — { fieldId, fieldKey, value }
            const answers: AnswerInput[] = allFields
                .map((field: FormField) => {
                    const raw = formValues[field.key]
                    if (raw === undefined || raw === null || raw === "") return null

                    const answer: AnswerInput = { fieldId: field.id, fieldKey: field.key }

                    if (field.type === "FILE") {
                        answer.fileUrl = String(raw)
                    } else if (field.type === "NUMBER" || field.type === "RANGE") {
                        answer.valueNumber = Number(raw)
                    } else if (field.type === "CHECKBOX") {
                        if (Array.isArray(raw)) {
                            answer.valueText = raw.join(", ")
                        } else {
                            answer.valueBoolean = Boolean(raw)
                        }
                    } else {
                        answer.valueText = Array.isArray(raw) ? raw.join(", ") : String(raw)
                    }
                    return answer
                })
                .filter((a: AnswerInput | null): a is AnswerInput => a !== null)

            // Guard: if no answers after filtering, show error
            if (answers.length === 0) {
                toast({ title: "Please fill in at least one field", variant: "destructive" })
                setIsSubmitting(false)
                return
            }

            // Heuristic contact extraction: look through fields for name/email/phone
            const contactName =
                formValues[allFields.find((f: any) => f.type === "TEXT" && /name/i.test(f.key))?.key ?? "__none__"] ?? undefined
            const contactEmail =
                formValues[allFields.find((f: any) => f.type === "EMAIL" || /email/i.test(f.key))?.key ?? "__none__"] ?? undefined
            const contactPhone =
                formValues[allFields.find((f: any) => /phone/i.test(f.key))?.key ?? "__none__"] ?? undefined

            const payload: SubmitFormInput = {
                visitor: { uuid: visitorUuid },
                answers,
                contact: {
                    name: contactName,
                    email: contactEmail,
                    phone: contactPhone,
                },
            }

            await submitForm(slug, payload)
            setPageState("SUBMITTED")
        } catch (err: any) {
            toast({ title: "Submission Failed", description: err.message, variant: "destructive" })
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderField = (field: FormField) => {
        const value = formValues[field.key] || ""

        switch (field.type) {
            case "TEXT":
            case "EMAIL":
            case "NUMBER":
            case "DATE":
                return (
                    <Input
                        type={field.type.toLowerCase()}
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        required={field.required}
                    />
                )

            case "TEXTAREA":
                return (
                    <Textarea
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        required={field.required}
                        rows={4}
                    />
                )

            case "SELECT":
                return (
                    <Select value={value} onValueChange={(val) => handleFieldChange(field.key, val)} required={field.required}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )

            case "RADIO":
                return (
                    <RadioGroup value={value} onValueChange={(val) => handleFieldChange(field.key, val)} required={field.required}>
                        {field.options?.map((option: string) => (
                            <div key={option} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                )

            case "CHECKBOX":
                const selectedValues = value || []
                return (
                    <div className="space-y-2">
                        {field.options?.map((option: string) => (
                            <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${field.id}-${option}`}
                                    checked={selectedValues.includes(option)}
                                    onCheckedChange={(checked) => {
                                        const newValues = checked
                                            ? [...selectedValues, option]
                                            : selectedValues.filter((v: string) => v !== option)
                                        handleFieldChange(field.key, newValues)
                                    }}
                                />
                                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                            </div>
                        ))}
                    </div>
                )

            case "FILE":
                return (
                    <PublicFileUploadField
                        field={field}
                        eventId={form?.event?.id}
                        eventSlug={slug}
                        visitorId={visitorUuid}
                        value={value}
                        onChange={(url) => handleFieldChange(field.key, url)}
                        disabled={isSubmitting}
                    />
                )

            default:
                return null
        }
    }

    // ── LOADING state ──────────────────────────────────
    if (pageState === "LOADING") {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    // ── ERROR state ────────────────────────────────────
    if (pageState === "ERROR") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertCircle className="h-6 w-6 text-red-600" />
                        </div>
                        <CardTitle className="text-2xl">Form Not Found</CardTitle>
                        <CardDescription>This form is no longer available or the link is incorrect.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Button asChild variant="outline">
                            <Link href="/">Back to Home</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── CLOSED state (DRAFT or CLOSED event) ─────────
    if (pageState === "CLOSED") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-yellow-100 flex items-center justify-center">
                            <XCircle className="h-6 w-6 text-yellow-600" />
                        </div>
                        <CardTitle className="text-2xl">Form Closed</CardTitle>
                        <CardDescription>This form is no longer accepting responses.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        {eventTitle && (
                            <p className="text-sm text-muted-foreground">
                                The event <strong>{eventTitle}</strong> is currently not accepting new submissions.
                            </p>
                        )}
                        <Button asChild variant="outline">
                            <Link href="/">Back to Home</Link>
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── SUBMITTED state ────────────────────────────────
    if (pageState === "SUBMITTED") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Thank You!</CardTitle>
                        <CardDescription>Your response has been recorded.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground">
                            We've received your submission for <strong>{eventTitle}</strong>. Our team will contact you soon with further details.
                        </p>
                        {enablePayment && paymentStatus === "completed" && (
                            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex items-center justify-center space-x-2 text-green-700">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-sm font-medium">Payment Confirmed</span>
                                </div>
                                <p className="text-xs text-green-600 mt-1">
                                    {paymentCurrency} {paymentAmount} - {paymentDescription}
                                </p>
                            </div>
                        )}
                        <div className="pt-4">
                            <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                                Submit another response
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── READY state (main form) ────────────────────────
    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="border-b bg-card">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                            <FormInput className="h-5 w-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold">YSM Infosolutions</span>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="space-y-8">
                    {/* Event Info */}
                    <div className="text-center space-y-4">
                        {form?.event?.bannerUrl && (
                            <img
                                src={form.event.bannerUrl}
                                alt={eventTitle}
                                className="w-full rounded-lg object-cover max-h-48 mb-4 shadow-sm"
                            />
                        )}
                        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{eventTitle}</h1>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{eventDescription}</p>
                        {startFiredRef.current && (
                            <div className="flex items-center justify-center space-x-2 text-sm text-muted-foreground">
                                <Clock className="h-4 w-4" />
                                <span>Form started - your progress is being saved</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form */}
                        <div className="lg:col-span-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle>{isMultiStep ? steps[currentStep]?.title : "Registration Form"}</CardTitle>
                                    <CardDescription>
                                        {isMultiStep
                                            ? steps[currentStep]?.description || `Step ${currentStep + 1} of ${totalSteps}`
                                            : "Please fill out all required fields to complete your registration."}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {isMultiStep && (
                                        <div className="mb-6 space-y-2">
                                            <div className="flex justify-between text-sm text-muted-foreground">
                                                <span>Step {currentStep + 1} of {totalSteps}</span>
                                                <span className="font-medium">{Math.round((currentStep / totalSteps) * 100)}%</span>
                                            </div>
                                            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
                                        </div>
                                    )}
                                    <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
                                        {currentStepFields.map((field) => (
                                            <div key={field.id} className="space-y-2">
                                                <Label htmlFor={field.id} className="text-sm font-medium">
                                                    {field.label}
                                                    {field.required && <span className="text-destructive ml-1">*</span>}
                                                </Label>
                                                {renderField(field)}
                                            </div>
                                        ))}

                                        {enablePayment && (
                                            <>
                                                <Separator />
                                                <div className="space-y-4">
                                                    <div className="flex items-center space-x-2">
                                                        <CreditCard className="h-5 w-5 text-primary" />
                                                        <h3 className="text-lg font-semibold">Payment Required</h3>
                                                    </div>

                                                    <div className="p-4 bg-muted/50 rounded-lg">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-medium">{paymentDescription}</span>
                                                            <span className="text-2xl font-bold">
                                                                {paymentCurrency} {paymentAmount}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                            <Shield className="h-4 w-4" />
                                                            <span>Secure payment processing</span>
                                                        </div>
                                                    </div>

                                                    {paymentStatus === "processing" && (
                                                        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                                            <div className="flex items-center space-x-2 text-blue-700">
                                                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                                                                <span className="text-sm font-medium">Processing payment...</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {paymentStatus === "completed" && (
                                                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                                                            <div className="flex items-center space-x-2 text-green-700">
                                                                <CheckCircle className="h-4 w-4" />
                                                                <span className="text-sm font-medium">Payment completed successfully</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}

                                        <div className="pt-6 flex items-center justify-between gap-4">
                                            {isMultiStep && (
                                                <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 0 || isSubmitting} className="w-full sm:w-auto">
                                                    Back
                                                </Button>
                                            )}
                                            {currentStep < totalSteps - 1 ? (
                                                <Button type="button" onClick={handleNextStep} className="w-full sm:w-auto ml-auto">
                                                    Next Step &rarr;
                                                </Button>
                                            ) : (
                                                <Button type="button" onClick={() => handleSubmit()} className="w-full sm:w-auto ml-auto" disabled={isSubmitting} size="lg">
                                                    {isSubmitting ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                            {enablePayment && paymentStatus !== "completed"
                                                                ? "Processing Payment..."
                                                                : "Submitting Form..."}
                                                        </>
                                                    ) : (
                                                        <>
                                                            {enablePayment && paymentStatus !== "completed"
                                                                ? `Pay ${paymentCurrency} ${paymentAmount} & Submit`
                                                                : "Submit Registration"}
                                                        </>
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </form>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Event Details</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <h4 className="font-medium text-sm text-muted-foreground">Event Title</h4>
                                        <p className="font-medium">{eventTitle}</p>
                                    </div>

                                    {enablePayment && (
                                        <div>
                                            <h4 className="font-medium text-sm text-muted-foreground">Registration Fee</h4>
                                            <p className="font-medium text-lg">
                                                {paymentCurrency} {paymentAmount}
                                            </p>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                            <Shield className="h-4 w-4" />
                                            <span>Your data is secure and encrypted</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Need Help?</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        If you have any questions about this event or need assistance with registration, please contact us.
                                    </p>
                                    <Button variant="outline" className="w-full bg-transparent">
                                        Contact Support
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
