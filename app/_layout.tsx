import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthContext, useAuth } from "@/contexts/auth";
import { ExplanationsContext } from "@/contexts/explanations";
import { SubscriptionContext } from "@/contexts/subscription";
import { trpc, trpcClient } from "@/lib/trpc";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(tabs)";

    if (!isAuthenticated && !segments[0]) {
      router.replace("/welcome");
    } else if (!isAuthenticated && inAuthGroup) {
      router.replace("/welcome");
    } else if (isAuthenticated && segments[0] === "welcome") {
      router.replace("/(tabs)/(home)");
    } else if (isAuthenticated && !segments[0]) {
      router.replace("/(tabs)/(home)");
    }
  }, [isAuthenticated, isLoading, segments, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="welcome" />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="feynman-ai" options={{ headerShown: false }} />
      <Stack.Screen name="start-learning" options={{ headerShown: false }} />
      <Stack.Screen name="topic-picker" options={{ headerShown: false }} />
      <Stack.Screen name="character-picker" options={{ headerShown: false }} />
      <Stack.Screen name="explanation" options={{ headerShown: false }} />
      <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
      <Stack.Screen name="terms-of-service" options={{ headerShown: false }} />
      <Stack.Screen name="record-audio" options={{ headerShown: false, presentation: "fullScreenModal" }} />
      <Stack.Screen name="upload-audio" options={{ headerShown: false }} />
      <Stack.Screen name="note-generating" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="generated-topic" options={{ headerShown: false }} />
      <Stack.Screen name="capture-text-image" options={{ headerShown: false }} />
      <Stack.Screen name="paywall" options={{ headerShown: false, presentation: "modal" }} />
      <Stack.Screen name="learning-session" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthContext>
            <SubscriptionContext>
              <ExplanationsContext>
                <RootLayoutNav />
              </ExplanationsContext>
            </SubscriptionContext>
          </AuthContext>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
