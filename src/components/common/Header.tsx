import { CalendarCheck2 } from 'lucide-react';

export function AppHeader() {
  return (
    <header className="bg-primary shadow-md">
      <div className="container mx-auto px-4 py-4 flex items-center">
        <CalendarCheck2 className="h-8 w-8 text-primary-foreground mr-3" />
        <h1 className="text-3xl font-bold text-primary-foreground">개롱초 연구학교 스케줄 비서</h1>
      </div>
    </header>
  );
}
