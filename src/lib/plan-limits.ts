// Plan limits configuration — single source of truth
export const PLAN_LIMITS = {
  free: {
    label: "Free",
    credits: 10,
    voiceCharacters: 3000,
    maxVideoDownloads: 3,
    tools: ["text", "image"],
    features: ["Text AI", "Image AI"],
    restricted: ["video", "voice", "caption-eraser", "video-translator", "video-downloader"],
  },
  starter: {
    label: "Starter",
    credits: 150,
    voiceCharacters: 50000,
    maxVideoDownloads: 30,
    tools: ["text", "image", "video", "voice", "video-downloader"],
    features: ["Text AI", "Image AI", "Video AI", "Voice AI", "Video Downloader"],
    restricted: ["caption-eraser", "video-translator"],
  },
  creator_pro: {
    label: "Creator PRO",
    credits: 400,
    voiceCharacters: 150000,
    maxVideoDownloads: 100,
    tools: ["text", "image", "video", "voice", "caption-eraser", "video-translator", "video-downloader"],
    features: ["All Tools"],
    restricted: [],
  },
  agency: {
    label: "Agency",
    credits: 1500,
    voiceCharacters: 500000,
    maxVideoDownloads: -1, // unlimited
    tools: ["text", "image", "video", "voice", "caption-eraser", "video-translator", "video-downloader"],
    features: ["All Tools", "Commercial License", "VIP Support"],
    restricted: [],
  },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function getPlanLimits(plan: string) {
  return PLAN_LIMITS[(plan as PlanKey)] ?? PLAN_LIMITS.free;
}

export function canUseTool(plan: string, tool: string): boolean {
  const limits = getPlanLimits(plan);
  return limits.tools.includes(tool);
}

// Map tool routes to tool keys
export const ROUTE_TO_TOOL: Record<string, string> = {
  "/studio/text": "text",
  "/studio/image": "image",
  "/studio/video": "video",
  "/voice-studio": "voice",
  "/caption-eraser": "caption-eraser",
  "/video-translator": "video-translator",
  "/video-downloader": "video-downloader",
};
