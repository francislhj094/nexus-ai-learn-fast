import Colors from "@/constants/colors";
import { useRouter } from "expo-router";
import { Sparkles, ArrowRight, FileText } from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExplanations } from "@/contexts/explanations";
import { generateText } from "@rork-ai/toolkit-sdk";
import { useMutation } from "@tanstack/react-query";
import { Image } from "expo-image";

const RACCOON_MASCOT = "https://r2-pub.rork.com/generated-images/97b402cd-3c09-435e-803e-c6c62955985a.png";

export default function StartLearningScreen() {
  const router = useRouter();
  const [topic, setTopic] = useState("");
  const [generatingStep, setGeneratingStep] = useState("");
  const { addExplanation } = useExplanations();

  const generateMutation = useMutation({
    mutationFn: async (topicText: string) => {
      setGeneratingStep("Analyzing topic...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGeneratingStep("Generating explanation...");
      const prompt = `Explain "${topicText}" in the simplest way possible, as if explaining to a 5-year-old child. Use simple words, short sentences, and friendly examples. Keep it conversational and easy to understand. Maximum 200 words.`;
      
      const content = await generateText({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      setGeneratingStep("Creating study notes...");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return content;
    },
    onSuccess: (content, topicText) => {
      setGeneratingStep("Saving to library...");
      const newExplanation = addExplanation(topicText, content);
      
      setTimeout(() => {
        setTopic("");
        router.push({
          pathname: "/explanation",
          params: { explanationId: newExplanation.id },
        });
      }, 500);
    },
    onError: (error) => {
      console.error("Generation error:", error);
      Alert.alert(
        "Error",
        "Failed to generate explanation. Please try again.",
        [
          {
            text: "OK",
            onPress: () => setTopic(""),
          },
        ]
      );
    },
  });

  const handleSubmitTopic = () => {
    const trimmedTopic = topic.trim();
    if (!trimmedTopic) {
      Alert.alert("Enter a Topic", "Please enter a topic you want to learn about.");
      return;
    }

    generateMutation.mutate(trimmedTopic);
  };

  const handleGoToLibrary = () => {
    router.push("/(tabs)/library");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowRight
            size={24}
            color={Colors.darkBrown}
            style={{ transform: [{ rotate: "180deg" }] }}
          />
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <View style={styles.topSection}>
            <View style={styles.mascotContainer}>
              <View style={styles.purpleBlobOuter}>
                <View style={styles.purpleBlobInner}>
                  <Image
                    source={RACCOON_MASCOT}
                    style={styles.mascotImage}
                    contentFit="contain"
                  />
                </View>
              </View>
            </View>

            <Text style={styles.title}>
              What topic do you{"\n"}want to explore{"\n"}today?
            </Text>
          </View>

          <View style={styles.bottomSection}>
            <TouchableOpacity
              style={styles.fromNotesContainer}
              onPress={handleGoToLibrary}
            >
              <Text style={styles.fromNotesText}>Or from your notes</Text>
              <ArrowRight size={18} color={Colors.orange} />
              <View style={styles.notesIconContainer}>
                <FileText size={22} color={Colors.gradientPurpleStart} />
              </View>
            </TouchableOpacity>

            <View style={styles.inputContainer}>
              <View style={styles.inputWrapper}>
                <Sparkles size={22} color={Colors.gradientPurpleStart} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter any topic"
                  placeholderTextColor={Colors.grayText}
                  value={topic}
                  onChangeText={setTopic}
                  onSubmitEditing={handleSubmitTopic}
                  returnKeyType="go"
                  autoCapitalize="sentences"
                />
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    topic.trim() && !generateMutation.isPending && styles.submitButtonActive,
                  ]}
                  onPress={handleSubmitTopic}
                  disabled={!topic.trim() || generateMutation.isPending}
                >
                  <ArrowRight
                    size={20}
                    color={topic.trim() && !generateMutation.isPending ? Colors.white : Colors.grayText}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <Modal
        visible={generateMutation.isPending}
        transparent={true}
        animationType="fade"
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.loadingIcon}>
              <ActivityIndicator size="large" color={Colors.gradientPurpleStart} />
            </View>
            <Text style={styles.modalTitle}>Generating Notes</Text>
            <Text style={styles.modalSubtitle}>{generatingStep}</Text>
            <View style={styles.progressDots}>
              <View style={[styles.dot, generatingStep.includes("Analyzing") && styles.dotActive]} />
              <View style={[styles.dot, generatingStep.includes("Generating") && styles.dotActive]} />
              <View style={[styles.dot, generatingStep.includes("Creating") && styles.dotActive]} />
              <View style={[styles.dot, generatingStep.includes("Saving") && styles.dotActive]} />
            </View>
            <Text style={styles.topicPreview}>&quot;{topic}&quot;</Text>
          </View>
        </View>
      </Modal>
    </View>
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
  backButton: {
    position: "absolute" as const,
    top: Platform.OS === "ios" ? 60 : 20,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  topSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  mascotContainer: {
    alignItems: "center",
    marginBottom: 32,
    position: "relative" as const,
  },
  purpleBlobOuter: {
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "#E0D4FC",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ scaleX: 1.05 }, { rotate: "-5deg" }],
  },
  purpleBlobInner: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "#C4B5FD",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "5deg" }],
    overflow: "hidden",
  },
  mascotImage: {
    width: 150,
    height: 150,
  },
  title: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: Colors.darkText,
    textAlign: "center",
    lineHeight: 38,
  },
  bottomSection: {
    paddingBottom: Platform.OS === "ios" ? 20 : 32,
  },
  fromNotesContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    gap: 8,
  },
  fromNotesText: {
    fontSize: 16,
    color: Colors.grayText,
  },
  notesIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  inputContainer: {
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.navInactive,
    borderRadius: 28,
    paddingHorizontal: 16,
    paddingVertical: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
      },
    }),
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.darkText,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  submitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
    justifyContent: "center",
    alignItems: "center",
  },
  submitButtonActive: {
    backgroundColor: Colors.gradientPurpleStart,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 32,
    width: "85%",
    maxWidth: 320,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 8px 16px rgba(0,0,0,0.2)",
      },
    }),
  },
  loadingIcon: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.darkText,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.grayText,
    marginBottom: 16,
  },
  progressDots: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.lightGray,
  },
  dotActive: {
    backgroundColor: Colors.gradientPurpleStart,
  },
  topicPreview: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.gradientPurpleStart,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
  },
});
