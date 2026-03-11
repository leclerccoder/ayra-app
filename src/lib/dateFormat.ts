const DEFAULT_TIME_ZONE = "Asia/Kuala_Lumpur";

type PortalDateValue = Date | string | null | undefined;

type FormatPortalDateOptions = {
  fallback?: string;
  includeTime?: boolean;
  includeYear?: boolean;
  day?: "numeric" | "2-digit";
  month?: "numeric" | "2-digit" | "short" | "long";
  hour?: "numeric" | "2-digit";
  minute?: "numeric" | "2-digit";
  timeZone?: string;
};

function toDate(value: PortalDateValue) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== "string" || value.length === 0) {
    return null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatPortalDate(
  value: PortalDateValue,
  options: FormatPortalDateOptions = {}
) {
  const date = toDate(value);
  if (!date) {
    return options.fallback ?? "—";
  }

  const formatter = new Intl.DateTimeFormat("en-MY", {
    timeZone: options.timeZone ?? DEFAULT_TIME_ZONE,
    day: options.day ?? "numeric",
    month: options.month ?? "short",
    ...(options.includeYear === false ? {} : { year: "numeric" }),
    ...(options.includeTime
      ? {
          hour: options.hour ?? "numeric",
          minute: options.minute ?? "2-digit",
          hour12: true,
        }
      : {}),
  });

  const parts = formatter.formatToParts(date);
  const values: Partial<Record<Intl.DateTimeFormatPartTypes, string>> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      values[part.type] = part.value;
    }
  }

  const dateLabel = [values.day, values.month, values.year]
    .filter(Boolean)
    .join(" ");

  if (!options.includeTime) {
    return dateLabel || options.fallback || "—";
  }

  const timeLabel = [values.hour && `${values.hour}:${values.minute ?? "00"}`, values.dayPeriod?.toUpperCase()]
    .filter(Boolean)
    .join(" ");

  if (!dateLabel) {
    return timeLabel || options.fallback || "—";
  }

  return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
}
