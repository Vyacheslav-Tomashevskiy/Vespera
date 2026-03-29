import ResourceDetail from '@/components/resources/ResourceDetail';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function ResourceSlugPage({ params }: PageProps) {
  return (
    <div className="max-w-4xl mx-auto p-6">
      <ResourceDetail slug={params.slug} />
    </div>
  );
}
