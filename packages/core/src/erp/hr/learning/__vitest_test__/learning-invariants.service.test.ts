import { describe, expect, it } from "vitest";
import { createCourse } from "../services/create-course.service.js";
import { createCourseSession } from "../services/create-course-session.service.js";
import { enrollLearner } from "../services/enroll-learner.service.js";
import { recordCompletion } from "../services/record-completion.service.js";
import { recordCertification } from "../services/record-certification.service.js";

describe("Learning services invariants", () => {
  it("createCourse returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await createCourse(db, "org-1", "actor-1", "corr-1", {
      courseCode: "",
      courseName: "",
      courseType: "self_paced",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("createCourseSession returns err when courseId is missing", async () => {
    const db = {} as any;
    const result = await createCourseSession(db, "org-1", "actor-1", "corr-1", {
      courseId: "",
      sessionDate: "2025-01-15",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("enrollLearner returns err when employmentId is missing", async () => {
    const db = {} as any;
    const result = await enrollLearner(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      courseId: "course-1",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("recordCompletion returns err when enrollmentId is missing", async () => {
    const db = {} as any;
    const result = await recordCompletion(db, "org-1", "actor-1", "corr-1", {
      enrollmentId: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });

  it("recordCertification returns err when required fields are missing", async () => {
    const db = {} as any;
    const result = await recordCertification(db, "org-1", "actor-1", "corr-1", {
      employmentId: "",
      certificationCode: "",
      issuedAt: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe("HRM_INVALID_INPUT");
    }
  });
});
