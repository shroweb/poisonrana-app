import "../global.css";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldPlaySound: true, shouldSetBadge: true }),
});

async function registerPushToken(token: string) {
  const platform = Platform.OS === "ios" ? "ios" : "android";
  try {
    await api.post("/me/push-token", { token, platform });
  } catch {}
}

export default function RootLayout() {
  const hydrate = useAuth((s) => s.hydrate);
  const authToken = useAuth((s) => s.token);
  const router = useRouter();
  const notificationListener = useRef<any>(null);
  const responseListener = useRef<any>(null);

  useEffect(() => {
    hydrate();
  }, []);

  useEffect(() => {
    if (!authToken) return;

    async function setupPush() {
      try {
        const { status: existing } = await Notifications.getPermissionsAsync();
        let finalStatus = existing;
        if (existing !== "granted") {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        if (finalStatus !== "granted") return;

        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: "5ef12ebe-7942-46ec-9164-3fd8441a5e3d",
        });
        await registerPushToken(tokenData.data);
      } catch (e) {
        console.log("[push] setup failed:", e);
      }
    }

    setupPush();

    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const path = response.notification.request.content.data?.path as string | undefined;
      if (path && path.startsWith("/")) {
        router.push(path as any);
      }
    });

    return () => {
      if (responseListener.current) Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, [authToken]);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: "#0B1120" },
          headerTintColor: "#FFFFFF",
          headerTitleStyle: { fontWeight: "bold" },
          headerBackTitle: "Back",
          contentStyle: { backgroundColor: "#0B1120" },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen
          name="events/[slug]"
          options={{ title: "", headerTransparent: true, headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="wrestlers/[slug]"
          options={{ title: "", headerTransparent: true, headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="profile/edit"
          options={{ title: "Edit Profile", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="search"
          options={{ title: "Search", presentation: "modal" }}
        />
        <Stack.Screen
          name="privacy"
          options={{ title: "Privacy Policy" }}
        />
        <Stack.Screen
          name="predictions/[slug]"
          options={{ title: "My Predictions", headerBackTitle: "Back" }}
        />
        <Stack.Screen
          name="leaderboard"
          options={{ title: "Leaderboard", headerBackTitle: "Back" }}
        />
      </Stack>
    </>
  );
}
