import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SyncStatusCard } from "@/components/sync-status";
import { OfflineBanner } from "@/components/offline-banner";
import { FiWifi, FiWifiOff, FiRefreshCw, FiHome, FiCheckCircle, FiAlertCircle } from "react-icons/fi";
import { FiClipboard, FiUsers, FiBarChart2 } from "react-icons/fi";

// Dashboard Components for the demo
const QuickStats = ({ isOnline }) => (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Registered Children</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">42</p>
        <p className="text-xs text-muted-foreground">Last sync: 5 mins ago</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Screenings</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">18</p>
        <p className="text-xs text-muted-foreground">Last sync: 5 mins ago</p>
      </CardContent>
    </Card>
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Referrals</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">7</p>
        <p className="text-xs text-muted-foreground">Last sync: 5 mins ago</p>
      </CardContent>
    </Card>
  </div>
);

const RecentActivity = () => (
  <Card className="mb-6">
    <CardHeader>
      <CardTitle>Recent Activity</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-4">
        <div className="flex items-start gap-3 pb-3 border-b">
          <div className="bg-green-100 p-2 rounded">
            <FiCheckCircle className="text-green-600" />
          </div>
          <div>
            <p className="font-medium">New screening completed</p>
            <p className="text-sm text-muted-foreground">Sarah Nakimuli - Vision and hearing assessment</p>
            <p className="text-xs text-muted-foreground">20 minutes ago (Saved while offline)</p>
          </div>
        </div>
        <div className="flex items-start gap-3 pb-3 border-b">
          <div className="bg-amber-100 p-2 rounded">
            <FiAlertCircle className="text-amber-600" />
          </div>
          <div>
            <p className="font-medium">Referral created</p>
            <p className="text-sm text-muted-foreground">John Mukasa - MDAT screening results</p>
            <p className="text-xs text-muted-foreground">2 hours ago</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded">
            <FiUsers className="text-blue-600" />
          </div>
          <div>
            <p className="font-medium">New child registered</p>
            <p className="text-sm text-muted-foreground">Emma Akullo - 6 months old</p>
            <p className="text-xs text-muted-foreground">Yesterday</p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function HomePage() {
  const [_, setLocation] = useLocation();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionTests, setConnectionTests] = useState<{time: string, result: string}[]>([]);
  const [showDemo, setShowDemo] = useState(false);
  
  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Test connection to server
  const testConnection = async () => {
    try {
      const startTime = new Date();
      const timeString = startTime.toLocaleTimeString();
      
      const result = await fetch('/api/users');
      const success = result.ok;
      
      setConnectionTests(prev => [
        { time: timeString, result: success ? 'Connected' : 'Failed' },
        ...prev.slice(0, 4) // Keep last 5 tests
      ]);
    } catch (error) {
      const timeString = new Date().toLocaleTimeString();
      setConnectionTests(prev => [
        { time: timeString, result: 'Error' },
        ...prev.slice(0, 4)
      ]);
    }
  };

  if (showDemo) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-primary text-white p-4 shadow-md">
          <div className="container mx-auto flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <FiHome className="h-5 w-5" />
              <h1 className="text-xl font-bold">IDEC Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <SyncStatusCard />
              <Button variant="outline" className="text-white border-white hover:bg-white hover:text-primary" onClick={() => setShowDemo(false)}>
                Back to Demo Home
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto py-6 px-4">
          <div className="flex flex-col md:flex-row gap-6">
            {/* Left column (75%) */}
            <div className="md:w-3/4">
              <h2 className="text-2xl font-bold mb-4">Dashboard Overview</h2>
              
              <QuickStats isOnline={isOnline} />
              <RecentActivity />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>District Distribution</CardTitle>
                    <CardDescription>Children registered by district</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Kassanda</span>
                        <span className="font-medium">15</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{width: '35%'}}></div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Mubende</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{width: '28%'}}></div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Kyegegwa</span>
                        <span className="font-medium">8</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{width: '19%'}}></div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Kikuube</span>
                        <span className="font-medium">5</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{width: '12%'}}></div>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Kabarole</span>
                        <span className="font-medium">2</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{width: '6%'}}></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Screening Results</CardTitle>
                    <CardDescription>MDAT results distribution</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Normal</span>
                          <span className="font-medium">11 (61%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div className="bg-green-500 h-2.5 rounded-full" style={{width: '61%'}}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Moderate</span>
                          <span className="font-medium">5 (28%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div className="bg-yellow-500 h-2.5 rounded-full" style={{width: '28%'}}></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between mb-1">
                          <span>Severe</span>
                          <span className="font-medium">2 (11%)</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div className="bg-red-500 h-2.5 rounded-full" style={{width: '11%'}}></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Right column (25%) */}
            <div className="md:w-1/4 space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Connection Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    {isOnline ? (
                      <>
                        <FiWifi className="text-green-500" />
                        <span className="text-green-500 font-medium">Online</span>
                      </>
                    ) : (
                      <>
                        <FiWifiOff className="text-red-500" />
                        <span className="text-red-500 font-medium">Offline</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {isOnline 
                      ? 'All changes will sync immediately' 
                      : 'Changes will be saved locally and synced when you reconnect'
                    }
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full mt-3"
                    onClick={testConnection}
                  >
                    <FiRefreshCw className="mr-2 h-3 w-3" />
                    Test Connection
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start" disabled={!isOnline}>
                    <FiUsers className="mr-2 h-4 w-4" />
                    Register Child
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FiClipboard className="mr-2 h-4 w-4" />
                    New Screening
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FiBarChart2 className="mr-2 h-4 w-4" />
                    Reports
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Offline Changes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pending Screenings:</span>
                      <span className="font-medium">2</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Pending Children:</span>
                      <span className="font-medium">1</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Sync:</span>
                      <span className="font-medium">5 mins ago</span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="default" 
                      className="w-full mt-2"
                      disabled={!isOnline}
                    >
                      <FiRefreshCw className="mr-2 h-3 w-3" />
                      Sync Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        
        {/* Show offline banner when offline */}
        {!isOnline && <OfflineBanner />}
      </div>
    );
  }

  // Landing page with demo explanation
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-700 to-indigo-800 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">IDEC Offline Functionality Demo</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  Connection Status
                  {isOnline ? (
                    <FiWifi className="ml-2 text-green-500" />
                  ) : (
                    <FiWifiOff className="ml-2 text-red-500" />
                  )}
                </CardTitle>
                <CardDescription>
                  Shows your current network connection status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-medium">
                  You are currently: <span className={isOnline ? "text-green-500" : "text-red-500"}>
                    {isOnline ? "Online" : "Offline"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  You can simulate going offline by:
                </p>
                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                  <li>Using browser DevTools (Network tab → Offline)</li>
                  <li>Turning off your Wi-Fi or network connection</li>
                </ul>
              </CardContent>
              <CardFooter className="flex gap-3">
                <Button onClick={testConnection} className="flex-1" variant="outline">
                  <FiRefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
                </Button>
                
                <Button 
                  onClick={() => setShowDemo(true)} 
                  className="flex-1"
                >
                  View Dashboard Demo
                </Button>
              </CardFooter>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Connection Test Results</CardTitle>
                <CardDescription>
                  History of connection test attempts
                </CardDescription>
              </CardHeader>
              <CardContent>
                {connectionTests.length === 0 ? (
                  <p className="text-center text-muted-foreground">No tests run yet</p>
                ) : (
                  <div className="space-y-2">
                    {connectionTests.map((test, i) => (
                      <div key={i} className="flex justify-between items-center border-b pb-2">
                        <span>{test.time}</span>
                        <span className={
                          test.result === 'Connected' 
                            ? 'text-green-500' 
                            : 'text-red-500'
                        }>
                          {test.result}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            <div className="h-auto">
              <SyncStatusCard />
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Offline Features</CardTitle>
                <CardDescription>
                  Key features of the offline functionality
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 font-medium mr-2 px-2.5 py-0.5 rounded">1</span>
                    <div>
                      <strong>Sync Status Indicator</strong>
                      <p className="text-sm text-muted-foreground">Shows online/offline status and pending changes</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 font-medium mr-2 px-2.5 py-0.5 rounded">2</span>
                    <div>
                      <strong>IndexedDB Local Storage</strong>
                      <p className="text-sm text-muted-foreground">Stores data locally when offline</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 font-medium mr-2 px-2.5 py-0.5 rounded">3</span>
                    <div>
                      <strong>Offline Banner</strong>
                      <p className="text-sm text-muted-foreground">Clear visual notification when working offline</p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-green-100 text-green-800 font-medium mr-2 px-2.5 py-0.5 rounded">4</span>
                    <div>
                      <strong>Automatic Sync</strong>
                      <p className="text-sm text-muted-foreground">Changes sync when network connection returns</p>
                    </div>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Show the offline banner when offline */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
          <OfflineBanner />
        </div>
      )}
    </div>
  );
}
