import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Mic } from "lucide-react-native";
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
  const _router = useRouter();
  const params = useLocalSearchParams();
  const topic = typeof params.topic === "string" ? params.topic : "Topic";
  const characterName = typeof params.characterName === "string" ? params.characterName : "Tom";
  const characterAge = typeof params.characterAge === "string" ? params.characterAge : "5";
  
  const [understanding, _setUnderstanding] = useState(0);
  const [isRecording, setIsRecording] = useState(false);

  const characterImage = characterImages[characterName] || TOM_CHARACTER;
  const topicEmoji = getTopicEmoji(topic);

  const handleMicPress = () => {
    setIsRecording(!isRecording);
    console.log("Mic pressed, recording:", !isRecording);
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
                <View style={[styles.progressBarFill, { width: `${understanding}%` }]} />
              </View>
              <Text style={styles.emoji}>🧠</Text>
            </View>

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

            <Text style={styles.explainText}>
              Explain me the {topic} {topicEmoji}, like I&apos;m {characterAge} years old!
            </Text>

            <View style={styles.bottomSection}>
              <Text style={styles.pressToTalk}>Press to talk</Text>
              
              <TouchableOpacity
                style={[styles.micButton, isRecording && styles.micButtonRecording]}
                onPress={handleMicPress}
                activeOpacity={0.8}
              >
                <Mic size={32} color={isRecording ? Colors.white : "#4B5563"} />
              </TouchableOpacity>
            </View>
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
  characterSection: {
    alignItems: "center",
    marginBottom: 40,
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
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.darkText,
    textAlign: "center",
    lineHeight: 40,
    paddingHorizontal: 16,
  },
  bottomSection: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 40,
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
});
