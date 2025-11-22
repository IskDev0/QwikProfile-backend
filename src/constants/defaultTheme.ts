import type { ThemeConfig } from "../db/schema";

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  profile: {
    background: { type: "solid", value: "#ffffff" },
    textColor: "#1f2937",
    accentColor: "#3b82f6",
    fontFamily: "Public Sans",
  },
  avatar: {
    borderWidth: "4px",
    borderColor: "#3b82f6",
    shape: "circle",
    shadow: "lg",
  },
  defaultBlockStyles: {
    borderRadius: "8px",
    padding: "16px",
    backgroundColor: "#3b82f6",
    textColor: "#ffffff",
  },
  blockOverrides: {
    link: {
      default: {
        backgroundColor: "#3b82f6",
        textColor: "#ffffff",
        hoverEffect: "scale",
      },
      outline: {
        backgroundColor: "transparent",
        textColor: "#3b82f6",
        borderWidth: "2px",
        borderColor: "#3b82f6",
        hoverEffect: "scale",
      },
      shadow: {
        backgroundColor: "#ffffff",
        textColor: "#3b82f6",
        borderWidth: "1px",
        borderColor: "#e5e7eb",
        hoverEffect: "shadow",
      },
    },
    header: {
      textColor: "#1f2937",
      fontWeight: "bold",
      backgroundColor: "transparent",
    },
    text: {
      textColor: "#4b5563",
      backgroundColor: "transparent",
    },
  },
  spacing: {
    blockGap: "12px",
    containerPadding: "16px",
    maxWidth: "640px",
  },
};
