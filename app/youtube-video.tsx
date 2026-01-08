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

  const fetchVideoInfo = async (id: string): Promise<{ title: string; description: string; channel: string; tags: string }> => {
    console.log('Fetching video info for:', id);
    
    // Try noembed API first (most reliable)
    try {
      const noembedResponse = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${id}`);
      if (noembedResponse.ok) {
        const data = await noembedResponse.json();
        console.log('Noembed data:', JSON.stringify(data, null, 2));
        if (data.title && !data.error) {
          return {
            title: data.title,
            description: '',
            channel: data.author_name || '',
            tags: '',
          };
        }
      }
    } catch (err) {
      console.log('Noembed API error:', err);
    }

    // Try oembed API as fallback
    try {
      const oembedResponse = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`);
      if (oembedResponse.ok) {
        const data = await oembedResponse.json();
        console.log('Oembed data:', JSON.stringify(data, null, 2));
        if (data.title) {
          return {
            title: data.title,
            description: '',
            channel: data.author_name || '',
            tags: '',
          };
        }
      }
    } catch (err) {
      console.log('Oembed API error:', err);
    }

    // Try lemnoslife API as another fallback
    try {
      const response = await fetch(`https://yt.lemnoslife.com/noKey/videos?part=snippet&id=${id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Lemnoslife data:', JSON.stringify(data, null, 2));
        if (data.items && data.items.length > 0) {
          const snippet = data.items[0].snippet;
          return {
            title: snippet?.title || '',
            description: snippet?.description || '',
            channel: snippet?.channelTitle || '',
            tags: snippet?.tags?.join(', ') || '',
          };
        }
      }
    } catch (err) {
      console.log('Lemnoslife API error:', err);
    }

    return { title: '', description: '', channel: '', tags: '' };
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
      
      const fetchedInfo = await fetchVideoInfo(videoId);
      console.log('Fetched video info:', JSON.stringify(fetchedInfo, null, 2));
      
      // Update video info with fetched title
      if (fetchedInfo.title) {
        setVideoInfo({
          title: fetchedInfo.title,
          thumbnail: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        });
      }

      const actualTitle = fetchedInfo.title || videoInfo?.title || 'Unknown Video';
      const videoContent = [
        `Video Title: ${actualTitle}`,
        fetchedInfo.channel ? `Channel: ${fetchedInfo.channel}` : '',
        fetchedInfo.description ? `Description: ${fetchedInfo.description}` : '',
        fetchedInfo.tags ? `Tags: ${fetchedInfo.tags}` : '',
      ].filter(Boolean).join('\n\n');
      
      console.log('Video content for AI:', videoContent);

      const prompt = `You are an AI learning assistant. Create study notes SPECIFICALLY about the following YouTube video.

IMPORTANT: Your notes MUST be about the exact topic mentioned in the video title. Do NOT generate generic or unrelated content.

Video Information:
${videoContent}

Based on this video's title "${actualTitle}", create comprehensive study notes about this SPECIFIC topic.

Please provide:
1. Main Topic: The exact topic from the video title
2. Summary: What this video likely covers based on its title
3. Key Concepts: 4-6 key concepts related to this specific topic
4. Detailed Explanation: Educational content about this exact subject
5. Review Questions: 2-3 questions to test understanding of this topic

Format your response as follows:
MAIN TOPIC:
[The topic from the video title]

SUMMARY:
[Summary about this specific topic]

KEY CONCEPTS:
- [Concept 1 related to this topic]
- [Concept 2 related to this topic]
- [Concept 3 related to this topic]
- [Concept 4 related to this topic]
- [Concept 5 related to this topic]

DETAILED EXPLANATION:
[Educational explanation about this specific subject]

REVIEW QUESTIONS:
1. [Question about this topic]
2. [Question about this topic]
3. [Question about this topic]

Remember: Focus ONLY on the topic "${actualTitle}". Do not deviate to other subjects.`;

      console.log('Generating notes with AI...');
      const generatedContent = await generateText({
        messages: [{ role: 'user', content: prompt }],
      });

      const fetchedTitle = fetchedInfo.title || videoInfo?.title;
      let topicName = fetchedTitle || 'YouTube Video Notes';
      const topicMatch = generatedContent.match(/MAIN TOPIC:\s*([^\n]+)/);
      if (topicMatch && topicMatch[1].trim()) {
        topicName = topicMatch[1].trim();
      }
      // Prefer the actual video title if available
      if (fetchedTitle && topicName === 'YouTube Video Notes') {
        topicName = fetchedTitle;
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
