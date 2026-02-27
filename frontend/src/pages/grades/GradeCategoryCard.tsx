import { Trash2 } from "lucide-react";
import type { GradeCategory, Grade } from "@/types";
import { Button } from "@/components/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/Card";

interface GradeCategoryCardProps {
  category: GradeCategory;
  grades: Grade[];
  avg: number | null;
  onDeleteCategory: () => void;
  onDeleteGrade: (id: string) => void;
}

export function GradeCategoryCard({
  category,
  grades,
  avg,
  onDeleteCategory,
  onDeleteGrade,
}: GradeCategoryCardProps) {

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-base">{category.name}</CardTitle>
            <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
              {category.weight}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            {avg !== null && <span className="text-sm font-medium">{avg.toFixed(1)}%</span>}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onDeleteCategory}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {grades.length > 0 && (
        <CardContent className="pt-0">
          <div className="space-y-1">
            {grades.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-muted group"
              >
                <span>{g.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {g.score !== null ? `${g.score}/${g.max_score}` : "—"}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => onDeleteGrade(g.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
