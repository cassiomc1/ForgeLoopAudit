export const ELECTRON_SECURITY_CONTRACT = Object.freeze({
  nodeIntegration: false,
  contextIsolation: true,
  sandbox: true,
  webSecurity: true,
  devToolsInProduction: false,
  permissions: 'deny-by-default',
  navigation: 'same-document-or-approved-https-external',
});
