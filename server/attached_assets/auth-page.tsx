import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginData } from "@shared/schema";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Redirect } from "wouter";
import iconImgPath from "@assets/Icon.jpg";
import logoImgPath from "@assets/logo.jpg";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function AuthPage() {
  const { user, loginMutation } = useAuth();

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  // Redirect if user is already logged in
  if (user) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg overflow-hidden">
        {/* Logos and Welcome Text */}
        <div className="flex justify-center items-center space-x-4 bg-blue-50 p-4">
          <div className="w-16 h-16">
            <img src={iconImgPath} alt="UNICEF Logo" className="w-full h-full object-contain" />
          </div>
          <div className="w-16 h-16">
            <img src={logoImgPath} alt="FCA Logo" className="w-full h-full object-contain" />
          </div>
        </div>
        
        <div className="text-center py-4 bg-blue-100">
          <h1 className="text-2xl font-bold text-blue-800">IDEC WELCOMES YOU</h1>
        </div>

        {/* Form Section */}
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold text-center text-neutral-700 mb-6">Sign in to your account</h2>
          
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-5">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter your username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Enter your password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="flex items-center space-x-2">
                <Checkbox id="remember" />
                <Label htmlFor="remember" className="text-sm font-medium leading-none">
                  Remember me
                </Label>
              </div>
              
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </Button>
            </form>
          </Form>
          
          <div className="mt-6 text-center">
            <p className="text-sm text-neutral-500 mb-2">
              Demo login: Try <span className="font-medium">"admin"</span> or <span className="font-medium">"vht"</span> with password <span className="font-medium">"password"</span>
            </p>
          </div>
        </CardContent>
      </div>
    </div>
  );
}
