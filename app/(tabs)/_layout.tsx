import Colors from "@/constants/colors";
import { Tabs, useRouter } from "expo-router";
import { Home, Grid3x3, User, Plus, Mic, Volume2, Camera, Video, FileText, Edit3, X } from "lucide-react-native";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, Platform, View, Text, Modal, Pressable } from "react-native";

function FloatingActionButton() {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  
  const options = [
    { 
      id: "record-audio", 
      title: "Record Audio", 
      description: "Generate a note from any audio recording",
      icon: Mic,
      iconColor: "#EF4444",
      bgColor: "#FEE2E2",
      route: "/record-audio" 
    },
    { 
      id: "upload-audio", 
      title: "Upload Audio", 
      description: "Upload an audio file to generate a topic",
      icon: Volume2,
      iconColor: "#8B5CF6",
      bgColor: "#EDE9FE",
      route: "/upload-audio" 
    },
    { 
      id: "capture", 
      title: "Capture Text or Image", 
      description: "Capture anything to generate a topic",
      icon: Camera,
      iconColor: "#A855F7",
      bgColor: "#E9D5FF",
      route: "/capture-text-image" 
    },
    { 
      id: "youtube", 
      title: "YouTube Video", 
      description: "Enter a youtube video link to generate a topic",
      icon: Video,
      iconColor: "#EF4444",
      bgColor: "#FECDD3",
      route: "/youtube-video" 
    },
    { 
      id: "pdf", 
      title: "PDF book or document", 
      description: "Upload a pdf document to generate a topic",
      icon: FileText,
      iconColor: "#F97316",
      bgColor: "#FED7AA",
      route: "/create-notes" 
    },
    { 
      id: "custom-text", 
      title: "Custom text", 
      description: "Enter custom text to generate a topic",
      icon: Edit3,
      iconColor: "#10B981",
      bgColor: "#D1FAE5",
      route: "/create-notes" 
    },
  ];

  const handleOptionPress = (route: string) => {
    setShowModal(false);
    router.push(route as any);
  };
  
  return (
    <>
      <TouchableOpacity
        style={styles.fab}
        onPress={() => setShowModal(true)}
        activeOpacity={0.8}
      >
        <Plus size={24} color={Colors.white} strokeWidth={2.5} />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Text style={styles.modalHeaderEmoji}>✨</Text>
                <Text style={styles.modalHeaderText}>Create Note/Game/Learning</Text>
              </View>
              <TouchableOpacity 
                style={styles.modalCloseButton}
                onPress={() => setShowModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.navDark} strokeWidth={2} />
              </TouchableOpacity>
            </View>
            {options.map((option) => {
              const IconComponent = option.icon;
              return (
                <TouchableOpacity
                  key={option.id}
                  style={[styles.optionCard, { backgroundColor: option.bgColor }]}
                  onPress={() => handleOptionPress(option.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionIconContainer}>
                    <IconComponent size={24} color={option.iconColor} strokeWidth={2} />
                  </View>
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionTitle}>{option.title}</Text>
                    <Text style={styles.optionDescription}>{option.description}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.navDark,
        tabBarInactiveTintColor: Colors.navInactive,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopWidth: 1,
          borderTopColor: "#E5E7EB",
          height: Platform.OS === "ios" ? 86 : 70,
          paddingTop: 8,
          paddingBottom: Platform.OS === "ios" ? 20 : 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500" as const,
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 4,
        },
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Home size={24} color={color} fill={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color }) => <Grid3x3 size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="fab-placeholder"
        options={{
          tabBarButton: () => <FloatingActionButton />,
          tabBarLabel: () => null,
        }}
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 28 : 16,
    left: "50%",
    transform: [{ translateX: -28 }],
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.navDark,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 20,
    maxHeight: "70%",
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  modalHeaderEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  modalHeaderText: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: Colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  optionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: Colors.text,
    marginBottom: 2,
  },
  optionDescription: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 18,
  },
});
