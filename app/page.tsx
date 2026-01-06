import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { checkOrganizationAccess } from "@/lib/auth";
import { headers } from "next/headers";

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Welcome to BuildSimpli
        </h1>
        <p className="text-gray-600">
          You are successfully authenticated and have access to your organization.
        </p>
      </div>
    </div>
  );
}

