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
import { toast } from "sonner"
import { useRazorpay } from "@/lib/hooks/useRazorpay"
import type { SubmitFormResult } from "@/lib/api/submissions"
import { CreditCard, CheckCircle, CheckSquare, Clock, Shield, FormInput, Loader2, AlertCircle, XCircle } from "lucide-react"
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

    const [pageState, setPageState] = useState<"LOADING" | "READY" | "CLOSED" | "AWAITING_PAYMENT" | "PAYMENT_SUCCESS" | "SUBMITTED" | "ERROR">("LOADING")
    const [form, setForm] = useState<any>(null)
    const [visitorUuid, setVisitorUuid] = useState<string>("")
    const [formValues, setFormValues] = useState<Record<string, any>>({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [currentStep, setCurrentStep] = useState(0)
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
    const [submissionId, setSubmissionId] = useState<string | null>(null)
    const { state: paymentState, error: paymentError, initiatePayment, retryPayment } = useRazorpay()

    // Refs to guarantee visit and start only fire ONCE
    const visitFiredRef = useRef(false)
    const startFiredRef = useRef(false)

    // Pattern-specific error messages
    const patternMessages: Record<string, string> = {
        "^[A-Za-z ]+$": "Must contain only letters and spaces.",
        "^[6-9]\\d{9}$": "Must be a 10-digit number starting with 6, 7, 8, or 9.",
        "^[0-9]+$": "Must contain only numbers.",
    }

    // Auto-transition: payment confirmed → success screen
    // MUST be declared here — before any conditional early returns (Rules of Hooks)
    useEffect(() => {
        if (pageState === "AWAITING_PAYMENT" && paymentState === "success") {
            setPageState("PAYMENT_SUCCESS")
        }
    }, [pageState, paymentState])


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

    const hasCurrentStepErrors = currentStepFields.some(f => fieldErrors[f.key])

    const handleFieldChange = (fieldKey: string, value: any, field: FormField) => {
        // Fire startSubmission exactly ONCE on first interaction
        if (!startFiredRef.current) {
            startFiredRef.current = true
            startSubmission(slug, visitorUuid).catch(() => { })
        }
        setFormValues((prev) => ({ ...prev, [fieldKey]: value }))
        // Clear error for this field when user starts editing
        if (fieldErrors[fieldKey]) {
            setFieldErrors(prev => {
                const next = { ...prev }
                delete next[fieldKey]
                return next
            })
        }
        // Re-validate this field in real-time
        const errors = validateFields([field])
        if (errors[fieldKey]) {
            setFieldErrors(prev => ({ ...prev, [fieldKey]: errors[fieldKey] }))
        }
    }



    function validateFields(fieldsToValidate: FormField[]): Record<string, string> {
        const errors: Record<string, string> = {}

        for (const field of fieldsToValidate) {
            const rawValue = formValues[field.key]
            const v = field.validation as any

            // Required check
            if (field.required) {
                const isEmpty = rawValue === undefined || rawValue === null || rawValue === "" ||
                    (Array.isArray(rawValue) && rawValue.length === 0)
                if (isEmpty) {
                    errors[field.key] = `${field.label} is required.`
                    continue
                }
            }

            // Skip further validation if field is empty and not required
            if (rawValue === undefined || rawValue === null || rawValue === "") continue

            // TEXT / TEXTAREA / EMAIL
            if (["TEXT", "TEXTAREA", "EMAIL"].includes(field.type)) {
                const str = String(rawValue)
                if (v?.minLength !== undefined && str.length < v.minLength) {
                    errors[field.key] = `Must be at least ${v.minLength} characters.`
                    continue
                }
                if (v?.maxLength !== undefined && str.length > v.maxLength) {
                    errors[field.key] = `Must be no more than ${v.maxLength} characters.`
                    continue
                }
                if (v?.pattern) {
                    try {
                        if (!new RegExp(v.pattern).test(str)) {
                            errors[field.key] = patternMessages[v.pattern] || "Does not match the required format."
                            continue
                        }
                    } catch { /* invalid regex — skip */ }
                }
                // EMAIL format check (in addition to pattern)
                if (field.type === "EMAIL" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str)) {
                    errors[field.key] = `Please enter a valid email address.`
                    continue
                }
            }

            // NUMBER / RANGE
            if (["NUMBER", "RANGE"].includes(field.type)) {
                const num = Number(rawValue)
                if (isNaN(num)) {
                    errors[field.key] = `Must be a valid number.`
                    continue
                }
                if (v?.min !== undefined && num < v.min) {
                    errors[field.key] = `Must be at least ${v.min}.`
                    continue
                }
                if (v?.max !== undefined && num > v.max) {
                    errors[field.key] = `Must be no more than ${v.max}.`
                    continue
                }
            }
        }

        return errors
    }

    const handleNextStep = () => {
        // Re-derive fields fresh at call time — avoids stale closure
        const freshSteps: any[] = form?.form?.steps ?? []
        const freshCurrentFields: FormField[] = form?.form?.isMultiStep
            ? (freshSteps[currentStep]?.fields ?? [])
            : (form?.form?.fields ?? form?.fields ?? [])

        const errors = validateFields(freshCurrentFields)
        setFieldErrors(errors)

        if (Object.keys(errors).length > 0) {
            toast.error("Please fix the errors before continuing.")
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

        const errors = validateFields(freshFields)
        setFieldErrors(errors)

        if (Object.keys(errors).length > 0) {
            toast.error("Please fix the errors before submitting.")
            return
        }

        setIsSubmitting(true)

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
                    } else if (field.type === "DATE") {
                        answer.valueDate = new Date(raw)
                    } else if (field.type === "CHECKBOX") {
                        if (Array.isArray(raw)) {
                            answer.valueJson = raw
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
                toast.error("Please fill in at least one field.")
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

            const result: SubmitFormResult = await submitForm(slug, payload)
            setSubmissionId(result.submissionId)
            if (enablePayment) {
                setPageState("AWAITING_PAYMENT")
            } else {
                setPageState("SUBMITTED")
            }
        } catch (err: any) {
            toast.error("Submission Failed", { description: err.message })
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderField = (field: FormField) => {
        const value = formValues[field.key] || ""
        const hasError = !!fieldErrors[field.key]

        switch (field.type) {
            case "TEXT":
            case "EMAIL":
            case "NUMBER":
            case "DATE":
                return (
                    <Input
                        type={field.type.toLowerCase()}
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value, field)}
                        required={field.required}
                        className={hasError ? "border-destructive focus:border-destructive" : ""}
                    />
                )

            case "TEXTAREA":
                return (
                    <Textarea
                        value={value}
                        onChange={(e) => handleFieldChange(field.key, e.target.value, field)}
                        required={field.required}
                        rows={4}
                        className={hasError ? "border-destructive focus:border-destructive" : ""}
                    />
                )

            case "SELECT":
                // Extract choices array — backend sends { choices: [...] } or legacy flat array
                const selectChoices: string[] = Array.isArray(field.options)
                    ? field.options
                    : (field.options as any)?.choices ?? []

                return (
                    <Select value={value} onValueChange={(val) => handleFieldChange(field.key, val, field)} required={field.required}>
                        <SelectTrigger className={hasError ? "border-destructive focus:border-destructive" : ""}>
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {selectChoices.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )

            case "RADIO":
                // Extract choices array — backend sends { choices: [...] } or legacy flat array
                const radioChoices: string[] = Array.isArray(field.options)
                    ? field.options
                    : (field.options as any)?.choices ?? []

                return (
                    <RadioGroup value={value} onValueChange={(val) => handleFieldChange(field.key, val, field)} required={field.required}>
                        {radioChoices.map((option: string) => (
                            <div key={option} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                )

            case "CHECKBOX":
                const selectedValues = value || []
                // Extract choices array — backend sends { choices: [...] } or legacy flat array
                const checkboxChoices: string[] = Array.isArray(field.options)
                    ? field.options
                    : (field.options as any)?.choices ?? []

                return (
                    <div className="space-y-2">
                        {checkboxChoices.map((option: string) => (
                            <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${field.id}-${option}`}
                                    checked={selectedValues.includes(option)}
                                    onCheckedChange={(checked) => {
                                        const newValues = checked
                                            ? [...selectedValues, option]
                                            : selectedValues.filter((v: string) => v !== option)
                                        handleFieldChange(field.key, newValues, field)
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
                        onChange={(url) => handleFieldChange(field.key, url, field)}
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
    // NOTE: useEffect below must stay here — before all conditional early returns
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

    // ── AWAITING_PAYMENT state ──────────────────────────────
    if (pageState === "AWAITING_PAYMENT") {
        const isProcessing = ["creating_order", "checkout_open", "verifying", "polling"].includes(paymentState)
        const isFailed = paymentState === "failed"
        const isCancelled = paymentState === "cancelled"

        const paymentConfig = {
            amount: paymentAmount,
            currency: paymentCurrency,
            eventTitle,
        }

        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <CreditCard className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Complete Payment</CardTitle>
                        <CardDescription>
                            Your registration for <strong>{eventTitle}</strong> is saved.
                            Complete payment to confirm your spot.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                            <span className="text-sm font-medium text-muted-foreground">
                                {paymentDescription || "Registration Fee"}
                            </span>
                            <span className="text-xl font-bold">
                                {paymentCurrency} {Number(paymentAmount).toLocaleString("en-IN")}
                            </span>
                        </div>

                        {paymentState === "creating_order" && (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                                Preparing your payment...
                            </div>
                        )}
                        {(paymentState === "verifying" || paymentState === "polling") && (
                            <div className="flex items-center gap-2 text-sm p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <Loader2 className="h-4 w-4 animate-spin shrink-0 text-blue-600" />
                                <span className="text-blue-700">
                                    {paymentState === "verifying" ? "Verifying payment..." : "Confirming with bank..."}
                                </span>
                            </div>
                        )}
                        {isFailed && (
                            <div className="flex items-start gap-2 text-sm p-3 bg-red-50 rounded-lg border border-red-200">
                                <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                <span className="text-red-700">{paymentError ?? "Payment failed. Please try again."}</span>
                            </div>
                        )}
                        {isCancelled && (
                            <div className="flex items-start gap-2 text-sm p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />
                                <span className="text-yellow-700">Payment cancelled. You can try again below.</span>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Shield className="h-3.5 w-3.5 shrink-0" />
                            Secured by Razorpay. Your registration is saved regardless of payment status.
                        </div>

                        <Button
                            className="w-full"
                            size="lg"
                            disabled={isProcessing}
                            onClick={() => {
                                if (!submissionId) return
                                if (isFailed) {
                                    retryPayment(submissionId, paymentConfig)
                                } else {
                                    initiatePayment(submissionId, paymentConfig)
                                }
                            }}
                        >
                            {isProcessing ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Processing...</>
                            ) : isFailed ? (
                                <><CreditCard className="mr-2 h-4 w-4" />Retry Payment</>
                            ) : (
                                <><CreditCard className="mr-2 h-4 w-4" />Pay {paymentCurrency} {Number(paymentAmount).toLocaleString("en-IN")}</>
                            )}
                        </Button>

                        <p className="text-xs text-center text-muted-foreground">
                            Your registration is already recorded. Payment confirms your spot.
                        </p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    // ── PAYMENT_SUCCESS state ──────────────────────────────
    if (pageState === "PAYMENT_SUCCESS") {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <CardTitle className="text-2xl">Registration Confirmed!</CardTitle>
                        <CardDescription>Payment received. You're all set.</CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <div className="flex items-center justify-center gap-2 text-green-700 mb-1">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm font-medium">Payment Successful</span>
                            </div>
                            <p className="text-sm text-green-600">
                                {paymentCurrency} {Number(paymentAmount).toLocaleString("en-IN")} paid for {eventTitle}
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            A confirmation will be sent to you from YSM Info Solution shortly.
                        </p>
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
                                                {fieldErrors[field.key] && (
                                                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                                                        <AlertCircle className="h-3 w-3 shrink-0" />
                                                        {fieldErrors[field.key]}
                                                    </p>
                                                )}
                                            </div>
                                        ))}



                                        <div className="pt-6 flex items-center justify-between gap-4">
                                            {isMultiStep && (
                                                <Button type="button" variant="outline" onClick={handlePrevStep} disabled={currentStep === 0 || isSubmitting} className="w-full sm:w-auto">
                                                    Back
                                                </Button>
                                            )}
                                            {currentStep < totalSteps - 1 ? (
                                                <Button type="button" onClick={handleNextStep} disabled={hasCurrentStepErrors} className="w-full sm:w-auto ml-auto">
                                                    Next Step &rarr;
                                                </Button>
                                            ) : (
                                                <Button type="button" onClick={() => handleSubmit()} className="w-full sm:w-auto ml-auto" disabled={isSubmitting || hasCurrentStepErrors} size="lg">
                                                    {isSubmitting ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                            Submitting...
                                                        </>
                                                    ) : (
                                                        "Submit Registration"
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
                                                {paymentCurrency} {paymentAmount ? Number(paymentAmount).toLocaleString("en-IN") : "—"}
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
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Email: <a href="mailto:support@ysminfosolution.com">support@ysminfosolution.com</a>
                                    </p>
                                    <p className="text-sm text-muted-foreground mb-4">
                                        Phone: <a href="tel:+918983083698">+91 89830 83698</a>
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    )
}
