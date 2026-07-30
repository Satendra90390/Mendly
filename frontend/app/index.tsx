import { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Modal, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/lib/AuthContext";
import { useTheme } from "@/components/ThemeProvider";
import { API_BASE } from "@/lib/config";
import Logo from "@/components/Logo";
import { Colors, Spacing, FontSize, Radius, Shadow } from "@/constants/theme";

const features = [
  { icon: "🤖", title: "AI Health Chat", desc: "Get instant answers from our advanced AI assistant, Elix." },
  { icon: "💊", title: "Medicine Guide", desc: "Search medications, check dosages and side effects." },
  { icon: "🏥", title: "Nearby Care", desc: "Find hospitals and pharmacies near you." },
  { icon: "❤️", title: "Health Tracking", desc: "Save conditions and track symptoms." },
];

export default function LandingScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [secureText, setSecureText] = useState(true);

  async function handleAuth() {
    if (!email || !password) { Alert.alert("Error", "Please fill in all fields"); return; }
    setLoading(true);
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/signup";
      const body = isLogin ? { email, password } : { name: name || email.split("@")[0], email, password };
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { Alert.alert("Error", data.detail || "Something went wrong"); return; }
      await login(data.access_token, data.user);
      router.replace("/(tabs)");
    } catch { Alert.alert("Error", "Network error. Please try again."); }
    finally { setLoading(false); }
  }

  const c = colors;

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={[styles.hero, { paddingTop: 80 }]}>
          <View style={styles.badge}>
            <Logo size="sm" showText={false} />
            <Text style={[styles.badgeText, { color: c.mutedForeground }]}>Powered by Mendly AI</Text>
          </View>
          <Text style={[styles.title, { color: c.foreground }]}>
            Your{" "}
            <Text style={{ color: c.primary }}>AI Health</Text>
            {"\n"}Companion
          </Text>
          <Text style={[styles.subtitle, { color: c.mutedForeground }]}>
            Ask health questions, check drug interactions, find nearby care, and manage your medications — all in one place.
          </Text>
          <View style={styles.heroButtons}>
            <TouchableOpacity
              onPress={() => { setIsLogin(false); setModalVisible(true); }}
              style={[styles.primaryBtn, { backgroundColor: c.primary }]}>
              <Text style={styles.primaryBtnText}>Get Started Free</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setIsLogin(true); setModalVisible(true); }}
              style={[styles.secondaryBtn, { borderColor: c.border, backgroundColor: c.card }]}>
              <Text style={[styles.secondaryBtnText, { color: c.foreground }]}>Sign In</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.checkmarks}>
            {["Free to start", "No credit card", "HIPAA compliant"].map((text) => (
              <View key={text} style={styles.checkItem}>
                <Text style={[styles.checkIcon, { color: c.primary }]}>✓</Text>
                <Text style={[styles.checkText, { color: c.mutedForeground }]}>{text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Features */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionLabel, { color: c.primary }]}>FEATURES</Text>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              Everything you need for{" "}
              <Text style={{ color: c.primary }}>better health</Text>
            </Text>
          </View>
          <View style={styles.featuresGrid}>
            {features.map((f) => (
              <View key={f.title} style={[styles.featureCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={styles.featureIcon}>{f.icon}</Text>
                <Text style={[styles.featureTitle, { color: c.foreground }]}>{f.title}</Text>
                <Text style={[styles.featureDesc, { color: c.mutedForeground }]}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA */}
        <View style={[styles.ctaSection, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.ctaTitle, { color: c.foreground }]}>Ready to take control?</Text>
          <Text style={[styles.ctaDesc, { color: c.mutedForeground }]}>
            Join Mendly today and start making smarter health decisions.
          </Text>
          <TouchableOpacity
            onPress={() => { setIsLogin(false); setModalVisible(true); }}
            style={[styles.primaryBtn, { backgroundColor: c.primary }]}>
            <Text style={styles.primaryBtnText}>Get Started Free</Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Logo size="sm" />
          <Text style={[styles.footerText, { color: c.mutedForeground }]}>
            Not a substitute for professional medical advice.
          </Text>
          <Text style={[styles.copyright, { color: c.mutedForeground }]}>
            © {new Date().getFullYear()} Mendly
          </Text>
        </View>
      </ScrollView>

      {/* Auth Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: c.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: c.foreground }]}>{isLogin ? "Welcome Back" : "Create Account"}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={[styles.closeBtn, { color: c.mutedForeground }]}>✕</Text>
              </TouchableOpacity>
            </View>
            {!isLogin && (
              <TextInput
                placeholder="Full Name"
                placeholderTextColor={c.mutedForeground}
                value={name}
                onChangeText={setName}
                style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
              />
            )}
            <TextInput
              placeholder="Email"
              placeholderTextColor={c.mutedForeground}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
            />
            <View style={styles.passwordRow}>
              <TextInput
                placeholder="Password"
                placeholderTextColor={c.mutedForeground}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
                style={[styles.input, styles.passwordInput, { backgroundColor: c.background, borderColor: c.border, color: c.foreground }]}
              />
              <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeBtn}>
                <Text style={{ color: c.mutedForeground }}>{secureText ? "👁" : "👁‍🗨"}</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator size="large" color={c.primary} style={{ marginTop: Spacing.md }} />
            ) : (
              <TouchableOpacity onPress={handleAuth} style={[styles.submitBtn, { backgroundColor: c.primary }]}>
                <Text style={styles.submitBtnText}>{isLogin ? "Sign In" : "Create Account"}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => { setIsLogin(!isLogin); setEmail(""); setPassword(""); setName(""); }} style={{ marginTop: Spacing.md }}>
              <Text style={[styles.switchText, { color: c.primary }]}>
                {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingBottom: 40 },
  hero: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 999, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", marginBottom: Spacing.lg, backgroundColor: "rgba(255,255,255,0.05)" },
  badgeText: { fontSize: FontSize.sm },
  title: { fontFamily: "serif", fontSize: FontSize.display, fontWeight: "600", lineHeight: FontSize.display * 1.1, textAlign: "center", marginBottom: Spacing.md },
  subtitle: { fontSize: FontSize.lg, textAlign: "center", lineHeight: FontSize.lg * 1.6, maxWidth: 500, marginBottom: Spacing.xl },
  heroButtons: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.lg, flexWrap: "wrap", justifyContent: "center" },
  primaryBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: "center", ...Shadow.md },
  primaryBtnText: { color: "#fff", fontSize: FontSize.md, fontWeight: "600" },
  secondaryBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md, borderWidth: 1, alignItems: "center" },
  secondaryBtnText: { fontSize: FontSize.md, fontWeight: "600" },
  checkmarks: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.lg, justifyContent: "center" },
  checkItem: { flexDirection: "row", alignItems: "center", gap: Spacing.xs },
  checkIcon: { fontSize: FontSize.lg, fontWeight: "bold" },
  checkText: { fontSize: FontSize.sm },
  section: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.xxl },
  sectionHeader: { alignItems: "center", marginBottom: Spacing.xl },
  sectionLabel: { fontSize: FontSize.xs, fontWeight: "700", letterSpacing: 2, marginBottom: Spacing.sm },
  sectionTitle: { fontFamily: "serif", fontSize: FontSize.xxl, fontWeight: "600", textAlign: "center" },
  featuresGrid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.md },
  featureCard: { flex: 1, minWidth: 150, padding: Spacing.lg, borderRadius: Radius.lg, borderWidth: 1, ...Shadow.sm },
  featureIcon: { fontSize: 28, marginBottom: Spacing.md },
  featureTitle: { fontSize: FontSize.md, fontWeight: "600", marginBottom: Spacing.xs },
  featureDesc: { fontSize: FontSize.sm, lineHeight: FontSize.sm * 1.5 },
  ctaSection: { marginHorizontal: Spacing.lg, padding: Spacing.xl, borderRadius: Radius.lg, borderWidth: 1, alignItems: "center", marginVertical: Spacing.xl, ...Shadow.md },
  ctaTitle: { fontFamily: "serif", fontSize: FontSize.xl, fontWeight: "600", marginBottom: Spacing.sm, textAlign: "center" },
  ctaDesc: { fontSize: FontSize.md, textAlign: "center", marginBottom: Spacing.lg, maxWidth: 350 },
  footer: { alignItems: "center", padding: Spacing.xl, gap: Spacing.sm },
  footerText: { fontSize: FontSize.xs, textAlign: "center", maxWidth: 300 },
  copyright: { fontSize: FontSize.xs },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalContent: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.xl, paddingBottom: 40 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.lg },
  modalTitle: { fontSize: FontSize.xl, fontWeight: "700" },
  closeBtn: { fontSize: FontSize.xl, padding: Spacing.xs },
  input: { borderWidth: 1, borderRadius: Radius.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.md, fontSize: FontSize.md, marginBottom: Spacing.md },
  passwordRow: { position: "relative", marginBottom: Spacing.md },
  passwordInput: { marginBottom: 0 },
  eyeBtn: { position: "absolute", right: Spacing.md, top: 0, bottom: 0, justifyContent: "center" },
  submitBtn: { paddingVertical: Spacing.md, borderRadius: Radius.sm, alignItems: "center", marginTop: Spacing.sm },
  submitBtnText: { color: "#fff", fontSize: FontSize.md, fontWeight: "700" },
  switchText: { fontSize: FontSize.sm, textAlign: "center" },
});
