export function isFixtureProjectMode(packaged: boolean, environment: NodeJS.ProcessEnv): boolean {
  return !packaged
    && environment.FORGELOOP_STUDIO_SMOKE === '1'
    && Boolean(environment.FORGELOOP_STUDIO_FIXTURE_PROJECT);
}
