import { useRouter } from "expo-router";
import { ArrowLeft, Sparkles, FileText } from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useExplanations } from "@/contexts/explanations";
import { generateObject } from "@rork-ai/toolkit-sdk";
import { z } from "zod";


export default function CreateNotesScreen() {
  const router = useRouter();
  const { addExplanation } = useExplanations();
  const [customText, setCustomText] = useState("");
  const [showGeneratingModal, setShowGeneratingModal] = useState(false);
  const [analysisStep, setAnalysisStep] = useState("");

  const handleGenerateNotes = async () => {
    const trimmedText = customText.trim();
    
    if (!trimmedText) {
      Alert.alert("No Text", "Please enter some text to generate notes from.");
      return;
    }

    if (trimmedText.length < 20) {
      Alert.alert("Text Too Short", "Please enter at least 20 characters to generate meaningful notes.");
      return;
    }

    setShowGeneratingModal(true);
    setAnalysisStep("Analyzing your text...");

    try {
      console.log('Starting text analysis...');
      
      setAnalysisStep("Processing with AI...");
      
      const analysisSchema = z.object({
        category: z.enum(['nature', 'architecture', 'food', 'science', 'art', 'technology', 'history', 'math', 'language', 'general']).describe('The main category of the text content'),
        title: z.string().describe('A concise, descriptive title for the learning notes (max 50 chars)'),
        emoji: z.string().describe('A single emoji that represents the content'),
        summary: z.string().describe('A 2-3 sentence summary explaining the main topic and its educational value'),
        content: z.string().describe('Detailed educational content explaining the topic using the Feynman Technique. Include: The Big Picture, Breaking It Down Simply (explain like to a 5-year-old), Key Concepts (4-5 bullet points), Why This Matters, and a Study Tip. Use markdown formatting with **bold** for headers.'),
        keyPoints: z.array(z.string()).describe('5 key learning points from the text, each as a complete sentence'),
      });

      const result = await generateObject({
        messages: [
          {
            role: 'user',
            content: `Analyze the following text and create comprehensive educational notes using the Feynman Technique.

TEXT TO ANALYZE:
"${trimmedText}"

Provide:
1. A category that best fits the content
2. A concise title for the notes
3. An appropriate emoji
4. A brief summary (2-3 sentences)
5. Detailed educational content with sections: The Big Picture, Breaking It Down Simply (explain like to a 5-year-old), Key Concepts (4-5 bullet points), Why This Matters, and a Study Tip
6. 5 key learning points

Make the content engaging, educational, and easy to understand.`,
          },
        ],
        schema: analysisSchema,
      });

      console.log('AI analysis complete:', result);
      
      setAnalysisStep("Creating notes...");

      const noteDate = new Date();
      const formattedDate = noteDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      addExplanation(
        `${result.emoji} ${result.title} - ${formattedDate}`,
        result.content,
        {
          summary: result.summary,
          keyPoints: result.keyPoints,
          source: 'custom-text',
        }
      );

      setShowGeneratingModal(false);
      setAnalysisStep("");
      setCustomText("");

      router.push('/(tabs)/library');
    } catch (error) {
      console.error('Error generating notes:', error);
      setShowGeneratingModal(false);
      setAnalysisStep("");
      Alert.alert('Error', 'Failed to generate notes. Please try again.');
    }
  };

  const characterCount = customText.length;
  const isValidLength = characterCount >= 20;

  return (
    <View style={styles.container}>
      <Modal
        visible={showGeneratingModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={styles.modalTitle}>Generating Notes...</Text>
            <Text style={styles.modalSubtext}>{analysisStep || 'Processing your text'}</Text>
            <View style={styles.modalSteps}>
              <Text style={[styles.modalStep, analysisStep.includes('Analyzing') && styles.activeStep]}>📝 Analyzing text...</Text>
              <Text style={[styles.modalStep, analysisStep.includes('Processing') && styles.activeStep]}>🧠 AI processing content...</Text>
              <Text style={[styles.modalStep, analysisStep.includes('Creating') && styles.activeStep]}>✨ Creating notes...</Text>
            </View>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Custom Text</Text>
          <View style={styles.headerSpacer} />
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.infoCard}>
              <View style={styles.infoIconContainer}>
                <FileText size={24} color="#10B981" />
              </View>
              <View style={styles.infoTextContainer}>
                <Text style={styles.infoTitle}>Enter Your Text</Text>
                <Text style={styles.infoDescription}>
                  Paste or type any text you want to learn about. Our AI will create comprehensive notes using the Feynman Technique.
                </Text>
              </View>
            </View>

            <View style={styles.inputSection}>
              <View style={styles.inputLabelRow}>
                <Text style={styles.inputLabel}>Your Text</Text>
                <Text style={[
                  styles.characterCount,
                  isValidLength ? styles.characterCountValid : styles.characterCountInvalid
                ]}>
                  {characterCount} characters
                </Text>
              </View>
              
              <View style={styles.textInputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Paste or type your text here...&#10;&#10;For example: A scientific explanation, historical event, concept you want to understand better, study material, or any topic you'd like to learn about."
                  placeholderTextColor="#9CA3AF"
                  value={customText}
                  onChangeText={setCustomText}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                />
              </View>
              
              {!isValidLength && characterCount > 0 && (
                <Text style={styles.warningText}>
                  Please enter at least 20 characters for better results
                </Text>
              )}
            </View>

            <View style={styles.tipsSection}>
              <Text style={styles.tipsTitle}>💡 Tips for better notes:</Text>
              <View style={styles.tipsList}>
                <Text style={styles.tipItem}>• Include detailed explanations or definitions</Text>
                <Text style={styles.tipItem}>• Add context about why the topic matters</Text>
                <Text style={styles.tipItem}>• Include examples if available</Text>
                <Text style={styles.tipItem}>• The more detail, the better the notes!</Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.bottomBar}>
            <TouchableOpacity
              style={[
                styles.generateButton,
                !isValidLength && styles.buttonDisabled,
              ]}
              onPress={handleGenerateNotes}
              disabled={!isValidLength}
            >
              <Sparkles size={20} color="#FFFFFF" />
              <Text style={styles.generateButtonText}>Generate Notes</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 120,
  },
  infoCard: {
    flexDirection: "row",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  infoIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#D1FAE5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#065F46",
    marginBottom: 4,
  },
  infoDescription: {
    fontSize: 14,
    color: "#047857",
    lineHeight: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  characterCount: {
    fontSize: 13,
    fontWeight: "500",
  },
  characterCountValid: {
    color: "#10B981",
  },
  characterCountInvalid: {
    color: "#9CA3AF",
  },
  textInputContainer: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    minHeight: 200,
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
    fontSize: 15,
    color: "#1F2937",
    padding: 16,
    minHeight: 200,
    lineHeight: 22,
  },
  warningText: {
    fontSize: 13,
    color: "#F59E0B",
    marginTop: 8,
  },
  tipsSection: {
    backgroundColor: "#FEF3C7",
    borderRadius: 16,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#92400E",
    marginBottom: 8,
  },
  tipsList: {
    gap: 6,
  },
  tipItem: {
    fontSize: 14,
    color: "#B45309",
    lineHeight: 20,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === "ios" ? 32 : 16,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 -4px 12px rgba(0,0,0,0.08)",
      },
    }),
  },
  generateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10B981",
    borderRadius: 28,
    height: 56,
    gap: 10,
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  generateButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 32,
    alignItems: "center",
    marginHorizontal: 32,
    minWidth: 280,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 8px 16px rgba(0,0,0,0.3)",
      },
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 16,
  },
  modalSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  modalSteps: {
    marginTop: 20,
    gap: 8,
    alignItems: "flex-start",
  },
  modalStep: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  activeStep: {
    color: "#10B981",
    fontWeight: "600" as const,
  },
});
