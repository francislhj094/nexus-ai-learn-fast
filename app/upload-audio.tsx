import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  Upload, 
  FileAudio, 
  X, 
  CheckCircle2, 
  Music,
  AlertCircle,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '@/constants/colors';

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export default function UploadAudioScreen() {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supportedFormats = ['mp3', 'wav', 'm4a', 'mp4', 'mpeg', 'mpga', 'webm', 'ogg', 'flac'];

  const pickAudioFile = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      console.log('Document picker result:', result);

      if (result.canceled) {
        console.log('User cancelled file picker');
        setIsLoading(false);
        return;
      }

      const file = result.assets[0];
      
      if (!file) {
        setError('No file selected');
        setIsLoading(false);
        return;
      }

      const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
      
      if (!supportedFormats.includes(fileExtension)) {
        setError(`Unsupported format. Please use: ${supportedFormats.join(', ')}`);
        setIsLoading(false);
        return;
      }

      setSelectedFile({
        uri: file.uri,
        name: file.name,
        size: file.size || 0,
        mimeType: file.mimeType || `audio/${fileExtension}`,
      });

      console.log('File selected:', file.name, file.uri);
      setIsLoading(false);
    } catch (err) {
      console.error('Error picking file:', err);
      setError('Failed to pick file. Please try again.');
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setError(null);
  };

  const handleGenerateNotes = async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Processing file:', selectedFile.name, 'URI:', selectedFile.uri);
      
      let audioBase64 = '';
      
      if (Platform.OS === 'web') {
        try {
          console.log('Fetching blob from URI...');
          const response = await fetch(selectedFile.uri);
          
          if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status}`);
          }
          
          const blob = await response.blob();
          console.log('Blob fetched, size:', blob.size, 'type:', blob.type);
          
          if (blob.size === 0) {
            throw new Error('File is empty');
          }
          
          // Convert blob to base64
          audioBase64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              if (result) {
                resolve(result);
              } else {
                reject(new Error('Failed to read file'));
              }
            };
            reader.onerror = () => reject(new Error('FileReader error'));
            reader.readAsDataURL(blob);
          });
          
          console.log('Audio converted to base64, length:', audioBase64.length);
          
          // Store in sessionStorage for web to avoid URL size limits
          if (audioBase64.length > 0) {
            try {
              sessionStorage.setItem('uploadedAudioBase64', audioBase64);
              sessionStorage.setItem('uploadedAudioMimeType', selectedFile.mimeType);
              console.log('Audio stored in sessionStorage');
            } catch (storageError) {
              console.warn('SessionStorage failed, will pass via URL:', storageError);
            }
          }
        } catch (e) {
          console.error('Failed to process audio file:', e);
          setError('Failed to read audio file. Please try a different file.');
          setIsLoading(false);
          return;
        }
      }

      router.replace({
        pathname: '/note-generating',
        params: {
          audioUri: selectedFile.uri,
          fileName: selectedFile.name,
          language: 'Auto detect',
          duration: '00:00:00',
          webTranscript: '',
          sourceType: 'upload',
          mimeType: selectedFile.mimeType,
          useSessionStorage: Platform.OS === 'web' ? 'true' : 'false',
        },
      });
    } catch (err) {
      console.error('Error preparing file:', err);
      setError('Failed to process file. Please try again.');
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    router.back();
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          headerShown: false,
          presentation: 'modal',
        }} 
      />
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={handleClose}
            activeOpacity={0.7}
          >
            <X size={24} color="#1F2937" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload Audio</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <FileAudio size={48} color="#8B5CF6" strokeWidth={1.5} />
            </View>
          </View>

          <Text style={styles.title}>Upload Audio File</Text>
          <Text style={styles.subtitle}>
            Select an audio file to generate study notes with AI transcription
          </Text>

          <View style={styles.formatsContainer}>
            <Text style={styles.formatsLabel}>Supported formats:</Text>
            <Text style={styles.formatsText}>
              MP3, WAV, M4A, MP4, WEBM, OGG, FLAC
            </Text>
          </View>

          {!selectedFile ? (
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={pickAudioFile}
              activeOpacity={0.7}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#8B5CF6" />
              ) : (
                <>
                  <View style={styles.uploadIconContainer}>
                    <Upload size={32} color="#8B5CF6" strokeWidth={2} />
                  </View>
                  <Text style={styles.uploadTitle}>Tap to select audio file</Text>
                  <Text style={styles.uploadSubtitle}>
                    Browse your device for audio files
                  </Text>
                </>
              )}
            </TouchableOpacity>
          ) : (
            <View style={styles.selectedFileContainer}>
              <View style={styles.selectedFileHeader}>
                <CheckCircle2 size={20} color="#10B981" strokeWidth={2} />
                <Text style={styles.selectedFileLabel}>File selected</Text>
              </View>
              
              <View style={styles.fileCard}>
                <View style={styles.fileIconContainer}>
                  <Music size={24} color="#8B5CF6" strokeWidth={2} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatFileSize(selectedFile.size)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={handleRemoveFile}
                  activeOpacity={0.7}
                >
                  <X size={20} color="#6B7280" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.changeFileButton}
                onPress={pickAudioFile}
                activeOpacity={0.7}
              >
                <Text style={styles.changeFileText}>Choose different file</Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={18} color="#EF4444" strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              (!selectedFile || isLoading) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerateNotes}
            activeOpacity={0.8}
            disabled={!selectedFile || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <FileAudio size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.generateButtonText}>Generate Notes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  formatsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  formatsLabel: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 4,
  },
  formatsText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  uploadArea: {
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      },
    }),
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3E8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 8,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  selectedFileContainer: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
      },
    }),
  },
  selectedFileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  selectedFileLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10B981',
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  fileInfo: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#6B7280',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeFileButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  changeFileText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#8B5CF6',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
    color: '#EF4444',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 8 : 16,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
