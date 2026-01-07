/**
 * Job Detail Page
 */

import { JobDetail } from '@/components/jobs/job-detail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <div className="container py-6">
      <JobDetail jobId={id} />
    </div>
  );
}

