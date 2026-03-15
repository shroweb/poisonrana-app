import { View, Text, TouchableOpacity, Dimensions } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Event } from "@/lib/types";

const CARD_WIDTH = (Dimensions.get("window").width - 48) / 2;

interface Props {
  event: Event;
  rank?: number;
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function EventCard({ event, rank }: Props) {
  const router = useRouter();

  return (
    <TouchableOpacity
      onPress={() => router.push(`/events/${event.slug}`)}
      className="mb-4"
      style={{ width: CARD_WIDTH }}
      activeOpacity={0.75}
    >
      <View className="relative rounded-xl overflow-hidden bg-surface">
        {event.posterUrl ? (
          <Image
            source={{ uri: event.posterUrl }}
            style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }}
            contentFit="cover"
          />
        ) : (
          <View
            style={{ width: CARD_WIDTH, height: CARD_WIDTH * 1.4 }}
            className="bg-subtle items-center justify-center"
          >
            <Text className="text-muted text-xs text-center px-2">
              {event.title}
            </Text>
          </View>
        )}

        {rank !== undefined && (
          <View className="absolute top-2 left-2 bg-yellow rounded-md px-1.5 py-0.5">
            <Text className="text-black text-[10px] font-bold">#{rank}</Text>
          </View>
        )}

        <View className="p-2">
          <Text
            className="text-white font-bold text-xs leading-tight"
            numberOfLines={2}
          >
            {event.title}
          </Text>
          <Text className="text-muted text-[10px] mt-0.5">
            {event.promotion}
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-yellow text-[10px] font-semibold">
              ★ {event.averageRating?.toFixed(2) ?? "—"}
            </Text>
            <Text className="text-muted text-[10px]">
              {formatDate(event.date)}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
