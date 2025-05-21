
'use client';

import type { Task, Priority } from '@/lib/types';
import { TaskItem } from './TaskItem';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useMemo } from 'react';
import { ListFilter, Inbox, User, CalendarDays, AlertTriangleIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskListProps {
  tasks: Task[];
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onToggleReminder: (id: string) => void;
  highlightedTaskIds: string[];
  registerTaskItemRef: (id: string, element: HTMLDivElement | null) => void;
}

type ViewOption = 'assignee' | 'deadlineDate' | 'priorityLevel';

const priorityDisplayMap: Record<Priority, string> = {
  high: '높음',
  medium: '중간',
  low: '낮음',
};

interface ProcessedGroup {
  groupTitle: string;
  groupDisplayTitle: string;
  groupType: ViewOption;
  tasks: Task[];
}

export function TaskList({ tasks, highlightedTaskIds, registerTaskItemRef, ...itemProps }: TaskListProps) {
  const [viewOption, setViewOption] = useState<ViewOption>('assignee');

  const processedTasks = useMemo(() => {
    const initialSortedTasks = [...tasks].sort((a, b) => {
      if (a.completed && !b.completed) return -1;
      if (!a.completed && b.completed) return 1;
      return 0;
    });

    if (viewOption === 'assignee') {
      const groupedByAssignee = initialSortedTasks.reduce((acc, task) => {
        const key = task.assignee || '미지정';
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      return Object.keys(groupedByAssignee).sort().map(assigneeName => ({
        groupTitle: assigneeName,
        groupDisplayTitle: assigneeName,
        groupType: 'assignee' as const,
        tasks: groupedByAssignee[assigneeName].sort((a, b) => {
          if (a.completed && !b.completed) return -1;
          if (!a.completed && b.completed) return 1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        })
      }));
    }

    if (viewOption === 'deadlineDate') {
      const groupedByDeadline = initialSortedTasks.reduce((acc, task) => {
        const key = task.deadline; // YYYY-MM-DD
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      return Object.keys(groupedByDeadline)
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
        .map(deadline => ({
          groupTitle: deadline,
          groupDisplayTitle: format(new Date(deadline), 'yyyy년 M월 d일 (EEE)', { locale: ko }),
          groupType: 'deadlineDate' as const,
          tasks: groupedByDeadline[deadline].sort((a, b) => {
            if (a.completed && !b.completed) return -1;
            if (!a.completed && b.completed) return 1;
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
              return priorityOrder[a.priority] - priorityOrder[b.priority];
            }
            return a.assignee.localeCompare(b.assignee);
          })
        }));
    }

    if (viewOption === 'priorityLevel') {
      const groupedByPriority = initialSortedTasks.reduce((acc, task) => {
        const key = task.priority;
        if (!acc[key]) acc[key] = [];
        acc[key].push(task);
        return acc;
      }, {} as Record<string, Task[]>);

      const priorityOrderKeys: Priority[] = ['high', 'medium', 'low'];
      return priorityOrderKeys
        .filter(pKey => groupedByPriority[pKey])
        .map(priority => ({
          groupTitle: priority,
          groupDisplayTitle: `중요도: ${priorityDisplayMap[priority]}`,
          groupType: 'priorityLevel' as const,
          tasks: groupedByPriority[priority].sort((a, b) => {
            if (a.completed && !b.completed) return -1;
            if (!a.completed && b.completed) return 1;
            if (new Date(a.deadline).getTime() !== new Date(b.deadline).getTime()) {
              return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
            }
            return a.assignee.localeCompare(b.assignee);
          })
        }));
    }
    return [] as ProcessedGroup[];
  }, [tasks, viewOption]);

  if (!tasks || tasks.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        <Inbox className="mx-auto h-16 w-16 mb-4" />
        <p className="text-xl">아직 등록된 업무가 없습니다.</p>
        <p>새로운 업무를 추가하여 스케줄 관리를 시작해보세요!</p>
      </div>
    );
  }

  const getGroupIcon = (groupType: ViewOption) => {
    switch (groupType) {
      case 'assignee':
        return <User className="h-6 w-6 mr-3 text-primary" />;
      case 'deadlineDate':
        return <CalendarDays className="h-6 w-6 mr-3 text-primary" />;
      case 'priorityLevel':
        return <AlertTriangleIcon className="h-6 w-6 mr-3 text-primary" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end items-center">
        <ListFilter className="h-5 w-5 mr-2 text-muted-foreground" />
        <Select value={viewOption} onValueChange={(value) => setViewOption(value as ViewOption)}>
          <SelectTrigger className="w-[200px] bg-card">
            <SelectValue placeholder="보기 방식" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="assignee">담당자별 보기</SelectItem>
            <SelectItem value="deadlineDate">마감일별 보기</SelectItem>
            <SelectItem value="priorityLevel">중요도별 보기</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {processedTasks.map(group => (
        <Card key={`${group.groupType}-${group.groupTitle}`} className="shadow-lg border-border">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl flex items-center">
              {getGroupIcon(group.groupType)}
              {group.groupDisplayTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {group.tasks && group.tasks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {group.tasks.map((task) => (
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
              <p className="text-muted-foreground">이 그룹에는 현재 표시할 업무가 없습니다.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
