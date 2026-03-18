import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { api } from "@/lib/api";
import { Event, ApiResponse } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/store/auth";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import ShareCard from "@/components/ShareCard";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function PredictionsScreen() {
  const router = useRouter();
  const { user, token, hydrate } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [eventScores, setEventScores] = useState<Map<string, { correct: number; total: number }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const shareRef = useRef<ViewShot>(null);

  useEffect(() => {
    fetch("https://www.poisonrana.com/api/v1/config")
      .then((r) => r.json())
      .then((j) => setLogoUrl(j.data?.logoUrl ?? null))
      .catch(() => {});
  }, []);

  async function handleShare() {
    try {
      const uri = await (shareRef.current as any).capture();
      Alert.alert("Share Predictions", "", [
        {
          text: "Save to Photos",
          onPress: async () => {
            const { status } = await MediaLibrary.requestPermissionsAsync();
            if (status === "granted") {
              await MediaLibrary.saveToLibraryAsync(uri);
              Alert.alert("Saved", "Image saved to your photo library.");
            }
          },
        },
        {
          text: "Share",
          onPress: async () => {
            if (await Sharing.isAvailableAsync()) {
              await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share Predictions" });
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]);
    } catch {
      Alert.alert("Error", "Could not generate share image.");
    }
  }

  // Refresh user on mount so prediction score is up to date
  useEffect(() => {
    if (token) hydrate();
  }, [token]);

  async function fetchEvents() {
    const res = await api.get<ApiResponse<Event[]>>("/events", {
      limit: 200,
      sort: "date_desc",
    });
    const all = res.data ?? [];
    const today = new Date(new Date().toDateString());

    const upcoming = all.filter(
      (e) => new Date(e.date) >= today && e.enablePredictions
    );

    // For past events, only show ones the user has actually predicted on
    let predictedSlugs = new Set<string>();
    if (token) {
      const pRes = await api.get<ApiResponse<{ eventId: string; slug: string; correct: number; total: number }[]>>(
        "/predictions/me"
      ).catch(() => ({ data: [] as { eventId: string; slug: string; correct: number; total: number }[] }));
      predictedSlugs = new Set((pRes.data ?? []).map((e) => e.slug));
      const scoreMap = new Map((pRes.data ?? []).map((e) => [e.slug, { correct: e.correct, total: e.total }]));
      setEventScores(scoreMap);
    }

    const past = all.filter(
      (e) => new Date(e.date) < today && predictedSlugs.has(e.slug)
    );

    setEvents([...upcoming, ...past]);
  }

  useEffect(() => {
    setLoading(true);
    fetchEvents().finally(() => setLoading(false));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, []);

  const accuracy =
    user && (user as any).predictionCount > 0
      ? Math.round(((user as any).predictionScore / (user as any).predictionCount) * 100)
      : null;

  const today = new Date(new Date().toDateString());
  const upcomingEvents = events.filter((e) => new Date(e.date) >= today);
  const pastEvents = events.filter((e) => new Date(e.date) < today);

  function EventCard({ event, badge, href, score }: { event: Event; badge: string; href?: string; score?: { correct: number; total: number } }) {
    const pct = score && score.total > 0 ? Math.round((score.correct / score.total) * 100) : null;
    return (
      <TouchableOpacity
        key={event.id}
        onPress={() => router.push((href ?? `/events/${event.slug}`) as any)}
        className="bg-surface border border-border rounded-xl overflow-hidden mb-3 flex-row"
      >
        {event.posterUrl ? (
          <Image
            source={{ uri: event.posterUrl }}
            style={{ width: 80, height: 80 }}
            contentFit="cover"
          />
        ) : (
          <View style={{ width: 80, height: 80 }} className="bg-subtle items-center justify-center">
            <Text className="text-muted text-xs">No img</Text>
          </View>
        )}
        <View className="flex-1 p-3 justify-center">
          <View className="flex-row items-center mb-1">
            <View className="bg-cyan/20 border border-cyan/30 rounded px-1.5 py-0.5 mr-2">
              <Text className="text-cyan text-[9px] font-bold uppercase">{event.promotion}</Text>
            </View>
            <View className="bg-yellow/10 border border-yellow/30 rounded px-1.5 py-0.5">
              <Text className="text-yellow text-[9px] font-bold uppercase">{badge}</Text>
            </View>
          </View>
          <Text className="text-white font-bold text-sm leading-tight mb-1" numberOfLines={2}>
            {event.title}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-muted text-xs">{formatDate(event.date)}</Text>
            {pct !== null && (
              <Text className="text-yellow text-xs font-bold">{pct}% ({score!.correct}/{score!.total})</Text>
            )}
          </View>
        </View>
        <View className="items-center justify-center pr-3">
          <Ionicons name="chevron-forward" size={16} color="#6B7280" />
        </View>
      </TouchableOpacity>
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
        {/* Score card (logged in only) */}
        {token && (
          <View className="bg-surface border border-border rounded-xl p-4 mb-6 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-muted text-xs uppercase tracking-wider font-semibold mb-1">
                Your Prediction Score
              </Text>
              {accuracy !== null ? (
                <Text className="text-white text-2xl font-black">
                  {accuracy}%{" "}
                  <Text className="text-muted text-sm font-normal">
                    ({(user as any).predictionScore}/{(user as any).predictionCount} correct)
                  </Text>
                </Text>
              ) : (
                <Text className="text-muted text-sm">No predictions resolved yet</Text>
              )}
            </View>
            <View className="flex-row items-center gap-3">
              {accuracy !== null && (
                <TouchableOpacity onPress={handleShare} className="bg-yellow/10 border border-yellow/30 rounded-full w-10 h-10 items-center justify-center">
                  <Ionicons name="share-outline" size={18} color="#F5C518" />
                </TouchableOpacity>
              )}
              <View className="bg-yellow/10 border border-yellow/30 rounded-full w-12 h-12 items-center justify-center">
                <Ionicons name="checkmark-circle" size={24} color="#F5C518" />
              </View>
            </View>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color="#F5C518" className="mt-10" />
        ) : (
          <>
            {/* Upcoming events */}
            <Text className="text-muted text-xs uppercase tracking-wider font-semibold mb-3">
              Open for Predictions
            </Text>
            {upcomingEvents.length === 0 ? (
              <View className="items-center py-8 bg-surface border border-border rounded-xl mb-6">
                <Text className="text-muted text-sm">No upcoming events right now</Text>
              </View>
            ) : (
              <View className="mb-6">
                {upcomingEvents.map((event) => (
                  <EventCard key={event.id} event={event} badge="Predictions Open" />
                ))}
              </View>
            )}

            {/* Past events with results */}
            {pastEvents.length > 0 && (
              <>
                <Text className="text-muted text-xs uppercase tracking-wider font-semibold mb-3">
                  Recent Results
                </Text>
                {pastEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    badge="My Predictions"
                    href={`/predictions/${event.slug}`}
                    score={eventScores.get(event.slug)}
                  />
                ))}
              </>
            )}
          </>
        )}

        {!token && (
          <TouchableOpacity
            onPress={() => router.push("/(auth)/login")}
            className="mt-6 border border-yellow rounded-xl py-3 items-center"
          >
            <Text className="text-yellow font-bold text-sm uppercase tracking-wide">
              Sign in to make predictions
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Hidden share card for capture */}
      <ViewShot ref={shareRef} options={{ format: "png", quality: 1 }} style={{ position: "absolute", left: -1000, top: -1000 }}>
        <ShareCard
          variant="overall"
          username={user?.name ?? user?.email ?? "fan"}
          correct={(user as any)?.predictionScore ?? 0}
          total={(user as any)?.predictionCount ?? 0}
          logoUrl={logoUrl}
        />
      </ViewShot>
    </ScrollView>
  );
}
