export type PlantHealth = 'healthy' | 'affected';

export interface PlantAnalysis {
  plantName: string;
  health: PlantHealth;
  healthLabel: string;
  possibleIssue: string;
  summary: string;
  recommendations: string[];
  isMock: boolean;
}
