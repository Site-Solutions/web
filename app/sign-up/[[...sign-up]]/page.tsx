import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-50">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
        routing="path"
        path="/sign-up"
        forceRedirectUrl="/"
        signInUrl="/sign-in"
        redirectUrl="/"
        // Enable email-only signup with magic links
        // Users can sign up with just their email - no password required initially
        // They'll receive a magic link to complete authentication
      />
    </div>
  );
}

