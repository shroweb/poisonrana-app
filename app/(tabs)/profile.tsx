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
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/store/auth";
import { api } from "@/lib/api";
import { ApiResponse, WatchlistItem } from "@/lib/types";
import Button from "@/components/Button";
import EventCard from "@/components/EventCard";
import Constants from "expo-constants";

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

type MyPrediction = {
  eventId: string;
  slug: string;
  correct: number;
  total: number;
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

type WatchTab = "want" | "watched" | "attended";

export default function ProfileScreen() {
  const router = useRouter();
  const { token, user, logout } = useAuth();
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [reviews, setReviews] = useState<MyReview[]>([]);
  const [predictions, setPredictions] = useState<MyPrediction[]>([]);
  const [rank, setRank] = useState<{ rank: number | null; total: number } | null>(null);
  const [followCounts, setFollowCounts] = useState<{ following: number; followers: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"watchlist" | "reviews" | "predictions">("watchlist");
  const [watchTab, setWatchTab] = useState<WatchTab>("want");

  async function fetchData() {
    if (!token) return;
    const [wl, rv, rk, fw, fr, pred] = await Promise.allSettled([
      api.get<ApiResponse<WatchlistItem[]>>("/me/watchlist"),
      api.get<ApiResponse<MyReview[]>>("/me/reviews"),
      api.get<ApiResponse<{ rank: number | null; total: number }>>("/me/rank"),
      api.get<ApiResponse<{ id: string }[]>>("/me/following"),
      api.get<ApiResponse<{ id: string }[]>>("/me/followers"),
      api.get<ApiResponse<MyPrediction[]>>("/me/predictions"),
    ]);
    if (wl.status === "fulfilled") setWatchlist(wl.value.data ?? []);
    if (rv.status === "fulfilled") setReviews(rv.value.data ?? []);
    if (rk.status === "fulfilled") setRank(rk.value.data ?? null);
    if (pred.status === "fulfilled") setPredictions(pred.value.data ?? []);
    const followingCount = fw.status === "fulfilled" ? (fw.value.data ?? []).length : 0;
    const followersCount = fr.status === "fulfilled" ? (fr.value.data ?? []).length : 0;
    if (fw.status === "fulfilled" || fr.status === "fulfilled") {
      setFollowCounts({ following: followingCount, followers: followersCount });
    }
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

  async function updateWatchStatus(eventId: string, field: "watched" | "attended", value: boolean) {
    await api.patch("/me/watchlist", { eventId, [field]: value });
    setWatchlist((prev) =>
      prev.map((w) =>
        w.event.id === eventId ? { ...w, [field]: value, ...(field === "attended" && value ? { watched: true } : {}) } : w
      )
    );
  }

  const wantItems = watchlist.filter((w) => !w.watched && !w.attended);
  const watchedItems = watchlist.filter((w) => w.watched && !w.attended);
  const attendedItems = watchlist.filter((w) => w.attended);

  const watchTabItems = watchTab === "want" ? wantItems : watchTab === "watched" ? watchedItems : attendedItems;

  // Not logged in
  if (!token || !user) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-yellow text-4xl font-black italic mb-2">POISON RANA</Text>
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
      <View style={{ paddingBottom: 24 }}>
        <LinearGradient
          colors={["#1a2540", "#0B1120"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View className="items-center pt-10 pb-2 px-4">
          <View style={{ width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: "#F5C518", overflow: "hidden", marginBottom: 12 }}>
            <Avatar url={user.avatarUrl} name={user.name} size={90} />
          </View>
          <Text className="text-white text-2xl font-black italic">
            {(user.name ?? "").toUpperCase()}
          </Text>
          <Text className="text-muted text-sm mt-0.5">@{user.slug}</Text>
          {user.favoritePromotion && (
            <View className="mt-2 bg-cyan/20 border border-cyan/40 rounded-full px-4 py-1">
              <Text className="text-cyan text-xs font-bold uppercase tracking-wide">{user.favoritePromotion}</Text>
            </View>
          )}
          {followCounts && (
            <View className="flex-row gap-6 mt-4">
              <View className="items-center">
                <Text className="text-white font-black text-lg">{followCounts.following}</Text>
                <Text className="text-muted text-[10px] uppercase tracking-wide">Following</Text>
              </View>
              <View className="w-px bg-border" />
              <View className="items-center">
                <Text className="text-white font-black text-lg">{followCounts.followers}</Text>
                <Text className="text-muted text-[10px] uppercase tracking-wide">Followers</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Stats row */}
      {!loading && (
        <View className="flex-row mx-4 mb-4 bg-surface border border-border rounded-xl overflow-hidden" style={{ marginTop: -8 }}>
          <TouchableOpacity className="flex-1 items-center py-3 border-r border-border" onPress={() => setActiveTab("reviews")}>
            <Text className="text-white font-black text-base">{reviews.length}</Text>
            <Text className="text-muted text-[10px] uppercase tracking-wide">Reviews</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 items-center py-3 border-r border-border" onPress={() => setActiveTab("watchlist")}>
            <Text className="text-white font-black text-base">{watchlist.length}</Text>
            <Text className="text-muted text-[10px] uppercase tracking-wide">Watchlist</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 items-center py-3" onPress={() => router.push("/leaderboard")}>
            <Text className="text-white font-black text-base">
              {rank?.rank != null ? `#${rank.rank}` : "—"}
            </Text>
            <Text className="text-muted text-[10px] uppercase tracking-wide">Pred. Rank</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Actions */}
      <View className="px-4 mb-4 flex-row gap-3">
        <View style={{ flex: 1 }}>
          <Button label="Edit Profile" onPress={() => router.push("/profile/edit")} variant="outline" fullWidth />
        </View>
        <View style={{ flex: 1 }}>
          <Button label="Sign Out" onPress={handleLogout} variant="ghost" fullWidth />
        </View>
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
          { key: "watchlist", label: `Watchlist` },
          { key: "reviews", label: `Reviews` },
          { key: "predictions", label: `Predictions` },
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
        <View className="pb-10">
          {/* Watchlist sub-tabs */}
          <View className="flex-row mx-4 mb-4 bg-surface border border-border rounded-xl overflow-hidden">
            {([
              { key: "want", label: "Want to Watch", count: wantItems.length },
              { key: "watched", label: "Watched", count: watchedItems.length },
              { key: "attended", label: "Attended", count: attendedItems.length },
            ] as const).map((t) => (
              <TouchableOpacity
                key={t.key}
                onPress={() => setWatchTab(t.key)}
                style={{ flex: 1, alignItems: "center", paddingVertical: 10, backgroundColor: watchTab === t.key ? "rgba(245,197,24,0.1)" : "transparent" }}
              >
                <Text style={{ color: watchTab === t.key ? "#F5C518" : "#6B7280", fontSize: 10, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {t.label}
                </Text>
                <Text style={{ color: watchTab === t.key ? "#F5C518" : "#9CA3AF", fontSize: 14, fontWeight: "900", marginTop: 2 }}>
                  {t.count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {watchTabItems.length === 0 ? (
            <View className="items-center mt-10 px-8">
              <Text className="text-muted text-center">
                {watchTab === "want"
                  ? "No events on your watchlist yet."
                  : watchTab === "watched"
                  ? "You haven't marked any events as watched."
                  : "No attended events yet."}
              </Text>
            </View>
          ) : (
            <View className="px-4 flex-row flex-wrap justify-between">
              {watchTabItems.map((item) => (
                <View key={item.id} className="relative">
                  <EventCard event={item.event} />
                  {/* Status actions */}
                  <View style={{ position: "absolute", bottom: 10, left: 8, right: 8, flexDirection: "row", gap: 4 }}>
                    {watchTab === "want" && (
                      <TouchableOpacity
                        onPress={() => updateWatchStatus(item.event.id, "watched", true)}
                        style={{ flex: 1, backgroundColor: "rgba(245,197,24,0.9)", borderRadius: 6, paddingVertical: 4, alignItems: "center" }}
                      >
                        <Text style={{ color: "#000", fontSize: 9, fontWeight: "800" }}>MARK WATCHED</Text>
                      </TouchableOpacity>
                    )}
                    {watchTab === "watched" && (
                      <TouchableOpacity
                        onPress={() => updateWatchStatus(item.event.id, "attended", true)}
                        style={{ flex: 1, backgroundColor: "rgba(34,211,238,0.9)", borderRadius: 6, paddingVertical: 4, alignItems: "center" }}
                      >
                        <Text style={{ color: "#000", fontSize: 9, fontWeight: "800" }}>MARK ATTENDED</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={() => removeFromWatchlist(item.event.id)}
                      style={{ backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, alignItems: "center" }}
                    >
                      <Ionicons name="trash-outline" size={11} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      ) : activeTab === "reviews" ? (
        <View className="px-4 pb-10">
          {reviews.length === 0 ? (
            <View className="items-center mt-10">
              <Text className="text-muted text-center">You haven't reviewed any events yet.</Text>
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
      ) : (
        <View className="px-4 pb-10">
          {predictions.length === 0 ? (
            <View className="items-center mt-10">
              <Text className="text-muted text-center">No predictions made yet.</Text>
            </View>
          ) : (
            predictions.map((pred) => {
              const accuracy = pred.total > 0 ? Math.round((pred.correct / pred.total) * 100) : null;
              return (
                <TouchableOpacity
                  key={pred.eventId}
                  onPress={() => router.push(`/predictions/${pred.slug}`)}
                  className="bg-surface border border-border rounded-xl p-4 mb-3 flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="text-white font-bold text-sm">{pred.slug.replace(/-/g, " ").toUpperCase()}</Text>
                    <Text className="text-muted text-xs mt-0.5">
                      {pred.correct}/{pred.total} correct
                    </Text>
                  </View>
                  {accuracy !== null ? (
                    <View style={{ alignItems: "center" }}>
                      <Text style={{ color: accuracy >= 60 ? "#22d3ee" : accuracy >= 40 ? "#F5C518" : "#9CA3AF", fontWeight: "900", fontSize: 18 }}>
                        {accuracy}%
                      </Text>
                      <Text className="text-muted text-[9px] uppercase tracking-wide">Accuracy</Text>
                    </View>
                  ) : (
                    <Text className="text-muted text-xs">Pending</Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}

      <Text className="text-muted text-[10px] text-center pb-6 pt-2">
        v{Constants.expoConfig?.version ?? "—"}
      </Text>
    </ScrollView>
  );
}
