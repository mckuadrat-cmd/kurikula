import { AISkill } from "../skills/baseSkill.ts";
import { LessonPlannerSkill } from "../skills/lessonPlannerSkill.ts";
import { SemesterPlannerSkill } from "../skills/semesterPlannerSkill.ts";
import { TeachingMaterialSkill } from "../skills/teachingMaterialSkill.ts";
import { WorksheetSkill } from "../skills/worksheetSkill.ts";
import { AssessmentSkill } from "../skills/assessmentSkill.ts";
import { StudentCommentSkill } from "../skills/studentCommentSkill.ts";
import { LearningAnalysisSkill } from "../skills/learningAnalysisSkill.ts";
import { TeacherReflectionSkill } from "../skills/teacherReflectionSkill.ts";
import { EducationalReviewerSkill } from "../skills/educationalReviewerSkill.ts";
import { RubricSkill } from "../skills/rubricSkill.ts";
import { ClassDiagnosticSkill } from "../skills/classDiagnosticSkill.ts";

export class SkillRegistry {
  private static skills: Record<string, AISkill> = {
    "lesson-planner": new LessonPlannerSkill(),
    "semester-planner": new SemesterPlannerSkill(),
    "teaching-material": new TeachingMaterialSkill(),
    "lkpd": new WorksheetSkill(),
    "assessment": new AssessmentSkill(),
    "student-comment": new StudentCommentSkill(),
    "learning-analysis": new LearningAnalysisSkill(),
    "teacher-reflection": new TeacherReflectionSkill(),
    "educational-reviewer": new EducationalReviewerSkill(),
    "rubric-generator": new RubricSkill(),
    "class-diagnostic": new ClassDiagnosticSkill()
  };

  // Helper to map legacy types to new skill IDs
  private static typeMapping: Record<string, string> = {
    "modul_ajar": "lesson-planner",
    "lesson-plan": "lesson-planner",
    "lesson_plan": "lesson-planner",
    "semester-plan": "semester-planner",
    "semester_plan": "semester-planner",
    "bahan_ajar": "teaching-material",
    "teaching-material": "teaching-material",
    "teaching_material": "teaching-material",
    "worksheet": "lkpd",
    "lkpd": "lkpd",
    "soal": "assessment",
    "assessment": "assessment",
    "student-comment": "student-comment",
    "student_comment": "student-comment",
    "studentcomment": "student-comment",
    "learning-analysis": "learning-analysis",
    "learning_analysis": "learning-analysis",
    "learninganalysis": "learning-analysis",
    "teacher-reflection": "teacher-reflection",
    "teacher_reflection": "teacher-reflection",
    "teacherreflection": "teacher-reflection",
    "educational-reviewer": "educational-reviewer",
    "educational_reviewer": "educational-reviewer",
    "educationalreviewer": "educational-reviewer",
    "rubric-generator": "rubric-generator",
    "rubric_generator": "rubric-generator",
    "rubricgenerator": "rubric-generator",
    "class-diagnostic": "class-diagnostic",
    "class_diagnostic": "class-diagnostic",
    "classdiagnostic": "class-diagnostic"
  };

  static getSkill(type: string): AISkill | null {
    const cleanType = type.toLowerCase();
    const skillId = this.typeMapping[cleanType] || cleanType;
    return this.skills[skillId] || null;
  }

  static getRegisteredSkills(): AISkill[] {
    return Object.values(this.skills);
  }
}
