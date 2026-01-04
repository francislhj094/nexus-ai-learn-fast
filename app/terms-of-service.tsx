import Colors from "@/constants/colors";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function TermsOfServiceScreen() {
  const router = useRouter();

  const openEmail = () => {
    Linking.openURL("mailto:support@feynman.ai");
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.navDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Terms of Service</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.mainTitle}>Terms of Use</Text>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recording Policy</Text>
            <Text style={styles.bodyText}>
              At Feynman AI, we emphasize the importance of adhering to both
              legal and institutional regulations when recording and sharing
              content. We ask all users to follow these guidelines to ensure
              compliance with applicable policies and laws:
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>
              Compliance with Institutional Policies
            </Text>
            <Text style={styles.bodyText}>
              Users are responsible for ensuring that any recording or uploaded
              material aligns with the policies of their school, university,
              workplace, or instructor. It is the user&apos;s obligation to
              familiarize themselves with and adhere to their institution&apos;s rules
              concerning the recording and sharing of lectures or educational
              content.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>Respecting Copyright Law</Text>
            <Text style={styles.bodyText}>
              Users must not record or upload content that is protected by
              copyright unless they have obtained explicit permission from the
              copyright holder. This includes materials like texts, images,
              videos, or other forms of copyrighted media.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.subsectionTitle}>
              Respect for Privacy and Confidentiality
            </Text>
            <Text style={styles.bodyText}>
              Users are prohibited from recording or sharing sensitive
              conversations or information that would violate U.S. privacy laws.
              This includes confidential communications, private discussions, or
              any other exchanges legally protected from unauthorized recording
              or disclosure.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.bodyText}>
              Feynman AI does not condone and cannot be held liable for any
              unauthorized recording or uploading of content that violates
              institutional policies, copyright law, or privacy laws. Users are
              fully responsible for ensuring their activities on the platform
              comply with all applicable legal and institutional requirements.
            </Text>
            <Text style={styles.bodyText}>
              By using our platform, you agree to indemnify Feynman AI against
              any legal consequences resulting from the unauthorized recording
              or distribution of material. We trust our users to respect
              intellectual property, privacy, and institutional policies while
              using Feynman AI.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              License to View Feynman Content
            </Text>
            <Text style={styles.bodyText}>
              Provided you comply with these Terms of Use, Feynman AI grants you
              a limited, personal, non-exclusive, non-commercial, revocable, and
              non-transferable license to access and use the content on our
              platform. This is strictly for personal, non-commercial,
              educational use.
            </Text>
            <Text style={styles.bodyText}>
              You agree not to copy, record, or access content via automated
              means (e.g., scripts, bots, or data extraction tools) unless
              authorized by Feynman AI in writing.
            </Text>
            <Text style={styles.bodyText}>
              If you purchase a subscription or license to access Feynman
              content, it is for individual use only and cannot be shared with
              others. We may enforce reasonable limits on access to protect
              against unauthorized use, including limits on time, device usage,
              or the quantity of materials accessed.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Refund Policy for Feynman AI
            </Text>

            <Text style={styles.numberedTitle}>1. Eligibility for Refunds</Text>
            <Text style={styles.bodyText}>
              Refunds are generally only available under the following
              conditions:
            </Text>

            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                You are within the first 30 days of your subscription purchase
                or renewal.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                The subscription was not used excessively or in violation of our
                Terms of Service.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Technical issues that are caused by Feynman AI and could not be
                resolved within a reasonable time after the issue was reported.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Accidental or duplicate payments.
              </Text>
            </View>

            <Text style={styles.numberedTitle}>
              2. No Refunds for Inactive Accounts
            </Text>
            <Text style={styles.bodyText}>
              We do not provide refunds for unused or inactive accounts. If you
              forget to cancel your subscription and it renews automatically,
              you are still responsible for that charge. Please ensure you
              manage your subscription settings in your account.
            </Text>

            <Text style={styles.numberedTitle}>3. Refund Request Process</Text>
            <Text style={styles.bodyText}>To request a refund:</Text>

            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Email our support team at{" "}
                <Text style={styles.linkText} onPress={openEmail}>
                  support@feynman.ai
                </Text>{" "}
                with the subject line &quot;Refund Request.&quot;
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Include the following details: your name, email address,
                subscription plan, and the reason for your refund request.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Our team will review your request and respond within 5-7
                business days.
              </Text>
            </View>

            <Text style={styles.numberedTitle}>4. Pro-Rated Refunds</Text>
            <Text style={styles.bodyText}>
              If you cancel your subscription partway through a billing cycle,
              you may be eligible for a pro-rated refund based on the number of
              unused days in the billing period.
            </Text>

            <Text style={styles.numberedTitle}>5. Non-Refundable Cases</Text>

            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Refund requests made after 30 days of subscription purchase.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Refunds for promotional offers, discounts, or special pricing.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Monthly subscription fees after the initial 30-day period.
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Termination of your account due to a violation of our Terms of
                Service.
              </Text>
            </View>

            <Text style={styles.numberedTitle}>6. Payment Processing Time</Text>
            <Text style={styles.bodyText}>
              Once your refund request is approved, the refund will be processed
              through the original payment method. Depending on your financial
              institution, it may take up to 7-14 business days for the funds to
              appear in your account.
            </Text>

            <Text style={styles.numberedTitle}>7. Changes to This Policy</Text>
            <Text style={styles.bodyText}>
              Feynman AI reserves the right to modify or update this refund
              policy at any time. We will notify users of any significant
              changes by posting the updated policy on our website.
            </Text>
          </View>

          <Text style={styles.footer}>
            Build with <Text style={styles.heart}>❤️</Text> by Feynman Team
          </Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
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
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    backgroundColor: Colors.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 40,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 24,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  numberedTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginTop: 20,
    marginBottom: 8,
  },
  bodyText: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 24,
    marginBottom: 12,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 8,
    paddingLeft: 8,
    paddingRight: 16,
  },
  bullet: {
    fontSize: 15,
    color: "#6B7280",
    marginRight: 8,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    color: "#374151",
    lineHeight: 22,
  },
  linkText: {
    color: "#3B82F6",
    textDecorationLine: "underline",
  },
  footer: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  heart: {
    color: "#EF4444",
  },
});
