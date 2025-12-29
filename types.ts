export type FocusStatus = 'FOCUSED' | 'PARTIAL' | 'DISTRACTED';

export type DistractionType = 'NONE' | 'PHONE' | 'WEB_DISTRACTION' | 'TAB_SWITCH' | 'LOOKING_AWAY' | 'ABSENT';

export type DomainCategory = 'STUDY' | 'NON_STUDY' | 'NEUTRAL';

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Assignment {
  id: string;
  userId: string;
  name: string;
  dueDate: string;
  completed: boolean;
}

export interface Exam {
  id: string;
  userId: string;
  date: string;
}

export interface Project {
  id: string;
  userId: string;
  title: string;
  description?: string;
  status: 'active' | 'completed' | 'archived';
  createdAt: number;
}

export interface ContentSource {
  id: string;
  projectId: string;
  type: 'pdf' | 'youtube' | 'topic' | 'lecture';
  title: string;
  content: string;
  metadata: Record<string, any>;
  createdAt: number;
}

export interface LectureSession {
  id: string;
  projectId: string;
  title: string;
  transcript: string;
  audioUrl?: string;
  duration: number;
  status: 'recording' | 'processing' | 'completed' | 'failed';
  createdAt: number;
}

export interface LearningMaterial {
  id: string;
  projectId: string;
  type: string;
  content: string;
  createdAt: number;
}

export interface TimeSlice {
  timestamp: number;
  status: FocusStatus;
  distractionType: DistractionType;
  metadata?: {
    url?: string;
    domain?: string;
  };
}

export interface WebsiteVisit {
  domain: string;
  category: DomainCategory;
  duration: number; // seconds
}

export interface SessionData {
  id?: string;
  userId?: string;
  timestamp?: number; // date of session
  subject: string;
  topic: string;
  plannedMinutes: number;
  startTime: number | null;
  endTime: number | null;
  slices: TimeSlice[];
  metrics?: any; // Cached metrics for history view
}

export interface TrackingState {
  isFacePresent: boolean;
  isHeadDown: boolean; // "Severely" head down
  isLookingAtScreen: boolean;
  isPhoneDetected: boolean;
}

export interface BrowserState {
  url: string;
  domain: string;
  category: DomainCategory;
  title: string;
}

export const CONSTANTS = {
  // Relaxed thresholds to allow for reading notes on desk
  HEAD_DOWN_PITCH_THRESHOLD: 25,
  LOOKING_AWAY_YAW_THRESHOLD: 25,

  // Temporal smoothing constants
  POSE_BUFFER_SIZE: 15,
  PHONE_DETECTION_CONFIDENCE: 3,
};

// ===============================
// AI Tutor & Content Types
// ===============================

export interface Slide {
  title: string;
  content: string[];
}

export interface Flashcard {
  id: number;
  question: string;
  answer: string;
  tag: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface UserAnswer {
  question: string;
  options: string[];
  correctAnswer: string;
  userAnswer: string;
  isCorrect: boolean;
}

export interface LearningAnalysisReport {
  overallScore: number;
  engagementAndConfidence: {
    rating: 'Low' | 'Medium' | 'High';
    feedback: string;
  };
  knowledgeRetention: {
    score: number;
    feedback: string;
  };
  conceptualUnderstanding: {
    rating: 'Emerging' | 'Developing' | 'Proficient';
    feedback: string;
  };
  summary: string;
  weakTopics?: string[];
}

export interface VerbalTestTranscriptEntry {
  question: string;
  answer: string;
}

export interface GeneratedContent {
  summary?: string;
  flashcards?: Flashcard[];
  quiz?: QuizQuestion[];
  deepDive?: string;
  slides?: Slide[];
  verbalTestQuestions?: string[];
  learningAnalysis?: LearningAnalysisReport;
}

export interface Formula {
  name: string;
  latex: string;
  description: string;
}

export interface Concept {
  term: string;
  definition: string;
}

export interface Note {
  point: string;
  details?: string[];
}

export interface LectureAnalysis {
  title: string;
  summary: string;
  topics: string[];
  concepts: Concept[];
  formulas: Formula[];
  notes: Note[];
}

export interface ChatMessage {
  sender: 'user' | 'model';
  text: string;
  sources?: GroundingSource[];
}

export interface GroundingSource {
  uri: string;
  title: string;
}

// ===============================
// Career Planning Types
// ===============================

export interface UserPreferences {
  careerGoal: string;
  skillLevel: string;
  timeCommitment: string;
  learningStyle: string;
  learningMedium: string;
  timeline: string;
}

export interface SkillAssessmentQuestion {
  question: string;
  options: string[];
  correctAnswer?: string;
}

export interface SkillAssessmentAnswer {
  question: string;
  answer: string;
}

export interface RoadmapData {
  careerTitle: string;
  shortSummary: string;
  requiredSkills: { skill: string; description: string }[];
  skillBreakdown: {
    beginner: { skill: string; description: string }[];
    intermediate: { skill: string; description: string }[];
    advanced: { skill: string; description: string }[];
  };
  weeklyPlan: { week: number; goal: string; tasks: string[] }[];
  monthlyTimeline: { month: number; milestone: string; focus: string[] }[];
  resources: {
    courses: { title: string; url: string; platform: string }[];
    youtube: { channel: string; url: string; description: string }[];
    books: { title: string; author: string }[];
  };
  projects: {
    beginner: { title: string; description: string; requirements: string[]; outcome: string }[];
    intermediate: { title: string; description: string; requirements: string[]; outcome: string }[];
    advanced: { title: string; description: string; requirements: string[]; outcome: string }[];
  };
  internshipGuide: {
    requirements: string[];
    interviewPlan: { topic: string; focus: string }[];
    resumeTips: string[];
  };
}