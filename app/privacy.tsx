import { View, Text, ScrollView } from "react-native";

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View className="mb-6">
      <Text className="text-white font-bold text-base mb-2">{title}</Text>
      <Text className="text-muted text-sm leading-relaxed">{children}</Text>
    </View>
  );
}

export default function PrivacyScreen() {
  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-6 pt-6 pb-16">
      <Text className="text-yellow font-black text-2xl italic mb-1">Privacy Policy</Text>
      <Text className="text-muted text-xs mb-8">Last updated: March 2026</Text>

      <Section title="What we collect">
        {"When you create an account, we collect your name, email address, and optionally a profile photo. When you use the app, we store your watchlist, event reviews, ratings, and predictions."}
      </Section>

      <Section title="How we use your data">
        {"Your data is used to power the Poison Rana app — displaying your profile, watchlist, and reviews. We do not sell your personal data to third parties."}
      </Section>

      <Section title="Google Sign-In">
        {"If you sign in with Google, we receive your name, email address, and profile photo from Google. We do not receive your Google password. Your use of Google Sign-In is also subject to Google's Privacy Policy."}
      </Section>

      <Section title="Profile photos">
        {"If you upload a profile photo, it is stored securely via Vercel Blob storage and is publicly accessible via a direct URL."}
      </Section>

      <Section title="Data retention">
        {"Your data is retained for as long as your account is active. You can delete your account at any time from the Profile screen, which permanently removes all your data from our systems."}
      </Section>

      <Section title="Security">
        {"We use industry-standard security practices including encrypted connections (HTTPS), hashed passwords, and JWT-based authentication with 30-day expiry."}
      </Section>

      <Section title="Contact">
        {"For any privacy-related questions or requests, contact us at: hello@poisonrana.com"}
      </Section>
    </ScrollView>
  );
}
