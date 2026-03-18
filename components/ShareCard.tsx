import React from "react";
import { View, Text } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";

const W = 320;
const H = 480;

interface Props {
  variant: "overall" | "event";
  username: string;
  correct: number;
  total: number;
  logoUrl: string | null;
  eventName?: string;
  posterUrl?: string | null;
}

export default function ShareCard({ variant, username, correct, total, logoUrl, eventName, posterUrl }: Props) {
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const good = pct >= 50;

  return (
    <View style={{ width: W, height: H, borderRadius: 20, overflow: "hidden" }}>
      {/* Background */}
      {variant === "event" && posterUrl ? (
        <>
          <Image
            source={{ uri: posterUrl }}
            style={{ position: "absolute", width: W, height: H }}
            contentFit="cover"
          />
          <LinearGradient
            colors={["rgba(11,17,32,0.25)", "rgba(11,17,32,0.7)", "rgba(11,17,32,0.97)"]}
            locations={[0, 0.5, 1]}
            style={{ position: "absolute", width: W, height: H }}
          />
        </>
      ) : (
        <LinearGradient
          colors={["#0d1b4b", "#0B1120", "#091e3a"]}
          start={{ x: 0.2, y: 0 }}
          end={{ x: 0.8, y: 1 }}
          style={{ position: "absolute", width: W, height: H }}
        />
      )}

      <View style={{ flex: 1, padding: 28, justifyContent: "space-between" }}>
        {/* Logo */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={{ width: 52, height: 52 }} contentFit="contain" />
          ) : (
            <View />
          )}
          <View style={{ backgroundColor: "rgba(245,197,24,0.15)", borderWidth: 1, borderColor: "rgba(245,197,24,0.4)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ color: "#F5C518", fontSize: 9, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 }}>
              My Predictions
            </Text>
          </View>
        </View>

        {/* Event name */}
        {variant === "event" && eventName && (
          <View style={{ alignItems: "center" }}>
            <Text style={{ color: "#FFFFFF", fontSize: 22, fontWeight: "900", fontStyle: "italic", lineHeight: 26, textAlign: "center" }}>
              {eventName.toUpperCase()}
            </Text>
          </View>
        )}

        {/* Score */}
        <View style={{ alignItems: "center" }}>
          <View style={{
            width: 148,
            height: 148,
            borderRadius: 74,
            backgroundColor: good ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            borderWidth: 3,
            borderColor: good ? "rgba(34,197,94,0.5)" : "rgba(239,68,68,0.5)",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}>
            <Text style={{ color: good ? "#22c55e" : "#ef4444", fontSize: 44, fontWeight: "900", lineHeight: 50 }}>
              {pct}%
            </Text>
          </View>
          <Text style={{ color: "#FFFFFF", fontSize: 32, fontWeight: "900", lineHeight: 36 }}>
            {correct}/{total}
          </Text>
          <Text style={{ color: "#9CA3AF", fontSize: 13, marginTop: 4 }}>
            correct predictions
          </Text>
        </View>

        {/* Footer */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: "#6B7280", fontSize: 11 }}>@{username}</Text>
          <Text style={{ color: "#6B7280", fontSize: 11 }}>poisonrana.com</Text>
        </View>
      </View>
    </View>
  );
}
