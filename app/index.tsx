import LoginScreen from '../components/LoginScreen';
import ReceiptMenu from '../components/ReceiptMenu';
import { useSession } from '../context/SessionContext';

export default function IndexScreen() {
  const { user } = useSession();

  if (!user) {
    return <LoginScreen />;
  }

  return <ReceiptMenu />;
}
