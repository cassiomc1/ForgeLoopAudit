import { useState } from 'react';
import { Settings as SettingsIcon, Monitor, Moon, Sun, Code, Palette } from 'lucide-react';
import { cn } from '../lib/utils';

interface SettingsProps {}

export function Settings({}: SettingsProps) {
  const api = (window as any).forgeLoopStudio;
  const [settings, setSettings] = useState({
    theme: 'dark',
    uiDensity: 'comfortable',
    reduceMotion: 'system',
    reopenLastProject: true,
    showTechnicalHashes: false,
    eventTimeFormat: 'relative',
    showRawArtifacts: false,
  });
  const [diagnosticsMessage, setDiagnosticsMessage] = useState('');

  async function copyDiagnostics() {
    const diagnostics = await api.getDiagnostics();
    await navigator.clipboard.writeText(JSON.stringify(diagnostics, null, 2));
    setDiagnosticsMessage('Diagnostics copied locally');
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-semibold text-forge-text-primary">Settings</h1>
        <p className="text-sm text-forge-text-muted mt-1">Application preferences</p>
      </div>

      <div className="space-y-6">
        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
          <h3 className="text-sm font-semibold text-forge-text-primary mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4 text-forge-text-muted" />
            Appearance
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-forge-text-secondary">Theme</p>
                <p className="text-xs text-forge-text-muted">Select application theme</p>
              </div>
              <div className="flex items-center gap-2">
                {[
                  { value: 'dark', icon: <Moon className="w-4 h-4" />, label: 'Dark' },
                  { value: 'light', icon: <Sun className="w-4 h-4" />, label: 'Light' },
                  { value: 'system', icon: <Monitor className="w-4 h-4" />, label: 'System' },
                ].map((theme) => (
                  <button
                    key={theme.value}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-6 transition-colors',
                      settings.theme === theme.value
                        ? 'bg-forge-accent/10 text-forge-accent'
                        : 'text-forge-text-muted hover:bg-forge-hover-surface hover:text-forge-text-primary'
                    )}
                    onClick={() => setSettings({ ...settings, theme: theme.value })}
                  >
                    {theme.icon}
                    {theme.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-forge-text-secondary">UI Density</p>
                <p className="text-xs text-forge-text-muted">Adjust spacing and sizing</p>
              </div>
              <div className="flex items-center gap-2">
                {['comfortable', 'compact'].map((density) => (
                  <button
                    key={density}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-6 transition-colors',
                      settings.uiDensity === density
                        ? 'bg-forge-accent/10 text-forge-accent'
                        : 'text-forge-text-muted hover:bg-forge-hover-surface hover:text-forge-text-primary'
                    )}
                    onClick={() => setSettings({ ...settings, uiDensity: density })}
                  >
                    {density.charAt(0).toUpperCase() + density.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-forge-text-secondary">Reduce Motion</p>
                <p className="text-xs text-forge-text-muted">Minimize animations</p>
              </div>
              <select
                className="input w-32"
                value={settings.reduceMotion}
                onChange={(e) => setSettings({ ...settings, reduceMotion: e.target.value })}
              >
                <option value="system">System</option>
                <option value="on">On</option>
                <option value="off">Off</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
          <h3 className="text-sm font-semibold text-forge-text-primary mb-2">Privacy-safe diagnostics</h3>
          <p className="text-xs text-forge-text-muted mb-3">Only allowlisted runtime facts are copied; project contents and environment variables are excluded.</p>
          <button className="btn-secondary" onClick={copyDiagnostics}>Copy diagnostics</button>
          {diagnosticsMessage && <span className="ml-3 text-xs text-forge-text-muted">{diagnosticsMessage}</span>}
        </div>

        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
          <h3 className="text-sm font-semibold text-forge-text-primary mb-4 flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-forge-text-muted" />
            Behavior
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-forge-text-secondary">Reopen Last Project</p>
                <p className="text-xs text-forge-text-muted">Automatically open the last project on launch</p>
              </div>
              <button
                className={cn(
                  'w-10 h-6 rounded-full transition-colors',
                  settings.reopenLastProject ? 'bg-forge-accent' : 'bg-forge-border-strong'
                )}
                onClick={() => setSettings({ ...settings, reopenLastProject: !settings.reopenLastProject })}
              >
                <span className={cn(
                  'block w-4 h-4 rounded-full bg-white transform transition-transform',
                  settings.reopenLastProject ? 'translate-x-5' : 'translate-x-1'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-forge-text-secondary">Event Time Format</p>
                <p className="text-xs text-forge-text-muted">How to display event timestamps</p>
              </div>
              <select
                className="input w-32"
                value={settings.eventTimeFormat}
                onChange={(e) => setSettings({ ...settings, eventTimeFormat: e.target.value })}
              >
                <option value="relative">Relative</option>
                <option value="absolute">Absolute</option>
                <option value="utc">UTC</option>
              </select>
            </div>
          </div>
        </div>

        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
          <h3 className="text-sm font-semibold text-forge-text-primary mb-4 flex items-center gap-2">
            <Code className="w-4 h-4 text-forge-text-muted" />
            Developer
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-forge-text-secondary">Show Technical Hashes</p>
                <p className="text-xs text-forge-text-muted">Display full hash values</p>
              </div>
              <button
                className={cn(
                  'w-10 h-6 rounded-full transition-colors',
                  settings.showTechnicalHashes ? 'bg-forge-accent' : 'bg-forge-border-strong'
                )}
                onClick={() => setSettings({ ...settings, showTechnicalHashes: !settings.showTechnicalHashes })}
              >
                <span className={cn(
                  'block w-4 h-4 rounded-full bg-white transform transition-transform',
                  settings.showTechnicalHashes ? 'translate-x-5' : 'translate-x-1'
                )} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-forge-text-secondary">Show Raw Protocol Artifacts</p>
                <p className="text-xs text-forge-text-muted">Enable raw JSON view for artifacts</p>
              </div>
              <button
                className={cn(
                  'w-10 h-6 rounded-full transition-colors',
                  settings.showRawArtifacts ? 'bg-forge-accent' : 'bg-forge-border-strong'
                )}
                onClick={() => setSettings({ ...settings, showRawArtifacts: !settings.showRawArtifacts })}
              >
                <span className={cn(
                  'block w-4 h-4 rounded-full bg-white transform transition-transform',
                  settings.showRawArtifacts ? 'translate-x-5' : 'translate-x-1'
                )} />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-forge-primary-surface border border-forge-border-subtle rounded-10 p-4">
          <h3 className="text-sm font-semibold text-forge-text-primary mb-4">About</h3>
          <div className="space-y-2 text-sm text-forge-text-secondary">
            <p>ForgeLoop Studio v0.1.0</p>
            <p className="text-xs text-forge-text-muted">
              A real-time visual interface for the ForgeLoop engineering protocol.
            </p>
            <p className="text-xs text-forge-text-muted">
              Read-only observer mode. ForgeLoop remains the source of truth.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
