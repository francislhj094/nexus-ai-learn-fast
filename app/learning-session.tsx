import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, Stack, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Mic, Square, CheckCircle, ArrowRight } from "lucide-react-native";
import { Audio } from "expo-av";
import { generateText } from "@rork-ai/toolkit-sdk";
import Colors from "@/constants/colors";

const TOM_CHARACTER = "https://r2-pub.rork.com/generated-images/7f688633-6fbb-4e61-845c-f3f3d20e6992.png";
const LUCY_CHARACTER = "https://r2-pub.rork.com/generated-images/e59672f4-b433-470a-b7e7-d676694ee6a5.png";
const KENNY_CHARACTER = "https://r2-pub.rork.com/generated-images/192d5deb-7fca-4339-9c8b-f577bab09891.png";
const MIA_CHARACTER = "https://r2-pub.rork.com/generated-images/40431168-41b7-42a1-847a-6d5e6669c039.png";

const characterImages: Record<string, string> = {
  Tom: TOM_CHARACTER,
  Lucy: LUCY_CHARACTER,
  Kenny: KENNY_CHARACTER,
  Mia: MIA_CHARACTER,
};

const topicEmojis: Record<string, string> = {
  sharks: "🦈",
  animals: "🐾",
  space: "🚀",
  plants: "🌱",
  math: "🔢",
  science: "🔬",
  history: "📜",
  art: "🎨",
  music: "🎵",
  sports: "⚽",
};

function getTopicEmoji(topic: string): string {
  const lowerTopic = topic.toLowerCase();
  for (const [key, emoji] of Object.entries(topicEmojis)) {
    if (lowerTopic.includes(key)) {
      return emoji;
    }
  }
  return "📚";
}

export default function LearningSessionScreen() {
  const params = useLocalSearchParams();
  const topic = typeof params.topic === "string" ? params.topic : "Topic";
  const characterName = typeof params.characterName === "string" ? params.characterName : "Tom";
  const characterAge = typeof params.characterAge === "string" ? params.characterAge : "5";
  
  const [understanding, setUnderstanding] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [characterResponse, setCharacterResponse] = useState("");
  const [conversationHistory, setConversationHistory] = useState<{role: "user" | "assistant", content: string}[]>([]);
  const [sessionComplete, setSessionComplete] = useState(false);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const webMediaRecorderRef = useRef<MediaRecorder | null>(null);
  const webAudioChunksRef = useRef<Blob[]>([]);

  const characterImage = characterImages[characterName] || TOM_CHARACTER;
  const topicEmoji = getTopicEmoji(topic);
  const scrollViewRef = useRef<ScrollView>(null);

  const generateCharacterResponse = useCallback(async (userExplanation: string, currentUnderstanding: number) => {
    setIsGeneratingResponse(true);
    try {
      const systemPrompt = `You are ${characterName}, a curious ${characterAge}-year-old child. The user is teaching you about "${topic}". 
      
Your personality:
- Speak like a ${characterAge}-year-old would (simple words, curious questions)
- Be genuinely interested and excited to learn
- Ask follow-up questions about things you don't understand
- Use simple expressions like "Wow!", "Really?", "That's so cool!"

Current understanding level: ${currentUnderstanding}%

If understanding is below 50%: Ask basic clarifying questions, seem a bit confused but interested.
If understanding is 50-80%: Show you're getting it, ask deeper questions.
If understanding is above 80%: Show excitement that you understand, maybe summarize what you learned.
If understanding is 100%: Thank them enthusiastically and say you totally get it now!

Keep your response short (2-3 sentences max). Be encouraging and sweet.`;

      const response = await generateText({
        messages: [
          { role: "user", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content: userExplanation }
        ]
      });

      console.log("Character response:", response);
      setCharacterResponse(response);
      setConversationHistory(prev => [
        ...prev,
        { role: "user", content: userExplanation },
        { role: "assistant", content: response }
      ]);

      if (currentUnderstanding >= 100) {
        setSessionComplete(true);
      }
    } catch (err) {
      console.error("Failed to generate response:", err);
      setCharacterResponse("Hmm, I'm thinking... Can you tell me more?");
    } finally {
      setIsGeneratingResponse(false);
    }
  }, [characterName, characterAge, topic, conversationHistory]);

  useEffect(() => {
    if (isRecording) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isRecording, pulseAnim]);

  const startRecordingNative = useCallback(async () => {
    try {
      console.log("Requesting audio permissions...");
      const permission = await Audio.requestPermissionsAsync();
      
      if (permission.status !== "granted") {
        Alert.alert("Permission Denied", "Microphone permission is required to record audio.");
        return false;
      }

      console.log("Setting audio mode...");
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      console.log("Creating recording...");
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync({
        android: {
          extension: ".m4a",
          outputFormat: Audio.RecordingOptionsPresets.HIGH_QUALITY.android.outputFormat,
          audioEncoder: Audio.RecordingOptionsPresets.HIGH_QUALITY.android.audioEncoder,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: ".wav",
          outputFormat: Audio.RecordingOptionsPresets.HIGH_QUALITY.ios.outputFormat,
          audioQuality: Audio.RecordingOptionsPresets.HIGH_QUALITY.ios.audioQuality,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: "audio/webm",
          bitsPerSecond: 128000,
        },
      });
      
      await recording.startAsync();
      recordingRef.current = recording;
      console.log("Recording started successfully");
      return true;
    } catch (err) {
      console.error("Failed to start recording:", err);
      Alert.alert("Error", "Failed to start recording. Please try again.");
      return false;
    }
  }, []);

  const startRecordingWeb = useCallback(async () => {
    try {
      console.log("Starting web recording...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm",
      });
      
      webAudioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          webAudioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.start(100);
      webMediaRecorderRef.current = mediaRecorder;
      console.log("Web recording started successfully");
      return true;
    } catch (err) {
      console.error("Failed to start web recording:", err);
      Alert.alert("Error", "Failed to access microphone. Please allow microphone access.");
      return false;
    }
  }, []);

  const stopRecordingNative = useCallback(async (): Promise<Blob | null> => {
    try {
      if (!recordingRef.current) return null;

      console.log("Stopping native recording...");
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (!uri) return null;

      console.log("Recording saved at:", uri);
      
      const uriParts = uri.split(".");
      const fileType = uriParts[uriParts.length - 1];
      
      return {
        uri,
        name: `recording.${fileType}`,
        type: `audio/${fileType}`,
      } as unknown as Blob;
    } catch (err) {
      console.error("Failed to stop recording:", err);
      return null;
    }
  }, []);

  const stopRecordingWeb = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!webMediaRecorderRef.current) {
        resolve(null);
        return;
      }

      console.log("Stopping web recording...");
      const mediaRecorder = webMediaRecorderRef.current;
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(webAudioChunksRef.current, { type: "audio/webm" });
        webAudioChunksRef.current = [];
        
        mediaRecorder.stream.getTracks().forEach((track) => track.stop());
        webMediaRecorderRef.current = null;
        
        console.log("Web recording stopped, blob size:", audioBlob.size);
        resolve(audioBlob);
      };
      
      mediaRecorder.stop();
    });
  }, []);

  const transcribeAudio = useCallback(async (audioData: Blob | { uri: string; name: string; type: string }) => {
    try {
      console.log("Transcribing audio...");
      const formData = new FormData();
      
      if (Platform.OS === "web") {
        const file = new File([audioData as Blob], "recording.webm", { type: "audio/webm" });
        formData.append("audio", file);
      } else {
        formData.append("audio", audioData as unknown as Blob);
      }

      const response = await fetch("https://toolkit.rork.com/stt/transcribe/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const result = await response.json();
      console.log("Transcription result:", result);
      return result.text || "";
    } catch (err) {
      console.error("Transcription error:", err);
      return "";
    }
  }, []);

  const handleMicPress = async () => {
    if (isProcessing) return;

    if (isRecording) {
      setIsProcessing(true);
      console.log("Stopping recording...");
      
      try {
        let audioData: Blob | null = null;
        
        if (Platform.OS === "web") {
          audioData = await stopRecordingWeb();
        } else {
          audioData = await stopRecordingNative();
        }
        
        setIsRecording(false);
        
        if (audioData) {
          const text = await transcribeAudio(audioData);
          if (text && text.trim().length > 0) {
            setTranscription(text);
            const newUnderstanding = Math.min(understanding + 25, 100);
            setUnderstanding(newUnderstanding);
            console.log("Transcription:", text);
            console.log("Understanding increased to:", newUnderstanding);
            
            await generateCharacterResponse(text, newUnderstanding);
          } else {
            console.log("Transcription was empty");
            Alert.alert(
              "Couldn't hear you",
              "I didn't catch that. Please try speaking again, a bit louder and clearer.",
              [{ text: "OK" }]
            );
          }
        } else {
          console.log("No audio data received");
          Alert.alert(
            "Recording Error",
            "Something went wrong with the recording. Please try again.",
            [{ text: "OK" }]
          );
        }
      } catch (err) {
        console.error("Error stopping recording:", err);
      } finally {
        setIsProcessing(false);
      }
    } else {
      console.log("Starting recording...");
      let success = false;
      
      if (Platform.OS === "web") {
        success = await startRecordingWeb();
      } else {
        success = await startRecordingNative();
      }
      
      if (success) {
        setIsRecording(true);
      }
    }
  };

  const handleFinishSession = () => {
    router.replace("/");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
          <View style={styles.content}>
            <Text style={styles.understandingTitle}>Understanding: {understanding}%</Text>
            
            <View style={styles.progressContainer}>
              <Text style={styles.emoji}>🤔</Text>
              <View style={styles.progressBarBackground}>
                <Animated.View style={[styles.progressBarFill, { width: `${understanding}%` }]} />
              </View>
              <Text style={styles.emoji}>🧠</Text>
            </View>

            <ScrollView 
              ref={scrollViewRef}
              style={styles.chatArea}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            >
              <View style={styles.characterSection}>
                <View style={styles.purpleBlobOuter}>
                  <View style={styles.purpleBlobInner}>
                    <Image
                      source={characterImage}
                      style={styles.characterImage}
                      contentFit="contain"
                    />
                  </View>
                </View>
              </View>

              {!characterResponse && !sessionComplete && (
                <Text style={styles.explainText}>
                  Explain me the {topic} {topicEmoji}, like I{"'"}m {characterAge} years old!
                </Text>
              )}

              {transcription && (
                <View style={styles.userBubble}>
                  <Text style={styles.userBubbleText}>{transcription}</Text>
                </View>
              )}

              {isGeneratingResponse && (
                <View style={styles.typingIndicator}>
                  <ActivityIndicator size="small" color="#8B5CF6" />
                  <Text style={styles.typingText}>{characterName} is thinking...</Text>
                </View>
              )}

              {characterResponse && !isGeneratingResponse && (
                <View style={styles.characterBubble}>
                  <View style={styles.characterBubbleAvatar}>
                    <Image
                      source={characterImage}
                      style={styles.bubbleAvatar}
                      contentFit="contain"
                    />
                  </View>
                  <View style={styles.characterBubbleContent}>
                    <Text style={styles.characterBubbleText}>{characterResponse}</Text>
                  </View>
                </View>
              )}

              {sessionComplete && (
                <View style={styles.completionSection}>
                  <View style={styles.completionBadge}>
                    <CheckCircle size={48} color="#10B981" />
                  </View>
                  <Text style={styles.completionTitle}>Great Job! 🎉</Text>
                  <Text style={styles.completionSubtitle}>
                    You successfully explained {topic} to {characterName}!
                  </Text>
                  <TouchableOpacity
                    style={styles.finishButton}
                    onPress={handleFinishSession}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.finishButtonText}>Finish Session</Text>
                    <ArrowRight size={20} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>

            {!sessionComplete && (
              <View style={styles.bottomSection}>
                <Text style={styles.pressToTalk}>
                  {isProcessing ? "Processing..." : isGeneratingResponse ? `${characterName} is responding...` : isRecording ? "Tap to stop" : "Press to talk"}
                </Text>
                
                <Animated.View style={{ transform: [{ scale: isRecording ? pulseAnim : 1 }] }}>
                  <TouchableOpacity
                    style={[
                      styles.micButton, 
                      isRecording && styles.micButtonRecording,
                      (isProcessing || isGeneratingResponse) && styles.micButtonProcessing,
                    ]}
                    onPress={handleMicPress}
                    activeOpacity={0.8}
                    disabled={isProcessing || isGeneratingResponse}
                  >
                    {isRecording ? (
                      <Square size={28} color={Colors.white} fill={Colors.white} />
                    ) : (
                      <Mic size={32} color={(isProcessing || isGeneratingResponse) ? Colors.white : "#4B5563"} />
                    )}
                  </TouchableOpacity>
                </Animated.View>
              </View>
            )}
          </View>
        </SafeAreaView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  understandingTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.darkText,
    marginTop: 20,
    marginBottom: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    gap: 12,
    marginBottom: 40,
  },
  emoji: {
    fontSize: 28,
  },
  progressBarBackground: {
    flex: 1,
    height: 12,
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 6,
  },
  chatArea: {
    flex: 1,
    width: "100%",
  },
  chatContent: {
    paddingBottom: 20,
  },
  characterSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  purpleBlobOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#E0D4FC",
    justifyContent: "center",
    alignItems: "center",
  },
  purpleBlobInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#C4B5FD",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  characterImage: {
    width: 150,
    height: 150,
  },
  explainText: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.darkText,
    textAlign: "center",
    lineHeight: 34,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#8B5CF6",
    borderRadius: 20,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: "80%",
    marginBottom: 16,
  },
  userBubbleText: {
    fontSize: 15,
    color: Colors.white,
    lineHeight: 22,
  },
  characterBubble: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 16,
    maxWidth: "85%",
  },
  characterBubbleAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0D4FC",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    overflow: "hidden",
  },
  bubbleAvatar: {
    width: 30,
    height: 30,
  },
  characterBubbleContent: {
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
  },
  characterBubbleText: {
    fontSize: 15,
    color: Colors.darkText,
    lineHeight: 22,
  },
  typingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    marginBottom: 16,
  },
  typingText: {
    fontSize: 14,
    color: Colors.grayText,
    fontStyle: "italic" as const,
  },
  completionSection: {
    alignItems: "center",
    paddingVertical: 32,
  },
  completionBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  completionTitle: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.darkText,
    marginBottom: 8,
  },
  completionSubtitle: {
    fontSize: 16,
    color: Colors.grayText,
    textAlign: "center",
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  finishButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 8,
  },
  finishButtonText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.white,
  },
  bottomSection: {
    alignItems: "center",
    paddingBottom: 24,
    paddingTop: 12,
  },
  pressToTalk: {
    fontSize: 16,
    color: Colors.grayText,
    marginBottom: 16,
  },
  micButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      },
    }),
  },
  micButtonRecording: {
    backgroundColor: "#EF4444",
  },
  micButtonProcessing: {
    backgroundColor: "#8B5CF6",
  },

});
