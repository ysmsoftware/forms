"use client"

import { useCallback, useMemo, useRef } from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
    PATTERN_OPTIONS,
    type PatternOptionKey,
    type PatternBuilderState,
    buildPattern,
    parsePattern,
} from "@/lib/pattern-builder"

interface PatternBuilderProps {
    value?: string
    onChange: (pattern: string | undefined) => void
    disabled?: boolean
}

export function PatternBuilder({ value, onChange, disabled }: PatternBuilderProps) {
    // ── Derive state directly from the value prop — no internal useState. ──
    // This eliminates the useEffect sync issue entirely. The component is now
    // fully controlled: the parent owns the pattern string, we derive UI state
    // from it on every render. No stale state, no double-update lag.
    const state: PatternBuilderState = useMemo(
        () => (value ? parsePattern(value) : { selectedOptions: [] }),
        [value]
    )

    // Ref to prevent the double-fire from div onClick + Checkbox onCheckedChange
    // firing in the same synthetic event cycle.
    const lastToggledRef = useRef<{ key: PatternOptionKey; time: number } | null>(null)

    const toggleOption = useCallback((key: PatternOptionKey) => {
        // Deduplicate: if the same key was toggled within the last 50ms, ignore
        const now = Date.now()
        if (
            lastToggledRef.current &&
            lastToggledRef.current.key === key &&
            now - lastToggledRef.current.time < 50
        ) {
            return
        }
        lastToggledRef.current = { key, time: now }

        const isSelected = state.selectedOptions.includes(key)
        const option = PATTERN_OPTIONS.find(o => o.key === key)!

        let next: PatternOptionKey[]

        if (isSelected) {
            next = state.selectedOptions.filter(k => k !== key)
        } else {
            if (option.group) {
                // Deselect all other options in the same group
                next = state.selectedOptions.filter(k => {
                    const o = PATTERN_OPTIONS.find(x => x.key === k)!
                    return o.group !== option.group
                })
            } else {
                next = [...state.selectedOptions]
            }
            next = [...next, key]
        }

        // Auto-clear case modifiers if no letter-containing chars group remains
        const hasLetters = next.some(k =>
            ["lettersOnly", "lettersAndNumbers", "noSpecialChars"].includes(k)
        )
        if (!hasLetters) {
            next = next.filter(k => k !== "uppercaseOnly" && k !== "lowercaseOnly")
        }

        onChange(buildPattern({ selectedOptions: next }))
    }, [state.selectedOptions, onChange])

    const handleClearAll = useCallback(() => {
        onChange(undefined)
    }, [onChange])

    const computed = buildPattern(state)

    const charOptions = PATTERN_OPTIONS.filter(o => o.group === "chars")
    const caseOptions = PATTERN_OPTIONS.filter(o => o.group === "case")
    const formatOptions = PATTERN_OPTIONS.filter(o => o.group === "format")
    const standaloneOptions = PATTERN_OPTIONS.filter(o => !o.group)

    const hasLettersSelected = state.selectedOptions.some(k =>
        ["lettersOnly", "lettersAndNumbers", "noSpecialChars"].includes(k)
    )
    const hasFormatSelected = state.selectedOptions.some(k =>
        ["url", "phoneNumber"].includes(k)
    )

    return (
        <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Pattern Rules
            </Label>

            {/* Character type group */}
            <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Character type</p>
                {charOptions.map(opt => (
                    <OptionRow
                        key={opt.key}
                        opt={opt}
                        checked={state.selectedOptions.includes(opt.key)}
                        disabled={disabled || hasFormatSelected}
                        onToggle={toggleOption}
                    />
                ))}
            </div>

            {/* Case group — only shown when a letters-containing option is selected */}
            {hasLettersSelected && !hasFormatSelected && (
                <div className="space-y-1.5 pl-3 border-l-2 border-muted">
                    <p className="text-xs text-muted-foreground font-medium">Case restriction (optional)</p>
                    {caseOptions.map(opt => (
                        <OptionRow
                            key={opt.key}
                            opt={opt}
                            checked={state.selectedOptions.includes(opt.key)}
                            disabled={disabled}
                            onToggle={toggleOption}
                        />
                    ))}
                </div>
            )}

            {/* Standalone toggles */}
            {!hasFormatSelected && (
                <div className="space-y-1.5">
                    {standaloneOptions.map(opt => (
                        <OptionRow
                            key={opt.key}
                            opt={opt}
                            checked={state.selectedOptions.includes(opt.key)}
                            disabled={disabled}
                            onToggle={toggleOption}
                        />
                    ))}
                </div>
            )}

            {/* Format presets */}
            <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Format presets</p>
                {formatOptions.map(opt => (
                    <OptionRow
                        key={opt.key}
                        opt={opt}
                        checked={state.selectedOptions.includes(opt.key)}
                        disabled={disabled}
                        onToggle={toggleOption}
                    />
                ))}
            </div>

            {/* Computed pattern preview */}
            {computed && (
                <div className="mt-2 flex items-start gap-2 rounded-md border bg-muted/40 px-3 py-2">
                    <span className="text-[10px] text-muted-foreground shrink-0 pt-0.5 font-medium uppercase tracking-wide">
                        Regex
                    </span>
                    <code className="text-xs font-mono text-foreground break-all flex-1">
                        {computed}
                    </code>
                    <Badge variant="secondary" className="text-[10px] shrink-0">Auto</Badge>
                </div>
            )}

            {/* Clear all */}
            {state.selectedOptions.length > 0 && !disabled && (
                <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                    onClick={handleClearAll}
                >
                    Clear all rules
                </button>
            )}
        </div>
    )
}

// ─── OptionRow ────────────────────────────────────────────────────────────
// CRITICAL: The Checkbox's onCheckedChange and the wrapping div's onClick
// must NOT both call onToggle — that causes double-fire = instant deselect.
// Solution: div handles the click, Checkbox is purely visual (no handler).
// The Checkbox's checked prop drives the visual state; the div click drives
// the logic. pointer-events-none on the Checkbox prevents it from intercepting
// the click and re-firing the event.

function OptionRow({
    opt,
    checked,
    disabled,
    onToggle,
}: {
    opt: typeof PATTERN_OPTIONS[number]
    checked: boolean
    disabled?: boolean
    onToggle: (key: PatternOptionKey) => void
}) {
    return (
        <div
            role="checkbox"
            aria-checked={checked}
            aria-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            className={cn(
                "flex items-start gap-2.5 rounded-md px-2 py-1.5 cursor-pointer select-none transition-colors",
                checked ? "bg-primary/10 border border-primary/20" : "hover:bg-accent/50",
                disabled && "opacity-50 cursor-not-allowed"
            )}
            onClick={() => {
                if (!disabled) onToggle(opt.key)
            }}
            onKeyDown={(e) => {
                if (!disabled && (e.key === " " || e.key === "Enter")) {
                    e.preventDefault()
                    onToggle(opt.key)
                }
            }}
        >
            {/* pointer-events-none: the Checkbox is visual only.
                All interaction is handled by the parent div.
                This prevents the double-fire that caused the sluggish behaviour. */}
            <Checkbox
                id={`pattern-${opt.key}`}
                checked={checked}
                disabled={disabled}
                className="mt-0.5 shrink-0 pointer-events-none"
                // No onCheckedChange — intentionally omitted
                // The div onClick above is the single source of truth for interaction
            />
            <div className="flex flex-col min-w-0">
                <Label
                    htmlFor={`pattern-${opt.key}`}
                    className="text-sm font-medium cursor-pointer leading-tight pointer-events-none"
                >
                    {opt.label}
                </Label>
                <span className="text-xs text-muted-foreground leading-tight">
                    {opt.description}
                </span>
            </div>
        </div>
    )
}
