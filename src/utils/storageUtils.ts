
// Simulating a file storage system using localStorage

// Type definitions
export interface User {
  username: string;
  password: string; // In a real app, this would be hashed
  storageKey: string;
}

export interface FileMetadata {
  id: string;
  name: string;
  type: string;
  size: number; // in bytes
  lastModified: number; // timestamp
  path?: string;
}

export interface UserStorage {
  files: FileMetadata[];
  usedSpace: number; // in bytes
  totalSpace: 1099511627776; // 1TB in bytes
}

// Constants
const USERS_KEY = 'keydrive_vault_users';
const CURRENT_USER_KEY = 'keydrive_vault_current_user';
const MAX_STORAGE = 1099511627776; // 1TB in bytes

// Helper to generate a random 10-character key
export const generateStorageKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
  let result = '';
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Initialize storage if it doesn't exist
const initializeStorage = (): void => {
  if (!localStorage.getItem(USERS_KEY)) {
    localStorage.setItem(USERS_KEY, JSON.stringify([]));
  }
};

// User management
export const registerUser = (username: string, password: string): User | null => {
  initializeStorage();
  
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  
  // Check if user already exists
  if (users.some(user => user.username === username)) {
    return null;
  }
  
  // Create new user with a unique storage key
  const newUser: User = {
    username,
    password, // In a real app, this would be hashed
    storageKey: generateStorageKey()
  };
  
  // Add user to the list
  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  
  // Initialize user's storage
  const userStorage: UserStorage = {
    files: [],
    usedSpace: 0,
    totalSpace: MAX_STORAGE
  };
  
  localStorage.setItem(`storage_${newUser.username}_${newUser.storageKey}`, JSON.stringify(userStorage));
  
  return newUser;
};

export const loginUser = (username: string, password: string): User | null => {
  initializeStorage();
  
  const users: User[] = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // Store current user in session
    sessionStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
    return user;
  }
  
  return null;
};

export const logoutUser = (): void => {
  sessionStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const userData = sessionStorage.getItem(CURRENT_USER_KEY);
  return userData ? JSON.parse(userData) : null;
};

// File management
export const getUserStorage = (user: User): UserStorage => {
  const storageKey = `storage_${user.username}_${user.storageKey}`;
  const storageData = localStorage.getItem(storageKey);
  
  if (!storageData) {
    // Initialize if not exists
    const newStorage: UserStorage = {
      files: [],
      usedSpace: 0,
      totalSpace: MAX_STORAGE
    };
    localStorage.setItem(storageKey, JSON.stringify(newStorage));
    return newStorage;
  }
  
  return JSON.parse(storageData);
};

export const uploadFile = async (user: User, file: File): Promise<boolean> => {
  const storage = getUserStorage(user);
  
  // Check if enough space is available
  if (storage.usedSpace + file.size > storage.totalSpace) {
    return false; // Not enough space
  }
  
  // Convert file to base64 for storage
  const base64 = await fileToBase64(file);
  
  // Create file metadata
  const fileId = generateFileId();
  const fileMetadata: FileMetadata = {
    id: fileId,
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: file.lastModified
  };
  
  // Store file data
  localStorage.setItem(`file_${user.username}_${user.storageKey}_${fileId}`, base64);
  
  // Update storage metadata
  storage.files.push(fileMetadata);
  storage.usedSpace += file.size;
  
  // Save updated storage
  localStorage.setItem(`storage_${user.username}_${user.storageKey}`, JSON.stringify(storage));
  
  return true;
};

export const deleteFile = (user: User, fileId: string): boolean => {
  const storage = getUserStorage(user);
  const fileIndex = storage.files.findIndex(f => f.id === fileId);
  
  if (fileIndex === -1) {
    return false; // File not found
  }
  
  const file = storage.files[fileIndex];
  
  // Remove file data
  localStorage.removeItem(`file_${user.username}_${user.storageKey}_${fileId}`);
  
  // Update storage metadata
  storage.usedSpace -= file.size;
  storage.files.splice(fileIndex, 1);
  
  // Save updated storage
  localStorage.setItem(`storage_${user.username}_${user.storageKey}`, JSON.stringify(storage));
  
  return true;
};

export const downloadFile = (user: User, fileId: string): string | null => {
  const storage = getUserStorage(user);
  const file = storage.files.find(f => f.id === fileId);
  
  if (!file) {
    return null; // File not found
  }
  
  // Get file data
  return localStorage.getItem(`file_${user.username}_${user.storageKey}_${fileId}`);
};

// Helper functions
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const generateFileId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
};

export const formatFileSize = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`;
};

export const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('image/')) return '🖼️';
  if (fileType.startsWith('video/')) return '🎬';
  if (fileType.startsWith('audio/')) return '🎵';
  if (fileType === 'application/pdf') return '📄';
  if (fileType.includes('spreadsheet') || fileType.includes('excel')) return '📊';
  if (fileType.includes('document') || fileType.includes('word')) return '📝';
  if (fileType.includes('presentation') || fileType.includes('powerpoint')) return '📽️';
  return '📁';
};
