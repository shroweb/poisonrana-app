import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useLocalSearchParams, useRouter, useNavigation } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { api } from "@/lib/api";
import { Event, Match, ApiResponse } from "@/lib/types";
import { useAuth } from "@/store/auth";
import ViewShot from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import * as Sharing from "expo-sharing";
import ShareCard from "@/components/ShareCard";

type MyPrediction = { matchId: string; predictedWinnerId: string };

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function PredictionMatchCard({
  match,
  prediction,
}: {
  match: Match;
  prediction: string | null; // participantId or null
}) {
  const hasResults = match.participants.some((p) => p.isWinner);

  // Group by team
  const teamMap = match.participants.reduce((acc, p) => {
    const key = p.team ?? 0;
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {} as Record<number, typeof match.participants>);
  const teams = Object.values(teamMap);

  // Determine result — find the predicted participant's team, check if any member of that team won
  // predictedWinnerId is wrestler.id
  const predictedParticipant = prediction
    ? match.participants.find((p) => p.wrestler.id === prediction)
    : null;
  const predictedCorrectly =
    hasResults &&
    predictedParticipant != null &&
    match.participants.some(
      (p) => p.team === predictedParticipant.team && p.isWinner
    );
  const predictedWrong =
    hasResults && prediction && !predictedCorrectly;

  return (
    <View className="bg-surface border border-border rounded-xl p-4 mb-3">
      {/* Match header */}
      <View className="flex-row justify-between items-start mb-3">
        <View className="flex-1 mr-2">
          <Text className="text-cyan text-[10px] font-bold uppercase tracking-wider mb-1">
            {match.type}
          </Text>
          <Text className="text-white font-bold text-sm leading-snug">
            {match.title}
          </Text>
        </View>
        {/* Result badge */}
        {hasResults && prediction ? (
          <View
            className={`flex-row items-center px-2 py-1 rounded-lg border ${
              predictedCorrectly
                ? "bg-green-500/10 border-green-500/30"
                : "bg-red-500/10 border-red-500/30"
            }`}
          >
            <Ionicons
              name={predictedCorrectly ? "checkmark-circle" : "close-circle"}
              size={14}
              color={predictedCorrectly ? "#22c55e" : "#ef4444"}
            />
            <Text
              className={`text-xs font-bold ml-1 ${
                predictedCorrectly ? "text-green-500" : "text-red-500"
              }`}
            >
              {predictedCorrectly ? "Called It!" : "Wrong Pick"}
            </Text>
          </View>
        ) : hasResults && !prediction ? (
          <View className="px-2 py-1 rounded-lg border border-border bg-subtle">
            <Text className="text-muted text-xs font-semibold">No Pick</Text>
          </View>
        ) : null}
      </View>

      {/* Teams */}
      <View className="mb-3">
        {teams.length >= 2 ? (
          teams.map((team, i) => {
            const teamWon = hasResults && team.some((p) => p.isWinner);
            const teamLost = hasResults && !teamWon;
            const isPredicted = prediction && team.some((p) => p.wrestler.id === prediction);
            return (
              <View key={i}>
                <View className="flex-row flex-wrap gap-1 items-center">
                  {team.map((p) => (
                    <View
                      key={p.id}
                      className={`rounded-md px-2 py-0.5 ${
                        teamWon
                          ? "bg-yellow/10 border border-yellow/30"
                          : "bg-subtle"
                      }`}
                    >
                      <Text
                        className={`text-[11px] font-semibold ${
                          teamWon
                            ? "text-yellow"
                            : teamLost
                            ? "text-muted"
                            : "text-white"
                        }`}
                      >
                        {p.wrestler.name}
                      </Text>
                    </View>
                  ))}
                  {/* "Your pick" label next to the team */}
                  {isPredicted && (
                    <Text className="text-[10px] text-muted italic ml-1">
                      ← your pick
                    </Text>
                  )}
                </View>
                {i < teams.length - 1 && (
                  <Text className="text-muted text-[10px] font-bold uppercase tracking-widest my-1.5 ml-0.5">
                    vs
                  </Text>
                )}
              </View>
            );
          })
        ) : (
          <View className="flex-row flex-wrap gap-1">
            {match.participants.map((p) => (
              <View key={p.id} className="bg-subtle rounded-md px-2 py-0.5">
                <Text className="text-white text-[11px] font-semibold">
                  {p.wrestler.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* No prediction made */}
      {!prediction && (
        <Text className="text-muted text-xs italic">No prediction made</Text>
      )}
    </View>
  );
}

export default function PredictionResultsScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const { token, user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [myPredictions, setMyPredictions] = useState<MyPrediction[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    const eventSlug = Array.isArray(slug) ? slug[0] : slug;
    async function load() {
      // First get the event (with matches)
      const eventRes = await api.get<ApiResponse<Event>>(`/events/${eventSlug}`);
      const ev = eventRes.data ?? null;
      setEvent(ev);

      // Then fetch the user's predictions for this event
      if (token && ev) {
        const pRes = await api
          .get<ApiResponse<MyPrediction[]>>("/predictions/me", { eventId: ev.id })
          .catch(() => ({ data: [] as MyPrediction[] }));
        setMyPredictions(pRes.data ?? []);
      }
    }

    load().finally(() => setLoading(false));
  }, [slug, token]);

  const predictionMap: Record<string, string> = {};
  myPredictions.forEach((p) => {
    predictionMap[p.matchId] = p.predictedWinnerId;
  });

  const matches = event?.matches ?? [];
  const totalPredicted = myPredictions.length;
  const correct = myPredictions.filter((p) => {
    const match = matches.find((m) => m.id === p.matchId);
    if (!match) return false;
    // predictedWinnerId is wrestler.id — find participant by wrestler.id
    const predicted = match.participants.find((part) => part.wrestler.id === p.predictedWinnerId);
    if (!predicted) return false;
    return match.participants.some(
      (part) => part.team === predicted.team && part.isWinner
    );
  }).length;

  const hasResults = matches.some((m) => m.participants.some((p) => p.isWinner));

  return (
    <ScrollView
      className="flex-1 bg-background"
      showsVerticalScrollIndicator={false}
    >
      <View className="px-4 pt-4 pb-10">
        {loading ? (
          <ActivityIndicator color="#F5C518" className="mt-20" />
        ) : !event ? (
          <Text className="text-muted text-center mt-20">Event not found</Text>
        ) : (
          <>
            {/* Event header */}
            <View className="flex-row gap-3 mb-5">
              {event.posterUrl ? (
                <Image
                  source={{ uri: event.posterUrl }}
                  style={{ width: 70, height: 70, borderRadius: 10 }}
                  contentFit="cover"
                />
              ) : null}
              <View className="flex-1 justify-center">
                <Text className="text-muted text-xs uppercase tracking-wider mb-1">
                  {event.promotion}
                </Text>
                <Text className="text-white font-black text-base leading-snug italic uppercase">
                  {event.title}
                </Text>
                <Text className="text-muted text-xs mt-1">
                  {formatDate(event.date)}
                </Text>
              </View>
            </View>

            {/* Score summary */}
            {hasResults && totalPredicted > 0 && (
              <View className="bg-surface border border-border rounded-xl p-4 mb-5 flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-muted text-xs uppercase tracking-wider font-semibold mb-1">
                    Your Score
                  </Text>
                  <Text className="text-white text-2xl font-black">
                    {correct}/{totalPredicted}{" "}
                    <Text className="text-muted text-sm font-normal">
                      correct
                    </Text>
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <TouchableOpacity onPress={handleShare} className="bg-yellow/10 border border-yellow/30 rounded-full w-10 h-10 items-center justify-center">
                    <Ionicons name="share-outline" size={18} color="#F5C518" />
                  </TouchableOpacity>
                  <View
                    className={`rounded-full w-14 h-14 items-center justify-center border ${
                      correct / totalPredicted >= 0.5
                        ? "bg-green-500/10 border-green-500/30"
                        : "bg-red-500/10 border-red-500/30"
                    }`}
                  >
                    <Text
                      className={`text-lg font-black ${
                        correct / totalPredicted >= 0.5
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {Math.round((correct / totalPredicted) * 100)}%
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* No predictions made */}
            {totalPredicted === 0 && (
              <View className="bg-surface border border-border rounded-xl p-4 mb-5">
                <Text className="text-muted text-sm text-center">
                  You didn't make any predictions for this event.
                </Text>
              </View>
            )}

            {/* Match list */}
            <Text className="text-muted text-xs uppercase tracking-wider font-semibold mb-3">
              Results
            </Text>
            {matches.map((match) => (
              <PredictionMatchCard
                key={match.id}
                match={match}
                prediction={predictionMap[match.id] ?? null}
              />
            ))}
          </>
        )}
      </View>
      {/* Hidden share card for capture */}
      {event && (
        <ViewShot ref={shareRef} options={{ format: "png", quality: 1 }} style={{ position: "absolute", left: -1000, top: -1000 }}>
          <ShareCard
            variant="event"
            username={user?.name ?? user?.email ?? "fan"}
            correct={correct}
            total={totalPredicted}
            logoUrl={logoUrl}
            eventName={event.title}
            posterUrl={event.posterUrl}
          />
        </ViewShot>
      )}
    </ScrollView>
  );
}
