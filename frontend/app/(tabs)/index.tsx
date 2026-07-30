import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/lib/AuthContext";
import { Spacing, FontSize, Radius, Shadow } from "@/constants/theme";

const quickActions = [
  { label: "Chat with Elix", icon: "🤖", route: "/(tabs)/chatbot", color: "#1a8a7d" },
  { label: "Search Medicines", icon: "💊", route: "/(tabs)/medicines", color: "#0ea5e9" },
  { label: "Nearby Hospitals", icon: "🏥", route: "/(tabs)/hospitals", color: "#f59e0b" },
  { label: "Emergency", icon: "🆘", route: "/(tabs)/more", color: "#ef4444" },
];

export default function Dashboard() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: Spacing.lg }}>
      <Text style={[styles.greeting, { color: colors.foreground }]}>
        Hello, {user?.name || "there"} 👋
      </Text>
      <Text style={[styles.subtext, { color: colors.mutedForeground }]}>What would you like to do today?</Text>

      <View style={styles.grid}>
        {quickActions.map((a) => (
          <TouchableOpacity
            key={a.label}
            onPress={() => router.push(a.route)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <View style={[styles.iconBox, { backgroundColor: a.color + "20" }]}>
              <Text style={{ fontSize: 24 }}>{a.icon}</Text>
            </View>
            <Text style={[styles.cardLabel, { color: colors.foreground }]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.tipCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: colors.primary }]}>
        <Text style={[styles.tipTitle, { color: colors.foreground }]}>💡 Health Tip</Text>
        <Text style={[styles.tipText, { color: colors.mutedForeground }]}>
          Staying hydrated helps maintain energy levels and supports cognitive function. Aim for 8 glasses of water daily.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  greeting: { fontSize: FontSize.xxl, fontWeight: "700", marginBottom: Spacing.xs },
  subtext: { fontSize: FontSize.md, marginBottom: Spacing.xl },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md, marginBottom: Spacing.xl },
  card: { flex: 1, minWidth: 140, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, ...Shadow.sm },
  iconBox: { width: 48, height: 48, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  cardLabel: { fontSize: FontSize.sm, fontWeight: "600" },
  tipCard: { padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, borderLeftWidth: 4, ...Shadow.sm },
  tipTitle: { fontSize: FontSize.md, fontWeight: "600", marginBottom: Spacing.xs },
  tipText: { fontSize: FontSize.sm, lineHeight: FontSize.sm * 1.6 },
});
