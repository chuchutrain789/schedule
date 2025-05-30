
'use client';

import type { Task, Priority } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Edit3, Trash2, User, CalendarClock, AlertTriangle, Bell, BellOff, CheckCircle2, Undo2, StickyNote } from 'lucide-react';
import { format, isPast, isToday, differenceInCalendarDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useRef, useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface TaskItemProps {
  task: Task;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  onToggleReminder: (id: string) => void;
  isHighlighted: boolean;
  registerRef: (id: string, element: HTMLDivElement | null) => void;
}

const priorityMap: Record<Priority, { label: string; color: string }> = {
  high: { label: '높음', color: 'bg-red-500' },
  medium: { label: '중간', color: 'bg-yellow-500' },
  low: { label: '낮음', color: 'bg-green-500' },
};

export function TaskItem({ task, onToggleComplete, onDelete, onEdit, onToggleReminder, isHighlighted, registerRef }: TaskItemProps) {
  const deadlineDate = new Date(task.deadline);
  const isTaskOverdue = !task.completed && isPast(deadlineDate) && !isToday(deadlineDate);
  const isTaskDueToday = !task.completed && isToday(deadlineDate);
  const daysRemaining = differenceInCalendarDays(deadlineDate, new Date());
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  let deadlineBadgeVariant: "default" | "secondary" | "destructive" | "outline" = "secondary";
  let deadlineText = format(deadlineDate, 'yyyy년 M월 d일', { locale: ko });

  if (task.completed) {
    deadlineBadgeVariant = "default";
    deadlineText = `완료됨 - ${deadlineText}`;
  } else if (isTaskOverdue) {
    deadlineBadgeVariant = "destructive";
    deadlineText = `마감 초과! - ${deadlineText}`;
  } else if (isTaskDueToday) {
    deadlineBadgeVariant = "outline";
    deadlineText = `오늘 마감! - ${deadlineText}`;
  } else if (daysRemaining >= 0 && daysRemaining <= 3) {
     deadlineBadgeVariant = "outline";
     deadlineText = `${daysRemaining}일 남음 - ${deadlineText}`;
  }

  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    registerRef(task.id, cardRef.current);
    return () => {
      registerRef(task.id, null);
    };
  }, [task.id, registerRef]);

  const handleDeleteConfirm = () => {
    onDelete(task.id);
    setIsDeleteDialogOpen(false);
  };


  return (
    <Card
      ref={cardRef}
      className={cn(
        "shadow-lg transition-all duration-300 flex flex-col justify-between h-full",
        task.completed ? 'bg-muted/50 opacity-70' : 'bg-card',
        isTaskOverdue ? "border-destructive" : (isTaskDueToday || (daysRemaining >=0 && daysRemaining <=3 && !task.completed)) ? "border-accent" : "",
        isHighlighted && 'task-highlight'
      )}
    >
      <div>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <Checkbox
                id={`task-${task.id}-complete`}
                checked={task.completed}
                onCheckedChange={() => onToggleComplete(task.id)}
                aria-label="업무 완료 토글"
              />
              <CardTitle className={cn("text-xl", task.completed && 'line-through text-muted-foreground')}>
                {task.name}
              </CardTitle>
            </div>
            <Badge variant={priorityMap[task.priority].color as any} className={`text-white ${priorityMap[task.priority].color}`}>
              <AlertTriangle className="h-3 w-3 mr-1" />
              {priorityMap[task.priority].label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground pb-4">
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2 text-accent" />
            담당자: {task.assignee}
          </div>
          <div className="flex items-center">
            <CalendarClock className="h-4 w-4 mr-2 text-accent" />
            마감일: <Badge variant={deadlineBadgeVariant} className={cn("ml-1", (isTaskDueToday || (daysRemaining >=0 && daysRemaining <=3 && !task.completed)) && "border-accent text-accent")}>{deadlineText}</Badge>
          </div>
          {task.notes && (
            <div className="flex items-start pt-1">
              <StickyNote className="h-4 w-4 mr-2 text-accent mt-0.5" />
              <p className="whitespace-pre-wrap break-words text-sm">{task.notes}</p>
            </div>
          )}
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id={`reminder-${task.id}`}
              checked={task.enableReminders}
              onCheckedChange={() => onToggleReminder(task.id)}
              aria-label="마감 알림 토글"
            />
            <Label htmlFor={`reminder-${task.id}`} className="flex items-center">
              {task.enableReminders ? <Bell className="h-4 w-4 mr-1 text-accent" /> : <BellOff className="h-4 w-4 mr-1" />}
               마감 알림 {task.enableReminders ? "활성" : "비활성"}
            </Label>
          </div>
        </CardContent>
      </div>
      <CardFooter className="flex flex-col items-stretch pt-0">
        <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleComplete(task.id)}
            aria-label={task.completed ? "업무를 미완료로 표시" : "업무를 완료로 표시"}
            className={cn(
                "transition-colors w-full mb-2",
                task.completed
                ? "border-yellow-500 text-yellow-600 hover:bg-yellow-500/10 focus:ring-yellow-400"
                : "border-green-500 text-green-600 hover:bg-green-500/10 focus:ring-green-400"
            )}
        >
            {task.completed ? <Undo2 className="h-4 w-4 mr-1" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
            {task.completed ? '미완료' : '완료'}
        </Button>
        <div className="flex justify-end space-x-2 w-full">
          <Button variant="outline" size="sm" onClick={() => onEdit(task)} aria-label="업무 수정" className="flex-grow sm:flex-grow-0">
            <Edit3 className="h-4 w-4 mr-1" /> 수정
          </Button>
          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" aria-label="업무 삭제" className="flex-grow sm:flex-grow-0">
                <Trash2 className="h-4 w-4 mr-1" /> 삭제
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>정말 삭제하시겠습니까?</AlertDialogTitle>
                <AlertDialogDescription>
                  이 작업은 되돌릴 수 없습니다. "{task.name}" 업무가 영구적으로 삭제됩니다.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>취소</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm}>삭제 확인</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
