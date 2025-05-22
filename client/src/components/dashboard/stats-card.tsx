import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconColor?: string;
  onClick?: () => void;
  isActive?: boolean;
}

export function StatsCard({ title, value, icon, iconColor, onClick, isActive }: StatsCardProps) {
  return (
    <Card
      className={cn(
        "cursor-pointer transition-colors",
        isActive ? "bg-primary/5 border-primary" : "hover:bg-accent"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={cn("h-6 w-6", iconColor)}>{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
