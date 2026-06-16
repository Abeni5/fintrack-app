import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNavigationContainerRef } from '@react-navigation/native';
import { Text, ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { registerForNotifications } from './src/notifications/notificationService';
import {
  registerScheduledNotifications,
  unregisterScheduledNotifications,
} from './src/notifications/scheduledNotifications';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import AddTransactionScreen from './src/screens/AddTransactionScreen';
import ReportsScreen from './src/screens/ReportsScreen';
import AdvisorScreen from './src/screens/AdvisorScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CurrencyScreen from './src/screens/CurrencyScreen';
import BudgetScreen from './src/screens/BudgetScreen';
import EditTransactionScreen from './src/screens/EditTransactionScreen';

export const navigationRef = createNavigationContainerRef();

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const ICONS = {
  Dashboard: '🏠', Transactions: '💸',
  Reports: '📊', Advisor: '🧠', Settings: '⚙️',
};

function MainTabs() {
  const { colors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => (
          <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
            {ICONS[route.name]}
          </Text>
        ),
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: 8, height: 60,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Reports" component={ReportsScreen} />
      <Tab.Screen name="Advisor" component={AdvisorScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}

function RootNavigator() {
  const { user, loading } = useAuth();
  const { colors, isDark } = useTheme();

  useEffect(() => {
    if (user) {
      registerScheduledNotifications();
    } else if (!loading) {
      unregisterScheduledNotifications();
    }
  }, [user, loading]);

  if (loading) return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );

  if (user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen name="AddTransaction" component={AddTransactionScreen} />
        <Stack.Screen name="Currency" component={CurrencyScreen} />
        <Stack.Screen name="Budget" component={BudgetScreen} />
        <Stack.Screen name="EditTransaction" component={EditTransactionScreen} />
      </Stack.Navigator>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      {/* OTPVerification is outside auth so unverified users can access it */}
      <Stack.Screen name="OTPVerification" component={OTPVerificationScreen} />
    </Stack.Navigator>
  );
}

function AppContent() {
  const { isDark } = useTheme();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    registerForNotifications().then(granted => {
      if (!granted) console.log('Notification permission denied');
    });
  }, []);

  useEffect(() => {
    notificationListener.current = Notifications.addNotificationReceivedListener(
      notification => console.log('Notification:', notification.request.content.title)
    );
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      response => {
        const screen = response.notification.request.content.data?.screen;
        if (screen && navigationRef.isReady()) {
          setTimeout(() => navigationRef.navigate(screen), 300);
        }
      }
    );
    return () => {
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}