import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { api } from "@/lib/api";
import { ApiResponse } from "@/lib/types";
import { useAuth } from "@/store/auth";
import Button from "@/components/Button";

type FeedItem = {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  user: { id: string; name: string; slug: string; avatarUrl: string | null };
  event: { id: string; title: string; slug: string; date: string; promotion: string; posterUrl?: string };
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function FeedScreen() {
  const router = useRouter();
  const { token } = useAuth();
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchFeed() {
    const res = await api.get<ApiResponse<FeedItem[]>>("/me/feed").catch(() => ({ data: [] as FeedItem[] }));
    setFeed(res.data ?? []);
  }

  useEffect(() => {
    if (token) {
      setLoading(true);
      fetchFeed().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  }, []);

  if (!token) {
    return (
      <View className="flex-1 bg-background items-center justify-center px-8">
        <Text className="text-white text-xl font-black italic mb-2">FOLLOW FANS</Text>
        <Text className="text-muted text-center text-sm mb-8">
          Sign in and follow other fans to see their reviews here.
        </Text>
        <Button label="Sign In" onPress={() => router.push("/(auth)/login")} fullWidth />
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
      <View className="px-4 pt-4 pb-10">
        {loading ? (
          <ActivityIndicator color="#F5C518" className="mt-20" />
        ) : feed.length === 0 ? (
          <View className="items-center mt-20">
            <Text className="text-white text-lg font-black italic mb-2">NOTHING YET</Text>
            <Text className="text-muted text-center text-sm">
              Follow other fans from event reviews to see their activity here.
            </Text>
          </View>
        ) : (
          feed.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => router.push(`/events/${item.event.slug}`)}
              className="bg-surface border border-border rounded-xl p-4 mb-3"
            >
              {/* Reviewer */}
              <View className="flex-row items-center mb-3">
                {item.user.avatarUrl ? (
                  <Image
                    source={{ uri: item.user.avatarUrl }}
                    style={{ width: 34, height: 34, borderRadius: 17 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-[34px] h-[34px] rounded-full bg-yellow items-center justify-center">
                    <Text className="text-black text-xs font-black">
                      {(item.user.name ?? "?")[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View className="ml-2 flex-1">
                  <Text className="text-white text-sm font-bold">{item.user.name}</Text>
                  <Text className="text-muted text-xs">{timeAgo(item.createdAt)}</Text>
                </View>
                <Text className="text-yellow font-black text-base">★ {item.rating.toFixed(1)}</Text>
              </View>

              {/* Event */}
              <View className="flex-row items-center mb-2">
                {item.event.posterUrl ? (
                  <Image
                    source={{ uri: item.event.posterUrl }}
                    style={{ width: 48, height: 48, borderRadius: 8 }}
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-12 h-12 rounded-lg bg-subtle" />
                )}
                <View className="ml-3 flex-1">
                  <View className="bg-cyan/20 border border-cyan/30 rounded px-1.5 py-0.5 self-start mb-1">
                    <Text className="text-cyan text-[9px] font-bold uppercase">{item.event.promotion}</Text>
                  </View>
                  <Text className="text-white text-sm font-bold leading-snug" numberOfLines={2}>
                    {item.event.title}
                  </Text>
                </View>
              </View>

              {/* Comment */}
              {item.comment && (
                <Text className="text-muted text-sm leading-relaxed" numberOfLines={3}>
                  "{item.comment}"
                </Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}
