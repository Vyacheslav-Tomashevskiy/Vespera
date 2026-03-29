import ReviewDetail from '@/components/landlord/ReviewDetail';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function ReviewIdPage({ params }: PageProps) {
  return (
    <div className="p-6">
      <ReviewDetail id={params.id} />
    </div>
  );
}
