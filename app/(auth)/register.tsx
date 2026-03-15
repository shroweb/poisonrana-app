import {
  View,
  Text,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useForm, Controller } from "react-hook-form";
import { useRouter, Link } from "expo-router";
import { useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import Input from "@/components/Input";
import Button from "@/components/Button";
import SiteLogo from "@/components/SiteLogo";

interface FormData {
  name: string;
  email: string;
  password: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const login = useAuth((s) => s.login);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>();

  async function handleGoogleLogin() {
    const result = await WebBrowser.openAuthSessionAsync(
      "https://www.poisonrana.com/api/auth/google?platform=app",
      "poisonrana://auth"
    );
    if (result.type === "success") {
      const { queryParams } = Linking.parse(result.url);
      const token = queryParams?.token as string;
      if (token) {
        const res = await fetch("https://www.poisonrana.com/api/v1/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        }).then((r) => r.json());
        await login(token, res.data ?? res.user);
        router.replace("/(tabs)/");
      }
    }
  }

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await api.post<{
        success: boolean;
        token: string;
        user: any;
        error?: string;
      }>("/auth/register", data);
      if (!res.success) throw new Error(res.error ?? "Registration failed");
      await login(res.token, res.user);
      router.replace("/(tabs)/");
    } catch (e: any) {
      Alert.alert("Sign Up Failed", e.message ?? "Please try again.");
    } finally {
      setLoading(false);
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
        <SiteLogo tagline="The world's wrestling archive." />

        <Controller
          control={control}
          name="name"
          rules={{ required: "Display name is required", minLength: { value: 2, message: "Min 2 characters" } }}
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Display Name"
              placeholder="e.g. SwantonBomb"
              autoCapitalize="words"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.name?.message}
            />
          )}
        />

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
          rules={{
            required: "Password is required",
            minLength: { value: 8, message: "Min 8 characters" },
          }}
          render={({ field: { onChange, value, onBlur } }) => (
            <Input
              label="Password"
              placeholder="Min 8 characters"
              secureTextEntry
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
            />
          )}
        />

        <Button
          label="Create Account"
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
          onPress={handleGoogleLogin}
          variant="outline"
          fullWidth
        />

        <View className="flex-row justify-center mt-8">
          <Text className="text-muted text-sm">Already have an account? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text className="text-yellow text-sm font-bold">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
