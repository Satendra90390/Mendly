import { Tabs } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/lib/AuthContext";
import { useRouter } from "expo-router";
import { Spacing, FontSize, Radius } from "@/constants/theme";

const TABS = [
  { name: "index", label: "Home", icon: "📊" },
  { name: "chatbot", label: "Elix", icon: "🤖" },
  { name: "medicines", label: "Medicines", icon: "💊" },
  { name: "hospitals", label: "Hospitals", icon: "🏥" },
  { name: "more", label: "More", icon: "⋯" },
];

export default function TabLayout() {
  const { colors, toggle, mode } = useTheme();
  const { logout, user } = useAuth();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Mendly</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={toggle} style={[styles.headerBtn, { backgroundColor: colors.muted }]}>
            <Text style={{ fontSize: 16 }}>{mode === "dark" ? "☀️" : "🌙"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/account")}
            style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.card,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 65,
            paddingBottom: 8,
            paddingTop: 8,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.mutedForeground,
          tabBarLabelStyle: { fontSize: FontSize.xs, fontWeight: "500" },
        }}
      >
        {TABS.map((tab) => (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              title: tab.label,
              tabBarIcon: ({ color }) => (
                <Text style={{ fontSize: 20 }}>{tab.icon}</Text>
              ),
            }}
          />
        ))}
      </Tabs>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: 50,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  headerTitle: { fontFamily: "serif", fontSize: FontSize.xl, fontWeight: "700" },
  headerRight: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  headerBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: FontSize.sm, fontWeight: "700" },
});
