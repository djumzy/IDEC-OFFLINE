import { useEffect } from "react";
import { useLocation } from "wouter";

export default function HomePage() {
  const [_, setLocation] = useLocation();
  
  useEffect(() => {
    // Redirect to dashboard
    setLocation("/dashboard");
  }, [setLocation]);
  
  return null;
}
