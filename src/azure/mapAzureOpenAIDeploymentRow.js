function extractAzureDeploymentNameFromArmId(id) {
  const normalized = String(id ?? '').trim();
  const match = normalized.match(/\/deployments\/([^/]+)$/i);
  return match ? match[1] : null;
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
    capacity: scale?.capacity ?? null,
    created:
      typeof row.created_at === 'number'
        ? row.created_at
        : row.created_at
          ? Math.floor(Date.parse(row.created_at) / 1000)
          : typeof row.created === 'number'
            ? row.created
            : null,
    object: row.object ?? 'deployment',
  };
}