import { useState, useRef, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Platform } from 'react-native';

interface AudioFileData {
  uri: string;
  fileName: string;
  mimeType: string;
}

export const [AudioFileProvider, useAudioFile] = createContextHook(() => {
  const [audioData, setAudioData] = useState<AudioFileData | null>(null);
  const webFileRef = useRef<File | null>(null);

  const setAudioFile = useCallback(async (data: {
    uri: string;
    fileName: string;
    mimeType: string;
    webFile?: File | null;
  }) => {
    console.log('=== Setting Audio File in Context ===');
    console.log('URI:', data.uri);
    console.log('fileName:', data.fileName);
    console.log('mimeType:', data.mimeType);
    console.log('webFile provided:', !!data.webFile);
    console.log('Platform:', Platform.OS);

    if (Platform.OS === 'web') {
      try {
        let fileToStore: File | null = null;

        if (data.webFile && data.webFile.size > 0) {
          fileToStore = data.webFile;
          console.log('Using provided webFile directly:', fileToStore.name, fileToStore.size);
        } else if (data.uri) {
          console.log('Fetching blob from URI to create File...');
          try {
            const response = await fetch(data.uri);
            if (response.ok) {
              const blob = await response.blob();
              fileToStore = new File([blob], data.fileName, { 
                type: data.mimeType || blob.type || 'audio/mpeg' 
              });
              console.log('Created File from URI:', fileToStore.name, fileToStore.size);
            }
          } catch (fetchErr) {
            console.error('Failed to fetch from URI:', fetchErr);
          }
        }

        if (fileToStore && fileToStore.size > 100) {
          webFileRef.current = fileToStore;
          console.log('Stored File in ref:', webFileRef.current.name, webFileRef.current.size);
        } else {
          console.warn('No valid file to store');
        }
      } catch (error) {
        console.error('Failed to store audio file:', error);
      }
    }

    setAudioData({
      uri: data.uri,
      fileName: data.fileName,
      mimeType: data.mimeType,
    });
  }, []);

  const getAudioFile = useCallback((): File | null => {
    console.log('=== Getting Audio File from Context ===');
    
    if (Platform.OS === 'web' && webFileRef.current) {
      console.log('Returning stored File:', webFileRef.current.name, webFileRef.current.size, webFileRef.current.type);
      return webFileRef.current;
    }
    
    console.log('No audio file available in context');
    return null;
  }, []);

  const getAudioBlob = useCallback((): Blob | null => {
    return getAudioFile();
  }, [getAudioFile]);

  const clearAudioFile = useCallback(() => {
    console.log('Clearing audio file from context');
    setAudioData(null);
    webFileRef.current = null;
  }, []);

  return {
    audioData,
    setAudioFile,
    getAudioFile,
    getAudioBlob,
    clearAudioFile,
  };
});
