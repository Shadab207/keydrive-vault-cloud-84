
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Activity, Wifi } from 'lucide-react';
import { uploadFile, getCurrentUser } from '@/utils/storageUtils';
import NetworkGraph from './NetworkGraph';

interface NetworkMetrics {
  timestamp: number;
  uploadSpeed: number; // KB/s
  packetsEstimate: number;
  bytesTransferred: number;
  totalBytes: number;
  progress: number;
}

const NetworkMonitor = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [metrics, setMetrics] = useState<NetworkMetrics[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<NetworkMetrics | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startTimeRef = useRef<number>(0);
  const lastBytesRef = useRef<number>(0);

  const calculateNetworkMetrics = (bytesTransferred: number, totalBytes: number): NetworkMetrics => {
    const now = Date.now();
    const elapsed = (now - startTimeRef.current) / 1000; // seconds
    const bytesDelta = bytesTransferred - lastBytesRef.current;
    const uploadSpeed = elapsed > 0 ? (bytesDelta / 1024) / elapsed : 0; // KB/s
    
    // Estimate packets (assuming average packet size of 1500 bytes for TCP)
    const packetsEstimate = Math.ceil(bytesTransferred / 1500);
    
    const progress = (bytesTransferred / totalBytes) * 100;

    lastBytesRef.current = bytesTransferred;

    return {
      timestamp: now,
      uploadSpeed,
      packetsEstimate,
      bytesTransferred,
      totalBytes,
      progress
    };
  };

  const simulateUploadProgress = async (file: File): Promise<boolean> => {
    const user = getCurrentUser();
    if (!user) return false;

    startTimeRef.current = Date.now();
    lastBytesRef.current = 0;
    const totalBytes = file.size;
    const chunkSize = Math.max(1024, Math.floor(totalBytes / 100)); // 1% chunks minimum 1KB

    return new Promise((resolve) => {
      let bytesTransferred = 0;
      const metricsHistory: NetworkMetrics[] = [];

      const uploadChunk = () => {
        if (bytesTransferred >= totalBytes) {
          // Final upload
          const success = uploadFile(user, file);
          setMetrics(prev => [...prev, ...metricsHistory]);
          setIsUploading(false);
          setUploadProgress(100);
          resolve(success);
          return;
        }

        bytesTransferred = Math.min(bytesTransferred + chunkSize, totalBytes);
        const networkMetrics = calculateNetworkMetrics(bytesTransferred, totalBytes);
        
        setCurrentMetrics(networkMetrics);
        setUploadProgress(networkMetrics.progress);
        metricsHistory.push(networkMetrics);

        // Simulate network delay
        setTimeout(uploadChunk, 50 + Math.random() * 100);
      };

      uploadChunk();
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const user = getCurrentUser();
    if (!user) {
      toast({
        title: "Authentication Error",
        description: "Please log in to upload files",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setCurrentMetrics(null);

    try {
      for (const file of Array.from(files)) {
        const success = await simulateUploadProgress(file);
        
        if (success) {
          toast({
            title: "Upload Complete",
            description: `${file.name} uploaded successfully`,
          });
        } else {
          toast({
            title: "Upload Failed",
            description: `Failed to upload ${file.name}`,
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "An error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadGraphData = () => {
    if (metrics.length === 0) {
      toast({
        title: "No Data",
        description: "No upload metrics available to download",
        variant: "destructive",
      });
      return;
    }

    // Format data for Power BI (CSV format)
    const csvHeaders = 'Timestamp,Upload_Speed_KBps,Packets_Estimate,Bytes_Transferred,Total_Bytes,Progress_Percent\n';
    const csvData = metrics.map(metric => 
      `${new Date(metric.timestamp).toISOString()},${metric.uploadSpeed.toFixed(2)},${metric.packetsEstimate},${metric.bytesTransferred},${metric.totalBytes},${metric.progress.toFixed(2)}`
    ).join('\n');

    const blob = new Blob([csvHeaders + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `network_metrics_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: "Network metrics exported for Power BI",
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Network Performance Monitor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload & Monitor'}
            </Button>
            
            <Button
              variant="outline"
              onClick={downloadGraphData}
              disabled={metrics.length === 0}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export Data
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />

          {isUploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Upload Progress</span>
                <span>{uploadProgress.toFixed(1)}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {currentMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {currentMetrics.uploadSpeed.toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">KB/s</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {currentMetrics.packetsEstimate.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Packets</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {(currentMetrics.bytesTransferred / 1024).toFixed(1)}
                </div>
                <div className="text-sm text-muted-foreground">KB Sent</div>
              </div>
              
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary flex items-center justify-center gap-1">
                  <Wifi className="h-4 w-4" />
                  Active
                </div>
                <div className="text-sm text-muted-foreground">Status</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {metrics.length > 0 && (
        <NetworkGraph metrics={metrics} />
      )}
    </div>
  );
};

export default NetworkMonitor;
