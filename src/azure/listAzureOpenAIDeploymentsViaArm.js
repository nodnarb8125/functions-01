import { ClientSecretCredential, DefaultAzureCredential, getBearerTokenProvider } from '@azure/identity';

import mapAzureOpenAIDeploymentRow from './mapAzureOpenAIDeploymentRow.js';

const ARM_DEPLOYMENTS_API_VERSION = '2024-10-01';

function envValue(name) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function parseAzureOpenAIAccountName(endpoint) {
  if (!endpoint) return null;

  let url;
  try {
    const raw = String(endpoint).trim();
    url = new URL(raw.includes('://') ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const suffixes = [
    '.openai.azure.com',
    '.cognitiveservices.azure.com',
    '.services.ai.azure.com',
  ];

  for (const suffix of suffixes) {
    if (host.endsWith(suffix)) {
      return host.slice(0, -suffix.length);
    }
  }

  return null;
}

function parseCognitiveServicesAccountFromResourceId(resourceId) {
  const normalized = String(resourceId ?? '').trim();
  const match = normalized.match(
    /^\/subscriptions\/([^/]+)\/resourceGroups\/([^/]+)\/providers\/Microsoft\.CognitiveServices\/accounts\/([^/]+)/i,
  );
  if (!match) return null;

  return {
    subscriptionId: match[1],
    resourceGroup: match[2],
    accountName: match[3],
  };
}

export function resolveAzureArmDeploymentsConfig(input = {}) {
  const fromResourceId = parseCognitiveServicesAccountFromResourceId(
    input.resourceId ?? envValue('AZURE_OPENAI_RESOURCE_ID'),
  );

  const subscriptionId =
    input.subscriptionId
    ?? fromResourceId?.subscriptionId
    ?? envValue('AZURE_SUBSCRIPTION_ID')
    ?? null;

  const resourceGroup =
    input.resourceGroup
    ?? fromResourceId?.resourceGroup
    ?? envValue('AZURE_OPENAI_RESOURCE_GROUP')
    ?? null;

  const accountName =
    input.accountName
    ?? fromResourceId?.accountName
    ?? parseAzureOpenAIAccountName(
      input.projectEndpoint ?? envValue('AZURE_AI_PROJECT_ENDPOINT'),
    )
    ?? parseAzureOpenAIAccountName(
      input.endpoint
        ?? envValue('AZURE_OPENAI_API_ENDPOINT')
        ?? envValue('AZURE_OPENAI_ENDPOINT'),
    )
    ?? null;

  const missing = [];
  if (!subscriptionId) missing.push('AZURE_SUBSCRIPTION_ID');
  if (!resourceGroup) missing.push('AZURE_OPENAI_RESOURCE_GROUP');
  if (!accountName) {
    missing.push(
      'account name from AZURE_OPENAI_API_ENDPOINT, AZURE_AI_PROJECT_ENDPOINT, or AZURE_OPENAI_RESOURCE_ID',
    );
  }

  if (missing.length > 0) {
    throw new Error(
      `ARM deployments list requires: ${missing.join(', ')}.`,
    );
  }

  return { subscriptionId, resourceGroup, accountName };
}

async function getArmBearerToken() {
  const tenantId = envValue('TENANT_ID');
  const clientId = envValue('CLIENT_ID');
  const clientSecret = envValue('CLIENT_SECRET');

  if (tenantId && clientId && clientSecret) {
    return getBearerTokenProvider(
      new ClientSecretCredential(tenantId, clientId, clientSecret),
      'https://management.azure.com/.default',
    )();
  }

  const credential = new DefaultAzureCredential();
  const tokenResponse = await credential.getToken('https://management.azure.com/.default');
  if (!tokenResponse?.token) {
    throw new Error(
      'ARM authentication failed. Set TENANT_ID, CLIENT_ID, CLIENT_SECRET or run az login.',
    );
  }

  return tokenResponse.token;
}

/**
 * List installed deployments via Azure Resource Manager (Foundry portal source of truth).
 */
export default async function listAzureOpenAIDeploymentsViaArm(input = {}) {
  const config = resolveAzureArmDeploymentsConfig(input);
  const token = await getArmBearerToken();
  const apiVersion = envValue('AZURE_ARM_DEPLOYMENTS_API_VERSION') ?? ARM_DEPLOYMENTS_API_VERSION;
  const fetchFn = input.fetchFn ?? fetch;

  const requestUrl =
    `https://management.azure.com/subscriptions/${encodeURIComponent(config.subscriptionId)}`
    + `/resourceGroups/${encodeURIComponent(config.resourceGroup)}`
    + `/providers/Microsoft.CognitiveServices/accounts/${encodeURIComponent(config.accountName)}`
    + `/deployments?api-version=${encodeURIComponent(apiVersion)}`;

  let url = requestUrl;

  const rows = [];

  while (url) {
    const res = await fetchFn(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(
        `ARM deployments list failed: ${res.status} ${res.statusText}${detail ? ` — ${detail}` : ''}`,
      );
    }

    const body = await res.json();
    if (Array.isArray(body?.value)) {
      rows.push(...body.value);
    }

    url = typeof body?.nextLink === 'string' && body.nextLink.trim() ? body.nextLink : null;
  }

  return {
    models: rows.map(mapAzureOpenAIDeploymentRow).filter((row) => row.id),
    requestUrl,
    apiVersion,
    accountName: config.accountName,
    resourceGroup: config.resourceGroup,
    subscriptionId: config.subscriptionId,
  };
}