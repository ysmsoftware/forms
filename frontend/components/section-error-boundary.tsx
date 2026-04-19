"use client"

import { Component, type ReactNode, type ErrorInfo } from "react"
import { AlertCircle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Props {
    children: ReactNode
    title?: string
    onReset?: () => void
}

interface State {
    hasError: boolean
    error: Error | null
}

export class SectionErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error("[SectionErrorBoundary caught]", error, info.componentStack)
    }

    render() {
        if (this.state.hasError) {
            return (
                <Alert variant="destructive" className="bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                        <div className="font-medium mb-2">{this.props.title || "Error"}</div>
                        <div className="text-sm text-muted-foreground mb-3">
                            {this.state.error?.message || "An error occurred loading this section."}
                        </div>
                        {this.props.onReset && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    this.setState({ hasError: false, error: null })
                                    this.props.onReset?.()
                                }}
                                className="gap-2"
                            >
                                <RefreshCcw className="h-3 w-3" />
                                Retry
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            )
        }

        return this.props.children
    }
}
