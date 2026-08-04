"use client";

import { useState } from "react";
import { HelpCircle } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PROJECT_COLOR_OPTIONS, REPORT_FREQUENCY_LABEL } from "@/lib/constants";
import type { ReportFrequency } from "@/generated/prisma/enums";
import type { Project } from "@/lib/project-types";
import { useDefaultJiraCredentials } from "@/hooks/use-app-settings";

function ApiTokenHelp() {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground"
            aria-label="API 토큰 확인 방법"
          >
            <HelpCircle className="size-3.5" />
          </button>
        }
      />
      <TooltipContent>
        <a
          href="https://id.atlassian.com/manage-profile/security/api-tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          이 링크
        </a>
        로 이동해 API 토큰을 발급받으세요. 생성 시 한 번만 표시되니 바로
        복사해두세요.
      </TooltipContent>
    </Tooltip>
  );
}

type CreateFormState = {
  name: string;
  epicLink: string;
  email: string;
  apiToken: string;
};

const EMPTY_CREATE_FORM: CreateFormState = {
  name: "",
  epicLink: "",
  email: "",
  apiToken: "",
};

type EditFormState = {
  name: string;
  colorTag: string;
  siteUrl: string;
  projectKey: string;
  email: string;
  apiToken: string;
  reportEnabled: boolean;
  reportFrequency: ReportFrequency;
  teamsWebhookUrl: string;
};

function projectToEditForm(project: Project): EditFormState {
  return {
    name: project.name,
    colorTag: project.colorTag ?? PROJECT_COLOR_OPTIONS[0],
    siteUrl: project.siteUrl,
    projectKey: project.projectKey,
    email: project.email,
    apiToken: "",
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
  onCreate: (values: CreateFormState) => void;
  onUpdate: (values: EditFormState) => void;
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  editingProject,
  isSubmitting,
  onCreate,
  onUpdate,
}: ProjectFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        {/* keyed by which project is being edited so the form re-initializes
            from fresh props instead of being reset via an effect */}
        {open &&
          (editingProject ? (
            <ProjectEditForm
              key={editingProject.id}
              editingProject={editingProject}
              isSubmitting={isSubmitting}
              onSubmit={onUpdate}
              onCancel={() => onOpenChange(false)}
            />
          ) : (
            <EpicCreateForm
              key="new"
              isSubmitting={isSubmitting}
              onSubmit={onCreate}
              onCancel={() => onOpenChange(false)}
            />
          ))}
      </DialogContent>
    </Dialog>
  );
}

interface EpicCreateFormProps {
  isSubmitting?: boolean;
  onSubmit: (values: CreateFormState) => void;
  onCancel: () => void;
}

function EpicCreateForm({ isSubmitting, onSubmit, onCancel }: EpicCreateFormProps) {
  const { data: settings } = useDefaultJiraCredentials();
  const hasDefaultAccount = Boolean(settings?.defaultJiraEmail);

  const [form, setForm] = useState<CreateFormState>(EMPTY_CREATE_FORM);
  const [useDifferentAccount, setUseDifferentAccount] = useState(false);

  const showAccountFields = !hasDefaultAccount || useDifferentAccount;

  const isValid =
    form.name.trim() !== "" &&
    form.epicLink.trim() !== "" &&
    (!showAccountFields || (form.email.trim() !== "" && form.apiToken.trim() !== ""));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>새 프로젝트 등록</DialogTitle>
        <DialogDescription>
          추적할 Jira 에픽 링크를 붙여넣으면, 그 하위 이슈들을 자동으로
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

        <div className="grid gap-2">
          <Label htmlFor="epicLink">Jira 에픽 링크</Label>
          <Input
            id="epicLink"
            placeholder="https://your-team.atlassian.net/browse/PROJ-123"
            value={form.epicLink}
            onChange={(e) => setForm((f) => ({ ...f, epicLink: e.target.value }))}
            required
          />
        </div>

        {showAccountFields ? (
          <>
            <div className="grid gap-2">
              <Label htmlFor="email">Jira 계정 이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                required
              />
            </div>

            <div className="grid gap-2">
              <div className="flex items-center gap-1.5">
                <Label htmlFor="apiToken">API 토큰</Label>
                <ApiTokenHelp />
              </div>
              <Input
                id="apiToken"
                type="password"
                placeholder="••••••••"
                value={form.apiToken}
                onChange={(e) => setForm((f) => ({ ...f, apiToken: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground">
                입력한 계정 정보는 다음 등록부터 자동으로 재사용됩니다.
              </p>
            </div>

            {hasDefaultAccount && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-fit text-muted-foreground"
                onClick={() => setUseDifferentAccount(false)}
              >
                저장된 계정 사용하기
              </Button>
            )}
          </>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
            <div className="text-sm">
              <span className="text-muted-foreground">등록된 Jira 계정: </span>
              <span className="font-medium">{settings?.defaultJiraEmail}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setUseDifferentAccount(true)}
            >
              다른 계정 사용
            </Button>
          </div>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
          취소
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          {isSubmitting ? "확인 중…" : "등록"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface ProjectEditFormProps {
  editingProject: Project;
  isSubmitting?: boolean;
  onSubmit: (values: EditFormState) => void;
  onCancel: () => void;
}

function ProjectEditForm({ editingProject, isSubmitting, onSubmit, onCancel }: ProjectEditFormProps) {
  const [form, setForm] = useState<EditFormState>(() => projectToEditForm(editingProject));

  const isValid =
    form.name.trim() !== "" &&
    form.siteUrl.trim() !== "" &&
    form.projectKey.trim() !== "" &&
    form.email.trim() !== "";

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSubmit(form);
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>프로젝트 수정</DialogTitle>
        <DialogDescription>
          Jira Cloud 연결 정보를 수정합니다. API 토큰은 변경할 때만
          입력하세요.
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
            <div className="flex items-center gap-1.5">
              <Label htmlFor="apiToken">API 토큰</Label>
              <ApiTokenHelp />
            </div>
            <Input
              id="apiToken"
              type="password"
              placeholder="변경하지 않으려면 비워두세요"
              value={form.apiToken}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiToken: e.target.value }))
              }
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
          {isSubmitting ? "확인 중…" : "저장"}
        </Button>
      </DialogFooter>
    </form>
  );
}

export type { CreateFormState as ProjectCreateFormValues, EditFormState as ProjectEditFormValues };
