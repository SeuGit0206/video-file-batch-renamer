/**
 * FileSystem API Utility for Directory & File Drag-and-Drop
 * Supports recursive traversal of directories, Chromium batch limits, and video format filtering.
 */

export const VIDEO_EXTENSIONS = new Set<string>([
  '.mp4',
  '.mkv',
  '.avi',
  '.wmv',
  '.mov',
  '.flv',
  '.ts',
  '.m4v',
  '.webm',
]);

/**
 * Checks whether a given filename has a supported video extension.
 */
export function isVideoFile(fileName: string): boolean {
  if (!fileName || typeof fileName !== 'string') return false;
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return false;
  const ext = fileName.substring(lastDot).toLowerCase();
  return VIDEO_EXTENSIONS.has(ext);
}

export interface DroppedFileEntry {
  name: string;
  size?: number;
  path?: string;
}

/**
 * Reads all entries from a directory reader by repeatedly calling readEntries
 * until an empty batch is returned (handling Chromium 100-entry batch limits).
 */
async function readAllEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const allEntries: FileSystemEntry[] = [];
  while (true) {
    const batch = await new Promise<FileSystemEntry[]>((resolve, reject) => {
      reader.readEntries(resolve, reject);
    });
    if (!batch || batch.length === 0) {
      break;
    }
    allEntries.push(...batch);
  }
  return allEntries;
}

/**
 * Recursively traverses a FileSystemEntry (file or directory) and returns all video files.
 */
export async function traverseFileSystemEntry(entry: FileSystemEntry): Promise<DroppedFileEntry[]> {
  const results: DroppedFileEntry[] = [];

  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    try {
      const file = await new Promise<File>((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
      if (isVideoFile(file.name)) {
        results.push({
          name: file.name,
          size: file.size,
          path: entry.fullPath || file.name,
        });
      }
    } catch {
      // Ignore unreadable individual files safely
    }
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    try {
      const reader = dirEntry.createReader();
      const entries = await readAllEntries(reader);
      for (const child of entries) {
        const childResults = await traverseFileSystemEntry(child);
        results.push(...childResults);
      }
    } catch {
      // Ignore unreadable directories safely
    }
  }

  return results;
}

/**
 * Extracts all video files from a DragEvent's DataTransfer object.
 * Supports:
 * - Single / multiple files
 * - Single / multiple directories (recursively searched)
 * - Mixed files and directories
 * - Fallback to standard files list if items/webkitGetAsEntry is unavailable
 */
export async function extractVideoFilesFromDataTransfer(
  dataTransfer: DataTransfer | null
): Promise<DroppedFileEntry[]> {
  if (!dataTransfer) return [];

  const results: DroppedFileEntry[] = [];

  // 1. Try webkitGetAsEntry via items
  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const items = Array.from(dataTransfer.items);
    const hasEntrySupport = items.some(item => typeof (item as unknown as { webkitGetAsEntry?: () => unknown }).webkitGetAsEntry === 'function');

    if (hasEntrySupport) {
      for (const item of items) {
        if (item.kind === 'file') {
          const getEntry = (item as unknown as { webkitGetAsEntry?: () => FileSystemEntry | null }).webkitGetAsEntry;
          const entry = getEntry ? getEntry.call(item) : null;
          if (entry) {
            const filesFromEntry = await traverseFileSystemEntry(entry);
            results.push(...filesFromEntry);
          } else {
            const file = item.getAsFile();
            if (file && isVideoFile(file.name)) {
              results.push({ name: file.name, size: file.size });
            }
          }
        }
      }
      return results;
    }
  }

  // 2. Fallback to dataTransfer.files
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    const files = Array.from(dataTransfer.files);
    for (const file of files) {
      if (isVideoFile(file.name)) {
        results.push({ name: file.name, size: file.size });
      }
    }
  }

  return results;
}
