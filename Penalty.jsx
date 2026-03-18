import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Penalty() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="bg-white rounded-2xl shadow-md p-8 max-w-3xl w-full">
        <h1 className="text-2xl font-bold mb-4">Penalty</h1>
        <p className="text-gray-600 mb-6">Penalty details collected from students. (Placeholder)</p>
        <div className="flex gap-2">
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded bg-gray-200">Back</button>
        </div>
      </div>
    </div>
  );
}
