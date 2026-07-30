import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { useRouter } from "expo-router";
import { useTheme } from "@/components/ThemeProvider";
import { Spacing, FontSize, Radius, Shadow } from "@/constants/theme";

const links = [
  { label: "Medical Conditions", icon: "🩺", route: "/(tabs)/more", color: "#0ea5e9" },
  { label: "Pharmacies", icon: "💊", route: "/(tabs)/more", color: "#1a8a7d" },
  { label: "Emergency Contacts", icon: "🆘", route: "/(tabs)/more", color: "#ef4444" },
  { label: "Saved Items", icon: "🔖", route: "/(tabs)/more", color: "#f59e0b" },
  { label: "Account", icon: "👤", route: "/(tabs)/more", color: "#8b5cf6" },
];

const emergencies = [
  { country: "India", number: "112" },
  { country: "USA", number: "911" },
  { country: "UK", number: "999" },
  { country: "Australia", number: "000" },
];

export default function More() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: Spacing.lg }}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Quick Links</Text>
      <View style={styles.grid}>
        {links.map((l) => (
          <TouchableOpacity key={l.label} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.iconBox, { backgroundColor: l.color + "20" }]}>
              <Text style={{ fontSize: 20 }}>{l.icon}</Text>
            </View>
            <Text style={[styles.cardLabel, { color: colors.foreground }]}>{l.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: Spacing.lg }]}>🚨 Emergency Numbers</Text>
      {emergencies.map((e) => (
        <TouchableOpacity
          key={e.country}
          onPress={() => Linking.openURL(`tel:${e.number}`)}
          style={[styles.emergencyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.emergencyCountry, { color: colors.foreground }]}>{e.country}</Text>
          <Text style={[styles.emergencyNumber, { color: "#ef4444" }]}>{e.number}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: "700", marginBottom: Spacing.md },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  card: { flex: 1, minWidth: 140, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, ...Shadow.sm },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: "center", justifyContent: "center", marginBottom: Spacing.sm },
  cardLabel: { fontSize: FontSize.sm, fontWeight: "600" },
  emergencyCard: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.sm },
  emergencyCountry: { fontSize: FontSize.md, fontWeight: "600" },
  emergencyNumber: { fontSize: FontSize.xl, fontWeight: "800" },
});
