
import { useState, useCallback } from 'react';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { uploadFile, getCurrentUser, formatFileSize } from '@/utils/storageUtils';
import { useDropzone } from 'react-dropzone';
import { Upload, Activity, Download, Trash2 } from 'lucide-react';

interface FileUploaderProps {
  onUploadComplete: () => void;
}

interface NetworkMetrics {
  timestamp: number;
  uploadSpeed: number;
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
  progress: number;
  currentSpeed: number;
  actuallyUploaded: boolean;
}

const FileUploader = ({ onUploadComplete }: FileUploaderProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSessions, setUploadSessions] = useState<FileUploadSession[]>([]);

  const calculateNetworkMetrics = (bytesTransferred: number, totalBytes: number, startTime: number, lastBytes: number): NetworkMetrics => {
    const now = Date.now();
    const elapsed = (now - startTime) / 1000;
    const bytesDelta = bytesTransferred - lastBytes;
    const uploadSpeed = elapsed > 0 ? (bytesDelta / 1024) / elapsed : 0;
    const packetsEstimate = Math.ceil(bytesTransferred / 1500);
    const progress = (bytesTransferred / totalBytes) * 100;

    return {
      timestamp: now,
      uploadSpeed,
      packetsEstimate,
      bytesTransferred,
      totalBytes,
      progress
    };
  };

  const simulateFileUpload = async (file: File): Promise<boolean> => {
    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    let lastBytes = 0;
    const totalBytes = file.size;
    const chunkSize = Math.max(1024, Math.floor(totalBytes / 100));

    const newSession: FileUploadSession = {
      id: sessionId,
      fileName: file.name,
      fileSize: totalBytes,
      uploadTime: new Date().toLocaleString(),
      metrics: [],
      completed: false,
      progress: 0,
      currentSpeed: 0,
      actuallyUploaded: false
    };

    setUploadSessions(prev => [...prev, newSession]);

    return new Promise((resolve) => {
      let bytesTransferred = 0;
      const metricsHistory: NetworkMetrics[] = [];

      const uploadChunk = async () => {
        if (bytesTransferred >= totalBytes) {
          // Actually upload the file to storage when simulation completes
          const user = getCurrentUser();
          const success = user ? await uploadFile(user, file) : false;
          
          setUploadSessions(prev => 
            prev.map(session => 
              session.id === sessionId 
                ? { 
                    ...session, 
                    metrics: metricsHistory, 
                    completed: true, 
                    progress: 100,
                    actuallyUploaded: success
                  }
                : session
            )
          );
          
          resolve(success);
          return;
        }

        bytesTransferred = Math.min(bytesTransferred + chunkSize, totalBytes);
        const networkMetrics = calculateNetworkMetrics(bytesTransferred, totalBytes, startTime, lastBytes);
        
        metricsHistory.push(networkMetrics);
        lastBytes = bytesTransferred;

        setUploadSessions(prev => 
          prev.map(session => 
            session.id === sessionId 
              ? { 
                  ...session, 
                  metrics: [...metricsHistory],
                  progress: networkMetrics.progress,
                  currentSpeed: networkMetrics.uploadSpeed
                }
              : session
          )
        );

        setTimeout(uploadChunk, 50 + Math.random() * 100);
      };

      uploadChunk();
    });
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
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
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const file of acceptedFiles) {
        const success = await simulateFileUpload(file);
        
        if (success) {
          successCount++;
        } else {
          failCount++;
        }
      }
      
      if (successCount > 0) {
        toast({
          title: "Upload Complete",
          description: `Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}${failCount > 0 ? `, ${failCount} failed` : ''}`,
        });
        
        // Refresh the storage display
        onUploadComplete();
      } else if (failCount > 0) {
        toast({
          title: "Upload Failed",
          description: "Not enough storage space available",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "An error occurred while uploading files",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  }, [toast, onUploadComplete]);

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
    link.download = `${session.fileName}_network_metrics.csv`;
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
    toast({
      title: "Session Deleted",
      description: "Upload session data has been removed",
    });
  };
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="space-y-6">
      <Card className="mb-6">
        <CardContent className="p-4">
          <div 
            {...getRootProps()} 
            className={`drop-zone ${isDragActive ? 'active' : ''} cursor-pointer`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center justify-center text-center">
              <Upload className="h-10 w-10 mb-2 text-drive-primary" />
              <p className="text-lg font-medium">
                {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
              </p>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                or click to browse your device
              </p>
              <Button 
                variant="outline" 
                disabled={isUploading}
                className="mt-2"
                onClick={(e) => e.stopPropagation()}
              >
                {isUploading ? 'Uploading...' : 'Select Files'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {uploadSessions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Network Upload Monitoring
            </h3>
            <div className="space-y-4">
              {uploadSessions.map((session) => (
                <div key={session.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      <span className="font-medium">{session.fileName}</span>
                      <span className="text-sm text-muted-foreground">
                        ({formatFileSize(session.fileSize)})
                      </span>
                      {session.completed && session.actuallyUploaded && (
                        <span className="text-green-600 text-sm">✓ Uploaded to Storage</span>
                      )}
                      {session.completed && !session.actuallyUploaded && (
                        <span className="text-red-600 text-sm">✗ Upload Failed</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadSessionData(session)}
                        disabled={!session.completed || session.metrics.length === 0}
                        className="flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Export CSV
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

                  {!session.completed && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress: {session.progress.toFixed(1)}%</span>
                        <span>Speed: {session.currentSpeed.toFixed(1)} KB/s</span>
                      </div>
                      <Progress value={session.progress} className="w-full" />
                    </div>
                  )}

                  {session.completed && session.metrics.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-primary">
                          {(session.metrics.reduce((sum, m) => sum + m.uploadSpeed, 0) / session.metrics.length).toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">Avg Speed (KB/s)</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-primary">
                          {Math.max(...session.metrics.map(m => m.uploadSpeed)).toFixed(1)}
                        </div>
                        <div className="text-xs text-muted-foreground">Peak Speed (KB/s)</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-primary">
                          {Math.max(...session.metrics.map(m => m.packetsEstimate)).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Packets</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-bold text-primary">
                          {session.uploadTime.split(' ')[1]}
                        </div>
                        <div className="text-xs text-muted-foreground">Upload Time</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FileUploader;
