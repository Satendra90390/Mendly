import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";
import { useAuth } from "@/lib/AuthContext";
import { Spacing, FontSize, Radius, Shadow } from "@/constants/theme";

export default function Account() {
  const { colors, mode, toggle } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: async () => { await logout(); router.replace("/"); } },
    ]);
  }

  const initial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U";
  const avatarBg = user?.avatar_color || colors.primary;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: Spacing.lg }}>
      <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={[styles.avatar, { backgroundColor: avatarBg }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={[styles.name, { color: colors.foreground }]}>{user?.name || "User"}</Text>
        <Text style={[styles.email, { color: colors.mutedForeground }]}>{user?.email}</Text>
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Preferences</Text>
        <View style={styles.row}>
          <Text style={[styles.rowLabel, { color: colors.foreground }]}>Dark Mode</Text>
          <TouchableOpacity onPress={toggle} style={[styles.toggle, { backgroundColor: mode === "dark" ? colors.primary : colors.muted }]}>
            <View style={[styles.toggleKnob, { alignSelf: mode === "dark" ? "flex-end" : "flex-start" }]} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={handleLogout} style={[styles.logoutBtn, { borderColor: colors.destructive }]}>
        <Text style={[styles.logoutText, { color: colors.destructive }]}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileCard: { alignItems: "center", padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.lg, ...Shadow.sm },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: Spacing.md },
  avatarText: { color: "#fff", fontSize: FontSize.xl, fontWeight: "700" },
  name: { fontSize: FontSize.lg, fontWeight: "700", marginBottom: Spacing.xs },
  email: { fontSize: FontSize.sm },
  section: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.lg, marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.md, fontWeight: "600", marginBottom: Spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { fontSize: FontSize.md },
  toggle: { width: 48, height: 28, borderRadius: 14, padding: 2, justifyContent: "center" },
  toggleKnob: { width: 24, height: 24, borderRadius: 12, backgroundColor: "#fff" },
  logoutBtn: { paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1.5, alignItems: "center" },
  logoutText: { fontSize: FontSize.md, fontWeight: "600" },
});
