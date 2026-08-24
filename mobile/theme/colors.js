// TexVision design tokens — shared across all screens
export const colors = {
  bg: "#0F172A",
  bgLight: "#F8FAFC",
  surface: "#1E293B",
  surfaceLight: "#FFFFFF",
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  accent: "#06B6D4",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
  critical: "#DC2626",
  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textLight: "#F1F5F9",
  border: "#E2E8F0",
};

export const severityColor = (severity) => {
  switch (severity) {
    case "critical": return colors.critical;
    case "high": return colors.danger;
    case "medium": return colors.warning;
    case "low": return colors.success;
    default: return colors.textSecondary;
  }
};
