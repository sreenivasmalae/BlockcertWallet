import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class PdfCleanupService {
  private static readonly CLEANUP_KEY = 'pdf_cleanup_timestamp';
  private static readonly CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Get the directory where temporary PDF files are stored
   */
  private static getTempPdfDirectory(): string {
    return RNFS.DocumentDirectoryPath;
  }

  /**
   * Clean up all temporary PDF files from the app's document directory
   */
  static async cleanupAllTempPdfs(): Promise<void> {
    try {
      console.log('Starting PDF cleanup...');
      
      const tempDir = this.getTempPdfDirectory();
      
      // Check if directory exists
      const dirExists = await RNFS.exists(tempDir);
      if (!dirExists) {
        console.log('Temp directory does not exist, nothing to clean');
        return;
      }

      // Get all files in the directory
      const files = await RNFS.readDir(tempDir);
      
      // Filter for PDF files (both temp and cached)
      const pdfFiles = files.filter(file => {
        const fileName = file.name.toLowerCase();
        return fileName.endsWith('.pdf') && 
               (fileName.includes('arweave_pdf_') || fileName.includes('temp_') || fileName.includes('cached_'));
      });

      console.log(`Found ${pdfFiles.length} PDF files to clean up`);

      // Delete each PDF file
      let deletedCount = 0;
      for (const file of pdfFiles) {
        try {
          await RNFS.unlink(file.path);
          deletedCount++;
          console.log(`Deleted: ${file.name}`);
        } catch (deleteError) {
          console.warn(`Failed to delete ${file.name}:`, deleteError);
        }
      }

      console.log(`PDF cleanup completed. Deleted ${deletedCount} out of ${pdfFiles.length} files`);
      
      // Update last cleanup timestamp
      await AsyncStorage.setItem(this.CLEANUP_KEY, Date.now().toString());
      
    } catch (error) {
      console.error('Error during PDF cleanup:', error);
    }
  }

  /**
   * Clean up specific PDF file by name pattern
   */
  static async cleanupSpecificPdf(fileName: string): Promise<void> {
    try {
      const tempDir = this.getTempPdfDirectory();
      const filePath = `${tempDir}/${fileName}`;
      
      const exists = await RNFS.exists(filePath);
      if (exists) {
        await RNFS.unlink(filePath);
        console.log(`Deleted specific PDF: ${fileName}`);
      }
    } catch (error) {
      console.error(`Error deleting specific PDF ${fileName}:`, error);
    }
  }

  /**
   * Clean up old PDF files (older than specified hours)
   */
  static async cleanupOldPdfs(olderThanHours: number = 24): Promise<void> {
    try {
      console.log(`Cleaning up PDFs older than ${olderThanHours} hours...`);
      
      const tempDir = this.getTempPdfDirectory();
      const dirExists = await RNFS.exists(tempDir);
      if (!dirExists) {
        return;
      }

      const files = await RNFS.readDir(tempDir);
      const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
      
      let deletedCount = 0;
      for (const file of files) {
        const fileName = file.name.toLowerCase();
        if (fileName.endsWith('.pdf') && 
            (fileName.includes('arweave_pdf_') || fileName.includes('temp_') || fileName.includes('cached_'))) {
          
          try {
            const stats = await RNFS.stat(file.path);
            const fileModTime = new Date(stats.mtime).getTime();
            
            if (fileModTime < cutoffTime) {
              await RNFS.unlink(file.path);
              deletedCount++;
              console.log(`Deleted old PDF: ${file.name}`);
            }
          } catch (deleteError) {
            console.warn(`Failed to delete old PDF ${file.name}:`, deleteError);
          }
        }
      }

      console.log(`Deleted ${deletedCount} old PDF files`);
    } catch (error) {
      console.error('Error cleaning up old PDFs:', error);
    }
  }

  /**
   * Check if cleanup is needed based on last cleanup time
   */
  static async isCleanupNeeded(): Promise<boolean> {
    try {
      const lastCleanupStr = await AsyncStorage.getItem(this.CLEANUP_KEY);
      if (!lastCleanupStr) {
        return true; // Never cleaned up before
      }

      const lastCleanup = parseInt(lastCleanupStr, 10);
      const timeSinceLastCleanup = Date.now() - lastCleanup;
      
      return timeSinceLastCleanup > this.CLEANUP_INTERVAL;
    } catch (error) {
      console.error('Error checking cleanup need:', error);
      return true; // Default to cleanup if we can't check
    }
  }

  /**
   * Perform periodic cleanup if needed
   */
  static async performPeriodicCleanup(): Promise<void> {
    try {
      const needsCleanup = await this.isCleanupNeeded();
      if (needsCleanup) {
        console.log('Performing periodic PDF cleanup...');
        await this.cleanupOldPdfs(24); // Clean files older than 24 hours
      } else {
        console.log('Periodic cleanup not needed yet');
      }
    } catch (error) {
      console.error('Error during periodic cleanup:', error);
    }
  }

  /**
   * Get storage statistics for PDF files
   */
  static async getPdfStorageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    oldestFile?: string;
    newestFile?: string;
  }> {
    try {
      const tempDir = this.getTempPdfDirectory();
      const dirExists = await RNFS.exists(tempDir);
      if (!dirExists) {
        return { totalFiles: 0, totalSize: 0 };
      }

      const files = await RNFS.readDir(tempDir);
      const pdfFiles = files.filter(file => {
        const fileName = file.name.toLowerCase();
        return fileName.endsWith('.pdf') && 
               (fileName.includes('arweave_pdf_') || fileName.includes('temp_') || fileName.includes('cached_'));
      });

      let totalSize = 0;
      let oldestTime = Date.now();
      let newestTime = 0;
      let oldestFile = '';
      let newestFile = '';

      for (const file of pdfFiles) {
        try {
          const stats = await RNFS.stat(file.path);
          totalSize += stats.size;
          
          const fileTime = new Date(stats.mtime).getTime();
          if (fileTime < oldestTime) {
            oldestTime = fileTime;
            oldestFile = file.name;
          }
          if (fileTime > newestTime) {
            newestTime = fileTime;
            newestFile = file.name;
          }
        } catch (statError) {
          console.warn(`Failed to get stats for ${file.name}:`, statError);
        }
      }

      return {
        totalFiles: pdfFiles.length,
        totalSize,
        oldestFile: oldestFile || undefined,
        newestFile: newestFile || undefined
      };
    } catch (error) {
      console.error('Error getting PDF storage stats:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  }
}
