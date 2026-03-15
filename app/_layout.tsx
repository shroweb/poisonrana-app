import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "@/store/auth";

export default function RootLayout() {
  const hydrate = useAuth((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, []);

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
      </Stack>
    </>
  );
}
