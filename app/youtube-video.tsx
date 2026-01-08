import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Video, ArrowLeft, Link, Sparkles, Play, AlertCircle } from 'lucide-react-native';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { generateText } from '@rork-ai/toolkit-sdk';
import { useExplanations } from '@/contexts/explanations';

const YOUTUBE_URL_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

export default function YouTubeVideoScreen() {
  const router = useRouter();
  const { addExplanation } = useExplanations();
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [videoId, setVideoId] = useState('');
  const [videoInfo, setVideoInfo] = useState<{ title: string; thumbnail: string } | null>(null);

  const extractVideoId = (inputUrl: string): string | null => {
    const match = inputUrl.match(YOUTUBE_URL_REGEX);
    return match ? match[1] : null;
  };

  const handleUrlChange = (text: string) => {
    setUrl(text);
    setError('');
    
    const extractedId = extractVideoId(text);
    if (extractedId) {
      setVideoId(extractedId);
      setVideoInfo({
        title: 'YouTube Video',
        thumbnail: `https://img.youtube.com/vi/${extractedId}/maxresdefault.jpg`,
      });
    } else {
      setVideoId('');
      setVideoInfo(null);
    }
  };

  const fetchTranscript = async (id: string): Promise<string> => {
    console.log('Fetching transcript for video:', id);
    
    try {
      const response = await fetch(`https://yt.lemnoslife.com/noKey/videos?part=snippet&id=${id}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Video data:', JSON.stringify(data, null, 2));
        
        if (data.items && data.items.length > 0) {
          const snippet = data.items[0].snippet;
          const title = snippet?.title || 'Unknown Title';
          const description = snippet?.description || '';
          const channelTitle = snippet?.channelTitle || '';
          const tags = snippet?.tags?.join(', ') || '';
          
          setVideoInfo({
            title: title,
            thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
          });
          
          return `Video Title: ${title}\n\nChannel: ${channelTitle}\n\nDescription: ${description}\n\nTags: ${tags}`;
        }
      }
    } catch (err) {
      console.log('Error fetching video info:', err);
    }
    
    return `YouTube Video ID: ${id}\n\nPlease provide study notes based on this YouTube video. Since I cannot directly access the video content, please create general study material based on the video information available.`;
  };

  const handleGenerate = async () => {
    if (!videoId) {
      setError('Please enter a valid YouTube URL');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Starting YouTube video processing...');
      
      const videoContent = await fetchTranscript(videoId);
      console.log('Video content length:', videoContent.length);

      const prompt = `You are an AI learning assistant. A user wants to learn from this YouTube video:

${videoContent}

Based on this video information, create comprehensive study notes.

Please provide:
1. Main Topic: Identify the main topic of the video
2. Summary: Write a 2-3 sentence summary of what the video covers
3. Key Concepts: Extract 4-6 key concepts or main points likely discussed
4. Detailed Explanation: Provide a clear, organized explanation of the content
5. Review Questions: Create 2-3 review questions to test understanding

Format your response as follows:
MAIN TOPIC:
[Identified main topic]

SUMMARY:
[Your 2-3 sentence summary]

KEY CONCEPTS:
- [Concept 1]
- [Concept 2]
- [Concept 3]
- [Concept 4]
- [Concept 5]

DETAILED EXPLANATION:
[Your organized explanation with proper structure]

REVIEW QUESTIONS:
1. [Question 1]
2. [Question 2]
3. [Question 3]

Make the notes educational and helpful for studying.`;

      console.log('Generating notes with AI...');
      const generatedContent = await generateText({
        messages: [{ role: 'user', content: prompt }],
      });

      let topicName = videoInfo?.title || 'YouTube Video Notes';
      const topicMatch = generatedContent.match(/MAIN TOPIC:\s*([^\n]+)/);
      if (topicMatch && topicMatch[1].trim()) {
        topicName = topicMatch[1].trim();
      }

      console.log('Adding explanation:', topicName);
      addExplanation(topicName, generatedContent);

      router.replace('/(tabs)/library');
    } catch (err) {
      console.error('Error generating notes:', err);
      setError('Failed to generate notes. Please try again.');
      
      if (Platform.OS !== 'web') {
        Alert.alert('Error', 'Failed to generate notes. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaste = async () => {
    try {
      if (Platform.OS === 'web') {
        const text = await navigator.clipboard.readText();
        handleUrlChange(text);
      } else {
        const Clipboard = await import('expo-clipboard');
        const text = await Clipboard.getStringAsync();
        handleUrlChange(text);
      }
    } catch (err) {
      console.log('Failed to paste:', err);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#1F2937" strokeWidth={2} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Video size={24} color="#EF4444" strokeWidth={2} />
            <Text style={styles.headerTitle}>YouTube Video</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Play size={48} color="#EF4444" strokeWidth={2} fill="#EF4444" />
            </View>
          </View>

          <Text style={styles.title}>Enter YouTube URL</Text>
          <Text style={styles.subtitle}>
            Paste a YouTube video link to generate study notes from the video content
          </Text>

          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <Link size={20} color="#9CA3AF" strokeWidth={2} />
              <TextInput
                style={styles.input}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor="#9CA3AF"
                value={url}
                onChangeText={handleUrlChange}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.pasteButton}
                onPress={handlePaste}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                <Text style={styles.pasteButtonText}>Paste</Text>
              </TouchableOpacity>
            </View>

            {error ? (
              <View style={styles.errorContainer}>
                <AlertCircle size={16} color="#EF4444" strokeWidth={2} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}
          </View>

          {videoInfo && videoId && (
            <View style={styles.previewCard}>
              <Image
                source={{ uri: videoInfo.thumbnail }}
                style={styles.thumbnail}
                contentFit="cover"
              />
              <View style={styles.previewOverlay}>
                <View style={styles.playIconSmall}>
                  <Play size={24} color="#FFFFFF" strokeWidth={2} fill="#FFFFFF" />
                </View>
              </View>
              <View style={styles.previewInfo}>
                <Text style={styles.previewTitle} numberOfLines={2}>
                  {videoInfo.title}
                </Text>
                <Text style={styles.previewId}>Video ID: {videoId}</Text>
              </View>
            </View>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>How it works</Text>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>Paste any YouTube video URL</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <Text style={styles.stepText}>AI analyzes the video content</Text>
            </View>
            <View style={styles.infoStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <Text style={styles.stepText}>Get comprehensive study notes</Text>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.generateButton,
              (!videoId || isLoading) && styles.generateButtonDisabled,
            ]}
            onPress={handleGenerate}
            activeOpacity={0.8}
            disabled={!videoId || isLoading}
          >
            {isLoading ? (
              <>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={styles.generateButtonText}>Generating Notes...</Text>
              </>
            ) : (
              <>
                <Sparkles size={20} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.generateButtonText}>Generate Notes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1F2937',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  pasteButton: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pasteButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#374151',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 14,
    color: '#EF4444',
  },
  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: '#1F2937',
  },
  previewOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  playIconSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewInfo: {
    padding: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#1F2937',
    marginBottom: 4,
  },
  previewId: {
    fontSize: 14,
    color: '#6B7280',
  },
  infoCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold' as const,
    color: '#1F2937',
    marginBottom: 16,
  },
  infoStep: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumberText: {
    fontSize: 14,
    fontWeight: 'bold' as const,
    color: '#8B5CF6',
  },
  stepText: {
    fontSize: 15,
    color: '#4B5563',
    flex: 1,
  },
  footer: {
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  generateButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
