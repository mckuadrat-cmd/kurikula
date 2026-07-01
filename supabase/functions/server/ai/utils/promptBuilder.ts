import { AISafety } from "./aiSafety.ts";

export class PromptBuilder {
  static build(skillPrompt: string, safetyRules: string[]): string {
    const safetySection = AISafety.getSafetyPrompt();
    const additionalSafety = safetyRules.map(r => `- ${r}`).join("\n");

    return `${skillPrompt}

==================================================
ATURAN KEAMANAN & PENCEGAHAN PROMPT INJECTION (WAJIB DIPATUHI):
${safetySection}
${additionalSafety}
==================================================`;
  }
}
