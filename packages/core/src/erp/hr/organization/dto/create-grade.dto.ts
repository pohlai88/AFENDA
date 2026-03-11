export interface CreateGradeInput {
  gradeCode?: string;
  gradeName: string;
  gradeRank?: number;
  minSalaryAmount?: string;
  midSalaryAmount?: string;
  maxSalaryAmount?: string;
}

export interface CreateGradeOutput {
  gradeId: string;
  gradeCode: string;
}