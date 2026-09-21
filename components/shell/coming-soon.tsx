import React from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { Construction } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function ComingSoon({
  moduleName,
  phaseNumber,
  description,
}: {
  moduleName: string;
  phaseNumber: number;
  description: string;
}) {
  return (
    <div className="py-12">
      <EmptyState
        icon={<Construction className="w-6 h-6 text-accent" />}
        title={`${moduleName} (Phase ${phaseNumber})`}
        description={description}
        action={
          <Link href="/dashboard">
            <Button variant="outline" size="sm">
              Return to Dashboard
            </Button>
          </Link>
        }
      />
    </div>
  );
}
