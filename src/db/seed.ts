import db from "./index";
import { themes, utmTemplates } from "./schema";
import type { ThemeConfig, UtmParams } from "./schema";

async function seed() {
  console.log("🌱 Seeding database...");

  console.log("📦 Seeding themes...");

  const themesData: Array<{
    name: string;
    displayName: string;
    description: string;
    previewImageUrl: string | null;
    config: ThemeConfig;
    isSystem: boolean;
  }> = [
    {
      name: "default",
      displayName: "Default",
      description: "Clean and simple default theme",
      previewImageUrl: null,
      isSystem: true,
      config: {
        profile: {
          background: { type: "solid", value: "#ffffff" },
          textColor: "#1a1a1a",
          accentColor: "#3b82f6",
          fontFamily: "Inter, sans-serif",
        },
        avatar: {
          borderWidth: "4px",
          borderColor: "#3b82f6",
          shape: "circle",
          shadow: "lg",
        },
        defaultBlockStyles: {
          borderRadius: "12px",
          padding: "16px 24px",
          backgroundColor: "#f8fafc",
          textColor: "#1a1a1a",
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
              hoverEffect: "shadow",
            },
            shadow: {
              backgroundColor: "#ffffff",
              textColor: "#1a1a1a",
              hoverEffect: "glow",
            },
          },
        },
        spacing: {
          blockGap: "12px",
          containerPadding: "24px",
          maxWidth: "600px",
        },
      },
    },
    {
      name: "dark",
      displayName: "Dark Mode",
      description: "Sleek dark theme for night owls",
      previewImageUrl: null,
      isSystem: true,
      config: {
        profile: {
          background: { type: "solid", value: "#0f172a" },
          textColor: "#f1f5f9",
          accentColor: "#818cf8",
          fontFamily: "Inter, sans-serif",
        },
        avatar: {
          borderWidth: "4px",
          borderColor: "#818cf8",
          shape: "circle",
          shadow: "xl",
        },
        defaultBlockStyles: {
          borderRadius: "12px",
          padding: "16px 24px",
          backgroundColor: "#1e293b",
          textColor: "#f1f5f9",
        },
        blockOverrides: {
          link: {
            default: {
              backgroundColor: "#818cf8",
              textColor: "#ffffff",
              hoverEffect: "scale",
            },
            outline: {
              backgroundColor: "transparent",
              textColor: "#818cf8",
              borderWidth: "2px",
              borderColor: "#818cf8",
              hoverEffect: "glow",
            },
            shadow: {
              backgroundColor: "#1e293b",
              textColor: "#f1f5f9",
              hoverEffect: "shadow",
            },
          },
        },
        spacing: {
          blockGap: "12px",
          containerPadding: "24px",
          maxWidth: "600px",
        },
      },
    },
    {
      name: "gradient-sunset",
      displayName: "Sunset Gradient",
      description: "Warm gradient theme with sunset colors",
      previewImageUrl: null,
      isSystem: true,
      config: {
        profile: {
          background: {
            type: "gradient",
            gradient: {
              from: "#ff6b6b",
              to: "#ffd93d",
              direction: "135deg",
            },
          },
          textColor: "#1a1a1a",
          accentColor: "#ff6b6b",
          fontFamily: "Inter, sans-serif",
        },
        avatar: {
          borderWidth: "4px",
          borderColor: "#ffffff",
          shape: "circle",
          shadow: "xl",
        },
        defaultBlockStyles: {
          borderRadius: "16px",
          padding: "16px 24px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          textColor: "#1a1a1a",
        },
        blockOverrides: {
          link: {
            default: {
              backgroundColor: "#ff6b6b",
              textColor: "#ffffff",
              hoverEffect: "scale",
            },
            outline: {
              backgroundColor: "rgba(255, 255, 255, 0.8)",
              textColor: "#ff6b6b",
              borderWidth: "2px",
              borderColor: "#ff6b6b",
              hoverEffect: "shadow",
            },
          },
        },
        spacing: {
          blockGap: "16px",
          containerPadding: "24px",
          maxWidth: "600px",
        },
      },
    },
    {
      name: "minimal",
      displayName: "Minimal",
      description: "Ultra-clean minimal design",
      previewImageUrl: null,
      isSystem: true,
      config: {
        profile: {
          background: { type: "solid", value: "#fafafa" },
          textColor: "#171717",
          accentColor: "#171717",
          fontFamily: "Inter, sans-serif",
        },
        avatar: {
          borderWidth: "2px",
          borderColor: "#171717",
          shape: "rounded",
          shadow: "none",
        },
        defaultBlockStyles: {
          borderRadius: "8px",
          padding: "14px 20px",
          backgroundColor: "#ffffff",
          textColor: "#171717",
        },
        blockOverrides: {
          link: {
            default: {
              backgroundColor: "#171717",
              textColor: "#ffffff",
              hoverEffect: "none",
            },
            outline: {
              backgroundColor: "transparent",
              textColor: "#171717",
              borderWidth: "1px",
              borderColor: "#171717",
              hoverEffect: "none",
            },
          },
        },
        spacing: {
          blockGap: "10px",
          containerPadding: "20px",
          maxWidth: "500px",
        },
      },
    },
    {
      name: "gradient-ocean",
      displayName: "Ocean Gradient",
      description: "Cool ocean-inspired gradient theme",
      previewImageUrl: null,
      isSystem: true,
      config: {
        profile: {
          background: {
            type: "gradient",
            gradient: {
              from: "#667eea",
              to: "#764ba2",
              direction: "135deg",
            },
          },
          textColor: "#ffffff",
          accentColor: "#a78bfa",
          fontFamily: "Inter, sans-serif",
        },
        avatar: {
          borderWidth: "4px",
          borderColor: "#ffffff",
          shape: "circle",
          shadow: "xl",
        },
        defaultBlockStyles: {
          borderRadius: "16px",
          padding: "16px 24px",
          backgroundColor: "rgba(255, 255, 255, 0.15)",
          textColor: "#ffffff",
        },
        blockOverrides: {
          link: {
            default: {
              backgroundColor: "rgba(255, 255, 255, 0.25)",
              textColor: "#ffffff",
              hoverEffect: "glow",
            },
            outline: {
              backgroundColor: "transparent",
              textColor: "#ffffff",
              borderWidth: "2px",
              borderColor: "rgba(255, 255, 255, 0.5)",
              hoverEffect: "shadow",
            },
          },
        },
        spacing: {
          blockGap: "14px",
          containerPadding: "24px",
          maxWidth: "600px",
        },
      },
    },
  ];

  for (const theme of themesData) {
    try {
      await db.insert(themes).values(theme).onConflictDoNothing();
      console.log(`✅ Theme "${theme.displayName}" inserted`);
    } catch (error) {
      console.error(`❌ Error inserting theme "${theme.displayName}":`, error);
    }
  }

  console.log("\n📦 Seeding UTM templates...");

  const utmTemplatesData: Array<{
    name: string;
    platform: string;
    icon: string | null;
    defaultParams: UtmParams;
    isSystem: boolean;
  }> = [
    {
      name: "Instagram Bio",
      platform: "instagram",
      icon: "instagram",
      isSystem: true,
      defaultParams: {
        utm_source: "instagram",
        utm_medium: "social",
        utm_campaign: "bio_link",
      },
    },
    {
      name: "Instagram Story",
      platform: "instagram",
      icon: "instagram",
      isSystem: true,
      defaultParams: {
        utm_source: "instagram",
        utm_medium: "story",
        utm_campaign: "story_link",
      },
    },
    {
      name: "Instagram Post",
      platform: "instagram",
      icon: "instagram",
      isSystem: true,
      defaultParams: {
        utm_source: "instagram",
        utm_medium: "post",
        utm_campaign: "ig_post",
      },
    },
    {
      name: "TikTok Bio",
      platform: "tiktok",
      icon: "tiktok",
      isSystem: true,
      defaultParams: {
        utm_source: "tiktok",
        utm_medium: "social",
        utm_campaign: "bio_link",
      },
    },
    {
      name: "TikTok Video",
      platform: "tiktok",
      icon: "tiktok",
      isSystem: true,
      defaultParams: {
        utm_source: "tiktok",
        utm_medium: "video",
        utm_campaign: "tiktok_video",
      },
    },
    {
      name: "Twitter/X Bio",
      platform: "twitter",
      icon: "twitter",
      isSystem: true,
      defaultParams: {
        utm_source: "twitter",
        utm_medium: "social",
        utm_campaign: "bio_link",
      },
    },
    {
      name: "Twitter/X Post",
      platform: "twitter",
      icon: "twitter",
      isSystem: true,
      defaultParams: {
        utm_source: "twitter",
        utm_medium: "post",
        utm_campaign: "tweet",
      },
    },
    {
      name: "YouTube Channel",
      platform: "youtube",
      icon: "youtube",
      isSystem: true,
      defaultParams: {
        utm_source: "youtube",
        utm_medium: "video",
        utm_campaign: "channel_link",
      },
    },
    {
      name: "YouTube Video Description",
      platform: "youtube",
      icon: "youtube",
      isSystem: true,
      defaultParams: {
        utm_source: "youtube",
        utm_medium: "video",
        utm_campaign: "video_description",
      },
    },
    {
      name: "Facebook Page",
      platform: "facebook",
      icon: "facebook",
      isSystem: true,
      defaultParams: {
        utm_source: "facebook",
        utm_medium: "social",
        utm_campaign: "page_link",
      },
    },
    {
      name: "Facebook Post",
      platform: "facebook",
      icon: "facebook",
      isSystem: true,
      defaultParams: {
        utm_source: "facebook",
        utm_medium: "post",
        utm_campaign: "fb_post",
      },
    },
    {
      name: "LinkedIn Profile",
      platform: "linkedin",
      icon: "linkedin",
      isSystem: true,
      defaultParams: {
        utm_source: "linkedin",
        utm_medium: "social",
        utm_campaign: "profile_link",
      },
    },
    {
      name: "LinkedIn Post",
      platform: "linkedin",
      icon: "linkedin",
      isSystem: true,
      defaultParams: {
        utm_source: "linkedin",
        utm_medium: "post",
        utm_campaign: "linkedin_post",
      },
    },
    {
      name: "Email Signature",
      platform: "email",
      icon: "mail",
      isSystem: true,
      defaultParams: {
        utm_source: "email",
        utm_medium: "signature",
        utm_campaign: "email_signature",
      },
    },
    {
      name: "Email Newsletter",
      platform: "email",
      icon: "mail",
      isSystem: true,
      defaultParams: {
        utm_source: "email",
        utm_medium: "newsletter",
        utm_campaign: "newsletter",
      },
    },
    {
      name: "Twitch Bio",
      platform: "twitch",
      icon: "twitch",
      isSystem: true,
      defaultParams: {
        utm_source: "twitch",
        utm_medium: "social",
        utm_campaign: "bio_link",
      },
    },
    {
      name: "Discord Server",
      platform: "discord",
      icon: "discord",
      isSystem: true,
      defaultParams: {
        utm_source: "discord",
        utm_medium: "community",
        utm_campaign: "discord_server",
      },
    },
    {
      name: "Reddit Post",
      platform: "reddit",
      icon: "reddit",
      isSystem: true,
      defaultParams: {
        utm_source: "reddit",
        utm_medium: "social",
        utm_campaign: "reddit_post",
      },
    },
    {
      name: "Pinterest Pin",
      platform: "pinterest",
      icon: "pinterest",
      isSystem: true,
      defaultParams: {
        utm_source: "pinterest",
        utm_medium: "social",
        utm_campaign: "pin",
      },
    },
    {
      name: "WhatsApp Status",
      platform: "whatsapp",
      icon: "whatsapp",
      isSystem: true,
      defaultParams: {
        utm_source: "whatsapp",
        utm_medium: "messaging",
        utm_campaign: "status",
      },
    },
    {
      name: "Telegram Channel",
      platform: "telegram",
      icon: "telegram",
      isSystem: true,
      defaultParams: {
        utm_source: "telegram",
        utm_medium: "messaging",
        utm_campaign: "channel",
      },
    },
  ];

  for (const template of utmTemplatesData) {
    try {
      await db.insert(utmTemplates).values(template).onConflictDoNothing();
      console.log(`✅ UTM template "${template.name}" inserted`);
    } catch (error) {
      console.error(
        `❌ Error inserting UTM template "${template.name}":`,
        error,
      );
    }
  }

  console.log("\n✅ Database seeding completed!");
}

seed()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
