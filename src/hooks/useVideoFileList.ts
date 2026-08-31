import { useState, useCallback, useMemo, type DragEvent, type Dispatch, type SetStateAction } from 'react';
import type { VideoFile } from '../types';
import { initialFiles as defaultInitialFiles } from '../data/mockData';
import { isVideoFile, extractVideoFilesFromDataTransfer } from '../utils/fileSystemUtils';

export interface UseVideoFileListOptions {
  initialFiles?: VideoFile[];
}

/**
 * useVideoFileList フックの戻り値型定義
 */
export interface UseVideoFileListReturn {
  // --- File State & Selection ---
  files: VideoFile[];
  setFiles: Dispatch<SetStateAction<VideoFile[]>>;
  selectedFileId: string | null;
  setSelectedFileId: Dispatch<SetStateAction<string | null>>;
  selectedFile: VideoFile | null;

  // --- Drag State ---
  dragActive: boolean;
  setDragActive: Dispatch<SetStateAction<boolean>>;

  // --- Search, Filter & Sort State ---
  fileSearchQuery: string;
  setFileSearchQuery: Dispatch<SetStateAction<string>>;
  fileStatusFilter: string;
  setFileStatusFilter: Dispatch<SetStateAction<string>>;
  fileSortBy: string;
  setFileSortBy: Dispatch<SetStateAction<string>>;
  fileSortOrder: 'asc' | 'desc';
  setFileSortOrder: Dispatch<SetStateAction<'asc' | 'desc'>>;

  // --- Derived State (Pure Computation) ---
  filteredAndSortedFiles: VideoFile[];

  // --- File Collection & CRUD Operations ---
  handleSelectAll: (checked: boolean) => void;
  handleSelectFile: (id: string, checked: boolean) => void;
  handleUpdateFile: (id: string, updates: Partial<VideoFile>) => void;
  handleRemoveFile: (id: string) => void;
  handleResetFiles: (customFiles?: VideoFile[]) => void;
  handleClearFiles: () => void;

  // --- File Addition Operations ---
  addDroppedFiles: (
    droppedFiles: Array<{ name: string; size?: number }>,
    extractIdFn?: (name: string) => string
  ) => VideoFile[];

  // --- Drag & Drop Event Handlers ---
  handleDragOver: (e: DragEvent) => void;
  handleDragLeave: (e: DragEvent) => void;
  handleDrop: (
    e: DragEvent,
    extractIdFn?: (name: string) => string,
    onDropped?: (count: number) => void
  ) => void | Promise<void>;
}

/**
 * 動画ファイルコレクション管理用カスタムフック
 * 
 * 責務構成:
 * 1. File CRUD & Collection State (files, handleUpdateFile, handleRemoveFile, handleResetFiles, handleClearFiles)
 * 2. Selection Management (selectedFileId, selectedFile, handleSelectAll, handleSelectFile)
 * 3. Search / Filter / Sort UI & Derived State (fileSearchQuery, fileStatusFilter, fileSortBy, fileSortOrder, filteredAndSortedFiles)
 * 4. File Addition & Drag-and-Drop (dragActive, addDroppedFiles, handleDrop with directory recursion)
 */
export function useVideoFileList(options?: UseVideoFileListOptions): UseVideoFileListReturn {
  const initial = options?.initialFiles ?? defaultInitialFiles;
  const [files, setFiles] = useState<VideoFile[]>(initial);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // 検索・フィルタ・ソート状態
  const [fileSearchQuery, setFileSearchQuery] = useState<string>('');
  const [fileStatusFilter, setFileStatusFilter] = useState<string>('All');
  const [fileSortBy, setFileSortBy] = useState<string>('originalName');
  const [fileSortOrder, setFileSortOrder] = useState<'asc' | 'desc'>('asc');

  // ==========================================
  // 1. Selection & Derived States
  // ==========================================
  const selectedFile = useMemo(() => {
    return files.find(f => f.id === selectedFileId) || null;
  }, [files, selectedFileId]);

  const filteredAndSortedFiles = useMemo(() => {
    return files
      .filter(f => {
        const matchesQuery = fileSearchQuery === '' ||
          f.originalName.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
          f.extractedId?.toLowerCase().includes(fileSearchQuery.toLowerCase()) ||
          (f.metadata?.title as string)?.toLowerCase().includes(fileSearchQuery.toLowerCase());

        const matchesStatus = fileStatusFilter === 'All' ||
          (fileStatusFilter === 'incomplete' ? f.status !== 'completed' : f.status === fileStatusFilter);
        return matchesQuery && matchesStatus;
      })
      .sort((a, b) => {
        let valA: string | number = '';
        let valB: string | number = '';
        if (fileSortBy === 'originalName') {
          valA = a.originalName.toLowerCase();
          valB = b.originalName.toLowerCase();
        } else if (fileSortBy === 'extractedId') {
          valA = (a.extractedId || '').toLowerCase();
          valB = (b.extractedId || '').toLowerCase();
        } else if (fileSortBy === 'status') {
          valA = a.status;
          valB = b.status;
        } else if (fileSortBy === 'size') {
          valA = a.sizeBytes || 0;
          valB = b.sizeBytes || 0;
        }
        if (valA < valB) return fileSortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return fileSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [files, fileSearchQuery, fileStatusFilter, fileSortBy, fileSortOrder]);

  // ==========================================
  // 2. Selection Operations
  // ==========================================
  const handleSelectAll = useCallback((checked: boolean) => {
    setFiles(prev => prev.map(f => ({ ...f, isSelected: checked })));
  }, []);

  const handleSelectFile = useCallback((id: string, checked: boolean) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, isSelected: checked } : f));
  }, []);

  // ==========================================
  // 3. File CRUD Operations
  // ==========================================
  const handleUpdateFile = useCallback((id: string, updates: Partial<VideoFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const handleRemoveFile = useCallback((id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
    setSelectedFileId(prev => (prev === id ? null : prev));
  }, []);

  const handleResetFiles = useCallback((customFiles?: VideoFile[]) => {
    setFiles(customFiles || initial);
    setSelectedFileId(null);
  }, [initial]);

  const handleClearFiles = useCallback(() => {
    setFiles([]);
    setSelectedFileId(null);
  }, []);

  // ==========================================
  // 4. File Addition Operations
  // ==========================================
  const addDroppedFiles = useCallback((
    droppedFiles: Array<{ name: string; size?: number }>,
    extractIdFn?: (name: string) => string
  ): VideoFile[] => {
    if (!droppedFiles || droppedFiles.length === 0) return [];

    const now = Date.now();
    const existingNames = new Set(files.map(f => f.originalName));
    const addedBatch: VideoFile[] = [];

    for (let i = 0; i < droppedFiles.length; i++) {
      const f = droppedFiles[i];
      if (!f.name || !isVideoFile(f.name) || existingNames.has(f.name)) {
        continue; // Filter non-video and prevent duplicates
      }
      existingNames.add(f.name);
      const extracted = extractIdFn ? extractIdFn(f.name) : '';
      const newFile: VideoFile = {
        id: `drop_${now}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        originalName: f.name,
        extractedId: extracted || undefined,
        status: extracted ? 'pending' : 'NotFound',
        sizeBytes: f.size,
        isSelected: true,
      };
      addedBatch.push(newFile);
    }

    if (addedBatch.length > 0) {
      setFiles(prev => {
        const prevNames = new Set(prev.map(f => f.originalName));
        const uniqueBatch = addedBatch.filter(b => !prevNames.has(b.originalName));
        return [...uniqueBatch, ...prev];
      });
    }

    return addedBatch;
  }, [files]);

  // ==========================================
  // 5. Drag & Drop Event Handlers
  // ==========================================
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(async (
    e: DragEvent,
    extractIdFn?: (name: string) => string,
    onDropped?: (count: number) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    try {
      const droppedEntries = await extractVideoFilesFromDataTransfer(e.dataTransfer);
      if (droppedEntries.length > 0) {
        const added = addDroppedFiles(droppedEntries, extractIdFn);
        if (onDropped) {
          onDropped(added.length);
        }
      }
    } catch {
      // Fallback to standard files if DataTransferItem traversal throws
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        const droppedList = (Array.from(e.dataTransfer.files) as File[]).filter(f => isVideoFile(f.name));
        const added = addDroppedFiles(droppedList, extractIdFn);
        if (onDropped) {
          onDropped(added.length);
        }
      }
    }
  }, [addDroppedFiles]);

  return {
    files,
    setFiles,
    selectedFileId,
    setSelectedFileId,
    selectedFile,
    dragActive,
    setDragActive,
    fileSearchQuery,
    setFileSearchQuery,
    fileStatusFilter,
    setFileStatusFilter,
    fileSortBy,
    setFileSortBy,
    fileSortOrder,
    setFileSortOrder,
    filteredAndSortedFiles,
    handleSelectAll,
    handleSelectFile,
    handleUpdateFile,
    handleRemoveFile,
    handleResetFiles,
    handleClearFiles,
    addDroppedFiles,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  };
}
