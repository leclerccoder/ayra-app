export const DEFAULT_SERVICE_TYPES = [
  { name: "2D Design", description: "Floor plans and layouts" },
  { name: "3D Design", description: "Realistic interior visualisation" },
  { name: "Renovation", description: "Space transformation and upgrades" },
  { name: "Design & Build", description: "End-to-end project delivery" },
] as const;

export const DESIGNER_TYPE_OPTIONS = ["2D", "3D", "2D / 3D"] as const;

const serviceTypeDescriptionMap = new Map<string, string>(
  DEFAULT_SERVICE_TYPES.map((serviceType) => [serviceType.name, serviceType.description])
);

export function getServiceTypeDescription(name: string) {
  return serviceTypeDescriptionMap.get(name) ?? "Custom Ayra service offering";
}

function normalizeServiceType(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function getRequiredDesignerTypeForService(serviceType: string | null | undefined) {
  const normalized = normalizeServiceType(serviceType);
  if (!normalized) return null;
  if (normalized === "2d design" || normalized.startsWith("2d ")) {
    return "2D" as const;
  }
  if (normalized === "3d design" || normalized.startsWith("3d ")) {
    return "3D" as const;
  }
  return null;
}

export function getAcceptedDesignerTypesForService(serviceType: string | null | undefined) {
  const requiredDesignerType = getRequiredDesignerTypeForService(serviceType);
  if (!requiredDesignerType) {
    return [] as string[];
  }
  return [requiredDesignerType, "2D / 3D"];
}

export function designerMatchesServiceType(
  serviceType: string | null | undefined,
  designerType: string | null | undefined
) {
  const acceptedTypes = getAcceptedDesignerTypesForService(serviceType);
  if (acceptedTypes.length === 0) {
    return true;
  }
  return acceptedTypes.includes((designerType ?? "").trim());
}
