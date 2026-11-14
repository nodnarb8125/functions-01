function extractAzureDeploymentNameFromArmId(id) {
  const normalized = String(id ?? '').trim();
  const match = normalized.match(/\/deployments\/([^/]+)$/i);
  return match ? match[1] : null;
}

function resolveDeploymentCreatedUnix(row) {
  const candidates = [
    row.created_at,
    row.created,
    row.systemData?.createdAt,
    row.properties?.createdAt,
  ];

  for (const value of candidates) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const ms = Date.parse(value);
      if (Number.isFinite(ms)) {
        return Math.floor(ms / 1000);
      }
    }
  }

  return null;
}

export function resolveAzureDeploymentName(row) {
  const name = String(row.name ?? row.deployment_id ?? '').trim();
  if (name) return name;

  const fromArmId = extractAzureDeploymentNameFromArmId(row.id);
  if (fromArmId) return fromArmId;

  return String(row.id ?? '').trim();
}

export default function mapAzureOpenAIDeploymentRow(row) {
  const modelName = String(
    row.model ?? row.properties?.model?.name ?? row.sku?.name ?? '',
  ).trim();
  const modelVersion = String(
    row.model_version ?? row.version ?? row.properties?.model?.version ?? '',
  ).trim();
  const status = String(
    row.status ?? row.properties?.provisioningState ?? row.capabilities?.status ?? '',
  ).trim();

  const scale = row.scale_settings ?? row.sku ?? row.properties?.sku ?? null;

  return {
    id: resolveAzureDeploymentName(row),
    deploymentName: resolveAzureDeploymentName(row),
    modelName: modelName || null,
    modelVersion: modelVersion || null,
    status: status || null,
    scaleType: scale?.scale_type ?? scale?.name ?? null,
    capacity: scale?.capacity ?? row.properties?.currentCapacity ?? null,
    created: resolveDeploymentCreatedUnix(row),
    object: row.object ?? 'deployment',
  };
}