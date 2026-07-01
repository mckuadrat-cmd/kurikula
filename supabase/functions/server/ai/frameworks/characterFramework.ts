import characterIndicators from "../knowledge/characterIndicators.json" assert { type: "json" };

export interface CharacterInput {
  targetKarakter: string;
}

export interface CharacterOutput {
  characterName: string;
  behaviorIndicators: string[];
  observationMethod: string;
  reflectionQuestions: string[];
  reinforcementStrategies: string[];
}

export class CharacterFramework {
  static analyze(input: CharacterInput): CharacterOutput {
    const requestedChar = input.targetKarakter || "Kolaborasi";
    const keys = Object.keys(characterIndicators);
    
    // Cari key terdekat yang cocok
    let matchedKey = "Kolaborasi";
    for (const key of keys) {
      if (requestedChar.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(requestedChar.toLowerCase())) {
        matchedKey = key;
        break;
      }
    }

    const data = (characterIndicators as any)[matchedKey] || (characterIndicators as any)["Kolaborasi"];

    return {
      characterName: matchedKey,
      behaviorIndicators: data.indicators,
      observationMethod: data.observation_method,
      reflectionQuestions: data.reflection_questions,
      reinforcementStrategies: data.reinforcement_strategies
    };
  }
}
