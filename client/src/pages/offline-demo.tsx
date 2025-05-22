import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncStatusCard } from "@/components/sync-status";
import { OfflineBanner } from "@/components/offline-banner";
import { FiWifi, FiWifiOff, FiRefreshCw } from "react-icons/fi";

export default function OfflineDemoPage() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [connectionTests, setConnectionTests] = useState<{time: string, result: string}[]>([]);
  
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
              <CardFooter>
                <Button onClick={testConnection} className="w-full" variant="outline">
                  <FiRefreshCw className="mr-2 h-4 w-4" />
                  Test Connection
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
      
      {/* Always show the offline banner for demo purposes */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
        {!isOnline && <OfflineBanner />}
      </div>
    </div>
  );
}