"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { ontwikkelAxes, vaardigheidAxes, type RadarAxis } from "@/lib/profiles/axes";
import { computeProfiles, type ProfileMoment } from "@/lib/profiles/compute";

type UserInfo = {
  id: string;
  voornaam: string;
  tussenvoegsel: string | null;
  achternaam: string;
  email?: string | null;
};

type ActiveEnrollment = {
  id: string;
  cohort: {
    id: string;
    naam: string;
    uitvoeringId: string;
    traject: string | null;
  } | null;
};

type Credential = {
  exam1Completed: boolean;
  exam2Completed: boolean;
  exam3Completed: boolean;

  mbkCompleted: boolean;
  psbkCompleted: boolean;

  leertherapieCount: number;
  intervisieCount: number;
  supervisieCount: number;
  eindsupervisieDone: boolean;
};

type EnrollmentRow = {
  id: string;
  cohort: {
    id: string;
    naam: string;
    uitvoeringId: string;
    traject?: string | null;
  };
};

type ApiPayload = {
  ok: boolean;
  user: UserInfo;
  enrollments: EnrollmentRow[];
  activeEnrollment?: ActiveEnrollment | null;
  maxStage: "BASISJAAR" | "1VO" | "2VO" | "3VO" | null;
  credential: Credential;
  error?: string;
};

type ProfileBundleAssessment = {
  assessmentId: string;
  moment: Exclude<ProfileMoment, "ALL">;
  rubricKey: string;
  scores: Array<{
    id?: string;
    themeId: string;
    questionId: string;
    score: number;
    comment?: string | null;
    updatedAt?: string;
  }>;
  teacherScores: Array<{
    id?: string;
    themeId: string;
    questionId: string;
    correctedScore: number | null;
    feedback?: string | null;
    updatedAt?: string;
  }>;
};

type ProfileBundleResponse = {
  ok: boolean;
  rubricKey?: string | null;
  assessments?: ProfileBundleAssessment[];
  error?: string;
};

type StageKey = "BASISJAAR" | "1VO" | "2VO" | "3VO";

const REQUIRED = {
  leertherapie: 10,
  intervisie: 10,
  supervisie: 12,
};

const STAGE_TARGETS: Record<StageKey, number> = {
  BASISJAAR: 0.25,
  "1VO": 0.4,
  "2VO": 0.7,
  "3VO": 1.0,
};

function stageRank(stage: ApiPayload["maxStage"]) {
  if (stage === "BASISJAAR") return 0;
  if (stage === "1VO") return 1;
  if (stage === "2VO") return 2;
  if (stage === "3VO") return 3;
  return -1;
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}

function pct(v: number) {
  return Math.round(clamp01(v) * 100);
}

function stageTarget(stage: ApiPayload["maxStage"]) {
  if (!stage) return null;
  return STAGE_TARGETS[stage];
}

function Dot({ state }: { state: "done" | "current" | "todo" }) {
  const color = state === "done" ? "#2e7d32" : state === "current" ? "#ef6c00" : "#bbb";
  return (
    <span
      title={state === "done" ? "Afgerond" : state === "current" ? "Huidig" : "Nog niet gestart"}
      style={{
        width: 10,
        height: 10,
        borderRadius: 999,
        display: "inline-block",
        background: color,
      }}
    />
  );
}

function CountChip({ value, required }: { value: number; required: number }) {
  const color = value >= required ? "#2e7d32" : value === 0 ? "#c62828" : "#ef6c00";
  return <span style={{ color }}>{value}/{required}</span>;
}

/* =========================================================
   RADAR / SPIDER CHART
========================================================= */

type RadarSeries = {
  id: string;
  values: Record<string, number>;
  fill: string;
  stroke: string;
  strokeWidth?: number;
  dash?: string;
};

function RadarChart({
  axes,
  series,
  size = 340,
  rings = 5,
  ariaLabel = "Radar",
}: {
  axes: RadarAxis[];
  series: RadarSeries[];
  size?: number;
  rings?: number;
  ariaLabel?: string;
}) {
  const cx = size / 2;
  const cy = size / 2;

  const pad = 54;
  const r = size / 2 - pad;
  const labelR = r + 22;

  const n = axes.length;

  const angleAt = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;

  const point = (i: number, radius: number) => {
    const a = angleAt(i);
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius };
  };

  const safe = (v: unknown) => {
    const num = typeof v === "number" ? v : 0;
    return Math.max(0, Math.min(1, num));
  };

  function smoothClosedPath(points: { x: number; y: number }[], tension = 0.22) {
    const m = points.length;
    if (m < 3) return "";
    const p = (i: number) => points[(i + m) % m];

    const path: string[] = [];
    path.push(`M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`);

    for (let i = 0; i < m; i++) {
      const p0 = p(i - 1);
      const p1 = p(i);
      const p2 = p(i + 1);
      const p3 = p(i + 2);

      const cp1x = p1.x + (p2.x - p0.x) * tension;
      const cp1y = p1.y + (p2.y - p0.y) * tension;
      const cp2x = p2.x - (p3.x - p1.x) * tension;
      const cp2y = p2.y - (p3.y - p1.y) * tension;

      path.push(
        `C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(
          2
        )} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`
      );
    }

    path.push("Z");
    return path.join(" ");
  }

  function wrapLabel(label: string, maxPerLine = 12) {
    if (label.length <= maxPerLine) return [label];
    const parts = label.split(" ");
    const lines: string[] = [];
    let cur = "";
    for (const w of parts) {
      const next = cur ? `${cur} ${w}` : w;
      if (next.length <= maxPerLine) cur = next;
      else {
        if (cur) lines.push(cur);
        cur = w;
        if (lines.length === 1) break;
      }
    }
    if (cur) lines.push(cur);
    if (lines.length > 2) return [label.slice(0, maxPerLine - 1) + "…"];
    return lines;
  }

  const labels = axes.map((ax, i) => {
    const p = point(i, labelR);
    const cos = Math.cos(angleAt(i));
    const anchor = cos < -0.25 ? "end" : cos > 0.25 ? "start" : "middle";
    return { ...p, anchor, label: ax.label, key: ax.key };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={ariaLabel}
      overflow="visible"
      style={{ overflow: "visible" }}
    >
      {Array.from({ length: rings }, (_, k) => {
        const rr = (r * (k + 1)) / rings;
        return <circle key={k} cx={cx} cy={cy} r={rr} fill="none" stroke="#eee" strokeWidth={1} />;
      })}

      {axes.map((_, i) => {
        const p = point(i, r);
        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#eee" strokeWidth={1} />;
      })}

      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ddd" strokeWidth={1.2} />

      {series.map((s) => {
        const pts = axes.map((_, i) => point(i, r * safe(s.values[axes[i].key])));
        const d = smoothClosedPath(pts, 0.22);
        return (
          <path
            key={s.id}
            d={d}
            fill={s.fill}
            stroke={s.stroke}
            strokeWidth={s.strokeWidth ?? 2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={s.dash}
          />
        );
      })}

      {labels.map((lp) => {
        const lines = wrapLabel(lp.label, 12);
        const lineHeight = 12;
        const dyStart = lines.length === 2 ? -2 : 4;

        return (
          <text key={lp.key} x={lp.x} y={lp.y} textAnchor={lp.anchor as any} fontSize={11} fill="#666">
            <title>{lp.label}</title>
            {lines.map((t, idx) => (
              <tspan key={idx} x={lp.x} dy={idx === 0 ? dyStart : lineHeight}>
                {t}
              </tspan>
            ))}
          </text>
        );
      })}
    </svg>
  );
}

function PhaseProgressBar({
  value,
  currentStage,
}: {
  value: number;
  currentStage: ApiPayload["maxStage"];
}) {
  const currentTarget = stageTarget(currentStage);
  const valuePct = pct(value);
  const markerPct = currentTarget == null ? null : pct(currentTarget);

  return (
    <div style={{ position: "relative", height: 10, background: "#eee", borderRadius: 999, overflow: "hidden" }}>
      <div
        style={{
          width: `${valuePct}%`,
          height: 10,
          background: "#111",
        }}
      />
      {markerPct != null ? (
        <div
          title={`Richtpunt ${currentStage}: ${markerPct}%`}
          style={{
            position: "absolute",
            left: `${markerPct}%`,
            top: -2,
            width: 2,
            height: 14,
            background: "#ef6c00",
            transform: "translateX(-1px)",
            borderRadius: 2,
          }}
        />
      ) : null}
    </div>
  );
}

function AxisYearBreakdown({
  currentValue,
  currentStage,
}: {
  currentValue: number;
  currentStage: ApiPayload["maxStage"];
}) {
  const currentRank = stageRank(currentStage);

  const rows: Array<{ key: StageKey; label: string; value: number }> = [
    { key: "BASISJAAR", label: "Basisjaar (referentie)", value: STAGE_TARGETS.BASISJAAR },
    { key: "1VO", label: "1VO (referentie)", value: STAGE_TARGETS["1VO"] },
    { key: "2VO", label: "2VO (latere fase)", value: STAGE_TARGETS["2VO"] },
    { key: "3VO", label: "3VO (eindniveau)", value: STAGE_TARGETS["3VO"] },
  ];

  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        border: "1px solid #eee",
        borderRadius: 10,
        background: "#fafafa",
        display: "grid",
        gap: 8,
      }}
    >
      {rows.map((row) => {
        const rowRank = stageRank(row.key);
        const isCurrent = currentStage === row.key;
        const isPassed = currentRank > rowRank;

        return (
          <div
            key={row.key}
            style={{
              display: "grid",
              gridTemplateColumns: "140px 1fr 56px",
              gap: 10,
              alignItems: "center",
            }}
          >
            <div style={{ fontSize: 12, color: "#111", fontWeight: isCurrent ? 800 : 600 }}>
              {row.label}
            </div>

            <div style={{ height: 8, background: "#eee", borderRadius: 999, overflow: "hidden" }}>
              <div
                style={{
                  width: `${pct(row.value)}%`,
                  height: 8,
                  background: isCurrent ? "#ef6c00" : isPassed ? "#111" : "#bbb",
                }}
              />
            </div>

            <div
              style={{
                fontSize: 12,
                color: isCurrent ? "#ef6c00" : "#666",
                textAlign: "right",
                fontFamily: "monospace",
              }}
            >
              {pct(row.value)}%
            </div>
          </div>
        );
      })}

      <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
        Huidige score: <strong>{pct(currentValue)}%</strong>.
      </div>

      <div
        style={{
          marginTop: 4,
          padding: 8,
          background: "#f6f6f6",
          borderRadius: 8,
          fontSize: 11,
          color: "#555",
          lineHeight: 1.45,
          border: "1px solid #ececec",
        }}
      >
        <strong>Uitleg</strong>
        <br />
        De <strong>zwarte balk</strong> laat je huidige profielscore zien op deze as, berekend uit je ingevulde
        rubricvragen en eventuele gepubliceerde docentcorrecties.
        <br />
        De <strong>oranje markering</strong> laat het richtpunt zien van jouw huidige opleidingsfase.
        <br />
        De regels bij <strong>Basisjaar, 1VO, 2VO en 3VO</strong> zijn referentiepunten binnen de opleiding. Ze laten
        zien waar studenten gemiddeld ongeveer uitkomen in verschillende fasen. Dit zijn dus geen losse cijfers of
        behaalde resultaten van jou.
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  subtitle,
  axes,
  values,
  currentStage,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  axes: RadarAxis[];
  values: Record<string, number>;
  currentStage: ApiPayload["maxStage"];
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} style={{ border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          background: "#f3f4f6",
          borderRadius: 12,
          userSelect: "none",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#111" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#666" }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 12, color: "#666" }}>Toon</div>
      </summary>

      <div style={{ padding: 12, display: "grid", gap: 10 }}>
        {axes.map((a) => {
          const v = clamp01(values[a.key] ?? 0);
          const scorePct = pct(v);
          const marker = stageTarget(currentStage);

          return (
            <details
              key={a.key}
              style={{
                border: "1px solid #eee",
                borderRadius: 10,
                background: "#fff",
              }}
            >
              <summary
                style={{
                  listStyle: "none",
                  cursor: "pointer",
                  padding: "10px 12px",
                  display: "grid",
                  gridTemplateColumns: "1.6fr 2fr 56px",
                  gap: 10,
                  alignItems: "center",
                  userSelect: "none",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 800, color: "#111" }}>{a.label}</div>

                <PhaseProgressBar value={v} currentStage={currentStage} />

                <div
                  style={{
                    fontSize: 12,
                    color: "#666",
                    textAlign: "right",
                    fontFamily: "monospace",
                  }}
                >
                  {scorePct}%
                </div>
              </summary>

              <div style={{ padding: "0 12px 12px 12px" }}>
                {marker != null ? (
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 8 }}>
                    Richtpunt {currentStage}: <strong>{pct(marker)}%</strong>
                  </div>
                ) : null}

                <AxisYearBreakdown currentValue={v} currentStage={currentStage} />
              </div>
            </details>
          );
        })}

        <div style={{ fontSize: 11, color: "#666" }}>
          Dit overzicht is gebaseerd op je ingevulde rubrics. Als een docent een gepubliceerde correctie heeft gegeven,
          telt die mee in je profiel. De referentiebalken geven opleidingsfasen weer en zijn bedoeld als duiding, niet
          als losse cijfers.
        </div>
      </div>
    </details>
  );
}

function PlaceholderProfileCard({
  title,
  subtitle,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} style={{ border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          background: "#f3f4f6",
          borderRadius: 12,
          userSelect: "none",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#111" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#666" }}>{subtitle}</div>
        </div>
        <div style={{ fontSize: 12, color: "#666" }}>Toon</div>
      </summary>

      <div style={{ padding: 12, fontSize: 11, color: "#666" }}>
        Dit profiel volgt later zodra de rubric en de berekeningslogica daarvoor zijn toegevoegd.
      </div>
    </details>
  );
}

function DiagramSection({
  ontwikkel,
  vaardigheid,
  moment,
  setMoment,
  view,
  setView,
  canShowVaardigheid,
  defaultOpen = false,
}: {
  ontwikkel: Record<string, number>;
  vaardigheid: Record<string, number>;
  moment: ProfileMoment;
  setMoment: (value: ProfileMoment) => void;
  view: "ontwikkel" | "vaardigheid" | "overlay" | "beide";
  setView: (value: "ontwikkel" | "vaardigheid" | "overlay" | "beide") => void;
  canShowVaardigheid: boolean;
  defaultOpen?: boolean;
}) {
  const momentOptions: Array<{ value: ProfileMoment; label: string }> = [
    { value: "ALL", label: "Alles" },
    { value: "M1", label: "M1" },
    { value: "M2", label: "M2" },
    { value: "M3", label: "M3" },
  ];

  const allowedViews = canShowVaardigheid
    ? [
        { value: "ontwikkel", label: "Ontwikkelprofiel" },
        { value: "vaardigheid", label: "Vaardigheidsprofiel" },
        { value: "overlay", label: "Overlay" },
        { value: "beide", label: "Beide" },
      ]
    : [{ value: "ontwikkel", label: "Ontwikkelprofiel" }];

  const safeView = allowedViews.some((v) => v.value === view) ? view : "ontwikkel";

  const cardStyle: CSSProperties = {
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 12,
    background: "#fafafa",
  };

  const selectStyle: CSSProperties = {
    border: "1px solid #ddd",
    borderRadius: 10,
    padding: "8px 10px",
    background: "#fff",
    fontSize: 13,
    color: "#111",
  };

  return (
    <details open={defaultOpen} style={{ border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
      <summary
        style={{
          listStyle: "none",
          cursor: "pointer",
          padding: "10px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 12,
          background: "#f3f4f6",
          borderRadius: 12,
          userSelect: "none",
        }}
      >
        <div>
          <div style={{ fontWeight: 900, fontSize: 13, color: "#111" }}>Diagram</div>
          <div style={{ fontSize: 12, color: "#666" }}>Bekijk je profielmetingen per moment</div>
        </div>
        <div style={{ fontSize: 12, color: "#666" }}>Toon</div>
      </summary>

      <div style={{ padding: 12, display: "grid", gap: 12 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ fontSize: 12, color: "#666" }}>
            Kies welke profielweergave je wilt zien en filter op meetmoment.
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Weergave</span>
              <select
                value={safeView}
                onChange={(e) => setView(e.target.value as "ontwikkel" | "vaardigheid" | "overlay" | "beide")}
                style={selectStyle}
              >
                {allowedViews.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ display: "grid", gap: 4 }}>
              <span style={{ fontSize: 12, color: "#666" }}>Meetmoment</span>
              <select
                value={moment}
                onChange={(e) => setMoment(e.target.value as ProfileMoment)}
                style={selectStyle}
                title="Filter op meetmoment"
              >
                {momentOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {safeView === "ontwikkel" ? (
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Ontwikkelprofiel</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <RadarChart
                axes={ontwikkelAxes}
                series={[
                  {
                    id: "ontwikkel",
                    values: ontwikkel,
                    fill: "rgba(17, 17, 17, 0.10)",
                    stroke: "#111",
                    strokeWidth: 2,
                  },
                ]}
                ariaLabel="Ontwikkelprofiel"
              />
            </div>
          </div>
        ) : null}

        {safeView === "vaardigheid" && canShowVaardigheid ? (
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Vaardigheidsprofiel</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <RadarChart
                axes={vaardigheidAxes}
                series={[
                  {
                    id: "vaardigheid",
                    values: vaardigheid,
                    fill: "rgba(239, 108, 0, 0.16)",
                    stroke: "#ef6c00",
                    strokeWidth: 2,
                  },
                ]}
                ariaLabel="Vaardigheidsprofiel"
              />
            </div>
          </div>
        ) : null}

        {safeView === "overlay" && canShowVaardigheid ? (
          <div style={cardStyle}>
            <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Overlay</div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <RadarChart
                axes={vaardigheidAxes}
                series={[
                  {
                    id: "vaardigheid",
                    values: vaardigheid,
                    fill: "rgba(239, 108, 0, 0.16)",
                    stroke: "#ef6c00",
                    strokeWidth: 2,
                  },
                  {
                    id: "ontwikkel",
                    values: vaardigheid,
                    fill: "rgba(17, 17, 17, 0.04)",
                    stroke: "#111",
                    strokeWidth: 1.5,
                    dash: "6 6",
                  },
                ]}
                ariaLabel="Overlay ontwikkel- en vaardigheidsprofiel"
              />
            </div>
            <div style={{ fontSize: 11, color: "#666", marginTop: 8 }}>
              Overlay gebruikt hier de 6 assen van het vaardigheidsprofiel zodat beide lagen vergelijkbaar zichtbaar
              zijn.
            </div>
          </div>
        ) : null}

        {safeView === "beide" && canShowVaardigheid ? (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Ontwikkelprofiel</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RadarChart
                  axes={ontwikkelAxes}
                  series={[
                    {
                      id: "ontwikkel",
                      values: ontwikkel,
                      fill: "rgba(17, 17, 17, 0.10)",
                      stroke: "#111",
                      strokeWidth: 2,
                    },
                  ]}
                  ariaLabel="Ontwikkelprofiel"
                />
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: "#666", marginBottom: 10 }}>Vaardigheidsprofiel</div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RadarChart
                  axes={vaardigheidAxes}
                  series={[
                    {
                      id: "vaardigheid",
                      values: vaardigheid,
                      fill: "rgba(239, 108, 0, 0.16)",
                      stroke: "#ef6c00",
                      strokeWidth: 2,
                    },
                  ]}
                  ariaLabel="Vaardigheidsprofiel"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </details>
  );
}

export default function StudentDashboardPage() {
  const [status, setStatus] = useState("Laden...");
  const [data, setData] = useState<ApiPayload | null>(null);
  const [profileAssessments, setProfileAssessments] = useState<ProfileBundleAssessment[]>([]);
  const [profileRubricKey, setProfileRubricKey] = useState<string | null>(null);
  const [currentUitvoering, setCurrentUitvoering] = useState<string | null>(null);
  const [moment, setMoment] = useState<ProfileMoment>("ALL");
  const [view, setView] = useState<"ontwikkel" | "vaardigheid" | "overlay" | "beide">("ontwikkel");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const rU = await fetch("/api/system/current-uitvoering", { cache: "no-store" });
        const jU = await rU.json().catch(() => ({}));
        if (!cancelled) {
          setCurrentUitvoering(rU.ok && jU?.ok ? (jU.uitvoeringId ?? null) : null);
        }

        const res = await fetch("/api/student/dossier", { cache: "no-store" });
        const json = (await res.json().catch(() => ({}))) as ApiPayload;

        if (!res.ok || !json?.ok) {
          if (!cancelled) setStatus(`Laden faalde (${res.status}): ${json?.error ?? "onbekend"}`);
          return;
        }

        const profileRes = await fetch("/api/student/profile-bundle", { cache: "no-store" });
        const profileJson = (await profileRes.json().catch(() => ({}))) as ProfileBundleResponse;

        if (cancelled) return;

        setData(json);
        setProfileAssessments(profileRes.ok ? profileJson.assessments ?? [] : []);
        setProfileRubricKey(profileRes.ok ? profileJson.rubricKey ?? null : null);

        if (!profileRes.ok && profileJson?.error) {
          setStatus(`Profielen deels geladen: ${profileJson.error}`);
          return;
        }

        setStatus("");
      } catch {
        if (!cancelled) setStatus("Laden faalde.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const fullName = useMemo(() => {
    if (!data?.user) return "";
    const u = data.user;
    return [u.voornaam, u.tussenvoegsel, u.achternaam].filter(Boolean).join(" ");
  }, [data]);

  const max = data?.maxStage ?? null;
  const maxR = stageRank(max);

  function yearState(target: number): "done" | "current" | "todo" {
    if (maxR < 0) return "todo";
    if (maxR > target) return "done";
    if (maxR === target) return "current";
    return "todo";
  }

  const cred = data?.credential ?? null;

  const showLeertherapie = maxR >= 1;
  const showPraktijk3VO = maxR >= 3;

  const exam1State = maxR < 1 ? "todo" : cred?.exam1Completed ? "done" : maxR === 1 ? "current" : "todo";
  const exam2State = maxR < 2 ? "todo" : cred?.exam2Completed ? "done" : maxR === 2 ? "current" : "todo";
  const exam3State = maxR < 3 ? "todo" : cred?.exam3Completed ? "done" : maxR === 3 ? "current" : "todo";

  const groups = useMemo(() => {
    const map = new Map<string, EnrollmentRow[]>();
    const list = data?.enrollments ?? [];
    for (const e of list) {
      const u = e.cohort.uitvoeringId || "—";
      if (!map.has(u)) map.set(u, []);
      map.get(u)!.push(e);
    }

    const uitvoeringen = Array.from(map.keys()).sort((a, b) => a.localeCompare(b));

    if (currentUitvoering && uitvoeringen.includes(currentUitvoering)) {
      uitvoeringen.splice(uitvoeringen.indexOf(currentUitvoering), 1);
      uitvoeringen.unshift(currentUitvoering);
    }

    return uitvoeringen.map((u) => ({
      uitvoeringId: u,
      isCurrent: currentUitvoering ? u === currentUitvoering : false,
      enrollments: (map.get(u) ?? []).slice().sort((a, b) => a.cohort.naam.localeCompare(b.cohort.naam)),
    }));
  }, [data, currentUitvoering]);

  const hasAnyData = profileAssessments.length > 0;

  const { ontwikkel, vaardigheid } = useMemo(
    () =>
      computeProfiles({
        hasData: hasAnyData,
        moment,
        assessments: profileAssessments,
        rubricKey: profileRubricKey ?? data?.activeEnrollment?.cohort?.traject?.toLowerCase() ?? null,
      }),
    [data?.activeEnrollment?.cohort?.traject, hasAnyData, moment, profileAssessments, profileRubricKey]
  );

  const showOntwikkelprofiel = maxR >= 0;
  const showVaardigheidsprofiel = maxR >= 2;
  const showDerdeProfiel = maxR >= 3;

  return (
    <main style={{ padding: 32, maxWidth: 1000, margin: "0 auto" }}>
      <h1 style={{ marginBottom: 8 }}>Dashboard{fullName ? ` · ${fullName}` : ""}</h1>

      <div style={{ color: "#666", marginBottom: 18 }}>
        {currentUitvoering ? (
          <>
            Huidige uitvoering: <span style={{ fontFamily: "monospace" }}>{currentUitvoering}</span>.{" "}
          </>
        ) : null}
        Voor het invullen van je volgsysteem gebruik je de knop hieronder.
      </div>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 14,
          padding: 16,
          background: "#fafafa",
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 22,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 320px" }}>
          <div style={{ fontSize: 14, color: "#111", marginBottom: 6 }}>Volgsysteem invullen</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            Klik om je reflectie/vragenlijst voor dit moment te openen.
          </div>
        </div>

        <Link
          href="/student/volgsysteem"
          style={{
            display: "inline-block",
            padding: "10px 14px",
            borderRadius: 12,
            background: "#111",
            color: "white",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Open volgsysteem →
        </Link>
      </div>

      {status ? (
        <div
          style={{
            padding: 12,
            border: "1px solid #eee",
            borderRadius: 12,
            background: "#fff",
            marginBottom: 20,
          }}
        >
          {status}
        </div>
      ) : null}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
          <div style={{ marginBottom: 12, fontWeight: 900 }}>Profielen</div>

          <div style={{ display: "grid", gap: 10 }}>
            {showOntwikkelprofiel ? (
              <SummaryCard
                title="Ontwikkelprofiel"
                subtitle="Leerontwikkeling binnen de opleiding"
                axes={ontwikkelAxes}
                values={ontwikkel}
                currentStage={max}
                defaultOpen={true}
              />
            ) : null}

            {showVaardigheidsprofiel ? (
              <SummaryCard
                title="Vaardigheidsprofiel"
                subtitle="Startbekwaam handelen als haptotherapeut"
                axes={vaardigheidAxes}
                values={vaardigheid}
                currentStage={max}
                defaultOpen={false}
              />
            ) : null}

            {showDerdeProfiel ? (
              <PlaceholderProfileCard
                title="Professioneel profiel"
                subtitle="Professionele positionering en verdieping"
                defaultOpen={false}
              />
            ) : null}

            <DiagramSection
              ontwikkel={ontwikkel}
              vaardigheid={vaardigheid}
              moment={moment}
              setMoment={setMoment}
              view={view}
              setView={setView}
              canShowVaardigheid={showVaardigheidsprofiel}
              defaultOpen={false}
            />
          </div>
        </section>

        <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 16 }}>
          <div style={{ marginBottom: 10, fontWeight: 900 }}>Opleidingsdossier</div>

          {!data || !cred ? (
            <div style={{ color: "#666", fontSize: 12 }}>Geen gegevens.</div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Basisjaar</span>
                <Dot state={yearState(0)} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Jaar 1 vakopleiding</span>
                <Dot state={yearState(1)} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingLeft: 10,
                }}
              >
                <span>Tentamen Ontwikkelingspsychologie (1VO)</span>
                <Dot state={exam1State as any} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Jaar 2 vakopleiding</span>
                <Dot state={yearState(2)} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingLeft: 10,
                }}
              >
                <span>Tentamen Haptonomische Fenomenen (2VO)</span>
                <Dot state={exam2State as any} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Jaar 3 vakopleiding</span>
                <Dot state={yearState(3)} />
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingLeft: 10,
                }}
              >
                <span>Tentamen Psychopathologie (3VO)</span>
                <Dot state={exam3State as any} />
              </div>

              <div style={{ height: 1, background: "#eee", margin: "8px 0" }} />

              {showLeertherapie ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Leertherapie</span>
                  <CountChip value={cred.leertherapieCount} required={REQUIRED.leertherapie} />
                </div>
              ) : null}

              {showPraktijk3VO ? (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Intervisie</span>
                    <CountChip value={cred.intervisieCount} required={REQUIRED.intervisie} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Supervisie</span>
                    <CountChip value={cred.supervisieCount} required={REQUIRED.supervisie} />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Eindsupervisie</span>
                    <Dot state={cred.eindsupervisieDone ? "done" : "current"} />
                  </div>
                </>
              ) : null}

              <div style={{ height: 1, background: "#eee", margin: "8px 0" }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>MBK</span>
                <Dot state={cred.mbkCompleted ? "done" : "current"} />
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>PSBK</span>
                <Dot state={cred.psbkCompleted ? "done" : "current"} />
              </div>
            </div>
          )}
        </section>
      </div>

      <section style={{ border: "1px solid #eee", borderRadius: 14, padding: 16, marginTop: 24 }}>
        <div style={{ marginBottom: 10, fontWeight: 900 }}>Mijn cohorts</div>

        {!data?.enrollments?.length ? (
          <div style={{ color: "#666", fontSize: 12 }}>Geen cohorts gevonden.</div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {groups.map((g) => (
              <div key={g.uitvoeringId}>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                  {g.isCurrent ? "Huidige uitvoering" : "Eerder"} ·{" "}
                  <span style={{ fontFamily: "monospace" }}>{g.uitvoeringId}</span>
                </div>

                <div style={{ display: "grid", gap: 10 }}>
                  {g.enrollments.map((e) => (
                    <div
                      key={e.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "10px 12px",
                        border: "1px solid #eee",
                        borderRadius: 12,
                        background: g.isCurrent ? "#fafafa" : "#fff",
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: "1 1 320px" }}>
                        <div style={{ fontWeight: 600 }}>{e.cohort.naam}</div>
                        <div style={{ fontSize: 12, color: "#666" }}>
                          uitvoering {e.cohort.uitvoeringId}
                        </div>
                      </div>

                      <Link
                        href={`/student/volgsysteem?enrollmentId=${encodeURIComponent(e.id)}`}
                        style={{
                          display: "inline-block",
                          padding: "8px 10px",
                          borderRadius: 10,
                          border: "1px solid #ddd",
                          background: "#fff",
                          color: "#111",
                          textDecoration: "none",
                          fontSize: 13,
                        }}
                        title={g.isCurrent ? "Open om in te vullen" : "Open archief (alleen lezen)"}
                      >
                        {g.isCurrent ? "Open →" : "Archief →"}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ fontSize: 12, color: "#666" }}>
              Archief is read-only: je ziet alleen meetmomenten die destijds zijn ingevuld/ingeleverd.
            </div>
          </div>
        )}
      </section>
    </main>
  );
}