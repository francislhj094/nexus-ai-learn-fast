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

type StepStatus = 'pending' | 'in-progress' | 'completed';

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
  const fileName = typeof params.fileName === 'string' ? params.fileName : 'Audio File';
  const language = typeof params.language === 'string' ? params.language : 'Auto detect';

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
  const [duration, setDuration] = useState(0);

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
      setDuration(status.durationMillis || 0);
      setIsPlaying(status.isPlaying);

      if (status.didJustFinish) {
        setIsPlaying(false);
      }
    }
  };

  const startProcessing = async () => {
    await new Promise<void>((resolve) => {
      animateStep(1, 2000, resolve);
    });

    await new Promise<void>((resolve) => {
      animateStep(2, 2500, resolve);
    });

    try {
      const topicName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const aiLanguage = language === 'Auto detect' ? 'English' : language;

      const startGeneration = () => {
        setSteps(prevSteps =>
          prevSteps.map(step => {
            if (step.id === 3) {
              return {
                ...step,
                status: 'in-progress' as StepStatus,
                progress: 0,
              };
            }
            return step;
          })
        );
      };

      startGeneration();

      const progressInterval = setInterval(() => {
        setSteps(prevSteps =>
          prevSteps.map(step => {
            if (step.id === 3 && step.progress < 90) {
              return {
                ...step,
                progress: Math.min(step.progress + 5, 90),
              };
            }
            return step;
          })
        );
      }, 300);

      const prompt = `You are an AI learning assistant using the Feynman Technique. Based on an audio recording titled "${topicName}", create comprehensive study notes.

Please provide:
1. A brief summary (2-3 sentences) of what this topic is about
2. 4-5 key points or main concepts to remember
3. A detailed explanation suitable for learning, breaking down complex concepts into simple terms

Format your response as follows:
SUMMARY:
[Your summary here]

KEY POINTS:
- [Point 1]
- [Point 2]
- [Point 3]
- [Point 4]
- [Point 5]

EXPLANATION:
[Your detailed explanation here]

Language: ${aiLanguage}`;

      const generatedContent = await generateText({
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      clearInterval(progressInterval);

      setSteps(prevSteps =>
        prevSteps.map(step => {
          if (step.id === 3) {
            return {
              ...step,
              status: 'completed' as StepStatus,
              progress: 100,
            };
          }
          return step;
        })
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      addExplanation(topicName, generatedContent);

      await new Promise(resolve => setTimeout(resolve, 300));

      router.replace('/(tabs)/library');
    } catch (error) {
      console.error('Error generating notes:', error);

      const topicName = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      const fallbackContent = `# ${topicName}\n\nYour audio recording has been processed. Here are some notes:\n\n## Summary\nThis content is about ${topicName}. The audio file has been saved and is ready for review.\n\n## Key Points\n- Audio recording titled: ${fileName}\n- Language: ${language}\n- Processing completed successfully\n\n## Next Steps\nReview the audio and add your own notes and insights based on what you heard.`;

      setSteps(prevSteps =>
        prevSteps.map(step => {
          if (step.id === 3) {
            return {
              ...step,
              status: 'completed' as StepStatus,
              progress: 100,
            };
          }
          return step;
        })
      );

      await new Promise(resolve => setTimeout(resolve, 500));

      addExplanation(topicName, fallbackContent);

      await new Promise(resolve => setTimeout(resolve, 300));

      router.replace('/(tabs)/library');
    }
  };

  const animateStep = (stepId: number, duration: number, onComplete: () => void) => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);

      setSteps(prevSteps =>
        prevSteps.map(step => {
          if (step.id === stepId) {
            return {
              ...step,
              status: progress >= 100 ? 'completed' : 'in-progress',
              progress: Math.round(progress),
            };
          }
          if (step.id === stepId + 1 && progress >= 100) {
            return {
              ...step,
              status: 'in-progress',
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
      const newPosition = Math.min(position + 10000, duration);
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
    return [styles.stepIconContainer, styles.stepIconContainerPending];
  };

  const getProgressBarStyle = (status: StepStatus) => {
    if (status === 'completed') {
      return styles.progressBarCompleted;
    }
    if (status === 'in-progress') {
      return styles.progressBarInProgress;
    }
    return styles.progressBarPending;
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
                    <View style={[styles.progressBarBackground]}>
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
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.seekBarContainer}>
            <View style={styles.seekBarBackground}>
              <View
                style={[
                  styles.seekBarFill,
                  { width: `${duration > 0 ? (position / duration) * 100 : 0}%` },
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
          style={styles.goToNotesButton}
          onPress={() => router.push('/(tabs)/library')}
          activeOpacity={0.8}
        >
          <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
          <Text style={styles.goToNotesButtonText}>Go to My Notes</Text>
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
  goToNotesButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
