"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PROJECT_COLOR_OPTIONS, REPORT_FREQUENCY_LABEL } from "@/lib/constants";
import type { ReportFrequency } from "@/generated/prisma/enums";
import type { Project } from "@/lib/project-types";

type FormState = {
  name: string;
  colorTag: string;
  siteUrl: string;
  projectKey: string;
  email: string;
  apiToken: string;
  jql: string;
  reportEnabled: boolean;
  reportFrequency: ReportFrequency;
  teamsWebhookUrl: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  colorTag: PROJECT_COLOR_OPTIONS[0],
  siteUrl: "",
  projectKey: "",
  email: "",
  apiToken: "",
  jql: "",
  reportEnabled: true,
  reportFrequency: "DAILY",
  teamsWebhookUrl: "",
};

function projectToForm(project: Project): FormState {
  return {
    name: project.name,
    colorTag: project.colorTag ?? PROJECT_COLOR_OPTIONS[0],
    siteUrl: project.siteUrl,
    projectKey: project.projectKey,
    email: project.email,
    apiToken: "",
    jql: project.jql ?? "",
    reportEnabled: project.reportEnabled,
    reportFrequency: project.reportFrequency,
    teamsWebhookUrl: project.teamsWebhookUrl ?? "",
  };
}

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingProject: Project | null;
  isSubmitting?: boolean;
  onSubmit: (values: FormState) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  editingProject,
  isSubmitting,
  onSubmit,
}: ProjectFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* keyed by which project is being edited so the form re-initializes
            from fresh props instead of being reset via an effect */}
        {open && (
          <ProjectForm
            key={editingProject?.id ?? "new"}
            editingProject={editingProject}
            isSubmitting={isSubmitting}
            onSubmit={onSubmit}
            onCancel={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ProjectFormProps {
  editingProject: Project | null;
  isSubmitting?: boolean;
  onSubmit: (values: FormState) => void;
  onCancel: () => void;
}

function ProjectForm({ editingProject, isSubmitting, onSubmit, onCancel }: ProjectFormProps) {
  const [form, setForm] = useState<FormState>(() =>
    editingProject ? projectToForm(editingProject) : EMPTY_FORM,
  );

  const isValid =
    form.name.trim() !== "" &&
    form.siteUrl.trim() !== "" &&
    form.projectKey.trim() !== "" &&
    form.email.trim() !== "" &&
    (editingProject !== null || form.apiToken.trim() !== "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>
          {editingProject ? "프로젝트 수정" : "새 프로젝트 등록"}
        </DialogTitle>
        <DialogDescription>
          Jira Cloud 프로젝트 정보를 입력하면 일/주/월 단위로 이슈 변화를
          추적합니다.
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-1.5 flex max-h-[65vh] flex-col gap-5 overflow-y-auto px-1.5 py-5">
        <div className="grid gap-2">
          <Label htmlFor="name">프로젝트 이름</Label>
          <Input
            id="name"
            placeholder="예: 결제 시스템 개선"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="siteUrl">Jira 사이트 URL</Label>
            <Input
              id="siteUrl"
              placeholder="https://your-team.atlassian.net"
              value={form.siteUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, siteUrl: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="projectKey">프로젝트 키</Label>
            <Input
              id="projectKey"
              placeholder="PROJ"
              value={form.projectKey}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  projectKey: e.target.value.toUpperCase(),
                }))
              }
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">Jira 계정 이메일</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@company.com"
              value={form.email}
              onChange={(e) =>
                setForm((f) => ({ ...f, email: e.target.value }))
              }
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="apiToken">API 토큰</Label>
            <Input
              id="apiToken"
              type="password"
              placeholder={
                editingProject ? "변경하지 않으려면 비워두세요" : "••••••••"
              }
              value={form.apiToken}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiToken: e.target.value }))
              }
              required={!editingProject}
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="reportFrequency">리포트 주기</Label>
          <Select
            value={form.reportFrequency}
            onValueChange={(v) =>
              setForm((f) => ({
                ...f,
                reportFrequency: (v ?? "DAILY") as ReportFrequency,
              }))
            }
          >
            <SelectTrigger id="reportFrequency" className="w-40">
              <SelectValue>
                {(value: ReportFrequency | null) =>
                  value ? REPORT_FREQUENCY_LABEL[value] : "선택"
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">매일</SelectItem>
              <SelectItem value="WEEKLY">매주</SelectItem>
              <SelectItem value="MONTHLY">매월</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="teamsWebhookUrl">
            Teams Webhook <span className="text-muted-foreground">(선택)</span>
          </Label>
          <Input
            id="teamsWebhookUrl"
            placeholder="https://outlook.office.com/webhook/…"
            value={form.teamsWebhookUrl}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                teamsWebhookUrl: e.target.value,
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
          <div>
            <p className="text-sm font-medium">자동 리포트 발송</p>
            <p className="text-xs text-muted-foreground">
              설정한 주기에 맞춰 Teams로 리포트를 보냅니다.
            </p>
          </div>
          <Switch
            checked={form.reportEnabled}
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, reportEnabled: checked }))
            }
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          취소
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? "확인 중…" : editingProject ? "저장" : "등록"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export type { FormState as ProjectFormValues };
