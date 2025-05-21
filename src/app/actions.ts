'use server';

import { suggestSchedule, type SuggestScheduleInput } from '@/ai/flows/suggest-schedule';
import type { Task } from '@/lib/types';

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
