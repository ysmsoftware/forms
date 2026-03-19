"use client"

import { useState } from "react"
import { format } from "date-fns"
import type { DailyAnalyticsPoint } from "@/lib/types/api"

// ─── Shared helpers ───────────────────────────────────────────────────────────

function clamp(v: number, lo: number, hi: number) {
    return Math.max(lo, Math.min(hi, v))
}

// ─── Tooltip state hook ───────────────────────────────────────────────────────

interface TooltipState {
    x: number
    y: number
    lines: { label: string; value: string | number; color: string }[]
    title?: string
}

// ── Submissions Over Time (Line Chart) ───────────────────────────────────────

interface SubmissionsChartProps {
    timeline: DailyAnalyticsPoint[]
}

export function SubmissionsChart({ timeline }: SubmissionsChartProps) {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null)
    const W = 600, H = 260, PL = 40, PR = 16, PT = 12, PB = 36
    const iW = W - PL - PR
    const iH = H - PT - PB

    if (!timeline.length) return null

    const maxVal = Math.max(...timeline.flatMap(d => [d.submitted, d.visits ?? 0]), 1)
    const xStep = iW / Math.max(timeline.length - 1, 1)

    const toX = (i: number) => PL + i * xStep
    const toY = (v: number) => PT + iH - (v / maxVal) * iH

    const linePath = (key: "submitted" | "visits") =>
        timeline.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d[key] ?? 0).toFixed(1)}`).join(" ")

    // Y axis ticks
    const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i))

    // X axis ticks (show ~6 evenly)
    const xTickIdxs: number[] = []
    const step = Math.max(1, Math.floor(timeline.length / 6))
    for (let i = 0; i < timeline.length; i += step) xTickIdxs.push(i)
    if (xTickIdxs[xTickIdxs.length - 1] !== timeline.length - 1) xTickIdxs.push(timeline.length - 1)

    return (
        <div className="relative w-full" style={{ height: H }}>
            {/* Legend */}
            <div className="absolute top-0 right-4 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-[#8884d8]" /> Submissions</span>
                <span className="flex items-center gap-1"><span className="inline-block w-4 h-0.5 bg-[#82ca9d] border-dashed border-b border-[#82ca9d]" /> Visits</span>
            </div>
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full h-full"
                onMouseLeave={() => setTooltip(null)}
            >
                {/* Grid lines */}
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke="currentColor" strokeOpacity={0.08} />
                        <text x={PL - 4} y={toY(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor" opacity={0.5}>{v}</text>
                    </g>
                ))}
                {/* X axis ticks */}
                {xTickIdxs.map(i => (
                    <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.5}>
                        {format(new Date(timeline[i].date + "T00:00:00"), "MMM dd")}
                    </text>
                ))}
                {/* Lines */}
                <path d={linePath("visits")} fill="none" stroke="#82ca9d" strokeWidth={1.5} strokeDasharray="4 2" />
                <path d={linePath("submitted")} fill="none" stroke="#8884d8" strokeWidth={2} />
                {/* Hover areas */}
                {timeline.map((d, i) => (
                    <rect
                        key={i}
                        x={toX(i) - xStep / 2}
                        y={PT}
                        width={xStep}
                        height={iH}
                        fill="transparent"
                        onMouseEnter={(e) => {
                            const svgRect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect()
                            setTooltip({
                                x: ((toX(i) - PL) / iW) * 100,
                                y: 0,
                                title: format(new Date(d.date + "T00:00:00"), "MMM dd, yyyy"),
                                lines: [
                                    { label: "Submissions", value: d.submitted, color: "#8884d8" },
                                    { label: "Visits", value: d.visits ?? 0, color: "#82ca9d" },
                                ],
                            })
                        }}
                    />
                ))}
                {/* Dots on hover */}
                {tooltip && (() => {
                    const i = timeline.findIndex(d =>
                        format(new Date(d.date + "T00:00:00"), "MMM dd, yyyy") === tooltip.title
                    )
                    if (i < 0) return null
                    const d = timeline[i]
                    return (
                        <g>
                            <circle cx={toX(i)} cy={toY(d.submitted)} r={4} fill="#8884d8" />
                            <circle cx={toX(i)} cy={toY(d.visits ?? 0)} r={4} fill="#82ca9d" />
                            <line x1={toX(i)} y1={PT} x2={toX(i)} y2={PT + iH} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="3 2" />
                        </g>
                    )
                })()}
            </svg>
            {tooltip && (
                <ChartTooltip tooltip={tooltip} />
            )}
        </div>
    )
}

// ── Conversion Funnel (Pie Chart) ─────────────────────────────────────────────

interface FunnelEntry {
    name: string
    value: number
    color: string
}

interface ConversionFunnelChartProps {
    data: FunnelEntry[]
}

export function ConversionFunnelChart({ data }: ConversionFunnelChartProps) {
    return <PieChartSVG data={data} outerRadius={100} height={300} />
}

export function EventFunnelChart({ data }: { data: FunnelEntry[] }) {
    return <PieChartSVG data={data} outerRadius={80} height={300} />
}

function PieChartSVG({ data, outerRadius, height }: { data: FunnelEntry[]; outerRadius: number; height: number }) {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null)
    const total = data.reduce((s, d) => s + d.value, 0)
    const W = 400

    if (total === 0) {
        return (
            <div className="flex items-center justify-center text-muted-foreground text-sm" style={{ height }}>
                No data
            </div>
        )
    }

    const cx = W / 2, cy = height / 2
    let startAngle = -Math.PI / 2

    const slices = data.map(d => {
        const angle = (d.value / total) * 2 * Math.PI
        const endAngle = startAngle + angle
        const x1 = cx + outerRadius * Math.cos(startAngle)
        const y1 = cy + outerRadius * Math.sin(startAngle)
        const x2 = cx + outerRadius * Math.cos(endAngle)
        const y2 = cy + outerRadius * Math.sin(endAngle)
        const large = angle > Math.PI ? 1 : 0
        const midAngle = startAngle + angle / 2
        const lx = cx + (outerRadius + 20) * Math.cos(midAngle)
        const ly = cy + (outerRadius + 20) * Math.sin(midAngle)
        const path = `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${outerRadius},${outerRadius} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`
        const result = { ...d, path, lx, ly, midAngle, percent: d.value / total }
        startAngle = endAngle
        return result
    })

    return (
        <div className="relative w-full" style={{ height }}>
            <svg viewBox={`0 0 ${W} ${height}`} className="w-full h-full" onMouseLeave={() => setTooltip(null)}>
                {slices.map((s, i) => (
                    <g key={i}>
                        <path
                            d={s.path}
                            fill={s.color}
                            stroke="white"
                            strokeWidth={2}
                            onMouseEnter={() => setTooltip({
                                x: ((s.lx / W) * 100),
                                y: 0,
                                lines: [{ label: s.name, value: `${s.value} (${(s.percent * 100).toFixed(0)}%)`, color: s.color }],
                            })}
                        />
                        {s.percent > 0.05 && (
                            <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle" fontSize={11} fill="currentColor" opacity={0.7}>
                                {s.name}: {s.value}
                            </text>
                        )}
                    </g>
                ))}
            </svg>
            {tooltip && <ChartTooltip tooltip={tooltip} />}
        </div>
    )
}

// ── Top Events (Horizontal Bar Chart) ────────────────────────────────────────

interface EventSubmission {
    name: string
    submissions: number
}

interface TopEventsChartProps {
    data: EventSubmission[]
}

export function TopEventsChart({ data }: TopEventsChartProps) {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null)
    const rowH = 44, PL = 168, PR = 24, PT = 8, PB = 24
    const H = data.length * rowH + PT + PB
    const W = 600
    const iW = W - PL - PR
    const maxVal = Math.max(...data.map(d => d.submissions), 1)
    const xTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i))

    return (
        <div className="relative w-full" style={{ height: H }}>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full" onMouseLeave={() => setTooltip(null)}>
                {/* Grid lines */}
                {xTicks.map(v => {
                    const x = PL + (v / maxVal) * iW
                    return (
                        <g key={v}>
                            <line x1={x} y1={PT} x2={x} y2={H - PB} stroke="currentColor" strokeOpacity={0.08} />
                            <text x={x} y={H - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.5}>{v}</text>
                        </g>
                    )
                })}
                {data.map((d, i) => {
                    const y = PT + i * rowH
                    const barW = (d.submissions / maxVal) * iW
                    return (
                        <g key={i}
                            onMouseEnter={() => setTooltip({
                                x: clamp(((PL + barW) / W) * 100, 10, 80),
                                y: ((y + rowH / 2) / H) * 100,
                                lines: [{ label: d.name, value: d.submissions, color: "#8884d8" }],
                            })}
                            onMouseLeave={() => setTooltip(null)}
                        >
                            <text x={PL - 8} y={y + rowH / 2} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="currentColor" opacity={0.7}>
                                {d.name.length > 22 ? d.name.slice(0, 20) + "…" : d.name}
                            </text>
                            <rect x={PL} y={y + 8} width={Math.max(barW, 2)} height={rowH - 18} fill="#8884d8" rx={3} />
                            {d.submissions > 0 && (
                                <text x={PL + barW + 4} y={y + rowH / 2} dominantBaseline="middle" fontSize={11} fill="currentColor" opacity={0.6}>{d.submissions}</text>
                            )}
                        </g>
                    )
                })}
            </svg>
            {tooltip && <ChartTooltip tooltip={tooltip} />}
        </div>
    )
}

// ── Event Analytics: Daily Interactions Bar Chart ─────────────────────────────

interface DailyChartEntry {
    date: string
    visitors: number
    started: number
    submitted: number
}

export function DailyBarChart({ data }: { data: DailyChartEntry[] }) {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null)
    const W = 600, H = 280, PL = 36, PR = 12, PT = 12, PB = 40
    const iW = W - PL - PR
    const iH = H - PT - PB

    if (!data.length) return null

    const maxVal = Math.max(...data.flatMap(d => [d.visitors, d.started, d.submitted]), 1)
    const barGroupW = iW / data.length
    const bW = Math.max(2, (barGroupW - 6) / 3)
    const series = [
        { key: "visitors" as const, color: "#8884d8", label: "Visitors" },
        { key: "started" as const, color: "#82ca9d", label: "Started" },
        { key: "submitted" as const, color: "#ffc658", label: "Submitted" },
    ]
    const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i))

    return (
        <div className="relative w-full" style={{ height: H + 24 }}>
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1 pl-10">
                {series.map(s => (
                    <span key={s.key} className="flex items-center gap-1">
                        <span className="inline-block w-3 h-3 rounded-sm" style={{ background: s.color }} />
                        {s.label}
                    </span>
                ))}
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }} onMouseLeave={() => setTooltip(null)}>
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={PL} y1={PT + iH - (v / maxVal) * iH} x2={W - PR} y2={PT + iH - (v / maxVal) * iH} stroke="currentColor" strokeOpacity={0.08} />
                        <text x={PL - 4} y={PT + iH - (v / maxVal) * iH} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor" opacity={0.5}>{v}</text>
                    </g>
                ))}
                {data.map((d, i) => {
                    const gx = PL + i * barGroupW + 3
                    return (
                        <g key={i} onMouseEnter={() => setTooltip({
                            x: clamp(((gx + barGroupW / 2) / W) * 100, 10, 85),
                            y: 0,
                            title: d.date,
                            lines: series.map(s => ({ label: s.label, value: d[s.key], color: s.color })),
                        })}>
                            {series.map((s, si) => {
                                const bh = (d[s.key] / maxVal) * iH
                                return (
                                    <rect key={si}
                                        x={gx + si * (bW + 1)}
                                        y={PT + iH - bh}
                                        width={bW}
                                        height={Math.max(bh, 1)}
                                        fill={s.color}
                                        rx={2}
                                    />
                                )
                            })}
                            <text x={gx + barGroupW / 2 - 3} y={H - 8} textAnchor="middle" fontSize={9} fill="currentColor" opacity={0.5}>{d.date}</text>
                        </g>
                    )
                })}
            </svg>
            {tooltip && <ChartTooltip tooltip={tooltip} />}
        </div>
    )
}

// ── Event Analytics: Trend Line Chart ────────────────────────────────────────

export function TrendLineChart({ data }: { data: DailyChartEntry[] }) {
    const [tooltip, setTooltip] = useState<TooltipState | null>(null)
    const W = 600, H = 360, PL = 40, PR = 16, PT = 12, PB = 36
    const iW = W - PL - PR
    const iH = H - PT - PB

    if (!data.length) return null

    const maxVal = Math.max(...data.flatMap(d => [d.visitors, d.started, d.submitted]), 1)
    const xStep = iW / Math.max(data.length - 1, 1)
    const toX = (i: number) => PL + i * xStep
    const toY = (v: number) => PT + iH - (v / maxVal) * iH

    const series = [
        { key: "visitors" as const, color: "#8884d8", label: "Visitors" },
        { key: "started" as const, color: "#82ca9d", label: "Started" },
        { key: "submitted" as const, color: "#ffc658", label: "Submitted" },
    ]

    const linePath = (key: "visitors" | "started" | "submitted") =>
        data.map((d, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(d[key]).toFixed(1)}`).join(" ")

    const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxVal / 4) * i))
    const xTickIdxs: number[] = []
    const step = Math.max(1, Math.floor(data.length / 6))
    for (let i = 0; i < data.length; i += step) xTickIdxs.push(i)
    if (xTickIdxs[xTickIdxs.length - 1] !== data.length - 1) xTickIdxs.push(data.length - 1)

    const [hoverIdx, setHoverIdx] = useState<number | null>(null)

    return (
        <div className="relative w-full" style={{ height: H + 24 }}>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1 pl-10">
                {series.map(s => (
                    <span key={s.key} className="flex items-center gap-1">
                        <span className="inline-block w-4 h-0.5" style={{ background: s.color }} />
                        {s.label}
                    </span>
                ))}
            </div>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}
                onMouseLeave={() => { setTooltip(null); setHoverIdx(null) }}>
                {yTicks.map(v => (
                    <g key={v}>
                        <line x1={PL} y1={toY(v)} x2={W - PR} y2={toY(v)} stroke="currentColor" strokeOpacity={0.08} />
                        <text x={PL - 4} y={toY(v)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="currentColor" opacity={0.5}>{v}</text>
                    </g>
                ))}
                {xTickIdxs.map(i => (
                    <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="currentColor" opacity={0.5}>{data[i].date}</text>
                ))}
                {series.map(s => (
                    <path key={s.key} d={linePath(s.key)} fill="none" stroke={s.color} strokeWidth={2} />
                ))}
                {hoverIdx !== null && (
                    <g>
                        <line x1={toX(hoverIdx)} y1={PT} x2={toX(hoverIdx)} y2={PT + iH} stroke="currentColor" strokeOpacity={0.2} strokeDasharray="3 2" />
                        {series.map(s => (
                            <circle key={s.key} cx={toX(hoverIdx)} cy={toY(data[hoverIdx][s.key])} r={4} fill={s.color} />
                        ))}
                    </g>
                )}
                {data.map((d, i) => (
                    <rect key={i}
                        x={toX(i) - xStep / 2}
                        y={PT}
                        width={xStep}
                        height={iH}
                        fill="transparent"
                        onMouseEnter={() => {
                            setHoverIdx(i)
                            setTooltip({
                                x: clamp((toX(i) / W) * 100, 10, 80),
                                y: 0,
                                title: d.date,
                                lines: series.map(s => ({ label: s.label, value: d[s.key], color: s.color })),
                            })
                        }}
                    />
                ))}
            </svg>
            {tooltip && <ChartTooltip tooltip={tooltip} />}
        </div>
    )
}

// ── Messages: Delivery Donut Chart ────────────────────────────────────────────

interface DonutEntry {
    name: string
    value: number
}

export function DeliveryDonut({ data }: { data: DonutEntry[] }) {
    const COLORS = ["#22c55e", "#ef4444", "#eab308"]
    const total = data.reduce((s, d) => s + d.value, 0)
    const size = 48
    const cx = size / 2, cy = size / 2
    const outerR = 22, innerR = 14

    if (total === 0) {
        return (
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
                <circle cx={cx} cy={cy} r={outerR} fill="none" stroke="currentColor" strokeOpacity={0.1} strokeWidth={outerR - innerR} />
            </svg>
        )
    }

    let startAngle = -Math.PI / 2
    const slices = data.map((d, i) => {
        const angle = (d.value / total) * 2 * Math.PI
        const endAngle = startAngle + angle
        const x1 = cx + outerR * Math.cos(startAngle)
        const y1 = cy + outerR * Math.sin(startAngle)
        const x2 = cx + outerR * Math.cos(endAngle)
        const y2 = cy + outerR * Math.sin(endAngle)
        const xi1 = cx + innerR * Math.cos(endAngle)
        const yi1 = cy + innerR * Math.sin(endAngle)
        const xi2 = cx + innerR * Math.cos(startAngle)
        const yi2 = cy + innerR * Math.sin(startAngle)
        const large = angle > Math.PI ? 1 : 0
        const path = `M${x1.toFixed(2)},${y1.toFixed(2)} A${outerR},${outerR} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} L${xi1.toFixed(2)},${yi1.toFixed(2)} A${innerR},${innerR} 0 ${large} 0 ${xi2.toFixed(2)},${yi2.toFixed(2)} Z`
        startAngle = endAngle
        return { ...d, path, color: COLORS[i % COLORS.length] }
    })

    return (
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
            {slices.map((s, i) => (
                <path key={i} d={s.path} fill={s.color} />
            ))}
        </svg>
    )
}

// ── Shared tooltip component ──────────────────────────────────────────────────

function ChartTooltip({ tooltip }: { tooltip: TooltipState }) {
    return (
        <div
            className="pointer-events-none absolute z-10 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl"
            style={{ left: `${clamp(tooltip.x, 5, 75)}%`, top: "10px" }}
        >
            {tooltip.title && <div className="font-medium mb-1">{tooltip.title}</div>}
            {tooltip.lines.map((l, i) => (
                <div key={i} className="flex items-center gap-1.5">
                    <span className="inline-block w-2 h-2 rounded-sm flex-shrink-0" style={{ background: l.color }} />
                    <span className="text-muted-foreground">{l.label}:</span>
                    <span className="font-mono font-medium">{l.value}</span>
                </div>
            ))}
        </div>
    )
}
