export const DEFAULT_SERVICE_TYPES = [
  { name: "2D Design", description: "Floor plans and layouts" },
  { name: "3D Design", description: "Realistic interior visualisation" },
  { name: "Renovation", description: "Space transformation and upgrades" },
  { name: "Design & Build", description: "End-to-end project delivery" },
] as const;

const serviceTypeDescriptionMap = new Map<string, string>(
  DEFAULT_SERVICE_TYPES.map((serviceType) => [serviceType.name, serviceType.description])
);

const legacyDesignerTypeAliases = new Map<string, string>([
  ["2D", "2D Design"],
  ["3D", "3D Design"],
]);

function canonicalizeDesignerTypeValue(value: string) {
  const normalized = value.trim();
  return legacyDesignerTypeAliases.get(normalized) ?? normalized;
}

export function getServiceTypeDescription(name: string) {
  return serviceTypeDescriptionMap.get(name) ?? "Custom Ayra service offering";
}

function normalizeServiceType(value: string | null | undefined) {
  return canonicalizeDesignerTypeValue(value ?? "");
}

export function getRequiredDesignerTypeForService(serviceType: string | null | undefined) {
  const normalized = normalizeServiceType(serviceType);
  return normalized || null;
}

export function getAcceptedDesignerTypesForService(serviceType: string | null | undefined) {
  const requiredDesignerType = getRequiredDesignerTypeForService(serviceType);
  if (!requiredDesignerType) {
    return [] as string[];
  }
  return [requiredDesignerType];
}

export function normalizeDesignerTypes(
  values: string[] | null | undefined,
  availableTypes?: string[] | null | undefined
) {
  const seen = new Set<string>();
  const normalized: string[] = [];
  const availableTypeSet =
    availableTypes && availableTypes.length > 0
      ? new Set(availableTypes.map((value) => canonicalizeDesignerTypeValue(value)))
      : null;

  for (const rawValue of values ?? []) {
    const value = canonicalizeDesignerTypeValue(rawValue);
    if (!value || seen.has(value)) {
      continue;
    }
    if (availableTypeSet && !availableTypeSet.has(value)) {
      continue;
    }
    seen.add(value);
    normalized.push(value);
  }

  return normalized;
}

export function formatDesignerTypes(
  values: string[] | null | undefined,
  availableTypes?: string[] | null | undefined
) {
  const normalized = normalizeDesignerTypes(values, availableTypes);
  return normalized.length > 0 ? normalized.join(", ") : "Not assigned";
}

export function designerMatchesServiceType(
  serviceType: string | null | undefined,
  designerTypes: string[] | null | undefined
) {
  const acceptedTypes = getAcceptedDesignerTypesForService(serviceType);
  if (acceptedTypes.length === 0) {
    return true;
  }
  const normalizedTypes = normalizeDesignerTypes(designerTypes);
  return normalizedTypes.some((designerType) => acceptedTypes.includes(designerType));
}
