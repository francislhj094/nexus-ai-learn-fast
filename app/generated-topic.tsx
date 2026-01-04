import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Bookmark, FileText, List, Save } from 'lucide-react-native';
import Colors from '@/constants/colors';

export default function GeneratedTopicScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [generatedContent, setGeneratedContent] = useState<{
    title: string;
    summary: string;
    keyPoints: string[];
    transcript: string;
  } | null>(null);

  useEffect(() => {
    const generateContent = async () => {
      setIsLoading(true);
      
      try {
        await new Promise((resolve) => setTimeout(resolve, 2500));
        
        const fileName = typeof params.fileName === 'string' 
          ? params.fileName.replace(/\.[^/.]+$/, '') 
          : 'Generated Topic';
        
        setGeneratedContent({
          title: fileName,
          summary: 'This is an AI-generated summary of your audio content. The Feynman Technique breaks down complex topics into simple explanations, making learning more effective and memorable.',
          keyPoints: [
            'Main concept explained in simple terms',
            'Key supporting details and evidence',
            'Practical applications and examples',
            'Summary and key takeaways',
          ],
          transcript: 'Full transcript of the audio would appear here...',
        });
      } catch (error) {
        console.error('Error generating content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    generateContent();
  }, [params.fileName]);

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Generating topic...</Text>
          <Text style={styles.loadingSubtext}>
            Analyzing audio with Feynman AI
          </Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#374151" strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Generated Topic</Text>
          <TouchableOpacity 
            style={styles.saveButton}
            activeOpacity={0.7}
          >
            <Bookmark size={24} color="#374151" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.contentContainer}
        >
          <Text style={styles.topicTitle}>{generatedContent?.title}</Text>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <FileText size={20} color="#8B5CF6" strokeWidth={2} />
              <Text style={styles.cardTitle}>Summary</Text>
            </View>
            <Text style={styles.cardContent}>{generatedContent?.summary}</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <List size={20} color="#10B981" strokeWidth={2} />
              <Text style={styles.cardTitle}>Key Points</Text>
            </View>
            {generatedContent?.keyPoints.map((point, index) => (
              <View key={index} style={styles.keyPointItem}>
                <View style={styles.bullet} />
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(tabs)/library')}
            activeOpacity={0.8}
          >
            <Save size={20} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.primaryButtonText}>Save to Library</Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  saveButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  topicTitle: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginBottom: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginLeft: 8,
  },
  cardContent: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
    marginTop: 8,
    marginRight: 12,
  },
  keyPointText: {
    flex: 1,
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 8,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
