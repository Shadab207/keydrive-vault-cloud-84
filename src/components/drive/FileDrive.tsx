
import { useState, useEffect } from 'react';
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import FileUploader from './FileUploader';
import FileList from './FileList';
import StorageUsage from './StorageUsage';
import { 
  getCurrentUser, 
  getUserStorage, 
  UserStorage, 
  FileMetadata,
  logoutUser
} from '@/utils/storageUtils';
import { GridIcon, List, LogOut, Search } from 'lucide-react';

const FileDrive = () => {
  const { toast } = useToast();
  const [storage, setStorage] = useState<UserStorage | null>(null);
  const [filteredFiles, setFilteredFiles] = useState<FileMetadata[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  
  const refreshStorage = () => {
    const user = getCurrentUser();
    
    if (user) {
      const userStorage = getUserStorage(user);
      setStorage(userStorage);
      setFilteredFiles(userStorage.files);
    }
  };
  
  useEffect(() => {
    refreshStorage();
  }, []);
  
  useEffect(() => {
    if (storage) {
      setFilteredFiles(
        storage.files.filter(file => 
          file.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }
  }, [searchQuery, storage]);
  
  const handleLogout = () => {
    logoutUser();
    window.location.reload();
  };
  
  if (!storage) {
    return <div>Loading...</div>;
  }
  
  return (
    <div className="container py-6 max-w-6xl">
      <header className="mb-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-drive-dark">KeyDrive Vault</h1>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search files..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={view === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setView('grid')}
            >
              <GridIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={view === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      
      <StorageUsage storage={storage} />
      
      <FileUploader onUploadComplete={refreshStorage} />
      
      <FileList 
        files={filteredFiles}
        onFileDeleted={refreshStorage}
        view={view}
      />
    </div>
  );
};

export default FileDrive;
