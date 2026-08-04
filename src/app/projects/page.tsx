"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ProjectCard } from "@/components/projects/project-card";
import {
  ProjectFormDialog,
  type ProjectCreateFormValues,
  type ProjectEditFormValues,
} from "@/components/projects/project-form-dialog";
import type { Project } from "@/lib/project-types";
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useUpdateProject,
} from "@/hooks/use-projects";

export default function ProjectsPage() {
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  function openCreateDialog() {
    setEditingProject(null);
    setFormOpen(true);
  }

  function openEditDialog(project: Project) {
    setEditingProject(project);
    setFormOpen(true);
  }

  function handleToggleActive(id: string, active: boolean) {
    updateProject.mutate({ id, input: { isActive: active } });
  }

  function handleDelete(id: string) {
    deleteProject.mutate(id);
  }

  function handleCreate(values: ProjectCreateFormValues) {
    createProject
      .mutateAsync({
        name: values.name,
        epicLink: values.epicLink,
        email: values.email || undefined,
        apiToken: values.apiToken || undefined,
      })
      .then(() => setFormOpen(false))
      .catch(() => {});
  }

  function handleUpdate(values: ProjectEditFormValues) {
    if (!editingProject) return;
    updateProject
      .mutateAsync({
        id: editingProject.id,
        input: {
          name: values.name,
          colorTag: values.colorTag,
          siteUrl: values.siteUrl,
          projectKey: values.projectKey,
          email: values.email,
          apiToken: values.apiToken || undefined,
          reportEnabled: values.reportEnabled,
          reportFrequency: values.reportFrequency,
          teamsWebhookUrl: values.teamsWebhookUrl || null,
        },
      })
      .then(() => setFormOpen(false))
      .catch(() => {});
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            프로젝트 관리
          </h1>
          <p className="text-sm text-muted-foreground">
            추적할 Jira 프로젝트를 등록하고 관리하세요.
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="size-4" />
          새 프로젝트 등록
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-sm text-muted-foreground">불러오는 중…</p>
          </CardContent>
        </Card>
      ) : !projects || projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-sm text-muted-foreground">
              등록된 프로젝트가 없습니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onToggleActive={handleToggleActive}
              onEdit={openEditDialog}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        editingProject={editingProject}
        isSubmitting={createProject.isPending || updateProject.isPending}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
