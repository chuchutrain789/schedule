'use server';

import { suggestSchedule, type SuggestScheduleInput } from '@/ai/flows/suggest-schedule';
import type { Task, Priority } from '@/lib/types';

export async function getAiScheduleAction(tasks: Task[]): Promise<string> {
  if (!tasks || tasks.length === 0) {
    return '추천할 스케줄을 만들기 위한 업무가 없습니다. 먼저 업무를 추가해주세요.';
  }

  const formattedTasks: SuggestScheduleInput['tasks'] = tasks
    .filter(task => !task.completed) // Only suggest for incomplete tasks
    .map(task => ({
    name: task.name,
    assignee: task.assignee,
    deadline: task.deadline,
    priority: task.priority,
  }));

  if (formattedTasks.length === 0) {
    return '완료되지 않은 업무가 없어 스케줄을 추천할 수 없습니다.';
  }

  try {
    const result = await suggestSchedule({ tasks: formattedTasks });
    return result.scheduleSuggestions;
  } catch (error) {
    console.error('Error getting AI schedule suggestion:', error);
    return 'AI 스케줄 추천을 받는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
}

// --- Task Management Actions (Backend Integration Placeholders) ---
// These actions would eventually interact with a database like Firebase Firestore.

export async function getTasksAction(): Promise<Task[]> {
  console.warn('getTasksAction: Backend not implemented. Returning empty array. This function would fetch tasks from a database.');
  // TODO: Replace with actual database call (e.g., Firebase Firestore)
  return [];
}

export async function addTaskAction(
  taskData: Omit<Task, 'id' | 'completed' | 'enableReminders' | 'completionDate'>
): Promise<Task> {
  console.warn('addTaskAction: Backend not implemented. Returning mock task with generated ID. This function would add a task to a database.');
  // TODO: Replace with actual database call
  const newTask: Task = {
    ...taskData, // name, assignee, deadline, priority, notes
    id: crypto.randomUUID(),
    completed: false,
    enableReminders: true, // Default value, or could be part of taskData if form supports it
    completionDate: undefined,
  };
  return newTask;
}

export async function updateTaskAction(task: Task): Promise<Task> {
  console.warn('updateTaskAction: Backend not implemented. Returning provided task. This function would update a task in a database.');
  // TODO: Replace with actual database call
  return task;
}

export async function deleteTaskAction(taskId: string): Promise<void> {
  console.warn('deleteTaskAction: Backend not implemented. This function would delete a task from a database.');
  // TODO: Replace with actual database call
}

// --- Assignee Management Actions (Backend Integration Placeholders) ---
// These actions would also interact with a database for persistent, shared assignee lists.

export async function getAssigneesAction(): Promise<string[]> {
  console.warn('getAssigneesAction: Backend not implemented. Returning empty array. This function would fetch assignees from a database.');
  // TODO: Replace with actual database call
  return [];
}

export async function addAssigneeAction(assigneeName: string): Promise<string[]> {
   console.warn('addAssigneeAction: Backend not implemented. Returning mock updated list. This function would add an assignee to a database.');
   // TODO: Replace with actual database call
   // For now, let's assume it returns the current list with the new assignee (if it were fetched and updated)
   return [assigneeName]; // Highly simplified placeholder
}

export async function removeAssigneeAction(assigneeName: string): Promise<string[]> {
  console.warn('removeAssigneeAction: Backend not implemented. Returning empty array as placeholder. This function would remove an assignee from a database.');
  // TODO: Replace with actual database call
  return []; // Highly simplified placeholder
}
