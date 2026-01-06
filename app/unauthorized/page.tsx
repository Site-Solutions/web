import { SignOutButton } from "@clerk/nextjs";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <svg
            className="mx-auto h-16 w-16 text-red-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Access Denied
        </h1>
        <p className="text-gray-600 mb-6">
          You must be a member of an organization to access BuildSimpli.
          Please contact your administrator to be added to an organization.
        </p>
        <div className="space-y-3">
          <SignOutButton>
            <button className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              Sign Out
            </button>
          </SignOutButton>
          <Link
            href="/sign-in"
            className="block w-full bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Try Different Account
          </Link>
        </div>
      </div>
    </div>
  );
}

