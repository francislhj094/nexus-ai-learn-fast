import React, { useState, useEffect } from 'react';
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
} from 'lucide-react-native';
import { Audio } from 'expo-av';
import Colors from '@/constants/colors';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useExplanations } from '@/contexts/explanations';

const STT_API_URL = 'https://toolkit.rork.com/stt/transcribe/';
const MAX_RETRIES = 3;
const REQUEST_TIMEOUT = 180000;
const RETRY_DELAYS = [2000, 4000, 6000];

const base64ToBlob = (base64: string, mimeType: string): Blob => {
  try {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  } catch (error) {
    console.error('base64ToBlob error:', error);
    throw error;
  }
};

const getMimeTypeFromExtension = (ext: string): string => {
  const mimeMap: Record<string, string> = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'mp4': 'audio/mp4',
    'ogg': 'audio/ogg',
    'flac': 'audio/flac',
    'webm': 'audio/webm',
    'mpeg': 'audio/mpeg',
    'mpga': 'audio/mpeg',
  };
  return mimeMap[ext.toLowerCase()] || 'audio/webm';
};

type StepStatus = 'pending' | 'in-progress' | 'completed' | 'error';

interface Step {
  id: number;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: StepStatus;
  progress: number;
}

export default function NoteGeneratingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { addExplanation } = useExplanations();
  const audioUri = typeof params.audioUri === 'string' ? params.audioUri : '';
  const fileName = typeof params.fileName === 'string' ? params.fileName : 'Voice Recording';
  const language = typeof params.language === 'string' ? params.language : 'Auto detect';
  const duration = typeof params.duration === 'string' ? params.duration : '00:00:00';
  const webTranscript = typeof params.webTranscript === 'string' ? params.webTranscript : '';
  const mimeType = typeof params.mimeType === 'string' ? params.mimeType : '';
  const sourceType = typeof params.sourceType === 'string' ? params.sourceType : 'recording';
  const useSessionStorage = typeof params.useSessionStorage === 'string' ? params.useSessionStorage === 'true' : false;
  const rawAudioBase64 = typeof params.audioBase64 === 'string' ? params.audioBase64 : '';
  
  // Get audio base64 from sessionStorage (web) or URL params
  let audioBase64 = '';
  if (Platform.OS === 'web' && useSessionStorage) {
    try {
      const storedBase64 = sessionStorage.getItem('uploadedAudioBase64');
      if (storedBase64) {
        audioBase64 = storedBase64;
        console.log('Retrieved audio from sessionStorage, length:', audioBase64.length);
        // Clean up after retrieval
        sessionStorage.removeItem('uploadedAudioBase64');
        sessionStorage.removeItem('uploadedAudioMimeType');
      }
    } catch (e) {
      console.log('Failed to retrieve from sessionStorage:', e);
    }
  } else if (rawAudioBase64) {
    try {
      audioBase64 = decodeURIComponent(rawAudioBase64);
      console.log('Decoded audio base64 length:', audioBase64.length);
    } catch (e) {
      console.log('Failed to decode, using raw:', e);
      audioBase64 = rawAudioBase64;
    }
  }

  const [steps, setSteps] = useState<Step[]>([
    {
      id: 1,
      icon: <Upload size={24} color="#FFFFFF" strokeWidth={2} />,
      title: 'Recording is uploading',
      subtitle: 'It takes ranging from a few seconds to a few minutes',
      status: 'in-progress',
      progress: 0,
    },
    {
      id: 2,
      icon: <AudioLines size={24} color="#FFFFFF" strokeWidth={2} />,
      title: 'Recording is transcribing',
      subtitle: 'It takes ranging from a few seconds to a few minutes',
      status: 'pending',
      progress: 0,
    },
    {
      id: 3,
      icon: <Sparkles size={24} color="#FFFFFF" strokeWidth={2} />,
      title: 'Note is generating',
      subtitle: 'It takes ranging from a few seconds to a few minutes',
      status: 'pending',
      progress: 0,
    },
  ]);

  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    loadAudio();
    startProcessing();

    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAudio = async () => {
    try {
      if (!audioUri) return;

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

  const transcribeAudio = async (retryCount = 0): Promise<string> => {
    console.log('=== Starting Transcription ===');
    console.log('Audio URI:', audioUri);
    console.log('Platform:', Platform.OS);
    console.log('Web transcript available:', webTranscript.length > 0);
    console.log('Audio base64 available:', audioBase64.length > 0);
    console.log('Audio base64 length:', audioBase64.length);
    console.log('Source type:', sourceType);
    console.log('Retry count:', retryCount);
    console.log('File name:', fileName);
    console.log('Mime type param:', mimeType);

    const performFetch = async (formData: FormData): Promise<string | null> => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('Request timeout, aborting...');
        controller.abort();
      }, REQUEST_TIMEOUT);
      
      try {
        console.log('Sending audio to STT API:', STT_API_URL);
        
        const sttResponse = await fetch(STT_API_URL, {
          method: 'POST',
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        console.log('STT API response status:', sttResponse.status);
        
        if (sttResponse.ok) {
          const result = await sttResponse.json();
          console.log('=== STT API Result (SUCCESS) ===');
          console.log('Transcribed text:', result.text);
          
          if (result.text && result.text.trim().length > 0) {
            return result.text.trim();
          }
          return null;
        } else {
          const errorText = await sttResponse.text();
          console.error('STT API error response:', sttResponse.status, errorText);
          
          if (sttResponse.status >= 500 || sttResponse.status === 0) {
            throw new Error(`Server error: ${sttResponse.status}`);
          }
          return null;
        }
      } catch (error: any) {
        clearTimeout(timeoutId);
        console.error('Fetch error during STT:', error?.message || error);
        throw error;
      }
    };

    const getFileExtension = (name: string, type: string): string => {
      if (name && name.includes('.')) {
        const ext = name.split('.').pop()?.toLowerCase();
        if (ext) return ext;
      }
      if (type) {
        const typePart = type.split('/')[1];
        if (typePart) {
          if (typePart === 'mpeg') return 'mp3';
          if (typePart === 'mp4') return 'm4a';
          return typePart;
        }
      }
      return 'webm';
    };
    
    // For web platform with audioBase64 available
    if (Platform.OS === 'web' && audioBase64 && audioBase64.length > 100) {
      console.log('=== Using audioBase64 for web transcription (STT API) ===');
      try {
        const formData = new FormData();
        
        let fileMimeType = mimeType || 'audio/webm';
        let base64Data = '';
        
        if (audioBase64.startsWith('data:')) {
          const commaIndex = audioBase64.indexOf(',');
          if (commaIndex === -1) {
            console.error('Cannot find comma in data URL');
            return webTranscript || '';
          }
          
          const header = audioBase64.substring(0, commaIndex);
          base64Data = audioBase64.substring(commaIndex + 1);
          
          const mimeMatch = header.match(/data:([^;,]+)/);
          if (mimeMatch) {
            fileMimeType = mimeMatch[1];
          }
          
          console.log('Extracted mime type from data URL:', fileMimeType);
          console.log('Base64 data length:', base64Data.length);
        } else {
          base64Data = audioBase64;
          console.log('Using raw base64 data, length:', base64Data.length);
        }
        
        if (!base64Data || base64Data.length < 100) {
          console.error('Base64 data too short or empty');
          return webTranscript || '';
        }
        
        let blob: Blob;
        try {
          blob = base64ToBlob(base64Data, fileMimeType);
          console.log('Created blob from base64, size:', blob.size, 'type:', blob.type);
        } catch (blobError) {
          console.error('Failed to convert base64 to blob:', blobError);
          return webTranscript || '';
        }
        
        if (blob.size < 100) {
          console.error('Blob too small, likely corrupted data');
          return webTranscript || '';
        }
        
        const fileExtension = getFileExtension(fileName, fileMimeType);
        const finalMimeType = getMimeTypeFromExtension(fileExtension);
        
        console.log('Final file extension:', fileExtension, 'mime type:', finalMimeType);
        
        const audioFile = new File([blob], `recording.${fileExtension}`, { type: finalMimeType });
        console.log('Created File object:', audioFile.name, 'size:', audioFile.size, 'type:', audioFile.type);
        formData.append('audio', audioFile);
        
        const result = await performFetch(formData);
        if (result) return result;
        
        console.log('STT returned empty result');
        return webTranscript || '';
      } catch (error: any) {
        console.error('=== Transcription Error (base64) ===', error?.message || error);
        
        const errorMessage = error?.message || String(error);
        const isRetryableError = 
          error instanceof TypeError || 
          error?.name === 'AbortError' ||
          errorMessage.includes('network') || 
          errorMessage.includes('Network') ||
          errorMessage.includes('fetch') ||
          errorMessage.includes('Failed to fetch') ||
          errorMessage.includes('NetworkError');
        
        if (retryCount < MAX_RETRIES && isRetryableError) {
          const delay = RETRY_DELAYS[retryCount] || 2000;
          console.log(`Network error, retrying in ${delay}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return transcribeAudio(retryCount + 1);
        }
        
        console.log('Max retries reached, continuing without transcription');
        return webTranscript || '';
      }
    }
    
    if (!audioUri && !audioBase64) {
      console.log('No audio URI or base64, using web transcript if available');
      return webTranscript;
    }
    
    try {
      const formData = new FormData();
      
      if (Platform.OS === 'web') {
        let blob: Blob;
        
        console.log('Fetching blob from web URI:', audioUri);
        try {
          const response = await fetch(audioUri);
          if (!response.ok) {
            throw new Error(`Failed to fetch audio: ${response.status}`);
          }
          blob = await response.blob();
          console.log('Blob fetched, size:', blob.size, 'type:', blob.type);
        } catch (fetchError) {
          console.error('Failed to fetch from URI:', fetchError);
          return webTranscript || '';
        }
        
        if (blob.size < 100) {
          console.error('Fetched blob too small');
          return webTranscript || '';
        }
        
        const fileExtension = getFileExtension(fileName, blob.type || mimeType);
        const fileMimeType = getMimeTypeFromExtension(fileExtension);
        
        console.log('Using file extension:', fileExtension, 'mime type:', fileMimeType);
        
        const audioFile = new File([blob], `recording.${fileExtension}`, { type: fileMimeType });
        console.log('Created File object:', audioFile.name, 'size:', audioFile.size, 'type:', audioFile.type);
        formData.append('audio', audioFile);
      } else {
        const uriParts = audioUri.split('.');
        const fileType = uriParts[uriParts.length - 1].split('?')[0];
        console.log('Mobile - File type detected:', fileType);
        
        const audioFile = {
          uri: audioUri,
          name: `recording.${fileType}`,
          type: getMimeTypeFromExtension(fileType),
        } as any;
        
        console.log('Mobile audio file:', audioFile);
        formData.append('audio', audioFile);
      }
      
      const result = await performFetch(formData);
      if (result) return result;
      
      console.log('STT returned empty result');
      return webTranscript || '';
    } catch (error: any) {
      console.error('=== Transcription Error ===', error?.message || error);
      
      const errorMessage = error?.message || String(error);
      const isRetryableError = 
        error instanceof TypeError || 
        error?.name === 'AbortError' ||
        errorMessage.includes('network') || 
        errorMessage.includes('Network') ||
        errorMessage.includes('fetch') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('NetworkError') ||
        errorMessage.includes('Server error');
      
      if (retryCount < MAX_RETRIES && isRetryableError) {
        const delay = RETRY_DELAYS[retryCount] || 2000;
        console.log(`Network error, retrying in ${delay}ms (attempt ${retryCount + 2}/${MAX_RETRIES + 1})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return transcribeAudio(retryCount + 1);
      }
      
      console.log('Max retries reached, continuing without transcription');
      return webTranscript || '';
    }
  };

  const startProcessing = async () => {
    let transcription = '';
    
    // Step 1: Upload (simulated progress)
    await new Promise<void>((resolve) => {
      animateStep(1, 1500, resolve);
    });

    // Step 2: Transcribe
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === 2) {
          return { ...step, status: 'in-progress' as StepStatus, progress: 0 };
        }
        return step;
      })
    );

    const transcribeProgressInterval = setInterval(() => {
      setSteps(prevSteps =>
        prevSteps.map(step => {
          if (step.id === 2 && step.progress < 80) {
            return { ...step, progress: Math.min(step.progress + 10, 80) };
          }
          return step;
        })
      );
    }, 200);

    try {
      transcription = await transcribeAudio();
      console.log('=== Final Transcription ===');
      console.log('Transcription:', transcription);
      console.log('Length:', transcription.length);
    } catch (error) {
      console.error('Transcription failed:', error);
    }

    clearInterval(transcribeProgressInterval);

    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === 2) {
          return { ...step, status: 'completed' as StepStatus, progress: 100 };
        }
        return step;
      })
    );

    await new Promise(resolve => setTimeout(resolve, 300));

    // Step 3: Generate notes
    setSteps(prevSteps =>
      prevSteps.map(step => {
        if (step.id === 3) {
          return { ...step, status: 'in-progress' as StepStatus, progress: 0 };
        }
        return step;
      })
    );

    const progressInterval = setInterval(() => {
      setSteps(prevSteps =>
        prevSteps.map(step => {
          if (step.id === 3 && step.progress < 90) {
            return { ...step, progress: Math.min(step.progress + 5, 90) };
          }
          return step;
        })
      );
    }, 300);

    try {
      const hasTranscription = transcription.length > 2;
      let topicName = fileName;
      let generatedContent = '';

      if (hasTranscription) {
        const aiLanguage = language === 'Auto detect' ? 'English' : language;
        
        const prompt = `You are an AI learning assistant. A user has just recorded an audio note and here is the transcription:

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
- [Concept 5]

DETAILED EXPLANATION:
[Your organized explanation with proper structure]

REVIEW QUESTIONS:
1. [Question 1]
2. [Question 2]
3. [Question 3]

Language: ${aiLanguage}`;

        console.log('Generating notes with AI...');
        generatedContent = await generateText({
          messages: [{ role: 'user', content: prompt }],
        });

        const topicMatch = generatedContent.match(/MAIN TOPIC:\s*([^\n]+)/);
        if (topicMatch && topicMatch[1].trim()) {
          topicName = topicMatch[1].trim();
        }
      } else {
        topicName = sourceType === 'upload' 
          ? `Audio Note - ${new Date().toLocaleDateString()}`
          : `Voice Note - ${new Date().toLocaleDateString()}`;
        generatedContent = sourceType === 'upload' 
          ? `📝 Audio File Notes

File Name: ${fileName}
Processed on: ${new Date().toLocaleString()}

---

✏️ WHAT I LEARNED:
Add your notes about what was covered in this audio.

📌 KEY POINTS:
• Point 1
• Point 2
• Point 3

💡 IMPORTANT DETAILS:
Add any important details, examples, or definitions mentioned.

✅ ACTION ITEMS:
• Task 1
• Task 2

---

Tip: You can edit this note anytime to add more details from the audio.`
          : `📝 Voice Recording Notes

Recording Duration: ${duration}
Recorded on: ${new Date().toLocaleString()}

---

✏️ WHAT I DISCUSSED:
Add your notes about what you talked about in this recording.

📌 KEY POINTS:
• Point 1
• Point 2
• Point 3

💡 IMPORTANT DETAILS:
Add any important details, examples, or definitions mentioned.

✅ ACTION ITEMS:
• Task 1
• Task 2

---

Tip: You can edit this note anytime to add more details from your recording.`;
      }

      clearInterval(progressInterval);

      setSteps(prevSteps =>
        prevSteps.map(step => {
          if (step.id === 3) {
            return { ...step, status: 'completed' as StepStatus, progress: 100 };
          }
          return step;
        })
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      addExplanation(topicName, generatedContent);
      setIsComplete(true);

    } catch (error) {
      console.error('Error generating notes:', error);
      clearInterval(progressInterval);

      const fallbackContent = `Voice Recording Notes

Recording Duration: ${duration}
Recorded on: ${new Date().toLocaleString()}

${transcription.length > 2 ? `TRANSCRIPTION:\n${transcription}\n\n` : ''}This voice recording has been saved.`;

      setSteps(prevSteps =>
        prevSteps.map(step => {
          if (step.id === 3) {
            return { ...step, status: 'completed' as StepStatus, progress: 100 };
          }
          return step;
        })
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      addExplanation(fileName, fallbackContent);
      setIsComplete(true);
    }
  };

  const animateStep = (stepId: number, animDuration: number, onComplete: () => void) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / animDuration) * 100, 100);

      setSteps(prevSteps =>
        prevSteps.map(step => {
          if (step.id === stepId) {
            return {
              ...step,
              status: progress >= 100 ? 'completed' : 'in-progress',
              progress: Math.round(progress),
            };
          }
          return step;
        })
      );

      if (progress >= 100) {
        clearInterval(interval);
        onComplete();
      }
    }, 50);
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
            <Text style={styles.headerTitle}>Note Generating</Text>
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
                  {step.icon}
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

        <View style={styles.spacer} />

        <View style={styles.audioPlayerCard}>
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

          <View style={styles.previewLabelRow}>
            <FileAudio size={16} color="#6B7280" strokeWidth={2} />
            <Text style={styles.previewLabel}>Preview</Text>
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
    marginBottom: 12,
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
  previewLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  previewLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500' as const,
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
