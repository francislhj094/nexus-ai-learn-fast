import { useState, useRef, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';

interface AudioFileData {
  uri: string;
  fileName: string;
  mimeType: string;
  webFile: File | null;
  arrayBuffer: ArrayBuffer | null;
}

export const [AudioFileProvider, useAudioFile] = createContextHook(() => {
  const [audioData, setAudioData] = useState<AudioFileData | null>(null);
  const arrayBufferRef = useRef<ArrayBuffer | null>(null);
  const fileInfoRef = useRef<{ name: string; type: string } | null>(null);

  const setAudioFile = useCallback(async (data: {
    uri: string;
    fileName: string;
    mimeType: string;
    webFile?: File | null;
  }) => {
    let arrayBuffer: ArrayBuffer | null = null;
    let webFile: File | null = data.webFile || null;

    console.log('=== Setting Audio File in Context ===');
    console.log('URI:', data.uri);
    console.log('fileName:', data.fileName);
    console.log('mimeType:', data.mimeType);
    console.log('webFile provided:', !!data.webFile);

    if (data.webFile) {
      try {
        arrayBuffer = await data.webFile.arrayBuffer();
        arrayBufferRef.current = arrayBuffer;
        fileInfoRef.current = { name: data.fileName, type: data.mimeType || data.webFile.type };
        console.log('Stored ArrayBuffer from webFile:', arrayBuffer.byteLength, 'bytes');
      } catch (error) {
        console.error('Failed to get ArrayBuffer from webFile:', error);
      }
    } else if (data.uri && typeof window !== 'undefined') {
      try {
        console.log('Fetching blob from URI in context:', data.uri);
        const response = await fetch(data.uri);
        const blob = await response.blob();
        arrayBuffer = await blob.arrayBuffer();
        arrayBufferRef.current = arrayBuffer;
        fileInfoRef.current = { name: data.fileName, type: data.mimeType || blob.type };
        webFile = new File([blob], data.fileName, { type: data.mimeType || blob.type });
        console.log('Fetched and stored ArrayBuffer from URI:', arrayBuffer.byteLength, 'bytes');
      } catch (error) {
        console.error('Failed to fetch blob from URI in context:', error);
      }
    }

    setAudioData({
      uri: data.uri,
      fileName: data.fileName,
      mimeType: data.mimeType,
      webFile,
      arrayBuffer,
    });
  }, []);

  const getAudioFile = useCallback((): File | null => {
    console.log('=== Getting Audio File from Context ===');
    
    if (audioData?.webFile) {
      console.log('Returning stored webFile:', audioData.webFile.name, audioData.webFile.size);
      return audioData.webFile;
    }
    
    const buffer = audioData?.arrayBuffer || arrayBufferRef.current;
    const info = fileInfoRef.current;
    
    if (buffer && info) {
      const file = new File([buffer], info.name, { type: info.type });
      console.log('Created File from ArrayBuffer:', file.name, file.size, file.type);
      return file;
    }
    
    console.log('No audio file available in context');
    return null;
  }, [audioData]);

  const getAudioBlob = useCallback((): Blob | null => {
    const file = getAudioFile();
    return file;
  }, [getAudioFile]);

  const clearAudioFile = useCallback(() => {
    console.log('Clearing audio file from context');
    setAudioData(null);
    arrayBufferRef.current = null;
    fileInfoRef.current = null;
  }, []);

  return {
    audioData,
    setAudioFile,
    getAudioFile,
    getAudioBlob,
    clearAudioFile,
  };
});
