
'use client';

import type { Task } from '@/lib/types';
import { TaskItem } from './TaskItem';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { ListFilter, Inbox, User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onToggleReminder: (id: string) => void;
  highlightedTaskIds: string[];
  registerTaskItemRef: (id: string, element: HTMLDivElement | null) => void;
}

type SortOption = 'deadline' | 'priority' | 'default'; 

export function TaskList({ tasks, highlightedTaskIds, registerTaskItemRef, ...itemProps }: TaskListProps) {
  const [sortOption, setSortOption] = useState<SortOption>('default');

  const groupedAndSortedTasks = useMemo(() => {
    const validTasks = tasks || []; 
    const groupedByAssignee: Record<string, Task[]> = validTasks.reduce((acc, task) => {
      const assigneeKey = task.assignee || '미지정'; 
      if (!acc[assigneeKey]) {
        acc[assigneeKey] = [];
      }
      acc[assigneeKey].push(task);
      return acc;
    }, {} as Record<string, Task[]>);

    for (const assignee in groupedByAssignee) {
      groupedByAssignee[assignee].sort((a, b) => {
        // Sort completed tasks to the top
        if (a.completed && !b.completed) return -1;
        if (!a.completed && b.completed) return 1;
        
        // If completion status is the same, sort by selected option
        if (a.completed === b.completed) {
          switch (sortOption) {
            case 'deadline':
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            case 'priority':
              const priorityOrder = { high: 0, medium: 1, low: 2 };
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            default: // 'default' sort (e.g., after completion status, by deadline)
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
          }
        }
        return 0; 
      });
    }
    return groupedByAssignee;
  }, [tasks, sortOption]);

  const assignees = Object.keys(groupedAndSortedTasks).sort();

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Inbox className="mx-auto h-16 w-16 mb-4" />
        <p className="text-xl">아직 등록된 업무가 없습니다.</p>
        <p>새로운 업무를 추가하여 스케줄 관리를 시작해보세요!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-end items-center">
        <ListFilter className="h-5 w-5 mr-2 text-muted-foreground" />
        <Select value={sortOption} onValueChange={(value) => setSortOption(value as SortOption)}>
          <SelectTrigger className="w-[180px] bg-card">
            <SelectValue placeholder="정렬 기준" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">기본 정렬 (완료 우선)</SelectItem>
            <SelectItem value="deadline">마감일 순</SelectItem>
            <SelectItem value="priority">중요도 순</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {assignees.map(assignee => (
        <Card key={assignee} className="shadow-lg border-border">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl flex items-center">
              <User className="h-6 w-6 mr-3 text-primary" />
              {assignee}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {groupedAndSortedTasks[assignee] && groupedAndSortedTasks[assignee].length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groupedAndSortedTasks[assignee].map((task) => (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    {...itemProps} 
                    isHighlighted={highlightedTaskIds.includes(task.id)}
                    registerRef={registerTaskItemRef}
                  />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">이 담당자에게는 현재 할당된 업무가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
