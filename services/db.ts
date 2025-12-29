
import { User, SessionData } from '../types';

const API_URL = 'http://localhost:3001/api';

// ==========================================
// MOCK DATA FOR DEMONSTRATION
// ==========================================

const MOCK_PROJECTS = [
  {
    id: 'p1',
    userId: 'mock-user',
    title: 'Introduction to Psychology',
    description: 'Fundamentals of human behavior, cognition, and emotion. Covering key theories from Freud, Skinner, and Piaget.',
    status: 'active',
    createdAt: Date.now() - 10000000
  },
  {
    id: 'p2',
    userId: 'mock-user',
    title: 'Data Structures & Algorithms',
    description: 'In-depth study of trees, graphs, dynamic programming, and sorting algorithms. Preparation for technical interviews.',
    status: 'active',
    createdAt: Date.now() - 5000000
  },
  {
    id: 'p3',
    userId: 'mock-user',
    title: 'Modern Art History',
    description: 'Exploration of art movements from Impressionism to Contemporary Art. Focus on visual analysis and historical context.',
    status: 'completed',
    createdAt: Date.now() - 20000000
  }
];

const MOCK_CONTENT = [
  // Psychology
  { id: 'c1', projectId: 'p1', title: 'Chapter 1: The Brain', type: 'pdf', content: 'Neuron structure...', createdAt: Date.now() - 900000 },
  { id: 'c2', projectId: 'p1', title: 'Crash Course Psychology #1', type: 'youtube', url: 'https://youtube.com/...', createdAt: Date.now() - 800000 },
  // DSA
  { id: 'c3', projectId: 'p2', title: 'Introduction to Graphs', type: 'text', content: 'Nodes and Edges...', createdAt: Date.now() - 400000 },
  { id: 'c4', projectId: 'p2', title: 'Sorting Visalizations', type: 'youtube', url: 'https://youtube.com/...', createdAt: Date.now() - 300000 },
];

const MOCK_LECTURES = [
  // Psychology
  { id: 'l1', projectId: 'p1', title: 'Lecture 3: Operant Conditioning', duration: 3400, status: 'processed', createdAt: Date.now() - 600000 },
  { id: 'l2', projectId: 'p1', title: 'Guest Speaker: Dr. Phil', duration: 1200, status: 'processing', createdAt: Date.now() - 100000 },
  // DSA
  { id: 'l3', projectId: 'p2', title: 'Merge Sort Deep Dive', duration: 4500, status: 'processed', createdAt: Date.now() - 200000 },
];

const MOCK_MATERIALS = [
  // Psychology
  { id: 'm1', projectId: 'p1', title: 'Brain Anatomy Flashcards', type: 'flashcards', data: { cards: [] }, createdAt: Date.now() - 500000 },
  { id: 'm2', projectId: 'p1', title: 'Behaviorism Quiz', type: 'quiz', data: { questions: [] }, createdAt: Date.now() - 400000 },
  // DSA
  { id: 'm3', projectId: 'p2', title: 'Big O Cheat Sheet', type: 'summary', content: '...', createdAt: Date.now() - 100000 },
];

export const db = {
  // USER AUTH
  async login(email: string): Promise<User | null> {
    return null;
  },

  async register(name: string, email: string): Promise<User> {
    const id = btoa(email); // Simple ID generation
    const user = { id, name, email };
    await fetch(`${API_URL}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    localStorage.setItem('intellistudy_current_user', JSON.stringify(user));
    return user;
  },

  getCurrentUser(): User | null {
    const stored = localStorage.getItem('intellistudy_current_user');
    return stored ? JSON.parse(stored) : null;
  },

  logout() {
    localStorage.removeItem('intellistudy_current_user');
  },

  // SESSIONS
  async saveSession(session: SessionData, userId: string) {
    const sessionWithId = { ...session, id: session.id || crypto.randomUUID(), userId };
    await fetch(`${API_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sessionWithId)
    });
  },

  async getUserHistory(userId: string): Promise<SessionData[]> {
    try {
      const res = await fetch(`${API_URL}/sessions/${userId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  // ASSIGNMENTS
  async getAssignments(userId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_URL}/assignments/${userId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  async addAssignment(assignment: any) {
    const newAssignment = { ...assignment, id: crypto.randomUUID() };
    await fetch(`${API_URL}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newAssignment)
    });
    return newAssignment;
  },

  // EXAMS
  async getExams(userId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_URL}/exams/${userId}`);
      if (!res.ok) return [];
      return await res.json();
    } catch (e) {
      return [];
    }
  },

  async addExam(exam: any) {
    const newExam = { ...exam, id: crypto.randomUUID() };
    await fetch(`${API_URL}/exams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExam)
    });
    return newExam;
  },

  // PROJECTS (with MOCK fallback)
  async getProjects(userId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_URL}/projects/${userId}`);
      const apiData = await res.json();
      const realProjects = Array.isArray(apiData) ? apiData : [];

      // Combine real and mock projects
      const allProjects = [...realProjects, ...MOCK_PROJECTS];

      // Deduplicate by title (keep the first occurrence)
      const uniqueProjects = Array.from(new Map(allProjects.map(item => [item.title, item])).values());

      return uniqueProjects;
    } catch (e) {
      console.warn("Using Mock Projects due to API error");
      return MOCK_PROJECTS;
    }
  },

  async createProject(project: any) {
    const newProject = { ...project, id: crypto.randomUUID(), createdAt: Date.now() };
    await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProject)
    });
    return newProject;
  },

  async getContentSources(projectId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/content`);
      const data = await res.json();
      if (data && data.length > 0) return data;
      return MOCK_CONTENT.filter(c => c.projectId === projectId);
    } catch (e) {
      return MOCK_CONTENT.filter(c => c.projectId === projectId);
    }
  },

  async createContentSource(source: any) {
    const newSource = { ...source, id: crypto.randomUUID(), createdAt: Date.now() };
    await fetch(`${API_URL}/content`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSource)
    });
    return newSource;
  },

  async getProjectLectureSessions(projectId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/lectures`);
      const data = await res.json();
      if (data && data.length > 0) return data;
      return MOCK_LECTURES.filter(l => l.projectId === projectId);
    } catch (e) {
      return MOCK_LECTURES.filter(l => l.projectId === projectId);
    }
  },

  async createLectureSession(session: any) {
    const newSession = { ...session, id: crypto.randomUUID(), createdAt: Date.now() };
    await fetch(`${API_URL}/lectures`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession)
    });
    return newSession;
  },

  async getLearningMaterials(projectId: string): Promise<any[]> {
    try {
      const res = await fetch(`${API_URL}/projects/${projectId}/materials`);
      const data = await res.json();
      if (data && data.length > 0) return data;
      return MOCK_MATERIALS.filter(m => m.projectId === projectId);
    } catch (e) {
      return MOCK_MATERIALS.filter(m => m.projectId === projectId);
    }
  },

  async createLearningMaterial(material: any) {
    const newMaterial = { ...material, id: crypto.randomUUID(), createdAt: Date.now() };
    await fetch(`${API_URL}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMaterial)
    });
    return newMaterial;
  },

  async getAssessmentResults(projectId: string): Promise<any[]> {
    // Mock implementation for analytics
    return [];
  }
};