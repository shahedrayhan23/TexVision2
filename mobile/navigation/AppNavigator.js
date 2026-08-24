import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import SplashScreen from "../screens/SplashScreen";
import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import RoleSelectScreen from "../screens/RoleSelectScreen";
import InspectorDashboardScreen from "../screens/InspectorDashboardScreen";
import CameraUploadScreen from "../screens/CameraUploadScreen";
import ResultScreen from "../screens/ResultScreen";
import HistoryScreen from "../screens/HistoryScreen";
import ManagerDashboardScreen from "../screens/ManagerDashboardScreen";
import ManagerPendingScreen from "../screens/ManagerPendingScreen";
import ManagerReviewScreen from "../screens/ManagerReviewScreen";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RoleSelect" component={RoleSelectScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="InspectorDashboard" component={InspectorDashboardScreen} />
        <Stack.Screen name="CameraUpload" component={CameraUploadScreen} options={{ headerShown: true, title: "Capture Fabric" }} />
        <Stack.Screen name="Result" component={ResultScreen} options={{ headerShown: true, title: "Inspection Result" }} />
        <Stack.Screen name="History" component={HistoryScreen} options={{ headerShown: true, title: "History" }} />
        <Stack.Screen name="ManagerDashboard" component={ManagerDashboardScreen} />
        <Stack.Screen name="ManagerPending" component={ManagerPendingScreen} options={{ headerShown: false }} />
        <Stack.Screen name="ManagerReview" component={ManagerReviewScreen} options={{ headerShown: false }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
