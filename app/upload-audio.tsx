import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { ArrowLeft, FileAudio, ChevronDown, Sparkles } from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '@/constants/colors';
import { useAudioFile } from '@/contexts/audio-file';

export default function UploadAudioScreen() {
  const router = useRouter();
  const { setAudioFile } = useAudioFile();
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    uri: string;
    size: number;
    mimeType?: string;
    webFile?: File | null;
  } | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('Auto detect');
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);


  const languages = [
    'Auto detect',
    'English',
    'Spanish',
    'Chinese',
    'French',
    'German',
    'Japanese',
    'Korean',
    'Portuguese',
    'Arabic',
    'Hindi',
  ];

  const handleUploadPress = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        
        let webFile: File | null = null;
        
        if (Platform.OS === 'web') {
          console.log('=== Web: Processing picked file ===');
          console.log('File asset:', file.name, file.uri, file.mimeType);
          
          // Try to get the File object from different possible locations
          if ((file as any).file instanceof File) {
            webFile = (file as any).file as File;
            console.log('Got web File from .file property:', webFile.name, webFile.type, webFile.size);
          } else if (file.uri) {
            // For web, immediately fetch the blob and create a File while URI is still valid
            try {
              console.log('Fetching blob from URI immediately:', file.uri);
              const response = await fetch(file.uri);
              if (!response.ok) {
                throw new Error(`Fetch failed: ${response.status}`);
              }
              const blob = await response.blob();
              console.log('Got blob:', blob.size, blob.type);
              
              // Create File with proper type
              const fileType = file.mimeType || blob.type || 'audio/mpeg';
              webFile = new File([blob], file.name, { type: fileType });
              console.log('Created File from blob:', webFile.name, webFile.type, webFile.size);
            } catch (fetchError) {
              console.error('Failed to fetch blob from URI:', fetchError);
            }
          }
          
          // Store file in context immediately while it's valid
          if (webFile && webFile.size > 100) {
            console.log('Storing file in context immediately...');
            await setAudioFile({
              uri: file.uri,
              fileName: file.name,
              mimeType: file.mimeType || webFile.type || 'audio/mpeg',
              webFile: webFile,
            });
            console.log('File stored in context');
          }
        }
        
        setSelectedFile({
          name: file.name,
          uri: file.uri,
          size: file.size || webFile?.size || 0,
          mimeType: file.mimeType || webFile?.type,
          webFile,
        });
      }
    } catch (error) {
      console.error('Error picking document:', error);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
  };

  const handleGenerateTopic = async () => {
    if (!selectedFile) return;

    console.log('=== Preparing audio file for processing ===');
    console.log('Selected file:', selectedFile.name, selectedFile.size);
    console.log('Has webFile:', !!selectedFile.webFile);
    console.log('Platform:', Platform.OS);
    
    // On web, file should already be in context from handleUploadPress
    // For native, we set it now
    if (Platform.OS !== 'web') {
      console.log('Native platform: Setting audio file in context...');
      try {
        await setAudioFile({
          uri: selectedFile.uri,
          fileName: selectedFile.name,
          mimeType: selectedFile.mimeType || 'audio/mpeg',
          webFile: null,
        });
        console.log('Audio file set in context successfully');
      } catch (e) {
        console.error('Failed to set audio file in context:', e);
      }
    } else {
      // On web, ensure file is still in context, re-store if needed
      const existingFile = selectedFile.webFile;
      if (existingFile && existingFile.size > 100) {
        console.log('Web: Re-confirming file in context');
        await setAudioFile({
          uri: selectedFile.uri,
          fileName: selectedFile.name,
          mimeType: selectedFile.mimeType || existingFile.type || 'audio/mpeg',
          webFile: existingFile,
        });
      }
    }

    router.push({
      pathname: '/note-generating-audio',
      params: {
        audioUri: selectedFile.uri,
        fileName: selectedFile.name,
        language: selectedLanguage,
        mimeType: selectedFile.mimeType || selectedFile.webFile?.type || 'audio/mpeg',
      },
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#374151" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generate from audio</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.content}>
          <TouchableOpacity 
            style={[
              styles.uploadBox,
              selectedFile && styles.uploadBoxWithFile
            ]}
            onPress={handleUploadPress}
            activeOpacity={0.7}
          >
            {!selectedFile ? (
              <>
                <FileAudio 
                  size={48} 
                  color="#374151"
                  strokeWidth={1.5}
                />
                <Text style={styles.uploadTitle}>Press to upload audio</Text>
                <Text style={styles.uploadSubtitle}>
                  (Supported formats: mp3, wav, m4a, ogg, flac)
                </Text>
              </>
            ) : (
              <>
                <FileAudio 
                  size={48} 
                  color="#10B981"
                  strokeWidth={2}
                />
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFile.name}
                </Text>
                <Text style={styles.fileSize}>
                  {formatFileSize(selectedFile.size)}
                </Text>
                <TouchableOpacity 
                  onPress={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  style={styles.removeButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeButtonText}>✕ Remove</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.languageSection}>
            <View style={styles.languageLabelRow}>
              <Text style={styles.robotEmoji}>🤖</Text>
              <Text style={styles.languageLabel}>Topic generate language</Text>
            </View>
            
            <TouchableOpacity 
              style={styles.languageDropdown}
              onPress={() => setShowLanguagePicker(!showLanguagePicker)}
              activeOpacity={0.7}
            >
              <Text style={styles.robotEmoji}>🤖</Text>
              <Text style={styles.languageValue}>{selectedLanguage}</Text>
              <ChevronDown size={20} color="#374151" strokeWidth={2} />
            </TouchableOpacity>

            {showLanguagePicker && (
              <View style={styles.languagePickerDropdown}>
                {languages.map((lang, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.languageOption,
                      selectedLanguage === lang && styles.languageOptionSelected,
                      index === languages.length - 1 && styles.languageOptionLast,
                    ]}
                    onPress={() => {
                      setSelectedLanguage(lang);
                      setShowLanguagePicker(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.languageOptionText,
                        selectedLanguage === lang && styles.languageOptionTextSelected,
                      ]}
                    >
                      {lang}
                    </Text>
                    {selectedLanguage === lang && (
                      <Text style={styles.checkmark}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity 
            style={[
              styles.generateButton,
              !selectedFile && styles.generateButtonDisabled
            ]}
            onPress={handleGenerateTopic}
            disabled={!selectedFile}
            activeOpacity={0.8}
          >
            <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.generateButtonText}>Generate Topic</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  headerRight: {
    width: 32,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  uploadBox: {
    backgroundColor: '#FAF9F6',
    borderWidth: 2,
    borderStyle: 'dashed' as const,
    borderColor: '#374151',
    borderRadius: 16,
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBoxWithFile: {
    borderStyle: 'solid' as const,
    borderColor: '#10B981',
    backgroundColor: '#ECFDF5',
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginTop: 16,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  fileName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginTop: 12,
    maxWidth: '80%',
  },
  fileSize: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  removeButton: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '500' as const,
  },
  languageSection: {
    marginTop: 24,
    position: 'relative' as const,
    zIndex: 1000,
  },
  languageLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginLeft: 8,
  },
  languageDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  robotEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  languageValue: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  languagePickerDropdown: {
    position: 'absolute' as const,
    top: 100,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
      },
    }),
    zIndex: 1001,
    maxHeight: 300,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  languageOptionLast: {
    borderBottomWidth: 0,
  },
  languageOptionSelected: {
    backgroundColor: '#ECFDF5',
  },
  languageOptionText: {
    fontSize: 16,
    color: '#1F2937',
  },
  languageOptionTextSelected: {
    color: '#10B981',
    fontWeight: '600' as const,
  },
  checkmark: {
    fontSize: 18,
    color: '#10B981',
    fontWeight: 'bold' as const,
  },
});
