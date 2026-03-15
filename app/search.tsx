import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState, useEffect } from "react";
import { useRouter } from "expo-router";
import { Image } from "expo-image";
import { api } from "@/lib/api";
import { ApiResponse, Event, Wrestler, User } from "@/lib/types";

interface SearchResults {
  events: Event[];
  wrestlers: Wrestler[];
  users: User[];
}

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get<ApiResponse<SearchResults>>("/search", { q: query });
        setResults(res.data);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <View className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-3">
        <View className="bg-surface border border-border rounded-xl px-4 py-3 flex-row items-center">
          <Text className="text-muted mr-2">🔍</Text>
          <TextInput
            autoFocus
            placeholder="Search events, wrestlers, fans..."
            placeholderTextColor="#6B7280"
            className="flex-1 text-white text-sm"
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator color="#F5C518" className="mt-10" />
      ) : !results ? (
        <View className="items-center mt-20">
          <Text className="text-muted text-sm">Type to search...</Text>
        </View>
      ) : (
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Events */}
          {results.events.length > 0 && (
            <View className="mb-6">
              <Text className="text-muted text-xs uppercase tracking-wider font-bold mb-2">
                Events
              </Text>
              {results.events.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  onPress={() => router.push(`/events/${event.slug}`)}
                  className="flex-row items-center bg-surface border border-border rounded-xl p-3 mb-2"
                >
                  {event.posterUrl ? (
                    <Image
                      source={{ uri: event.posterUrl }}
                      style={{ width: 40, height: 56, borderRadius: 6 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-10 h-14 rounded-md bg-subtle" />
                  )}
                  <View className="flex-1 ml-3">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>
                      {event.title}
                    </Text>
                    <Text className="text-muted text-xs">{event.promotion}</Text>
                  </View>
                  {event.averageRating > 0 && (
                    <Text className="text-yellow text-xs font-bold">
                      ★ {event.averageRating.toFixed(2)}
                    </Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Wrestlers */}
          {results.wrestlers.length > 0 && (
            <View className="mb-6">
              <Text className="text-muted text-xs uppercase tracking-wider font-bold mb-2">
                Wrestlers
              </Text>
              {results.wrestlers.map((w) => (
                <TouchableOpacity
                  key={w.id}
                  onPress={() => router.push(`/wrestlers/${w.slug}`)}
                  className="flex-row items-center bg-surface border border-border rounded-xl p-3 mb-2"
                >
                  {w.imageUrl ? (
                    <Image
                      source={{ uri: w.imageUrl }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-10 h-10 rounded-full bg-subtle items-center justify-center">
                      <Text>🥊</Text>
                    </View>
                  )}
                  <Text className="text-white font-bold text-sm ml-3">{w.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Users */}
          {results.users.length > 0 && (
            <View className="mb-6">
              <Text className="text-muted text-xs uppercase tracking-wider font-bold mb-2">
                Fans
              </Text>
              {results.users.map((u) => (
                <View
                  key={u.id}
                  className="flex-row items-center bg-surface border border-border rounded-xl p-3 mb-2"
                >
                  <View className="w-10 h-10 rounded-full bg-yellow items-center justify-center">
                    <Text className="text-black font-black text-sm">
                      {u.name[0].toUpperCase()}
                    </Text>
                  </View>
                  <View className="ml-3">
                    <Text className="text-white font-bold text-sm">{u.name}</Text>
                    <Text className="text-muted text-xs">@{u.slug}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {results.events.length === 0 &&
            results.wrestlers.length === 0 &&
            results.users.length === 0 && (
              <View className="items-center mt-10">
                <Text className="text-muted">No results for "{query}"</Text>
              </View>
            )}
        </ScrollView>
      )}
    </View>
  );
}
