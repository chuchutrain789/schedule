
'use client';

import { useState, useEffect, useMemo, useCallback, useRef }  from 'react';
import type { Task, Priority } from '@/lib/types';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskList } from '@/components/tasks/TaskList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Calendar as CalendarIconShad, PlusSquare, UserCog, X, Archive, Search as SearchIcon } from 'lucide-react';
import { AppHeader } from '@/components/common/Header';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';
import { ko } from 'date-fns/locale';
import { format, parseISO, differenceInCalendarDays, startOfToday } from 'date-fns';
import type { DayContentProps, DayModifiers } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const initialAssignees = ['최준원', '백옥주', '추효정', '추성욱', '신미경', '추상훈'];

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
  const [assignees, setAssignees] = useState<string[]>(initialAssignees);
  const [isTaskFormModalOpen, setIsTaskFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<string[]>([]);
  const taskItemRefs = useRef<Map<string, HTMLDivElement | null>>(new Map());

  const [isAssigneeManagerModalOpen, setIsAssigneeManagerModalOpen] = useState(false);
  const [newAssigneeName, setNewAssigneeName] = useState('');

  const [openAccordionItem, setOpenAccordionItem] = useState<string | undefined>();
  const archivedSectionRef = useRef<HTMLDivElement>(null);

  const [searchTerm, setSearchTerm] = useState('');


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
        const parsedTasks: Task[] = JSON.parse(storedTasks);
        if (Array.isArray(parsedTasks)) {
          setTasks(parsedTasks.map(task => ({
            ...task,
            deadline: String(task.deadline),
            completionDate: task.completionDate ? String(task.completionDate) : undefined,
            notes: task.notes || undefined,
          })));
        } else {
          setTasks([]);
        }
      } catch (error) {
        console.error("Error parsing tasks from localStorage:", error);
        setTasks([]);
      }
    }

    const storedAssignees = localStorage.getItem('assignees');
    if (storedAssignees) {
      try {
        const parsedAssignees = JSON.parse(storedAssignees);
        if (Array.isArray(parsedAssignees) && parsedAssignees.every(item => typeof item === 'string')) {
          setAssignees(parsedAssignees);
        }
      } catch (error) {
        console.error("Error parsing assignees from localStorage:", error);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('assignees', JSON.stringify(assignees));
  }, [assignees]);


  const handleAddAssignee = () => {
    const trimmedName = newAssigneeName.trim();
    if (trimmedName && !assignees.includes(trimmedName)) {
      setAssignees(prev => [...prev, trimmedName]);
      setNewAssigneeName('');
      toast({ title: "담당자 추가됨", description: `${trimmedName} 님이 담당자 목록에 추가되었습니다.` });
    } else if (assignees.includes(trimmedName)) {
      toast({ title: "오류", description: "이미 존재하는 담당자 이름입니다.", variant: "destructive" });
    } else {
      toast({ title: "오류", description: "담당자 이름을 입력해주세요.", variant: "destructive" });
    }
  };

  const handleRemoveAssignee = (assigneeToRemove: string) => {
    const hasIncompleteTasks = tasks.some(task => task.assignee === assigneeToRemove && !task.completed);
    if (hasIncompleteTasks) {
      toast({
        title: "삭제 불가",
        description: `${assigneeToRemove}님에게 배정된 미완료 업무가 있어 삭제할 수 없습니다. 업무를 다른 담당자에게 재배정하거나 완료처리 후 시도해주세요.`,
        variant: "destructive",
        duration: 7000,
      });
      return;
    }
    setAssignees(prev => prev.filter(name => name !== assigneeToRemove));
    toast({ title: "담당자 삭제됨", description: `${assigneeToRemove} 님이 담당자 목록에서 삭제되었습니다.` });
  };


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
          return { ...task, completed: true, completionDate: new Date().toISOString() };
        }
        return task;
      })
    );
    toast({
      title: "일괄 완료",
      description: `${assignee}님의 ${dateStr} 마감 업무 ${tasksToComplete.length}개가 완료 처리되었습니다.`,
      variant: "default",
    });
    setHighlightedTaskIds([]);
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
                    disabled={!hasIncompleteTasks}
                    onCheckedChange={() => {
                      if (hasIncompleteTasks) {
                        handleCalendarBatchComplete(dateStr, assignee);
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="mr-1.5 h-3.5 w-3.5 bg-white border-neutral-400 data-[state=checked]:bg-green-500 data-[state=checked]:text-white data-[state=checked]:border-green-500 shrink-0"
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
  }, [assigneesByDate, tasks, toast, handleCalendarBatchComplete, assignees]);


  const handleDayClick = (day: Date, modifiers: DayModifiers, event: React.MouseEvent) => {
    if (modifiers.outside || modifiers.disabled) {
      return;
    }
    const clickedDateStr = format(day, 'yyyy-MM-dd');

    let specificAssignee: string | undefined = undefined;
    let currentElement = event.target as HTMLElement | null;

    let clickOnCheckbox = false;
    while (currentElement) {
        if (currentElement.dataset && currentElement.dataset.assignee && !specificAssignee) {
            specificAssignee = currentElement.dataset.assignee;
        }
        if (currentElement.role === 'checkbox' || (currentElement.tagName === 'INPUT' && currentElement.getAttribute('type') === 'checkbox') || currentElement.querySelector('[role="checkbox"]')) {
          clickOnCheckbox = true;
          break;
        }
        if (currentElement === event.currentTarget) break;
        currentElement = currentElement.parentElement;
    }

    if (clickOnCheckbox) {
      return;
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


  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'completed' | 'enableReminders' | 'completionDate'>) => {
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

  const handleEditTask = (updatedTaskData: Omit<Task, 'id' | 'completed' | 'enableReminders'| 'completionDate'>) => {
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

    const newCompletedState = !taskToToggle.completed;
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === id ? {
          ...task,
          completed: newCompletedState,
          completionDate: newCompletedState ? new Date().toISOString() : undefined
        } : task
      )
    );
    toast({
        title: "업무 상태 변경",
        description: `"${taskToToggle.name}" 업무가 ${newCompletedState ? "완료" : "미완료"} 처리되었습니다.`
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

  const baseActiveTasks = useMemo(() => {
    const today = startOfToday();
    return tasks.filter(task => {
      if (!task.completed) return true;
      if (!task.completionDate) return true; 
      try {
        const completionD = parseISO(task.completionDate);
        return differenceInCalendarDays(today, completionD) < 1;
      } catch (e) {
        console.error("Error parsing completionDate for activeTasks filter:", task.completionDate, e);
        return true; 
      }
    });
  }, [tasks]);

  const activeTasks = useMemo(() => {
    if (searchTerm.trim() === '') {
      return baseActiveTasks;
    }
    return baseActiveTasks.filter(task =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [baseActiveTasks, searchTerm]);

  const baseArchivedTasksToDisplay = useMemo(() => {
    const today = startOfToday();
    return tasks.filter(task => {
      if (!task.completed || !task.completionDate) return false;
      try {
        const completionD = parseISO(task.completionDate);
        return differenceInCalendarDays(today, completionD) >= 1;
      } catch (e) {
        console.error("Error parsing completionDate for archivedTasksToDisplay filter:", task.completionDate, e);
        return false; 
      }
    }).sort((a, b) => { 
        if (!a.completionDate || !b.completionDate) return 0;
        try {
            return parseISO(b.completionDate).getTime() - parseISO(a.completionDate).getTime();
        } catch {
            return 0;
        }
    });
  }, [tasks]);

  const archivedTasksToDisplay = useMemo(() => {
    if (searchTerm.trim() === '') {
      return baseArchivedTasksToDisplay;
    }
    return baseArchivedTasksToDisplay.filter(task =>
      task.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [baseArchivedTasksToDisplay, searchTerm]);


  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto px-4 py-8">
        <Card className="mb-8 shadow-lg border-border">
          <CardHeader className="bg-muted/30">
            <CardTitle className="text-xl flex items-center">
              <SearchIcon className="h-6 w-6 mr-3 text-primary" />
              업무 검색
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Input
              type="search"
              placeholder="검색할 업무명을 입력하세요..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-base"
            />
          </CardContent>
        </Card>
        
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
            <div className="flex justify-between items-center flex-wrap gap-4">
              <CardTitle className="text-2xl text-primary-foreground bg-primary p-3 rounded-lg shadow-md">
                <PlusSquare className="inline-block h-7 w-7 mr-2 align-text-bottom" />
                새 업무 관리
              </CardTitle>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={() => setIsAssigneeManagerModalOpen(true)} variant="outline" className="shadow-md">
                    <UserCog className="mr-2 h-5 w-5" /> 담당자 관리
                </Button>
                <Button
                  onClick={() => {
                    const targetItem = "archived-tasks";
                    setOpenAccordionItem(prev => prev === targetItem ? undefined : targetItem);
                    setTimeout(() => {
                        archivedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                  }}
                  variant="outline"
                  className="shadow-md"
                  disabled={baseArchivedTasksToDisplay.length === 0}
                >
                  <Archive className="mr-2 h-5 w-5" />
                  지난 업무 보기 ({baseArchivedTasksToDisplay.length})
                </Button>
                <Button onClick={openNewTaskModal} variant="default" className="bg-accent hover:bg-accent/80 text-accent-foreground shadow-md">
                  <PlusSquare className="mr-2 h-5 w-5" /> 업무 추가하기
                </Button>
              </div>
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
              assignees={assignees}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={isAssigneeManagerModalOpen} onOpenChange={setIsAssigneeManagerModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-2xl">담당자 관리</DialogTitle>
              <DialogDescription>새로운 담당자를 추가하거나 기존 담당자를 목록에서 삭제합니다. 미완료 업무가 배정된 담당자는 삭제할 수 없습니다.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex space-x-2">
                <Input
                  value={newAssigneeName}
                  onChange={(e) => setNewAssigneeName(e.target.value)}
                  placeholder="새 담당자 이름 입력"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddAssignee(); }}
                />
                <Button onClick={handleAddAssignee} className="bg-accent hover:bg-accent/90 text-accent-foreground">추가</Button>
              </div>
              <ScrollArea className="h-[200px] w-full rounded-md border p-3">
                {assignees.length > 0 ? (
                  <ul className="space-y-2">
                    {assignees.map(name => (
                      <li key={name} className="flex items-center justify-between p-2 bg-muted/60 rounded-md hover:bg-muted transition-colors">
                        <span className="text-sm font-medium">{name}</span>
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveAssignee(name)} aria-label={`${name} 담당자 삭제`} className="h-7 w-7 hover:bg-destructive/10">
                          <X className="h-4 w-4 text-destructive hover:text-destructive/80" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-center text-sm text-muted-foreground py-4">등록된 담당자가 없습니다. 새 담당자를 추가해주세요.</p>
                )}
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAssigneeManagerModalOpen(false)}>닫기</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="min-h-96">
          <TaskList
            tasks={activeTasks}
            onToggleComplete={handleToggleComplete}
            onDelete={handleDeleteTask}
            onEdit={openEditModal}
            onToggleReminder={handleToggleReminder}
            highlightedTaskIds={highlightedTaskIds}
            registerTaskItemRef={registerTaskItemRef}
          />
        </div>

        <div ref={archivedSectionRef}>
          {baseArchivedTasksToDisplay.length > 0 && ( 
            <Accordion
              type="single"
              collapsible
              className="w-full mt-12"
              value={openAccordionItem}
              onValueChange={setOpenAccordionItem}
            >
              <AccordionItem value="archived-tasks">
                <AccordionTrigger className="text-lg font-semibold text-primary hover:no-underline py-3 px-4 rounded-md bg-muted/50 hover:bg-muted/70 transition-colors">
                  <div className="flex items-center">
                    <Archive className="mr-3 h-6 w-6 text-primary/80" />
                    지난 업무 목록 ({archivedTasksToDisplay.length > 0 ? archivedTasksToDisplay.length : baseArchivedTasksToDisplay.length}개{searchTerm && ` 중 ${archivedTasksToDisplay.length}개 일치`})
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-4">
                  <TaskList
                    tasks={archivedTasksToDisplay}
                    onToggleComplete={handleToggleComplete}
                    onDelete={handleDeleteTask}
                    onEdit={openEditModal}
                    onToggleReminder={handleToggleReminder}
                    highlightedTaskIds={highlightedTaskIds}
                    registerTaskItemRef={registerTaskItemRef}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

      </main>
      <footer className="text-center py-6 border-t text-sm text-muted-foreground">
        © {new Date().getFullYear()} 스케줄 비서. AI로 더 스마트하게.
      </footer>
    </div>
  );
}
