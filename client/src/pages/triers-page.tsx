import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "./triers-columns";

export default function TriersPage() {
  const { data: triers, isLoading } = useQuery({
    queryKey: ["triers"],
    queryFn: async () => {
      const response = await api.get("/api/triers");
      return response.data;
    },
    refetchInterval: 30000,
    refetchIntervalInBackground: true,
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>TIER List</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable columns={columns} data={triers || []} />
        </CardContent>
      </Card>
    </div>
  );
} 