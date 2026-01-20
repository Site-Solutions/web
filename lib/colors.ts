// Environment-based color configuration
// Matches the mobile app's color scheme (purple for dev, orange for prod)

const getEnvironment = () => {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  
  // Check if we're using production Convex deployment
  const isProduction = convexUrl?.includes('enduring-llama-536');
  
  return isProduction;
};

const isProduction = getEnvironment();

// Development colors (purple theme)
const devColors = {
  primary: "#8B5CF6",      // Purple
  primaryDark: "#7C3AED",  // Darker purple for hover states
  primaryLight: "#A78BFA", // Light purple
};

// Production colors (orange theme)
const prodColors = {
  primary: "#FF6700",      // Orange
  primaryDark: "#E55D00",  // Darker orange for hover states
  primaryLight: "#FFAB7D", // Light orange
};

// Export the appropriate colors based on environment
export const colors = isProduction ? prodColors : devColors;

// Also export environment info
export const environment = {
  isProduction,
  isDevelopment: !isProduction,
  name: isProduction ? 'production' : 'development',
};
