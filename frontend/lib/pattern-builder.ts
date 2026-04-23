// ─── Pattern option keys ──────────────────────────────────────────────────

export type PatternOptionKey =
    | "lettersOnly"
    | "numbersOnly"
    | "lettersAndNumbers"
    | "uppercaseOnly"
    | "lowercaseOnly"
    | "noSpaces"
    | "noSpecialChars"
    | "allowSpaces"
    | "phoneNumber"
    | "url"
    | "custom"

// ─── Human-readable option definitions ───────────────────────────────────

export interface PatternOption {
    key: PatternOptionKey
    label: string
    description: string
    // These options are mutually exclusive — only one from each group can be active
    group?: "chars" | "case" | "format"
}

export const PATTERN_OPTIONS: PatternOption[] = [
    // chars group — what characters are allowed
    {
        key: "lettersOnly",
        label: "Letters only",
        description: "Only A–Z, a–z and spaces, no numbers or symbols",
        group: "chars",
    },
    {
        key: "numbersOnly",
        label: "Numbers only",
        description: "Only digits 0–9",
        group: "chars",
    },
    {
        key: "lettersAndNumbers",
        label: "Letters and numbers",
        description: "A–Z, a–z, and 0–9 only — no symbols",
        group: "chars",
    },
    {
        key: "noSpecialChars",
        label: "No special characters",
        description: "Allows letters, numbers, spaces — blocks !@#$% etc.",
        group: "chars",
    },
    // case group — case restrictions (only valid when letters are allowed)
    {
        key: "uppercaseOnly",
        label: "Uppercase only",
        description: "All letters must be uppercase (A–Z)",
        group: "case",
    },
    {
        key: "lowercaseOnly",
        label: "Lowercase only",
        description: "All letters must be lowercase (a–z)",
        group: "case",
    },
    // standalone toggles — no group, can combine freely
    {
        key: "noSpaces",
        label: "No spaces allowed",
        description: "Input cannot contain any space characters",
    },
    // format presets — mutually exclusive full-pattern overrides
    {
        key: "phoneNumber",
        label: "Phone number format",
        description: "10-digit number (e.g. 9876543210)",
        group: "format",
    },
    {
        key: "url",
        label: "URL format",
        description: "Must be a valid URL starting with http:// or https://",
        group: "format",
    },
]

// ─── State type stored in LocalField ─────────────────────────────────────

export interface PatternBuilderState {
    selectedOptions: PatternOptionKey[]
    // custom is a special case — when selected, customValue holds the raw regex
    customValue?: string
}

// ─── Compiler: state → regex string ──────────────────────────────────────

export function buildPattern(state: PatternBuilderState): string | undefined {
    if (!state.selectedOptions.length) return undefined

    const opts = state.selectedOptions

    // Format presets override everything — they are complete standalone patterns
    if (opts.includes("url")) {
        return "^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$"
    }
    if (opts.includes("phoneNumber")) {
        return "^\\d{10}$"
    }

    // Build character class
    let charClass = ""

    if (opts.includes("numbersOnly")) {
        charClass = "0-9"
    } else if (opts.includes("lettersOnly")) {
        if (opts.includes("uppercaseOnly")) charClass = "A-Z"
        else if (opts.includes("lowercaseOnly")) charClass = "a-z"
        else charClass = "A-Za-z"
        // Add space by default for letters only, unless noSpaces is active
        if (!opts.includes("noSpaces")) charClass += " "
    } else if (opts.includes("lettersAndNumbers")) {
        if (opts.includes("uppercaseOnly")) charClass = "A-Z0-9"
        else if (opts.includes("lowercaseOnly")) charClass = "a-z0-9"
        else charClass = "A-Za-z0-9"
        // Add space by default for letters and numbers, unless noSpaces is active
        if (!opts.includes("noSpaces")) charClass += " "
    } else if (opts.includes("noSpecialChars")) {
        charClass = "A-Za-z0-9"
        if (!opts.includes("noSpaces")) charClass += " "
    }

    // Handle standalone noSpaces if no base class is selected
    if (!charClass && opts.includes("noSpaces")) {
        return "^\\S+$"
    }

    if (!charClass) return undefined

    return `^[${charClass}]+$`
}

// ─── Reverse: existing pattern string → best-guess PatternBuilderState ───
// Used when loading a saved field that already has a pattern set

export function parsePattern(pattern: string): PatternBuilderState {
    if (!pattern) return { selectedOptions: [] }

    // Exact matches for known presets
    if (pattern === "^https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_+.~#?&/=]*)$")
        return { selectedOptions: ["url"] }
    if (pattern === "^\\d{10}$")
        return { selectedOptions: ["phoneNumber"] }
    if (pattern === "^\\S+$")
        return { selectedOptions: ["noSpaces"] }

    // Letters Only
    if (pattern === "^[A-Za-z ]+$")
        return { selectedOptions: ["lettersOnly"] }
    if (pattern === "^[A-Za-z]+$")
        return { selectedOptions: ["lettersOnly", "noSpaces"] }
    if (pattern === "^[A-Z ]+$")
        return { selectedOptions: ["lettersOnly", "uppercaseOnly"] }
    if (pattern === "^[A-Z]+$")
        return { selectedOptions: ["lettersOnly", "uppercaseOnly", "noSpaces"] }
    if (pattern === "^[a-z ]+$")
        return { selectedOptions: ["lettersOnly", "lowercaseOnly"] }
    if (pattern === "^[a-z]+$")
        return { selectedOptions: ["lettersOnly", "lowercaseOnly", "noSpaces"] }

    // Numbers Only
    if (pattern === "^[0-9]+$")
        return { selectedOptions: ["numbersOnly"] }

    // Letters and Numbers
    if (pattern === "^[A-Za-z0-9 ]+$")
        return { selectedOptions: ["lettersAndNumbers"] }
    if (pattern === "^[A-Za-z0-9]+$")
        return { selectedOptions: ["lettersAndNumbers", "noSpaces"] }
    if (pattern === "^[A-Z0-9 ]+$")
        return { selectedOptions: ["lettersAndNumbers", "uppercaseOnly"] }
    if (pattern === "^[A-Z0-9]+$")
        return { selectedOptions: ["lettersAndNumbers", "uppercaseOnly", "noSpaces"] }
    if (pattern === "^[a-z0-9 ]+$")
        return { selectedOptions: ["lettersAndNumbers", "lowercaseOnly"] }
    if (pattern === "^[a-z0-9]+$")
        return { selectedOptions: ["lettersAndNumbers", "lowercaseOnly", "noSpaces"] }

    // No Special Chars
    if (pattern === "^[A-Za-z0-9 ]+$")
        return { selectedOptions: ["noSpecialChars"] }
    if (pattern === "^[A-Za-z0-9]+$")
        return { selectedOptions: ["noSpecialChars", "noSpaces"] }

    // Unknown pattern — treat as custom (not used in current UI but future-proof)
    return { selectedOptions: [] }
}
