import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DistrictData {
  name: string;
  count: number;
}

interface GeographicalDistributionProps {
  districts: DistrictData[];
  maxCount?: number;  // Optional max count for calculating percentages
}

export function GeographicalDistribution({ districts, maxCount }: GeographicalDistributionProps) {
  // Calculate max count if not provided
  const calculatedMaxCount = maxCount || 
    Math.max(...districts.map(d => d.count), 10);  // Default to 10 if all counts are 0
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Geographical Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {districts.map((district) => (
            <div key={district.name} className="bg-slate-50 p-4 rounded-md">
              <h4 className="font-medium text-foreground mb-2">{district.name}</h4>
              <div className="flex items-center mt-2">
                <Progress 
                  value={(district.count / calculatedMaxCount) * 100} 
                  className="h-2" 
                />
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {district.count} {district.count === 1 ? 'child' : 'children'}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// For mobile or grid view, display as a vertical list
export function GeographicalDistributionList({ districts, maxCount }: GeographicalDistributionProps) {
  // Calculate max count if not provided
  const calculatedMaxCount = maxCount || 
    Math.max(...districts.map(d => d.count), 10);  // Default to 10 if all counts are 0
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Geographical Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {districts.map((district) => (
            <div key={district.name} className="space-y-1">
              <div className="flex justify-between items-center">
                <h4 className="font-medium text-sm">{district.name}</h4>
                <span className="text-sm text-muted-foreground">
                  {district.count} {district.count === 1 ? 'child' : 'children'}
                </span>
              </div>
              <Progress 
                value={(district.count / calculatedMaxCount) * 100} 
                className="h-2" 
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
