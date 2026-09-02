"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useUser, useClerk, SignedIn, SignedOut } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "@/convex/_generated/api";
import { colors } from "@/lib/colors";

export default function Header() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const convexUser = useQuery(api.users.getCurrentUser);
  const updateMyName = useMutation(api.users.updateMyName);

  // Prefer Convex user name (synced from SSO/OAuth) - mobile app uses this
  // Clerk's fullName can lag behind after SSO sign-in
  const displayName =
    convexUser?.name?.trim() ||
    user?.fullName ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "User";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const pathname = usePathname();

  const PRIMARY_LINKS = [
    { href: "/", label: "Home" },
    { href: "/projects", label: "Projects" },
    { href: "/clients", label: "Clients" },
    { href: "/teams", label: "Teams" },
    { href: "/earnings", label: "Earnings" },
  ];
  const MORE_LINKS = [
    { href: "/dashboard", label: "Daily Overview" },
    { href: "/toolbox-talks", label: "Toolbox Talks" },
    { href: "/search", label: "Search" },
    { href: "/view", label: "View Work Orders" },
    { href: "/upload", label: "Upload" },
    { href: "/address-history", label: "Address History" },
    { href: "/settings", label: "Settings" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/");

  useEffect(() => {
    if (isEditNameOpen) setEditNameValue(displayName);
  }, [isEditNameOpen, displayName]);

  const handleSignOut = async () => {
    await signOut();
    setIsUserMenuOpen(false);
  };

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed) return;
    setIsSavingName(true);
    try {
      await updateMyName({ name: trimmed });
      setIsEditNameOpen(false);
      setIsUserMenuOpen(false);
    } catch (err) {
      console.error("Failed to update name:", err);
    } finally {
      setIsSavingName(false);
    }
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
              className="hidden p-2 rounded-md text-white focus:outline-none"
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
          <nav className="hidden md:flex md:items-center md:space-x-1">
            {PRIMARY_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "bg-white/20 text-white"
                    : "text-white/90 hover:text-white hover:bg-white/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="relative">
              <button
                onClick={() => setIsMoreOpen((v) => !v)}
                className="px-3 py-2 rounded-md text-sm font-medium text-white/90 hover:text-white hover:bg-white/10 transition-colors"
              >
                More ▾
              </button>
              {isMoreOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsMoreOpen(false)} />
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-md shadow-lg py-1 z-20 border border-gray-200">
                    {MORE_LINKS.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMoreOpen(false)}
                        className={`block px-4 py-2 text-sm ${
                          isActive(link.href)
                            ? "bg-gray-100 text-gray-900 font-medium"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
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
                      alt={displayName}
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
                    {displayName}
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
                          {displayName}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {user?.emailAddresses?.[0]?.emailAddress}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsUserMenuOpen(false);
                          setIsEditNameOpen(true);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Update name
                      </button>
                      <button
                        type="button"
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

        {/* Update name modal */}
        {isEditNameOpen && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/50"
              onClick={() => !isSavingName && setIsEditNameOpen(false)}
              aria-hidden
            />
            <div className="fixed left-1/2 top-1/2 z-40 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg bg-white p-4 shadow-xl">
              <h3 className="text-lg font-semibold text-gray-900">Update name</h3>
              <input
                type="text"
                value={editNameValue}
                onChange={(e) => setEditNameValue(e.target.value)}
                className="mt-3 w-full rounded border border-gray-300 px-3 py-2 text-gray-900"
                placeholder="Your name"
                disabled={isSavingName}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => !isSavingName && setIsEditNameOpen(false)}
                  className="rounded px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={isSavingName || !editNameValue.trim()}
                  className="rounded px-3 py-1.5 text-sm text-white disabled:opacity-50"
                  style={{ backgroundColor: colors.primary }}
                >
                  {isSavingName ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-white/20 py-4">
            <nav className="flex flex-col space-y-1">
              {[...PRIMARY_LINKS, ...MORE_LINKS].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(link.href)
                      ? "bg-white/20 text-white"
                      : "text-white/90 hover:text-white hover:bg-white/10"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}

