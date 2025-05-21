'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';


interface AiSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleSuggestion: string | null;
  isLoading: boolean;
}

export function AiSchedulerModal({ isOpen, onClose, scheduleSuggestion, isLoading }: AiSchedulerModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">AI 스케줄 추천</DialogTitle>
          <DialogDescription>
            AI가 업무 우선순위와 마감일을 고려하여 최적의 스케줄을 추천합니다.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-grow my-4 pr-6 min-h-[200px]">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="ml-4 text-lg">AI가 스케줄을 분석하고 있습니다...</p>
            </div>
          )}
          {!isLoading && scheduleSuggestion && (
             <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              className="prose prose-sm dark:prose-invert max-w-none"
              components={{
                h1: ({node, ...props}) => <h1 className="text-xl font-semibold mt-4 mb-2" {...props} />,
                h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-3 mb-1" {...props} />,
                h3: ({node, ...props}) => <h3 className="text-md font-semibold mt-2 mb-1" {...props} />,
                ul: ({node, ...props}) => <ul className="list-disc pl-5 space-y-1" {...props} />,
                ol: ({node, ...props}) => <ol className="list-decimal pl-5 space-y-1" {...props} />,
                p: ({node, ...props}) => <p className="mb-2 leading-relaxed" {...props} />,
                strong: ({node, ...props}) => <strong className="font-semibold" {...props} />,
              }}
            >
              {scheduleSuggestion}
            </ReactMarkdown>
          )}
          {!isLoading && !scheduleSuggestion && (
            <p className="text-center text-muted-foreground">추천된 스케줄이 없습니다.</p>
          )}
        </ScrollArea>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
