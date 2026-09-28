export interface AiProvider {
  isConfigured(): boolean;
  generateSummary(context: any, promptType: 'PROJECT' | 'MANAGER' | 'EMPLOYEE'): Promise<string>;
}

export class DefaultAiProvider implements AiProvider {
  isConfigured(): boolean {
    return false;
  }

  async generateSummary(context: any, promptType: 'PROJECT' | 'MANAGER' | 'EMPLOYEE'): Promise<string> {
    return "Assistive AI is currently unavailable as no provider is configured. The factual data context was gathered successfully but could not be summarized.";
  }
}
