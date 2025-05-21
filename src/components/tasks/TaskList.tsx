'use client';

import type { Task } from '@/lib/types';
import { TaskItem } from './TaskItem';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { ListFilter, Inbox } from 'lucide-react';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onToggleReminder: (id: string) => void;
}

type SortOption = 'deadline' | 'assignee' | 'priority' | 'default';

export function TaskList({ tasks, ...itemProps }: TaskListProps) {
  const [sortOption, setSortOption] = useState<SortOption>('default');

  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.completed && !b.completed) return 1;
    if (!a.completed && b.completed) return -1;

    switch (sortOption) {
      case 'deadline':
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      case 'assignee':
        return a.assignee.localeCompare(b.assignee);
      case 'priority':
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      default: // 'default' or creation order (implicitly handled by not re-sorting if IDs are sequential)
        return 0; 
    }
  });

  if (tasks.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Inbox className="mx-auto h-16 w-16 mb-4" />
        <p className="text-xl">아직 등록된 업무가 없습니다.</p>
        <p>새로운 업무를 추가하여 스케줄 관리를 시작해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end items-center">
        <ListFilter className="h-5 w-5 mr-2 text-muted-foreground" />
        <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="정렬 기준" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">기본 정렬</SelectItem>
            <SelectItem value="deadline">마감일 순</SelectItem>
            <SelectItem value="assignee">담당자 순</SelectItem>
            <SelectItem value="priority">중요도 순</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedTasks.map((task) => (
          <TaskItem key={task.id} task={task} {...itemProps} />
        ))}
      </div>
    </div>
  );
}
