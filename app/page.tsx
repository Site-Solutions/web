import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { checkOrganizationAccess } from "@/lib/auth";
import { headers } from "next/headers";
import Image from "next/image";
import Link from "next/link";

export default async function HomePage() {
  // Middleware already handles authentication, so if we reach here, user is authenticated
  const { userId } = await auth();

  console.log("🏠 HomePage - User ID:", userId);

  // Only check organization access (middleware ensures userId exists)
  if (userId) {
    const hasAccess = await checkOrganizationAccess(userId);

    console.log("🏠 HomePage - Has access:", hasAccess);

    if (!hasAccess) {
      console.log("🚫 Redirecting to unauthorized");
      redirect("/unauthorized");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/Icon-Light.png"
            alt="BuildSimpli Logo"
            width={80}
            height={80}
            className="h-20 w-20"
          />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome to BuildSimpli Admin
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Manage your projects, teams, and work orders
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link
          href="/search"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-orange-500"
        >
          <div className="text-3xl mb-3">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Search</h2>
          <p className="text-gray-600">
            Search for addresses and work orders
          </p>
        </Link>

        <Link
          href="/upload"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-orange-500"
        >
          <div className="text-3xl mb-3">📤</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Upload</h2>
          <p className="text-gray-600">
            Upload Excel files for bulk imports
          </p>
        </Link>

        <Link
          href="/view"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-orange-500"
        >
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">View</h2>
          <p className="text-gray-600">
            View all work orders and assignments
          </p>
        </Link>

        <Link
          href="/search"
          className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow border border-gray-200 hover:border-orange-500"
        >
          <div className="text-3xl mb-3">📍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Addresses</h2>
          <p className="text-gray-600">
            View detailed address history
          </p>
        </Link>
      </div>
    </div>
  );
}

