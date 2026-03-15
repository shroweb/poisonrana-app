import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import Button from "@/components/Button";
import * as SecureStore from "expo-secure-store";

const PROMOTIONS = ["WWE", "AEW", "NJPW", "TNA", "ROH", "NXT", "Impact", "Other"];
const UPLOAD_URL = "https://www.poisonrana.com/api/v1/upload/avatar";

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, token, setUser } = useAuth();

  const [name, setName] = useState(user?.name ?? "");
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [favoritePromotion, setFavoritePromotion] = useState(user?.favoritePromotion ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saving, setSaving] = useState(false);

  async function pickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Please allow access to your photo library.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setUploadingAvatar(true);
    try {
      const storedToken = await SecureStore.getItemAsync("token");
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        name: `avatar.${asset.uri.split(".").pop() ?? "jpg"}`,
        type: asset.mimeType ?? "image/jpeg",
      } as any);

      const res = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${storedToken}` },
        body: formData,
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);

      const newUrl = json.data.url;
      setAvatarUri(newUrl);
      setUser({ ...user!, avatarUrl: newUrl });
    } catch (e: any) {
      Alert.alert("Upload failed", e.message ?? "Could not upload image.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function save() {
    if (!name.trim()) {
      Alert.alert("Required", "Display name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch<{ data: any; error: string | null }>("/me", {
        name: name.trim(),
        favoritePromotion: favoritePromotion || undefined,
      });
      if (res.error) throw new Error(res.error);
      setUser({ ...user!, ...res.data });
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1 bg-background"
    >
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-6 pt-6 pb-16"
        keyboardShouldPersistTaps="handled"
      >
        {/* Back */}
        <TouchableOpacity onPress={() => router.back()} className="mb-6">
          <Text className="text-yellow font-bold">← Back</Text>
        </TouchableOpacity>

        <Text className="text-white text-2xl font-black italic mb-6">EDIT PROFILE</Text>

        {/* Avatar picker */}
        <View className="items-center mb-6">
          <TouchableOpacity onPress={pickAvatar} disabled={uploadingAvatar}>
            <View className="relative">
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={{ width: 96, height: 96, borderRadius: 48 }}
                  className="bg-surface border-2 border-border items-center justify-center"
                >
                  <Text className="text-muted text-3xl font-black">
                    {user?.name?.[0]?.toUpperCase() ?? "?"}
                  </Text>
                </View>
              )}
              {/* Edit badge */}
              <View className="absolute bottom-0 right-0 bg-yellow rounded-full w-7 h-7 items-center justify-center border-2 border-background">
                {uploadingAvatar ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Text className="text-black text-xs font-black">+</Text>
                )}
              </View>
            </View>
          </TouchableOpacity>
          <Text className="text-muted text-xs mt-2">Tap to change photo</Text>
        </View>

        {/* Display Name */}
        <Text className="text-muted text-xs uppercase tracking-wider mb-1 font-semibold">
          Display Name
        </Text>
        <TextInput
          placeholder="Your wrestling name"
          placeholderTextColor="#6B7280"
          value={name}
          onChangeText={setName}
          className="bg-surface border border-border rounded-xl px-4 py-3 text-white text-sm mb-4"
        />

        {/* Favourite Promotion */}
        <Text className="text-muted text-xs uppercase tracking-wider mb-2 font-semibold">
          Favourite Promotion
        </Text>
        <View className="flex-row flex-wrap gap-2 mb-6">
          {PROMOTIONS.map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setFavoritePromotion(favoritePromotion === p ? "" : p)}
              className={`px-4 py-2 rounded-full border ${
                favoritePromotion === p
                  ? "bg-yellow border-yellow"
                  : "border-border"
              }`}
            >
              <Text className={`text-xs font-bold ${favoritePromotion === p ? "text-black" : "text-muted"}`}>
                {p}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          label="Save Changes"
          onPress={save}
          loading={saving}
          fullWidth
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
