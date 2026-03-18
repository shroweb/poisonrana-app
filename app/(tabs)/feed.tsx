import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useRouter, useNavigation } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
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

type Notification = {
  id: string;
  type: string;
  message: string;
  detail?: string;
  link?: string;
  read: boolean;
  createdAt: string;
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
  const navigation = useNavigation();
  const { token } = useAuth();
  const [tab, setTab] = useState<"following" | "notifications">("notifications");
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unread, setUnread] = useState(0);

  async function fetchFeed() {
    const res = await api.get<ApiResponse<FeedItem[]>>("/me/feed").catch(() => ({ data: [] as FeedItem[] }));
    setFeed(res.data ?? []);
  }

  async function fetchNotifications() {
    const res = await api
      .get<ApiResponse<Notification[]>>("/me/notifications")
      .catch(() => ({ data: [] as Notification[] }));
    const data = (res.data ?? []).filter((n) => n.type !== "review");
    // Server returns original read state before marking them as read
    const count = data.filter((n) => !n.read).length;
    setUnread(count);
    setNotifications(data);
  }

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    Promise.all([fetchFeed(), fetchNotifications()]).finally(() => setLoading(false));
  }, [token]);

  // Sync tab bar badge with unread count
  useEffect(() => {
    navigation.setOptions({ tabBarBadge: unread > 0 ? unread : undefined });
  }, [unread]);

  // When switching to notifications tab, clear badge and refresh
  useEffect(() => {
    if (tab === "notifications" && token) {
      setUnread(0);
      fetchNotifications();
    }
  }, [tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (tab === "following") await fetchFeed();
    else await fetchNotifications();
    setRefreshing(false);
  }, [tab]);

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
    <View className="flex-1 bg-background">
      {/* Tabs */}
      <View className="flex-row border-b border-border px-4">
        {(["notifications", "following"] as const).map((t) => (
          <TouchableOpacity
            key={t}
            onPress={() => setTab(t)}
            className={`py-3 mr-4 ${tab === t ? "border-b-2 border-yellow" : ""}`}
          >
            <View className="flex-row items-center gap-1.5">
              <Text
                className={`text-xs font-bold uppercase tracking-wider ${
                  tab === t ? "text-yellow" : "text-muted"
                }`}
              >
                {t === "following" ? "Following" : "Notifications"}
              </Text>
              {t === "notifications" && unread > 0 && (
                <View className="bg-yellow rounded-full w-4 h-4 items-center justify-center">
                  <Text className="text-black text-[9px] font-black">{unread}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#F5C518" />
        }
      >
        <View className="px-4 pt-4 pb-10">
          {loading ? (
            <ActivityIndicator color="#F5C518" className="mt-20" />
          ) : tab === "following" ? (
            feed.length === 0 ? (
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
                  <TouchableOpacity
                    onPress={() => router.push(`/users/${item.user.slug}`)}
                    className="flex-row items-center mb-3"
                  >
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
                  </TouchableOpacity>

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

                  {item.comment && (
                    <Text className="text-muted text-sm leading-relaxed" numberOfLines={3}>
                      "{item.comment}"
                    </Text>
                  )}
                </TouchableOpacity>
              ))
            )
          ) : notifications.length === 0 ? (
            <View className="items-center mt-20">
              <Text className="text-white text-lg font-black italic mb-2">ALL CLEAR</Text>
              <Text className="text-muted text-center text-sm">
                You'll see likes on your reviews here.
              </Text>
            </View>
          ) : (
            notifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                onPress={() => {
                  if (!n.link) return;
                  let path = n.link;
                  if (!path.startsWith("/")) {
                    try { path = new URL(path).pathname; } catch { return; }
                  }
                  if (path && path !== "/") router.push(path as any);
                }}
                activeOpacity={n.link ? 0.7 : 1}
                className="bg-surface border border-border rounded-xl px-4 py-3 mb-3 flex-row items-center"
              >
                <View style={{
                  width: 32, height: 32, borderRadius: 16, marginRight: 12,
                  alignItems: "center", justifyContent: "center",
                  backgroundColor:
                    n.message.toLowerCase().includes("not approved") || n.message.toLowerCase().includes("rejected") ? "rgba(239,68,68,0.15)" :
                    n.type === "prediction_correct" || n.message.toLowerCase().includes("called it") ? "rgba(34,197,94,0.15)" :
                    n.type === "reply" ? "rgba(96,165,250,0.15)" :
                    "rgba(245,197,24,0.15)",
                }}>
                  {(() => {
                    const msg = n.message.toLowerCase();
                    const isRejected = msg.includes("not approved") || msg.includes("rejected");
                    const isCalledIt = n.type === "prediction_correct" || msg.includes("called it");
                    const isReply = n.type === "reply";
                    const icon =
                      n.type === "review_like" ? "heart" :
                      n.type === "follow" ? "person-add" :
                      isReply ? "chatbubble" :
                      n.type === "review" ? "star" :
                      isCalledIt ? "checkmark-circle" :
                      isRejected ? "close-circle" :
                      "notifications";
                    const color =
                      isRejected ? "#EF4444" :
                      isCalledIt ? "#22c55e" :
                      isReply ? "#60a5fa" :
                      "#F5C518";
                    return <Ionicons name={icon} size={16} color={color} />;
                  })()}
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm leading-snug">{n.message.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "").trim()}</Text>
                  <Text className="text-muted text-[10px] mt-0.5">{timeAgo(n.createdAt)}</Text>
                </View>
                {n.link && <Ionicons name="chevron-forward" size={14} color="#374151" />}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
