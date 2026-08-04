"use client";

import { ExternalLink, MoreVertical, Pencil, RefreshCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { REPORT_FREQUENCY_LABEL } from "@/lib/constants";
import type { Project } from "@/lib/project-types";
import { useSyncProject } from "@/hooks/use-projects";

interface ProjectCardProps {
  project: Project;
  onToggleActive: (id: string, active: boolean) => void;
  onEdit: (project: Project) => void;
  onDelete: (id: string) => void;
}

export function ProjectCard({
  project,
  onToggleActive,
  onEdit,
  onDelete,
}: ProjectCardProps) {
  const syncProject = useSyncProject();
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="relative">
          <span
            className="absolute top-1.5 -left-4 size-2.5 rounded-full"
            style={{ backgroundColor: project.colorTag ?? undefined }}
            aria-hidden
          />
          <h3 className="font-semibold leading-tight">{project.name}</h3>
          <div className="mt-2 flex items-center gap-1.5">
            <Badge
              variant="secondary"
              className="font-mono text-[11px] font-medium tracking-wide"
            >
              {project.projectKey}
            </Badge>
            {!project.isActive && (
              <Badge variant="outline" className="text-[11px] text-muted-foreground">
                일시중지
              </Badge>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon" className="size-8">
                <MoreVertical className="size-4" />
                <span className="sr-only">프로젝트 메뉴</span>
              </Button>
            }
          />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(project)}>
              <Pencil className="size-4" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => onDelete(project.id)}
            >
              <Trash2 className="size-4" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <a
        href={project.siteUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        {project.siteUrl.replace(/^https?:\/\//, "")}
        <ExternalLink className="size-3" />
      </a>

      <div className="flex items-center justify-between border-t border-border pt-4">
        <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
          <span>
            {project.reportEnabled
              ? `${REPORT_FREQUENCY_LABEL[project.reportFrequency]} 발송`
              : "리포트 발송 안 함"}
          </span>
          <span>
            {project.lastSnapshot
              ? `마지막 동기화: ${new Date(project.lastSnapshot.capturedAt).toLocaleString("ko-KR")}`
              : "아직 동기화한 적 없음"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">추적 중</span>
          <Switch
            checked={project.isActive}
            onCheckedChange={(checked) => onToggleActive(project.id, checked)}
          />
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full"
        disabled={syncProject.isPending}
        onClick={() => syncProject.mutate(project.id)}
      >
        <RefreshCcw className={syncProject.isPending ? "size-3.5 animate-spin" : "size-3.5"} />
        지금 동기화
      </Button>
    </div>
  );
}
