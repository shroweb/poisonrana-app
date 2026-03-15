import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import SiteLogo from "@/components/SiteLogo";
import { useForm, Controller } from "react-hook-form";
import { useRouter, Link } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import Input from "@/components/Input";
import Button from "@/components/Button";
import { useState } from "react";

interface FormData {
  email: string;
  password: string;
}

export default function LoginScreen() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await api.post<{ success: boolean; token: string; user: any; error?: string }>(
        "/auth/login",
        data
      );
      if (!res.success) throw new Error(res.error ?? "Login failed");
      await login(res.token, res.user);
      router.replace("/(tabs)/");
    } catch (e: any) {
      Alert.alert("Sign In Failed", e.message ?? "Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSocialLogin(provider: "google" | "facebook") {
    const redirectUrl = Linking.createURL("auth");
    const result = await WebBrowser.openAuthSessionAsync(
      `https://www.poisonrana.com/api/auth/${provider}?platform=app`,
      "poisonrana://auth"
    );
    if (result.type === "success") {
      const { queryParams } = Linking.parse(result.url);
      const token = queryParams?.token as string;
      if (token) {
        // Fetch user from /auth/me
        const res = await fetch("https://www.poisonrana.com/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        await login(token, res.data ?? res.user);
        router.replace("/(tabs)/");
      }
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-8 pb-16"
        keyboardShouldPersistTaps="handled"
      >
        <SiteLogo tagline="Rate. Review. Wrestling." />

        {/* Form */}
        <Controller
          control={control}
          name="email"
          rules={{
            required: "Email is required",
            pattern: { value: /\S+@\S+\.\S+/, message: "Invalid email" },
          }}
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="password"
          rules={{ required: "Password is required" }}
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Password"
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />

        <Button
          label="Sign In"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          fullWidth
        />

        {/* Divider */}
        <View className="flex-row items-center my-6">
          <View className="flex-1 h-px bg-border" />
          <Text className="text-muted text-xs mx-3">or continue with</Text>
          <View className="flex-1 h-px bg-border" />
        </View>

        <Button
          label="Continue with Google"
          onPress={() => handleSocialLogin("google")}
          variant="outline"
          fullWidth
        />

        {/* Register link */}
        <View className="flex-row justify-center mt-8">
          <Text className="text-muted text-sm">Don't have an account? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text className="text-yellow text-sm font-bold">Join Free</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
