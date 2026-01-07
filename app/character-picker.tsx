import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams, Stack } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import Colors from "@/constants/colors";

const RACCOON_MASCOT = "https://r2-pub.rork.com/generated-images/97b402cd-3c09-435e-803e-c6c62955985a.png";

const TOM_CHARACTER = "https://r2-pub.rork.com/generated-images/7f688633-6fbb-4e61-845c-f3f3d20e6992.png";
const LUCY_CHARACTER = "https://r2-pub.rork.com/generated-images/e59672f4-b433-470a-b7e7-d676694ee6a5.png";
const KENNY_CHARACTER = "https://r2-pub.rork.com/generated-images/192d5deb-7fca-4339-9c8b-f577bab09891.png";
const MIA_CHARACTER = "https://r2-pub.rork.com/generated-images/40431168-41b7-42a1-847a-6d5e6669c039.png";

interface Character {
  name: string;
  age: number;
  level: string;
  levelColor: string;
  image: string;
  difficulty: "super_hard" | "hard" | "medium" | "easy";
  barCount: number;
}

const characters: Character[] = [
  {
    name: "Tom",
    age: 5,
    level: "super hard",
    levelColor: "#EF4444",
    image: TOM_CHARACTER,
    difficulty: "super_hard",
    barCount: 4,
  },
  {
    name: "Lucy",
    age: 12,
    level: "hard",
    levelColor: "#F97316",
    image: LUCY_CHARACTER,
    difficulty: "hard",
    barCount: 3,
  },
  {
    name: "Kenny",
    age: 16,
    level: "medium",
    levelColor: "#F59E0B",
    image: KENNY_CHARACTER,
    difficulty: "medium",
    barCount: 2,
  },
  {
    name: "Mia",
    age: 22,
    level: "easy",
    levelColor: "#10B981",
    image: MIA_CHARACTER,
    difficulty: "easy",
    barCount: 1,
  },
];

export default function CharacterPickerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const topic = typeof params.topic === "string" ? params.topic : "Topic";
  const parentTopic = typeof params.parentTopic === "string" ? params.parentTopic : topic;

  const handleSelectCharacter = (character: Character) => {
    router.push({
      pathname: "/learning-session",
      params: {
        topic,
        parentTopic,
        characterAge: character.age.toString(),
        characterName: character.name,
        characterImage: character.image,
        difficulty: character.difficulty,
      },
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
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

            <Text style={styles.title}>Choose a character to start!</Text>

            <View style={styles.charactersContainer}>
              {characters.map((character, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.characterCard}
                  onPress={() => handleSelectCharacter(character)}
                  activeOpacity={0.7}
                >
                  <View style={styles.characterInfo}>
                    <Text style={styles.characterName}>
                      {character.name} - {character.age} years old
                    </Text>
                    <View style={styles.levelRow}>
                      <View style={styles.levelBars}>
                        {[1, 2, 3, 4].map((bar) => {
                          const barHeight = bar * 4;
                          return (
                            <View
                              key={bar}
                              style={[
                                styles.levelBar,
                                { height: barHeight },
                                bar <= character.barCount && {
                                  backgroundColor: character.levelColor,
                                },
                              ]}
                            />
                          );
                        })}
                      </View>
                      <Text style={styles.levelText}>Level: {character.level}</Text>
                    </View>
                  </View>
                  <View style={styles.characterImageContainer}>
                    <Image
                      source={character.image}
                      style={styles.characterImage}
                      contentFit="contain"
                      transition={200}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  mascotContainer: {
    alignItems: "center",
    marginBottom: 24,
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
    fontSize: 24,
    fontWeight: "700" as const,
    color: Colors.darkText,
    textAlign: "center" as const,
    marginBottom: 32,
    fontFamily: Platform.OS === "ios" ? "System" : "sans-serif",
  },
  charactersContainer: {
    gap: 12,
  },
  characterCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 20,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
      web: {
        boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
      },
    }),
  },
  characterInfo: {
    flex: 1,
  },
  characterName: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: Colors.darkText,
    marginBottom: 8,
  },
  levelRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 8,
  },
  levelBars: {
    flexDirection: "row" as const,
    gap: 3,
    alignItems: "flex-end" as const,
    height: 16,
  },
  levelBar: {
    width: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  },
  levelText: {
    fontSize: 14,
    color: Colors.grayText,
  },
  characterImageContainer: {
    width: 100,
    height: 100,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 12,
  },
  characterImage: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  backButton: {
    backgroundColor: Colors.darkBrown,
    borderRadius: 28,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: "center" as const,
    marginTop: 32,
    alignSelf: "center" as const,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: Colors.white,
  },
});
