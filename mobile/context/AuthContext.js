/**
 * Global auth state: current user, token persistence, login/logout/register.
 */
import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem("texvision_token");
        const userJson = await AsyncStorage.getItem("texvision_user");

        if (token && userJson) {
          try {
            const parsedUser = JSON.parse(userJson);
            if (parsedUser?.id && parsedUser?.role) {
              setUser(parsedUser);
            } else {
              await AsyncStorage.multiRemove(["texvision_token", "texvision_user"]);
            }
          } catch {
            await AsyncStorage.multiRemove(["texvision_token", "texvision_user"]);
          }
        }
      } catch {
        await AsyncStorage.multiRemove(["texvision_token", "texvision_user"]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    await AsyncStorage.setItem("texvision_token", res.data.access_token);
    await AsyncStorage.setItem("texvision_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (payload) => {
    const res = await authApi.register(payload);
    await AsyncStorage.setItem("texvision_token", res.data.access_token);
    await AsyncStorage.setItem("texvision_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    await AsyncStorage.multiRemove(["texvision_token", "texvision_user"]);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
