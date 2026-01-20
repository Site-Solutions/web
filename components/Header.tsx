"use client";

import Image from "next/image";
import { useState } from "react";
import { useUser, useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { colors } from "@/lib/colors";

export default function Header() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const pathname = usePathname();

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
  };

  return (
    <header className="text-white shadow-md" style={{ backgroundColor: colors.primary }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Logo/Hamburger */}
          <div className="flex items-center">
            {/* Hamburger menu for mobile */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="md:hidden p-2 rounded-md text-white focus:outline-none"
              style={{ 
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.primaryDark}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              aria-label="Toggle menu"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>

            {/* Logo/Title */}
            <Link href="/" className="ml-2 md:ml-0">
              <h1 className="text-xl font-bold">BuildSimpli</h1>
            </Link>
          </div>

          {/* Center: Navigation (desktop) */}
          <nav className="hidden md:flex md:items-center md:space-x-6">
            <Link
              href="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/"
                  ? "bg-white/20 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
            >
              Home
            </Link>
            <Link
              href="/search"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/search"
                  ? "bg-white/20 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
            >
              Search
            </Link>
            <Link
              href="/upload"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/upload"
                  ? "bg-white/20 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
            >
              Upload
            </Link>
            <Link
              href="/view"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${pathname === "/view"
                  ? "bg-white/20 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
            >
              View
            </Link>
            {/* Add more nav items here as needed */}
          </nav>

          {/* Right: User Menu */}
          <div className="flex items-center">
            <SignedIn>
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-md hover:bg-white/10 focus:outline-none"
                >
                  {user?.imageUrl ? (
                    <Image
                      src={user.imageUrl}
                      alt={user.fullName || "User"}
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-full"
                      unoptimized
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                      <span className="text-sm font-medium">
                        {user?.firstName?.[0] || user?.emailAddresses?.[0]?.emailAddress?.[0] || "U"}
                      </span>
                    </div>
                  )}
                  <span className="hidden sm:block text-sm font-medium">
                    {user?.fullName || user?.emailAddresses?.[0]?.emailAddress || "User"}
                  </span>
                  <svg
                    className={`h-4 w-4 transition-transform ${isUserMenuOpen ? "rotate-180" : ""
                      }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                      <div className="px-4 py-2 border-b border-gray-200">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.fullName || "User"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user?.emailAddresses?.[0]?.emailAddress}
                        </p>
                      </div>
                      <button
                        onClick={handleSignOut}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                      >
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </SignedIn>

            <SignedOut>
              <div className="flex items-center space-x-3">
                <Link
                  href="/sign-up"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-white hover:bg-white/90 transition-colors"
                  style={{ color: colors.primary }}
                >
                  Sign Up
                </Link>
                <Link
                  href="/sign-in"
                  className="px-4 py-2 rounded-md text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors"
                >
                  Sign In
                </Link>
              </div>
            </SignedOut>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="flex flex-col space-y-2">
              <Link
                href="/"
                className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/"
                    ? "bg-white/20 text-white"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/search"
                className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/search"
                    ? "bg-white/20 text-white"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Search
              </Link>
              <Link
                href="/upload"
                className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/upload"
                    ? "bg-white/20 text-white"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                Upload
              </Link>
              <Link
                href="/view"
                className={`px-3 py-2 rounded-md text-sm font-medium ${pathname === "/view"
                    ? "bg-white/20 text-white"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                onClick={() => setIsMenuOpen(false)}
              >
                View
              </Link>
              {/* Add more mobile nav items here */}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

