
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { getCurrentUser, getUserStorage, formatFileSize } from '@/utils/storageUtils';
import { FileText, HardDrive, Download, TrendingUp } from 'lucide-react';

const FileAnalytics = () => {
  const [storage, setStorage] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [typeData, setTypeData] = useState([]);

  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      const userStorage = getUserStorage(user);
      setStorage(userStorage);

      // Prepare chart data by file size
      const sizeData = userStorage.files.map(file => ({
        name: file.name.length > 15 ? file.name.substring(0, 15) + '...' : file.name,
        size: file.size / 1024, // KB
        sizeFormatted: formatFileSize(file.size),
        uploadDate: new Date(file.lastModified).toLocaleDateString()
      }));
      setChartData(sizeData);

      // Prepare data by file type
      const typeMap = {};
      userStorage.files.forEach(file => {
        const type = file.type.split('/')[0] || 'other';
        typeMap[type] = (typeMap[type] || 0) + 1;
      });
      
      const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];
      const typeChartData = Object.entries(typeMap).map(([type, count], index) => ({
        name: type,
        value: count,
        fill: colors[index % colors.length]
      }));
      setTypeData(typeChartData);
    }
  }, []);

  const chartConfig = {
    size: {
      label: "File Size (KB)",
      color: "hsl(var(--primary))",
    }
  };

  if (!storage) return <div>Loading analytics...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Files</p>
                <p className="text-2xl font-bold">{storage.files.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Used Space</p>
                <p className="text-2xl font-bold">{formatFileSize(storage.usedSpace)}</p>
              </div>
              <HardDrive className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Free Space</p>
                <p className="text-2xl font-bold">{formatFileSize(storage.totalSpace - storage.usedSpace)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg File Size</p>
                <p className="text-2xl font-bold">
                  {storage.files.length > 0 
                    ? formatFileSize(storage.usedSpace / storage.files.length)
                    : '0 B'
                  }
                </p>
              </div>
              <Download className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Files by Size</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="size" fill="var(--color-size)" />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Files by Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px]">
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {typeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FileAnalytics;
