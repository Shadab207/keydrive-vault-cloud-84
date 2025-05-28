import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, AreaChart, Area } from 'recharts';
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Download, Upload, Activity, Wifi } from 'lucide-react';

interface PacketData {
  timestamp: number;
  uploadPackets: number;
  downloadPackets: number;
  uploadSpeed: number;
  downloadSpeed: number;
  totalBytes: number;
}

const PacketMonitor = () => {
  const { toast } = useToast();
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [packetData, setPacketData] = useState<PacketData[]>([]);
  const [currentStats, setCurrentStats] = useState({
    uploadSpeed: 0,
    downloadSpeed: 0,
    totalPackets: 0,
    sessionTime: 0
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  const simulateNetworkActivity = () => {
    const now = Date.now();
    const elapsed = (now - startTimeRef.current) / 1000;
    
    // Simulate varying network activity
    const uploadSpeed = Math.random() * 500 + 100; // 100-600 KB/s
    const downloadSpeed = Math.random() * 800 + 200; // 200-1000 KB/s
    const uploadPackets = Math.floor(uploadSpeed * 0.7); // Estimate packets
    const downloadPackets = Math.floor(downloadSpeed * 0.8);
    const totalBytes = (uploadSpeed + downloadSpeed) * 1024; // Convert to bytes

    const newDataPoint: PacketData = {
      timestamp: now,
      uploadPackets,
      downloadPackets,
      uploadSpeed,
      downloadSpeed,
      totalBytes
    };

    setPacketData(prev => {
      const updated = [...prev, newDataPoint];
      // Keep only last 50 data points for performance
      return updated.slice(-50);
    });

    setCurrentStats({
      uploadSpeed,
      downloadSpeed,
      totalPackets: uploadPackets + downloadPackets,
      sessionTime: elapsed
    });
  };

  const startMonitoring = () => {
    setIsMonitoring(true);
    startTimeRef.current = Date.now();
    setPacketData([]);
    
    intervalRef.current = setInterval(simulateNetworkActivity, 1000);
    
    toast({
      title: "Monitoring Started",
      description: "Real-time packet monitoring is now active",
    });
  };

  const stopMonitoring = () => {
    setIsMonitoring(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    toast({
      title: "Monitoring Stopped",
      description: "Packet monitoring session ended",
    });
  };

  const exportData = () => {
    if (packetData.length === 0) {
      toast({
        title: "No Data",
        description: "No monitoring data available to export",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = 'Timestamp,Upload_Speed_KBps,Download_Speed_KBps,Upload_Packets,Download_Packets,Total_Bytes\n';
    const csvData = packetData.map(data => 
      `${new Date(data.timestamp).toISOString()},${data.uploadSpeed.toFixed(2)},${data.downloadSpeed.toFixed(2)},${data.uploadPackets},${data.downloadPackets},${data.totalBytes}`
    ).join('\n');

    const blob = new Blob([csvHeaders + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `packet_monitor_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Data Exported",
      description: "Packet monitoring data exported successfully",
    });
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const chartData = packetData.map((data, index) => ({
    time: index,
    timeLabel: new Date(data.timestamp).toLocaleTimeString(),
    uploadSpeed: data.uploadSpeed,
    downloadSpeed: data.downloadSpeed,
    uploadPackets: data.uploadPackets,
    downloadPackets: data.downloadPackets
  }));

  const chartConfig = {
    uploadSpeed: {
      label: "Upload Speed (KB/s)",
      color: "hsl(var(--primary))",
    },
    downloadSpeed: {
      label: "Download Speed (KB/s)",
      color: "hsl(var(--secondary))",
    },
    uploadPackets: {
      label: "Upload Packets",
      color: "hsl(var(--accent))",
    },
    downloadPackets: {
      label: "Download Packets",
      color: "hsl(var(--muted))",
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Real-time Packet Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            {!isMonitoring ? (
              <Button onClick={startMonitoring} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Start Monitoring
              </Button>
            ) : (
              <Button onClick={stopMonitoring} variant="destructive" className="flex items-center gap-2">
                <Pause className="h-4 w-4" />
                Stop Monitoring
              </Button>
            )}
            
            <Button 
              onClick={exportData} 
              variant="outline" 
              disabled={packetData.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>

          {isMonitoring && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  <Upload className="h-4 w-4" />
                  {currentStats.uploadSpeed.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Upload KB/s</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-secondary flex items-center justify-center gap-1">
                  <Download className="h-4 w-4" />
                  {currentStats.downloadSpeed.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">Download KB/s</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-accent">
                  {currentStats.totalPackets}
                </div>
                <div className="text-xs text-muted-foreground">Total Packets</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  <Wifi className="h-4 w-4" />
                  {currentStats.sessionTime.toFixed(0)}s
                </div>
                <div className="text-xs text-muted-foreground">Session Time</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Upload vs Download Speed</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={(value) => chartData[value]?.timeLabel?.split(' ')[1] || ''}
                  />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(value) => chartData[value]?.timeLabel || ''}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="uploadSpeed" 
                    stackId="1"
                    stroke="var(--color-uploadSpeed)" 
                    fill="var(--color-uploadSpeed)"
                    fillOpacity={0.6}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="downloadSpeed" 
                    stackId="2"
                    stroke="var(--color-downloadSpeed)" 
                    fill="var(--color-downloadSpeed)"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Packet Transfer Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[250px]">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="time" 
                    tickFormatter={(value) => chartData[value]?.timeLabel?.split(' ')[1] || ''}
                  />
                  <YAxis />
                  <ChartTooltip 
                    content={<ChartTooltipContent />}
                    labelFormatter={(value) => chartData[value]?.timeLabel || ''}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="uploadPackets" 
                    stroke="var(--color-uploadPackets)" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="downloadPackets" 
                    stroke="var(--color-downloadPackets)" 
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default PacketMonitor;
