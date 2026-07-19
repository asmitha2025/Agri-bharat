import { Tabs, Redirect } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';

export default function TabLayout() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.primaryDark, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!user) return <Redirect href="/(auth)/login" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#d1fae5',
          borderTopWidth: 1.5,
          paddingBottom: 6,
          paddingTop: 6,
          height: 64,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="pest-control"
        options={{
          title: 'Pests',
          tabBarIcon: ({ color, size }) => <Ionicons name="bug-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="weather"
        options={{
          title: 'Weather',
          tabBarIcon: ({ color, size }) => <Ionicons name="partly-sunny-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="schemes"
        options={{
          title: 'Schemes',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="market"
        options={{
          title: 'Market',
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} />,
        }}
      />
      {/* Admin-only tabs — hidden from non-admins */}
      <Tabs.Screen
        name="farmers"
        options={{
          title: 'Farmers',
          href: isAdmin ? undefined : null, // hide for non-admins
          tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="calls"
        options={{
          title: 'Calls',
          href: isAdmin ? undefined : null,
          tabBarIcon: ({ color, size }) => <Ionicons name="call-outline" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle-outline" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
