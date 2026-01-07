import Colors from "@/constants/colors";
import { useExplanations } from "@/contexts/explanations";
import { generateText } from "@rork-ai/toolkit-sdk";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookmarkPlus,
  BookmarkCheck,
  RefreshCw,
  Share2,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExplanationScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ 
    topic?: string; 
    explanationId?: string;
    sourceImage?: string;
    source?: string;
    language?: string;
  }>();
  const { addExplanation, toggleSave, explanations } = useExplanations();
  const [currentExplanation, setCurrentExplanation] = useState<{
    id: string;
    topic: string;
    content: string;
    isSaved: boolean;
  } | null>(null);

  const generateMutation = useMutation({
    mutationFn: async (topic: string) => {
      let prompt: string;
      
      if (params.source === "capture" && params.sourceImage) {
        const languageInstruction = params.language && params.language !== "Auto Detect" 
          ? `Please provide the explanation in ${params.language}.`
          : "Please provide the explanation in the language that best fits the content.";
        
        prompt = `You are analyzing an image for educational purposes using the Feynman Technique. ${languageInstruction}

Provide a simple, clear explanation of what you observe in the image as if teaching a curious learner. Break down any concepts, text, diagrams, or educational content you can identify.

Keep your explanation:
- Simple and conversational
- Easy to understand
- Around 150-200 words
- Focused on key learning points

Format your response naturally as if you're a friendly teacher explaining what's in the image.`;
      } else {
        prompt = `Explain "${topic}" in the simplest way possible, as if explaining to a 5-year-old child. Use simple words, short sentences, and friendly examples. Keep it conversational and easy to understand. Maximum 200 words.`;
      }
      
      const content = await generateText({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      return content;
    },
    onSuccess: (content) => {
      if (params.topic) {
        const newExp = addExplanation(params.topic, content);
        setCurrentExplanation({
          id: newExp.id,
          topic: newExp.topic,
          content: newExp.content,
          isSaved: newExp.isSaved,
        });
      }
    },
  });

  useEffect(() => {
    if (params.explanationId) {
      const existing = explanations.find((e) => e.id === params.explanationId);
      if (existing) {
        setCurrentExplanation({
          id: existing.id,
          topic: existing.topic,
          content: existing.content,
          isSaved: existing.isSaved,
        });
      }
    } else if (params.topic && !generateMutation.isPending && !currentExplanation) {
      generateMutation.mutate(params.topic);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.topic, params.explanationId, explanations]);

  const handleToggleSave = () => {
    if (currentExplanation) {
      toggleSave(currentExplanation.id);
      setCurrentExplanation({
        ...currentExplanation,
        isSaved: !currentExplanation.isSaved,
      });
    }
  };

  const handleRegenerate = () => {
    if (params.topic) {
      setCurrentExplanation(null);
      generateMutation.mutate(params.topic);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <ArrowLeft size={24} color={Colors.darkBrown} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {currentExplanation?.topic || params.topic || "Explanation"}
          </Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleToggleSave}
              style={styles.iconButton}
              disabled={!currentExplanation}
            >
              {currentExplanation?.isSaved ? (
                <BookmarkCheck size={24} color={Colors.orange} />
              ) : (
                <BookmarkPlus size={24} color={Colors.darkBrown} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Share2 size={22} color={Colors.darkBrown} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.mascotContainer}>
            <Image
              source="https://r2-pub.rork.com/generated-images/21a2188b-28ec-4fab-9231-8adc2cd797f9.png"
              style={styles.mascotImage}
              contentFit="contain"
            />
          </View>

          <View style={styles.contentCard}>
            {generateMutation.isPending && !currentExplanation ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.orange} />
                <Text style={styles.loadingText}>
                  Preparing your explanation...
                </Text>
              </View>
            ) : generateMutation.isError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>
                  Oops! Something went wrong. Please try again.
                </Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={handleRegenerate}
                >
                  <RefreshCw size={20} color={Colors.white} />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>
            ) : currentExplanation ? (
              <>
                <Text style={styles.explanationText}>
                  {currentExplanation.content}
                </Text>

                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleRegenerate}
                  >
                    <RefreshCw size={20} color={Colors.orange} />
                    <Text style={styles.actionButtonText}>
                      Explain Differently
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.feedback}>
                  <Text style={styles.feedbackTitle}>Was this helpful?</Text>
                  <View style={styles.feedbackButtons}>
                    <TouchableOpacity style={styles.feedbackButton}>
                      <Text style={styles.feedbackEmoji}>👍</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.feedbackButton}>
                      <Text style={styles.feedbackEmoji}>👎</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.beige,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.darkText,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  mascotContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  mascotImage: {
    width: 100,
    height: 100,
  },
  contentCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: 24,
    minHeight: 300,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
      },
    }),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.grayText,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    minHeight: 300,
    gap: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.grayText,
    textAlign: "center",
    paddingHorizontal: 20,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.orange,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  retryButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
  explanationText: {
    fontSize: 17,
    lineHeight: 28,
    color: Colors.darkText,
    marginBottom: 24,
  },
  actions: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.lightCoral,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.orange,
  },
  feedback: {
    borderTopWidth: 1,
    borderTopColor: Colors.lightGray,
    paddingTop: 20,
    alignItems: "center",
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.darkText,
    marginBottom: 12,
  },
  feedbackButtons: {
    flexDirection: "row",
    gap: 16,
  },
  feedbackButton: {
    width: 56,
    height: 56,
    backgroundColor: Colors.cream,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  feedbackEmoji: {
    fontSize: 28,
  },
});
