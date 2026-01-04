import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/auth";
import { useRouter } from "expo-router";
import {
  ChevronRight,
  LogOut,
  Star,
  FileText,
  Shield,
  Sparkles,
  Send,
  Languages,
  Headphones,
  Calendar,
} from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

interface SettingsItemProps {
  icon: React.ReactNode;
  title: string;
  onPress?: () => void;
  showChevron?: boolean;
  rightText?: string;
  isLastItem?: boolean;
}

function SettingsItem({
  icon,
  title,
  onPress,
  showChevron = true,
  rightText,
  isLastItem = false,
}: SettingsItemProps) {
  return (
    <TouchableOpacity
      style={[styles.settingsItem, isLastItem && styles.settingsItemLast]}
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingsIcon}>{icon}</View>
      <Text style={styles.settingsTitle}>{title}</Text>
      {rightText && <Text style={styles.rightText}>{rightText}</Text>}
      {showChevron && <ChevronRight size={16} color={Colors.navInactive} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    if (Platform.OS === "web") {
      if (confirm("Are you sure you want to log out?")) {
        signOut();
        router.replace("/welcome");
      }
    } else {
      Alert.alert("Log Out", "Are you sure you want to log out?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Log Out",
          style: "destructive",
          onPress: () => {
            signOut();
            router.replace("/welcome");
          },
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || "G"}
              </Text>
            </View>
            <Text style={styles.userName}>{user?.name || "Guest User"}</Text>
            <Text style={styles.userEmail}>{user?.email || "guest@example.com"}</Text>
            <View style={styles.joinDateRow}>
              <Calendar size={16} color={Colors.navInactive} />
              <Text style={styles.joinDate}>Joined 23 Sep 2025</Text>
            </View>
          </View>

          <View style={styles.promoCard}>
            <View style={styles.promoContent}>
              <Text style={styles.promoTitle}>Back to school</Text>
              <Text style={styles.promoSubtitle}>Sale 50% off</Text>
              <TouchableOpacity style={styles.promoButton}>
                <Text style={styles.promoButtonText}>Get Now 50% off 🎁</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoIllustration}>
              <Text style={styles.promoWatermark}>BACK TO{"\n"}SCHOOL</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            
            <View style={styles.settingsGroup}>
              <SettingsItem
                icon={<Sparkles size={24} color={Colors.orange} />}
                title="Account Status"
                rightText="Free"
                showChevron={false}
                isLastItem={false}
              />
              <SettingsItem
                icon={<Shield size={24} color={Colors.navDark} />}
                title="Version"
                rightText="2.0.1"
                showChevron={false}
                isLastItem={true}
              />
            </View>

            <View style={styles.settingsGroup}>
              <SettingsItem
                icon={<Star size={24} color="#FBBF24" />}
                title="Rate Feynman AI 5 stars"
                onPress={() => console.log("Rate")}
                isLastItem={false}
              />
              <SettingsItem
                icon={<Send size={24} color={Colors.gradientBlue} />}
                title="Share Feynman AI"
                onPress={() => console.log("Share")}
                isLastItem={false}
              />
              <SettingsItem
                icon={<Languages size={24} color="#DC2626" />}
                title="Change Language"
                onPress={() => console.log("Language")}
                isLastItem={true}
              />
            </View>

            <View style={styles.settingsGroup}>
              <SettingsItem
                icon={<Headphones size={24} color={Colors.orange} />}
                title="Get Help"
                onPress={() => console.log("Help")}
                isLastItem={false}
              />
              <SettingsItem
                icon={<FileText size={24} color={Colors.gradientBlue} />}
                title="Terms of Service"
                onPress={() => router.push("/terms-of-service")}
                isLastItem={false}
              />
              <SettingsItem
                icon={<Shield size={24} color={Colors.gradientGreenStart} />}
                title="Privacy Policy"
                onPress={() => router.push("/privacy-policy")}
                isLastItem={false}
              />
              <SettingsItem
                icon={<LogOut size={24} color="#EF4444" />}
                title="Log Out"
                onPress={handleLogout}
                showChevron={false}
                isLastItem={true}
              />
            </View>
          </View>

          <Text style={styles.version}>Version 2.0.1</Text>
        </ScrollView>
      </SafeAreaView>
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
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.orange,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  avatarText: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: "700",
  },
  userName: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.navInactive,
    marginBottom: 8,
  },
  joinDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  joinDate: {
    fontSize: 14,
    color: Colors.navInactive,
  },
  promoCard: {
    backgroundColor: Colors.gradientCoralStart,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    overflow: "hidden",
    flexDirection: "row",
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      },
    }),
  },
  promoContent: {
    flex: 1,
    zIndex: 2,
  },
  promoTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 4,
  },
  promoSubtitle: {
    fontSize: 16,
    color: Colors.white,
    marginBottom: 16,
  },
  promoButton: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignSelf: "flex-start",
  },
  promoButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  promoIllustration: {
    position: "absolute",
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    padding: 12,
  },
  promoWatermark: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgba(255,255,255,0.3)",
    textAlign: "right",
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingsGroup: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
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
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundLight,
  },
  settingsItemLast: {
    borderBottomWidth: 0,
  },
  settingsIcon: {
    marginRight: 12,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: "400",
    color: Colors.text,
    flex: 1,
  },
  rightText: {
    fontSize: 16,
    fontWeight: "400",
    color: Colors.text,
    marginRight: 8,
  },
  version: {
    fontSize: 13,
    color: Colors.navInactive,
    textAlign: "center",
  },
});
