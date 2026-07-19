import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { View, ActivityIndicator } from 'react-native';
import { COLORS } from '../constants/theme';

export default function Index() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.primaryDark }}>
        <ActivityIndicator size="large" color={COLORS.white} />
      </View>
    );
  }

  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
