'use client';

import { useState, useEffect } from 'react';
import type { Task, Priority } from '@/lib/types';
import { TaskForm } from '@/components/tasks/TaskForm';
import { TaskList } from '@/components/tasks/TaskList';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Wand2, PlusSquare } from 'lucide-react';
import { AppHeader } from '@/components/common/Header';
import { AiSchedulerModal } from '@/components/tasks/AiSchedulerModal';
import { getAiScheduleAction } from './actions';
import { useToast } from '@/hooks/use-toast';

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isTaskFormModalOpen, setIsTaskFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiSchedule, setAiSchedule] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const { toast } = useToast();

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

  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'completed' | 'enableReminders'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: crypto.randomUUID(), // Changed from uuidv4()
      completed: false,
      enableReminders: true, // Default to true
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
