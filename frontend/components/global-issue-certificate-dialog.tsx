"use client"

import React, { useState, useMemo, useEffect } from "react"
import { useContacts } from "@/lib/query/hooks/useContacts"
import {
  useResolveParamsForTemplate,
  useIssueDirectCertificate,
} from "@/lib/query/hooks/useCertificate"
import type { CertificateTemplateType } from "@/lib/api/certificate"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { toast } from "sonner"
import { Award, RefreshCw, Check, ChevronsUpDown } from "lucide-react"

const TEMPLATES: { value: CertificateTemplateType; label: string; description: string }[] = [
  { value: "ACHIEVEMENT",  label: "Certificate of Achievement",  description: "For outstanding achievements" },
  { value: "APPOINTMENT",  label: "Appointment Letter",           description: "Official appointment/offer letter" },
  { value: "COMPLETION",   label: "Certificate of Completion",    description: "For completing a course or program" },
  { value: "INTERNSHIP",   label: "Internship Certificate",       description: "For internship completion" },
  { value: "WORKSHOP",     label: "Certificate of Participation", description: "For workshop/event participation" },
]

const FIELD_LABELS: Record<string, string> = {
  achievementTitle: "Achievement Title",
  description:      "Description",
  position:         "Position / Role",
  startDate:        "Start Date",
  endDate:          "End Date",
  probation:        "Training Duration",
  location:         "Work Location",
  eventTitle:       "Course / Program Title",
  workshopTitle:    "Workshop Title",
  domain:           "Domain / Technology",
  signatoryName:    "Signatory Name",
  signatoryTitle:   "Signatory Title",
  salary:           "Salary",
  companyName:      "Company Name",
}

const FIELD_PLACEHOLDERS: Record<string, string> = {
  achievementTitle: "e.g. Excellence in Web Development",
  description:      "e.g. For demonstrating outstanding problem-solving skills",
  position:         "e.g. Software Developer Intern",
  startDate:        "e.g. January 1, 2025",
  endDate:          "e.g. June 30, 2025",
  probation:        "e.g. 6 months",
  location:         "e.g. Nashik, Maharashtra",
  eventTitle:       "e.g. Full Stack Development Bootcamp",
  workshopTitle:    "e.g. React & Node.js Workshop",
  domain:           "e.g. React.js, Node.js, TypeScript",
  signatoryName:    "e.g. Mr. Nilesh Sonawane",
  signatoryTitle:   "e.g. Authorized Signatory",
}

export interface GlobalIssueCertificateDialogProps {
  trigger?: React.ReactNode
  onSuccess?: () => void
}

export function GlobalIssueCertificateDialog({ trigger, onSuccess }: GlobalIssueCertificateDialogProps) {
  const [open, setOpen] = useState(false)
  const [contactId, setContactId] = useState("")
  const [contactLabel, setContactLabel] = useState("")
  const [templateType, setTemplateType] = useState<CertificateTemplateType | "">("")
  const [paramOverrides, setParamOverrides] = useState<Record<string, string>>({})
  const [contactSearchOpen, setContactSearchOpen] = useState(false)

  const { data: contactsData, isLoading: isLoadingContacts } = useContacts()

  const allContacts = useMemo(() => {
    if (!contactsData) return []
    if ("pages" in (contactsData as any)) return (contactsData as any).pages.flatMap((p: any) => p.contacts || [])
    if ("contacts" in (contactsData as any)) return (contactsData as any).contacts
    return []
  }, [contactsData])

  const { data: resolvedData, isLoading: isResolvingParams } = useResolveParamsForTemplate(
    contactId || null,
    (templateType as CertificateTemplateType) || null
  )

  // Reset overrides when template or contact changes
  useEffect(() => { setParamOverrides({}) }, [templateType, contactId])

  const issueDirect = useIssueDirectCertificate()

  const hasUnfilledRequired = resolvedData
    ? resolvedData.missing.some((f) => !paramOverrides[f]?.trim())
    : false

  const canIssue = !!contactId && !!templateType && !hasUnfilledRequired && !isResolvingParams && !issueDirect.isPending

  async function handleIssue() {
    if (!contactId || !templateType) return
    const mergedParams = { ...(resolvedData?.resolved ?? {}), ...paramOverrides }
    issueDirect.mutate(
      { contactId, templateType: templateType as CertificateTemplateType, paramOverrides: mergedParams },
      {
        onSuccess: () => {
          toast.success(`Certificate queued for ${contactLabel}.`)
          handleClose()
          onSuccess?.()
        },
        onError: (err: Error) => toast.error(err.message || "Failed to issue certificate."),
      }
    )
  }

  function handleClose() {
    setOpen(false)
    setContactId("")
    setContactLabel("")
    setTemplateType("")
    setParamOverrides({})
    issueDirect.reset()
  }

  const selectedTemplate = TEMPLATES.find((t) => t.value === templateType)

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        {trigger ?? <Button><Award className="h-4 w-4 mr-2" />Issue Certificate</Button>}
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Issue Certificate</DialogTitle>
          <DialogDescription>Issue a certificate to any contact — no event submission required</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 max-h-[70vh] overflow-y-auto overflow-x-hidden p-1">

          {/* Left — Settings */}
          <div className="space-y-4 md:border-r md:pr-6">
            <h3 className="font-semibold text-sm">Certificate Settings</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Template</label>
              <Select value={templateType} onValueChange={(v) => setTemplateType(v as CertificateTemplateType)}>
                <SelectTrigger><SelectValue placeholder="Select a template..." /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex flex-col py-0.5">
                        <span className="font-medium text-sm">{t.label}</span>
                        <span className="text-xs text-muted-foreground">{t.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Params panel */}
            {contactId && templateType ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium">Certificate Parameters</label>
                  {isResolvingParams && <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />}
                </div>

                {resolvedData && !isResolvingParams && (
                  <div className="rounded-md border bg-muted/30 p-3 space-y-2">
                    {/* Auto-resolved preview */}
                    {Object.entries(resolvedData.resolved)
                      .filter(([k, v]) => v && !resolvedData.missing.includes(k))
                      .map(([key, value]) => (
                        <div key={key} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground min-w-[90px] shrink-0 pt-0.5">
                            {FIELD_LABELS[key] ?? key}
                          </span>
                          <span className="text-foreground font-medium break-all">{value}</span>
                        </div>
                      ))}

                    {/* Required missing fields */}
                    {resolvedData.missing.length > 0 && (
                      <div className="border-t pt-2 mt-1 space-y-2">
                        <p className="text-xs font-semibold text-amber-600 flex items-center gap-1">
                          <span>⚠</span> {resolvedData.missing.length} field{resolvedData.missing.length !== 1 ? "s" : ""} required
                        </p>
                        {resolvedData.missing.map((field) => (
                          <div key={field} className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">
                              {FIELD_LABELS[field] ?? field}
                            </label>
                            <Input
                              className="h-7 text-xs"
                              placeholder={FIELD_PLACEHOLDERS[field] ?? `Enter ${field}...`}
                              value={paramOverrides[field] ?? ""}
                              onChange={(e) => setParamOverrides((p) => ({ ...p, [field]: e.target.value }))}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Optional fields that are empty */}
                    {Object.entries(resolvedData.resolved)
                      .filter(([k, v]) => !v && !resolvedData.missing.includes(k))
                      .length > 0 && (
                      <div className="border-t pt-2 mt-1 space-y-2">
                        <p className="text-xs text-muted-foreground">Optional fields</p>
                        {Object.entries(resolvedData.resolved)
                          .filter(([k, v]) => !v && !resolvedData.missing.includes(k))
                          .map(([field]) => (
                            <div key={field} className="space-y-1">
                              <label className="text-xs font-medium text-muted-foreground">
                                {FIELD_LABELS[field] ?? field}
                              </label>
                              <Input
                                className="h-7 text-xs"
                                placeholder={FIELD_PLACEHOLDERS[field] ?? `Enter ${field} (optional)...`}
                                value={paramOverrides[field] ?? ""}
                                onChange={(e) => setParamOverrides((p) => ({ ...p, [field]: e.target.value }))}
                              />
                            </div>
                          ))}
                      </div>
                    )}

                    {resolvedData.missing.length === 0 && (
                      <p className="text-xs text-green-600 flex items-center gap-1 pt-1 border-t">
                        <Check className="h-3 w-3" /> All required params resolved
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs text-muted-foreground">
                  Select a contact and template to see required parameters.
                </p>
              </div>
            )}
          </div>

          {/* Right — Recipient */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm">Recipient</h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">Contact</label>
              <Popover open={contactSearchOpen} onOpenChange={setContactSearchOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between overflow-hidden">
                    <span className="truncate">{contactId ? contactLabel : "Search contact..."}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search by name or email..." />
                    <CommandList>
                      <CommandEmpty>No contact found.</CommandEmpty>
                      <CommandGroup>
                        {isLoadingContacts ? (
                          <div className="p-4 text-sm text-center text-muted-foreground">Loading contacts...</div>
                        ) : (
                          allContacts.map((c: any) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.name ?? ""} ${c.email ?? ""}`}
                              onSelect={() => {
                                setContactId(c.id)
                                setContactLabel(c.name || c.email || "Unknown")
                                setContactSearchOpen(false)
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", contactId === c.id ? "opacity-100" : "opacity-0")} />
                              <div className="flex flex-col">
                                <span className="font-bold">{c.name || "Unnamed"}</span>
                                <span className="text-xs text-muted-foreground">{c.email}</span>
                              </div>
                            </CommandItem>
                          ))
                        )}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Contact card */}
            {contactId && (() => {
              const c = allContacts.find((x: any) => x.id === contactId)
              if (!c) return null
              return (
                <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/20">
                  <div className="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm">
                    {(c.name?.charAt(0) || "?").toUpperCase()}
                  </div>
                  <div className="flex flex-col overflow-hidden flex-1">
                    <span className="font-bold truncate">{c.name || "Unnamed"}</span>
                    <span className="text-xs text-muted-foreground truncate">
                      {c.email || "—"}{c.phone ? ` • ${c.phone}` : ""}
                    </span>
                  </div>
                </div>
              )
            })()}

            {selectedTemplate && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="text-xs">
                  <span className="font-semibold text-foreground">{selectedTemplate.label}</span>
                  <span className="text-muted-foreground"> — {selectedTemplate.description}</span>
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-4 mt-2 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground flex-1">
            {!contactId
              ? "No contact selected"
              : !templateType
              ? "Select a template to continue"
              : hasUnfilledRequired
              ? "Fill required fields to continue"
              : `Ready to issue ${selectedTemplate?.label} to ${contactLabel}`}
          </p>
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Button variant="outline" onClick={handleClose} disabled={issueDirect.isPending}>Cancel</Button>
            <Button disabled={!canIssue} onClick={handleIssue} className="min-w-[160px]">
              {issueDirect.isPending
                ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Issuing...</>
                : <><Award className="mr-2 h-4 w-4" />Issue Certificate</>}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
