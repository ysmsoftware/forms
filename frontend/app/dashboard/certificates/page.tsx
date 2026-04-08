"use client"

import React, { useState } from "react"
import { Award } from "lucide-react"
import { GlobalIssueCertificateDialog } from "@/components/global-issue-certificate-dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EventCertificatesTab } from "./_components/event-certificates-tab"
import { AllCertificatesTab } from "./_components/all-certificates-tab"

export default function CertificatesPage() {
    const [refreshKey, setRefreshKey] = useState(0)

    return (
        <div className="space-y-6">

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Certificates</h1>
                        <p className="text-sm text-muted-foreground">
                            Issue and manage certificates for event participants
                        </p>
                    </div>
                </div>

                <GlobalIssueCertificateDialog
                    trigger={
                        <Button size="sm" variant="outline">
                            <Award className="h-4 w-4 mr-2" />
                            Issue Manually
                        </Button>
                    }
                    onSuccess={() => setRefreshKey(k => k + 1)}
                />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="by-event">
                <TabsList>
                    <TabsTrigger value="by-event">By Event</TabsTrigger>
                    <TabsTrigger value="all">All Certificates</TabsTrigger>
                </TabsList>

                <TabsContent value="by-event" className="mt-4">
                    <EventCertificatesTab />
                </TabsContent>

                <TabsContent value="all" className="mt-4">
                    <AllCertificatesTab key={refreshKey} />
                </TabsContent>
            </Tabs>
        </div>
    )
}
