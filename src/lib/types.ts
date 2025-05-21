
export type Priority = 'high' | 'medium' | 'low';

export interface Task {
  id: string;
  name: string;
  assignee: string;
  deadline: string; // YYYY-MM-DD format
  priority: Priority;
  completed: boolean;
  completionDate?: string; // ISO string, e.g., new Date().toISOString()
  enableReminders: boolean;
}

