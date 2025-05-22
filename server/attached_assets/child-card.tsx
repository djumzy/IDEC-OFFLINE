import { Child } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, ClipboardList } from "lucide-react";
import { Link } from "wouter";

interface ChildCardProps {
  child: Child;
}

export function ChildCard({ child }: ChildCardProps) {
  // Calculate age in years and months
  const calculateAge = (dateOfBirth: Date | string) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return `${years}y ${months}m`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "healthy":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Healthy</Badge>;
      case "monitoring":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Monitoring</Badge>;
      case "referred":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Referred</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-medium">{child.fullName}</CardTitle>
          {getStatusBadge(child.status)}
        </div>
      </CardHeader>
      <CardContent className="pb-2 flex-grow">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID:</span>
            <span className="font-medium">{child.childId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Age:</span>
            <span>{calculateAge(child.dateOfBirth)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gender:</span>
            <span className="capitalize">{child.gender}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">District:</span>
            <span>{child.district}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Health Facility:</span>
            <span>{child.healthFacility}</span>
          </div>
          {child.caretakerName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Caretaker:</span>
              <span>{child.caretakerName}</span>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-2 gap-2 justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/children/${child.id}/edit`}>
            <Pencil className="h-3.5 w-3.5 mr-1" />
            Edit
          </Link>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <Link href={`/children/${child.id}/screening`}>
            <ClipboardList className="h-3.5 w-3.5 mr-1" />
            Screen
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
