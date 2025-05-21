
'use client';

import type { Task, Priority } from '@/lib/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon, PlusCircle, Edit3 } from 'lucide-react';
import { ko } from 'date-fns/locale';
import { useEffect } from 'react';

const taskSchema = z.object({
  name: z.string().min(1, { message: '업무명을 입력해주세요.' }),
  assignee: z.string().min(1, { message: '담당자를 선택해주세요.' }),
  deadline: z.date({ required_error: '마감일을 선택해주세요.' }),
  priority: z.enum(['high', 'medium', 'low'], { required_error: '중요도를 선택해주세요.' }),
});

type TaskFormValues = z.infer<typeof taskSchema>;

interface TaskFormProps {
  onSubmit: (task: Omit<Task, 'id' | 'completed' | 'enableReminders' | 'completionDate'>) => void;
  initialData?: Task | null;
  onClose?: () => void;
  assignees: string[]; // Changed from static array to prop
}

export function TaskForm({ onSubmit, initialData, onClose, assignees }: TaskFormProps) {
  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          assignee: initialData.assignee,
          deadline: new Date(initialData.deadline),
          priority: initialData.priority,
        }
      : {
          name: '',
          assignee: assignees.length > 0 ? assignees[0] : '', // Default to first assignee or empty if list is empty
          deadline: undefined,
          priority: 'medium',
        },
  });

  // Reset form if initialData or assignees list changes for a new task form
  useEffect(() => {
    if (!initialData) {
      form.reset({
        name: '',
        assignee: assignees.length > 0 ? assignees[0] : '',
        deadline: undefined,
        priority: 'medium',
      });
    } else {
        form.reset({
            name: initialData.name,
            assignee: initialData.assignee,
            deadline: new Date(initialData.deadline),
            priority: initialData.priority,
        });
    }
  }, [initialData, assignees, form]);


  const handleSubmit = (values: TaskFormValues) => {
    onSubmit({
      name: values.name,
      assignee: values.assignee,
      deadline: format(values.deadline, 'yyyy-MM-dd'),
      priority: values.priority as Priority,
    });
    if (!initialData) { 
      form.reset({ 
        name: '', 
        assignee: assignees.length > 0 ? assignees[0] : '', 
        deadline: undefined, 
        priority: 'medium' 
      });
    }
    onClose?.();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>업무명</FormLabel>
              <FormControl>
                <Input placeholder="예: 주간 보고서 작성" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="assignee"
          render={({ field }) => (
            <FormItem>
              <FormLabel>담당자</FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value} // Ensure value is controlled
                defaultValue={field.value || (assignees.length > 0 ? assignees[0] : '')} // Ensure default value selection
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={assignees.length > 0 ? "담당자 선택" : "담당자 없음 (추가 필요)"} />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {assignees.length > 0 ? (
                    assignees.map((name) => (
                      <SelectItem key={name} value={name}>
                        {name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="" disabled>담당자를 추가해주세요</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>마감일</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {field.value ? format(field.value, 'PPP', { locale: ko }) : <span>날짜 선택</span>}
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                    locale={ko}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="priority"
          render={({ field }) => (
            <FormItem>
              <FormLabel>중요도</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="중요도 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="high">높음</SelectItem>
                  <SelectItem value="medium">중간</SelectItem>
                  <SelectItem value="low">낮음</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2">
          {onClose && <Button type="button" variant="outline" onClick={onClose}>취소</Button>}
          <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={assignees.length === 0 && !initialData?.assignee}>
            {initialData ? <Edit3 className="mr-2 h-4 w-4" /> : <PlusCircle className="mr-2 h-4 w-4" />}
            {initialData ? '업무 수정' : '업무 추가'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
