// Deep link handler for poisonrana://auth?token=...
import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useAuth } from "@/store/auth";

export default function AuthCallbackScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const login = useAuth((s) => s.login);

  useEffect(() => {
    if (!token) {
      router.replace("/(auth)/login");
      return;
    }
    (async () => {
      try {
        const res = await fetch("https://poisonrana.com/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        await login(token, res.data ?? res.user);
        router.replace("/(tabs)/");
      } catch {
        router.replace("/(auth)/login");
      }
    })();
  }, [token]);

  return (
    <View className="flex-1 bg-background items-center justify-center">
      <ActivityIndicator color="#F5C518" size="large" />
    </View>
  );
}
