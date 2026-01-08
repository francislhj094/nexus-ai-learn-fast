import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { 
  Sparkles, 
  Upload, 
  AudioLines, 
  Play, 
  Pause, 
  RotateCcw, 
  RotateCw, 
  Info,
  Hourglass,
  FileAudio,
  CheckCircle,
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import Colors from '@/constants/colors';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useExplanations } from '@/contexts/explanations';
import { useAudioFile } from '@/contexts/audio-file';

const STT_API_URL = 'https://toolkit.rork.com/stt/transcribe/';
const MAX_RETRIES = 2;

type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error';

interface Step {
  id: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: StepStatus;
  progress: number;
}

export default function NoteGeneratingAudioScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addExplanation } = useExplanations();
  const { audioData, getAudioFile, clearAudioFile } = useAudioFile();
  
  const audioUri = typeof params.audioUri === 'string' ? params.audioUri : '';
  const fileName = typeof params.fileName === 'string' ? params.fileName : 'Audio File';
  const language = typeof params.language === 'string' ? params.language : 'Auto detect';
  const mimeType = typeof params.mimeType === 'string' ? params.mimeType : '';
  
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 1,
      icon: <Upload size={24} color="#FFFFFF" strokeWidth={2} />,
      title: 'Audio is uploading',
      subtitle: 'Preparing your audio file for processing',
      status: 'in-progress',
      progress: 0,
    },
    {
      id: 2,
      icon: <AudioLines size={24} color="#FFFFFF" strokeWidth={2} />,
      title: 'Audio is transcribing',
      subtitle: 'Converting speech to text',
      status: 'pending',
      progress: 0,
    },
    {
      id: 3,
      icon: <Sparkles size={24} color="#FFFFFF" strokeWidth={2} />,
      title: 'Note is generating',
      subtitle: 'Creating comprehensive study notes',
      status: 'pending',
      progress: 0,
    },
  ]);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const processingStarted = useRef(false);

  useEffect(() => {
    loadAudio();
    
    if (!processingStarted.current) {
      processingStarted.current = true;
      startProcessing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const loadAudio = async () => {
    try {
      if (!audioUri) {
        console.log('No audio URI provided');
        return;
      }

      console.log('Loading audio from URI:', audioUri);

      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: false },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      console.log('Audio loaded successfully');
    } catch (error) {
      console.error('Error loading audio:', error);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPosition(status.positionMillis);
      setAudioDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const getFileExtension = (name: string, uri: string): string => {
    if (name && name.includes('.')) {
      const parts = name.split('.');
      return parts[parts.length - 1].toLowerCase();
    }
    if (uri && uri.includes('.')) {
      const uriParts = uri.split('.');
      return uriParts[uriParts.length - 1].split('?')[0].toLowerCase();
    }
    return 'm4a';
  };

  const getMimeType = (extension: string, fallback: string): string => {
    const mimeMap: Record<string, string> = {
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'm4a': 'audio/m4a',
      'ogg': 'audio/ogg',
      'flac': 'audio/flac',
      'webm': 'audio/webm',
      'mp4': 'audio/mp4',
      'mpeg': 'audio/mpeg',
      'mpga': 'audio/mpeg',
    };
    return mimeMap[extension] || fallback || 'audio/mpeg';
  };

  const transcribeAudio = async (retryCount = 0): Promise<string> => {
    console.log('=== Starting Audio Transcription ===');
    console.log('Audio URI:', audioUri);
    console.log('File name:', fileName);
    console.log('MIME type:', mimeType);
    console.log('Platform:', Platform.OS);
    console.log('Has audio data in context:', !!audioData);
    console.log('Retry count:', retryCount);
    
    try {
      const formData = new FormData();
      const fileExtension = getFileExtension(fileName, audioUri);
      const fileMimeType = getMimeType(fileExtension, mimeType);
      
      if (Platform.OS === 'web') {
        console.log('=== Web Platform: Processing audio ===');
        
        let audioFile: File | null = null;
        
        const storedFile = getAudioFile();
        if (storedFile && storedFile.size > 100) {
          audioFile = storedFile;
          console.log('Using stored file from context:', audioFile.name, audioFile.size, audioFile.type);
        }
        
        if (!audioFile && audioUri) {
          try {
            console.log('Fetching from URI as fallback:', audioUri);
            const response = await fetch(audioUri);
            if (response.ok) {
              const blob = await response.blob();
              console.log('Fetched blob - size:', blob.size, 'type:', blob.type);
              
              if (blob.size > 100) {
                audioFile = new File(
                  [blob], 
                  fileName || `audio.${fileExtension}`, 
                  { type: fileMimeType }
                );
                console.log('Created File from URI fetch:', audioFile.name, audioFile.size);
              }
            }
          } catch (fetchError) {
            console.error('Failed to fetch audio from URI:', fetchError);
          }
        }
        
        if (!audioFile || audioFile.size < 100) {
          console.error('Audio file is missing or too small:', audioFile?.size);
          throw new Error('Audio file is too small or empty. Please try uploading a different audio file.');
        }
        
        console.log('Final audio file - name:', audioFile.name, 'size:', audioFile.size, 'type:', audioFile.type);
        formData.append('audio', audioFile);
        
      } else {
        console.log('=== Native Platform: Using URI directly ===');
        
        if (!audioUri) {
          console.error('No audio URI provided for native platform');
          throw new Error('No audio file provided');
        }
        
        console.log('Using extension:', fileExtension, 'mime:', fileMimeType);
        
        const audioFileObj = {
          uri: audioUri,
          name: fileName || `audio.${fileExtension}`,
          type: fileMimeType,
        } as any;
        
        formData.append('audio', audioFileObj);
        console.log('Created audio file object for native');
      }
      
      console.log('Sending to STT API:', STT_API_URL);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);
      
      let sttResponse: Response;
      try {
        sttResponse = await fetch(STT_API_URL, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        console.error('Fetch error:', fetchErr);
        
        if (retryCount < MAX_RETRIES) {
          console.log(`Network error, retrying (attempt ${retryCount + 2})...`);
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)));
          return transcribeAudio(retryCount + 1);
        }
        throw new Error('Network error: Unable to connect to transcription service. Please check your internet connection.');
      }
      
      clearTimeout(timeoutId);
      
      console.log('STT API response status:', sttResponse.status);
      
      if (!sttResponse.ok) {
        const errorText = await sttResponse.text();
        console.error('STT API error:', sttResponse.status, errorText);
        
        if (retryCount < MAX_RETRIES && (sttResponse.status >= 500 || sttResponse.status === 0)) {
          console.log(`Retrying transcription (attempt ${retryCount + 2})...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
          return transcribeAudio(retryCount + 1);
        }
        
        throw new Error(`Transcription service error: ${sttResponse.status}`);
      }
      
      const result = await sttResponse.json();
      console.log('=== STT API Result ===');
      console.log('Transcribed text:', result.text);
      console.log('Detected language:', result.language);
      
      if (result.text && result.text.trim().length > 0) {
        return result.text.trim();
      }
      
      console.log('STT returned empty text');
      return '';
    } catch (error) {
      console.error('=== Transcription Error ===', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Transcription request timed out. Please try a shorter audio file.');
      }
      
      throw error;
    }
  };

  const updateStepStatus = (stepId: number, status: StepStatus, progress: number) => {
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === stepId) {
          return { ...step, status, progress };
        }
        return step;
      })
    );
  };

  const animateProgress = (stepId: number, targetProgress: number, duration: number): Promise<void> => {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / duration) * targetProgress, targetProgress);
        
        updateStepStatus(stepId, 'in-progress', Math.round(progress));
        
        if (progress >= targetProgress) {
          clearInterval(interval);
          resolve();
        }
      }, 50);
    });
  };

  const startProcessing = async () => {
    let transcription = '';
    
    try {
      await animateProgress(1, 100, 1000);
      updateStepStatus(1, 'completed', 100);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      updateStepStatus(2, 'in-progress', 0);
      
      const transcribePromise = transcribeAudio();
      const progressPromise = animateProgress(2, 80, 3000);
      
      const [transcriptionResult] = await Promise.all([
        transcribePromise.catch(err => {
          console.error('Transcription failed:', err);
          return '';
        }),
        progressPromise,
      ]);
      
      transcription = transcriptionResult;
      console.log('=== Final Transcription ===');
      console.log('Text:', transcription);
      console.log('Length:', transcription.length);
      
      updateStepStatus(2, 'completed', 100);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      updateStepStatus(3, 'in-progress', 0);
      
      let topicName = fileName.replace(/\.[^/.]+$/, '');
      let generatedContent = '';
      
      if (transcription.length > 5) {
        const progressInterval = setInterval(() => {
          setSteps(prevSteps =>
            prevSteps.map(step => {
              if (step.id === 3 && step.progress < 85) {
                return { ...step, progress: Math.min(step.progress + 3, 85) };
              }
              return step;
            })
          );
        }, 200);
        
        const aiLanguage = language === 'Auto detect' ? 'English' : language;
        
        const prompt = `You are an AI learning assistant. A user has uploaded an audio file and here is the transcription:

"${transcription}"

Based on this transcribed content, create comprehensive study notes.

Please provide:
1. Main Topic: Identify the main topic discussed (this will be the title)
2. Summary: Write a 2-3 sentence summary of what was discussed
3. Key Concepts: Extract 4-6 key concepts or main points mentioned
4. Detailed Explanation: Provide a clear, organized explanation of the content
5. Review Questions: Create 2-3 review questions to test understanding

Format your response as follows:
MAIN TOPIC:
[Identified main topic]

SUMMARY:
[Your 2-3 sentence summary]

KEY CONCEPTS:
- [Concept 1]
- [Concept 2]
- [Concept 3]
- [Concept 4]

DETAILED EXPLANATION:
[Your organized explanation with proper structure]

REVIEW QUESTIONS:
1. [Question 1]
2. [Question 2]
3. [Question 3]

Language: ${aiLanguage}`;

        console.log('Generating notes with AI...');
        
        try {
          generatedContent = await generateText({
            messages: [{ role: 'user', content: prompt }],
          });
          
          const topicMatch = generatedContent.match(/MAIN TOPIC:\s*([^\n]+)/);
          if (topicMatch && topicMatch[1].trim()) {
            topicName = topicMatch[1].trim();
          }
        } catch (aiError) {
          console.error('AI generation error:', aiError);
          generatedContent = `📝 Audio Notes

Transcription:
${transcription}

---

File: ${fileName}
Processed on: ${new Date().toLocaleString()}`;
        }
        
        clearInterval(progressInterval);
      } else {
        await animateProgress(3, 80, 1500);
        
        topicName = `Audio Note - ${new Date().toLocaleDateString()}`;
        generatedContent = `📝 Audio File Notes

File Name: ${fileName}
Processed on: ${new Date().toLocaleString()}

---

⚠️ Unable to transcribe audio content. This could be due to:
• Audio quality or format issues
• No speech detected in the audio
• Background noise interference

✏️ WHAT I LEARNED:
Add your notes about what was covered in this audio.

📌 KEY POINTS:
• Point 1
• Point 2
• Point 3

💡 IMPORTANT DETAILS:
Add any important details, examples, or definitions mentioned.

---

Tip: You can edit this note anytime to add more details from the audio.`;
      }
      
      updateStepStatus(3, 'completed', 100);
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      addExplanation(topicName, generatedContent);
      clearAudioFile();
      setIsComplete(true);
      
    } catch (error) {
      console.error('Processing error:', error);
      setErrorMessage('An error occurred while processing your audio. Please try again.');
      
      const fallbackContent = `📝 Audio Notes

File: ${fileName}
Processed on: ${new Date().toLocaleString()}

${transcription.length > 5 ? `Transcription:\n${transcription}\n\n` : ''}---

An error occurred during processing. Your audio has been saved.`;
      
      updateStepStatus(3, 'completed', 100);
      addExplanation(fileName.replace(/\.[^/.]+$/, '') || 'Audio Note', fallbackContent);
      clearAudioFile();
      setIsComplete(true);
    }
  };

  const togglePlayPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const skipForward = async () => {
    if (!sound) return;

    try {
      const newPosition = Math.min(position + 10000, audioDuration);
      await sound.setPositionAsync(newPosition);
    } catch (error) {
      console.error('Error skipping forward:', error);
    }
  };

  const skipBackward = async () => {
    if (!sound) return;

    try {
      const newPosition = Math.max(position - 10000, 0);
      await sound.setPositionAsync(newPosition);
    } catch (error) {
      console.error('Error skipping backward:', error);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getStepIconContainerStyle = (status: StepStatus) => {
    if (status === 'completed') {
      return [styles.stepIconContainer, styles.stepIconContainerCompleted];
    }
    if (status === 'in-progress') {
      return [styles.stepIconContainer, styles.stepIconContainerInProgress];
    }
    if (status === 'error') {
      return [styles.stepIconContainer, styles.stepIconContainerError];
    }
    return [styles.stepIconContainer, styles.stepIconContainerPending];
  };

  const getProgressBarStyle = (status: StepStatus) => {
    if (status === 'completed') {
      return styles.progressBarCompleted;
    }
    if (status === 'in-progress') {
      return styles.progressBarInProgress;
    }
    if (status === 'error') {
      return styles.progressBarError;
    }
    return styles.progressBarPending;
  };

  const handleGoToNotes = () => {
    router.replace('/(tabs)/library');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false, gestureEnabled: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Sparkles size={24} color="#1F2937" strokeWidth={2} />
            <Text style={styles.headerTitle}>Generating Notes</Text>
          </View>
        </View>

        <View style={styles.warningBanner}>
          <Info size={16} color="#6B7280" strokeWidth={2} />
          <Text style={styles.warningText}>Don&apos;t turn off app while generating note</Text>
        </View>

        <View style={styles.stepsContainer}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepWrapper}>
              <View style={styles.stepRow}>
                <View style={getStepIconContainerStyle(step.status)}>
                  {step.status === 'completed' ? (
                    <CheckCircle size={24} color="#FFFFFF" strokeWidth={2} />
                  ) : (
                    step.icon
                  )}
                </View>

                <View style={styles.stepTextContainer}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepSubtitle}>{step.subtitle}</Text>

                  <View style={styles.progressBarContainer}>
                    <View style={styles.progressBarBackground}>
                      <View
                        style={[
                          getProgressBarStyle(step.status),
                          { width: `${step.status === 'in-progress' ? step.progress : step.status === 'completed' ? 100 : 0}%` },
                        ]}
                      />
                    </View>

                    {step.status === 'in-progress' && (
                      <Text style={styles.progressText}>{step.progress}%</Text>
                    )}
                    {step.status === 'pending' && (
                      <Hourglass size={16} color="#9CA3AF" strokeWidth={2} />
                    )}
                    {step.status === 'completed' && (
                      <Text style={styles.progressTextCompleted}>Done</Text>
                    )}
                  </View>
                </View>
              </View>

              {index < steps.length - 1 && (
                <View
                  style={[
                    styles.connector,
                    step.status === 'completed' && styles.connectorCompleted,
                  ]}
                />
              )}
            </View>
          ))}
        </View>

        {errorMessage && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.spacer} />

        <View style={styles.audioPlayerCard}>
          <View style={styles.fileInfoRow}>
            <FileAudio size={20} color="#6B7280" strokeWidth={2} />
            <Text style={styles.fileNameText} numberOfLines={1}>{fileName}</Text>
          </View>
          
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Text style={styles.timeText}>{formatTime(audioDuration)}</Text>
          </View>

          <View style={styles.seekBarContainer}>
            <View style={styles.seekBarBackground}>
              <View
                style={[
                  styles.seekBarFill,
                  { width: `${audioDuration > 0 ? (position / audioDuration) * 100 : 0}%` },
                ]}
              />
            </View>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={styles.controlButton}
              onPress={skipBackward}
              activeOpacity={0.7}
              disabled={!sound}
            >
              <RotateCcw size={24} color="#374151" strokeWidth={2} />
              <Text style={styles.skipLabel}>10</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.playButton}
              onPress={togglePlayPause}
              activeOpacity={0.7}
              disabled={!sound}
            >
              {isPlaying ? (
                <Pause size={28} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
              ) : (
                <Play size={28} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.controlButton}
              onPress={skipForward}
              activeOpacity={0.7}
              disabled={!sound}
            >
              <RotateCw size={24} color="#374151" strokeWidth={2} />
              <Text style={styles.skipLabel}>10</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.goToNotesButton, !isComplete && styles.goToNotesButtonDisabled]}
          onPress={handleGoToNotes}
          activeOpacity={0.8}
          disabled={!isComplete}
        >
          <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.goToNotesButtonText}>
            {isComplete ? 'Go to My Notes' : 'Processing...'}
          </Text>
        </TouchableOpacity>
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
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#6B7280',
  },
  stepsContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  stepWrapper: {
    marginBottom: 16,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepIconContainerPending: {
    backgroundColor: '#9CA3AF',
  },
  stepIconContainerInProgress: {
    backgroundColor: '#374151',
  },
  stepIconContainerCompleted: {
    backgroundColor: '#10B981',
  },
  stepIconContainerError: {
    backgroundColor: '#EF4444',
  },
  stepTextContainer: {
    flex: 1,
    paddingTop: 4,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    marginBottom: 12,
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBarBackground: {
    flex: 1,
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarPending: {
    height: '100%',
    backgroundColor: '#9CA3AF',
    borderRadius: 4,
  },
  progressBarInProgress: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
  },
  progressBarCompleted: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressBarError: {
    height: '100%',
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#1F2937',
    minWidth: 36,
  },
  progressTextCompleted: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#10B981',
    minWidth: 36,
  },
  connector: {
    width: 2,
    height: 24,
    backgroundColor: '#E5E7EB',
    marginLeft: 23,
    marginTop: 4,
    marginBottom: 4,
  },
  connectorCompleted: {
    backgroundColor: '#10B981',
  },
  errorBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: 14,
    color: '#DC2626',
    textAlign: 'center',
  },
  spacer: {
    flex: 1,
  },
  audioPlayerCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  fileInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  fileNameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500' as const,
    color: '#374151',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
  },
  seekBarContainer: {
    marginBottom: 20,
  },
  seekBarBackground: {
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
  },
  seekBarFill: {
    height: '100%',
    backgroundColor: '#8B5CF6',
    borderRadius: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
  },
  controlButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative' as const,
  },
  skipLabel: {
    position: 'absolute' as const,
    fontSize: 10,
    fontWeight: 'bold' as const,
    color: '#374151',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#374151',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goToNotesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#374151',
    marginHorizontal: 20,
    marginBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  goToNotesButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  goToNotesButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
