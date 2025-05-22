import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Stethoscope } from "lucide-react";
import { Link } from "wouter";
import { Child } from "@shared/schema";

interface ChildCardProps {
  child: Child;
}

export function ChildCard({ child }: ChildCardProps) {
  const calculateAge = (dateOfBirth: string | Date) => {
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  const getStatusBadge = (status: string | undefined) => {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{child.fullName}</span>
          {getStatusBadge(child.status)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">ID:</span>
            <span>{child.childId}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Age:</span>
            <span>{calculateAge(child.dateOfBirth)} years</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gender:</span>
            <span>{child.gender}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">District:</span>
            <span>{child.district}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Health Facility:</span>
            <span>{child.healthFacility}</span>
          </div>
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
            <Stethoscope className="h-3.5 w-3.5 mr-1" />
            Screen
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
} 