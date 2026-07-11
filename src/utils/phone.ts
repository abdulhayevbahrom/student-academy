export function formatUzPhone(value?: string) {
  const digits = (value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.startsWith("998")) {
    const rest = digits.slice(3, 12);
    if (rest.length < 9) {
      return digits;
    }
    return `+998${rest.slice(0, 9)}`;
  }

  if (digits.startsWith("8") && digits.length === 10) {
    return `+998${digits.slice(1)}`;
  }

  if (digits.length <= 9) {
    return digits;
  }

  return `+998${digits.slice(0, 9)}`;
}

export function formatUzPhoneDisplay(value?: string) {
  const digits = (value || "").replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  let normalized = digits;
  if (normalized.startsWith("998")) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith("8") && normalized.length === 10) {
    normalized = normalized.slice(1);
  }

  normalized = normalized.slice(0, 9);
  if (normalized.length !== 9) {
    return String(value || "").trim();
  }

  return `+998 ${normalized.slice(0, 2)} ${normalized.slice(2, 5)}-${normalized.slice(5, 7)}-${normalized.slice(7, 9)}`;
}
