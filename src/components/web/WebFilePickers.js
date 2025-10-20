import React, { useRef } from 'react';
import { Platform, Alert } from 'react-native';
import { saveAs } from 'file-saver';

// Web alternatives for react-native-document-picker and react-native-image-picker

// Document Picker Web Alternative
export const WebDocumentPicker = {
  pick: (options = {}) => {
    return new Promise((resolve, reject) => {
      // Create a file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = options.allowMultiSelection || false;
      
      // Set accepted file types
      if (options.type) {
        const typeMap = {
          'allFiles': '*/*',
          'images': 'image/*',
          'pdf': 'application/pdf',
          'plainText': 'text/plain',
          'zip': 'application/zip',
        };
        input.accept = typeMap[options.type] || options.type;
      }

      input.onchange = async (event) => {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) {
          reject(new Error('User cancelled document picker'));
          return;
        }

        try {
          const results = await Promise.all(files.map(async (file) => {
            // Convert file to base64 if needed
            const arrayBuffer = await file.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            
            return {
              uri: URL.createObjectURL(file),
              type: file.type,
              name: file.name,
              size: file.size,
              data: base64, // For compatibility with mobile version
              fileCopyUri: URL.createObjectURL(file), // Web equivalent
            };
          }));

          resolve(options.allowMultiSelection ? results : results[0]);
        } catch (error) {
          reject(error);
        }
      };

      input.oncancel = () => {
        reject(new Error('User cancelled document picker'));
      };

      // Trigger file picker
      input.click();
    });
  },

  pickSingle: (options = {}) => {
    return WebDocumentPicker.pick({ ...options, allowMultiSelection: false });
  },

  pickMultiple: (options = {}) => {
    return WebDocumentPicker.pick({ ...options, allowMultiSelection: true });
  },

  types: {
    allFiles: 'allFiles',
    images: 'images', 
    pdf: 'pdf',
    plainText: 'plainText',
    zip: 'zip',
  }
};

// Image Picker Web Alternative
export const WebImagePicker = {
  launchCamera: (options = {}, callback) => {
    // For web, we'll use the camera via getUserMedia
    return new Promise((resolve, reject) => {
      // Create a file input for camera
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use back camera
      
      input.onchange = async (event) => {
        const file = event.target.files[0];
        
        if (!file) {
          const error = { message: 'User cancelled camera' };
          if (callback) callback(error);
          reject(error);
          return;
        }

        try {
          const result = await processImageFile(file, options);
          if (callback) callback(null, result);
          resolve(result);
        } catch (error) {
          if (callback) callback(error);
          reject(error);
        }
      };

      input.click();
    });
  },

  launchImageLibrary: (options = {}, callback) => {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = options.selectionLimit > 1;
      
      input.onchange = async (event) => {
        const files = Array.from(event.target.files);
        
        if (files.length === 0) {
          const error = { message: 'User cancelled image picker' };
          if (callback) callback(error);
          reject(error);
          return;
        }

        try {
          const results = await Promise.all(
            files.map(file => processImageFile(file, options))
          );
          
          const result = {
            assets: results,
            didCancel: false,
            errorCode: null,
            errorMessage: null,
          };
          
          if (callback) callback(null, result);
          resolve(result);
        } catch (error) {
          if (callback) callback(error);
          reject(error);
        }
      };

      input.click();
    });
  },

  // Media types
  MediaType: {
    photo: 'photo',
    video: 'video',
    mixed: 'mixed',
  },
};

// Helper function to process image files
const processImageFile = async (file, options = {}) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      // Create canvas for image processing if quality/maxWidth/maxHeight specified
      if (options.quality || options.maxWidth || options.maxHeight) {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Calculate new dimensions
          let { width, height } = img;
          
          if (options.maxWidth && width > options.maxWidth) {
            height = (height * options.maxWidth) / width;
            width = options.maxWidth;
          }
          
          if (options.maxHeight && height > options.maxHeight) {
            width = (width * options.maxHeight) / height;
            height = options.maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          
          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          const quality = options.quality || 0.8;
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          
          resolve(createImageResult(file, dataUrl, width, height));
        };
        
        img.src = reader.result;
      } else {
        resolve(createImageResult(file, reader.result, null, null));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
};

// Helper to create consistent image result format
const createImageResult = (file, dataUrl, width, height) => ({
  uri: dataUrl,
  type: file.type,
  fileName: file.name,
  fileSize: file.size,
  width: width || null,
  height: height || null,
  originalPath: dataUrl,
  data: dataUrl.split(',')[1], // Base64 data without data URL prefix
});

// Web File System Alternative (for react-native-fs)
export const WebRNFS = {
  // Common paths - using browser storage equivalents
  DocumentDirectoryPath: '/documents',
  CachesDirectoryPath: '/cache',
  
  // Write file using localStorage or download
  writeFile: async (path, contents, encoding = 'utf8') => {
    try {
      if (encoding === 'base64') {
        // For base64 files, trigger download
        const byteCharacters = atob(contents);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);
        
        const fileName = path.split('/').pop() || 'file';
        saveAs(blob, fileName);
      } else {
        // For text files, save to localStorage or download
        const blob = new Blob([contents], { type: 'text/plain' });
        const fileName = path.split('/').pop() || 'file.txt';
        saveAs(blob, fileName);
      }
      return Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  },
  
  // Read file - limited on web, mainly for showing user feedback
  readFile: async (path, encoding = 'utf8') => {
    // On web, we can't really read arbitrary files
    // This is mainly here for compatibility
    return Promise.reject(new Error('File reading not supported on web'));
  },
  
  // Check if file exists - limited on web
  exists: async (path) => {
    // Always return false on web since we can't check arbitrary files
    return Promise.resolve(false);
  },
  
  // Create directory - no-op on web
  mkdir: async (path) => {
    return Promise.resolve();
  },
  
  // Copy file - download with new name
  copyFile: async (sourcePath, destPath) => {
    return Promise.reject(new Error('File copying not supported on web'));
  },
  
  // Move file - not supported on web
  moveFile: async (sourcePath, destPath) => {
    return Promise.reject(new Error('File moving not supported on web'));
  },
  
  // Delete file - not supported on web
  unlink: async (path) => {
    return Promise.resolve();
  },
};

// Export platform-appropriate modules
export default Platform.select({
  web: {
    DocumentPicker: WebDocumentPicker,
    ImagePicker: WebImagePicker,
    RNFS: WebRNFS,
  },
  default: {
    // Will use native modules on mobile
  }
});