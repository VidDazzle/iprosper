"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// Colorful bars animation component
const ColorfulBars = () => {
  const bars = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    height: Math.random() * 60 + 20,
    color: [
      "#ff6b00", // Orange
      "#ff1744", // Red
      "#9c27b0", // Purple
      "#0099ff", // Blue
      "#00bcd4", // Cyan
      "#ffc107", // Yellow
      "#4caf50", // Green
      "#e91e63", // Pink
    ][i % 8],
  }));

  return (
    <div className="flex items-end justify-center gap-1 mb-8">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className="w-1 rounded-sm animate-pulse"
          style={{
            height: `${bar.height}px`,
            backgroundColor: bar.color,
            animationDelay: `${bar.id * 0.1}s`,
            animationDuration: "2s",
          }}
        />
      ))}
    </div>
  );
};

interface FormData {
  name: string;
  email: string;
  phone: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  phone?: string;
}

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    phone: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    } else if (formData.name.trim().length < 2) {
      newErrors.name = "Name must be at least 2 characters";
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Please enter a valid phone number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch("/api/newsletter-signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to subscribe to newsletter");
      }

      setIsSuccess(true);
      toast.success("Successfully subscribed to the newsletter!");
    } catch (error) {
      console.error("Newsletter signup error:", error);
      toast.error(
        error instanceof Error 
          ? error.message 
          : "Failed to subscribe. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <img
              src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/1757009205035-fx2gim7laip.png"
              alt="iProsper.io"
              className="h-12 mx-auto mb-4"
            />
            <ColorfulBars />
          </div>

          {/* Success Message */}
          <Card className="bg-card border border-border">
            <CardContent className="p-8 text-center">
              <h1 className="text-2xl font-semibold text-foreground mb-4">
                Thank You!
              </h1>
              <p className="text-muted-foreground mb-6">
                Thank you for registering to receive the weekly iProsper News Letter.
              </p>
              <div className="space-y-3">
                <Button 
                  onClick={() => router.push("/")}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-3xl py-3"
                >
                  Return to Home
                </Button>
                <div className="text-center">
                  <Link
                    href="/signin"
                    className="text-accent hover:text-accent/80 text-sm transition-colors"
                  >
                    Already have an account? Sign in here
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <img
            src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/document-uploads/1757009205035-fx2gim7laip.png"
            alt="iProsper.io"
            className="h-12 mx-auto mb-4"
          />
          <ColorfulBars />
        </div>

        {/* Sign Up Form */}
        <Card className="bg-card border border-border">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-semibold text-foreground mb-2">
                Join our Newsletter
              </h1>
              <p className="text-muted-foreground">
                Get the weekly iProsper News Letter delivered to your inbox
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Name Field */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground rounded-lg py-3 px-4 focus:ring-2 focus:ring-ring focus:border-transparent"
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-destructive text-sm">{errors.name}</p>
                )}
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground rounded-lg py-3 px-4 focus:ring-2 focus:ring-ring focus:border-transparent"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-destructive text-sm">{errors.email}</p>
                )}
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                  Phone number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="bg-input border-border text-foreground placeholder:text-muted-foreground rounded-lg py-3 px-4 focus:ring-2 focus:ring-ring focus:border-transparent"
                  disabled={isLoading}
                />
                {errors.phone && (
                  <p className="text-destructive text-sm">{errors.phone}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-3xl py-3 font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center">
              <Link
                href="/signin"
                className="text-accent hover:text-accent/80 text-sm transition-colors"
              >
                Already have an account? Sign in here
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}