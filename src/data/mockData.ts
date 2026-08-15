import type { VideoFile } from '../types';

export const initialFiles: VideoFile[] = [
  {
    id: 'f1',
    originalName: 'SSIS-001.mp4',
    extractedId: 'SSIS-001',
    status: 'pending',
    isSelected: true,
  },
  {
    id: 'f2',
    originalName: 'MIDV-123_sample.mkv',
    extractedId: 'MIDV-123',
    status: 'pending',
    isSelected: true,
  },
];
