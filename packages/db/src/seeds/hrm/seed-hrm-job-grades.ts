export interface HrmJobGradeSeed {
  gradeCode: string;
  gradeName: string;
  gradeRank: number;
  minSalaryAmount: string;
  midSalaryAmount: string;
  maxSalaryAmount: string;
}

export const hrmJobGradeSeeds: readonly HrmJobGradeSeed[] = [
  {
    gradeCode: "G05",
    gradeName: "Professional I",
    gradeRank: 5,
    minSalaryAmount: "45000.00",
    midSalaryAmount: "60000.00",
    maxSalaryAmount: "75000.00",
  },
  {
    gradeCode: "G07",
    gradeName: "Senior Professional",
    gradeRank: 7,
    minSalaryAmount: "70000.00",
    midSalaryAmount: "90000.00",
    maxSalaryAmount: "110000.00",
  },
  {
    gradeCode: "G09",
    gradeName: "Manager",
    gradeRank: 9,
    minSalaryAmount: "100000.00",
    midSalaryAmount: "125000.00",
    maxSalaryAmount: "150000.00",
  },
];
