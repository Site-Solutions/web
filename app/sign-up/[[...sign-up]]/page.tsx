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
        // Force account selection by using redirectUrl which triggers full OAuth flow
        redirectUrl="/"
      />
    </div>
  );
}

