import { useState, useRef } from 'react';
import createContextHook from '@nkzw/create-context-hook';

interface AudioFileData {
  uri: string;
  fileName: string;
  mimeType: string;
  webFile: File | null;
  blob: Blob | null;
}

export const [AudioFileProvider, useAudioFile] = createContextHook(() => {
  const [audioData, setAudioData] = useState<AudioFileData | null>(null);
  const blobRef = useRef<Blob | null>(null);

  const setAudioFile = async (data: {
    uri: string;
    fileName: string;
    mimeType: string;
    webFile?: File | null;
  }) => {
    let blob: Blob | null = null;

    if (data.webFile) {
      blob = data.webFile;
      blobRef.current = blob;
      console.log('Stored web File as blob:', blob.size, blob.type);
    }

    setAudioData({
      uri: data.uri,
      fileName: data.fileName,
      mimeType: data.mimeType,
      webFile: data.webFile || null,
      blob,
    });
  };

  const getAudioBlob = (): Blob | null => {
    return audioData?.blob || audioData?.webFile || blobRef.current;
  };

  const clearAudioFile = () => {
    setAudioData(null);
    blobRef.current = null;
  };

  return {
    audioData,
    setAudioFile,
    getAudioBlob,
    clearAudioFile,
  };
});
