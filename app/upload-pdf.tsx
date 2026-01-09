import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, Stack } from 'expo-router';
import { 
  FileText, 
  X, 
  CheckCircle2, 
  File,
  AlertCircle,
  Upload,
  Sparkles,
} from 'lucide-react-native';
import * as DocumentPicker from 'expo-document-picker';
import Colors from '@/constants/colors';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useExplanations } from '@/contexts/explanations';
import * as pdfjsLib from 'pdfjs-dist';

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

export default function UploadPDFScreen() {
  const router = useRouter();
  const { addExplanation } = useExplanations();
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState('');

  const pickPDFFile = async () => {
    try {
      setError(null);
      setIsLoading(true);

      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf'],
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
      
      if (fileExtension !== 'pdf') {
        setError('Please select a PDF file');
        setIsLoading(false);
        return;
      }

      setSelectedFile({
        uri: file.uri,
        name: file.name,
        size: file.size || 0,
        mimeType: file.mimeType || 'application/pdf',
      });

      console.log('PDF selected:', file.name, file.uri);
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

  const extractTextFromPDF = async (uri: string): Promise<string> => {
    console.log('Attempting to extract text from PDF using pdf.js...');
    
    try {
      // Disable worker to run on main thread (avoids worker loading issues)
      pdfjsLib.GlobalWorkerOptions.workerSrc = '';
      
      const response = await fetch(uri);
      const arrayBuffer = await response.arrayBuffer();
      
      console.log('PDF loaded, size:', arrayBuffer.byteLength);
      
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
      });
      
      const pdf = await loadingTask.promise;
      console.log('PDF parsed, pages:', pdf.numPages);
      
      let fullText = '';
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        try {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          
          const pageText = textContent.items
            .map((item: any) => {
              if ('str' in item) {
                return item.str;
              }
              return '';
            })
            .join(' ');
          
          fullText += pageText + '\n\n';
          console.log(`Page ${pageNum} extracted, chars:`, pageText.length);
        } catch (pageError) {
          console.error(`Error extracting page ${pageNum}:`, pageError);
        }
      }
      
      const cleanedText = fullText
        .replace(/\s+/g, ' ')
        .replace(/\n\s*\n/g, '\n\n')
        .trim();
      
      console.log('Total extracted text length:', cleanedText.length);
      console.log('Text preview:', cleanedText.substring(0, 500));
      
      return cleanedText;
    } catch (e) {
      console.error('PDF text extraction error:', e);
      return '';
    }
  };

  const handleGenerateNotes = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);
    setProcessingStep('Reading PDF file...');
    
    try {
      console.log('Processing PDF:', selectedFile.name);
      
      let extractedText = '';
      
      setProcessingStep('Extracting text from PDF...');
      extractedText = await extractTextFromPDF(selectedFile.uri);
      
      console.log('Extracted text preview:', extractedText.substring(0, 200));
      
      setProcessingStep('Generating notes with AI...');
      
      let generatedContent = '';
      let topicName = selectedFile.name.replace('.pdf', '');
      
      if (extractedText.length > 100) {
        const truncatedText = extractedText.length > 15000 
          ? extractedText.substring(0, 15000) + '...[content truncated]'
          : extractedText;
        
        const prompt = `You are an AI learning assistant. A user has uploaded a PDF document and here is the extracted text content:

"${truncatedText}"

Based on this PDF content, create comprehensive study notes.

Please provide:
1. Main Topic: Identify the main topic of this document (this will be the title)
2. Summary: Write a 2-3 sentence summary of the document
3. Key Concepts: Extract 5-8 key concepts or main points from the document
4. Detailed Explanation: Provide a clear, organized explanation of the content with proper sections
5. Important Terms: List any important terms or definitions found
6. Review Questions: Create 3-5 review questions to test understanding

Format your response as follows:
MAIN TOPIC:
[Identified main topic - keep it concise, max 5 words]

SUMMARY:
[Your 2-3 sentence summary]

KEY CONCEPTS:
- [Concept 1]
- [Concept 2]
- [Concept 3]
- [Concept 4]
- [Concept 5]

DETAILED EXPLANATION:
[Your organized explanation with proper structure and sections]

IMPORTANT TERMS:
- [Term 1]: [Definition]
- [Term 2]: [Definition]

REVIEW QUESTIONS:
1. [Question 1]
2. [Question 2]
3. [Question 3]`;

        console.log('Sending to AI for note generation...');
        generatedContent = await generateText({
          messages: [{ role: 'user', content: prompt }],
        });
        
        const topicMatch = generatedContent.match(/MAIN TOPIC:\s*([^\n]+)/);
        if (topicMatch && topicMatch[1].trim()) {
          topicName = topicMatch[1].trim();
        }
      } else {
        const prompt = `You are an AI learning assistant. A user has uploaded a PDF document titled "${selectedFile.name}".

The PDF text could not be fully extracted (it may be a scanned document or image-based PDF).

Based on the file name "${selectedFile.name}", create a template for study notes that the user can fill in.

Provide a structured template with:
1. A suggested topic name based on the filename
2. Empty sections for: Summary, Key Concepts, Notes, Important Terms, and Review Questions
3. Tips for how to manually add notes from the document

Format your response as follows:
MAIN TOPIC:
[Suggested topic based on filename - keep it concise]

SUMMARY:
[Template: Add a 2-3 sentence summary of the document here]

KEY CONCEPTS:
- [Add key concept 1]
- [Add key concept 2]
- [Add key concept 3]

NOTES:
[Add your notes from the PDF document here]

IMPORTANT TERMS:
- [Term]: [Definition]

REVIEW QUESTIONS:
1. [Add review question 1]
2. [Add review question 2]

---
💡 Tips for completing these notes:
• Read through the PDF and identify the main topic
• Note down key concepts and definitions
• Write a brief summary in your own words
• Create questions to test your understanding`;

        generatedContent = await generateText({
          messages: [{ role: 'user', content: prompt }],
        });
        
        const topicMatch = generatedContent.match(/MAIN TOPIC:\s*([^\n]+)/);
        if (topicMatch && topicMatch[1].trim()) {
          topicName = topicMatch[1].trim();
        }
      }

      console.log('Notes generated successfully');
      console.log('Topic name:', topicName);
      
      addExplanation(topicName, generatedContent);
      
      setIsProcessing(false);
      router.replace('/(tabs)/library');
      
    } catch (err) {
      console.error('Error processing PDF:', err);
      setError('Failed to process PDF. Please try again.');
      setIsProcessing(false);
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
            disabled={isProcessing}
          >
            <X size={24} color="#1F2937" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Upload PDF</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconBackground}>
              <FileText size={48} color="#F97316" strokeWidth={1.5} />
            </View>
          </View>

          <Text style={styles.title}>Upload PDF Document</Text>
          <Text style={styles.subtitle}>
            Select a PDF file to generate comprehensive study notes with AI
          </Text>

          <View style={styles.formatsContainer}>
            <Text style={styles.formatsLabel}>Supported format:</Text>
            <Text style={styles.formatsText}>PDF documents (.pdf)</Text>
          </View>

          {!selectedFile ? (
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={pickPDFFile}
              activeOpacity={0.7}
              disabled={isLoading || isProcessing}
            >
              {isLoading ? (
                <ActivityIndicator size="large" color="#F97316" />
              ) : (
                <>
                  <View style={styles.uploadIconContainer}>
                    <Upload size={32} color="#F97316" strokeWidth={2} />
                  </View>
                  <Text style={styles.uploadTitle}>Tap to select PDF file</Text>
                  <Text style={styles.uploadSubtitle}>
                    Browse your device for PDF documents
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
                  <File size={24} color="#F97316" strokeWidth={2} />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName} numberOfLines={1}>
                    {selectedFile.name}
                  </Text>
                  <Text style={styles.fileSize}>
                    {formatFileSize(selectedFile.size)}
                  </Text>
                </View>
                {!isProcessing && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={handleRemoveFile}
                    activeOpacity={0.7}
                  >
                    <X size={20} color="#6B7280" strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>

              {!isProcessing && (
                <TouchableOpacity
                  style={styles.changeFileButton}
                  onPress={pickPDFFile}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeFileText}>Choose different file</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color="#F97316" />
              <Text style={styles.processingText}>{processingStep}</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <AlertCircle size={18} color="#EF4444" strokeWidth={2} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>📚 How it works</Text>
            <Text style={styles.infoText}>
              1. Select a PDF document from your device{'\n'}
              2. AI will extract and analyze the content{'\n'}
              3. Comprehensive study notes will be generated{'\n'}
              4. Notes are saved to your library
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              (!selectedFile || isLoading || isProcessing) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerateNotes}
            activeOpacity={0.8}
            disabled={!selectedFile || isLoading || isProcessing}
          >
            {isProcessing ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Processing...</Text>
              </>
            ) : (
              <>
                <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBackground: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#FED7AA',
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
    borderColor: '#FDBA74',
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
    backgroundColor: '#FFF7ED',
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
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FED7AA',
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
    color: '#F97316',
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
  },
  processingText: {
    fontSize: 14,
    color: '#F97316',
    fontWeight: '500' as const,
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
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
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
  infoTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
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
    backgroundColor: '#F97316',
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
