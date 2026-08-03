"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ListPlus,
  RefreshCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatTile } from "@/components/dashboard/stat-tile";
import { StatusDistribution } from "@/components/dashboard/status-distribution";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { ChangeList } from "@/components/dashboard/change-list";
import { PERIOD_LABEL, type Period } from "@/lib/constants";
import { useProjects } from "@/hooks/use-projects";
import { useDashboardData } from "@/hooks/use-dashboard";

export default function DashboardPage() {
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const trackedProjects = useMemo(
    () => (projects ?? []).filter((p) => p.isActive),
    [projects],
  );

  const [selectedProjectId, setProjectId] = useState("");
  const [period, setPeriod] = useState<Period>("day");

  const projectId = selectedProjectId || trackedProjects[0]?.id || "";
  const project = trackedProjects.find((p) => p.id === projectId);
  const { data, isLoading: dashboardLoading } = useDashboardData(projectId, period);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">대시보드</h1>
        <p className="text-sm text-muted-foreground">
          {PERIOD_LABEL[period]} 기준, 전 기간 대비 이슈 상태 변화를 확인하세요.
        </p>
      </div>

      {/* filters — one row, above everything they scope */}
      <div className="flex flex-wrap items-center gap-5">
        <Select
          value={projectId}
          onValueChange={(value) => setProjectId(value ?? "")}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="프로젝트 선택">
              {(value: string | null) => {
                const selected = trackedProjects.find((p) => p.id === value);
                if (!selected) return "프로젝트 선택";
                return (
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: selected.colorTag ?? undefined }}
                      aria-hidden
                    />
                    {selected.name}
                  </span>
                );
              }}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {trackedProjects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="flex items-center gap-2">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: p.colorTag ?? undefined }}
                    aria-hidden
                  />
                  {p.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList variant="line">
            <TabsTrigger value="day">일간</TabsTrigger>
            <TabsTrigger value="week">주간</TabsTrigger>
            <TabsTrigger value="month">월간</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {!projectsLoading && !project ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              추적 중인 프로젝트가 없습니다. 프로젝트 관리 메뉴에서 먼저
              등록해주세요.
            </p>
          </CardContent>
        </Card>
      ) : project && !dashboardLoading && data && !data.latestSnapshot ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              아직 이 프로젝트를 동기화한 적이 없습니다. 프로젝트 관리
              메뉴에서 &lsquo;지금 동기화&rsquo;를 눌러주세요.
            </p>
          </CardContent>
        </Card>
      ) : project && data ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="신규 이슈"
              value={data.kpis.newCount}
              icon={ListPlus}
              tint="blue"
              hint={`전 ${PERIOD_LABEL[period]} 대비 신규 등록`}
            />
            <StatTile
              label="완료 이슈"
              value={data.kpis.doneCount}
              icon={CheckCircle2}
              tint="green"
              hint="Done으로 전환"
            />
            <StatTile
              label="상태 변경"
              value={data.kpis.statusChangedCount}
              icon={RefreshCcw}
              tint="violet"
              hint="상태값이 바뀐 이슈"
            />
            <StatTile
              label="마감 지연"
              value={data.kpis.overdueCount}
              icon={AlertTriangle}
              tint="peach"
              hint={
                data.kpis.overdueCount > 0
                  ? "마감일이 지났습니다"
                  : "지연된 이슈 없음"
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">상태 분포</CardTitle>
                <CardDescription>
                  {project.name}의 현재 이슈 상태 구성
                </CardDescription>
              </CardHeader>
              <CardContent>
                <StatusDistribution data={data.statusDistribution} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="text-lg font-semibold">처리 추이</CardTitle>
                <CardDescription>
                  전체 이슈 대비 완료 이슈 수 변화
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TrendChart data={data.trend} />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">변경 내역</CardTitle>
              <CardDescription>
                선택한 기간 동안 상태가 바뀐 이슈 목록
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChangeList changes={data.changes} />
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
