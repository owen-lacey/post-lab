import { CircleAlert } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function OutputError({ message }: { message: string }) {
  return (
    <Alert variant="destructive">
      <CircleAlert />
      <AlertTitle>Cannot show this file</AlertTitle>
      <AlertDescription className="wrap-break-word">{message}</AlertDescription>
    </Alert>
  );
}
