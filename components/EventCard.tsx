import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Event } from "@/lib/types";

const CARD_WIDTH = (Dimensions.get("window").width - 48) / 2;
const CARD_HEIGHT = CARD_WIDTH * 1.45;

interface Props {
  event: Event;
  rank?: number;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function countdownLabel(dateStr: string): string | null {
  const today = new Date(new Date().toDateString()).getTime();
  const eventDay = new Date(new Date(dateStr).toDateString()).getTime();
  const diff = Math.round((eventDay - today) / (1000 * 60 * 60 * 24));
  if (diff < 0) return null;
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff <= 30) return `${diff} days`;
  return null;
}

export default function EventCard({ event, rank }: Props) {
  const router = useRouter();
  const countdown = countdownLabel(event.date);

  return (
    <TouchableOpacity
      onPress={() => router.push(`/events/${event.slug}`)}
      className="mb-4"
      style={{ width: CARD_WIDTH }}
      activeOpacity={0.85}
    >
      <View style={{ borderRadius: 12, overflow: "hidden", height: CARD_HEIGHT }}>
        {/* Poster image */}
        {event.posterUrl ? (
          <Image
            source={{ uri: event.posterUrl }}
            style={{ width: CARD_WIDTH, height: CARD_HEIGHT }}
            contentFit="cover"
          />
        ) : (
          <View style={{ width: CARD_WIDTH, height: CARD_HEIGHT }} className="bg-surface items-center justify-center">
            <Text className="text-muted text-xs text-center px-2">{event.title}</Text>
          </View>
        )}

        {/* Bottom gradient overlay */}
        <LinearGradient
          colors={["transparent", "rgba(11,17,32,0.6)", "rgba(11,17,32,0.97)"]}
          locations={[0.35, 0.65, 1]}
          style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: CARD_HEIGHT * 0.75 }}
        />

        {/* Top-left: rank badge */}
        {rank !== undefined && (
          <View style={{ position: "absolute", top: 8, left: 8, backgroundColor: "#F5C518", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: "#000", fontSize: 10, fontWeight: "800" }}>#{rank}</Text>
          </View>
        )}

        {/* Top-right: countdown or rating badge */}
        {rank === undefined && countdown ? (
          <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "#F5C518", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ color: "#000", fontSize: 10, fontWeight: "800" }}>{countdown}</Text>
          </View>
        ) : event.averageRating > 0 ? (
          <View style={{ position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 6, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 1, borderColor: "rgba(245,197,24,0.35)" }}>
            <Text style={{ color: "#F5C518", fontSize: 10, fontWeight: "700" }}>★ {event.averageRating.toFixed(1)}</Text>
          </View>
        ) : null}

        {/* Bottom overlay: title, promotion, date */}
        <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: 10 }}>
          <Text style={{ color: "#22d3ee", fontSize: 8, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 }}>
            {event.promotion}
          </Text>
          <Text style={{ color: "#FFFFFF", fontWeight: "800", fontSize: 11, lineHeight: 14, marginBottom: 2 }} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={{ color: "#9CA3AF", fontSize: 9 }}>
            {formatDate(event.date)}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
