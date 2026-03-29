'use client';
import { useState } from 'react';

export default function ReviewResponse({
  reviewId: _reviewId,
  existingResponse,
}: {
  reviewId: string;
  existingResponse: string | null;
}) {
  const [response, setResponse] = useState(existingResponse || '');
  const [isEditing, setIsEditing] = useState(!existingResponse);

  const handleSave = () => {
    // mock save
    setIsEditing(false);
  };

  return (
    <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-white mb-4">Your Response</h2>
      {isEditing ? (
        <div className="space-y-4">
          <textarea
            className="w-full bg-slate-700 text-white rounded-lg p-3 border border-white/10"
            rows={4}
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Write your response here..."
          />
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            Submit Response
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="bg-slate-700/50 rounded-lg p-4 text-slate-300">
            {response}
          </div>
          <button
            onClick={() => setIsEditing(true)}
            className="text-blue-400 hover:text-blue-300"
          >
            Edit Response
          </button>
        </div>
      )}
    </div>
  );
}
