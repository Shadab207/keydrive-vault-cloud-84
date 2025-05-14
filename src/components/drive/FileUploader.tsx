
import { useState, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { uploadFile, getCurrentUser, formatFileSize } from '@/utils/storageUtils';
import { useDropzone } from 'react-dropzone';
import { Upload } from 'lucide-react';

interface FileUploaderProps {
  onUploadComplete: () => void;
}

const FileUploader = ({ onUploadComplete }: FileUploaderProps) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);

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
      
      // Process each file
      for (const file of acceptedFiles) {
        const success = await uploadFile(user, file);
        
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
        
        // Trigger refresh of file list
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
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
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
  );
};

export default FileUploader;
