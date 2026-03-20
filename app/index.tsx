import { ActivityIndicator, View } from 'react-native';
import LoginScreen from '../components/LoginScreen';
import ReceiptMenu from '../components/ReceiptMenu';
import { useSession } from '../context/SessionContext';

export default function IndexScreen() {
  const { user, isLoading } = useSession();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <ReceiptMenu />;
}
