export interface MenuOption {
  id: number;
  title: string;
  description: string;
  /** Exact text sent as the user's turn when this option is picked — mirrors the option name in lib/system-prompt.ts so the model recognizes it. */
  prompt: string;
}

export const MENU_OPTIONS: MenuOption[] = [
  {
    id: 1,
    title: "Lead Generation Strategy",
    description: "A full personalized acquisition strategy end to end.",
    prompt: "1. Lead Generation Strategy",
  },
  {
    id: 2,
    title: "Core Four Assessment",
    description: "Score warm, content, cold, and paid outreach for your business.",
    prompt: "2. Core Four Assessment",
  },
  {
    id: 3,
    title: "Lead Magnet Generator",
    description: "Concepts for a lead magnet built around your audience and offer.",
    prompt: "3. Lead Magnet Generator",
  },
  {
    id: 4,
    title: "Content Strategy",
    description: "Topics, hooks, and a realistic publishing cadence.",
    prompt: "4. Content Strategy",
  },
  {
    id: 5,
    title: "Warm Outreach System",
    description: "Scripts and process for contacts, past customers, and your network.",
    prompt: "5. Warm Outreach System",
  },
  {
    id: 6,
    title: "Cold Outreach System",
    description: "Prospecting criteria, scripts, and follow-up for cold contacts.",
    prompt: "6. Cold Outreach System",
  },
  {
    id: 7,
    title: "Paid Advertising Strategy",
    description: "Ad angles, offer, testing plan, and budget framework.",
    prompt: "7. Paid Advertising Strategy",
  },
  {
    id: 8,
    title: "Lead Getter System",
    description: "Turn customers, employees, and partners into referral sources.",
    prompt: "8. Lead Getter System",
  },
  {
    id: 9,
    title: "Lead Generation Audit",
    description: "Diagnose your current system and find the biggest bottleneck.",
    prompt: "9. Lead Generation Audit",
  },
  {
    id: 10,
    title: "30-Day Lead Generation Plan",
    description: "A week-by-week implementation plan you can start now.",
    prompt: "10. 30-Day Lead Generation Plan",
  },
  {
    id: 11,
    title: "Generate Everything",
    description: "The full personalized playbook, prioritized into start now / test later / ignore.",
    prompt: "11. Generate Everything",
  },
];
