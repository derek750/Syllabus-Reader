import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/Card";

interface DashboardStatsProps {
  courseCount: number;
  upcomingCount: number;
  overallAvg: number | null;
  iconBook: LucideIcon;
  iconCalendar: LucideIcon;
  iconGraduation: LucideIcon;
}

export function DashboardStats({
  courseCount,
  upcomingCount,
  overallAvg,
  iconBook: BookOpen,
  iconCalendar: CalendarDays,
  iconGraduation: GraduationCap,
}: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-bold">{courseCount}</p>
            <p className="text-sm text-muted-foreground">Courses</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
            <CalendarDays className="h-6 w-6 text-destructive" />
          </div>
          <div>
            <p className="text-2xl font-bold">{upcomingCount}</p>
            <p className="text-sm text-muted-foreground">Due in 14 days</p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="flex items-center gap-4 p-6">
          <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-accent-foreground" />
          </div>
          <div>
            <p className="text-2xl font-bold">
              {overallAvg != null ? `${overallAvg.toFixed(1)}%` : "—"}
            </p>
            <p className="text-sm text-muted-foreground">Avg Grade</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
