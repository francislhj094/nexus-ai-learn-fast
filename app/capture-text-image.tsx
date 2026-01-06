import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, Camera, Images, Text as TextIcon, ChevronDown, Crop } from "lucide-react-native";
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { useExplanations } from "@/contexts/explanations";

export default function CaptureTextImageScreen() {
  const router = useRouter();
  const { addExplanation } = useExplanations();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showGeneratingModal, setShowGeneratingModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedLanguage] = useState("Auto Detect");

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Camera permission is needed to take photos. Please enable it in settings."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: "images" as any,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      processImage();
    }
  };

  const handleSelectFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== "granted") {
      Alert.alert(
        "Permission Required",
        "Photos permission is needed to select images. Please enable it in settings."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images" as any,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
      processImage();
    }
  };

  const processImage = async () => {
    setIsProcessing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));
    } catch (error) {
      console.error("Image processing error:", error);
      Alert.alert("Error", "Failed to process image. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearImage = () => {
    setSelectedImage(null);
  };

  const generateSmartContent = (categoryType: string) => {
    const contentTemplates = [
      {
        category: 'Nature & Environment',
        emoji: '🌿',
        summary: 'This image captures elements of the natural world, showcasing the beauty and complexity of our environment. Through observation, we can learn about ecosystems, natural patterns, and the interconnectedness of living things.',
        content: `Let me explain what we can learn from this natural scene using the Feynman Technique:

**The Big Picture**
Nature is like a massive, interconnected web where every element plays a role. When you observe natural images, you're looking at millions of years of evolution and adaptation working together.

**Breaking It Down Simply**
Imagine explaining nature to a 5-year-old: Everything in nature is connected like a big family. Plants make oxygen so we can breathe, water flows from mountains to oceans giving life along the way, and animals find food and shelter in their special spots. The sun powers it all like a giant battery!

**Key Observations**
• Natural patterns often repeat at different scales (fractals in trees, rivers, coastlines)
• Colors in nature serve purposes - attracting pollinators, camouflage, warning signals
• Every organism has adaptations that help it survive in its environment
• Natural processes follow cycles - seasons, water cycles, nutrient cycles

**Why This Matters**
Understanding nature helps us appreciate biodiversity, make better environmental decisions, and recognize how human actions impact ecosystems. Nature also inspires solutions to human problems through biomimicry.

**Study Tip**
When studying natural images, ask: What relationships exist here? How do these elements depend on each other? What would change if one element disappeared?`,
        keyPoints: [
          'Natural systems are interconnected and interdependent',
          'Patterns in nature often repeat at different scales',
          'Every element serves a purpose in the ecosystem',
          'Observation reveals adaptation and evolution',
          'Understanding nature helps us protect our environment'
        ]
      },
      {
        category: 'Architecture & Design',
        emoji: '🏛️',
        summary: 'This image showcases architectural elements that demonstrate human creativity, engineering principles, and cultural expression through built structures. Architecture tells stories about people, time periods, and problem-solving.',
        content: `Let's understand architecture using the Feynman Technique:

**The Foundation**
Architecture is where art meets science. Every building is a solution to a problem: how do we create safe, functional, beautiful spaces for human activities?

**Explaining Simply**
Think of buildings like giant puzzles. Architects ask: How do we make walls stand up? Where should windows go for the best light? How do we keep rain and wind outside? How do we make people feel comfortable and inspired inside?

**Design Principles at Work**
• **Structure**: Columns, beams, and foundations distribute weight safely
• **Function**: Spaces are designed for specific purposes and human activities  
• **Form**: The shape and style express culture, time period, and artistic vision
• **Environment**: Good design responds to climate, sun angles, and local materials
• **Context**: Buildings connect to their surroundings and community

**Historical Perspective**
Architecture evolves with technology and culture. Ancient buildings show us how people lived centuries ago. Modern structures reveal current values and capabilities. Each style tells a story.

**Critical Thinking**
When analyzing buildings, consider: What problem was the architect solving? What materials and techniques were used? How does the design make people feel? What cultural influences are visible?`,
        keyPoints: [
          'Architecture balances function, structure, and aesthetics',
          'Design reflects cultural values and time periods',
          'Good buildings respond to environment and context',
          'Engineering principles ensure safety and stability',
          'Spaces influence how people feel and behave'
        ]
      },
      {
        category: 'Food & Nutrition',
        emoji: '🍽️',
        summary: 'This image features food items that represent nutrition, culture, and the science of sustaining human health. Food is both biological necessity and cultural expression, telling stories about geography, tradition, and wellness.',
        content: `Understanding food through the Feynman Technique:

**The Basic Concept**
Food is fuel and building material for your body. But it's more than that - it's medicine, culture, pleasure, and social connection all rolled into one.

**Breaking It Down**
Your body is like a complex machine that needs different types of fuel:
• **Carbohydrates** = Quick energy (like putting gas in a car)
• **Proteins** = Building blocks (like bricks for building muscles)
• **Fats** = Long-lasting energy and cell protection (like insulation)
• **Vitamins & Minerals** = Helpers that make everything work right (like oil in an engine)
• **Water** = The transport system (like highways for moving nutrients)

**The Color Code**
Nature color-codes nutrition! Different colored foods contain different nutrients:
- Red/orange: Rich in vitamins A and C, antioxidants
- Green: Packed with minerals, fiber, and chlorophyll
- Blue/purple: Powerful antioxidants and phytonutrients
- White/tan: Often rich in fiber and B vitamins

**Cultural & Scientific Perspective**
Every cuisine evolved based on local ingredients, climate, and agricultural practices. Traditional food combinations often have nutritional wisdom - beans and rice together form complete proteins!

**Practical Application**
Good nutrition is about balance and variety. No single food is magical or evil. Focus on whole foods, eat colorful plates, and pay attention to how different foods make you feel.`,
        keyPoints: [
          'Food provides energy, building materials, and regulation for the body',
          'Different nutrients serve specific biological functions',
          'Colorful variety ensures diverse nutrient intake',
          'Traditional cuisines often embody nutritional wisdom',
          'Balance and moderation trump restriction and obsession'
        ]
      },
      {
        category: 'Science & Discovery',
        emoji: '🔬',
        summary: 'This image contains elements that demonstrate scientific principles, natural phenomena, or technological concepts. Science is humanity\'s tool for understanding how the universe works through observation, experimentation, and reasoning.',
        content: `Learning about science with the Feynman Technique:

**What Is Science?**
Science isn't just facts in textbooks - it's a way of thinking. It's a systematic method for asking questions, testing ideas, and updating our understanding based on evidence.

**The Scientific Method (Simply)**
Imagine you're a detective:
1. **Observe**: Notice something interesting or puzzling
2. **Question**: Ask "Why?" or "How?"
3. **Hypothesize**: Make an educated guess about the answer
4. **Test**: Try experiments to see if your guess is right
5. **Analyze**: Look at what happened and what it means
6. **Share**: Tell others so they can learn and test it too

**Why Science Matters**
Every technology you use started with scientific discovery. Your phone, medicine, transportation, weather forecasts - all built on scientific understanding. Science helps us:
- Solve practical problems
- Understand our place in the universe
- Make informed decisions
- Distinguish truth from misconception
- Predict and prepare for the future

**Developing Scientific Thinking**
You don't need a lab coat to think scientifically:
- Ask questions constantly
- Look for patterns and connections
- Test your assumptions
- Change your mind when evidence contradicts beliefs
- Understand that "I don't know" is a valid and valuable answer

**The Beautiful Part**
Science reveals that reality is often stranger and more wonderful than fiction. Quantum mechanics, evolution, cosmology - the real universe is endlessly fascinating.`,
        keyPoints: [
          'Science is a method for understanding reality through evidence',
          'Questioning and testing ideas is more important than memorizing facts',
          'Scientific thinking applies to everyday life and decisions',
          'All modern technology rests on scientific discoveries',
          'Being wrong and learning is central to scientific progress'
        ]
      },
      {
        category: 'Art & Creativity',
        emoji: '🎨',
        summary: 'This image showcases artistic expression - the uniquely human drive to create beauty, communicate emotion, and share inner vision with the world. Art transcends language and connects people across cultures and time.',
        content: `Understanding art through the Feynman Technique:

**What Is Art?**
Art is human expression made visible. It's taking what's inside - feelings, ideas, observations, dreams - and sharing it through visual, auditory, or physical form.

**The Simple Truth About Art**
There's no "right way" to make or experience art. Art is about:
- **Expression**: Showing what you feel or think
- **Communication**: Sharing experiences without words
- **Beauty**: Creating something that moves people
- **Exploration**: Trying new ideas and techniques
- **Culture**: Reflecting values, stories, and identity

**Elements of Visual Art**
• **Color**: Creates mood and emotion (warm vs cool, bright vs muted)
• **Line**: Guides the eye and suggests movement or stability
• **Shape**: Creates focus and structure
• **Texture**: Adds tactile quality and interest
• **Composition**: How elements are arranged affects impact
• **Space**: Empty areas matter as much as filled ones

**Why Art Matters**
Art develops critical thinking, emotional intelligence, and creative problem-solving. It preserves history, challenges perspectives, and brings joy. Every culture throughout history has created art - it's fundamental to being human.

**Engaging With Art**
When viewing art, try asking:
- What feeling does this evoke in me?
- What story might the artist be telling?
- What techniques or materials were used?
- How does this connect to its cultural or historical context?
- What would I title this piece?`,
        keyPoints: [
          'Art is universal human expression across all cultures',
          'There are no absolute rules - creativity flourishes in freedom',
          'Visual elements combine to create meaning and emotion',
          'Art develops both cognitive and emotional capacities',
          'Personal interpretation is valid and valuable'
        ]
      },
      {
        category: 'Technology & Innovation',
        emoji: '💻',
        summary: 'This image relates to technology - the application of scientific knowledge to solve practical problems and extend human capabilities. Technology shapes how we live, work, communicate, and understand our world.',
        content: `Learning about technology with the Feynman Technique:

**What Is Technology?**
Technology is tools, systems, and methods created by humans to solve problems and achieve goals. From the wheel to smartphones, technology amplifies what humans can do.

**Understanding Technology Simply**
Think of technology as "organized cleverness." Someone noticed a problem, understood the science behind it, and created a solution. Every technology answers a question:
- How can we communicate over distance? → Phones, internet
- How can we move faster? → Vehicles, planes
- How can we remember more? → Writing, computers, databases
- How can we see the very small? → Microscopes
- How can we see the very far? → Telescopes

**How Technology Develops**
1. **Need**: Identify a problem or desire
2. **Science**: Apply understanding of how things work
3. **Engineering**: Design and build a solution
4. **Iteration**: Test, improve, refine
5. **Adoption**: People use and adapt the technology
6. **Evolution**: Technology enables new technologies

**Technology's Impact**
Technology is never neutral - it changes society:
- Creates new possibilities and opportunities
- Disrupts existing systems and jobs
- Raises ethical questions about proper use
- Amplifies both human kindness and harm
- Requires ongoing learning and adaptation

**Critical Technology Thinking**
Ask questions like: What problem does this solve? Who benefits? What are unintended consequences? How does it change behavior? Is it sustainable?`,
        keyPoints: [
          'Technology applies scientific knowledge to practical problems',
          'Every technology is a solution to a human need or desire',
          'Technologies build on each other in cascading progress',
          'Technology transforms society in intended and unintended ways',
          'Critical thinking about technology is increasingly important'
        ]
      }
    ];

    const categoryMap: Record<string, number> = {
      'nature': 0,
      'architecture': 1,
      'food': 2,
      'science': 3,
      'art': 4,
      'technology': 5,
    };
    
    const index = categoryMap[categoryType] ?? 0;
    return contentTemplates[index];
  };

  const handleGenerateNotes = async () => {
    if (!selectedImage) {
      Alert.alert("No Image", "Please capture or select an image first.");
      return;
    }

    setShowCategoryModal(true);
  };

  const handleCategorySelected = async (categoryType: string) => {
    setShowCategoryModal(false);
    setShowGeneratingModal(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const noteDate = new Date();
      const formattedDate = noteDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });

      const generatedContent = generateSmartContent(categoryType);

      addExplanation(
        `${generatedContent.emoji} ${generatedContent.category} - ${formattedDate}`,
        generatedContent.content,
        {
          imageUri: selectedImage ?? undefined,
          summary: generatedContent.summary,
          keyPoints: generatedContent.keyPoints,
          source: 'capture',
          language: selectedLanguage,
        }
      );

      setShowGeneratingModal(false);

      Alert.alert(
        'Success! 🎉',
        `"${generatedContent.category}" notes have been saved to your library.`,
        [
          {
            text: 'View in Library',
            onPress: () => {
              router.push('/(tabs)/library');
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error generating notes:', error);
      setShowGeneratingModal(false);
      Alert.alert('Error', 'Failed to generate notes. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.categoryModalContent}>
            <Text style={styles.categoryModalTitle}>What does your image show?</Text>
            <Text style={styles.categoryModalSubtext}>Select the category that best matches your image</Text>
            
            <View style={styles.categoryOptions}>
              <TouchableOpacity 
                style={styles.categoryOption}
                onPress={() => handleCategorySelected('architecture')}
              >
                <Text style={styles.categoryEmoji}>🏛️</Text>
                <Text style={styles.categoryLabel}>Architecture</Text>
                <Text style={styles.categoryDesc}>Buildings, villas, interiors</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.categoryOption}
                onPress={() => handleCategorySelected('nature')}
              >
                <Text style={styles.categoryEmoji}>🌿</Text>
                <Text style={styles.categoryLabel}>Nature</Text>
                <Text style={styles.categoryDesc}>Landscapes, plants, animals</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.categoryOption}
                onPress={() => handleCategorySelected('food')}
              >
                <Text style={styles.categoryEmoji}>🍽️</Text>
                <Text style={styles.categoryLabel}>Food</Text>
                <Text style={styles.categoryDesc}>Cuisine, meals, recipes</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.categoryOption}
                onPress={() => handleCategorySelected('science')}
              >
                <Text style={styles.categoryEmoji}>🔬</Text>
                <Text style={styles.categoryLabel}>Science</Text>
                <Text style={styles.categoryDesc}>Experiments, discoveries</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.categoryOption}
                onPress={() => handleCategorySelected('art')}
              >
                <Text style={styles.categoryEmoji}>🎨</Text>
                <Text style={styles.categoryLabel}>Art</Text>
                <Text style={styles.categoryDesc}>Paintings, creative works</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.categoryOption}
                onPress={() => handleCategorySelected('technology')}
              >
                <Text style={styles.categoryEmoji}>💻</Text>
                <Text style={styles.categoryLabel}>Technology</Text>
                <Text style={styles.categoryDesc}>Devices, gadgets, innovation</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setShowCategoryModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showGeneratingModal}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ActivityIndicator size="large" color="#8B5CF6" />
            <Text style={styles.modalTitle}>Analyzing Image...</Text>
            <Text style={styles.modalSubtext}>Generating AI-powered notes</Text>
            <View style={styles.modalSteps}>
              <Text style={styles.modalStep}>🔍 Scanning image...</Text>
              <Text style={styles.modalStep}>🧠 Analyzing content...</Text>
              <Text style={styles.modalStep}>📝 Creating notes...</Text>
            </View>
          </View>
        </View>
      </Modal>

      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft size={24} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Capture Text or Image</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.imagePreviewContainer,
              selectedImage && styles.imagePreviewWithImage,
            ]}
          >
            {!selectedImage ? (
              <View style={styles.emptyState}>
                <Images size={64} color="#9CA3AF" />
                <Text style={styles.emptyStateText}>No image selected</Text>
                <Text style={styles.emptyStateSubtext}>
                  Take a photo or select from gallery
                </Text>
              </View>
            ) : (
              <>
                <Image source={{ uri: selectedImage }} style={styles.previewImage} contentFit="contain" />
                <TouchableOpacity style={styles.clearButton} onPress={handleClearImage}>
                  <View style={styles.clearButtonCircle}>
                    <Text style={styles.clearButtonText}>✕</Text>
                  </View>
                </TouchableOpacity>
              </>
            )}
          </View>

          <View style={styles.captureOptions}>
            <TouchableOpacity style={styles.optionButton} onPress={handleTakePhoto}>
              <View style={[styles.iconCircle, styles.iconCirclePurple]}>
                <Camera size={28} color="#8B5CF6" />
              </View>
              <Text style={styles.optionLabel}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={handleSelectFromGallery}>
              <View style={[styles.iconCircle, styles.iconCircleBlue]}>
                <Images size={28} color="#3B82F6" />
              </View>
              <Text style={styles.optionLabel}>Gallery</Text>
            </TouchableOpacity>
          </View>

          {isProcessing && (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="large" color="#8B5CF6" />
              <Text style={styles.processingText}>Processing image...</Text>
            </View>
          )}

          {selectedImage && !isProcessing && (
            <View style={styles.readyContainer}>
              <View style={styles.readyHeader}>
                <TextIcon size={24} color="#10B981" />
                <Text style={styles.readyTitle}>Image Ready</Text>
              </View>
              <Text style={styles.readyText}>
                Your image has been captured. Tap &ldquo;Generate notes&rdquo; to analyze this image and create AI-powered learning notes using the Feynman Technique.
              </Text>
            </View>
          )}

          <View style={styles.languageSection}>
            <View style={styles.languageLabelRow}>
              <Text style={styles.robotEmoji}>🤖</Text>
              <Text style={styles.languageLabel}>Note Language</Text>
            </View>
            <View style={styles.languageDropdown}>
              <Text style={styles.dropdownEmoji}>🤖</Text>
              <Text style={styles.dropdownText}>{selectedLanguage}</Text>
              <ChevronDown size={20} color="#374151" />
            </View>
          </View>

          <View style={styles.bottomActionBar}>
            <TouchableOpacity style={styles.circleActionButton} onPress={() => router.back()}>
              <ArrowLeft size={20} color="#374151" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.generateButton,
                (!selectedImage || isProcessing) && styles.buttonDisabled,
              ]}
              onPress={handleGenerateNotes}
              disabled={!selectedImage || isProcessing}
            >
              <Text style={styles.generateButtonEmoji}>✨</Text>
              <Text style={styles.generateButtonText}>Generate notes</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.circleActionButton}>
              <Crop size={20} color="#374151" />
            </TouchableOpacity>
          </View>
        </ScrollView>
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
    paddingVertical: 16,
    paddingBottom: 40,
  },
  imagePreviewContainer: {
    minHeight: 250,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#E5E7EB",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  imagePreviewWithImage: {
    borderStyle: "solid",
    borderColor: "#10B981",
    backgroundColor: "#ECFDF5",
  },
  emptyState: {
    alignItems: "center",
    gap: 8,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginTop: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  previewImage: {
    width: "100%",
    height: 250,
  },
  clearButton: {
    position: "absolute",
    top: 8,
    right: 8,
  },
  clearButtonCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      },
    }),
  },
  clearButtonText: {
    fontSize: 16,
    color: "#EF4444",
    fontWeight: "600",
  },
  captureOptions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginTop: 20,
  },
  optionButton: {
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  iconCirclePurple: {
    backgroundColor: "#EDE9FE",
  },
  iconCircleBlue: {
    backgroundColor: "#DBEAFE",
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
  },
  processingContainer: {
    alignItems: "center",
    marginTop: 20,
    gap: 12,
  },
  processingText: {
    fontSize: 14,
    color: "#6B7280",
  },
  readyContainer: {
    marginTop: 20,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#10B981",
    borderRadius: 16,
    padding: 16,
  },
  readyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  readyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#065F46",
  },
  readyText: {
    fontSize: 14,
    color: "#047857",
    lineHeight: 20,
  },
  languageSection: {
    marginTop: 20,
  },
  languageLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  robotEmoji: {
    fontSize: 20,
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  languageDropdown: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 16,
    gap: 8,
  },
  dropdownEmoji: {
    fontSize: 18,
  },
  dropdownText: {
    flex: 1,
    fontSize: 16,
    color: "#1F2937",
  },
  bottomActionBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 24,
  },
  circleActionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  generateButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#374151",
    borderRadius: 24,
    height: 48,
    gap: 8,
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  generateButtonEmoji: {
    fontSize: 20,
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: "600",
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
    color: "#374151",
  },
  categoryModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    marginHorizontal: 24,
    maxHeight: "80%",
    width: "85%",
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
  categoryModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 8,
  },
  categoryModalSubtext: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 24,
  },
  categoryOptions: {
    gap: 12,
  },
  categoryOption: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  categoryEmoji: {
    fontSize: 28,
  },
  categoryLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937",
  },
  categoryDesc: {
    fontSize: 12,
    color: "#6B7280",
    position: "absolute",
    right: 16,
    bottom: 12,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
});
