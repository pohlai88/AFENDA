export interface RecordAttendanceInput {
  employmentId: string;
  workDate: string;
  attendanceStatus: string;
  checkInAt?: string;
  checkOutAt?: string;
  source?: string;
}

export interface RecordAttendanceOutput {
  attendanceRecordId: string;
  employmentId: string;
  workDate: string;
  attendanceStatus: string;
}
