'use client';

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Wayang</h1>
          <p className="text-gray-600">Collaborative Canvas Application</p>
        </div>

        <div className="space-y-4">
          <Link
            href="/dalang"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
          >
            <div className="text-lg">Enter as Dalang</div>
            <div className="text-sm opacity-90">Full editing capabilities</div>
          </Link>

          <Link
            href="/view"
            className="block w-full bg-green-500 hover:bg-green-600 text-white font-medium py-3 px-4 rounded-lg text-center transition-colors"
          >
            <div className="text-lg">Enter as Viewer</div>
            <div className="text-sm opacity-90">View-only mode</div>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <div className="text-sm text-gray-500 mb-4">Features:</div>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>✓ Image layers</div>
            <div>✓ Real-time updates</div>
            <div>✓ Drag & drop</div>
            <div>✓ Layer management</div>
            <div>✓ Multiple canvases</div>
            <div>✓ Custom backgrounds</div>
          </div>
        </div>
      </div>
    </div>
  );
}