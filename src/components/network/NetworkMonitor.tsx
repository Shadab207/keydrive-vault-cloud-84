
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, Activity, Wifi, File, Trash2 } from 'lucide-react';
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

interface FileUploadSession {
  id: string;
  fileName: string;
  fileSize: number;
  uploadTime: string;
  metrics: NetworkMetrics[];
  completed: boolean;
}

const NetworkMonitor = () => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [currentMetrics, setCurrentMetrics] = useState<NetworkMetrics | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSessions, setUploadSessions] = useState<FileUploadSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
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

    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setCurrentFileName(file.name);
    startTimeRef.current = Date.now();
    lastBytesRef.current = 0;
    const totalBytes = file.size;
    const chunkSize = Math.max(1024, Math.floor(totalBytes / 100)); // 1% chunks minimum 1KB

    // Create new upload session
    const newSession: FileUploadSession = {
      id: sessionId,
      fileName: file.name,
      fileSize: totalBytes,
      uploadTime: new Date().toLocaleString(),
      metrics: [],
      completed: false
    };

    setUploadSessions(prev => [...prev, newSession]);

    return new Promise((resolve) => {
      let bytesTransferred = 0;
      const metricsHistory: NetworkMetrics[] = [];

      const uploadChunk = () => {
        if (bytesTransferred >= totalBytes) {
          // Final upload
          const success = uploadFile(user, file);
          
          // Update session as completed
          setUploadSessions(prev => 
            prev.map(session => 
              session.id === sessionId 
                ? { ...session, metrics: metricsHistory, completed: true }
                : session
            )
          );
          
          setIsUploading(false);
          setUploadProgress(100);
          setCurrentMetrics(null);
          setCurrentFileName('');
          resolve(success);
          return;
        }

        bytesTransferred = Math.min(bytesTransferred + chunkSize, totalBytes);
        const networkMetrics = calculateNetworkMetrics(bytesTransferred, totalBytes);
        
        setCurrentMetrics(networkMetrics);
        setUploadProgress(networkMetrics.progress);
        metricsHistory.push(networkMetrics);

        // Update session with current metrics
        setUploadSessions(prev => 
          prev.map(session => 
            session.id === sessionId 
              ? { ...session, metrics: [...metricsHistory] }
              : session
          )
        );

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

  const downloadSessionData = (session: FileUploadSession) => {
    if (session.metrics.length === 0) {
      toast({
        title: "No Data",
        description: "No metrics available for this upload session",
        variant: "destructive",
      });
      return;
    }

    const csvHeaders = 'Timestamp,Upload_Speed_KBps,Packets_Estimate,Bytes_Transferred,Total_Bytes,Progress_Percent\n';
    const csvData = session.metrics.map(metric => 
      `${new Date(metric.timestamp).toISOString()},${metric.uploadSpeed.toFixed(2)},${metric.packetsEstimate},${metric.bytesTransferred},${metric.totalBytes},${metric.progress.toFixed(2)}`
    ).join('\n');

    const blob = new Blob([csvHeaders + csvData], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${session.fileName}_metrics_${session.id}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Download Complete",
      description: `Network metrics for ${session.fileName} exported`,
    });
  };

  const deleteSession = (sessionId: string) => {
    setUploadSessions(prev => prev.filter(session => session.id !== sessionId));
    if (selectedSessionId === sessionId) {
      setSelectedSessionId(null);
    }
    toast({
      title: "Session Deleted",
      description: "Upload session data has been removed",
    });
  };

  const selectedSession = uploadSessions.find(session => session.id === selectedSessionId);

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
                <span>Uploading: {currentFileName}</span>
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

      {uploadSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Sessions History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {uploadSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="h-4 w-4" />
                    <div>
                      <div className="font-medium">{session.fileName}</div>
                      <div className="text-sm text-muted-foreground">
                        {(session.fileSize / 1024).toFixed(1)} KB • {session.uploadTime}
                        {session.completed && <span className="text-green-600 ml-2">✓ Completed</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSessionId(session.id)}
                      disabled={!session.completed}
                    >
                      View Graph
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadSessionData(session)}
                      disabled={!session.completed || session.metrics.length === 0}
                      className="flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Export
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedSession && selectedSession.metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Network Analysis: {selectedSession.fileName}</CardTitle>
          </CardHeader>
          <CardContent>
            <NetworkGraph metrics={selectedSession.metrics} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default NetworkMonitor;
