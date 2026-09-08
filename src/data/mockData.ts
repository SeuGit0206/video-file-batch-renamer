import type { VideoFile } from '../types';

export const initialFiles: VideoFile[] = [];

export const sampleTestFiles: VideoFile[] = [
  {
    id: 'f1',
    originalName: 'SSIS-001.mp4',
    extractedId: 'SSIS-001',
    status: 'pending',
    isSelected: true,
    size: '1.2 GB',
    sizeBytes: 1288490188
  },
  {
    id: 'f2',
    originalName: 'MIDV-123.mkv',
    extractedId: 'MIDV-123',
    status: 'pending',
    isSelected: true,
    size: '2.4 GB',
    sizeBytes: 2576980377
  },
  {
    id: 'f3',
    originalName: 'IPX-999.avi',
    extractedId: 'IPX-999',
    status: 'pending',
    isSelected: true,
    size: '850 MB',
    sizeBytes: 891289600
  }
];
