import { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Platform, Alert } from "react-native";
import * as Location from "expo-location";
import { useTheme } from "@/components/ThemeProvider";
import { API_BASE } from "@/lib/config";
import { Spacing, FontSize, Radius, Shadow } from "@/constants/theme";

export default function Hospitals() {
  const { colors } = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }
      } catch {}
    })();
  }, []);

  async function search() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (location) { params.set("lat", location.lat.toString()); params.set("lng", location.lng.toString()); }
      const res = await fetch(`${API_BASE}/hospitals/search?${params}`);
      const data = await res.json();
      setResults(data.results || data.hospitals || []);
    } catch { setResults([]); }
    setLoading(false);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search location or hospital..."
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={search}
          style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
        />
        <TouchableOpacity onPress={search} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={styles.btnText}>Search</Text>
        </TouchableOpacity>
      </View>
      {location && (
        <Text style={[styles.locationHint, { color: colors.mutedForeground }]}>
          📍 Using your current location
        </Text>
      )}
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: Spacing.xl }} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(_, i) => i.toString()}
          contentContainerStyle={{ padding: Spacing.lg }}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
              {item.address && <Text style={[styles.address, { color: colors.mutedForeground }]}>{item.address}</Text>}
              {item.phone && <Text style={[styles.phone, { color: colors.mutedForeground }]}>📞 {item.phone}</Text>}
            </View>
          )}
          ListEmptyComponent={<Text style={[styles.empty, { color: colors.mutedForeground }]}>No hospitals found. Try searching a city.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchRow: { flexDirection: "row", padding: Spacing.lg, gap: Spacing.sm },
  input: { flex: 1, borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, fontSize: FontSize.md },
  btn: { paddingHorizontal: Spacing.lg, borderRadius: Radius.sm, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#fff", fontWeight: "600" },
  locationHint: { fontSize: FontSize.xs, paddingHorizontal: Spacing.lg, marginTop: -Spacing.sm },
  card: { padding: Spacing.lg, borderRadius: Radius.md, borderWidth: 1, marginBottom: Spacing.sm, ...Shadow.sm },
  name: { fontSize: FontSize.md, fontWeight: "600", marginBottom: Spacing.xs },
  address: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
  phone: { fontSize: FontSize.sm },
  empty: { textAlign: "center", marginTop: Spacing.xl, fontSize: FontSize.md },
});
