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
import { Event, ApiResponse } from "@/lib/types";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/store/auth";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function PredictionsScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchEvents() {
    // Fetch recent + upcoming events (date_desc puts newest/upcoming first)
    const res = await api.get<ApiResponse<Event[]>>("/events", {
      limit: 100,
      sort: "date_desc",
    });
    const all = res.data ?? [];
    const today = new Date(new Date().toDateString()); // midnight local
    // Keep events that haven't ended yet (date >= today) with predictions enabled
    const upcoming = all.filter(
      (e) => new Date(e.date) >= today && e.enablePredictions
    );
    setEvents(upcoming);
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
            <View>
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
            <View className="bg-yellow/10 border border-yellow/30 rounded-full w-12 h-12 items-center justify-center">
              <Ionicons name="checkmark-circle" size={24} color="#F5C518" />
            </View>
          </View>
        )}

        {/* Upcoming events with predictions */}
        <Text className="text-muted text-xs uppercase tracking-wider font-semibold mb-3">
          Open for Predictions
        </Text>

        {loading ? (
          <ActivityIndicator color="#F5C518" className="mt-10" />
        ) : events.length === 0 ? (
          <View className="items-center mt-16">
            <Text className="text-white text-2xl font-black italic mb-2">NO EVENTS</Text>
            <Text className="text-muted text-sm text-center">
              No upcoming events with predictions open right now.{"\n"}Check back soon.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() => router.push(`/events/${event.slug}`)}
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
                    <Text className="text-yellow text-[9px] font-bold uppercase">Predictions Open</Text>
                  </View>
                </View>
                <Text className="text-white font-bold text-sm leading-tight mb-1" numberOfLines={2}>
                  {event.title}
                </Text>
                <Text className="text-muted text-xs">{formatDate(event.date)}</Text>
              </View>
            </TouchableOpacity>
          ))
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
    </ScrollView>
  );
}
