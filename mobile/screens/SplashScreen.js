import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import { colors } from "../theme/colors";
import { useAuth } from "../context/AuthContext";

export default function SplashScreen({ navigation }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const timer = setTimeout(() => {
      if (user) {
        navigation.replace(user.role === "inspector" ? "InspectorDashboard" : "ManagerDashboard");
      } else {
        navigation.replace("Login");
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [loading, user]);

  return (
    <View style={styles.container}>
      <View style={styles.logoCircle}>
        <Text style={styles.logoText}>TV</Text>
      </View>
      <Text style={styles.title}>TexVision</Text>
      <Text style={styles.subtitle}>AI Fabric Defect Detection{"\n"}& Production Intelligence</Text>
      <ActivityIndicator color={colors.accent} style={{ marginTop: 32 }} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logoText: { color: "#fff", fontSize: 32, fontWeight: "800" },
  title: { color: "#fff", fontSize: 28, fontWeight: "800", letterSpacing: 0.5 },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 18,
  },
});
