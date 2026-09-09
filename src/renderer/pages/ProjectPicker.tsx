import { useEffect, useState } from 'react';
import { FolderOpen, FlaskConical, Clock, X } from 'lucide-react';
import type { RecentProject } from '@shared/domain';
import { ErrorState } from '../components/ui/EmptyState';
import { LoadingState } from '../components/ui/LoadingState';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { ThemeToggle } from '../components/ui/theme-toggle';
import { cn } from '../lib/utils';
import { auditApi } from '../lib/audit-client';

interface ProjectPickerProps {
  onOpenDemoProject: () => void;
  onOpenRecentProject: (path: string) => void;
  recentProjects: RecentProject[];
  isLoading: boolean;
  error?: { message: string; details?: string; code: string } | null;
}

export function ProjectPicker({ onOpenDemoProject, onOpenRecentProject, recentProjects, isLoading, error }: ProjectPickerProps) {
  const [hoveredRecent, setHoveredRecent] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    auditApi.getAppVersion().then(setAppVersion).catch(() => setAppVersion(null));
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex h-screen w-full flex-col forge-background">
      <div
        className="flex h-12 shrink-0 items-center justify-between border-b forge-border-subtle forge-primary-surface px-4"
      >
        <span className="text-sm font-semibold text-forge-text-primary">ForgeLoopAudit</span>
        <ThemeToggle />
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="w-full max-w-2xl animate-fade-in">
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto mb-6 rounded-12 bg-forge-accent flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h1 className="text-3xl font-semibold text-forge-text-primary tracking-tight mb-3">ForgeLoopAudit</h1>
            <p className="text-lg text-forge-text-secondary max-w-md mx-auto">
              Visualize your engineering loop in real time. Open a ForgeLoop-enabled project to explore tasks, lifecycle phases, contracts, evidence, and more.
            </p>
          </div>

          {error && (
            <ErrorState message={error.message} details={error.details} onRetry={onOpenDemoProject} />
          )}

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>Choose an audit project</CardTitle>
                  <CardDescription className="mt-2">The local web host keeps project selection and filesystem access outside the browser.</CardDescription>
                </div>
                <Badge variant="outline">Local only</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={onOpenDemoProject}
                disabled={isLoading}
              >
                <FlaskConical className="w-5 h-5" />
                <span>Open Demo Project</span>
                {isLoading && <LoadingState message="Opening..." />}
              </Button>
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium text-foreground">Open another project from the CLI</p>
                <code className="mt-2 block overflow-x-auto rounded-md bg-background px-3 py-2 text-xs text-muted-foreground">npx forgeloop-audit --project /path/to/project</code>
              </div>
              <p className="text-center text-xs text-forge-text-muted">
                ForgeLoopAudit searches the selected project for a <code className="font-mono text-forge-text-secondary">.forgeloop</code> directory. No browser upload or arbitrary path picker is used.
              </p>
              <p className="text-center text-xs text-forge-text-muted">
                Scenario-rich ForgeShop fixture with intentional complete, active, blocked, and planned tasks.
              </p>
            </CardContent>
          </Card>

          {recentProjects.length > 0 && (
            <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-12 overflow-hidden">
              <div className="px-6 py-4 border-b border-forge-border-subtle flex items-center justify-between">
                <h2 className="text-sm font-semibold text-forge-text-primary">Recent Projects</h2>
                <span className="text-xs text-forge-text-muted">{recentProjects.length}</span>
              </div>
              <div className="divide-y divide-forge-border-subtle/50">
                {recentProjects.map((project) => (
                  <button
                    key={project.path}
                    className={cn(
                      'w-full px-6 py-4 flex items-center justify-between hover:bg-forge-hover-surface transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forge-accent focus-visible:ring-offset-2 focus-visible:ring-offset-forge-primary-surface'
                    )}
                    onClick={() => onOpenRecentProject(project.path)}
                    onMouseEnter={() => setHoveredRecent(project.path)}
                    onMouseLeave={() => setHoveredRecent(null)}
                    disabled={isLoading}
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-8 bg-forge-secondary-surface flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-5 h-5 text-forge-text-muted" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-forge-text-primary truncate">{project.name}</p>
                        <p className="text-xs text-forge-text-muted truncate font-mono">{project.path}</p>
                      </div>
                    </div>
                    <div className={cn('flex items-center gap-2 text-xs text-forge-text-muted opacity-0 transition-opacity', hoveredRecent === project.path ? 'opacity-100' : '')}>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDate(project.lastOpenedAt)}
                      </span>
                      <button
                        className="p-1.5 rounded-6 hover:bg-forge-border-subtle hover:text-forge-text-primary"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Remove from recent"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 text-center text-xs text-forge-text-muted">
            <p>ForgeLoopAudit {appVersion ? `v${appVersion}` : ''} — Read-only observer for the ForgeLoop engineering protocol</p>
          </div>
        </div>
      </div>
    </div>
  );
}
