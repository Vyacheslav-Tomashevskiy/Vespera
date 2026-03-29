import DisputeDetail from '@/components/landlord/DisputeDetail';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function DisputeIdPage({ params }: PageProps) {
  // Wait for React 19 parameter unwrap if applicable, or just assume it is sync for now
  return (
    <div className="p-6">
      <DisputeDetail id={params.id} />
    </div>
  );
}
