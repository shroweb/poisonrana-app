import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image } from "expo-image";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { ApiResponse, WatchlistItem, Review } from "@/lib/types";
import Button from "@/components/Button";
import EventCard from "@/components/EventCard";

type MyReview = {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  event: {
    id: string;
    title: string;
    slug: string;
    date: string;
    promotion: string;
    posterUrl?: string;
  };
};

function Avatar({ url, name, size = 80 }: { url?: string | null; name: string; size?: number }) {
  const initials = (name ?? "")
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }

  return (
    <View
      style={{ width: size, height: size, borderRadius: size / 2 }}
      className="bg-yellow items-center justify-center"
    >
      <Text style={{ fontSize: size * 0.35 }} className="text-black font-black">
        {initials}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { token, user, logout } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [rank, setRank] = useState<{ rank: number | null; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"watchlist" | "reviews">("watchlist");

  async function fetchData() {
    if (!token) return;
    const [wl, rv, rk] = await Promise.allSettled([
      api.get<ApiResponse<WatchlistItem[]>>("/me/watchlist"),
      api.get<ApiResponse<MyReview[]>>("/me/reviews"),
      api.get<ApiResponse<{ rank: number | null; total: number }>>("/me/rank"),
    ]);
    if (wl.status === "fulfilled") setWatchlist(wl.value.data ?? []);
    if (rv.status === "fulfilled") setReviews(rv.value.data ?? []);
    if (rk.status === "fulfilled") setRank(rk.value.data ?? null);
  }

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchData().finally(() => setLoading(false));
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [token]);

  async function handleLogout() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); } },
    ]);
  }

  async function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account, reviews, watchlist, and all data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await api.delete("/me", {});
              await logout();
            } catch {
              Alert.alert("Error", "Failed to delete account. Please try again.");
            }
          },
        },
      ]
    );
  }

  async function removeFromWatchlist(eventId: string) {
    await api.delete("/me/watchlist", { eventId });
    setWatchlist((prev) => prev.filter((w) => w.event.id !== eventId));
  }

  // Not logged in
  if (!token || !user) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-yellow text-4xl font-black italic mb-2">
          POISON RANA
        </Text>
        <Text className="text-muted text-center text-sm mb-8">
          Sign in to track your watchlist, leave reviews, and make predictions.
        </Text>
        <View className="w-full gap-3">
          <Button label="Sign In" onPress={() => router.push("/(auth)/login")} fullWidth />
          <Button label="Join Free" onPress={() => router.push("/(auth)/register")} variant="outline" fullWidth />
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-background"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C518" />
      }
    >
      {/* Profile header */}
      <View className="px-4 pt-6 pb-6 items-center">
        <Avatar url={user.avatarUrl} name={user.name} size={88} />
        <Text className="text-white text-xl font-black italic mt-3">
          {(user.name ?? "").toUpperCase()}
        </Text>
        <Text className="text-muted text-xs mt-1">@{user.slug}</Text>
        {user.favoritePromotion && (
          <View className="mt-2 bg-yellow/10 border border-yellow/30 rounded-md px-3 py-1">
            <Text className="text-yellow text-xs font-bold">{user.favoritePromotion}</Text>
          </View>
        )}
        {rank?.rank != null && (
          <View className="mt-2 bg-surface border border-border rounded-md px-3 py-1">
            <Text className="text-muted text-xs">
              Prediction rank{" "}
              <Text className="text-white font-bold">#{rank.rank}</Text>
              <Text className="text-muted"> / {rank.total}</Text>
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View className="px-4 mb-4 gap-3">
        <Button label="Edit Profile" onPress={() => router.push("/profile/edit")} variant="outline" fullWidth />
        <Button label="Sign Out" onPress={handleLogout} variant="ghost" fullWidth />
      </View>

      {/* Secondary links */}
      <View className="mx-4 mb-6 border border-border rounded-xl overflow-hidden">
        <TouchableOpacity
          onPress={() => router.push("/privacy")}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <Text className="text-white text-sm">Privacy Policy</Text>
          <Text className="text-muted text-sm">›</Text>
        </TouchableOpacity>
        <View className="h-px bg-border" />
        <TouchableOpacity
          onPress={handleDeleteAccount}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <Text className="text-red-500 text-sm">Delete Account</Text>
          <Text className="text-red-500 text-sm">›</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row border-b border-border px-4 mb-4">
        {([
          { key: "watchlist", label: `Watchlist (${watchlist.length})` },
          { key: "reviews", label: `Reviews (${reviews.length})` },
        ] as const).map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`px-4 py-3 mr-2 ${activeTab === tab.key ? "border-b-2 border-yellow" : ""}`}
          >
            <Text className={`text-sm font-bold uppercase tracking-wider ${activeTab === tab.key ? "text-yellow" : "text-muted"}`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color="#F5C518" className="mt-10" />
      ) : activeTab === "watchlist" ? (
        <View className="px-4 pb-10">
          {watchlist.length === 0 ? (
            <View className="items-center mt-10">
              <Text className="text-muted text-center">
                Your watchlist is empty.{"\n"}Add events to watch later.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap justify-between">
              {watchlist.map((item) => (
                <View key={item.id} className="relative">
                  <EventCard event={item.event} />
                  <TouchableOpacity
                    onPress={() => removeFromWatchlist(item.event.id)}
                    className="absolute top-2 right-2 bg-background/80 rounded-full w-6 h-6 items-center justify-center"
                  >
                    <Text className="text-white text-xs">×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View className="px-4 pb-10">
          {reviews.length === 0 ? (
            <View className="items-center mt-10">
              <Text className="text-muted text-center">
                You haven't reviewed any events yet.
              </Text>
            </View>
          ) : (
            reviews.map((review) => (
              <TouchableOpacity
                key={review.id}
                onPress={() => router.push(`/events/${review.event.slug}`)}
                className="bg-surface border border-border rounded-xl p-4 mb-3"
              >
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-1 mr-3">
                    <View className="bg-cyan/20 border border-cyan/30 rounded px-1.5 py-0.5 self-start mb-1">
                      <Text className="text-cyan text-[9px] font-bold uppercase">{review.event.promotion}</Text>
                    </View>
                    <Text className="text-white font-bold text-sm leading-tight">{review.event.title}</Text>
                    <Text className="text-muted text-xs mt-0.5">
                      {new Date(review.event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </Text>
                  </View>
                  <Text className="text-yellow font-black text-base">★ {review.rating.toFixed(1)}</Text>
                </View>
                {review.comment && (
                  <Text className="text-muted text-sm leading-relaxed" numberOfLines={3}>
                    {review.comment}
                  </Text>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </ScrollView>
  );
}
