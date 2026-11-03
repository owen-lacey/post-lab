import { CircleCheck, TriangleAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import type { Problem } from '../shared/board';

/** Files that could not be shown, with the reason for each. */
export function ProblemsPanel({ problems }: { problems: Problem[] }) {
  if (problems.length === 0) {
    return (
      <Badge variant="secondary">
        <CircleCheck />
        No problems
      </Badge>
    );
  }
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="bg-background">
          <TriangleAlert className="text-destructive" />
          Problems
          <Badge variant="destructive">{problems.length}</Badge>
        </Button>
      </SheetTrigger>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Problems</SheetTitle>
          <SheetDescription>
            These files are not shown on the canvas. Fix them and the board updates.
          </SheetDescription>
        </SheetHeader>
        <ul className="flex flex-col gap-4 px-4 pb-4">
          {problems.map((problem) => (
            <li key={problem.path} className="flex flex-col gap-1">
              <code className="text-sm font-medium">{problem.path}</code>
              <pre className="text-xs whitespace-pre-wrap text-muted-foreground">
                {problem.message}
              </pre>
            </li>
          ))}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
