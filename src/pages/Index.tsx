
import { useState, useEffect } from 'react';
import AuthForm from '@/components/auth/AuthForm';
import FileDrive from '@/components/drive/FileDrive';
import { getCurrentUser } from '@/utils/storageUtils';

const Index = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    const user = getCurrentUser();
    if (user) {
      setIsAuthenticated(true);
    }
  }, []);
  
  return (
    <div className="min-h-screen bg-muted/50">
      {isAuthenticated ? (
        <FileDrive />
      ) : (
        <AuthForm onSuccess={() => setIsAuthenticated(true)} />
      )}
    </div>
  );
};

export default Index;
