export interface CodePayload {
  code: string;
  language: string;
  action: 'OVERWRITE' | 'HIGHLIGHT' | 'APPEND' | 'NONE';
  highlightLines?: number[];
}

export interface AcademicPlanData {
  focusArea: string;
  todayPlan: string;
  weeklyGoals: string; // The full AI-generated day-by-day string
  studyTips: string;
  aiGenerated: boolean;
  emotion?: string;
  mascotAction?: string;
}

export interface WellnessData {
  suggestion: string;
  note: string;
  actionItems: string;
  aiGenerated: boolean;
  emotion?: string;
  mascotAction?: string;
}
