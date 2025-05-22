import { useState, useRef } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileDown } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import "jspdf-autotable";
import html2canvas from "html2canvas";

interface ReportData {
  districtDistribution: Record<string, number>;
  statusDistribution: Record<string, number>;
  totalChildren: number;
  totalScreenings: number;
  totalReferrals: number;
}

export default function ReportsPage() {
  const [timeframe, setTimeframe] = useState("all");
  const [district, setDistrict] = useState("all");
  const reportRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const { data: reportData, isLoading } = useQuery<ReportData>({
    queryKey: ["/api/stats", { timeframe, district }],
  });
  
  // Status chart data preparation
  const statusData = reportData ? [
    { name: "Healthy", value: reportData.statusDistribution.healthy || 0, color: "#10b981" },
    { name: "Monitoring", value: reportData.statusDistribution.monitoring || 0, color: "#f59e0b" },
    { name: "Referred", value: reportData.statusDistribution.referred || 0, color: "#ef4444" }
  ] : [];
  
  // District chart data preparation
  const districtData = reportData 
    ? Object.entries(reportData.districtDistribution)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10) // Top 10 districts
    : [];
  
  // Project-specific districts for the filter
  const districts = ["all", "Kassanda", "Mubende", "Kyegegwa", "Kikuube", "Kabarole"];
  
  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"];
  
  // Export to PDF
  const handleExportPDF = async () => {
    if (!reportRef.current || !reportData) return;
    
    try {
      toast({
        title: "Generating PDF",
        description: "Please wait while we generate your report...",
      });
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const title = "IDEC Child Health Monitoring Report";
      const date = new Date().toLocaleDateString();
      const timeframeText = timeframe === 'all' ? 'All Time' : `Last ${timeframe}`;
      const districtText = district === 'all' ? 'All Districts' : district;
      
      // Add title
      pdf.setFontSize(16);
      pdf.text(title, 105, 15, { align: 'center' });
      
      // Add report metadata
      pdf.setFontSize(10);
      pdf.text(`Date Generated: ${date}`, 105, 25, { align: 'center' });
      pdf.text(`Time Period: ${timeframeText}`, 105, 30, { align: 'center' });
      pdf.text(`District: ${districtText}`, 105, 35, { align: 'center' });
      
      // Add summary statistics
      pdf.setFontSize(14);
      pdf.text("Summary Statistics", 20, 45);
      
      // Create summary table
      // @ts-ignore - autotable is added via import
      pdf.autoTable({
        startY: 50,
        head: [['Metric', 'Value']],
        body: [
          ['Total Children', reportData.totalChildren],
          ['Total Screenings', reportData.totalScreenings],
          ['Total Referrals', reportData.totalReferrals],
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      // Status distribution data for table
      pdf.setFontSize(14);
      pdf.text("Health Status Distribution", 20, 90);
      
      // @ts-ignore - autotable is added via import
      pdf.autoTable({
        startY: 95,
        head: [['Status', 'Count', 'Percentage']],
        body: statusData.map(item => [
          item.name,
          item.value,
          `${((item.value / (reportData.totalChildren || 1)) * 100).toFixed(1)}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      // District distribution data for table
      pdf.setFontSize(14);
      pdf.text("Children by District (Top 10)", 20, 140);
      
      // @ts-ignore - autotable is added via import
      pdf.autoTable({
        startY: 145,
        head: [['District', 'Number of Children', 'Percentage']],
        body: districtData.map(item => [
          item.name,
          item.value,
          `${((item.value / (reportData.totalChildren || 1)) * 100).toFixed(1)}%`
        ]),
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] }
      });
      
      // Try to capture charts with html2canvas
      try {
        if (reportRef.current) {
          const chartsElement = reportRef.current.querySelector('.report-charts');
          if (chartsElement) {
            const canvas = await html2canvas(chartsElement as HTMLElement);
            const imgData = canvas.toDataURL('image/png');
            
            // Add a new page for charts
            pdf.addPage();
            pdf.setFontSize(14);
            pdf.text("Visual Reports", 105, 15, { align: 'center' });
            
            const imgWidth = 180;
            const imgHeight = canvas.height * imgWidth / canvas.width;
            pdf.addImage(imgData, 'PNG', 15, 25, imgWidth, imgHeight);
          }
        }
      } catch (error) {
        console.error("Error capturing charts:", error);
      }
      
      // Save the PDF
      pdf.save(`IDEC_Report_${date.replace(/\//g, '-')}.pdf`);
      
      toast({
        title: "Report Generated",
        description: "Your PDF report has been downloaded successfully.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast({
        title: "Error Generating Report",
        description: "There was a problem generating your PDF report.",
        variant: "destructive",
      });
    }
  };
  
  // Export to Excel (simulated)
  const handleExportExcel = () => {
    toast({
      title: "Excel Export",
      description: "Excel export functionality will be implemented soon.",
    });
  };
  
  // Function to handle export format
  const handleExport = (format: string) => {
    if (format === 'pdf') {
      handleExportPDF();
    } else if (format === 'excel') {
      handleExportExcel();
    }
  };
  
  if (isLoading) {
    return (
      <PageLayout>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageLayout>
    );
  }
  
  return (
    <PageLayout>
      <div className="py-6" ref={reportRef}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-neutral-700">Reports & Analytics</h1>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => handleExport("excel")}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button variant="outline" onClick={() => handleExport("pdf")}>
                <FileDown className="mr-2 h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
          
          {/* Report Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div className="w-full md:w-auto">
              <p className="text-sm font-medium mb-1">Time Period</p>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="1month">Last Month</SelectItem>
                  <SelectItem value="3months">Last 3 Months</SelectItem>
                  <SelectItem value="6months">Last 6 Months</SelectItem>
                  <SelectItem value="1year">Last Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="w-full md:w-auto">
              <p className="text-sm font-medium mb-1">District</p>
              <Select value={district} onValueChange={setDistrict}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {districts.slice(1).map(d => (
                    <SelectItem key={d} value={d}>{d}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Children
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reportData?.totalChildren || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Screenings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reportData?.totalScreenings || 0}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Referrals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{reportData?.totalReferrals || 0}</div>
              </CardContent>
            </Card>
          </div>
          
          {/* Report Tabs */}
          <Tabs defaultValue="health-status" className="space-y-4 report-charts">
            <TabsList>
              <TabsTrigger value="health-status">Health Status</TabsTrigger>
              <TabsTrigger value="geographic">Geographic Distribution</TabsTrigger>
            </TabsList>
            
            <TabsContent value="health-status">
              <Card>
                <CardHeader>
                  <CardTitle>Child Health Status Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={true}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={120}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="geographic">
              <Card>
                <CardHeader>
                  <CardTitle>Children Distribution by District</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        layout="vertical"
                        data={districtData}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 60,
                          bottom: 5,
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="value" name="Number of Children" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PageLayout>
  );
}
