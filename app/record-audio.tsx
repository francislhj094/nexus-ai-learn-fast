import { useRouter } from "expo-router";
import { X, ChevronDown } from "lucide-react-native";
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";

// Declare Web Speech Recognition API types
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default function RecordAudioScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [transcription, setTranscription] = useState<string>("");
  const [isTranscribing, setIsTranscribing] = useState(false);
  
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recognitionRef = useRef<any>(null);
  const interimTranscriptRef = useRef<string>("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const cleanupRecording = useCallback(async () => {
    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      
      if (recordingRef.current) {
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording || !status.isDoneRecording) {
          await recordingRef.current.stopAndUnloadAsync();
        }
        recordingRef.current = null;
      }

      // Cleanup speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          console.log('Recognition already stopped');
        }
        recognitionRef.current = null;
      }

      // Cleanup MediaRecorder
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        } catch {
          console.log('MediaRecorder cleanup error');
        }
        mediaRecorderRef.current = null;
      }
    } catch (error) {
      console.log('Cleanup error (can be ignored):', error);
    }
  }, []);

  const startSpeechRecognition = useCallback(() => {
    // Only start speech recognition on web platform
    if (Platform.OS !== 'web') {
      console.log('Speech recognition only available on web platform');
      return;
    }

    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.log('Speech recognition not supported in this browser');
        return;
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        console.log('Speech recognition started');
        setIsTranscribing(true);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscription(prev => prev + finalTranscript);
        }
        
        interimTranscriptRef.current = interimTranscript;
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'no-speech') {
          // Restart recognition if no speech detected
          try {
            recognition.start();
          } catch {
            console.log('Could not restart recognition');
          }
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended');
        setIsTranscribing(false);
        // Restart if still recording and not paused
        if (isRecording && !isPaused && recognitionRef.current) {
          try {
            recognition.start();
          } catch {
            console.log('Could not restart recognition');
          }
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (error) {
      console.error('Failed to start speech recognition:', error);
    }
  }, [isRecording, isPaused]);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsTranscribing(false);
      } catch {
        console.log('Recognition already stopped');
      }
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Clean up any existing recording first
      await cleanupRecording();
      
      console.log('Requesting audio permissions...');
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== 'granted') {
        console.error('Microphone permission denied');
        setTimeout(() => router.back(), 100);
        return;
      }

      console.log('Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log('Creating recording...');
      
      // Use proper recording format for each platform
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.wav',
          outputFormat: Audio.IOSOutputFormat.LINEARPCM,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      });
      await recording.startAsync();
      
      recordingRef.current = recording;
      setIsRecording(true);
      console.log('Recording started successfully');

      // Start Web MediaRecorder for better STT API compatibility
      if (Platform.OS === 'web') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
              sampleRate: 44100,
              channelCount: 1,
            } 
          });
          
          // Check for supported mime types
          let mimeType = 'audio/webm;codecs=opus';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/webm';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
              mimeType = 'audio/mp4';
            }
          }
          console.log('Using MediaRecorder mimeType:', mimeType);
          
          const mediaRecorder = new MediaRecorder(stream, {
            mimeType: mimeType,
            audioBitsPerSecond: 128000,
          });
          
          audioChunksRef.current = [];
          
          mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              audioChunksRef.current.push(event.data);
              console.log('Audio chunk received, size:', event.data.size, 'total chunks:', audioChunksRef.current.length);
            }
          };
          
          // Collect data more frequently for better accuracy
          mediaRecorder.start(500);
          mediaRecorderRef.current = mediaRecorder;
          console.log('Web MediaRecorder started for STT');
        } catch (mediaError) {
          console.log('MediaRecorder not available:', mediaError);
        }
        
        setTimeout(() => startSpeechRecognition(), 500);
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
      setTimeout(() => router.back(), 100);
    }
  }, [router, startSpeechRecognition, cleanupRecording]);

  useEffect(() => {
    const initRecording = async () => {
      await new Promise(resolve => setTimeout(resolve, 300));
      await startRecording();
    };
    
    initRecording();
    
    return () => {
      cleanupRecording();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused, pulseAnim]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
        const newHeight = Math.random() * 60 + 10;
        setWaveformData((prev) => [...prev.slice(-49), newHeight]);
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCancel = async () => {
    try {
      await cleanupRecording();
      setIsRecording(false);
      router.back();
    } catch (error) {
      console.log('Cancel error:', error);
      router.back();
    }
  };

  const handleStop = async () => {
    try {
      if (!recordingRef.current) {
        router.back();
        return;
      }

      setIsProcessing(true);

      const status = await recordingRef.current.getStatusAsync();
      
      if (status.isRecording || !status.isDoneRecording) {
        await recordingRef.current.stopAndUnloadAsync();
      }
      
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;
      setIsRecording(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      console.log('Recording saved:', uri);

      stopSpeechRecognition();
      
      await new Promise(resolve => setTimeout(resolve, 300));

      const recordingDuration = formatTime(recordingTime);
      let webTranscript = transcription.trim();
      
      console.log('=== Navigating to note-generating ===' );
      console.log('URI:', uri);
      console.log('Duration:', recordingDuration);
      console.log('Web transcript from Speech Recognition:', webTranscript);

      // Stop MediaRecorder and get final audio
      let audioBase64 = '';
      if (Platform.OS === 'web' && mediaRecorderRef.current) {
        try {
          // Request final data chunk and wait for stop
          await new Promise<void>((resolve) => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
              const recorder = mediaRecorderRef.current;
              
              // Set up handlers before stopping
              let finalDataReceived = false;
              let stopReceived = false;
              
              const checkComplete = () => {
                if (finalDataReceived && stopReceived) {
                  resolve();
                }
              };
              
              recorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                  audioChunksRef.current.push(event.data);
                  console.log('Final audio chunk received, size:', event.data.size);
                }
                finalDataReceived = true;
                checkComplete();
              };
              
              recorder.onstop = () => {
                console.log('MediaRecorder stopped');
                stopReceived = true;
                checkComplete();
              };
              
              // Request any remaining data before stopping
              try {
                recorder.requestData();
              } catch {
                console.log('requestData not supported');
              }
              
              recorder.stop();
            } else {
              resolve();
            }
          });
          
          // Stop all media tracks
          mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
          
          // Convert audio chunks to base64 for reliable transfer
          console.log('Total audio chunks:', audioChunksRef.current.length);
          if (audioChunksRef.current.length > 0) {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
            console.log('Audio blob created, size:', audioBlob.size);
            
            if (audioBlob.size > 0) {
              // Convert blob to base64
              const reader = new FileReader();
              audioBase64 = await new Promise<string>((resolve) => {
                reader.onloadend = () => {
                  const result = reader.result as string;
                  resolve(result);
                };
                reader.readAsDataURL(audioBlob);
              });
              console.log('Audio converted to base64, length:', audioBase64.length);
            }
          }
        } catch (e) {
          console.log('MediaRecorder stop error:', e);
        }
      }

      // Encode base64 for URL safety
      let encodedAudioBase64 = '';
      if (audioBase64 && audioBase64.length > 0) {
        try {
          encodedAudioBase64 = encodeURIComponent(audioBase64);
          console.log('Encoded audio base64 length:', encodedAudioBase64.length);
        } catch (e) {
          console.error('Failed to encode audio base64:', e);
        }
      }

      router.replace({
        pathname: '/note-generating',
        params: {
          audioUri: uri || '',
          fileName: `Voice Recording ${new Date().toLocaleDateString()}`,
          language: 'Auto detect',
          duration: recordingDuration,
          webTranscript: webTranscript,
          sourceType: 'recording',
          audioBase64: encodedAudioBase64,
        },
      });
      
    } catch (error) {
      console.error('Stop recording error:', error);
      setIsProcessing(false);
      router.back();
    }
  };

  const handlePauseResume = async () => {
    try {
      if (!recordingRef.current) return;

      if (isPaused) {
        await recordingRef.current.startAsync();
        setIsPaused(false);
        // Resume speech recognition
        if (Platform.OS === 'web') {
          startSpeechRecognition();
        }
      } else {
        await recordingRef.current.pauseAsync();
        setIsPaused(true);
        // Pause speech recognition
        stopSpeechRecognition();
      }
    } catch (error) {
      console.error('Pause/Resume error:', error);
    }
  };

  const generateWaveform = () => {
    const bars = [];
    const totalBars = 50;
    const recordedBars = Math.floor((waveformData.length / totalBars) * totalBars);
    
    for (let i = 0; i < totalBars; i++) {
      const height = i < waveformData.length ? waveformData[i] : Math.random() * 30 + 10;
      const isRecorded = i < recordedBars;
      bars.push({ height, isRecorded });
    }
    return bars;
  };

  const waveform = generateWaveform();

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.recordingIndicator}>
        <Animated.View
          style={[
            styles.recordingDot,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
        <Text style={styles.recordingText}>
          {isProcessing ? 'Processing...' : isPaused ? 'Paused' : 'Recording'}
        </Text>
      </View>

      <View style={styles.waveformContainer}>
        <View style={styles.waveformBars}>
          {waveform.map((bar, index) => (
            <View
              key={index}
              style={[
                styles.waveformBar,
                {
                  height: bar.height,
                  backgroundColor: bar.isRecorded ? "#EF4444" : "#FFFFFF",
                },
              ]}
            />
          ))}
        </View>
        <View style={styles.playhead} />
      </View>

      <View style={styles.feynmanBadge}>
        <Text style={styles.raccoonIcon}>🦝</Text>
        <Text style={styles.feynmanText}>Feynman AI</Text>
      </View>

      {Platform.OS === 'web' && (
        <View style={styles.transcriptionContainer}>
          <View style={styles.transcriptionHeader}>
            <Text style={styles.transcriptionTitle}>Live Transcription</Text>
            {isTranscribing && (
              <View style={styles.transcribingBadge}>
                <View style={styles.transcribingDot} />
                <Text style={styles.transcribingText}>Listening...</Text>
              </View>
            )}
          </View>
          <ScrollView style={styles.transcriptionScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.transcriptionText}>
              {transcription || (isTranscribing ? "Start speaking..." : "Transcription will appear here")}
              {interimTranscriptRef.current && (
                <Text style={styles.interimText}> {interimTranscriptRef.current}</Text>
              )}
            </Text>
          </ScrollView>
        </View>
      )}

      <View style={styles.spacer} />

      <View style={styles.languageSection}>
        <View style={styles.languageLabelRow}>
          <Text style={styles.robotEmoji}>🤖</Text>
          <Text style={styles.languageLabel}>Note Language</Text>
        </View>

        <TouchableOpacity style={styles.languageDropdown}>
          <Text style={styles.robotEmojiSmall}>🤖</Text>
          <Text style={styles.languageValue}>Auto Detect</Text>
          <ChevronDown size={20} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      <Text style={styles.timer}>{formatTime(recordingTime)}</Text>

      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={[styles.controlButton, isProcessing && styles.disabledButton]} 
          onPress={handleCancel}
          disabled={isProcessing}
        >
          <View style={[styles.secondaryButton, isProcessing && styles.disabledSecondaryButton]}>
            <X size={28} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.controlLabel}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.controlButton, isProcessing && styles.disabledButton]} 
          onPress={handleStop}
          disabled={isProcessing}
        >
          <View style={[styles.stopButton, isProcessing && styles.processingButton]}>
            <View style={styles.stopIcon} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.controlButton, isProcessing && styles.disabledButton]}
          onPress={handlePauseResume}
          disabled={isProcessing}
        >
          <View style={[styles.secondaryButton, isProcessing && styles.disabledSecondaryButton]}>
            {isPaused ? (
              <View style={styles.playIcon} />
            ) : (
              <View style={styles.pauseIcon}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            )}
          </View>
          <Text style={styles.controlLabel}>{isPaused ? "Resume" : "Pause"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    paddingTop: 20,
  },
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#EF4444",
    marginRight: 8,
  },
  recordingText: {
    fontSize: 18,
    fontWeight: "500" as const,
    color: "#1F2937",
  },
  waveformContainer: {
    marginHorizontal: 24,
    height: 120,
    backgroundColor: "#1F2937",
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    position: "relative",
    overflow: "hidden",
  },
  waveformBars: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  waveformBar: {
    width: 3,
    borderRadius: 2,
  },
  playhead: {
    position: "absolute",
    width: 2,
    height: 80,
    backgroundColor: "#EF4444",
    left: "50%",
  },
  feynmanBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      },
    }),
  },
  raccoonIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  feynmanText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#1F2937",
  },
  spacer: {
    flex: 1,
  },
  languageSection: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  languageLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  robotEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#1F2937",
  },
  languageDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  robotEmojiSmall: {
    fontSize: 18,
    marginRight: 8,
  },
  languageValue: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  timer: {
    fontSize: 48,
    fontWeight: "bold" as const,
    color: "#1F2937",
    textAlign: "center",
    marginVertical: 24,
    fontVariant: ["tabular-nums"],
  },
  controlsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 40,
    paddingBottom: 20,
    gap: 40,
  },
  controlButton: {
    alignItems: "center",
  },
  secondaryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#4B5563",
    justifyContent: "center",
    alignItems: "center",
  },
  stopButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
  },
  stopIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#FFFFFF",
  },
  pauseIcon: {
    flexDirection: "row",
    gap: 4,
  },
  pauseBar: {
    width: 4,
    height: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 2,
  },
  playIcon: {
    width: 0,
    height: 0,
    borderLeftWidth: 16,
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderLeftColor: "#FFFFFF",
    borderTopColor: "transparent",
    borderBottomColor: "transparent",
    marginLeft: 4,
  },
  controlLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  disabledSecondaryButton: {
    backgroundColor: "#9CA3AF",
  },
  processingButton: {
    backgroundColor: "#8B5CF6",
  },
  transcriptionContainer: {
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    maxHeight: 200,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
      },
    }),
  },
  transcriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  transcriptionTitle: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#6B7280",
  },
  transcribingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  transcribingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
    marginRight: 6,
  },
  transcribingText: {
    fontSize: 12,
    color: "#10B981",
    fontWeight: "500" as const,
  },
  transcriptionScroll: {
    maxHeight: 140,
  },
  transcriptionText: {
    fontSize: 14,
    color: "#1F2937",
    lineHeight: 20,
  },
  interimText: {
    color: "#9CA3AF",
    fontStyle: "italic" as const,
  },
});
