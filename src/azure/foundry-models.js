import listAzureOpenAIDeploymentsViaArm, {
  resolveAzureArmDeploymentsConfig,
} from './listAzureOpenAIDeploymentsViaArm.js';

const ARM_DEPLOYMENTS_API_VERSION = '2024-10-01';

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function envValue(name) {
  const value = process.env[name]?.trim();
  return value || undefined;
}

function normalizeAzureOpenAIBaseURL(baseURL) {
  if (!baseURL) return null;

  const trimmed = trimTrailingSlash(String(baseURL).trim());
  if (!trimmed) return null;

  if (trimmed.endsWith('/openai/v1')) return trimmed;
  if (trimmed.endsWith('/v1')) return trimmed.replace(/\/v1$/, '/openai/v1');
  if (/\.openai\.azure\.com$/i.test(trimmed)) return `${trimmed}/openai/v1`;

  return trimmed;
}

function resolveAzureOpenAIResourceOrigin(baseURL) {
  if (!baseURL) return null;

  try {
    const raw = String(baseURL).trim();
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    return url.origin;
  } catch {
    return null;
  }
}

export function resolveFoundryConfig() {
  const rawEndpoint =
    envValue('AZURE_OPENAI_API_ENDPOINT')
    ?? envValue('AZURE_OPENAI_ENDPOINT');
  const resourceName = envValue('AZURE_OPENAI_RESOURCE_NAME');
  const apiKey = envValue('AZURE_OPENAI_API_KEY');
  const authToken = envValue('AZURE_OPENAI_AUTH_TOKEN');

  const v1BaseUrl = normalizeAzureOpenAIBaseURL(rawEndpoint);
  let resourceHost;

  if (v1BaseUrl) {
    resourceHost = resolveAzureOpenAIResourceOrigin(v1BaseUrl);
  } else if (resourceName) {
    resourceHost = `https://${resourceName}.openai.azure.com`;
  } else {
    throw new Error(
      'Set AZURE_OPENAI_API_ENDPOINT (or AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_RESOURCE_NAME).',
    );
  }

  if (!resourceHost) {
    throw new Error('Could not resolve Azure OpenAI resource host from endpoint.');
  }

  const resolvedV1Base = v1BaseUrl ?? `${resourceHost}/openai/v1`;

  if (!apiKey && !authToken) {
    throw new Error(
      'Set AZURE_OPENAI_API_KEY or AZURE_OPENAI_AUTH_TOKEN for the Foundry data plane.',
    );
  }

  resolveAzureArmDeploymentsConfig();

  return {
    resourceHost,
    v1BaseUrl: resolvedV1Base,
    apiKey,
    authToken,
  };
}

function formatCreated(created) {
  if (created == null || !Number.isFinite(Number(created))) return null;
  return new Date(Number(created) * 1000).toISOString();
}

const EXCLUDED_STATUSES = new Set(['failed', 'canceled', 'cancelled', 'deleting']);

function isInstalledDeployment(row) {
  const status = String(row.status ?? '').trim().toLowerCase();
  if (!status) return true;
  return !EXCLUDED_STATUSES.has(status);
}

/**
 * Installed deployments via ARM only. Any failure throws.
 */
export async function listFoundryModels({ fetchFn = fetch } = {}) {
  const config = resolveFoundryConfig();
  const arm = await listAzureOpenAIDeploymentsViaArm({ fetchFn });

  const models = arm.models
    .filter(isInstalledDeployment)
    .map((row) => ({
      ...row,
      createdAt: formatCreated(row.created),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    resourceHost: config.resourceHost,
    responsesBaseUrl: `${config.v1BaseUrl}/`,
    models,
    count: models.length,
    fetchedAt: new Date().toISOString(),
    deploymentsUrl:
      `https://management.azure.com/subscriptions/${arm.subscriptionId}`
      + `/resourceGroups/${arm.resourceGroup}`
      + `/providers/Microsoft.CognitiveServices/accounts/${arm.accountName}/deployments`,
    apiVersion: arm.apiVersion,
  };
}

export function redactConfigForDisplay() {
  try {
    const config = resolveFoundryConfig();
    const arm = resolveAzureArmDeploymentsConfig();
    return {
      resourceHost: config.resourceHost,
      responsesBaseUrl: `${config.v1BaseUrl}/`,
      auth: config.apiKey ? 'api-key' : 'bearer',
      deploymentsApiVersion:
        envValue('AZURE_ARM_DEPLOYMENTS_API_VERSION') ?? ARM_DEPLOYMENTS_API_VERSION,
      accountName: arm.accountName,
      resourceGroup: arm.resourceGroup,
    };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : String(err),
    };
  }
}