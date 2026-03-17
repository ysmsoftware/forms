"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { CreditCard, Shield } from "lucide-react"

interface FormField {
    id: string
    type: "text" | "textarea" | "number" | "email" | "radio" | "checkbox" | "select" | "date" | "file" | "range"
    label: string
    placeholder?: string
    required: boolean
    options?: string[]
    validation?: {
        minLength?: number
        maxLength?: number
        min?: number
        max?: number
        pattern?: string
    }
}

interface EventData {
    title: string
    description: string
    enablePayment: boolean
    paymentAmount: string
    paymentCurrency: string
    paymentDescription: string
}

interface FormPreviewModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    eventData: EventData
    formFields: FormField[]
}

export function FormPreviewModal({ open, onOpenChange, eventData, formFields }: FormPreviewModalProps) {
    const [formValues, setFormValues] = useState<Record<string, any>>({})

    const handleFieldChange = (fieldId: string, value: any) => {
        setFormValues((prev) => ({
            ...prev,
            [fieldId]: value,
        }))
    }

    const renderField = (field: FormField) => {
        const value = formValues[field.id] || ""

        switch (field.type) {
            case "text":
            case "email":
                return (
                    <Input
                        type={field.type}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    />
                )

            case "number":
                return (
                    <Input
                        type="number"
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                    />
                )

            case "textarea":
                return (
                    <Textarea
                        placeholder={field.placeholder}
                        value={value}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        rows={4}
                    />
                )

            case "select":
                return (
                    <Select value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {field.options?.map((option) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )

            case "radio":
                return (
                    <RadioGroup value={value} onValueChange={(val) => handleFieldChange(field.id, val)}>
                        {field.options?.map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                                <RadioGroupItem value={option} id={`${field.id}-${option}`} />
                                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                            </div>
                        ))}
                    </RadioGroup>
                )

            case "checkbox":
                const selectedValues = value || []
                return (
                    <div className="space-y-2">
                        {field.options?.map((option) => (
                            <div key={option} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`${field.id}-${option}`}
                                    checked={selectedValues.includes(option)}
                                    onCheckedChange={(checked) => {
                                        const newValues = checked
                                            ? [...selectedValues, option]
                                            : selectedValues.filter((v: string) => v !== option)
                                        handleFieldChange(field.id, newValues)
                                    }}
                                />
                                <Label htmlFor={`${field.id}-${option}`}>{option}</Label>
                            </div>
                        ))}
                    </div>
                )

            case "date":
                return <Input type="date" value={value} onChange={(e) => handleFieldChange(field.id, e.target.value)} />

            case "file":
                return <Input type="file" onChange={(e) => handleFieldChange(field.id, e.target.files?.[0] || null)} />

            case "range":
                return (
                    <div className="space-y-2">
                        <Input
                            type="range"
                            min={field.validation?.min ?? 0}
                            max={field.validation?.max ?? 100}
                            value={value || field.validation?.min || 0}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            className="h-8"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
                            <span>Min: {field.validation?.min ?? 0}</span>
                            <span className="font-bold text-primary">Value: {value || field.validation?.min || 0}</span>
                            <span>Max: {field.validation?.max ?? 100}</span>
                        </div>
                    </div>
                )

            default:
                return null
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Form Preview</DialogTitle>
                    <DialogDescription>This is how your form will appear to visitors</DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                    {/* Event Header */}
                    <div className="text-center space-y-4 p-6 bg-muted/50 rounded-lg">
                        <h1 className="text-2xl font-bold">{eventData.title || "Event Title"}</h1>
                        <p className="text-muted-foreground">{eventData.description || "Event description will appear here..."}</p>
                    </div>

                    {/* Form Fields */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Registration Form</CardTitle>
                            <CardDescription>Please fill out all required fields</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {formFields.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">No form fields added yet</div>
                            ) : (
                                formFields.map((field) => (
                                    <div key={field.id} className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            {field.label}
                                            {field.required && <span className="text-destructive ml-1">*</span>}
                                        </Label>
                                        {renderField(field)}
                                    </div>
                                ))
                            )}

                            {/* Payment Section */}
                            {eventData.enablePayment && (
                                <>
                                    <Separator />
                                    <div className="space-y-4">
                                        <div className="flex items-center space-x-2">
                                            <CreditCard className="h-5 w-5 text-primary" />
                                            <h3 className="text-lg font-semibold">Payment Required</h3>
                                        </div>

                                        <div className="p-4 bg-muted/50 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium">{eventData.paymentDescription}</span>
                                                <span className="text-2xl font-bold">
                                                    {eventData.paymentCurrency} {eventData.paymentAmount}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                                <Shield className="h-4 w-4" />
                                                <span>Secure payment processing</span>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <Button className="w-full" size="lg">
                                {eventData.enablePayment
                                    ? `Pay ${eventData.paymentCurrency} ${eventData.paymentAmount} & Submit`
                                    : "Submit Registration"}
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    )
}
