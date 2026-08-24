import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
} from "react-native";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Missing fields", "Please enter email and password.");
      return;
    }
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      navigation.replace(user.role === "inspector" ? "InspectorDashboard" : "ManagerDashboard");
    } catch (e) {
      Alert.alert("Login failed", e?.response?.data?.detail || "Please check your credentials.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.brand}>TexVision</Text>
        <Text style={styles.heading}>Welcome back</Text>
        <Text style={styles.helper}>Sign in to continue quality inspection</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="you@factory.com"
          placeholderTextColor={colors.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={colors.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={busy}>
          <Text style={styles.buttonText}>{busy ? "Signing in..." : "Sign In"}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("RoleSelect")} style={styles.linkWrap}>
          <Text style={styles.link}>New here? Create an account</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bgLight },
  container: { flexGrow: 1, padding: 28, justifyContent: "center" },
  brand: { color: colors.primary, fontWeight: "800", fontSize: 16, marginBottom: 24 },
  heading: { fontSize: 26, fontWeight: "800", color: colors.textPrimary },
  helper: { color: colors.textSecondary, marginTop: 6, marginBottom: 28, fontSize: 14 },
  label: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginBottom: 6, marginTop: 14 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.textPrimary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 26,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  linkWrap: { marginTop: 20, alignItems: "center" },
  link: { color: colors.primary, fontWeight: "600", fontSize: 13 },
});
