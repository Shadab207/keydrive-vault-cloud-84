
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, Zap } from 'lucide-react';

interface NetworkMetrics {
  timestamp: number;
  uploadSpeed: number;
  packetsEstimate: number;
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

interface NetworkGraphProps {
  metrics: NetworkMetrics[];
}

const NetworkGraph = ({ metrics }: NetworkGraphProps) => {
  // Prepare data for the chart
  const chartData = metrics.map((metric, index) => ({
    time: index,
    timeLabel: new Date(metric.timestamp).toLocaleTimeString(),
    uploadSpeed: metric.uploadSpeed,
    packets: metric.packetsEstimate,
    progress: metric.progress
  }));

  const chartConfig = {
    uploadSpeed: {
      label: "Upload Speed (KB/s)",
      color: "hsl(var(--primary))",
    },
    packets: {
      label: "Packets",
      color: "hsl(var(--secondary))",
    },
    progress: {
      label: "Progress (%)",
      color: "hsl(var(--accent))",
    }
  };

  const avgSpeed = metrics.reduce((sum, m) => sum + m.uploadSpeed, 0) / metrics.length;
  const maxSpeed = Math.max(...metrics.map(m => m.uploadSpeed));
  const totalPackets = Math.max(...metrics.map(m => m.packetsEstimate));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Speed</p>
                <p className="text-2xl font-bold">{avgSpeed.toFixed(1)} KB/s</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Peak Speed</p>
                <p className="text-2xl font-bold">{maxSpeed.toFixed(1)} KB/s</p>
              </div>
              <Zap className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Packets</p>
                <p className="text-2xl font-bold">{totalPackets.toLocaleString()}</p>
              </div>
              <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                P
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Speed Over Time</CardTitle>
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
                stroke="var(--color-uploadSpeed)" 
                fill="var(--color-uploadSpeed)"
                fillOpacity={0.3}
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
                dataKey="packets" 
                stroke="var(--color-packets)" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkGraph;
