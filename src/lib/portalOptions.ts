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
