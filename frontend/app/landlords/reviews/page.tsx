'use client';
import ReviewsList from '@/components/landlord/ReviewsList';

export default function ReviewsPage() {
  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-white">Reviews</h1>
      </div>
      <p className="text-slate-300 mb-6">
        Manage tenant feedback and responses.
      </p>
      <ReviewsList />
    </div>
  );
}
