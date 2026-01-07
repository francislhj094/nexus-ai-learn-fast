import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { ArrowLeft, ChevronRight } from "lucide-react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";


const RACCOON_MASCOT = "https://r2-pub.rork.com/generated-images/97b402cd-3c09-435e-803e-c6c62955985a.png";

interface SubTopic {
  title: string;
  emoji: string;
  description: string;
}

interface TopicCategory {
  categoryTitle: string;
  categoryEmoji: string;
  subtopics: SubTopic[];
}

interface GeneratedTopics {
  mainEmoji: string;
  categories: TopicCategory[];
}

const subtopicsSchema = z.object({
  mainEmoji: z.string().describe("A single emoji that best represents the main topic"),
  categories: z.array(z.object({
    categoryTitle: z.string().describe("Category name like 'Types of X' or 'X Behavior'"),
    categoryEmoji: z.string().describe("Two emojis for the category"),
    subtopics: z.array(z.object({
      title: z.string().describe("Subtopic title"),
      emoji: z.string().describe("One or two emojis for this subtopic"),
      description: z.string().describe("Brief 10-15 word description"),
    })).min(3).max(4),
  })).min(2).max(3),
});

export default function TopicPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const topic = typeof params.topic === "string" ? params.topic : "Topic";
  const [isLoading, setIsLoading] = useState(true);
  const [generatedTopics, setGeneratedTopics] = useState<GeneratedTopics | null>(null);

  useEffect(() => {
    const loadSubtopics = async () => {
      setIsLoading(true);
      try {
        const result = await generateObject({
          messages: [
            {
              role: "user",
              content: `Generate subtopics for learning about "${topic}". Create 2-3 categories with 3-4 subtopics each. Categories should be like "Types of ${topic}" and "${topic} Behavior" or similar educational groupings. Each subtopic needs a title, emoji(s), and brief description.`,
            },
          ],
          schema: subtopicsSchema,
        });
        
        setGeneratedTopics(result);
      } catch (error) {
        console.error("Error generating subtopics:", error);
        setGeneratedTopics({
          mainEmoji: "📚",
          categories: [
            {
              categoryTitle: `Types of ${topic}`,
              categoryEmoji: "🔍",
              subtopics: [
                { title: `Introduction to ${topic}`, emoji: "📖", description: `Basic overview and fundamentals of ${topic}` },
                { title: `${topic} Fundamentals`, emoji: "🎯", description: `Core concepts and key principles` },
                { title: `Advanced ${topic}`, emoji: "🚀", description: `In-depth exploration of complex topics` },
              ],
            },
            {
              categoryTitle: `${topic} Applications`,
              categoryEmoji: "💡",
              subtopics: [
                { title: "Real-world Examples", emoji: "🌍", description: `Practical applications in everyday life` },
                { title: "Case Studies", emoji: "📊", description: `Detailed analysis of specific examples` },
                { title: "Future Trends", emoji: "🔮", description: `What's next in this field` },
              ],
            },
          ],
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSubtopics();
  }, [topic]);

  const handleSelectSubtopic = (subtopicTitle: string) => {
    router.push({
      pathname: "/character-picker",
      params: { 
        topic: subtopicTitle,
        parentTopic: topic,
      },
    });
  };

  const handleSelectAllTopics = () => {
    router.push({
      pathname: "/character-picker",
      params: { 
        topic: topic,
        parentTopic: topic,
      },
    });
  };

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
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
          <ActivityIndicator size="large" color={Colors.gradientPurpleStart} style={{ marginTop: 24 }} />
          <Text style={styles.loadingText}>Generating topics...</Text>
          <Text style={styles.loadingSubtext}>Finding the best ways to learn about {topic}</Text>
        </View>
      </>
    );
  }

  const mainEmoji = generatedTopics?.mainEmoji || "📚";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top"]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.darkBrown} />
          </TouchableOpacity>

          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
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
              Yo, pick a topic in the {topic} {mainEmoji} zone to kick things off!
            </Text>

            <Text style={styles.sectionTitle}>{topic} {mainEmoji}</Text>

            <TouchableOpacity 
              style={styles.mainTopicCard}
              onPress={handleSelectAllTopics}
              activeOpacity={0.7}
            >
              <View style={styles.topicCardContent}>
                <Text style={styles.topicCardTitle}>{topic} {mainEmoji}</Text>
                <Text style={styles.topicCardDescription}>All topics in {topic} {mainEmoji}</Text>
              </View>
              <ChevronRight size={20} color={Colors.grayText} />
            </TouchableOpacity>

            {generatedTopics?.categories.map((category, categoryIndex) => (
              <View key={categoryIndex}>
                <Text style={styles.categoryTitle}>
                  {category.categoryTitle} {mainEmoji}{category.categoryEmoji}
                </Text>
                
                {category.subtopics.map((subtopic, subtopicIndex) => (
                  <TouchableOpacity
                    key={subtopicIndex}
                    style={styles.subtopicCard}
                    onPress={() => handleSelectSubtopic(subtopic.title)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.topicCardContent}>
                      <Text style={styles.subtopicTitle}>{subtopic.title} {subtopic.emoji}</Text>
                      <Text style={styles.subtopicDescription} numberOfLines={1}>
                        {subtopic.description}
                      </Text>
                    </View>
                    <ChevronRight size={20} color={Colors.grayText} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}

            <View style={{ height: 40 }} />
          </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.darkText,
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: Colors.grayText,
    marginTop: 8,
    textAlign: "center" as const,
  },
  backButton: {
    position: "absolute" as const,
    top: Platform.OS === "ios" ? 60 : 20,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "ios" ? 60 : 60,
  },
  mascotContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  purpleBlobOuter: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "#E0D4FC",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ scaleX: 1.05 }, { rotate: "-5deg" }],
  },
  purpleBlobInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#C4B5FD",
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "5deg" }],
    overflow: "hidden",
  },
  mascotImage: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 20,
    fontWeight: "700" as const,
    color: Colors.darkText,
    textAlign: "center" as const,
    marginBottom: 24,
    lineHeight: 28,
    fontFamily: Platform.OS === "ios" ? "System" : "monospace",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: Colors.darkText,
    textAlign: "center" as const,
    marginBottom: 12,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.darkText,
    textAlign: "center" as const,
    marginTop: 20,
    marginBottom: 12,
  },
  mainTopicCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      },
    }),
  },
  subtopicCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
      web: {
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      },
    }),
  },
  topicCardContent: {
    flex: 1,
  },
  topicCardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.darkText,
    marginBottom: 4,
  },
  topicCardDescription: {
    fontSize: 14,
    color: Colors.grayText,
  },
  subtopicTitle: {
    fontSize: 15,
    fontWeight: "600" as const,
    color: Colors.darkText,
    marginBottom: 4,
  },
  subtopicDescription: {
    fontSize: 13,
    color: Colors.grayText,
  },
});
