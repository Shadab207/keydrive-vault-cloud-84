
import { useState } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { FileMetadata, getCurrentUser, deleteFile, downloadFile, formatFileSize, getFileIcon } from '@/utils/storageUtils';
import { Download, Trash2, MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileListProps {
  files: FileMetadata[];
  onFileDeleted: () => void;
  view: 'grid' | 'list';
}

const FileList = ({ files, onFileDeleted, view }: FileListProps) => {
  const { toast } = useToast();
  
  const handleDownload = (file: FileMetadata) => {
    const user = getCurrentUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive",
      });
      return;
    }
    
    const fileData = downloadFile(user, file.id);
    
    if (fileData) {
      // Create a downloadable link
      const link = document.createElement('a');
      link.href = fileData;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download Started",
        description: `Downloading ${file.name}`,
      });
    } else {
      toast({
        title: "Error",
        description: "File not found",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (file: FileMetadata) => {
    const user = getCurrentUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "Authentication required",
        variant: "destructive",
      });
      return;
    }
    
    const success = deleteFile(user, file.id);
    
    if (success) {
      toast({
        title: "Success",
        description: `${file.name} has been deleted`,
      });
      onFileDeleted();
    } else {
      toast({
        title: "Error",
        description: "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  if (files.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-xl font-medium text-muted-foreground">No files found</p>
        <p className="text-sm text-muted-foreground mt-1">Upload files to get started</p>
      </div>
    );
  }

  return (
    <>
      {view === 'grid' ? (
        <div className="file-grid">
          {files.map((file) => (
            <FileCard 
              key={file.id} 
              file={file} 
              onDownload={() => handleDownload(file)} 
              onDelete={() => handleDelete(file)} 
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {files.map((file) => (
            <FileRow 
              key={file.id} 
              file={file} 
              onDownload={() => handleDownload(file)} 
              onDelete={() => handleDelete(file)} 
            />
          ))}
        </div>
      )}
    </>
  );
};

interface FileItemProps {
  file: FileMetadata;
  onDownload: () => void;
  onDelete: () => void;
}

const FileCard = ({ file, onDownload, onDelete }: FileItemProps) => {
  return (
    <Card className="file-item overflow-hidden">
      <div 
        className="h-36 flex items-center justify-center bg-muted p-4"
        onClick={onDownload}
      >
        <div className="text-4xl">{getFileIcon(file.type)}</div>
      </div>
      <CardContent className="p-4">
        <h3 className="font-medium truncate" title={file.name}>
          {file.name}
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          {formatFileSize(file.size)}
        </p>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        <Button variant="ghost" size="icon" onClick={onDownload}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
};

const FileRow = ({ file, onDownload, onDelete }: FileItemProps) => {
  return (
    <div className="file-item flex items-center justify-between p-3 bg-card rounded-md">
      <div className="flex items-center space-x-3" onClick={onDownload} style={{cursor: 'pointer'}}>
        <div className="text-2xl">{getFileIcon(file.type)}</div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate" title={file.name}>
            {file.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(file.size)}
          </p>
        </div>
      </div>
      <div className="flex space-x-1">
        <Button variant="ghost" size="icon" onClick={onDownload}>
          <Download className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

export default FileList;
