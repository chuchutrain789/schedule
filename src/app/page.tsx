
'use client';

import { useState, useEffect, useMemo, useCallback }  from 'react';
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
import type { DayContentProps } from 'react-day-picker';
import { cn } from '@/lib/utils';

const assigneeColors: Record<string, string> = {
  '최준원': 'bg-sky-200 text-sky-800',
  '백옥주': 'bg-pink-200 text-pink-800',
  '추효정': 'bg-lime-200 text-lime-800',
  '추성욱': 'bg-purple-200 text-purple-800',
  '신미경': 'bg-orange-200 text-orange-800',
  '추상훈': 'bg-teal-200 text-teal-800',
  '미지정': 'bg-gray-300 text-gray-800', // Fallback for unassigned or new assignees
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

  // Load tasks from local storage on initial render
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

  // Save tasks to local storage whenever tasks change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const parseDeadline = (deadlineStr: string): Date => {
    const parts = deadlineStr.split('-').map(Number);
    // Ensures date is parsed as local, not UTC, to avoid off-by-one day issues.
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
      if (!task.completed) {
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
      }
    });
    return map;
  }, [tasks]);

  const CustomDayRenderer = useCallback(({ date }: DayContentProps) => {
    const dayOfMonth = format(date, 'd');
    const dateStr = format(date, 'yyyy-MM-dd');
    const assigneesForDay = assigneesByDate.get(dateStr) || [];

    return (
      <div className="flex flex-col items-center justify-center h-full w-full text-center p-0.5">
        <span>{dayOfMonth}</span>
        {assigneesForDay.length > 0 && (
          <div
            className={cn(
              "mt-0.5 text-[0.5rem] md:text-[0.55rem] leading-tight px-1 py-0 rounded-xs truncate w-auto max-w-[85%]",
              assigneeColors[assigneesForDay[0]] || assigneeColors['미지정']
            )}
            title={assigneesForDay.join(', ')} // Show full list on hover
          >
            {assigneesForDay[0]}
            {assigneesForDay.length > 1 && (
              <span className="ml-1 font-semibold opacity-80">+{assigneesForDay.length - 1}</span>
            )}
          </div>
        )}
      </div>
    );
  }, [assigneesByDate]);


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
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
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
     const updatedTask = tasks.find(t => t.id === id);
     if (updatedTask) {
        toast({
            title: "알림 설정 변경",
            description: `"${updatedTask.name}" 업무의 알림이 ${!updatedTask.enableReminders ? "활성화" : "비활성화"}되었습니다.`
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
              locale={ko}
              className="rounded-md border shadow-inner bg-card p-2 md:p-3 w-full max-w-2xl" 
              classNames={{
                caption_label: "text-lg font-semibold",
                nav_button: "h-8 w-8",
                month: "space-y-3 md:space-y-4", 
                head_row: "flex w-full mt-1 md:mt-2",
                head_cell: cn("text-muted-foreground rounded-md w-16 md:w-20 lg:w-24 font-normal text-xs flex items-center justify-center p-1"),
                row: "flex w-full mt-1 md:mt-2", 
                cell: cn("h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 text-center relative rounded-md p-0"), // Cell size increased for content
                day: cn("h-full w-full focus:relative focus:z-10 rounded-full"), 
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
