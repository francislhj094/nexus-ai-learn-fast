import { useRouter } from "expo-router";
import { X, ChevronDown } from "lucide-react-native";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Audio } from "expo-av";

export default function RecordAudioScreen() {
  const router = useRouter();
  const [isRecording, setIsRecording] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);
  
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    startRecording();
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  useEffect(() => {
    if (isRecording && !isPaused) {
      Animated.loop(
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
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, isPaused, pulseAnim]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
        const newHeight = Math.random() * 60 + 10;
        setWaveformData((prev) => [...prev.slice(-49), newHeight]);
      }, 100);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isRecording, isPaused]);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      
      setRecording(newRecording);
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleCancel = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
    }
    setIsRecording(false);
    router.back();
  };

  const handleStop = async () => {
    if (recording) {
      await recording.stopAndUnloadAsync();
      setIsRecording(false);
      router.back();
    }
  };

  const handlePauseResume = async () => {
    if (recording) {
      if (isPaused) {
        await recording.startAsync();
        setIsPaused(false);
      } else {
        await recording.pauseAsync();
        setIsPaused(true);
      }
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
        <Text style={styles.recordingText}>Recording</Text>
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
        <TouchableOpacity style={styles.controlButton} onPress={handleCancel}>
          <View style={styles.secondaryButton}>
            <X size={28} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.controlLabel}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.controlButton} onPress={handleStop}>
          <View style={styles.stopButton}>
            <View style={styles.stopIcon} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handlePauseResume}
        >
          <View style={styles.secondaryButton}>
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
});
