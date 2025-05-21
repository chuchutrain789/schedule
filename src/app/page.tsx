
'use client';

import { useState, useEffect, useMemo, useCallback, useRef }  from 'react';
import type { Task, Priority } from '@/lib/types';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskList } from '@/components/tasks/TaskList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Calendar as CalendarIconShad, Wand2, PlusSquare } from 'lucide-react';
import { AppHeader } from '@/components/common/Header';
import { AiSchedulerModal } from '@/components/tasks/AiSchedulerModal';
import { getAiScheduleAction } from './actions';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar'; // Shadcn Calendar
import { ko } from 'date-fns/locale';
import { format } from 'date-fns';
import type { DayContentProps, DayModifiers } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox"; // 추가된 import

const assigneeColors: Record<string, string> = {
  '최준원': 'bg-sky-200 text-sky-800',
  '백옥주': 'bg-pink-200 text-pink-800',
  '추효정': 'bg-lime-200 text-lime-800',
  '추성욱': 'bg-purple-200 text-purple-800',
  '신미경': 'bg-orange-200 text-orange-800',
  '추상훈': 'bg-teal-200 text-teal-800',
  '미지정': 'bg-gray-300 text-gray-800',
};

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskFormModalOpen, setIsTaskFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSchedule, setAiSchedule] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<string[]>([]);
  const taskItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const registerTaskItemRef = useCallback((id: string, element: HTMLDivElement | null) => {
    if (element) {
      taskItemRefs.current.set(id, element);
    } else {
      taskItemRefs.current.delete(id);
    }
  }, []);

  useEffect(() => {
    const storedTasks = localStorage.getItem('tasks');
    if (storedTasks) {
      try {
        const parsedTasks = JSON.parse(storedTasks);
        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks);
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error("Error parsing tasks from localStorage:", error);
        setTasks([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const parseDeadline = (deadlineStr: string): Date => {
    const parts = deadlineStr.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  };

  const dueDates = useMemo(() => {
    return tasks
      .filter(task => !task.completed)
      .map(task => parseDeadline(task.deadline));
  }, [tasks]);

  const assigneesByDate = useMemo(() => {
    const map = new Map<string, string[]>();
    tasks.forEach(task => {
      // 달력에는 완료 여부와 관계없이 마감일 기준으로 담당자를 표시할 수 있으나,
      // 체크박스 로직 등을 위해 미완료 업무만 고려하는 것이 좋을 수도 있습니다.
      // 현재는 모든 업무의 담당자를 표시하도록 되어 있습니다.
      // if (!task.completed) { 
        try {
          const deadlineDate = parseDeadline(task.deadline);
          const dateStr = format(deadlineDate, 'yyyy-MM-dd');
          if (!map.has(dateStr)) {
            map.set(dateStr, []);
          }
          const currentAssignees = map.get(dateStr)!;
          if (!currentAssignees.includes(task.assignee)) {
            currentAssignees.push(task.assignee);
          }
        } catch (e) {
          console.error("Error processing task deadline for calendar:", task.deadline, e);
        }
      // }
    });
    return map;
  }, [tasks]);

  const handleCalendarBatchComplete = useCallback((dateStr: string, assignee: string) => {
    const tasksToComplete = tasks.filter(
      (task) => task.deadline === dateStr && task.assignee === assignee && !task.completed
    );

    if (tasksToComplete.length === 0) {
      toast({
        title: "알림",
        description: `${assignee}님의 해당 날짜에 완료할 업무가 없습니다.`,
        variant: "default",
      });
      return;
    }

    setTasks((prevTasks) =>
      prevTasks.map((task) => {
        if (task.deadline === dateStr && task.assignee === assignee && !task.completed) {
          return { ...task, completed: true };
        }
        return task;
      })
    );
    toast({
      title: "일괄 완료",
      description: `${assignee}님의 ${dateStr} 마감 업무 ${tasksToComplete.length}개가 완료 처리되었습니다.`,
      variant: "default",
    });
    setHighlightedTaskIds([]); // 하이라이트 제거
  }, [tasks, toast]);


  const CustomDayRenderer = useCallback(({ date }: DayContentProps) => {
    const dayOfMonth = format(date, 'd');
    const dateStr = format(date, 'yyyy-MM-dd');
    const assigneesForDay = assigneesByDate.get(dateStr) || [];

    return (
      <div className="flex flex-col items-center justify-start h-full w-full text-center p-0.5 pt-1">
        <span className="text-sm">{dayOfMonth}</span>
        {assigneesForDay.length > 0 && (
          <div className="flex flex-col items-center space-y-0.5 mt-1 overflow-hidden w-full">
            {assigneesForDay.slice(0, 3).map((assignee) => {
              const tasksForThisAssigneeOnThisDay = tasks
                .filter(t => t.deadline === dateStr && t.assignee === assignee)
                .map(t => t.name)
                .join('\n');
              
              const allTasksForAssigneeOnDay = tasks.filter(t => t.deadline === dateStr && t.assignee === assignee);
              const areAllTasksCompleted = allTasksForAssigneeOnDay.length > 0 && allTasksForAssigneeOnDay.every(t => t.completed);
              const hasIncompleteTasks = allTasksForAssigneeOnDay.some(t => !t.completed);

              return (
                <div key={`${dateStr}-${assignee}`} className="flex items-center justify-start w-[90%] max-w-[calc(100%-8px)] my-0.5">
                  <Checkbox
                    id={`cal-task-complete-${dateStr}-${assignee}`}
                    checked={areAllTasksCompleted}
                    disabled={!hasIncompleteTasks} // 모든 업무가 이미 완료되었거나, 업무가 아예 없으면 비활성화
                    onCheckedChange={() => {
                      if (hasIncompleteTasks) {
                        handleCalendarBatchComplete(dateStr, assignee);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()} // 이벤트 전파 중지
                    className="mr-1.5 h-3.5 w-3.5 border-slate-500 data-[state=checked]:bg-green-500 data-[state=checked]:text-white data-[state=checked]:border-green-600 shrink-0"
                    aria-label={`${assignee} ${dateStr} 업무 일괄 완료`}
                  />
                  <div
                    data-assignee={assignee}
                    className={cn(
                      "text-xs font-semibold leading-snug px-1.5 py-0.5 rounded-md truncate cursor-pointer transition-opacity hover:opacity-75 flex-grow min-w-0",
                      assigneeColors[assignee] || assigneeColors['미지정']
                    )}
                    title={tasksForThisAssigneeOnThisDay || assignee}
                     onClick={(e) => {
                        e.stopPropagation();
                        // 날짜와 담당자 정보를 함께 사용하여 정확한 하이라이팅
                        const tasksToHighlight = tasks.filter(
                            task => task.deadline === dateStr && task.assignee === assignee && !task.completed
                        );
                        if (tasksToHighlight.length > 0) {
                            setHighlightedTaskIds(tasksToHighlight.map(t => t.id));
                        } else {
                            setHighlightedTaskIds([]);
                             toast({ title: "알림", description: "해당 담당자의 완료되지 않은 업무가 없습니다."});
                        }
                    }}
                  >
                    {assignee}
                  </div>
                </div>
              );
            })}
            {assigneesForDay.length > 3 && (
                <div className="text-[0.6rem] text-muted-foreground mt-0.5" title={assigneesForDay.slice(3).join(', ')}>
                    +{assigneesForDay.length - 3} more
                </div>
            )}
          </div>
        )}
      </div>
    );
  }, [assigneesByDate, tasks, toast, handleCalendarBatchComplete]);

  const handleDayClick = (day: Date, modifiers: DayModifiers, event: React.MouseEvent) => {
    if (modifiers.outside || modifiers.disabled) {
      return;
    }
    const clickedDateStr = format(day, 'yyyy-MM-dd');
    
    // Check if the click was on an assignee badge by looking for data-assignee on target or parents
    let specificAssignee: string | undefined = undefined;
    let currentElement = event.target as HTMLElement | null;
    while (currentElement && !specificAssignee) {
        if (currentElement.dataset && currentElement.dataset.assignee) {
            specificAssignee = currentElement.dataset.assignee;
        }
        // Check if we hit a checkbox or its parent, stop propagation if so
        if (currentElement.role === 'checkbox' || currentElement.querySelector('[role="checkbox"]')) {
          return; // Stop if click originated from checkbox or its container to avoid double action
        }
        currentElement = currentElement.parentElement;
    }
    
    let tasksToConsider = tasks.filter(
      task => task.deadline === clickedDateStr && !task.completed
    );

    if (specificAssignee) {
      tasksToConsider = tasksToConsider.filter(task => task.assignee === specificAssignee);
    }

    if (tasksToConsider.length > 0) {
      const idsToHighlight = tasksToConsider.map(t => t.id);
      setHighlightedTaskIds(idsToHighlight);
    } else {
      setHighlightedTaskIds([]); 
       if (specificAssignee) {
           toast({ title: "알림", description: `${specificAssignee}님의 해당 날짜에 완료되지 않은 업무가 없습니다.`});
       } else {
           toast({ title: "알림", description: "해당 날짜에 완료되지 않은 업무가 없습니다."});
       }
    }
  };
  
  useEffect(() => {
    if (highlightedTaskIds.length > 0) {
      const firstHighlightedId = highlightedTaskIds[0];
      const elementToScrollTo = taskItemRefs.current.get(firstHighlightedId);

      if (elementToScrollTo) {
        elementToScrollTo.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }

      const timer = setTimeout(() => {
        setHighlightedTaskIds([]);
      }, 3000); 

      return () => clearTimeout(timer);
    }
  }, [highlightedTaskIds]);


  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'completed' | 'enableReminders'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: crypto.randomUUID(),
      completed: false,
      enableReminders: true, 
    };
    setTasks((prevTasks) => [newTask, ...prevTasks]);
    setIsTaskFormModalOpen(false);
    toast({ title: "업무 추가 완료", description: `"${newTask.name}" 업무가 성공적으로 추가되었습니다.`, variant: "default" });
  };

  const handleEditTask = (updatedTaskData: Omit<Task, 'id' | 'completed' | 'enableReminders'>) => {
    if (!editingTask) return;
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === editingTask.id ? { ...task, ...updatedTaskData } : task
      )
    );
    setEditingTask(null);
    setIsTaskFormModalOpen(false);
    toast({ title: "업무 수정 완료", description: `"${updatedTaskData.name}" 업무가 성공적으로 수정되었습니다.`, variant: "default" });
  };

  const handleToggleComplete = (id: string) => {
    const taskToToggle = tasks.find(task => task.id === id);
    if (!taskToToggle) return;

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
    toast({
        title: "업무 상태 변경",
        description: `"${taskToToggle.name}" 업무가 ${!taskToToggle.completed ? "완료" : "미완료"} 처리되었습니다.`
    });
  };

  const handleDeleteTask = (id: string) => {
    const taskToDelete = tasks.find(t => t.id === id);
    setTasks((prevTasks) => prevTasks.filter((task) => task.id !== id));
    if (taskToDelete) {
      toast({ title: "업무 삭제 완료", description: `"${taskToDelete.name}" 업무가 삭제되었습니다.`, variant: "destructive" });
    }
  };
  
  const handleToggleReminder = (id: string) => {
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, enableReminders: !task.enableReminders } : task
      )
    );
     const updatedTask = tasks.find(t => t.id === id); // This will find the task *before* the state update finishes if not careful
     if (updatedTask) { // updatedTask here refers to the task *before* toggling enableReminders state
        toast({
            title: "알림 설정 변경",
            description: `"${updatedTask.name}" 업무의 알림이 ${!updatedTask.enableReminders ? "활성화" : "비활성화"}되었습니다.` // Logic needs to be based on the *new* state
        });
     }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setIsTaskFormModalOpen(true);
  };

  const openNewTaskModal = () => {
    setEditingTask(null);
    setIsTaskFormModalOpen(true);
  }

  const handleGetAiSchedule = async () => {
    setIsAiModalOpen(true);
    setIsAiLoading(true);
    setAiSchedule(null);
    try {
      const schedule = await getAiScheduleAction(tasks);
      setAiSchedule(schedule);
    } catch (error) {
      setAiSchedule('AI 스케줄을 가져오는 중 오류가 발생했습니다.');
      toast({ title: "AI 스케줄 오류", description: "스케줄 추천을 받는 중 문제가 발생했습니다.", variant: "destructive" });
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="mb-8 shadow-xl border-primary/20 border-2">
          <CardHeader className="pb-4">
             <CardTitle className="text-xl flex items-center text-primary-foreground bg-primary p-3 rounded-lg shadow-md">
                <CalendarIconShad className="h-6 w-6 mr-2 align-text-bottom" /> 마감일 달력
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center p-2 sm:p-4">
            <Calendar
              mode="multiple" 
              selected={dueDates} 
              month={currentMonth}
              onMonthChange={setCurrentMonth}
              onDayClick={handleDayClick}
              locale={ko}
              className="rounded-md border shadow-inner bg-card p-2 md:p-3 w-full max-w-2xl" 
              classNames={{
                caption_label: "text-lg font-semibold",
                nav_button: "h-8 w-8",
                month: "space-y-3 md:space-y-4", 
                head_row: "flex w-full mt-1 md:mt-2",
                head_cell: cn("text-muted-foreground rounded-md w-16 md:w-20 lg:w-24 font-normal text-xs flex items-center justify-center p-1"),
                row: "flex w-full mt-1 md:mt-2", 
                cell: cn("h-24 w-16 md:h-28 md:w-20 lg:h-32 lg:w-24 text-center relative rounded-md p-0"), 
                day: cn("h-full w-full focus:relative focus:z-10 rounded-md"), 
                day_selected: cn("!bg-accent !text-accent-foreground font-bold opacity-100"), 
                day_today: cn("!bg-primary/30 !text-primary-foreground font-semibold"),
                day_outside: cn("text-muted-foreground/50 !opacity-50"),
              }}
              components={{
                DayContent: CustomDayRenderer
              }}
            />
          </CardContent>
        </Card>
        
        <Card className="mb-8 shadow-xl border-primary/20 border-2">
          <CardHeader className="pb-4">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl text-primary-foreground bg-primary p-3 rounded-lg shadow-md">
                <PlusSquare className="inline-block h-7 w-7 mr-2 align-text-bottom" />
                새 업무 관리
              </CardTitle>
              <Button onClick={openNewTaskModal} variant="default" className="bg-accent hover:bg-accent/80 text-accent-foreground shadow-md">
                <PlusSquare className="mr-2 h-5 w-5" /> 업무 추가하기
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Dialog open={isTaskFormModalOpen} onOpenChange={setIsTaskFormModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl">{editingTask ? '업무 수정' : '새 업무 추가'}</DialogTitle>
              <DialogDescription>
                {editingTask ? '선택한 업무의 세부 정보를 수정합니다.' : '새로운 업무의 세부 정보를 입력해주세요.'}
              </DialogDescription>
            </DialogHeader>
            <TaskForm
              onSubmit={editingTask ? handleEditTask : handleAddTask}
              initialData={editingTask}
              onClose={() => setIsTaskFormModalOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <div className="mb-8 flex justify-end">
          <Button onClick={handleGetAiSchedule} size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transform hover:scale-105 transition-transform duration-150">
            <Wand2 className="mr-2 h-6 w-6" /> AI 스케줄 추천 받기
          </Button>
        </div>

        <TaskList
          tasks={tasks}
          onToggleComplete={handleToggleComplete}
          onDelete={handleDeleteTask}
          onEdit={openEditModal}
          onToggleReminder={handleToggleReminder}
          highlightedTaskIds={highlightedTaskIds}
          registerTaskItemRef={registerTaskItemRef}
        />
      </main>
      <footer className="text-center py-6 border-t text-sm text-muted-foreground">
        © {new Date().getFullYear()} 스케줄 비서. AI로 더 스마트하게.
      </footer>

      <AiSchedulerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        scheduleSuggestion={aiSchedule}
        isLoading={isAiLoading}
      />
    </div>
  );
}

    