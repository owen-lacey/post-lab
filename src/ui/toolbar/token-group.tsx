import type { ReactNode } from 'react';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { Color } from '../../shared/palette';
import { COLOR_CLASSES } from '../canvas/tokens';

export function ColorSwatch({ color }: { color: Color }) {
  return (
    <span
      className={cn(
        'size-4 rounded-full border-2',
        COLOR_CLASSES[color].fill,
        COLOR_CLASSES[color].border,
      )}
    />
  );
}

interface TokenGroupProps {
  label: string;
  value: string;
  options: readonly string[];
  render: (option: string) => ReactNode;
  onChange: (value: string) => void;
}

export function TokenGroup({ label, value, options, render, onChange }: TokenGroupProps) {
  return (
    <ToggleGroup
      type="single"
      size="sm"
      aria-label={label}
      value={value}
      onValueChange={(next) => {
        // Clicking the active option deselects it; tokens always have a value, so ignore that.
        if (next !== '') onChange(next);
      }}
    >
      {options.map((option) => (
        <ToggleGroupItem key={option} value={option} aria-label={`${label} ${option}`}>
          {render(option)}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** Token groups in a bar, separated by dividers. */
export function TokenBar({ groups }: { groups: ReactNode[] }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background p-1 shadow-sm">
      {groups.flatMap((group, index) =>
        index === 0
          ? [group]
          : [
              <Separator
                key={`separator-${String(index)}`}
                orientation="vertical"
                className="h-5"
              />,
              group,
            ],
      )}
    </div>
  );
}
